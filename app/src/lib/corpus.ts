/**
 * Corpus access.
 *
 * The JSON is fetched once (base-relative so it works from the GitHub Pages
 * sub-path), cached in memory, and served from the service worker's cache on
 * later visits — the reader is offline-complete after the first load.
 */
import type { Chapter, Corpus, Kural, Section, ThemeTag } from './types'

const CORPUS_URL = `${import.meta.env.BASE_URL}data/kurals.json`

let corpusPromise: Promise<Corpus> | null = null

function isStringPair(value: unknown): value is [string, string] {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'string')
}

function parseKural(value: unknown): Kural {
  if (typeof value !== 'object' || value === null) throw new Error('corpus: kural is not an object')
  const raw = value as Record<string, unknown>
  const n = raw['n']
  const ta = raw['ta']
  const tr = raw['tr']
  const en = raw['en']
  const s = raw['s']
  const ch = raw['ch']
  const sec = raw['sec']
  const th = raw['th']

  if (typeof n !== 'number') throw new Error('corpus: kural without a number')
  if (!isStringPair(ta) || !isStringPair(tr) || !isStringPair(en)) {
    throw new Error(`corpus: kural ${n} has malformed verse lines`)
  }
  if (typeof s !== 'string' || typeof ch !== 'number' || typeof sec !== 'number') {
    throw new Error(`corpus: kural ${n} has malformed metadata`)
  }

  return { n, ta, tr, en, s, ch, sec, th: typeof th === 'string' ? th : 'all' }
}

function parseChapter(value: unknown): Chapter | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  const n = raw['n']
  if (typeof n !== 'number') return null
  return {
    n,
    ta: typeof raw['ta'] === 'string' ? raw['ta'] : '',
    en: typeof raw['en'] === 'string' ? raw['en'] : '',
    sec: typeof raw['sec'] === 'number' ? raw['sec'] : 1,
    iyal: typeof raw['iyal'] === 'string' ? raw['iyal'] : '',
    start: typeof raw['start'] === 'number' ? raw['start'] : 0,
    end: typeof raw['end'] === 'number' ? raw['end'] : 0,
  }
}

function parseTag(value: unknown, idKey: 'id' | 'n'): { id: string; ta: string; en: string } | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  const id = raw[idKey]
  if (typeof id !== 'string' && typeof id !== 'number') return null
  return {
    id: String(id),
    ta: typeof raw['ta'] === 'string' ? raw['ta'] : '',
    en: typeof raw['en'] === 'string' ? raw['en'] : '',
  }
}

/** Load and cache the corpus. Concurrent callers share one request. */
export function loadCorpus(): Promise<Corpus> {
  if (corpusPromise) return corpusPromise

  corpusPromise = (async () => {
    const response = await fetch(CORPUS_URL, { credentials: 'same-origin' })
    if (!response.ok) {
      throw new Error(`corpus: request failed with ${response.status}`)
    }
    const payload: unknown = await response.json()
    if (typeof payload !== 'object' || payload === null) throw new Error('corpus: empty payload')

    const raw = payload as Record<string, unknown>
    const kurals = Array.isArray(raw['kurals']) ? raw['kurals'].map(parseKural) : []
    const chapters = Array.isArray(raw['chapters'])
      ? raw['chapters'].map(parseChapter).filter((chapter): chapter is Chapter => chapter !== null)
      : []
    const sections: Section[] = Array.isArray(raw['sections'])
      ? raw['sections']
          .map((entry) => parseTag(entry, 'id'))
          .filter((tag): tag is { id: string; ta: string; en: string } => tag !== null)
          .map((tag) => ({ id: Number(tag.id), ta: tag.ta, en: tag.en }))
      : []
    const themes: ThemeTag[] = Array.isArray(raw['themes'])
      ? raw['themes']
          .map((entry) => parseTag(entry, 'id'))
          .filter((tag): tag is { id: string; ta: string; en: string } => tag !== null)
      : []

    if (kurals.length === 0) throw new Error('corpus: no kurals parsed')

    return { kurals, chapters, sections, themes }
  })()

  // A failed load must not poison the cache — the next mount retries.
  corpusPromise.catch(() => {
    corpusPromise = null
  })

  return corpusPromise
}

/** Deterministic "Kural of the day" — same verse for every reader, all day. */
export function kuralOfTheDay(kurals: readonly Kural[], now: Date = new Date()): Kural {
  const epoch = Date.UTC(2024, 0, 1)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.floor((today - epoch) / 86_400_000)
  const index = ((days % kurals.length) + kurals.length) % kurals.length
  const kural = kurals[index]
  if (!kural) throw new Error('corpus: empty collection')
  return kural
}

export function findKural(kurals: readonly Kural[], n: number): Kural | undefined {
  return kurals.find((kural) => kural.n === n)
}

export function chapterOf(chapters: readonly Chapter[], kural: Kural): Chapter | undefined {
  return chapters.find((chapter) => chapter.n === kural.ch)
}

export function sectionOf(sections: readonly Section[], kural: Kural): Section | undefined {
  return sections.find((section) => section.id === kural.sec)
}

/** Kurals belonging to one of the three books. */
export function kuralsInSection(kurals: readonly Kural[], sectionId: number): Kural[] {
  return kurals.filter((kural) => kural.sec === sectionId)
}

export function kuralsInChapter(kurals: readonly Kural[], chapterNumber: number): Kural[] {
  return kurals.filter((kural) => kural.ch === chapterNumber)
}
