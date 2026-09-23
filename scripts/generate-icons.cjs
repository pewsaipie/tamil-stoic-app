/**
 * Generate PWA icons (192, 512, maskable-512) as PNGs without native deps.
 *   node scripts/generate-icons.mjs
 */
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const OUT = path.resolve(__dirname, '..', 'public', 'icons')
fs.mkdirSync(OUT, { recursive: true })

function crc32(buf) {
  const table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}
function makeCanvas(size) {
  const px = Buffer.alloc(size * size * 4)
  return {
    size, px,
    set(x, y, r, g, b, a) {
      if (x < 0 || y < 0 || x >= size || y >= size) return
      const i = (y * size + x) * 4
      px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a
    },
    fillCircle(cx, cy, r, rgba) {
      const r2 = r * r
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(size - 1, Math.ceil(cx + r))
      const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(size - 1, Math.ceil(cy + r))
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x - cx + 0.5, dy = y - cy + 0.5
        if (dx*dx + dy*dy <= r2) this.set(x, y, rgba[0], rgba[1], rgba[2], rgba[3])
      }
    },
    fillBg(rgba) {
      for (let i = 0; i < size*size; i++) {
        px[i*4]=rgba[0]; px[i*4+1]=rgba[1]; px[i*4+2]=rgba[2]; px[i*4+3]=rgba[3]
      }
    },
    fillBar(cx, cy, w, h, R, rgba) {
      const x0 = Math.floor(cx - w/2), y0 = Math.floor(cy - h/2)
      for (let y = y0; y < y0 + Math.ceil(h); y++)
        for (let x = x0; x < x0 + Math.ceil(w); x++) {
          const dx = x - cx + 0.5, dy = y - cy + 0.5
          if (dx*dx + dy*dy <= R*R) this.set(x, y, rgba[0], rgba[1], rgba[2], rgba[3])
        }
    }
  }
}
function renderIcon(size, { maskable = false } = {}) {
  const c = makeCanvas(size)
  const bg = [0xf7, 0xf2, 0xe8, 255]
  const fg = [0xa9, 0x4f, 0x31, 255]
  const accent = [0xb4, 0x86, 0x30, 255]
  const cream = [0xfb, 0xf6, 0xe7, 255]
  if (maskable) {
    c.fillBg(fg)
    const R = size * 0.34, cx = size/2, cy = size/2
    c.fillCircle(cx, cy, R, cream)
    c.fillCircle(cx, cy, R*0.78, accent)
    c.fillBar(cx, cy, R*1.0, R*0.2, R*0.78, fg)
    c.fillCircle(cx - R*0.35, cy - R*0.55, R*0.10, fg)
  } else {
    c.fillBg(bg)
    const R = size * 0.40, cx = size/2, cy = size/2
    c.fillCircle(cx, cy, R, fg)
    c.fillCircle(cx, cy, R*0.73, accent)
    c.fillBar(cx, cy, R*1.0, R*0.18, R*0.73, fg)
    c.fillCircle(cx - R*0.35, cy - R*0.55, R*0.10, fg)
  }
  return encodePNG(size, size, c.px)
}

fs.writeFileSync(path.join(OUT, 'icon-192.png'), renderIcon(192))
fs.writeFileSync(path.join(OUT, 'icon-512.png'), renderIcon(512))
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), renderIcon(512, { maskable: true }))
console.log('wrote', OUT)
