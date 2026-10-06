/**
 * TableStage — the DOM's seam to the room.
 *
 * The same contract `HeroCanvas` keeps for the sky, applied to the table:
 *
 *   - **Lazy.** Three.js is a ~135 KB chunk and it is fetched only once the
 *     table is near the viewport, and only when WebGL exists. The first paint of
 *     a page whose job is to show a couplet never waits on a renderer.
 *   - **Honest fallback.** No WebGL, a lost context, a crashed scene or a
 *     `css3d`/`plain` tier all land on the same thing: the flat pot that has been
 *     in this repository since the Sangam-clay theme, on a CSS table line. It is
 *     a deliberate, finished state — not an error state.
 *   - **One scene per route.** The sky is a shader *material*; the objects are
 *     this scene. Nothing else on Home mounts a canvas.
 *   - **Silence is a tier, not a failure.** Reduced motion freezes the scene: the
 *     pot keeps its form, the water keeps its level, the lamp keeps its light.
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
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/cn'
import { useMaterials } from '../../materials/useMaterials.ts'
import { useMotionVerdict } from '../../motion'
import potUrl from '../../assets/img/sangam-pot.svg'

const TableScene = lazy(() => import('../../materials/scenes/table/TableScene.tsx'))

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const context =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')
    if (!context) return false
    const gl = context as WebGLRenderingContext | WebGL2RenderingContext
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

interface BoundaryProps {
  children: ReactNode
  onError: () => void
}

class SceneBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }
  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.props.onError()
  }
  override render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}

/** The flat table: the shipped SVG pot, a lamp glow, and the leaf. */
function FlatTable({ forming }: { forming: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'var(--border-strong)' }}
      />
      <img
        src={potUrl}
        alt=""
        aria-hidden="true"
        className={cn(
          'absolute bottom-[6%] left-[8%] h-[62%] w-auto',
          // Only while it is being made. Once the pot exists it stands still —
          // this is the flat fallback, so the end state *is* the whole point.
          forming && 'anim-breathe',
        )}
        draggable={false}
      />
      <span
        aria-hidden="true"
        className="absolute bottom-[18%] left-[54%] h-24 w-24 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)' }}
      />
    </div>
  )
}

export interface TableStageProps {
  /** The corpus is loading, or the pot is empty and new: the wheel is turning. */
  forming?: boolean
  /** 0–1 of the corpus read. The water level. */
  progress?: number
  /** Increments when a kural is marked read. */
  ripple?: number
  className?: string
}

export const TableStage = memo(function TableStage({
  forming = false,
  progress = 0,
  ripple = 0,
  className,
}: TableStageProps) {
  const { tier } = useMaterials()
  const verdict = useMotionVerdict()
  const host = useRef<HTMLDivElement>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const [failed, setFailed] = useState(false)

  // Only the tiers that can render a live scene mount one. `css3d` and `plain`
  // are supported states, so they go straight to the flat table.
  const canRender = tier === 'full' || tier === 'still' || tier === 'contrast'
  const live = canRender && !failed
  const quality = tier === 'contrast' ? 'contrast' : tier === 'still' ? 'still' : 'full'

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
      { rootMargin: '160px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const mounted = live && nearViewport && detectWebGL()

  const giveUp = useCallback(() => setFailed(true), [])

  // A context loss takes the whole scene with it: fall back rather than leaving
  // a black rectangle where the table was.
  useEffect(() => {
    if (!live) return
    const node = host.current
    if (!node) return
    let bound: HTMLCanvasElement | null = null
    const onLost = (event: Event): void => {
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
  }, [live, giveUp])

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={cn('relative isolate overflow-hidden', className)}
      style={{
        minHeight: 'clamp(210px, 34vw, 330px)',
        backgroundImage:
          'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--bg-surface) 70%, transparent) 46%, var(--bg-surface) 100%)',
      }}
    >
      {mounted ? (
        <SceneBoundary onError={giveUp}>
          <Suspense fallback={<FlatTable forming={forming} />}>
            {/*
              `frozen` is the runtime's verdict, not one setting: reduced motion
              freezes the scene, and so does an open dialog, a hidden tab or
              save-data. The scene is then left in its end state — the pot
              settled, the water still, the lamp burning at a steady flame —
              which is exactly what `frameloop="demand"` renders.
            */}
            <TableScene
              forming={forming}
              progress={progress}
              ripple={ripple}
              frozen={!verdict.moving}
              quality={quality}
              onReady={() => undefined}
            />
          </Suspense>
        </SceneBoundary>
      ) : (
        <FlatTable forming={forming} />
      )}
    </div>
  )
})
