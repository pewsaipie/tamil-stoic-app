/**
 * Depth without a canvas.
 *
 * `css3d` is the tier a device lands on when it *cannot* run WebGL — which is
 * not a preference and is not negotiable, so the fallback has to be something
 * that always exists. CSS 3D is that something: `transform-style: preserve-3d`
 * with a real perspective gives layered objects genuine parallax, on every
 * browser that has had it since 2015, with no context to lose, no shader to
 * compile and no driver to blacklist.
 *
 * What it is not: a render. There is no light here, nothing casts a shadow and
 * nothing has a specular response, because those are properties of a rasteriser
 * and there is no rasteriser. So this layer is honest about its role — it puts
 * the reader's own flat content at an angle in a room, which is the one part of
 * the doctrine that survives without a GPU, and the DOM underneath stays exactly
 * the source of truth it already is.
 *
 * Plates are optional and absent by default. `scripts/build-materials.mjs` bakes
 * *material* maps, not views; once a surface has its own baked plate the scene
 * can hand it here and the layer will texture it. Until then the geometry is the
 * thing being faked, and it is faked with the content the reader already has.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface Css3dStageProps {
  /**
   * Layers, back to front. `depth` is millimetres toward the reader, and the
   * only number that matters: the separation between two layers is what the
   * parallax reads as, so adjacent layers have to differ by enough to see.
   */
  layers?: readonly Css3dLayer[]
  /** Reduced motion: the room stops moving, but it is still a room. */
  reducedMotion?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface Css3dLayer {
  depth: number
  /** A baked plate, when one exists for this surface. */
  plate?: string
  /** Optional flat wash for a layer with no plate yet. */
  tint?: string
  radius?: string
}

/**
 * How far the room tilts, in degrees.
 *
 * Small on purpose. The point is that objects separate as you move, not that
 * the reader can orbit a scene — past about 4° the flat content inside starts to
 * look like a texture on a box rather than a thing in a room.
 */
const MAX_TILT_DEGREES = 3.2
/** Millimetres of perspective depth per unit of `depth`. */
const PERSPECTIVE_PX = 900
/** Pointer moves are eased toward the target rather than snapped to it. */
const EASE = 0.12

const DEFAULT_LAYERS: readonly Css3dLayer[] = [
  { depth: 0, tint: 'var(--stage-room)' },
  { depth: 26, tint: 'var(--stage-table, transparent)' },
  { depth: 52 },
]

export function Css3dStage({
  layers = DEFAULT_LAYERS,
  reducedMotion = false,
  className,
  style,
}: Css3dStageProps) {
  const root = useRef<HTMLDivElement | null>(null)
  const target = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const frame = useRef<number | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const animate = useCallback(() => {
    frame.current = null
    const next = {
      x: current.current.x + (target.current.x - current.current.x) * EASE,
      y: current.current.y + (target.current.y - current.current.y) * EASE,
    }
    // Keep easing while there is still a millimetre to travel, and stop when
    // there is not: an easing loop that never settles is a battery drain with
    // no visible result, which is the exact mistake the seal's timeline exists
    // to avoid repeating.
    const settled = Math.abs(next.x - target.current.x) < 0.001 && Math.abs(next.y - target.current.y) < 0.001
    current.current = settled ? target.current : next
    setTilt(current.current)
    if (!settled) frame.current = requestAnimationFrame(animate)
  }, [])

  const push = useCallback(
    (x: number, y: number) => {
      if (reducedMotion) return
      target.current = { x, y }
      if (frame.current === null) frame.current = requestAnimationFrame(animate)
    },
    [animate, reducedMotion],
  )

  useEffect(() => {
    const node = root.current
    if (!node) return
    const onPointer = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      push(
        ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        ((event.clientY - rect.top) / rect.height - 0.5) * 2,
      )
    }
    const onLeave = () => push(0, 0)
    node.addEventListener('pointermove', onPointer)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointermove', onPointer)
      node.removeEventListener('pointerleave', onLeave)
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [push])

  /**
   * Device tilt, where the platform allows it.
   *
   * On desktop `deviceorientation` simply never fires, so this costs nothing.
   * It is requested passively and never prompts: iOS requires a user gesture for
   * permission, and asking for motion access inside a reader's quiet minute is
   * not a trade worth making for a parallax effect.
   */
  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return
    const handler = (event: Event) => {
      const orientation = event as DeviceOrientationEvent & { beta?: number; gamma?: number }
      if (typeof orientation.gamma !== 'number' || typeof orientation.beta !== 'number') return
      const clamp = (n: number) => Math.max(-1, Math.min(1, n / 24))
      push(clamp(orientation.gamma), clamp(orientation.beta - 45))
    }
    window.addEventListener('deviceorientation', handler, { passive: true })
    return () => window.removeEventListener('deviceorientation', handler)
  }, [push, reducedMotion])

  const rotateX = (-tilt.y * MAX_TILT_DEGREES).toFixed(3)
  const rotateY = (tilt.x * MAX_TILT_DEGREES).toFixed(3)

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        perspective: `${PERSPECTIVE_PX}px`,
        transformStyle: 'preserve-3d',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: reducedMotion ? 'none' : undefined,
        }}
      >
        {layers.map((layer, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translateZ(${layer.depth}px)`,
              borderRadius: layer.radius ?? 'inherit',
              backgroundImage: layer.plate
                ? `url(${layer.plate}), ${layer.tint ? `linear-gradient(${layer.tint}, ${layer.tint})` : 'none'}`
                : layer.tint
                  ? `linear-gradient(${layer.tint}, ${layer.tint})`
                  : undefined,
              backgroundSize: 'cover, cover',
              backgroundPosition: 'center, center',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default Css3dStage
