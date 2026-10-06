/**
 * Reading journey — the water in the pot.
 *
 * The reader's progress is a **level in a vessel**, not a percentage bar: the
 * same number the table scene's pot holds, drawn here so it survives with the
 * canvas switched off, in forced colours, and in print. Numbers and counts are
 * unchanged and stay in a real `<dl>` for screen readers; the water is
 * decoration over the top of them.
 *
 * The streak stays a thread and still never scolds: a missed day is not a
 * broken chain, and nothing here counts down or turns red.
 */
import { useReaderStore } from '../../store/appStore'
import { useT } from '../../i18n'
import { BillaSpine } from '../ambient/ornaments'

export interface JourneyCardProps {
  totalKurals: number
  totalChapters: number
  className?: string
}

/**
 * The vessel, in a 64×64 box. The shape is a household pot seen from the side:
 * a narrow foot, a wide belly, a short neck. `fill` is 0–1 of the water.
 */
function Vessel({ fill }: { fill: number }) {
  const top = 12
  const bottom = 54
  const surface = bottom - (bottom - top) * Math.min(1, Math.max(0, fill))

  return (
    <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" className="shrink-0">
      <defs>
        <clipPath id="journey-vessel">
          <path d="M22 12h20c-.6 4-3.4 6-3.4 10 0 5.2 5.4 8 5.4 15 0 9.4-6.4 17-12 17s-12-7.6-12-17c0-7 5.4-9.8 5.4-15 0-4-2.8-6-3.4-10z" />
        </clipPath>
        <linearGradient id="journey-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--peacock)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--sky-b)" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* The pot itself: black-and-red ware reads as the outline in brass here,
          because at this size the silhouette is the whole object. */}
      <path
        d="M22 12h20c-.6 4-3.4 6-3.4 10 0 5.2 5.4 8 5.4 15 0 9.4-6.4 17-12 17s-12-7.6-12-17c0-7 5.4-9.8 5.4-15 0-4-2.8-6-3.4-10z"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.6"
      />
      <path d="M22 12h20" stroke="var(--gold-bright)" strokeWidth="2.2" strokeLinecap="round" />

      <g clipPath="url(#journey-vessel)">
        <rect x="14" y={surface} width="36" height={62 - surface} fill="url(#journey-water)" />
        {/* The surface line: one slow swell, so the level is water and not paint.
            Silenced by the kill-switches; the level itself never moves. */}
        <path
          className="anim-water"
          d={`M12 ${surface} q 6 -1.6 12 0 t 12 0 t 12 0 t 12 0`}
          fill="none"
          stroke="var(--cloud)"
          strokeOpacity="0.75"
          strokeWidth="1.4"
        />
      </g>
    </svg>
  )
}

export function JourneyCard({ totalKurals, totalChapters, className }: JourneyCardProps) {
  const read = useReaderStore((state) => state.read)
  const chapters = useReaderStore((state) => state.chapters)
  const streak = useReaderStore((state) => state.streak)
  const t = useT()

  const readCount = Object.keys(read).length
  const chapterCount = Object.keys(chapters).length
  const progress = totalKurals > 0 ? readCount / totalKurals : 0

  if (readCount === 0) {
    return (
      <p className={`glass-panel glass-panel--quiet m-0 p-5 text-sm text-muted ${className ?? ''}`}>
        {t('journey.empty', 'Your reading journey begins with a single kural — and the pot is empty until then.')}
      </p>
    )
  }

  return (
    <section
      aria-labelledby="journey-title"
      className={`glass-panel glass-panel--quiet flex flex-wrap items-center gap-5 p-5 ${className ?? ''}`}
    >
      <Vessel fill={progress} />

      <div className="min-w-[12rem] flex-1">
        <h2 id="journey-title" className="m-0 text-base text-ink">
          {t('journey.title', 'Your reading journey')}
        </h2>
        <p className="mt-1 mb-0 text-sm text-muted">
          {t('journey.progress', '{r} kurals read · {c} chapters visited · {s}-day streak')
            .replace('{r}', String(readCount))
            .replace('{c}', String(chapterCount))
            .replace('{s}', String(streak))}
        </p>
        <dl className="mt-3 mb-0 flex flex-wrap gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted">{t('stat.read', 'Read')}</dt>
            <dd className="m-0 text-ink">
              {readCount} / {totalKurals}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('stat.visited', 'Chapters visited')}</dt>
            <dd className="m-0 text-ink">
              {chapterCount} / {totalChapters}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Streak</dt>
            <dd className="m-0 text-ink">
              {streak} {streak === 1 ? 'day' : 'days'}
            </dd>
          </div>
        </dl>
      </div>

      {/* The braid axis: one lit plaque per tenth of the journey. */}
      <BillaSpine progress={progress} className="ml-auto hidden sm:flex" />
    </section>
  )
}
