/**
 * Search, suggestions and recent searches — the reader-side index.
 *
 * Behaviour is a faithful port of the shipped reader so the two apps answer the
 * same query identically:
 *   - a bare number matches that kural number (`151`)
 *   - every whitespace-separated token must appear somewhere in the kural's
 *     Tamil / transliteration / English / simple-meaning / chapter / theme text
 *   - suggestions offer chapter and theme names, and kural numbers when the
 *     query is numeric
 *
 * Recent searches live in localStorage under the same key the shipped app uses
 * (`tamil-stoic-recent-searches-v1`), so a reader keeps their history across the
 * rewrite. Nothing leaves the device.
 */
import type { Chapter, Corpus, Kural, Section, ThemeTag } from './types'

export const RECENT_KEY = 'tamil-stoic-recent-searches-v1'
const RECENT_LIMIT = 8

export interface IndexedKural {
  kural: Kural
  chapter: Chapter | undefined
  section: Section | undefined
  theme: ThemeTag | undefined
  /** Lower-cased haystack of every searchable field. */
  haystack: string
}

export interface Suggestion {
  id: string
  label: string
  hint: string
  kind: 'kural' | 'chapter' | 'theme'
  value: string
}

export function chapterById(chapters: readonly Chapter[], n: number): Chapter | undefined {
  return chapters.find((chapter) => chapter.n === n)
}

export function sectionById(sections: readonly Section[], id: number): Section | undefined {
  return sections.find((section) => section.id === id)
}

export function themeById(themes: readonly ThemeTag[], id: string): ThemeTag | undefined {
  return themes.find((theme) => theme.id === id)
}

export function themeLabel(theme: ThemeTag | undefined): string {
  if (!theme) return ''
  return theme.id === 'all' ? theme.en : `${theme.ta} · ${theme.en}`
}

export function buildIndex(corpus: Corpus): IndexedKural[] {
  return corpus.kurals.map((kural) => {
    const chapter = chapterById(corpus.chapters, kural.ch)
    const section = sectionById(corpus.sections, kural.sec)
    const theme = themeById(corpus.themes, kural.th)
    const haystack = [
      kural.ta[0],
      kural.ta[1],
      kural.tr[0],
      kural.tr[1],
      kural.en[0],
      kural.en[1],
      kural.s,
      chapter?.ta ?? '',
      chapter?.en ?? '',
      section?.ta ?? '',
      section?.en ?? '',
      theme ? `${theme.ta} ${theme.en}` : '',
    ]
      .join(' \n ')
      .toLowerCase()
    return { kural, chapter, section, theme, haystack }
  })
}

/** True when the entry satisfies every token in the query. */
export function matchesQuery(entry: IndexedKural, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true

  if (/^\d+$/.test(query)) return String(entry.kural.n) === String(Number.parseInt(query, 10))

  for (const token of query.split(/\s+/)) {
    if (!entry.haystack.includes(token)) return false
  }
  return true
}

export function searchIndex(index: readonly IndexedKural[], query: string): Kural[] {
  const trimmed = query.trim()
  if (!trimmed) return index.map((entry) => entry.kural)
  return index.filter((entry) => matchesQuery(entry, trimmed)).map((entry) => entry.kural)
}

/**
 * Suggestions shown under the search field: numbers, chapter names, theme names
 * and (when the query is numeric) the kural itself.
 */
export function suggest(
  corpus: Corpus,
  index: readonly IndexedKural[],
  query: string,
  limit = 6,
): Suggestion[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []

  const out: Suggestion[] = []

  if (/^\d{1,4}$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10)
    const entry = index.find((item) => item.kural.n === n)
    if (entry && entry.kural.n <= corpus.kurals.length) {
      out.push({
        id: `kural-${n}`,
        label: `#${n}`,
        hint: `${entry.kural.ta[0]} …`,
        kind: 'kural',
        value: String(n),
      })
    }
  }

  for (const chapter of corpus.chapters) {
    if (out.length >= limit) break
    if (chapter.ta.toLowerCase().includes(trimmed) || chapter.en.toLowerCase().includes(trimmed)) {
      out.push({
        id: `chapter-${chapter.n}`,
        label: chapter.ta,
        hint: `${chapter.en} · ${chapter.start}–${chapter.end}`,
        kind: 'chapter',
        value: String(chapter.n),
      })
    }
  }

  for (const theme of corpus.themes) {
    if (out.length >= limit) break
    if (theme.id === 'all') continue
    if (theme.ta.toLowerCase().includes(trimmed) || theme.en.toLowerCase().includes(trimmed)) {
      out.push({
        id: `theme-${theme.id}`,
        label: theme.ta,
        hint: theme.en,
        kind: 'theme',
        value: theme.id,
      })
    }
  }

  return out.slice(0, limit)
}

/* --------------------------------------------------------------------------- */
/* Recent searches — device-local only.                                        */
/* --------------------------------------------------------------------------- */

export function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

export function pushRecentSearch(query: string): string[] {
  const trimmed = query.trim()
  if (!trimmed) return readRecentSearches()
  const next = [trimmed, ...readRecentSearches().filter((item) => item !== trimmed)].slice(
    0,
    RECENT_LIMIT,
  )
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Private mode: history simply does not persist.
  }
  return next
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(RECENT_KEY)
  } catch {
    // ignore
  }
}
