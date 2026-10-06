/**
 * Atmosphere — the cover's "gif effect", rebuilt natively.
 *
 * Apple Music animates the *Tamil Kalyanam Hits* cover: petals drift through
 * the sky. This fixed canvas carries that living quality across every view —
 * crimson kantal petals falling by day, gold fireflies rising at midnight —
 * without shipping a single GIF: crisp at any DPI, offline, tiny.
 *
 * It is pure decoration. The OS reduced-motion preference, the in-app toggle,
 * high contrast and forced colours all switch it off, and it never intercepts
 * pointer events.
 */
import { useEffect, useRef, useState } from 'react'
import { useReaderStore } from '../../store/appStore'

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

function isNightActive(theme: string, prefersDark: boolean): boolean {
  return theme === 'night' || (theme === 'system' && prefersDark)
}

export function Atmosphere() {
  const theme = useReaderStore((state) => state.theme)
  const reduceMotion = useReaderStore((state) => state.reduceMotion)
  const highContrast = useReaderStore((state) => state.highContrast)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const [prefersReduced, setPrefersReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [forcedColors, setForcedColors] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(forced-colors: active)').matches,
  )

  useEffect(() => {
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const forced = window.matchMedia('(forced-colors: active)')
    const onDark = () => setPrefersDark(dark.matches)
    const onReduced = () => setPrefersReduced(reduced.matches)
    const onForced = () => setForcedColors(forced.matches)
    dark.addEventListener('change', onDark)
    reduced.addEventListener('change', onReduced)
    forced.addEventListener('change', onForced)
    return () => {
      dark.removeEventListener('change', onDark)
      reduced.removeEventListener('change', onReduced)
      forced.removeEventListener('change', onForced)
    }
  }, [])

  const active = !reduceMotion && !prefersReduced && !highContrast && !forcedColors
  const night = isNightActive(theme, prefersDark)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const styles = getComputedStyle(document.documentElement)
    const petalColor = styles.getPropertyValue('--petal').trim() || '#c0392b'
    const goldColor = styles.getPropertyValue('--gold-bright').trim() || '#e6b93f'

    let width = 0
    let height = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const petals: Petal[] = Array.from({ length: Math.min(14, Math.max(8, Math.floor(width / 90))) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: 0.35 + Math.random() * 0.5,
      sway: 18 + Math.random() * 26,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      size: 4 + Math.random() * 5,
      alpha: 0.35 + Math.random() * 0.35,
    }))
    const sparks: Spark[] = Array.from({ length: Math.min(16, Math.max(8, Math.floor(width / 80))) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: 0.12 + Math.random() * 0.22,
      phase: Math.random() * Math.PI * 2,
      size: 1 + Math.random() * 1.6,
    }))

    let raf = 0
    let t = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (document.hidden) return
      t += 1 / 60
      ctx.clearRect(0, 0, width, height)

      if (!night) {
        // Day: crimson kantal petals drifting down on a swaying path.
        for (const p of petals) {
          p.y += p.vy
          p.rot += p.vr
          if (p.y > height + 12) {
            p.y = -12
            p.x = Math.random() * width
          }
          const x = p.x + Math.sin(t * 0.9 + p.phase) * p.sway * 0.2
          ctx.save()
          ctx.translate(x, p.y)
          ctx.rotate(p.rot + Math.sin(t + p.phase) * 0.4)
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = petalColor
          ctx.beginPath()
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      } else {
        // Midnight: gold fireflies rising, twinkling like dew on the hills.
        for (const s of sparks) {
          s.y -= s.vy
          if (s.y < -6) {
            s.y = height + 6
            s.x = Math.random() * width
          }
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.2 + s.phase))
          const x = s.x + Math.sin(t * 0.6 + s.phase) * 10
          ctx.save()
          ctx.globalAlpha = 0.55 * tw
          ctx.fillStyle = goldColor
          ctx.shadowColor = goldColor
          ctx.shadowBlur = 6
          ctx.beginPath()
          ctx.arc(x, s.y, s.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [active, night])

  if (!active) return null
  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />
}
