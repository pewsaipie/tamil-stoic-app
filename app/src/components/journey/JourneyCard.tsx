/**
 * Reading journey — a quiet progress ring, read/visited counts and a gentle
 * streak ("7 days with Valluvar"), never a guilt mechanic. Everything here is
 * local to the device and grows from actually reading kurals.
 */
import { useReaderStore } from '../../store/appStore'
import { useT } from '../../i18n'
import { BillaSpine } from '../ambient/ornaments'

export interface JourneyCardProps {
  totalKurals: number
  totalChapters: number
  className?: string
}

export function JourneyCard({ totalKurals, totalChapters, className }: JourneyCardProps) {
  const read = useReaderStore((state) => state.read)
  const chapters = useReaderStore((state) => state.chapters)
  const streak = useReaderStore((state) => state.streak)
  const t = useT()

  const readCount = Object.keys(read).length
  const chapterCount = Object.keys(chapters).length
  const progress = totalKurals > 0 ? readCount / totalKurals : 0
  const circumference = 2 * Math.PI * 26

  if (readCount === 0) {
    return (
      <p className={`glass-panel glass-panel--quiet m-0 p-5 text-sm text-muted ${className ?? ''}`}>
        {t('journey.empty', 'Your reading journey begins with a single kural.')}
      </p>
    )
  }

  return (
    <section
      aria-labelledby="journey-title"
      className={`glass-panel glass-panel--quiet flex flex-wrap items-center gap-5 p-5 ${className ?? ''}`}
    >
      <svg viewBox="0 0 64 64" width="64" height="64" role="img" aria-label={`${readCount} of ${totalKurals} kurals read`}>
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border-color)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform="rotate(-90 32 32)"
        />
        <text
          x="32"
          y="36"
          textAnchor="middle"
          fontSize="14"
          fill="var(--ink-primary)"
          fontFamily="var(--font-ui)"
        >
          {Math.round(progress * 100)}%
        </text>
      </svg>

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
