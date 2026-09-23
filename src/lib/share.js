// Canvas-based kural card image generator, sized for Instagram/WhatsApp shares.
// Works fully offline; no network fonts (we rely on the browser's serif fallback
// for Tamil — Noto Serif Tamil will be available since it's loaded by the page).

const BG_LIGHT = { bg: '#fbf6e7', card: '#fffdf7', ink: '#2a241f', soft: '#6a5f52',
                   gold: '#b48630', warm: '#a94f31', accent: '#26614f' }
const BG_DARK = { bg: '#131316', card: '#1e1e24', ink: '#efeae0', soft: '#b8af9f',
                  gold: '#d4ab58', warm: '#d28062', accent: '#5fb49a' }

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
    if (lines.length >= maxLines - 1) {
      // Stuff remainder into the last line; if it overflows, append ellipsis.
      const rest = [line, ...words.slice(words.indexOf(word) + 1)].join(' ')
      if (ctx.measureText(rest).width > maxWidth) {
        // Greedy trim with ellipsis
        let trimmed = rest
        while (ctx.measureText(trimmed + '…').width > maxWidth && trimmed.length > 0) {
          trimmed = trimmed.slice(0, -1)
        }
        lines.push(trimmed + '…')
      } else {
        lines.push(rest)
      }
      return { lines, height: lines.length * lineHeight, finalY: y + lines.length * lineHeight }
    }
  }
  if (line) lines.push(line)
  return { lines, height: lines.length * lineHeight, finalY: y + lines.length * lineHeight }
}

function wrapTamil(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  // Tamil can be wrapped at space boundaries; fall back to character wrap if
  // a single "word" (which is often the whole line in Tamil poetry) is too long.
  const segments = String(text).split(/\s+/)
  const lines = []
  for (const seg of segments) {
    if (ctx.measureText(seg).width <= maxWidth) {
      lines.push(seg)
    } else {
      // Character-wrap long segment
      let line = ''
      for (const ch of seg) {
        const test = line + ch
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line)
          line = ch
          if (lines.length >= maxLines) break
        } else {
          line = test
        }
      }
      if (line && lines.length < maxLines) lines.push(line)
    }
    if (lines.length >= maxLines) break
  }
  while (lines.length > maxLines) lines.pop()
  return { lines, height: lines.length * lineHeight, finalY: y + lines.length * lineHeight }
}

export function drawKuralCard(canvas, kural, opts = {}) {
  const { theme = 'light', chapter, section, size = 'square' } = opts
  const palette = theme === 'dark' ? BG_DARK : BG_LIGHT
  const ctx = canvas.getContext('2d')

  const W = size === 'story' ? 1080 : 1080
  const H = size === 'story' ? 1920 : 1080
  canvas.width = W
  canvas.height = H

  // Background
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, W, H)

  // Warm glow
  const grad = ctx.createRadialGradient(W * 0.75, -80, 50, W * 0.75, -80, 560)
  grad.addColorStop(0, theme === 'dark' ? 'rgba(212,171,88,0.10)' : 'rgba(180,134,48,0.18)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Card
  const margin = 80
  const cardX = margin
  const cardY = size === 'story' ? 220 : 120
  const cardW = W - margin * 2
  const cardH = size === 'story' ? (H - cardY - margin - 220) : (H - cardY - margin)
  ctx.fillStyle = palette.card
  roundedRect(ctx, cardX, cardY, cardW, cardH, 40)
  ctx.fill()
  ctx.save()
  ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  // Left stripe
  ctx.save()
  const stripeGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH)
  stripeGrad.addColorStop(0, palette.warm)
  stripeGrad.addColorStop(1, palette.gold)
  ctx.fillStyle = stripeGrad
  roundedRect(ctx, cardX, cardY, 8, cardH, 4)
  ctx.fill()
  ctx.restore()

  const innerX = cardX + 60
  let y = cardY + 60
  const innerW = cardW - 100

  // Eyebrow
  ctx.fillStyle = palette.warm
  ctx.font = '600 22px Inter, system-ui, sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillText('Today\'s Kural · இன்றைய குறள்', innerX, y)

  // Number pill
  y += 44
  ctx.fillStyle = palette.warm
  roundedRect(ctx, innerX, y, 92, 42, 10); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '700 22px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  const nStr = `#${String(kural.n).padStart(3, '0')}`
  ctx.fillText(nStr, innerX + 46, y + 10)
  ctx.textAlign = 'start'

  // Chapter
  ctx.fillStyle = palette.soft
  ctx.font = 'italic 22px EB Garamond, Georgia, serif'
  const chapterText = chapter ? `${chapter.ta} · ${chapter.en}` : ''
  ctx.fillText(chapterText, innerX + 110, y + 10)
  y += 76

  // Tamil verse
  ctx.fillStyle = palette.ink
  ctx.font = '600 48px "Noto Serif Tamil", "Latha", serif'
  const tamilWrap = wrapTamil(ctx, kural.ta.join(' '), innerX, y, innerW, 70, 3)
  tamilWrap.lines.forEach((ln, i) => {
    ctx.fillText(ln, innerX, y + i * 70)
  })
  y += tamilWrap.height + 28

  // Divider
  ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(innerX, y)
  ctx.lineTo(innerX + innerW, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 36

  // Simple meaning label
  ctx.fillStyle = palette.soft
  ctx.font = '700 18px Inter, system-ui, sans-serif'
  ctx.fillText('Simple meaning', innerX, y)
  y += 34

  ctx.fillStyle = palette.ink
  ctx.font = '400 28px Inter, system-ui, sans-serif'
  wrapText(ctx, kural.s, innerX, y, innerW, 42, 4).lines.forEach((ln, i, arr) => {
    ctx.fillText(ln, innerX, y + i * 42)
    if (i === arr.length - 1) y += (i + 1) * 42
  })

  // Footer / watermark
  const footY = size === 'story' ? (H - margin - 90) : (H - margin - 40)
  ctx.fillStyle = palette.soft
  ctx.font = 'italic 22px EB Garamond, Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('tamilstoic.app  ·  அறம் · பொருள் · காமம்', W / 2, footY)
  ctx.textAlign = 'start'
}

export async function shareKural(kural, meta) {
  // 1) Render a 1080x1080 PNG to a canvas
  const canvas = document.createElement('canvas')
  drawKuralCard(canvas, kural, meta)
  let blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  const file = new File([blob], `kural-${String(kural.n).padStart(3, '0')}.png`, { type: 'image/png' })
  const shareData = {
    title: `Kural ${String(kural.n).padStart(3, '0')} — ${meta.chapter ? meta.chapter.en : ''}`,
    text: `${kural.ta.join(' / ')}\n\n${kural.s}`,
    files: [file],
  }
  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try { await navigator.share(shareData); return 'shared' } catch (e) { if (e && e.name === 'AbortError') return 'cancelled' }
  }
  // Fallback: download the PNG
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kural-${String(kural.n).padStart(3, '0')}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}

export async function copyKuralText(kural, meta) {
  const text = `திருக்குறள் ${String(kural.n).padStart(3, '0')}${meta.chapter ? ' · ' + meta.chapter.en : ''}

${kural.ta.join('\n')}

${kural.s}

— tamilstoic.app`
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
