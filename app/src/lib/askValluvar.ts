/**
 * Ask Valluvar — the conversation layer (c10).
 *
 * The classifier says *what the reader is asking about*; this module decides what
 * to answer with. Three rules keep it honest:
 *
 *   1. **A couplet always comes from the corpus.** The answer is one of the ten
 *      couplets of one of the intent's chapters — chosen at random, with the
 *      chapter named — so the app can only ever show Thirukkural text it already
 *      ships. Nothing here composes, paraphrases or invents verse.
 *   2. **Support questions get support, not scripture.** `crisis` and `abuse`
 *      return the help lines (Tele-MANAS 14416, KIRAN 1800-599-0019,
 *      findahelpline.com) ahead of anything else.
 *   3. **A low-confidence answer is a question, not a guess.** When neither the
 *      lexicon nor the model is sure, the reply offers prompts and the closest
 *      intents instead of picking a couplet at random.
 */
import type { Chapter, Corpus, Kural, Section } from './types.ts'
import { ASK_INTENTS, FALLBACK_INTENTS, SUPPORT_INTENTS, intentById, type AskIntent } from './intents.ts'
import type { Classification, Classifier } from './intentClassifier.ts'

/** Below this confidence the model's answer is treated as "not sure". */
export const CONFIDENCE_FLOOR = 0.2

/**
 * Support gets a much lower bar than everything else — a faint signal must still
 * reach the helplines — but not *no* bar: an unrelated sentence that happens to
 * score highest on `crisis` should fall through to the question, not frighten
 * someone with a crisis card.
 */
export const SUPPORT_CONFIDENCE_FLOOR = 0.05

/** How many couplets of an intent's chapters a reader can re-roll through. */
export const MAX_ALTERNATIVES = 40

export interface SupportLine {
  /** Displayed as the reader would dial it. */
  number: string
  name: string
  nameTa: string
  detail: { ta: string; en: string }
  href?: string
}

/**
 * The safety block. These are the published Indian government helplines and the
 * international directory; the app ships them verbatim and never paraphrases them.
 */
export const SUPPORT_LINES: readonly SupportLine[] = [
  {
    number: '14416',
    name: 'Tele-MANAS',
    nameTa: 'டெலி-மனாஸ்',
    detail: { ta: 'இந்தியாவின் தேசிய மனநல உதவி எண் — 24 மணி நேரமும் இலவசம்.', en: 'India’s national mental-health helpline, free and open 24 hours.' },
  },
  {
    number: '1800-599-0019',
    name: 'KIRAN',
    nameTa: 'கிரண்',
    detail: { ta: 'சமூக நீதி அமைச்சகத்தின் உதவி எண் — 13 மொழிகளில்.', en: 'Ministry of Social Justice helpline, in 13 languages.' },
  },
  {
    number: 'findahelpline.com',
    name: 'Find a Helpline',
    nameTa: 'உதவி எண் தேடல்',
    detail: { ta: 'உங்கள் நாட்டில் உள்ள உதவி எண்களை இங்கே காணலாம்.', en: 'Helplines for your own country, without judgement.' },
    href: 'https://findahelpline.com',
  },
]

export interface AskReplyKural {
  kind: 'kural'
  intent: string
  /** The taxonomy's Tamil and English name for what the reader asked about. */
  label: { ta: string; en: string }
  /** The reader's own word that matched, when the lexicon found one. */
  keyword?: string
  /** The taxonomy keyword behind the decision, in its canonical spelling. */
  matchedKeyword?: string
  framing: { ta: string; en: string }
  kural: Kural
  chapter?: Chapter | undefined
  section?: Section | undefined
  confidence: number
  source: Classification['source']
  /** More couplets from the same intent, so "another" never repeats one. */
  alternatives: number[]
}

export interface AskReplySupport {
  kind: 'support'
  intent: string
  label: { ta: string; en: string }
  lines: readonly SupportLine[]
  /** A sentence to hold the reader, in the plainest Tamil this app can write. */
  note: { ta: string; en: string }
  confidence: number
}

export interface AskReplyFallback {
  kind: 'fallback'
  /** What the reader could say instead — the opening prompts, reshuffled. */
  suggestions: PromptSuggestion[]
  /** The two closest intents, for "did you mean". */
  near: { ta: string; en: string; prompt: string }[]
}

export interface PromptSuggestion {
  text: string
  intent: string
  label: { ta: string; en: string }
}

export type AskReply = AskReplyKural | AskReplySupport | AskReplyFallback

export interface AskOptions {
  text: string
  classifier: Classifier
  corpus: Corpus
  /** Injected for deterministic tests. */
  random?: () => number
  /** Kural numbers already shown in this conversation, never repeated. */
  seen?: readonly number[]
}

/** Chapters of the corpus that carry an intent's couplets. */
function poolFor(corpus: Corpus, intent: AskIntent): number[] {
  return corpus.kurals.filter((kural) => intent.chapters.includes(kural.ch)).map((kural) => kural.n)
}

function sectionFor(corpus: Corpus, kural: Kural): Section | undefined {
  return corpus.sections.find((section) => section.id === kural.sec)
}

function chapterFor(corpus: Corpus, kural: Kural): Chapter | undefined {
  return corpus.chapters.find((chapter) => chapter.n === kural.ch)
}

/** A stable shuffle-free pick: index by the injected random, skipping `seen`. */
function pick(pool: readonly number[], random: () => number, seen: readonly number[]): number | undefined {
  const fresh = pool.filter((number) => !seen.includes(number))
  const from = fresh.length > 0 ? fresh : pool
  if (from.length === 0) return undefined
  return from[Math.min(from.length - 1, Math.floor(random() * from.length))]
}

/** Random opening prompts — what the reader sees before typing anything. */
export function openingPrompts(count = 4, random: () => number = Math.random): PromptSuggestion[] {
  const candidates: PromptSuggestion[] = []
  for (const intent of ASK_INTENTS) {
    for (const example of intent.examples) {
      candidates.push({ text: example, intent: intent.id, label: { ta: intent.ta, en: intent.en } })
    }
  }
  const picked: PromptSuggestion[] = []
  const used = new Set<string>()
  let guard = 0
  while (picked.length < count && guard < candidates.length * 4) {
    guard += 1
    const candidate = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]
    if (!candidate || used.has(candidate.text) || SUPPORT_INTENTS.has(candidate.intent) || FALLBACK_INTENTS.has(candidate.intent)) continue
    used.add(candidate.text)
    picked.push(candidate)
  }
  return picked
}

function nearIntents(classifier: Classifier, text: string, count = 2): { ta: string; en: string; prompt: string }[] {
  const ranked = classifier.scores(text).slice(0, count)
  return ranked
    .map(({ intent }) => intentById(intent))
    .filter(
      (intent): intent is AskIntent =>
        intent !== undefined && !SUPPORT_INTENTS.has(intent.id) && !FALLBACK_INTENTS.has(intent.id),
    )
    .map((intent) => ({ ta: intent.ta, en: intent.en, prompt: intent.examples[0] ?? intent.ta }))
}

/**
 * Answer one reader message. Pure (deterministic given `random`), so the suite can
 * assert every branch without a browser.
 */
export function askValluvar({ text, classifier, corpus, random = Math.random, seen = [] }: AskOptions): AskReply {
  const trimmed = text.trim()
  const classification = classifier.classify(trimmed)

  // Support wins whenever the rule-based layer says so, or when the model is at
  // least faintly confident — see SUPPORT_CONFIDENCE_FLOOR.
  const supportSignal =
    SUPPORT_INTENTS.has(classification.intent) &&
    (classification.source === 'lexicon' || classification.confidence >= SUPPORT_CONFIDENCE_FLOOR)
  if (supportSignal) {
    const intent = intentById(classification.intent)
    return {
      kind: 'support',
      intent: classification.intent,
      label: { ta: intent?.ta ?? 'உதவி', en: intent?.en ?? 'Support' },
      lines: SUPPORT_LINES,
      note:
        classification.intent === 'crisis'
          ? {
              ta: 'நீங்கள் தனியாக இல்லை. இப்போதே ஒரு எண்ணுக்கு அழையுங்கள் — பேசுவதற்கு ஒருவர் காத்திருக்கிறார்.',
              en: 'You are not alone in this. Please call one of these numbers now — someone is there to listen.',
            }
          : {
              ta: 'நீங்கள் பாதுகாப்பாக இருக்க வேண்டும். உதவி கேட்பது பலம் — இந்த எண்கள் உங்களுக்காகவே.',
              en: 'Your safety comes first. Asking for help is strength — these lines are for you.',
            },
      confidence: classification.confidence,
    }
  }

  const intent = intentById(classification.intent)
  const outOfScope = intent !== undefined && FALLBACK_INTENTS.has(intent.id)
  const sure = !outOfScope && (classification.source === 'lexicon' || classification.confidence >= CONFIDENCE_FLOOR)

  if (!intent || !sure) {
    return {
      kind: 'fallback',
      suggestions: openingPrompts(3, random),
      near: nearIntents(classifier, trimmed),
    }
  }

  const pool = poolFor(corpus, intent)
  const number = pick(pool, random, seen)
  const kural = corpus.kurals.find((entry) => entry.n === number)
  if (!kural) {
    return { kind: 'fallback', suggestions: openingPrompts(3, random), near: nearIntents(classifier, trimmed) }
  }

  const alternatives = pool.filter((entry) => entry !== kural.n).slice(0, MAX_ALTERNATIVES)
  return {
    kind: 'kural',
    intent: intent.id,
    label: { ta: intent.ta, en: intent.en },
    keyword: classification.matched,
    matchedKeyword: classification.keyword,
    framing: intent.framing,
    kural,
    chapter: chapterFor(corpus, kural),
    section: sectionFor(corpus, kural),
    confidence: classification.confidence,
    source: classification.source,
    alternatives,
  }
}

/** Another couplet for a reply the reader asked to re-roll. */
export function reroll(reply: AskReplyKural, corpus: Corpus, random: () => number = Math.random): AskReplyKural {
  const intent = intentById(reply.intent)
  if (!intent) return reply
  const pool = [reply.kural.n, ...reply.alternatives]
  const number = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
  const kural = corpus.kurals.find((entry) => entry.n === number) ?? reply.kural
  return {
    ...reply,
    kural,
    chapter: chapterFor(corpus, kural),
    section: sectionFor(corpus, kural),
    alternatives: pool.filter((entry) => entry !== kural.n).slice(0, MAX_ALTERNATIVES),
  }
}
