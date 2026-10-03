/**
 * KuralCard — the browse/search result card.
 *
 * Layers follow the reader's stored preferences (Tamil, transliteration, Pope's
 * English verse, simple meaning); the Tamil couplet itself is always the standard
 * two-line block from KuralVerse. Actions: save, share/copy and open the reader.
 */
import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import { KuralVerse } from './KuralVerse'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { LAYER_LABELS, type Chapter, type Kural, type Section, type ThemeTag } from '../../lib/types'
import { selectIsSaved, useReaderStore } from '../../store/appStore'
import { shareKural } from '../../lib/share'
import { themeLabel } from '../../lib/search'
import { cn } from '../../lib/cn'

export interface KuralCardProps {
  kural: Kural
  chapter?: Chapter | undefined
  section?: Section | undefined
  theme?: ThemeTag | undefined
  /** Prev/next links stay visible in browse lists, hidden in dense grids. */
  showNavigation?: boolean
  className?: string
}

export function KuralCard({
  kural,
  chapter,
  section,
  theme,
  showNavigation = true,
  className,
}: KuralCardProps) {
  const layers = useReaderStore((state) => state.layers)
  const saved = useReaderStore(selectIsSaved(kural.n))
  const toggleSaved = useReaderStore((state) => state.toggleSaved)
  const pushToast = useReaderStore((state) => state.pushToast)

  const onShare = async (): Promise<void> => {
    const outcome = await shareKural(kural)
    if (outcome === 'copied') pushToast('Kural copied to the clipboard ✓', 'success')
    if (outcome === 'failed') pushToast('Sharing is unavailable on this device', 'danger')
  }

  return (
    <GlassCard
      as="article"
      quiet
      aria-label={`Kural ${kural.n}`}
      id={`kural-${kural.n}`}
      className={cn('scroll-mt-[var(--space-7)] p-5 sm:p-6', className)}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-wide text-muted uppercase">
        <a
          href={`#kural-${kural.n}`}
          className="text-accent-text no-underline"
          aria-label={`Link to kural ${kural.n}`}
        >
          #{String(kural.n).padStart(3, '0')}
        </a>
        <span aria-hidden="true">·</span>
        <span lang="ta">{chapter?.ta ?? ''}</span>
        <span aria-hidden="true">·</span>
        <span>{themeLabel(theme)}</span>
      </header>

      <div className="mt-[var(--space-4)] space-y-[var(--space-4)]">
        {layers.tamil ? <KuralVerse kural={kural} /> : null}

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
            className="m-0 rounded-[var(--radius-md)] border border-line bg-surface/70 px-4 py-3 text-[15px] leading-relaxed"
            lang="en"
          >
            <span className="sr-only">{LAYER_LABELS.simple.en}: </span>
            {kural.s}
          </p>
        ) : null}
      </div>

      <footer className="mt-[var(--space-5)] flex flex-wrap items-center gap-2">
        <Button
          variant={saved ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => void toggleSaved(kural.n)}
          aria-pressed={saved}
          aria-label={`${saved ? 'Remove' : 'Save'} Kural ${kural.n}`}
          icon={saved ? <BookmarkCheck size={17} strokeWidth={1.5} /> : <Bookmark size={17} strokeWidth={1.5} />}
        >
          {saved ? 'Saved' : 'Save'}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => void onShare()}
          aria-label={`Share Kural ${kural.n}`}
          icon={<Share2 size={17} strokeWidth={1.5} />}
        >
          Share
        </Button>

        <Link
          to={`/kural/${kural.n}`}
          className="inline-flex min-h-[44px] items-center px-3 text-sm text-accent-text"
        >
          Read
        </Link>

        {showNavigation ? (
          <span className="ml-auto flex items-center gap-1" role="group" aria-label={`Kural ${kural.n} navigation`}>
            <Link
              to={`/kural/${kural.n - 1}`}
              aria-label="Previous kural"
              className={cn(
                'inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-muted',
                kural.n <= 1 && 'pointer-events-none opacity-40',
              )}
            >
              <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
            </Link>
            <Link
              to={`/kural/${kural.n + 1}`}
              aria-label="Next kural"
              className={cn(
                'inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-muted',
                kural.n >= 1330 && 'pointer-events-none opacity-40',
              )}
            >
              <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </span>
        ) : null}

        <span className={cn('text-xs text-muted', showNavigation ? '' : 'ml-auto')}>
          {section ? `${section.ta} · ${section.en}` : ''}
        </span>
      </footer>
    </GlassCard>
  )
}
