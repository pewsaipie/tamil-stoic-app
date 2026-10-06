/**
 * Atmosphere — the cover's "gif effect", rebuilt natively.
 *
 * Apple Music animates the *Tamil Kalyanam Hits* cover: petals drift through
 * the sky. This fixed canvas carries that living quality across every view —
 * crimson kantal petals falling by day, gold fireflies rising at midnight —
 * without shipping a single GIF: crisp at any DPI, offline, tiny.
 *
 * It is pure decoration, and decoration is the one thing that is *removed*
 * rather than stilled: reduced motion, high contrast, forced colours, save-data
 * and the flat reader all take it off the page entirely. A frozen petal is not a
 * quieter petal, it is a smudge on the glass. Everything else on the page is
 * drawn in its end state instead (motion plan L5); this is the exception and it
 * is named here so the difference is a decision rather than an oversight.
 *
 * The frames come from `useMotionLoop`, which is what makes the three promises
 * this file used to make by hand — paused in a hidden tab, stopped when the
 * reader asks for less motion, counted against the route's loop ceiling — and
 * two more it did not: 30 fps rather than 60, and standing down by name if the
 * route is already running its three loops.
 */
import { useEffect, useRef, useState } from 'react'
import { useReaderStore } from '../../store/appStore.ts'
import { PARTICLE_BUDGET } from '../../motion/budget.ts'
import { useMedia, useMotionLoop, useMotionVerdict } from '../../motion/useMotion.ts'

interface Petal {
  x: number
  y: number
  vy: number
  sway: number
  phase: number
  rot: number
  vr: number
  size: number
  alpha: number
}

interface Spark {
  x: number
  y: number
  vy: number
  phase: number
  size: number
}

/** Everything the painter needs, built once per theme rather than per frame. */
interface Scene {
  ctx: CanvasRenderingContext2D
  petals: Petal[]
  sparks: Spark[]
  width: number
  height: number
  petalColor: string
  goldColor: string
}

function isNightActive(theme: string, prefersDark: boolean): boolean {
  return theme === 'night' || (theme === 'system' && prefersDark)
}

function buildScene(canvas: HTMLCanvasElement): Scene | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const styles = getComputedStyle(document.documentElement)
  const petalColor = styles.getPropertyValue('--petal').trim() || '#c0392b'
  const goldColor = styles.getPropertyValue('--gold-bright').trim() || '#e6b93f'

  const scene: Scene = {
    ctx,
    petals: [],
    sparks: [],
    width: 0,
    height: 0,
    petalColor,
    goldColor,
  }

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const resize = (): void => {
    scene.width = window.innerWidth
    scene.height = window.innerHeight
    canvas.width = Math.round(scene.width * dpr)
    canvas.height = Math.round(scene.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()

  scene.petals = Array.from(
    { length: Math.min(PARTICLE_BUDGET.atmosphere, Math.max(8, Math.floor(scene.width / 90))) },
    () => ({
      x: Math.random() * scene.width,
      y: Math.random() * scene.height,
      vy: 0.35 + Math.random() * 0.5,
      sway: 18 + Math.random() * 26,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      size: 4 + Math.random() * 5,
      alpha: 0.35 + Math.random() * 0.35,
    }),
  )
  scene.sparks = Array.from(
    { length: Math.min(PARTICLE_BUDGET.atmosphere, Math.max(8, Math.floor(scene.width / 80))) },
    () => ({
      x: Math.random() * scene.width,
      y: Math.random() * scene.height,
      vy: 0.12 + Math.random() * 0.22,
      phase: Math.random() * Math.PI * 2,
      size: 1 + Math.random() * 1.6,
    }),
  )

  window.addEventListener('resize', resize)
  return scene
}

/** One frame. The petal falls, the firefly rises; neither knows the time. */
function paint(scene: Scene, time: number, night: boolean): void {
  const { ctx, width, height } = scene
  ctx.clearRect(0, 0, width, height)

  if (!night) {
    // Day: crimson kantal petals drifting down on a swaying path.
    for (const p of scene.petals) {
      p.y += p.vy
      p.rot += p.vr
      if (p.y > height + 12) {
        p.y = -12
        p.x = Math.random() * width
      }
      const x = p.x + Math.sin(time * 0.9 + p.phase) * p.sway * 0.2
      ctx.save()
      ctx.translate(x, p.y)
      ctx.rotate(p.rot + Math.sin(time + p.phase) * 0.4)
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = scene.petalColor
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    return
  }

  // Midnight: gold fireflies rising, twinkling like dew on the hills.
  for (const s of scene.sparks) {
    s.y -= s.vy
    if (s.y < -6) {
      s.y = height + 6
      s.x = Math.random() * width
    }
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 2.2 + s.phase))
    const x = s.x + Math.sin(time * 0.6 + s.phase) * 10
    ctx.save()
    ctx.globalAlpha = 0.55 * tw
    ctx.fillStyle = scene.goldColor
    ctx.shadowColor = scene.goldColor
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(x, s.y, s.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function Atmosphere() {
  const theme = useReaderStore((state) => state.theme)
  const prefersDark = useMedia('(prefers-color-scheme: dark)')
  const verdict = useMotionVerdict()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<Scene | null>(null)
  /**
   * Whether there is actually something to paint.
   *
   * A canvas with no 2D context — jsdom, an old browser, a context that failed
   * to allocate — used to leave a `requestAnimationFrame` chain running forever
   * against a null context, calling a function that returned immediately. That
   * is not a harmless no-op: it is a frame chain that keeps the page (and, in
   * CI, the whole Node process) awake for nothing. A loop with nothing to draw
   * is not a loop.
   */
  const [hasScene, setHasScene] = useState(false)

  /**
   * Two questions, two answers, and keeping them apart is the point: `killed`
   * takes the layer off the page (a preference nobody can animate around),
   * while `verdict.moving` only stops the *frames* — a dialog opening must not
   * destroy the petals and rebuild them in new positions when it closes.
   */
  const killed = !verdict.moving && verdict.still
  const night = isNightActive(theme, prefersDark)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    sceneRef.current = buildScene(canvas)
    setHasScene(sceneRef.current !== null)
    return () => {
      sceneRef.current = null
      setHasScene(false)
    }
  }, [night, killed])

  useMotionLoop(
    'atmosphere',
    (time) => {
      const scene = sceneRef.current
      if (scene) paint(scene, time, night)
    },
    { enabled: verdict.moving && hasScene, fps: 30 },
  )

  if (killed) return null
  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />
}
