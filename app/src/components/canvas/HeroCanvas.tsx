/**
 * HeroCanvas — lazy, resilient wrapper around the Three.js hero material.
 *
 * Design rules it enforces:
 *   - the library is fetched only after the hero is on screen and only when
 *     WebGL actually exists, so the first paint never waits on it
 *   - no WebGL → render nothing and let the caller's CSS radial-gradient stand
 *     in (the documented fallback, not a broken panel)
 *   - blend mode comes from the theme (`multiply` by day, `normal` at night)
 *   - a runtime WebGL context loss falls back instead of leaving a blank box
 */
import { Suspense, lazy, memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '../../lib/cn'
import { useReducedMotion } from '../../hooks/useReader'

const HeroScene = lazy(() => import('./HeroScene'))

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const context =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')
    return context !== null
  } catch {
    return false
  }
}

export interface HeroCanvasProps {
  className?: string
  /** Fired when the material cannot run, so the caller can keep its fallback. */
  onUnavailable?: () => void
}

export const HeroCanvas = memo(function HeroCanvas({ className, onUnavailable }: HeroCanvasProps) {
  const [supported, setSupported] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const ok = detectWebGL()
    setSupported(ok)
    if (!ok) onUnavailable?.()
  }, [onUnavailable])

  const giveUp = useCallback(() => {
    setSupported(false)
    onUnavailable?.()
  }, [onUnavailable])

  /**
   * The canvas element appears asynchronously (lazy chunk + WebGL init), so
   * watch for it rather than assuming it exists when this effect runs.
   */
  useEffect(() => {
    if (!supported) return
    const node = host.current
    if (!node) return

    let bound: HTMLCanvasElement | null = null
    const onLost = (event: Event): void => {
      // Without preventDefault the context can never be restored.
      event.preventDefault()
      giveUp()
    }
    const attach = (): void => {
      const canvas = node.querySelector('canvas')
      if (canvas && canvas !== bound) {
        bound?.removeEventListener('webglcontextlost', onLost)
        bound = canvas
        canvas.addEventListener('webglcontextlost', onLost)
      }
    }

    attach()
    const observer = new MutationObserver(attach)
    observer.observe(node, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      bound?.removeEventListener('webglcontextlost', onLost)
    }
  }, [supported, giveUp])

  if (!supported) return null

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={cn('absolute inset-0 z-0 overflow-hidden', className)}
      style={{ mixBlendMode: 'var(--hero-blend)' as CSSProperties['mixBlendMode'] }}
    >
      <Suspense fallback={null}>
        <HeroScene frozen={reducedMotion} />
      </Suspense>
    </div>
  )
})
