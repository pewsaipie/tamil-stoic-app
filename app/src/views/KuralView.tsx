/**
 * The reader — /kural/:number
 *
 * A single couplet, read closely: breadcrumb, counter, the standard two-line
 * Tamil verse, the reader's chosen layers, and one action row (prev · save ·
 * reflect · listen · share · next). Keyboard: j / k move, s saves, l listens.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ImageDown,
  PenLine,
  Share2,
} from 'lucide-react'
import { chapterOf, findKural, sectionOf } from '../lib/corpus'
import { useCorpus } from '../hooks/useReader'
import { selectIsSaved, useReaderStore } from '../store/appStore'
import { useSpeechStore } from '../store/speechStore'
import { KuralVerse } from '../components/kural/KuralVerse'
import { ListenButton } from '../components/kural/ListenButton'
import { ReflectionDialog } from '../components/kural/ReflectionDialog'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { SkeletonKuralCard } from '../components/ui/Skeleton'
import { shareKural } from '../lib/share'
import { shareKuralCard } from '../lib/shareCard'
import { LAYER_LABELS } from '../lib/types'
import { themeById } from '../lib/search'

export function KuralView() {
  const { number } = useParams<{ number: string }>()
  const navigate = useNavigate()
  const { status, corpus } = useCorpus()
  const requested = Number(number)
  const kural = corpus && Number.isInteger(requested) ? findKural(corpus.kurals, requested) : undefined
  const saved = useReaderStore(selectIsSaved(kural?.n ?? -1))
  const toggleSaved = useReaderStore((state) => state.toggleSaved)
  const pushToast = useReaderStore((state) => state.pushToast)
  const markRead = useReaderStore((state) => state.markRead)
  const layers = useReaderStore((state) => state.layers)
  const stopSpeech = useSpeechStore((state) => state.stop)

  const [reflectionOpen, setReflectionOpen] = useState(false)

  // Landing on a kural counts as reading it — that is what grows the journey.
  useEffect(() => {
    if (kural) markRead(kural.n, kural.ch)
  }, [kural, markRead])

  // A new kural starts at the top, and leaving the page stops any recitation.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    return () => stopSpeech()
  }, [kural?.n, stopSpeech])

  const share = useCallback(() => {
    if (!kural) return
    void shareKural(kural).then((outcome) => {
      if (outcome === 'copied') pushToast('Kural copied to the clipboard ✓', 'success')
      if (outcome === 'failed') pushToast('Sharing is unavailable on this device', 'danger')
    })
  }, [kural, pushToast])

  // Keyboard: j/k walk the book, s saves, l listens.
  useEffect(() => {
    if (!kural) return
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'j' && kural.n < 1330) navigate(`/kural/${kural.n + 1}`)
      else if (event.key === 'k' && kural.n > 1) navigate(`/kural/${kural.n - 1}`)
      else if (event.key === 's') void toggleSaved(kural.n)
      else if (event.key === 'l') useSpeechStore.getState().toggle(kural)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [kural, navigate, toggleSaved])

  if (status === 'loading') {
    return (
      <main id="main" className="mx-auto max-w-[var(--reader-max)] px-4 py-[var(--space-6)]">
        <SkeletonKuralCard />
      </main>
    )
  }

  if (!corpus || !kural) {
    return (
      <main id="main" className="mx-auto max-w-[var(--reader-max)] px-4 py-[var(--space-6)] text-center">
        <p className="text-muted">That kural could not be found.</p>
        <Link to="/" className="text-accent-text">
          Back to today&rsquo;s kural
        </Link>
      </main>
    )
  }

  const chapter = chapterOf(corpus.chapters, kural)
  const section = sectionOf(corpus.sections, kural)
  const theme = themeById(corpus.themes, kural.th)
  const previous = kural.n > 1 ? findKural(corpus.kurals, kural.n - 1) : undefined
  const next = kural.n < corpus.kurals.length ? findKural(corpus.kurals, kural.n + 1) : undefined

  return (
    <main
      id="main"
      className="mx-auto max-w-[var(--reader-max)] px-4 pt-[var(--space-4)] pb-[var(--space-7)]"
    >
      <header className="mb-[var(--space-4)] flex items-center gap-3 text-sm">
        <Link
          to="/"
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 text-muted no-underline hover:text-ink"
        >
          <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
          <span>Home</span>
        </Link>
        <span aria-hidden="true" className="text-muted">
          ›
        </span>
        <span lang="ta" className="text-muted">
          {section?.ta} · {chapter?.ta}
        </span>
        <span className="ml-auto text-muted">
          {kural.n} / {corpus.kurals.length}
        </span>
      </header>

      <GlassCard as="article" grain aria-label={`Kural ${kural.n}`} className="p-5 sm:p-7">
        <p className="m-0 flex flex-wrap items-center gap-x-2 text-xs tracking-wide text-muted uppercase">
          <span>#{String(kural.n).padStart(3, '0')}</span>
          <span aria-hidden="true">·</span>
          <span>{theme?.en ?? ''}</span>
          <span aria-hidden="true">·</span>
          <span lang="ta">{chapter?.en}</span>
        </p>

        <div className="mt-[var(--space-5)] space-y-[var(--space-5)]">
          {layers.tamil ? <KuralVerse kural={kural} size="focus" /> : null}

          {layers.translit ? (
            <p className="transliteration m-0" lang="en">
              {kural.tr[0]} <span aria-hidden="true">—</span> {kural.tr[1]}
            </p>
          ) : null}

          {layers.english ? (
            <blockquote className="meaning m-0 border-l-2 border-line pl-4" lang="en">
              <span className="sr-only">{LAYER_LABELS.english.en}: </span>
              {kural.en[0]}
              {kural.en[1] ? (
                <>
                  <br />
                  {kural.en[1]}
                </>
              ) : null}
              <cite className="mt-1 block text-xs text-muted not-italic">— G. U. Pope (1886)</cite>
            </blockquote>
          ) : null}

          {layers.simple ? (
            <p
              className="m-0 rounded-[var(--radius-md)] border border-line bg-surface/70 px-4 py-3"
              lang="en"
            >
              <span className="sr-only">{LAYER_LABELS.simple.en}: </span>
              {kural.s}
            </p>
          ) : null}
        </div>

        <div
          role="group"
          aria-label={`Actions for kural ${kural.n}`}
          className="mt-[var(--space-6)] flex flex-wrap gap-2"
        >
          <Button
            variant={saved ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={saved}
            aria-label={`${saved ? 'Remove' : 'Save'} kural ${kural.n}`}
            icon={
              saved ? <BookmarkCheck size={17} strokeWidth={1.5} /> : <Bookmark size={17} strokeWidth={1.5} />
            }
            onClick={() => void toggleSaved(kural.n)}
          >
            {saved ? 'Saved' : 'Save'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<PenLine size={17} strokeWidth={1.5} />}
            onClick={() => setReflectionOpen(true)}
          >
            Reflect
          </Button>

          <ListenButton kural={kural} />

          <Button
            variant="secondary"
            size="sm"
            icon={<Share2 size={17} strokeWidth={1.5} />}
            onClick={share}
            aria-label={`Share kural ${kural.n}`}
          >
            Share
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<ImageDown size={17} strokeWidth={1.5} />}
            aria-label={`Share kural ${kural.n} as an image`}
            onClick={() => {
              pushToast('Preparing your bilingual share card…', 'info')
              void shareKuralCard({ kural, chapter }).then((outcome) => {
                if (outcome === 'downloaded') pushToast('Your share card is ready ✓', 'success')
                if (outcome === 'failed') pushToast('Could not create a share card here', 'danger')
              })
            }}
          >
            Card
          </Button>
        </div>
      </GlassCard>

      <nav aria-label="Kural navigation" className="mt-[var(--space-5)] flex justify-between gap-3">
        {previous ? (
          <Link
            to={`/kural/${previous.n}`}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent-text no-underline"
          >
            <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />#{previous.n}
          </Link>
        ) : (
          <span />
        )}
        <span className="self-center text-xs text-muted">j / k · s saves · l listens</span>
        {next ? (
          <Link
            to={`/kural/${next.n}`}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent-text no-underline"
          >
            #{next.n}
            <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <ReflectionDialog kural={kural} open={reflectionOpen} onOpenChange={setReflectionOpen} />
    </main>
  )
}
