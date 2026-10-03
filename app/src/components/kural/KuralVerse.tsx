/**
 * KuralVerse — the single place where a couplet's Tamil lines are rendered.
 *
 * The standard layout is a fixed two-line block: the முதல் அடி (four சீர்) on top
 * and the ஈற்றடி (three சீர்) below. Lines are never re-cut, re-flowed into one
 * line, or reordered by any consumer, and the split does not depend on any
 * accessibility setting — the reader's choices change type, spacing and colour,
 * never the couplet's structure.
 *
 * `data-verse-line` is part of the contract: tests assert both lines exist, in
 * order, on every surface.
 */
import type { Kural } from '../../lib/types'
import { coupletLines } from '../../lib/couplet'
import { cn } from '../../lib/cn'

export interface KuralVerseProps {
  kural: Pick<Kural, 'n' | 'ta'>
  /** Larger face for the focus reader and the focus card. */
  size?: 'card' | 'focus'
  className?: string
}

export function KuralVerse({ kural, size = 'card', className }: KuralVerseProps) {
  // The one and only place a couplet becomes lines — see lib/couplet.ts.
  const [top, bottom] = coupletLines(kural)

  return (
    <div
      className={cn('verse', size === 'focus' && 'verse--focus', className)}
      lang="ta"
      data-kural={kural.n}
    >
      <span className="verse__line" data-verse-line="1">
        {top}
      </span>
      <span className="verse__line" data-verse-line="2">
        {bottom}
      </span>
    </div>
  )
}
