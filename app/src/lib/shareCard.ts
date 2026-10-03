/**
 * Bilingual share card — the canvas art the shipped reader draws, ported to the
 * React app: ola-paper ground, manuscript gold frame, corner rosettes, a wax seal
 * carrying the kural number, a Tamil-numeral watermark, the couplet on its two
 * standard lines, the simple meaning and the chapter it belongs to.
 *
 * Everything is drawn in code — no image assets, no network.
 */
import { coupletLines } from './couplet'
import type { Chapter, Kural } from './types'

const WIDTH = 1080
const HEIGHT = 1920

const PALM = '#f8f1e2'
const DEEP = '#efe3c8'
const INK = '#2a241f'
const GOLD = '#b48630'
const GREEN = '#26614f'
const MADDER = '#a94f31'
const MUTED = '#5c5249'
const CREAM = '#fffdf7'

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

function drawRosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colour: string): void {
  const previous = ctx.fillStyle
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(cx + Math.cos(angle) * r * 0.62, cy + Math.sin(angle) * r * 0.62, r * 0.22, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = previous
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

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot create a share image')

  // Ola-paper ground.
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  background.addColorStop(0, PALM)
  background.addColorStop(1, DEEP)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Palm-leaf fibre grain, drawn in code so the card needs no assets.
  ctx.fillStyle = 'rgba(150, 120, 70, 0.05)'
  for (let fibre = 0; fibre < 46; fibre++) {
    ctx.fillRect(0, 60 + fibre * 41, WIDTH, 1.5)
  }

  // Header band and the terracotta spine.
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 0, WIDTH, 132)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 132, WIDTH, 12)
  ctx.fillStyle = MADDER
  ctx.fillRect(0, 144, 18, 1640)

  // Manuscript gold frame.
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2
  ctx.strokeRect(34, 34, WIDTH - 68, HEIGHT - 68)

  // Wax seal.
  ctx.fillStyle = CREAM
  ctx.beginPath()
  ctx.arc(924, 282, 116, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.arc(924, 282, 84, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = GREEN
  ctx.beginPath()
  ctx.arc(924, 282, 56, 0, Math.PI * 2)
  ctx.fill()
  drawRosette(ctx, 924, 282, 44, '#f4ead2')

  // Corner rosettes.
  drawRosette(ctx, 70, 1846, 24, GOLD)
  drawRosette(ctx, 1010, 1846, 24, GOLD)

  ctx.textAlign = 'left'
  ctx.fillStyle = CREAM
  ctx.font = '600 34px Inter, Arial, sans-serif'
  ctx.fillText('TAMIL STOIC · திருக்குறள்', 76, 81)

  ctx.fillStyle = MADDER
  ctx.font = '600 28px Inter, Arial, sans-serif'
  ctx.fillText(`KURAL #${paddedKural(kural.n)}`, 76, 246)

  // Ghost Tamil-numeral watermark.
  ctx.fillStyle = 'rgba(169, 79, 49, 0.08)'
  ctx.font = "700 340px 'Noto Serif Tamil', serif"
  ctx.fillText(taNumeral(kural.n), 560, 1560)

  // The couplet — always its two standard lines on two single lines, in order.
  const [top, bottom] = coupletLines(kural)
  let y = 378
  ctx.fillStyle = INK
  let versePx = 54
  ctx.font = `600 ${versePx}px 'Noto Serif Tamil', serif`
  while (
    versePx > 28 &&
    Math.max(ctx.measureText(top).width, ctx.measureText(bottom).width) > 900
  ) {
    versePx -= 2
    ctx.font = `600 ${versePx}px 'Noto Serif Tamil', serif`
  }
  const verseLineHeight = Math.round(versePx * 1.65)
  ctx.fillText(top, 76, y)
  y += verseLineHeight
  ctx.fillText(bottom, 76, y)
  y += verseLineHeight + 64

  ctx.fillStyle = GOLD
  ctx.fillRect(76, y, 108, 4)
  drawRosette(ctx, 204, y + 2, 15, GOLD)
  y += 92

  ctx.fillStyle = MUTED
  ctx.font = '600 24px Inter, Arial, sans-serif'
  ctx.fillText('SIMPLE MEANING', 76, y)
  y += 64

  ctx.fillStyle = INK
  ctx.font = '400 42px Georgia, serif'
  drawLines(ctx, wrap(ctx, kural.s, 850), 76, y, 62)

  // Footer.
  ctx.fillStyle = GREEN
  ctx.fillRect(76, 1670, 928, 1)
  ctx.fillStyle = MUTED
  ctx.font = 'italic 30px Georgia, serif'
  ctx.fillText(chapter ? `${chapter.ta} · ${chapter.en}` : 'Thirukkural', 76, 1740)
  ctx.fillStyle = GREEN
  ctx.font = '600 27px Inter, Arial, sans-serif'
  ctx.fillText(footer ?? 'A calm corner for Tamil wisdom', 76, 1810)

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
