/**
 * KuralVerse — the single place where a couplet's Tamil lines are rendered.
 *
 * The standard layout is a fixed two-line block: the முதல் அடி (up to four words)
 * on the top line and the ஈற்றடி (up to three words) on the bottom line.
 * Each line is rendered with `white-space: nowrap` and automatically scaled to fit
 * its container width so a couplet never wraps into a multi-line paragraph, and
 * no accessibility setting changes the two-line split.
 *
 * `data-verse-line` is part of the contract: tests assert both lines exist, in
 * order, on every surface.
 */
import { useLayoutEffect, useRef, type CSSProperties } from 'react'
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const line1Ref = useRef<HTMLSpanElement | null>(null)
  const line2Ref = useRef<HTMLSpanElement | null>(null)

  const maxChars = Math.max(top.length, bottom.length)
  const verseEm = Math.max(18, Math.ceil(maxChars * 0.6))

  useLayoutEffect(() => {
    const box = containerRef.current
    const first = line1Ref.current
    const second = line2Ref.current
    if (!box || !first || !second) return

    const fit = (): void => {
      box.style.fontSize = ''
      const available = box.clientWidth
      if (available <= 0) return
      const needed = Math.max(first.scrollWidth, second.scrollWidth)
      if (needed > available) {
        const computed = Number.parseFloat(window.getComputedStyle(box).fontSize)
        if (Number.isFinite(computed) && computed > 0) {
          const scaled = Math.max(10, Math.floor((available / needed) * computed * 10) / 10)
          box.style.fontSize = `${scaled}px`
        }
      }
    }

    fit()

    let cancelled = false
    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) fit()
      })
    }

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit()) : null
    resizeObserver?.observe(box)

    const mutationObserver =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => fit())
        : null
    if (typeof document !== 'undefined' && document.documentElement) {
      mutationObserver?.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-font-size', 'data-line-spacing'],
      })
    }

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
    }
  }, [top, bottom, size])

  return (
    <div
      ref={containerRef}
      className={cn('verse', size === 'focus' && 'verse--focus', className)}
      lang="ta"
      data-kural={kural.n}
      style={{ '--verse-em': verseEm } as CSSProperties}
    >
      <span ref={line1Ref} className="verse__line" data-verse-line="1">
        {top}
      </span>
      <span ref={line2Ref} className="verse__line" data-verse-line="2">
        {bottom}
      </span>
    </div>
  )
}
