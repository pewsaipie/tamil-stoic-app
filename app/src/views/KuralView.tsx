/**
 * Reader screen — /#/kural/:number
 *
 * Scaffold scope: breadcrumb, the reader's chosen layers, save and chapter
 * navigation. The full-screen detail layout, focus mode and the bottom-sheet
 * layer switcher land with Feature 6.
 */
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { chapterOf, findKural, sectionOf } from '../lib/corpus'
import { useCorpus } from '../hooks/useReader'
import { selectIsSaved, useReaderStore } from '../store/appStore'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { SkeletonKuralCard } from '../components/ui/Skeleton'

export function KuralView() {
  const { number } = useParams<{ number: string }>()
  const { status, corpus } = useCorpus()
  const requested = Number(number)
  const kural = corpus && Number.isInteger(requested) ? findKural(corpus.kurals, requested) : undefined
  const saved = useReaderStore(selectIsSaved(kural?.n ?? -1))
  const toggleSaved = useReaderStore((state) => state.toggleSaved)
  const layers = useReaderStore((state) => state.layers)

  if (status === 'loading') {
    return (
      <main className="mx-auto max-w-[var(--reader-max)] px-4 py-[var(--space-6)]">
        <SkeletonKuralCard />
      </main>
    )
  }

  if (!corpus || !kural) {
    return (
      <main className="mx-auto max-w-[var(--reader-max)] px-4 py-[var(--space-6)] text-center">
        <p className="text-muted">That Kural could not be found.</p>
        <Link to="/" className="text-accent-text">
          Back to today&rsquo;s Kural
        </Link>
      </main>
    )
  }

  const chapter = chapterOf(corpus.chapters, kural)
  const section = sectionOf(corpus.sections, kural)
  const previous = findKural(corpus.kurals, kural.n - 1)
  const next = findKural(corpus.kurals, kural.n + 1)

  return (
    <main className="mx-auto max-w-[var(--reader-max)] px-4 pt-[var(--space-5)] pb-[var(--space-9)]">
      <nav aria-label="Breadcrumb" className="mb-[var(--space-4)] flex items-center gap-3 text-sm">
        <Link
          to="/"
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 text-muted hover:text-ink"
        >
          <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
          <span>Home</span>
        </Link>
        <span className="text-muted" aria-hidden="true">
          ›
        </span>
        <span lang="ta" className="text-muted">
          {section?.ta} · {chapter?.ta}
        </span>
      </nav>

      <GlassCard as="article" grain aria-label={`Kural ${kural.n}`} className="p-6 sm:p-8">
        <p className="m-0 text-xs tracking-wide text-muted uppercase">#{kural.n} / 1330</p>

        <div className="mt-[var(--space-5)] space-y-[var(--space-5)]">
          {layers.tamil ? (
            <div className="verse" lang="ta">
              <p className="m-0">{kural.ta[0]}</p>
              <p className="m-0">{kural.ta[1]}</p>
            </div>
          ) : null}
          {layers.translit ? (
            <p className="transliteration m-0">
              {kural.tr[0]} · {kural.tr[1]}
            </p>
          ) : null}
          {layers.english ? (
            <p className="meaning m-0">
              {kural.en[0]} {kural.en[1]}
            </p>
          ) : null}
          {layers.simple ? (
            <p className="m-0 rounded-[var(--radius-md)] border border-line bg-surface/70 px-4 py-3 text-[15px]">
              {kural.s}
            </p>
          ) : null}
        </div>

        <div className="mt-[var(--space-6)] flex flex-wrap gap-3">
          <Button
            variant={saved ? 'primary' : 'secondary'}
            onClick={() => void toggleSaved(kural.n)}
            aria-pressed={saved}
            icon={
              saved ? (
                <BookmarkCheck size={18} strokeWidth={1.5} />
              ) : (
                <Bookmark size={18} strokeWidth={1.5} />
              )
            }
          >
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </GlassCard>

      <nav aria-label="Kural navigation" className="mt-[var(--space-5)] flex justify-between gap-3">
        {previous ? (
          <Link
            to={`/kural/${previous.n}`}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent-text"
          >
            <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
            #{previous.n}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/kural/${next.n}`}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent-text"
          >
            #{next.n}
            <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  )
}
