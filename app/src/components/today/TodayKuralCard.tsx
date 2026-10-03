/**
 * Today's Kural — the glassmorphic hero card (Feature 2).
 *
 * Layers are driven by the reader's stored preferences, so the card shows
 * exactly the layers chosen in Reading settings.
 */
import { motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, ImageDown, Share2, Sparkles } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { KuralVerse } from '../kural/KuralVerse'
import { Button } from '../ui/Button'
import { useReducedMotion } from '../../hooks/useReader'
import { useReaderStore, selectIsSaved } from '../../store/appStore'
import { LAYER_LABELS, type Chapter, type Kural, type Section } from '../../lib/types'
import { cn } from '../../lib/cn'
import { useT } from '../../i18n'
import { shareKuralCard } from '../../lib/shareCard'
import { ListenButton } from '../kural/ListenButton'

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
  const t = useT()
  const pushToast = useReaderStore((state) => state.pushToast)


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
        {layers.tamil ? <KuralVerse kural={kural} size="focus" /> : null}

        {layers.translit ? (
          <p className="transliteration m-0" lang="en">
            <span className="block">{kural.tr[0]}</span>
            <span className="block">{kural.tr[1]}</span>
          </p>
        ) : null}

        {layers.english ? (
          <blockquote className="meaning m-0 border-l-2 border-line pl-4" lang="en">
            <span className="sr-only">{LAYER_LABELS.english.en}: </span>
            <span className="block">{kural.en[0]}</span>
            {kural.en[1] ? <span className="block">{kural.en[1]}</span> : null}
            <cite className="mt-1 block text-xs text-muted not-italic">— G. U. Pope (1886)</cite>
          </blockquote>
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

        <ListenButton kural={kural} />

        <Button
          variant="secondary"
          onClick={onShare}
          aria-label={`Share Kural ${kural.n}`}
          icon={<Share2 size={18} strokeWidth={1.5} />}
        >
          Share
        </Button>

        <Button
          variant="secondary"
          onClick={() => {
            pushToast('Preparing your bilingual share card…', 'info')
            void shareKuralCard({ kural, chapter }).then((outcome) => {
              if (outcome === 'downloaded') pushToast('Your share card is ready ✓', 'success')
              if (outcome === 'failed') pushToast('Could not create a share card here', 'danger')
            })
          }}
          aria-label={`Share Kural ${kural.n} as an image`}
          icon={<ImageDown size={18} strokeWidth={1.5} />}
        >
          Card
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
          {t('daily.shuffle', 'Another')}
        </Button>
      </div>
    </GlassCard>
  )
}
