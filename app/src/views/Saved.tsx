/**
 * Saved Kurals — the reader's private collection.
 *
 * Saved kurals and reflections are read from the same device-local store the
 * shipped reader used, so nothing was lost in the rewrite, and nothing here is
 * ever sent anywhere.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookmarkX, PenLine, Share2 } from 'lucide-react'
import { useCorpus } from '../hooks/useReader'
import { useReaderStore } from '../store/appStore'
import { KuralVerse } from '../components/kural/KuralVerse'
import { ReflectionDialog } from '../components/kural/ReflectionDialog'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { SkeletonKuralCard } from '../components/ui/Skeleton'
import { chapterOf, findKural, sectionOf } from '../lib/corpus'
import { shareKural } from '../lib/share'
import { useT } from '../i18n'
import type { Kural } from '../lib/types'

export function Saved() {
  const { status, corpus } = useCorpus()
  const saved = useReaderStore((state) => state.saved)
  const hydrated = useReaderStore((state) => state.hydrated)
  const toggleSaved = useReaderStore((state) => state.toggleSaved)
  const pushToast = useReaderStore((state) => state.pushToast)
  const [reflectionFor, setReflectionFor] = useState<Kural | null>(null)
  const [reflectionOpen, setReflectionOpen] = useState(false)
  const t = useT()

  const entries = useMemo(() => {
    if (!corpus) return []
    return saved
      .map((record) => ({ record, kural: findKural(corpus.kurals, record.n) }))
      .filter((entry): entry is { record: typeof saved[number]; kural: Kural } => entry.kural !== undefined)
  }, [corpus, saved])

  if (status === 'loading' || !hydrated) {
    return (
      <main id="main" className="mx-auto max-w-[var(--reader-max)] px-4 pt-[var(--space-5)] pb-[var(--space-7)]">
        <h1 className="m-0 mb-[var(--space-4)] text-2xl text-ink">
          <span lang="ta">புத்தகக் குறிப்பு</span> · {t('nav.saved', 'Saved')}
        </h1>
        <SkeletonKuralCard />
      </main>
    )
  }

  return (
    <main id="main" className="mx-auto max-w-[var(--reader-max)] px-4 pt-[var(--space-5)] pb-[var(--space-7)]">
      <nav aria-label="Breadcrumb" className="mb-[var(--space-3)]">
        <Link to="/" className="text-sm text-muted no-underline hover:text-ink">
          ← Today
        </Link>
      </nav>

      <h1 className="m-0 text-2xl text-ink">
        <span lang="ta">புத்தகக் குறிப்பு</span> · {t('saved.title', 'Saved Kurals')}
      </h1>
      <p className="mt-1 mb-[var(--space-5)] text-sm text-muted">
        {t(
          'saved.intro',
          'Saved kurals and reflections stay on this device. Nothing is posted or shared automatically.',
        )}
      </p>

      {entries.length === 0 ? (
        <GlassCard quiet className="p-6 text-center">
          <p className="m-0 text-muted">
            {t('saved.empty', 'Save a kural that meets you at the right moment. It will appear here.')}
          </p>
          <p className="mt-[var(--space-4)] mb-0">
            <Link to="/chapters" className="text-accent-text">
              Browse the 133 chapters →
            </Link>
          </p>
        </GlassCard>
      ) : null}

      <div className="space-y-[var(--space-4)]">
        {entries.map(({ record, kural }) => {
          const chapter = corpus ? chapterOf(corpus.chapters, kural) : undefined
          const section = corpus ? sectionOf(corpus.sections, kural) : undefined
          return (
            <GlassCard key={record.n} as="article" quiet aria-label={`Saved kural ${kural.n}`} className="p-5">
              <header className="flex flex-wrap items-center gap-x-2 text-xs tracking-wide text-muted uppercase">
                <Link to={`/kural/${kural.n}`} className="text-accent-text no-underline">
                  #{String(kural.n).padStart(3, '0')}
                </Link>
                <span aria-hidden="true">·</span>
                <span lang="ta">{chapter?.ta ?? ''}</span>
                <span aria-hidden="true">·</span>
                <span>{section?.en ?? ''}</span>
              </header>

              <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
                <KuralVerse kural={kural} />
                <p className="transliteration m-0" lang="en">
                  {kural.tr[0]} <span aria-hidden="true">—</span> {kural.tr[1]}
                </p>
                <p
                  className="m-0 rounded-[var(--radius-md)] border border-line bg-surface/70 px-4 py-3 text-[15px]"
                  lang="en"
                >
                  {kural.s}
                </p>
                {record.note ? (
                  <div className="rounded-[var(--radius-md)] border border-accent/40 bg-accent/10 px-4 py-3">
                    <p className="m-0 text-xs tracking-wide text-muted uppercase">
                      {t('saved.noteLabel', 'Private reflection')}
                    </p>
                    <p className="m-0 mt-1 text-[15px] whitespace-pre-wrap">{record.note}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-[var(--space-4)] flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<PenLine size={17} strokeWidth={1.5} />}
                  onClick={() => {
                    setReflectionFor(kural)
                    setReflectionOpen(true)
                  }}
                >
                  {record.note ? 'Edit reflection' : 'Reflect'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Share2 size={17} strokeWidth={1.5} />}
                  onClick={() => {
                    void shareKural(kural).then((outcome) => {
                      if (outcome === 'copied') pushToast('Kural copied to the clipboard ✓', 'success')
                    })
                  }}
                >
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<BookmarkX size={17} strokeWidth={1.5} />}
                  onClick={() => void toggleSaved(kural.n)}
                >
                  Remove
                </Button>
              </div>
            </GlassCard>
          )
        })}
      </div>

      <ReflectionDialog kural={reflectionFor} open={reflectionOpen} onOpenChange={setReflectionOpen} />
    </main>
  )
}
