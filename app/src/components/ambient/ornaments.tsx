/**
 * Kurinji ornament kit — original SVG drawn for this app.
 *
 * The grammar comes from the *Tamil Kalyanam Hits* cover read through Sangam
 * research (docs/kurinji-ui-plan.md): the jada-billai plaque cascade, the
 * surya/chandra medallion, and the zari edge of a kanjeevaram border.
 * Every piece is decorative and aria-hidden; high contrast removes them.
 */
import { useId } from 'react'
import { cn } from '../../lib/cn'

/** One jada-billai plaque — the shield shape repeated along the braid. */
function Plaque({ className, lit = true }: { className?: string; lit?: boolean }) {
  return (
    <svg viewBox="0 0 16 22" aria-hidden="true" className={className}>
      <path
        d="M8 0.6 L15 5.2 V13.5 Q15 18.6 8 21.4 Q1 18.6 1 13.5 V5.2 Z"
        fill={lit ? 'var(--gold)' : 'none'}
        stroke={lit ? 'var(--gold-bright)' : 'var(--border-strong)'}
        strokeWidth="1.2"
      />
      {lit ? <circle cx="8" cy="10" r="2.1" fill="var(--gold-bright)" /> : null}
    </svg>
  )
}

/**
 * Zari edge — the woven gold-on-red border strip of a kanjeevaram,
 * as a thin repeating band for card tops and section edges.
 */
export function ZariEdge({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg aria-hidden="true" className={cn('ambient-decor block h-[7px] w-full', className)}>
      <defs>
        <pattern id={id} width="14" height="7" patternUnits="userSpaceOnUse">
          <rect width="14" height="7" fill="var(--kantal-fill)" />
          <path d="M7 0.9 L12.2 3.5 L7 6.1 L1.8 3.5 Z" fill="var(--gold)" />
          <circle cx="0" cy="3.5" r="1" fill="var(--gold-bright)" />
          <circle cx="14" cy="3.5" r="1" fill="var(--gold-bright)" />
        </pattern>
      </defs>
      <rect width="100%" height="7" fill={`url(#${id})`} />
    </svg>
  )
}

/** Horizontal divider: gold hairlines meeting a three-plaque billa cluster. */
export function BillaDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('ambient-decor flex items-center gap-2', className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--gold)]" />
      <Plaque className="h-4 w-3" />
      <Plaque className="anim-glint h-5 w-4" />
      <Plaque className="h-4 w-3" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--gold)]" />
    </div>
  )
}

/**
 * Vertical billa spine — the cover's braid axis, as a progress ornament.
 * Lit plaques follow reading progress; the surya/chandra disc crowns it.
 */
export function BillaSpine({ progress, className }: { progress: number; className?: string }) {
  const total = 9
  const lit = Math.min(total, Math.round(progress * total))
  return (
    <div aria-hidden="true" className={cn('ambient-decor flex flex-col items-center gap-1', className)}>
      <SuryaChandra className="anim-glint h-6 w-6" />
      {Array.from({ length: total }, (_, i) => (
        <Plaque key={i} lit={i < lit} className="h-5 w-3.5" />
      ))}
    </div>
  )
}

/**
 * Surya/chandra medallion — the sun-and-moon disc that crowns a bridal braid.
 * Decorative ring; callers overlay their own content (e.g. the kural number).
 */
export function SuryaChandra({ className }: { className?: string }) {
  const rays = Array.from({ length: 12 }, (_, i) => (i / 12) * 360)
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" className={cn('ambient-decor', className)}>
      <g>
        {rays.map((deg) => (
          <path
            key={deg}
            d="M48 3 L51.2 11 L44.8 11 Z"
            fill="var(--gold)"
            transform={`rotate(${deg} 48 48)`}
          />
        ))}
      </g>
      <circle cx="48" cy="48" r="34" fill="var(--bg-elevated)" stroke="var(--gold)" strokeWidth="3" />
      {/* Chandra crescent on the moon side of the ring. */}
      <path d="M48 14 a34 34 0 0 0 0 68 a27 27 0 0 1 0 -68" fill="var(--gold)" opacity="0.85" />
      <circle cx="48" cy="48" r="27" fill="var(--bg-elevated)" />
    </svg>
  )
}
