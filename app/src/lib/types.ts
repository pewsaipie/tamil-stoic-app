/**
 * Corpus shapes — these mirror `data/kurals.js` exactly.
 *
 * The dataset is validated at generation time by `scripts/sync-kurals.mjs`
 * (1,330 kurals, 133 chapters, 3 sections, known theme ids), so the app can
 * trust the structure while still parsing defensively.
 */

/** A single couplet. `ta`/`tr`/`en` are always exactly two lines. */
export interface Kural {
  /** Kural number, 1–1330 (sequential). */
  n: number
  /** Tamil couplet. */
  ta: [string, string]
  /** Roman transliteration. */
  tr: [string, string]
  /** G. U. Pope's 1886 verse translation (public domain). */
  en: [string, string]
  /** Plain-English meaning. */
  s: string
  /** Chapter number, 1–133. */
  ch: number
  /** Section (book) id, 1–3. */
  sec: number
  /** Theme id. */
  th: string
}

export interface Chapter {
  n: number
  ta: string
  en: string
  sec: number
  iyal: string
  start: number
  end: number
}

export interface Section {
  id: number
  ta: string
  en: string
}

export interface ThemeTag {
  id: string
  ta: string
  en: string
}

export interface Corpus {
  kurals: Kural[]
  chapters: Chapter[]
  sections: Section[]
  themes: ThemeTag[]
}

/** One of the four reading layers the reader can switch on and off. */
export type LayerKey = 'tamil' | 'translit' | 'english' | 'simple'

export const LAYER_ORDER: readonly LayerKey[] = ['tamil', 'translit', 'english', 'simple']

export const LAYER_LABELS: Record<LayerKey, { ta: string; en: string }> = {
  tamil: { ta: 'குறள்', en: 'Tamil' },
  translit: { ta: 'ஒலிபெயர்ப்பு', en: 'Transliteration' },
  english: { ta: 'ஆங்கில விரிவு', en: 'English verse' },
  simple: { ta: 'எளிய பொருள்', en: 'Simple meaning' },
}
