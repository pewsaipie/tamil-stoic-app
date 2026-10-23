#!/usr/bin/env node
/**
 * Build the canon ornament layers from their painted masters.
 *
 * The masters under `design/canon-masters/<theme>/` are photographed against a
 * seamless chroma background on purpose (see the prompts recorded in
 * docs/sangam-theme-canon.md). This script turns them into the layers the app
 * composites at the edges of a route:
 *
 *   1. **key**      every pixel's alpha from its distance to the measured
 *                   background colour (sampled from the four corners, so a
 *                   mild render vignette does not shift the key)
 *   2. **despill**  pull the key's dominant channels out of edge pixels, so
 *                   no indigo/sand halo survives on petal or leaf rims
 *   3. **trim**     the transparent border away, measured by alpha rather than
 *                   by colour, then **orient** (some layers serve flipped)
 *   4. **resize**   to the layer's only render width and encode WebP
 *
 * like `build-materials.mjs`, the outputs are committed under `assets/` and
 * mirrored into the app by `sync-assets.mjs`:
 *
 *   node --experimental-strip-types scripts/build-ornaments.mjs           # build
 *   node --experimental-strip-types scripts/build-ornaments.mjs --check   # verify committed bytes, exit 1 on drift
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
 * The Kurinji Vaikarai set (Home). New routes append their own theme entries;
 * the budget assertions below then cover them automatically.
 *
 * `key`    — which channels of the axis the background favours ('cool' = the
 *            indigo masters, 'warm' = the sand master), used for despill.
 * `rotate180` — the sprig was painted arching one way; the corner wants it the
 *            other way. Flipping at build time keeps the master honest (the
 *            light in the master still reads correctly: it comes from above).
 */
const LAYERS = [
  {
    master: 'design/canon-masters/kurinji-vaikarai/bamboo-left.png',
    out: 'assets/img/ornaments/kurinji-vaikarai/bamboo-left.webp',
    key: 'cool',
    // Foliage alpha compresses worst: the hero renders it far below this
    // pixel width, and the leaf tips dissolve over the mist layer anyway.
    maxWidth: 432,
    quality: 72,
    alphaQuality: 84,
  },
  {
    master: 'design/canon-masters/kurinji-vaikarai/honeycomb.png',
    out: 'assets/img/ornaments/kurinji-vaikarai/honeycomb.webp',
    key: 'cool',
    maxWidth: 576,
    quality: 82,
    alphaQuality: 92,
  },
  {
    master: 'design/canon-masters/kurinji-vaikarai/bloom-corner.png',
    out: 'assets/img/ornaments/kurinji-vaikarai/bloom-corner.webp',
    key: 'warm',
    rotate180: true,
    maxWidth: 768,
    quality: 80,
    alphaQuality: 90,
  },
]

/** Sample the median RGB of the four corners — the measured key colour. */
function cornerMedian(data, width, height) {
  const sample = 8
  const seen = []
  for (const [cx, cy] of [
    [0, 0],
    [width - sample, 0],
    [0, height - sample],
    [width - sample, height - sample],
  ]) {
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

/**
 * Distance-keyed alpha with despill.
 *
 * Below `hard` the pixel is background; above `soft` it is fully kept; between
 * the two the alpha ramps. Semi pixels get their colour de-spilled toward the
 * channel harsher light mix, so the feather never carries the backdrop's hue
 * into the scene it is composited over.
 */
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
          // the backdrop is indigo: clip the blue spill out of the feather
          data[i + 2] = Math.round(data[i + 2] * (0.35 + 0.65 * keep) + Math.min(data[i], data[i + 1]) * (0.65 * (1 - keep)))
        } else {
          // the backdrop is warm sand: clip the red+green bias out of the feather
          const settle = Math.round(data[i + 2] * (1 - 0.5 * (1 - keep)))
          data[i] = Math.round(data[i] * (0.5 + 0.5 * keep) + settle * (0.5 * (1 - keep)))
          data[i + 1] = Math.round(data[i + 1] * (0.55 + 0.45 * keep) + settle * (0.45 * (1 - keep)))
        }
      }
      // Posterise the feather ends: near-opaque becomes opaque, near-clear
      // becomes clear. Invisible to the eye, but it collapses the alpha noise
      // that otherwise dominates the WebP of a leafy layer.
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

async function buildLayer(layer) {
  const masterPath = join(repoRoot, layer.master)
  if (!existsSync(masterPath)) throw new Error(`missing master: ${layer.master}`)

  const image = sharp(masterPath, { limitInputPixels: false })
  const { width, height } = await image.metadata()
  const raw = await sharp(masterPath, { limitInputPixels: false }).ensureAlpha().raw().toBuffer()

  const key = cornerMedian(raw, width, height)
  const box = keyAndDespill(raw, width, height, key, layer.key)
  if (!Number.isFinite(box.left)) throw new Error(`keying removed everything in ${layer.master} — check the background sample`)

  const pad = 4
  const left = Math.max(0, box.left - pad)
  const top = Math.max(0, box.top - pad)
  const cropWidth = Math.min(width - left, box.right - box.left + 1 + pad * 2)
  const cropHeight = Math.min(height - top, box.bottom - box.top + 1 + pad * 2)

  let pipeline = sharp(raw, { raw: { width, height, channels: 4 } }).extract({ left, top, width: cropWidth, height: cropHeight })
  if (layer.rotate180) pipeline = pipeline.rotate(180)
  pipeline = pipeline
    .resize({ width: layer.maxWidth, withoutEnlargement: true })
    .webp({ quality: layer.quality, alphaQuality: layer.alphaQuality, smartSubsample: true, effort: 6 })

  return pipeline.toBuffer()
}

let failed = false
let totalBytes = 0
await mkdir(join(repoRoot, 'assets/img/ornaments/kurinji-vaikarai'), { recursive: true })

for (const layer of LAYERS) {
  const buffer = await buildLayer(layer)
  const outPath = join(repoRoot, layer.out)
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
    console.error(`  ✗ FAIL: ${layer.out} is ${buffer.length} B, over the layer ceiling ${ORNAMENT_BUDGET.maxLayerBytes} B`)
    failed = true
  }
}

if (LAYERS.length > ORNAMENT_BUDGET.layersPerRoute) {
  console.error(`  ✗ FAIL: ${LAYERS.length} layers on one route, over the ceiling ${ORNAMENT_BUDGET.layersPerRoute}`)
  failed = true
}
if (totalBytes > ORNAMENT_BUDGET.maxRouteBytes) {
  console.error(`  ✗ FAIL: route total ${totalBytes} B, over the ceiling ${ORNAMENT_BUDGET.maxRouteBytes} B`)
  failed = true
}

console.log(
  failed
    ? '\nornament build drifted or overweight — fix and rerun'
    : `\n${LAYERS.length} layers, ${Math.round(totalBytes / 1024)} KB on the route (ceiling ${Math.round(ORNAMENT_BUDGET.maxRouteBytes / 1024)} KB)`,
)
process.exit(failed ? 1 : 0)
