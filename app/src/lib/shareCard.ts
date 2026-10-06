/**
 * Bilingual share card — Kurinji edition.
 *
 * The card is the cover's grammar in miniature (docs/kurinji-ui-plan.md):
 * an open sky (day) or starlit midnight (night) ground, a kantal-red band
 * edged with a woven zari diamond row, a double gold manuscript frame, a
 * jada-billai plaque cascade down the left spine, the surya/chandra medallion
 * carrying the kural number, a Tamil-numeral watermark, hill silhouettes and
 * a few drifting petals — with the couplet on its two standard lines, the
 * simple meaning and the chapter it belongs to.
 *
 * Everything is drawn in code — no image assets, no network. The mode follows
 * the reader's active theme at share time.
 */
import { coupletLines } from './couplet'
import type { Chapter, Kural } from './types'

const WIDTH = 1080
const HEIGHT = 1920

interface Palette {
  skyTop: string
  skyBottom: string
  ink: string
  muted: string
  gold: string
  goldBright: string
  red: string
  redFill: string
  cream: string
  hill: string
  night: boolean
}

const DAY: Palette = {
  skyTop: '#a8d8ef',
  skyBottom: '#eef6fb',
  ink: '#10202e',
  muted: '#3d5666',
  gold: '#c9971c',
  goldBright: '#e6b93f',
  red: '#9c2024',
  redFill: '#b3242a',
  cream: '#ffffff',
  hill: '#27506b',
  night: false,
}

const NIGHT: Palette = {
  skyTop: '#16263f',
  skyBottom: '#0c1322',
  ink: '#eaf2fb',
  muted: '#a7b8cc',
  gold: '#e0b34c',
  goldBright: '#f0cf7a',
  red: '#d05a4e',
  redFill: '#b3242a',
  cream: '#eaf2fb',
  hill: '#050a14',
  night: true,
}

/** Which mode is live right now — explicit theme wins, else the OS. */
function activePalette(): Palette {
  if (typeof document === 'undefined') return DAY
  const mode = document.documentElement.dataset.theme
  if (mode === 'night') return NIGHT
  if (mode === 'day') return DAY
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? NIGHT : DAY
}

const TAMIL_DIGITS = '௦௧௨௩௪௫௬௭௮௯'

export function taNumeral(n: number): string {
  return String(n)
    .split('')
    .map((digit) => TAMIL_DIGITS[Number(digit)] ?? digit)
    .join('')
}

export function paddedKural(n: number): string {
  return String(n).padStart(3, '0')
}

/** Tiny seeded LCG so the sky's stars/petals are stable per kural. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** One jada-billai plaque — the shield shape from the cover's braid axis. */
function drawPlaque(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: Palette): void {
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y)
  ctx.lineTo(x + w, y + h * 0.24)
  ctx.lineTo(x + w, y + h * 0.66)
  ctx.quadraticCurveTo(x + w, y + h * 0.9, x + w / 2, y + h)
  ctx.quadraticCurveTo(x, y + h * 0.9, x, y + h * 0.66)
  ctx.lineTo(x, y + h * 0.24)
  ctx.closePath()
  ctx.fillStyle = p.gold
  ctx.fill()
  ctx.strokeStyle = p.goldBright
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x + w / 2, y + h * 0.45, w * 0.16, 0, Math.PI * 2)
  ctx.fillStyle = p.goldBright
  ctx.fill()
}

/** Zari row — woven gold diamonds on a kantal-red band. */
function drawZari(ctx: CanvasRenderingContext2D, y: number, h: number, p: Palette): void {
  ctx.fillStyle = p.redFill
  ctx.fillRect(0, y, WIDTH, h)
  ctx.fillStyle = p.gold
  for (let x = 10; x < WIDTH; x += 28) {
    ctx.beginPath()
    ctx.moveTo(x + 9, y + 2)
    ctx.lineTo(x + 18, y + h / 2)
    ctx.lineTo(x + 9, y + h - 2)
    ctx.lineTo(x, y + h / 2)
    ctx.closePath()
    ctx.fill()
  }
}

/** Surya/chandra medallion — sun rays, gold ring, moon crescent, number. */
function drawMedallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, p: Palette, n: number): void {
  ctx.save()
  ctx.fillStyle = p.gold
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.moveTo(0, -r - 16)
    ctx.lineTo(7, -r + 2)
    ctx.lineTo(-7, -r + 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = p.skyBottom
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = p.gold
  ctx.stroke()
  // Chandra crescent on the left half of the ring.
  ctx.beginPath()
  ctx.arc(cx, cy, r - 4, Math.PI / 2, (3 * Math.PI) / 2)
  ctx.arc(cx, cy, r - 16, (3 * Math.PI) / 2, Math.PI / 2, true)
  ctx.closePath()
  ctx.fillStyle = p.gold
  ctx.fill()
  ctx.fillStyle = p.goldBright
  ctx.font = `700 ${Math.round(r * 0.72)}px 'Noto Serif Tamil', serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(n), cx, cy + 4)
  ctx.restore()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

/** Wrap text to a width, measuring with the *current* font. Never merges lines. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text).split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number,
): number {
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
  return y + lines.length * lineHeight
}

export interface ShareCardOptions {
  kural: Kural
  chapter?: Chapter | undefined
  /** Localised footer line; defaults to the app's own strapline. */
  footer?: string
}

/** Draw the card. Returns a PNG blob ready to share or download. */
export async function createShareCard({ kural, chapter, footer }: ShareCardOptions): Promise<Blob> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready
    } catch {
      /* fonts are a nicety here, not a requirement */
    }
  }

  const p = activePalette()
  const rand = rng(kural.n * 7919 + 13)

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot create a share image')

  // Sky ground — the cover's open cerulean, or midnight indigo.
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  sky.addColorStop(0, p.skyTop)
  sky.addColorStop(1, p.skyBottom)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  if (p.night) {
    // Star field, stable per kural.
    for (let i = 0; i < 90; i++) {
      const x = rand() * WIDTH
      const y = rand() * HEIGHT * 0.7
      const r = 0.8 + rand() * 1.6
      ctx.globalAlpha = 0.25 + rand() * 0.6
      ctx.fillStyle = p.goldBright
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else {
    // Two soft clouds.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    for (const [cx, cy, rx] of [
      [240, 420, 190],
      [840, 300, 150],
    ] as const) {
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, rx * 0.36, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Hill silhouettes at the foot of the sky.
  ctx.fillStyle = p.hill
  ctx.beginPath()
  ctx.moveTo(0, HEIGHT - 260)
  ctx.quadraticCurveTo(WIDTH * 0.28, HEIGHT - 470, WIDTH * 0.55, HEIGHT - 250)
  ctx.quadraticCurveTo(WIDTH * 0.8, HEIGHT - 90, WIDTH, HEIGHT - 300)
  ctx.lineTo(WIDTH, HEIGHT)
  ctx.lineTo(0, HEIGHT)
  ctx.closePath()
  ctx.fill()

  // Drifting petals (day) or rising gold sparks (night).
  for (let i = 0; i < 14; i++) {
    const x = rand() * WIDTH
    const y = 180 + rand() * (HEIGHT - 500)
    if (p.night) {
      ctx.globalAlpha = 0.3 + rand() * 0.5
      ctx.fillStyle = p.goldBright
      ctx.beginPath()
      ctx.arc(x, y, 1.5 + rand() * 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rand() * Math.PI)
      ctx.globalAlpha = 0.4 + rand() * 0.4
      ctx.fillStyle = '#c0392b'
      ctx.beginPath()
      ctx.ellipse(0, 0, 10 + rand() * 8, 5 + rand() * 3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.globalAlpha = 1

  // Kantal-red header band with its zari row.
  ctx.fillStyle = p.redFill
  ctx.fillRect(0, 0, WIDTH, 120)
  drawZari(ctx, 120, 22, p)

  // Double gold manuscript frame.
  ctx.strokeStyle = p.gold
  ctx.lineWidth = 3
  ctx.strokeRect(34, 34, WIDTH - 68, HEIGHT - 68)
  ctx.lineWidth = 1.5
  ctx.strokeRect(52, 52, WIDTH - 104, HEIGHT - 104)

  // The braid axis: a billa cascade down the left spine.
  for (let i = 0; i < 12; i++) {
    drawPlaque(ctx, 66, 220 + i * 118, 34, 74, p)
  }

  // Surya/chandra medallion with the kural number.
  drawMedallion(ctx, 900, 300, 108, p, kural.n)

  ctx.textAlign = 'left'
  ctx.fillStyle = p.cream
  ctx.font = '600 34px Inter, Arial, sans-serif'
  ctx.fillText('TAMIL STOIC · திருக்குறள்', 76, 78)

  ctx.fillStyle = p.night ? p.goldBright : p.red
  ctx.font = '600 28px Inter, Arial, sans-serif'
  ctx.fillText(`KURAL #${paddedKural(kural.n)}`, 140, 268)

  // Ghost Tamil-numeral watermark.
  ctx.fillStyle = p.night ? 'rgba(224, 179, 76, 0.10)' : 'rgba(156, 32, 36, 0.08)'
  ctx.font = "700 340px 'Noto Serif Tamil', serif"
  ctx.fillText(taNumeral(kural.n), 560, 1560)

  // The couplet — always its two standard lines on two single lines, in order.
  const [top, bottom] = coupletLines(kural)
  let y = 400
  ctx.fillStyle = p.ink
  let versePx = 54
  ctx.font = `600 ${versePx}px 'Noto Serif Tamil', serif`
  while (versePx > 28 && Math.max(ctx.measureText(top).width, ctx.measureText(bottom).width) > 830) {
    versePx -= 2
    ctx.font = `600 ${versePx}px 'Noto Serif Tamil', serif`
  }
  const verseLineHeight = Math.round(versePx * 1.65)
  ctx.fillText(top, 140, y)
  y += verseLineHeight
  ctx.fillText(bottom, 140, y)
  y += verseLineHeight + 64

  // Gold rule with a plaque rosette.
  ctx.fillStyle = p.gold
  ctx.fillRect(140, y, 108, 4)
  drawPlaque(ctx, 268, y - 16, 24, 36, p)
  y += 92

  ctx.fillStyle = p.muted
  ctx.font = '600 24px Inter, Arial, sans-serif'
  ctx.fillText('SIMPLE MEANING', 140, y)
  y += 64

  ctx.fillStyle = p.ink
  ctx.font = '400 42px Georgia, serif'
  drawLines(ctx, wrap(ctx, kural.s, 790), 140, y, 62)

  // Footer over the hills.
  ctx.fillStyle = p.gold
  ctx.fillRect(140, 1670, 800, 1)
  ctx.fillStyle = p.cream
  ctx.font = 'italic 30px Georgia, serif'
  ctx.fillText(chapter ? `${chapter.ta} · ${chapter.en}` : 'Thirukkural', 140, 1740)
  ctx.fillStyle = p.goldBright
  ctx.font = '600 27px Inter, Arial, sans-serif'
  ctx.fillText(footer ?? 'A calm corner for Tamil wisdom', 140, 1810)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The share card could not be encoded'))
    }, 'image/png')
  })
}

export type CardOutcome = 'shared' | 'downloaded' | 'failed'

/**
 * Share the card image: through the native sheet when the platform accepts
 * files, otherwise as a download. Never throws — the caller shows a toast.
 */
export async function shareKuralCard(options: ShareCardOptions): Promise<CardOutcome> {
  try {
    const blob = await createShareCard(options)
    const filename = `thirukkural-${paddedKural(options.kural.n)}.png`

    const canShareFiles =
      typeof navigator.canShare === 'function' && typeof File === 'function' && typeof navigator.share === 'function'

    if (canShareFiles) {
      const file = new File([blob], filename, { type: 'image/png' })
      let supported = false
      try {
        supported = navigator.canShare({ files: [file] })
      } catch {
        supported = false
      }
      if (supported) {
        try {
          await navigator.share({ title: `Thirukkural #${paddedKural(options.kural.n)}`, files: [file] })
          return 'shared'
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return 'shared'
          // fall through to the download path
        }
      }
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}
