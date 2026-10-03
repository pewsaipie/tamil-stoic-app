/**
 * Chapters — the browse screen: three books, search with suggestions, chapter
 * selection, theme chips, situation shortcuts, the 133-chapter map and the
 * lazily-rendered result list.
 *
 * Every filter is deep-linkable (`/chapters?book=1&chapter=16`, `?theme=anger`,
 * `?q=பொறுத்தல்`) so searches and doors can be shared, and the legacy fragments
 * from the shipped reader are upgraded to these routes before the router mounts.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Eraser } from 'lucide-react'
import { useCorpus } from '../hooks/useReader'
import { PAGE_SIZE, usePagedList } from '../hooks/usePagedList'
import {
  buildIndex,
  chapterById,
  clearRecentSearches,
  matchesQuery,
  pushRecentSearch,
  readRecentSearches,
  suggest,
  themeById,
  themeLabel,
  type Suggestion,
} from '../lib/search'
import { ChapterMap } from '../components/chapters/ChapterMap'
import { SearchBar } from '../components/chapters/SearchBar'
import { KuralCard } from '../components/kural/KuralCard'
import { ReflectionDialog } from '../components/kural/ReflectionDialog'
import { SkeletonKuralCard } from '../components/ui/Skeleton'
import { TopBar } from '../components/layout/TopBar'
import { SITUATIONS } from '../lib/situations'
import { useReaderStore } from '../store/appStore'
import { useT } from '../i18n'
import type { Kural } from '../lib/types'

const BOOKS: readonly { id: number | 'all'; label: string }[] = [
  { id: 'all', label: 'அனைத்தும் · All' },
  { id: 1, label: 'அறம் · Virtue' },
  { id: 2, label: 'பொருள் · Wealth' },
  { id: 3, label: 'காமம் · Love' },
]

function parseBook(value: string | null): number | 'all' {
  if (value === '1' || value === '2' || value === '3') return Number(value)
  return 'all'
}

export function Chapters() {
  const { status, corpus, error } = useCorpus()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const book = parseBook(params.get('book'))
  const chapterParam = Number(params.get('chapter'))
  const activeChapter =
    Number.isInteger(chapterParam) && chapterParam >= 1 && chapterParam <= 133 ? chapterParam : null
  const themeParam = params.get('theme')
  const query = params.get('q') ?? ''

  const [searchInput, setSearchInput] = useState(query)
  const [recents, setRecents] = useState<string[]>(() => readRecentSearches())
  const [mapOpen, setMapOpen] = useState(false)
  const [reflectionFor, setReflectionFor] = useState<Kural | null>(null)

  const t = useT()
  const read = useReaderStore((state) => state.read)
  const visited = useReaderStore((state) => state.chapters)
  const markRead = useReaderStore((state) => state.markRead)

  const index = useMemo(() => (corpus ? buildIndex(corpus) : []), [corpus])

  const activeTheme = useMemo(() => {
    if (!corpus || !themeParam) return null
    return themeById(corpus.themes, themeParam)?.id ?? null
  }, [corpus, themeParam])

  const results = useMemo(() => {
    let entries = index
    if (book !== 'all') entries = entries.filter((entry) => entry.kural.sec === book)
    if (activeChapter !== null) entries = entries.filter((entry) => entry.kural.ch === activeChapter)
    if (activeTheme) entries = entries.filter((entry) => entry.kural.th === activeTheme)
    const trimmed = query.trim()
    if (trimmed) entries = entries.filter((entry) => matchesQuery(entry, trimmed))
    return entries
  }, [index, book, activeChapter, activeTheme, query])

  const paged = usePagedList(results, PAGE_SIZE)
  const suggestions = useMemo(
    () => (corpus ? suggest(corpus, index, searchInput) : []),
    [corpus, index, searchInput],
  )

  // Keep the field in step when the URL changes underneath it (back button, a
  // shared link, a suggestion that sets a filter).
  useEffect(() => {
    setSearchInput(query)
  }, [query])

  // Mark kurals read as their cards scroll into view — the chapter map's visited
  // marks and the gentle streak grow from real reading, not from page loads.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const nodes = document.querySelectorAll<HTMLElement>('[data-kural]:not([data-read])')
    if (nodes.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const element = entry.target as HTMLElement
          const n = Number(element.getAttribute('data-kural'))
          if (Number.isInteger(n) && n > 0) {
            markRead(n, Math.ceil(n / 10))
            element.dataset['read'] = 'true'
          }
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -20% 0px' },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [results, markRead])

  const updateParam = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      setParams(next, { replace: false })
    },
    [params, setParams],
  )

  const selectChapter = useCallback(
    (n: number) => {
      const chapter = corpus ? chapterById(corpus.chapters, n) : undefined
      updateParam({
        chapter: String(n),
        theme: null,
        book: chapter ? String(chapter.sec) : null,
      })
      setMapOpen(false)
    },
    [corpus, updateParam],
  )

  const selectTheme = useCallback(
    (id: string) => {
      updateParam({ theme: id, chapter: null })
    },
    [updateParam],
  )

  const onPickSuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.kind === 'kural') {
        navigate(`/kural/${suggestion.value}`)
        return
      }
      if (suggestion.kind === 'chapter') {
        selectChapter(Number(suggestion.value))
        return
      }
      selectTheme(suggestion.value)
    },
    [navigate, selectChapter, selectTheme],
  )

  const submitSearch = useCallback(
    (value: string) => {
      updateParam({ q: value.trim() === '' ? null : value.trim() })
      if (value.trim()) setRecents(pushRecentSearch(value))
    },
    [updateParam],
  )

  const clearAll = useCallback(() => {
    setParams(new URLSearchParams(), { replace: false })
    setSearchInput('')
  }, [setParams])

  const hasFilters = Boolean(query || activeChapter || activeTheme || book !== 'all')

  if (status === 'loading') {
    return (
      <main className="mx-auto max-w-[var(--content-max)] px-4 py-[var(--space-6)]">
        <SkeletonKuralCard />
      </main>
    )
  }

  if (!corpus) {
    return (
      <main className="mx-auto max-w-[var(--content-max)] px-4 py-[var(--space-6)]" role="alert">
        <p className="text-danger">{error?.message ?? 'The kurals could not be loaded.'}</p>
        <p className="text-sm text-muted">
          The corpus is stored offline after the first visit — reconnect once to fill the cache.
        </p>
      </main>
    )
  }

  const activeChapterMeta = activeChapter !== null ? chapterById(corpus.chapters, activeChapter) : undefined
  const chapterThemes = activeChapter
    ? [
        ...new Set(
          corpus.kurals.filter((kural) => kural.ch === activeChapter).map((kural) => kural.th),
        ),
      ]
    : []

  return (
    <main id="main" className="mx-auto max-w-[var(--content-max)] px-4 pt-[var(--space-5)] pb-[var(--space-7)]">
      <TopBar className="mb-[var(--space-3)]" />
      <nav aria-label="Breadcrumb" className="mb-[var(--space-3)]">
        <Link to="/" className="text-sm text-muted no-underline hover:text-ink">
          ← Today
        </Link>
      </nav>

      <h1 className="m-0 text-2xl text-ink">
        <span lang="ta">அத்தியாயங்கள்</span> · {t('browse.title', 'Chapters')}
      </h1>
      <p className="mt-1 mb-[var(--space-4)] text-sm text-muted">
        {t(
          'browse.sub',
          'Search by number or word, pick a chapter, or open a door that fits your day.',
        )}
      </p>

      {/* Books */}
      <div role="group" aria-label="Filter by book" className="mb-[var(--space-3)] flex flex-wrap gap-2">
        {BOOKS.map((item) => (
          <button
            key={String(item.id)}
            type="button"
            aria-pressed={book === item.id}
            className="chip"
            onClick={() => updateParam({ book: item.id === 'all' ? null : String(item.id) })}
          >
            <span lang="ta">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Stats — derived from the corpus and the reader's own journey. */}
      <dl className="mb-[var(--space-5)] grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'அதிகாரங்கள்', value: corpus.chapters.length },
          { label: 'குறள்கள்', value: corpus.kurals.length },
          { label: 'இயல்கள்', value: new Set(corpus.chapters.map((chapter) => chapter.iyal)).size },
          { label: 'படித்தவை', value: Object.keys(read).length },
          { label: 'பார்த்தவை', value: Object.keys(visited).length },
          { label: 'தலைப்புகள்', value: corpus.themes.length - 1 },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel glass-panel--quiet p-2">
            <dt lang="ta" className="text-[11px] text-muted">
              {stat.label}
            </dt>
            <dd className="m-0 text-lg text-ink">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {/* Search */}
      <div className="mb-[var(--space-4)]">
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={submitSearch}
          suggestions={suggestions}
          recents={recents}
          onPickSuggestion={onPickSuggestion}
          onPickRecent={(value) => {
            setSearchInput(value)
            submitSearch(value)
          }}
          onClearRecents={() => {
            clearRecentSearches()
            setRecents([])
          }}
          statusId="result-status"
        />
      </div>

      {/* Themes */}
      <div role="group" aria-label="Filter by theme" className="mb-[var(--space-4)] flex flex-wrap gap-2">
        {corpus.themes
          .filter((theme) => theme.id !== 'all')
          .map((theme) => (
            <button
              key={theme.id}
              type="button"
              className="chip"
              aria-pressed={activeTheme === theme.id}
              onClick={() => selectTheme(theme.id)}
            >
              <span lang="ta">{theme.ta}</span>
              <span className="text-xs">{theme.en}</span>
            </button>
          ))}
      </div>

      {/* Result line */}
      <p
        id="result-status"
        role="status"
        className="m-0 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted"
      >
        <span>
          {results.length} {results.length === 1 ? 'kural' : 'kurals'}
          {activeChapterMeta ? ` · ${activeChapterMeta.ta}` : ''}
          {activeTheme ? ` · ${themeLabel(themeById(corpus.themes, activeTheme))}` : ''}
        </span>
        {hasFilters ? (
          <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 text-accent-text">
            <Eraser size={14} strokeWidth={1.6} aria-hidden="true" /> {t('clear.text', 'Clear')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setMapOpen((open) => !open)}
          aria-expanded={mapOpen}
          className="ml-auto inline-flex items-center gap-1 text-accent-text"
        >
          {mapOpen ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
          {t('map.title', 'All 133 chapters')}
        </button>
      </p>

      {/* Chapter intro — data-derived, never invented. */}
      {activeChapterMeta ? (
        <section
          aria-label="Chapter introduction"
          className="glass-panel glass-panel--quiet mt-[var(--space-4)] p-4"
        >
          <h2 className="m-0 text-lg text-ink">
            <span lang="ta">{activeChapterMeta.ta}</span>{' '}
            <span className="text-sm text-muted">{activeChapterMeta.en}</span>
          </h2>
          <p className="mt-1 mb-0 text-sm text-muted">
            {activeChapterMeta.iyal} · kurals {activeChapterMeta.start}–{activeChapterMeta.end}
            {chapterThemes.length ? ` · ${chapterThemes.map((id) => themeLabel(themeById(corpus.themes, id))).join(' · ')}` : ''}
          </p>
        </section>
      ) : null}

      {/* Chapter map */}
      {mapOpen ? (
        <section aria-label="All 133 chapters" className="glass-panel grain mt-[var(--space-4)] p-4">
          <ChapterMap
            chapters={corpus.chapters}
            sections={corpus.sections}
            visited={visited}
            activeBook={book}
            activeChapter={activeChapter}
            onSelect={selectChapter}
          />
        </section>
      ) : null}

      {/* Situation doors, only while nothing is filtered — they are a starting point. */}
      {!hasFilters && !mapOpen ? (
        <section aria-label="Situation shortcuts" className="mt-[var(--space-5)]">
          <h2 className="m-0 text-sm text-muted">
            <span lang="ta">சூழ்நிலை</span> · Where are you today?
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {SITUATIONS.map((situation) => (
              <button
                key={situation.id}
                type="button"
                className="chip"
                onClick={() => selectTheme(situation.theme)}
              >
                <span lang="ta">{situation.ta}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Results */}
      <section aria-label="Kurals" className="mt-[var(--space-5)] space-y-[var(--space-4)]">
        {paged.visible.map((entry) => (
          <KuralCard
            key={entry.kural.n}
            kural={entry.kural}
            chapter={entry.chapter}
            section={entry.section}
            theme={entry.theme}
            onReflect={(kural) => setReflectionFor(kural)}
          />
        ))}

        {results.length === 0 ? (
          <p className="glass-panel glass-panel--quiet m-0 p-6 text-center text-muted">
            Nothing found. Try a number (151), a Tamil word (பொறுத்தல்) or an English one
            (patience).
          </p>
        ) : null}

        {paged.hasMore ? (
          <div ref={paged.sentinelRef} className="py-4 text-center text-sm text-muted">
            {t('list.loading', 'Loading more…')}
          </div>
        ) : null}
      </section>

      <ReflectionDialog
        kural={reflectionFor}
        open={reflectionFor !== null}
        onOpenChange={(open) => {
          if (!open) setReflectionFor(null)
        }}
      />
    </main>
  )
}
