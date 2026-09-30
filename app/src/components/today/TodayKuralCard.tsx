/**
 * Today's Kural — the glassmorphic hero card (Feature 2).
 *
 * Layers are driven by the reader's stored preferences, so the card shows
 * exactly the layers chosen in Reading settings.
 */
import { motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, Share2, Sparkles } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'
import { useReducedMotion } from '../../hooks/useReader'
import { useReaderStore, selectIsSaved } from '../../store/appStore'
import { LAYER_LABELS, type Chapter, type Kural, type Section } from '../../lib/types'
import { cn } from '../../lib/cn'

export interface TodayKuralCardProps {
  kural: Kural
  chapter?: Chapter | undefined
  section?: Section | undefined
  onAnother: () => void
  onShare: () => void
}

export function TodayKuralCard({ kural, chapter, section, onAnother, onShare }: TodayKuralCardProps) {
  const layers = useReaderStore((state) => state.layers)
  const toggleSaved = useReaderStore((state) => state.toggleSaved)
  const saved = useReaderStore(selectIsSaved(kural.n))
  const reducedMotion = useReducedMotion()

  return (
    <GlassCard
      as="article"
      grain
      aria-label={`Kural ${kural.n}`}
      data-kural={kural.n}
      className="overflow-hidden p-6 sm:p-8"
    >
      {/* Breadcrumb: book › chapter · number */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-wide text-muted uppercase">
        <span lang="ta">{section?.ta ?? ''}</span>
        <span aria-hidden="true">›</span>
        <span lang="ta">{chapter?.ta ?? ''}</span>
        <span aria-hidden="true">·</span>
        <span>#{kural.n}</span>
      </p>

      <div className="mt-[var(--space-5)] space-y-[var(--space-5)]">
        {layers.tamil ? (
          <div className="verse" lang="ta">
            <p className="m-0">{kural.ta[0]}</p>
            <p className="m-0">{kural.ta[1]}</p>
          </div>
        ) : null}

        {layers.translit ? (
          <p className="transliteration m-0" lang="en">
            {kural.tr[0]} · {kural.tr[1]}
          </p>
        ) : null}

        {layers.english ? (
          <p className="meaning m-0" lang="en">
            <span className="sr-only">{LAYER_LABELS.english.en}: </span>
            {kural.en[0]} {kural.en[1]}
          </p>
        ) : null}

        {layers.simple ? (
          <p
            className={cn(
              'm-0 inline-block rounded-[var(--radius-md)] border border-line',
              'bg-surface/70 px-4 py-3 text-[15px] leading-relaxed',
            )}
            lang="en"
          >
            <span className="sr-only">{LAYER_LABELS.simple.en}: </span>
            {kural.s}
          </p>
        ) : null}
      </div>

      {/* Action row — Listen joins this row with the speech port (next step). */}
      <div className="mt-[var(--space-6)] flex flex-wrap gap-3">
        <Button
          variant={saved ? 'primary' : 'secondary'}
          onClick={() => void toggleSaved(kural.n)}
          aria-pressed={saved}
          aria-label={`${saved ? 'Remove' : 'Save'} Kural ${kural.n}`}
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

        <Button
          variant="secondary"
          onClick={onShare}
          aria-label={`Share Kural ${kural.n}`}
          icon={<Share2 size={18} strokeWidth={1.5} />}
        >
          Share
        </Button>

        <Button
          variant="ghost"
          onClick={onAnother}
          aria-label="Show another Kural"
          icon={
            <motion.span
              animate={reducedMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              key={kural.n}
              className="inline-flex"
            >
              <Sparkles size={18} strokeWidth={1.5} />
            </motion.span>
          }
        >
          Another
        </Button>
      </div>
    </GlassCard>
  )
}
