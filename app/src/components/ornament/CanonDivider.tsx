import { useId } from 'react'
import { cn } from '../../lib/cn'

/**
 * Period-neutral route divider: a fibre cord and three hand-polished beads.
 * It replaces the later bridal/zari divider on the five new canons. The bead
 * material is a visual reference to early-historic carnelian finds, not a
 * replica of a particular excavated necklace.
 */
export function CanonDivider({ className }: { className?: string }) {
  const id = useId()
  return (
    <div aria-hidden="true" className={cn('ambient-decor flex items-center gap-3', className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--canon-line)]" />
      <svg viewBox="0 0 92 24" className="block h-6 w-[92px] shrink-0">
        <defs>
          <radialGradient id={id} cx="32%" cy="24%" r="78%">
            <stop offset="0" stopColor="var(--gold-bright)" />
            <stop offset="0.42" stopColor="var(--canon-line)" />
            <stop offset="1" stopColor="var(--canon-line)" stopOpacity="0.58" />
          </radialGradient>
        </defs>
        <path d="M2 12 H25 M67 12 H90" fill="none" stroke="var(--canon-line)" strokeOpacity="0.65" />
        <path d="M2 14 H25 M67 14 H90" fill="none" stroke="var(--canon-line)" strokeOpacity="0.22" />
        <ellipse cx="34" cy="12" rx="6.2" ry="7.1" fill={`url(#${id})`} stroke="var(--canon-line)" strokeWidth="0.8" />
        <ellipse cx="46" cy="12" rx="7" ry="8" fill={`url(#${id})`} stroke="var(--canon-line)" strokeWidth="0.8" />
        <ellipse cx="58" cy="12" rx="5.8" ry="6.8" fill={`url(#${id})`} stroke="var(--canon-line)" strokeWidth="0.8" />
        <path d="M31 12 h6 M43 12 h6 M55 12 h6" stroke="var(--bg-base)" strokeOpacity="0.55" strokeWidth="1.2" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--canon-line)]" />
    </div>
  )
}
