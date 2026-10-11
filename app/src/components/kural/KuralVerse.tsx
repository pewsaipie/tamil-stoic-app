/**
 * KuralVerse — the single place where a couplet's Tamil lines are rendered.
 *
 * The standard layout is a fixed two-line block: the முதல் அடி (up to four words)
 * on the top line and the ஈற்றடி (up to three words) on the bottom line.
 * Each line is rendered with `white-space: nowrap` and sized by the stylesheet
 * alone — `min(--verse-size, 98cqi / --verse-em)` — so a couplet never wraps
 * into a multi-line paragraph and no accessibility setting changes the
 * two-line split.
 *
 * The block is sized by CSS; `lib/verseType` supplies `--verse-em`, the width of
 * the longer line in ems. First paint uses its static estimate; the measured
 * width lands at the moment the Tamil face becomes usable — which, under
 * `font-display: block`, is before the verse is ever visible. Nothing measures
 * the DOM or rescales the text after paint: the verse holds still on every page.
 *
 * `data-verse-line` is part of the contract: tests assert both lines exist, in
 * order, on every surface.
 */
import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Kural } from '../../lib/types'
import { coupletLines } from '../../lib/couplet'
import { estimateVerseEm, measureVerseEm, verseFaceReady } from '../../lib/verseType'
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

  // First paint is sized by this estimate. React only writes `--verse-em` back
  // to the DOM when the estimate itself changes (a different couplet), so the
  // measured value applied below survives unrelated re-renders.
  const estimate = estimateVerseEm(top, bottom)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    let cancelled = false

    const refine = (): void => {
      const em = measureVerseEm(top, bottom)
      if (em !== null && !cancelled) box.style.setProperty('--verse-em', String(em))
    }

    // Warm cache: the face is already usable, so the measurement replaces the
    // estimate before first paint. Cold cache: it replaces it in the same
    // moment the face becomes paintable — the size is right at first sight.
    refine()
    void verseFaceReady(top + bottom).then(refine)

    return () => {
      cancelled = true
    }
  }, [top, bottom])

  return (
    <div
      ref={boxRef}
      className={cn('verse', size === 'focus' && 'verse--focus', className)}
      lang="ta"
      data-kural={kural.n}
      style={{ '--verse-em': estimate } as CSSProperties}
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
