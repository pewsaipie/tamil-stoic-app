/**
 * The Ask Valluvar lexicon matcher — the rule-based half of the classifier.
 *
 * Classical Tamil NLP has always paired a statistical model with a lexicon, and so
 * does this: the taxonomy's own keyword lists (Tamil *and* romanised) are indexed
 * by their normalised form, and a reader's words are matched against them
 * **exactly** first, then **fuzzily** (character-bigram similarity) so that
 * inflections, transliteration spellings and typos still land on the right intent.
 *
 * Matching is script-aware: a Tamil word is only compared with Tamil keywords and
 * a Latin word with romanised ones, so `kovam` never "approximately matches" a
 * Tamil keyword it merely resembles in length.
 *
 * Everything is derived from `intents.ts`; there is no second keyword list to keep
 * in sync. The fuzzy pass only ever *proposes* an intent — the caller decides
 * whether the score is high enough to trust, and falls back to the statistical
 * model otherwise (`intentClassifier.ts`).
 */
import { ASK_INTENTS, type AskIntent } from './intents.ts'
import { isTamil, normaliseTamil, stripTamilSuffix, foldRoman } from './tamilText.ts'

export type Script = 'ta' | 'ro'

export interface LexiconEntry {
  intent: string
  /** Normalised form used for lookup. */
  key: string
  script: Script
  /** The keyword exactly as the taxonomy spells it, for echoing back to the reader. */
  keyword: string
}

export interface Lexicon {
  entries: readonly LexiconEntry[]
  /** Phrase keys: one or more normalised tokens joined by a space. */
  byPhrase: Map<string, LexiconEntry[]>
  bigrams: Map<string, Set<string>>
  intents: readonly AskIntent[]
  /** Longest keyword phrase in tokens (a keyword, not its frames). */
  maxPhraseTokens: number
}

/** Normalise one keyword or token to its lookup key, keeping the script it is in. */
export function lexiconKey(token: string, script: Script): string {
  if (script === 'ro') return foldRoman(token)
  const cleaned = normaliseTamil(token)
  const stem = stripTamilSuffix(cleaned)
  return stem.length >= 2 ? stem : cleaned
}

/** The normalised, space-joined key of a keyword phrase (`சாக வேண்டும்`). */
export function phraseKey(phrase: string): string {
  return normaliseTamil(phrase)
    .split(' ')
    .filter(Boolean)
    .map((token) => lexiconKey(token, scriptOf(token)))
    .filter((token) => token.length > 0)
    .join(' ')
}

export function buildLexicon(intents: readonly AskIntent[] = ASK_INTENTS): Lexicon {
  const entries: LexiconEntry[] = []
  const byPhrase = new Map<string, LexiconEntry[]>()
  const bigrams = new Map<string, Set<string>>()
  let maxPhraseTokens = 1

  for (const intent of intents) {
    for (const keyword of intent.keywords) entries.push({ intent: intent.id, key: phraseKey(keyword), script: 'ta', keyword })
    for (const keyword of intent.romanised) entries.push({ intent: intent.id, key: phraseKey(keyword), script: 'ro', keyword })
  }

  for (const entry of entries) {
    if (!entry.key) continue
    const tokens = entry.key.split(' ')
    maxPhraseTokens = Math.max(maxPhraseTokens, tokens.length)
    const bucket = byPhrase.get(entry.key) ?? []
    bucket.push(entry)
    byPhrase.set(entry.key, bucket)
    // Fuzzy matching only ever runs on single words: comparing a phrase's bigrams
    // would let `சாக` match `சாக வேண்டும்` for the wrong reason.
    if (tokens.length === 1 && entry.key.length >= 3) bigrams.set(entry.key, characterBigrams(entry.key))
  }
  return { entries, byPhrase, bigrams, intents, maxPhraseTokens }
}

function characterBigrams(value: string): Set<string> {
  const grams = new Set<string>()
  for (let i = 0; i + 1 < value.length; i += 1) grams.add(value.slice(i, i + 2))
  return grams
}

function commonPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length)
  let i = 0
  while (i < limit && a[i] === b[i]) i += 1
  return i
}

/** Sørensen–Dice similarity of two bigram sets: 0 = unrelated, 1 = identical. */
export function diceCoefficient(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const gram of a) if (b.has(gram)) shared += 1
  return (2 * shared) / (a.size + b.size)
}

/** How much of the reader's text is Tamil script — decides the script to match in. */
function scriptOf(token: string): Script {
  return isTamil(token) ? 'ta' : 'ro'
}

export interface LexiconMatch {
  intent: string
  keyword: string
  /** 1 for an exact keyword, the Dice similarity for a fuzzy one. */
  score: number
  /** The reader's own word that matched — the "core keyword" the reply echoes. */
  matched: string
  exact: boolean
}

/** Below this Dice similarity a fuzzy match is noise rather than a word. */
export const FUZZY_FLOOR = 0.62

/** The reader's tokens, each already normalised the way the lexicon is. */
function queryTokens(text: string): { raw: string; key: string; script: Script }[] {
  return normaliseTamil(text)
    .split(' ')
    .filter((raw) => raw.length >= 2)
    .map((raw) => ({ raw, key: lexiconKey(raw, scriptOf(raw)), script: scriptOf(raw) }))
}

/**
 * Match a reader's words against the lexicon.
 *
 * Longest phrase first (so `சாக வேண்டும்` beats `சாக`), then whole words, then
 * fuzzy word matches. `only` restricts the search to a subset of intents, which is
 * how the safety short-circuit asks "is this a support phrase?" without letting a
 * general-purpose match get in the way.
 */
export function matchLexicon(
  text: string,
  lexicon: Lexicon,
  options: { floor?: number; only?: ReadonlySet<string> } = {},
): LexiconMatch | null {
  const floor = options.floor ?? FUZZY_FLOOR
  const allowed = (entry: LexiconEntry) => !options.only || options.only.has(entry.intent)
  const tokens = queryTokens(text)

  for (let size = Math.min(lexicon.maxPhraseTokens, tokens.length); size >= 1; size -= 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      const window = tokens.slice(start, start + size)
      const key = window.map((token) => token.key).join(' ')
      if (!key) continue
      const hit = (lexicon.byPhrase.get(key) ?? []).find(allowed)
      if (hit) {
        return {
          intent: hit.intent,
          keyword: hit.keyword,
          score: 1,
          matched: window.map((token) => token.raw).join(' '),
          exact: true,
        }
      }
    }
  }

  let best: LexiconMatch | null = null
  for (const token of tokens) {
    // Fuzzy matching starts at four characters: below that, two Tamil or Tanglish
    // words sharing a couple of bigrams is coincidence, not evidence. (`life`
    // must never "approximately match" `wife`.)
    if (token.key.length < 4) continue
    const grams = characterBigrams(token.key)
    for (const entry of lexicon.entries) {
      if (entry.script !== token.script || !allowed(entry)) continue
      if (entry.key.includes(' ') || entry.key.length < 4) continue
      if (Math.abs(entry.key.length - token.key.length) > Math.max(3, Math.round(token.key.length * 0.5))) continue
      const dice = diceCoefficient(grams, lexicon.bigrams.get(entry.key) ?? new Set())
      // Two ways to be the same word: an agglutinated form that *starts* with the
      // keyword (`kovathala` → `kovam`, `கோபத்தால்` → `கோபம்`), or a misspelling that
      // keeps most of the word (`lonley` → `lonely`).
      const sharedPrefix = commonPrefixLength(token.key, entry.key)
      const prefixes = sharedPrefix >= 4 && sharedPrefix >= Math.min(token.key.length, entry.key.length) - 1
      const score = prefixes ? Math.max(0.85, dice) : dice
      if ((prefixes || dice >= 0.75) && score >= Math.max(floor, 0.75) && (best === null || score > best.score)) {
        best = { intent: entry.intent, keyword: entry.keyword, score, matched: token.raw, exact: false }
      }
    }
  }
  return best
}
