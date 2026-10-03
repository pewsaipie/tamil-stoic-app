/**
 * Tamil text normalisation for the Ask Valluvar intent classifier (c10).
 *
 * Thirukkural queries arrive in two scripts — Tamil (எனக்கு கோபம் வருகிறது) and
 * romanised Tamil / Tanglish (enakku kovam varudhu) — and with Tamil's
 * agglutinative endings (`கோபம்`, `கோபத்தால்`, `கோபத்தில்`). A classical bag-of-words
 * model does badly on all three, so this module does what rule-based Tamil NLP has
 * always done: normalise the script, fold the romanisation, and strip the case and
 * person endings so a stem matches its inflections.
 *
 * Everything here is pure and dependency-free: the training script imports the
 * same functions the browser runs, so the features cannot drift from the model.
 */

/** Tamil case/plural endings, longest first — stripped only when a stem remains. */
const TA_SUFFIXES = [
  'களினால்',
  'களுக்கு',
  'களில்',
  'களை',
  'களின்',
  'களோடு',
  'களுடன்',
  'த்தினால்',
  'த்திற்கு',
  'த்தில்',
  'த்தை',
  'த்தால்',
  'த்தோடு',
  'த்துடன்',
  'இலிருந்து',
  'லிருந்து',
  'இருந்து',
  'ினால்',
  'ிற்கு',
  'ுக்கு',
  'ுகளுக்கு',
  'ுங்கள்',
  'ஆக',
  'ஆல்',
  'இல்',
  'ஐப்',
  'ஐச்',
  'ஐத்',
  'ஐக்',
  'ஐ',
  'இன்',
  'ஓடு',
  'உடன்',
  'வரை',
  'பற்றி',
  'க்காக',
  'க்கு',
  'ில்',
  'ால்',
  'ாக',
  'ும்',
  'ே',
  'ோ',
]

/** Common verb/person endings on the words people actually type about feelings. */
const TA_VERB_ENDINGS = ['கிறது', 'கிறேன்', 'கிறார்', 'கிறோம்', 'கிறார்கள்', 'கின்றது', 'வருகிறது', 'இருக்கிறது', 'ஆகிறது', 'ஆயிற்று', 'ஆச்சு', 'ஆச்சு', 'உள்ளது', 'வேண்டும்', 'மாட்டேன்', 'முடியவில்லை', 'முடியல', 'படுகிறது', 'ஆனது']

/** Tanglish digraphs, folded in this order so `zh`→`l` runs before `h`-dropping. */
const ROMAN_FOLDS: [RegExp, string][] = [
  [/zh/g, 'l'],
  [/sh/g, 's'],
  [/ch/g, 's'],
  [/ph/g, 'p'],
  [/kh/g, 'k'],
  [/gh/g, 'k'],
  [/bh/g, 'b'],
  [/dh/g, 'd'],
  [/th/g, 't'],
  [/jh/g, 'j'],
  [/aa/g, 'a'],
  [/ee/g, 'i'],
  [/ii/g, 'i'],
  [/oo/g, 'u'],
  [/uu/g, 'u'],
  [/ai/g, 'ai'],
  [/au/g, 'au'],
  [/[ck]k/g, 'k'],
  [/y/g, 'i'],
  [/w/g, 'v'],
  [/z/g, 's'],
  [/f/g, 'p'],
  [/x/g, 'ks'],
  [/q/g, 'k'],
]

const TAMIL_RANGE = /[\u0B80-\u0BFF]/

/** True when the string carries Tamil script. */
export function isTamil(text: string): boolean {
  return TAMIL_RANGE.test(text)
}

/**
 * Normalise Tamil script text: Unicode NFC, drop zero-width joiners (Fontsource
 * Tamil fonts render better without them) and collapse whitespace.
 */
export function normaliseTamil(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[“”"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Fold one romanised token into a script-agnostic, pronunciation-close form. */
export function foldRoman(token: string): string {
  let out = token.toLowerCase()
  for (const [pattern, replacement] of ROMAN_FOLDS) out = out.replace(pattern, replacement)
  return out.replace(/(.)\1+/g, '$1').replace(/[^a-z]/g, '')
}

/** Strip one Tamil case or verb ending, when a usable stem remains. */
export function stripTamilSuffix(token: string): string {
  if (!TAMIL_RANGE.test(token) || token.length < 5) return token
  for (const suffix of TA_SUFFIXES) {
    if (token.length - suffix.length >= 3 && token.endsWith(suffix)) return token.slice(0, -suffix.length)
  }
  for (const suffix of TA_VERB_ENDINGS) {
    if (token.length - suffix.length >= 3 && token.endsWith(suffix)) return token.slice(0, -suffix.length)
  }
  return token
}

/**
 * The token stream the classifier sees: Tamil tokens reduced to stems, romanised
 * tokens folded to a single phonetic spelling, Tamil words carried across into
 * their folded form as well, and very short fragments dropped.
 */
export function tokenise(text: string): string[] {
  const cleaned = normaliseTamil(text)
  const tokens: string[] = []
  for (const raw of cleaned.split(' ')) {
    if (!raw) continue
    if (TAMIL_RANGE.test(raw)) {
      // Tamil script stays Tamil: `foldRoman` folds Latin spellings, it cannot
      // transliterate Tamil, so folding here would delete the word entirely.
      const stem = stripTamilSuffix(raw)
      if (stem.length >= 2) tokens.push(stem)
      // Keep the inflected form as its own feature too — the ending of
      // `கோபத்தால்` can carry as much intent as the stem.
      if (stem !== raw && raw.length >= 3) tokens.push(raw)
    } else {
      const folded = foldRoman(raw)
      if (folded.length >= 2) tokens.push(folded)
    }
  }
  return tokens
}

/** Character n-grams over the token stream — the workhorse of morphologically rich NLP. */
export function charNgrams(tokens: readonly string[], sizes: readonly number[] = [3, 4]): string[] {
  const grams: string[] = []
  for (const token of tokens) {
    for (const size of sizes) {
      if (token.length < size) continue
      for (let i = 0; i + size <= token.length; i += 1) grams.push(token.slice(i, i + size))
    }
  }
  return grams
}
