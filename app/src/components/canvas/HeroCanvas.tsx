/**
 * HeroCanvas — lazy, resilient wrapper around the Three.js hero material.
 *
 * Design rules it enforces:
 *   - the library is fetched only after the hero is near the viewport and
 *     only when WebGL actually exists, so the first paint never waits on it
 *   - no WebGL → render nothing and let the caller's CSS radial-gradient stand
 *     in (the documented fallback, not a broken panel)
 *   - blend mode comes from the theme (`multiply` by day, `normal` at night)
 *   - a runtime WebGL context loss falls back instead of leaving a blank box
 */
import {
  Component,
  Suspense,
  lazy,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
} from 'react'
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
    if (!context) return false

    // The capability probe uses a temporary canvas; release its GPU context so
    // the real renderer does not have to compete for the device's context cap.
    const gl = context as WebGLRenderingContext | WebGL2RenderingContext
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

interface CanvasErrorBoundaryProps {
  children: ReactNode
  onError: () => void
}

interface CanvasErrorBoundaryState {
  hasError: boolean
}

/** Keep a renderer or lazy-chunk failure from taking down the reader. */
class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  override state: CanvasErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.props.onError()
  }

  override render(): ReactNode {
    return this.state.hasError ? null : this.props.children
  }
}

export interface HeroCanvasProps {
  className?: string
  /** Fired when the material cannot run, so the caller can keep its fallback. */
  onUnavailable?: () => void
}

export const HeroCanvas = memo(function HeroCanvas({ className, onUnavailable }: HeroCanvasProps) {
  const [nearViewport, setNearViewport] = useState(false)
  const [supported, setSupported] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const onUnavailableRef = useRef(onUnavailable)
  const reducedMotion = useReducedMotion()

  // Keep the callback fresh without restarting capability detection when a
  // caller passes an inline function.
  onUnavailableRef.current = onUnavailable

  const giveUp = useCallback(() => {
    setSupported(false)
    onUnavailableRef.current?.()
  }, [])

  // Don't even probe WebGL or fetch the shader chunk until the hero approaches
  // the viewport. Older browsers without IntersectionObserver get the safe
  // eager path; the gradient still remains available if WebGL is missing.
  useEffect(() => {
    const node = host.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '120px' },
    )
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!nearViewport) return

    const ok = detectWebGL()
    if (ok) {
      setSupported(true)
    } else {
      giveUp()
    }
  }, [nearViewport, giveUp])

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

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={cn('absolute inset-0 z-0 overflow-hidden', className)}
      style={{ mixBlendMode: 'var(--hero-blend)' as CSSProperties['mixBlendMode'] }}
    >
      {supported ? (
        <CanvasErrorBoundary onError={giveUp}>
          <Suspense fallback={null}>
            <HeroScene frozen={reducedMotion} />
          </Suspense>
        </CanvasErrorBoundary>
      ) : null}
    </div>
  )
})
