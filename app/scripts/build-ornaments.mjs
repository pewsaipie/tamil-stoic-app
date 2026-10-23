#!/usr/bin/env node
/**
 * Build the six-route Sangam canon from painted masters and approved crops.
 *
 * Keyed masters live under `design/canon-masters/<theme>/` against a seamless
 * chroma field. The builder measures the field, derives alpha, de-spills edge
 * pixels, trims, resizes and encodes WebP. A small second kind, `plate`, is used
 * only for the already-approved Saved/Credits concept frames: it crops away
 * every placeholder card and pseudo-letter, then feathers the crop into the
 * route instead of pretending a rectangular screenshot is an isolated object.
 *
 * Outputs are committed under root `assets/` and mirrored into the React app
 * by sync-assets.mjs. Every route and the complete six-route set are checked
 * against ORNAMENT_BUDGET on both build and --check.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ORNAMENT_BUDGET } from '../src/motion/budget.ts'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const repoRoot = resolve(appRoot, '..')
const check = process.argv.includes('--check')

/**
 * `key`: which background family to de-spill ('cool' indigo / 'warm' sand).
 * `rotate180`: orient a painted sprig for its final corner.
 * `crop` + `fade`: a text-free plate from an approved concept, not a key.
 */
const LAYERS = [
  // Home — Kurinji Vaikarai (PR #29).
  { theme: 'kurinji-vaikarai', master: 'design/canon-masters/kurinji-vaikarai/bamboo-left.png', out: 'assets/img/ornaments/kurinji-vaikarai/bamboo-left.webp', key: 'cool', maxWidth: 432, quality: 72, alphaQuality: 84 },
  { theme: 'kurinji-vaikarai', master: 'design/canon-masters/kurinji-vaikarai/honeycomb.png', out: 'assets/img/ornaments/kurinji-vaikarai/honeycomb.webp', key: 'cool', maxWidth: 576, quality: 82, alphaQuality: 92 },
  { theme: 'kurinji-vaikarai', master: 'design/canon-masters/kurinji-vaikarai/bloom-corner.png', out: 'assets/img/ornaments/kurinji-vaikarai/bloom-corner.webp', key: 'warm', rotate180: true, maxWidth: 768, quality: 80, alphaQuality: 90 },

  // Chapters — Marutham Vidiyal: field checks, paddy, lotus and egret.
  { theme: 'marutham-vidiyal', master: 'design/canon-masters/marutham-vidiyal/paddy-checks.png', out: 'assets/img/ornaments/marutham-vidiyal/paddy-checks.webp', key: 'warm', maxWidth: 576, quality: 74, alphaQuality: 88 },
  { theme: 'marutham-vidiyal', master: 'design/canon-masters/marutham-vidiyal/paddy-bund.png', out: 'assets/img/ornaments/marutham-vidiyal/paddy-bund.webp', key: 'cool', maxWidth: 576, quality: 74, alphaQuality: 88 },
  { theme: 'marutham-vidiyal', master: 'design/canon-masters/marutham-vidiyal/lotus-egret.png', out: 'assets/img/ornaments/marutham-vidiyal/lotus-egret.webp', key: 'cool', maxWidth: 640, quality: 78, alphaQuality: 90 },

  // Reader — Olai under the Agal. Leaves are deliberately blank.
  { theme: 'olai-agal', master: 'design/canon-masters/olai-agal/agal-lamp.png', out: 'assets/img/ornaments/olai-agal/agal-lamp.webp', key: 'cool', maxWidth: 448, quality: 80, alphaQuality: 90 },
  { theme: 'olai-agal', master: 'design/canon-masters/olai-agal/olai-stylus.png', out: 'assets/img/ornaments/olai-agal/olai-stylus.webp', key: 'cool', maxWidth: 640, quality: 78, alphaQuality: 90 },
  { theme: 'olai-agal', master: 'design/canon-masters/olai-agal/palm-fibre.png', out: 'assets/img/ornaments/olai-agal/palm-fibre.webp', key: 'cool', maxWidth: 320, quality: 76, alphaQuality: 88 },

  // Ask — Mullai Erpaadu: banyan, blank olai screen, jasmine and clay lamp.
  { theme: 'mullai-erpaadu', master: 'design/canon-masters/mullai-erpaadu/banyan-bough.png', out: 'assets/img/ornaments/mullai-erpaadu/banyan-bough.webp', key: 'warm', maxWidth: 640, quality: 78, alphaQuality: 90 },
  { theme: 'mullai-erpaadu', master: 'design/canon-masters/mullai-erpaadu/olai-screen.png', out: 'assets/img/ornaments/mullai-erpaadu/olai-screen.webp', key: 'cool', maxWidth: 512, quality: 78, alphaQuality: 90 },
  { theme: 'mullai-erpaadu', master: 'design/canon-masters/mullai-erpaadu/jasmine-lamp.png', out: 'assets/img/ornaments/mullai-erpaadu/jasmine-lamp.webp', key: 'cool', maxWidth: 576, quality: 80, alphaQuality: 90 },

  // Saved — Palai Nanpagal. The bundle crop excludes the concept's card.
  { theme: 'palai-nanpagal', master: 'design/canon-masters/palai-nanpagal/palai-branch.png', out: 'assets/img/ornaments/palai-nanpagal/palai-branch.webp', key: 'cool', maxWidth: 640, quality: 78, alphaQuality: 90 },
  { theme: 'palai-nanpagal', master: 'design/canon-masters/palai-nanpagal/kalli-branch.svg', out: 'assets/img/ornaments/palai-nanpagal/kalli-branch.webp', key: 'cool', maxWidth: 512, quality: 76, alphaQuality: 88 },
  { theme: 'palai-nanpagal', master: 'design/canon-concepts/route-saved-palai-nanpagal.png', out: 'assets/img/ornaments/palai-nanpagal/cloth-bundle.webp', crop: { left: 1210, top: 1390, width: 566, height: 978 }, fade: { top: 0.12, left: 0.08 }, maxWidth: 440, quality: 78, alphaQuality: 90 },

  // Credits — Natukal. The two crops contain no placeholder panel or script.
  { theme: 'natukal', master: 'design/canon-concepts/route-credits-natukal.png', out: 'assets/img/ornaments/natukal/light-shaft.webp', crop: { left: 0, top: 0, width: 290, height: 900 }, fade: { right: 0.35, bottom: 0.25 }, maxWidth: 320, quality: 76, alphaQuality: 88 },
  { theme: 'natukal', master: 'design/canon-concepts/route-credits-natukal.png', out: 'assets/img/ornaments/natukal/stone-pod-beads.webp', crop: { left: 0, top: 900, width: 1086, height: 260 }, fade: { top: 0.1, left: 0.03, right: 0.03 }, maxWidth: 960, quality: 78, alphaQuality: 90 },
]

function cornerMedian(data, width, height) {
  const sample = 8
  const seen = []
  for (const [cx, cy] of [[0, 0], [width - sample, 0], [0, height - sample], [width - sample, height - sample]]) {
    for (let y = 0; y < sample; y += 1) {
      for (let x = 0; x < sample; x += 1) {
        const i = ((cy + y) * width + (cx + x)) * 4
        seen.push([data[i], data[i + 1], data[i + 2]])
      }
    }
  }
  const median = (channel) => seen.map((p) => p[channel]).sort((a, b) => a - b)[Math.floor(seen.length / 2)]
  return [median(0), median(1), median(2)]
}

function keyAndDespill(data, width, height, key, flavour) {
  const [kr, kg, kb] = key
  const hard = 34
  const soft = 92
  const box = { left: Infinity, top: Infinity, right: 0, bottom: 0 }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const dr = data[i] - kr
      const dg = data[i + 1] - kg
      const db = data[i + 2] - kb
      const distance = Math.sqrt(dr * dr + dg * dg + db * db)
      let alpha = 0
      if (distance > soft) alpha = 255
      else if (distance > hard) alpha = Math.round(((distance - hard) / (soft - hard)) * 255)

      if (alpha < 255) {
        const keep = alpha / 255
        if (flavour === 'cool') {
          data[i + 2] = Math.round(data[i + 2] * (0.35 + 0.65 * keep) + Math.min(data[i], data[i + 1]) * (0.65 * (1 - keep)))
        } else {
          const settle = Math.round(data[i + 2] * (1 - 0.5 * (1 - keep)))
          data[i] = Math.round(data[i] * (0.5 + 0.5 * keep) + settle * (0.5 * (1 - keep)))
          data[i + 1] = Math.round(data[i + 1] * (0.55 + 0.45 * keep) + settle * (0.45 * (1 - keep)))
        }
      }
      if (alpha > 242) alpha = 255
      else if (alpha < 14) alpha = 0
      data[i + 3] = alpha
      if (alpha > 10) {
        if (x < box.left) box.left = x
        if (x > box.right) box.right = x
        if (y < box.top) box.top = y
        if (y > box.bottom) box.bottom = y
      }
    }
  }
  return box
}

async function buildKeyedLayer(layer) {
  const masterPath = join(repoRoot, layer.master)
  const image = sharp(masterPath, { limitInputPixels: false })
  const { width, height } = await image.metadata()
  const raw = await sharp(masterPath, { limitInputPixels: false }).ensureAlpha().raw().toBuffer()
  const key = cornerMedian(raw, width, height)
  const box = keyAndDespill(raw, width, height, key, layer.key)
  if (!Number.isFinite(box.left)) throw new Error(`keying removed everything in ${layer.master}`)

  const pad = 4
  const left = Math.max(0, box.left - pad)
  const top = Math.max(0, box.top - pad)
  const cropWidth = Math.min(width - left, box.right - box.left + 1 + pad * 2)
  const cropHeight = Math.min(height - top, box.bottom - box.top + 1 + pad * 2)
  let pipeline = sharp(raw, { raw: { width, height, channels: 4 } }).extract({ left, top, width: cropWidth, height: cropHeight })
  if (layer.rotate180) pipeline = pipeline.rotate(180)
  return pipeline
    .resize({ width: layer.maxWidth, withoutEnlargement: true })
    .webp({ quality: layer.quality, alphaQuality: layer.alphaQuality, smartSubsample: true, effort: 6 })
    .toBuffer()
}

const smooth = (value) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

async function buildPlateLayer(layer) {
  const masterPath = join(repoRoot, layer.master)
  const { data, info } = await sharp(masterPath, { limitInputPixels: false })
    .extract(layer.crop)
    .resize({ width: layer.maxWidth, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const fade = layer.fade ?? {}
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      let alpha = 1
      if (fade.top) alpha *= smooth(y / Math.max(1, info.height * fade.top))
      if (fade.left) alpha *= smooth(x / Math.max(1, info.width * fade.left))
      if (fade.right) alpha *= smooth((info.width - 1 - x) / Math.max(1, info.width * fade.right))
      if (fade.bottom) alpha *= smooth((info.height - 1 - y) / Math.max(1, info.height * fade.bottom))
      const i = (y * info.width + x) * 4
      data[i + 3] = Math.min(data[i + 3], Math.round(alpha * 255))
    }
  }

  return sharp(data, { raw: info })
    .webp({ quality: layer.quality, alphaQuality: layer.alphaQuality, smartSubsample: true, effort: 6 })
    .toBuffer()
}

let failed = false
let totalBytes = 0
const routeStats = new Map()

for (const layer of LAYERS) {
  const masterPath = join(repoRoot, layer.master)
  if (!existsSync(masterPath)) throw new Error(`missing master: ${layer.master}`)
  const buffer = layer.crop ? await buildPlateLayer(layer) : await buildKeyedLayer(layer)
  const outPath = join(repoRoot, layer.out)
  const stats = routeStats.get(layer.theme) ?? { layers: 0, bytes: 0 }
  stats.layers += 1
  stats.bytes += buffer.length
  routeStats.set(layer.theme, stats)
  totalBytes += buffer.length

  if (check) {
    if (!existsSync(outPath)) {
      console.error(`  ✗ missing ${layer.out} — run build-ornaments`)
      failed = true
      continue
    }
    const committed = await readFile(outPath)
    const same = createHash('sha256').update(committed).digest('hex') === createHash('sha256').update(buffer).digest('hex')
    console.log(`  ${same ? '✓' : '✗ FAIL:'} ${layer.out} is ${same ? 'in sync' : 'stale — run build-ornaments'}`)
    if (!same) failed = true
  } else {
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, buffer)
    console.log(`  wrote ${layer.out} (${Math.round(buffer.length / 1024)} KB)`)
  }

  if (buffer.length > ORNAMENT_BUDGET.maxLayerBytes) {
    console.error(`  ✗ FAIL: ${layer.out} is ${buffer.length} B, over ${ORNAMENT_BUDGET.maxLayerBytes} B`)
    failed = true
  }
}

for (const [theme, stats] of routeStats) {
  console.log(`  · ${theme}: ${stats.layers} layers, ${Math.round(stats.bytes / 1024)} KB`)
  if (stats.layers > ORNAMENT_BUDGET.layersPerRoute) {
    console.error(`  ✗ FAIL: ${theme} has ${stats.layers} layers, over ${ORNAMENT_BUDGET.layersPerRoute}`)
    failed = true
  }
  if (stats.bytes > ORNAMENT_BUDGET.maxRouteBytes) {
    console.error(`  ✗ FAIL: ${theme} is ${stats.bytes} B, over ${ORNAMENT_BUDGET.maxRouteBytes} B`)
    failed = true
  }
}
if (routeStats.size !== 6) {
  console.error(`  ✗ FAIL: expected six route canons, found ${routeStats.size}`)
  failed = true
}
if (totalBytes > ORNAMENT_BUDGET.maxAllRoutesBytes) {
  console.error(`  ✗ FAIL: six-route total ${totalBytes} B, over ${ORNAMENT_BUDGET.maxAllRoutesBytes} B`)
  failed = true
}

console.log(
  failed
    ? '\nornament build drifted or overweight — fix and rerun'
    : `\n${LAYERS.length} layers across six routes, ${Math.round(totalBytes / 1024)} KB total (ceiling ${Math.round(ORNAMENT_BUDGET.maxAllRoutesBytes / 1024)} KB)`,
)
process.exit(failed ? 1 : 0)
