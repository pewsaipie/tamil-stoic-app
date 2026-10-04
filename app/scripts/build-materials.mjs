#!/usr/bin/env node
/**
 * Bake the material maps for the reality-first UI.
 *
 *   node scripts/build-materials.mjs            # generate
 *   node scripts/build-materials.mjs --check    # verify the committed bytes
 *
 * Every map is generated here, from integer noise, by this file. Nothing is
 * downloaded and nothing is scanned, so there is no third-party licence to
 * honour and the PWA stays fully offline: the maps are ordinary PNGs in
 * `assets/materials/` (the repository's committed asset root) and are mirrored
 * into the app by `sync-assets.mjs` like the fonts and artwork already are.
 *
 * Why bake at all, when the shaders could generate this at runtime? Because of
 * what each is good at:
 *
 *   - **Baked** = the *low-frequency* structure: mottling, staining, the warp
 *     of a leaf that dried under a weight, poured-wax lumps, the room's light
 *     in a small equirect. These compress well (they are smooth), so a whole
 *     material set costs a few hundred kilobytes, and they cost the GPU one
 *     sample instead of eight octaves of noise per pixel.
 *   - **Shader** = the *high-frequency* detail: leaf fibre, paper tooth, the
 *     micro-relief of a thumb pressed into wax. These stay crisp at any zoom
 *     and cost zero bytes.
 *
 * The split is deliberate; see docs/reality-first-ui.md §5.
 */
import { deflateSync } from 'node:zlib'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const repoRoot = resolve(appRoot, '..')
const outDir = join(repoRoot, 'assets', 'materials')
const check = process.argv.includes('--check')

/* ---------------------------------------------------------------------------
 * A minimal PNG encoder (8-bit RGB / RGBA, filter 0). Node ships zlib and
 * crc32 is a dozen lines, so the whole dependency is the standard library.
 * ------------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

/** `pixels` is RGB (3 bytes/px) or RGBA (4 bytes/px), row-major. */
function encodePng(width, height, pixels, channels = 3) {
  const stride = width * channels
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filter: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    )
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = channels === 4 ? 6 : 2 // colour type
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------------------------------------------------------------------
 * Tileable value noise.
 *
 * Everything wraps on an integer lattice, so every generated map tiles
 * seamlessly — which matters because the leaves are laid out in rows and a
 * visible seam would break the illusion instantly.
 * ------------------------------------------------------------------------ */

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ (seed | 0)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const wrap = (v, period) => ((v % period) + period) % period
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Value noise sampled on a lattice that wraps every `period` units. */
function valueNoise(x, y, period, seed) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = fade(x - ix)
  const fy = fade(y - iy)
  const x0 = wrap(ix, period)
  const x1 = wrap(ix + 1, period)
  const y0 = wrap(iy, period)
  const y1 = wrap(iy + 1, period)

  const a = hash2(x0, y0, seed)
  const b = hash2(x1, y0, seed)
  const c = hash2(x0, y1, seed)
  const d = hash2(x1, y1, seed)
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy)
}

/**
 * Fractal sum of value noise.
 *
 * Two things here are doing the heavy lifting for realism, and both exist
 * because plain summed value noise reads as *grid* — you can see the lattice
 * it was sampled on, which instantly says "generated".
 *
 *   1. **Per-octave rotation.** Each octave is sampled on its own rotated
 *      basis (turned by the golden angle), so the square grids of successive
 *      octaves cannot line up and reinforce each other into visible squares.
 *   2. **Axis swap when rotation is not allowed.** For maps that must tile
 *      (the table), rotating would break the wrap. Alternating the axes is the
 *      one rotation that maps the integer lattice onto itself, so the map
 *      still tiles and the octaves still decorrelate.
 *
 * `aspect` stretches the field so detail can run along the leaf rather than
 * across it — palm leaf is striated lengthwise.
 */
function fbm(
  u,
  v,
  { period = 4, octaves = 5, gain = 0.5, lacunarity = 2, seed = 1, aspect = 1, tile = false } = {},
) {
  let sum = 0
  let amplitude = 1
  let norm = 0
  let p = period
  let frequency = 1

  for (let o = 0; o < octaves; o += 1) {
    const x = u * p * frequency * aspect
    const y = v * p * frequency

    if (tile) {
      const swap = o % 2 === 1
      sum += amplitude * valueNoise(swap ? y : x, swap ? x : y, p, seed + o * 131)
    } else {
      const theta = o * 2.399963229728653 // the golden angle, per octave
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      sum += amplitude * valueNoise(x * cos - y * sin, x * sin + y * cos, p, seed + o * 131)
    }

    norm += amplitude
    amplitude *= gain
    frequency *= lacunarity
    p *= lacunarity
  }

  return sum / norm
}

/**
 * Domain warping — the single most effective trick in this file.
 *
 * Instead of reading the noise at `(u, v)`, read it at `(u, v)` displaced by
 * another noise field. Structure stops being blobby and starts flowing, which
 * is how wax spreads, how water stains creep through paper, and how a leaf
 * mottles as it ages. The warp field is sampled with `aspect: 1` so the result
 * keeps whatever tiling properties the caller asked for.
 */
function warped(u, v, options = {}) {
  const { strength = 0.055, seed = 0, period = 2, octaves = 3 } = options
  const dx = fbm(u, v, { period, octaves, seed: seed + 4177 }) - 0.5
  const dy = fbm(u, v, { period, octaves, seed: seed + 9281 }) - 0.5
  return fbm(u + dx * strength, v + dy * strength, options)
}

/** Ridged noise — creases instead of blobs. Used for leaf veins. */
function ridged(u, v, options) {
  const n = fbm(u, v, options)
  return 1 - Math.abs(2 * n - 1)
}

/* ---------------------------------------------------------------------------
 * Maps
 * ------------------------------------------------------------------------ */

const mix = (a, b, t) => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

/** The palm leaf (ola): cream, mottled, faintly stained, softly worn. */
function olaAlbedo(size) {
  const out = new Uint8Array(size * size * 3)
  const CREAM = [236, 222, 183]
  const TAN = [214, 189, 138]
  const STAIN = [158, 122, 68]
  const BRUISE = [120, 92, 55]

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size
      const v = y / size

      // Mottling, warped so it flows along the leaf rather than sitting in
      // blobs, and stretched lengthwise (aspect < 1 = elongated in u).
      const mottle = warped(u, v, { period: 3, octaves: 5, seed: 11, aspect: 0.45, strength: 0.075 })
      // Broad stains, a different seed so they do not align with the mottling.
      const stain = warped(u, v, { period: 2, octaves: 4, seed: 733, aspect: 0.6, strength: 0.1 })
      // A faint wash that runs the length of the leaf.
      const wash = fbm(u, v, { period: 1, octaves: 3, seed: 91, aspect: 0.2 })

      let colour = mix(CREAM, TAN, smoothstep(0.35, 0.72, mottle))
      colour = mix(colour, STAIN, smoothstep(0.6, 0.86, stain) * 0.55)
      colour = mix(colour, BRUISE, smoothstep(0.72, 0.95, wash) * 0.28)

      // Age spots — but *clustered*, because evenly scattered dots read as a
      // dot screen rather than as damage. A low-frequency field decides where
      // damage is possible; a per-pixel hash decides whether it happened.
      const vulnerable = fbm(u, v, { period: 3, octaves: 3, seed: 5150 })
      if (vulnerable > 0.42 && hash2(x, y, 4021) > 0.9975) {
        colour = mix(colour, BRUISE, 0.55 + (vulnerable - 0.42))
      }

      // Mid-frequency ribs, the lengthwise structure every ola leaf has. The
      // shader adds the fine fibre; this is the part you can see from a metre.
      const rib = Math.sin(v * Math.PI * 34 + fbm(u, v, { period: 2, octaves: 2, seed: 61 }) * 5)
      colour = mix(colour, [188, 158, 108], Math.max(0, rib) * 0.06)

      const i = (y * size + x) * 3
      out[i] = Math.round(colour[0])
      out[i + 1] = Math.round(colour[1])
      out[i + 2] = Math.round(colour[2])
    }
  }

  return out
}

/**
 * A height field is the honest way to get a normal map: sample the surface,
 * then differentiate it. Doing it this way means the normal map and the albedo
 * are guaranteed to describe the same object.
 */
function heightToNormal(height, size, strength) {
  const out = new Uint8Array(size * size * 3)
  const at = (x, y) => height[wrap(y, size) * size + wrap(x, size)]

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      // Normalise (-dx, -dy, 1) and pack into 0..1.
      const length = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 3
      out[i] = Math.round(((-dx / length) * 0.5 + 0.5) * 255)
      out[i + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255)
      out[i + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255)
    }
  }

  return out
}

function grayscaleMap(size, sample) {
  const out = new Uint8Array(size * size * 3)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = Math.round(clamp01(sample(x / size, y / size, x, y)) * 255)
      const i = (y * size + x) * 3
      out[i] = value
      out[i + 1] = value
      out[i + 2] = value
    }
  }
  return out
}

/** The leaf's low-frequency warp: how it dried, and where it creased. */
function olaHeight(size) {
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size
      const v = y / size
      // Broad undulation of a leaf that dried under a weight.
      const undulation =
        warped(u, v, { period: 2, octaves: 4, seed: 21, aspect: 0.5, strength: 0.09 }) - 0.5
      // Veins running the length of the leaf: fast across v, slow along u.
      const veins = ridged(u, v, { period: 6, octaves: 4, seed: 57, aspect: 0.16 }) - 0.5
      // A gentle ripple at the leaf's edges, where it lifted from the board.
      const edge =
        Math.pow(Math.abs(v - 0.5) * 2, 3) *
        (fbm(u, v, { period: 3, octaves: 2, seed: 8 }) - 0.5)
      height[y * size + x] = undulation * 0.5 + veins * 0.45 + edge * 0.6
    }
  }
  return height
}

/** Poured wax: soft lumps, a few ripple rings where it spread. */
function waxHeight(size) {
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size
      const v = y / size
      const lumps = warped(u, v, { period: 3, octaves: 5, seed: 313, strength: 0.14 }) - 0.5
      // Concentric spread rings, centred off-centre so it reads as poured.
      const dx = u - 0.42
      const dy = v - 0.55
      const rings = Math.sin(
        Math.hypot(dx, dy) * 46 + fbm(u, v, { period: 2, octaves: 2, seed: 5 }) * 7,
      )
      height[y * size + x] = lumps * 0.8 + rings * 0.06
    }
  }
  return height
}

/**
 * The room, as a small equirectangular image.
 *
 * Used as `scene.environment`: it is the difference between "a wax disc lit by
 * a lamp" and "a wax disc with a lamp-shaped highlight in exactly the right
 * place when you tilt your head". A few hundred bytes buy real specular life.
 */
function lampEnvironment(width, height) {
  const out = new Uint8Array(width * height * 3)
  const CEILING = [10, 8, 6]
  const WALL = [64, 44, 26]
  const FLOOR = [46, 32, 18]
  const LAMP = [255, 208, 138]

  // The lamp hangs high and to one side; the camera looks at the table.
  const lampAzimuth = 0.72 * Math.PI * 2
  const lampElevation = 0.78 * Math.PI

  for (let y = 0; y < height; y += 1) {
    // v = 0 at the zenith, 1 at the nadir (standard equirect orientation).
    const v = (y + 0.5) / height
    const elevation = (1 - v) * Math.PI
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width
      const azimuth = u * Math.PI * 2

      let colour = mix(CEILING, WALL, smoothstep(0.0, 0.42, 1 - v))
      colour = mix(colour, FLOOR, smoothstep(0.55, 1.0, 1 - v))

      // The lamp: a bright disc with a soft falloff, plus its wall bounce.
      const dAz = Math.abs(((azimuth - lampAzimuth + Math.PI) % (Math.PI * 2)) - Math.PI)
      const dEl = Math.abs(elevation - lampElevation)
      const distance = Math.hypot(dAz * 0.7, dEl)
      colour = mix(colour, LAMP, smoothstep(0.55, 0.0, distance))
      colour = mix(colour, [150, 96, 44], smoothstep(1.5, 0.5, distance) * 0.5)

      const i = (y * width + x) * 3
      out[i] = Math.round(clamp01(colour[0] / 255) * 255)
      out[i + 1] = Math.round(clamp01(colour[1] / 255) * 255)
      out[i + 2] = Math.round(clamp01(colour[2] / 255) * 255)
    }
  }

  return out
}

/* ---------------------------------------------------------------------------
 * Write
 * ------------------------------------------------------------------------ */

/** name → { size, channels, pixels, note } */
function buildAll() {
  const OLA = 1024
  const WAX = 512
  const TABLE = 512

  const olaHeightField = olaHeight(OLA)
  const waxHeightField = waxHeight(WAX)

  return [
    {
      name: 'ola-albedo.png',
      size: OLA,
      pixels: olaAlbedo(OLA),
      note: 'palm leaf — mottling, staining, age specks (low frequency; fibre is in the shader)',
    },
    {
      name: 'ola-normal.png',
      size: OLA,
      pixels: heightToNormal(olaHeightField, OLA, 6),
      note: 'palm leaf — broad warp and lengthwise veins',
    },
    {
      name: 'ola-rough.png',
      size: OLA,
      pixels: grayscaleMap(OLA, (u, v) => {
        const worn = fbm(u, v, { period: 4, octaves: 4, seed: 401, aspect: 0.4 })
        const polish = fbm(u, v, { period: 2, octaves: 3, seed: 77 })
        // Where a thumb has handled the leaf for a century, it is smoother.
        return 0.66 + (worn - 0.5) * 0.22 - smoothstep(0.55, 0.9, polish) * 0.16
      }),
      note: 'palm leaf — roughness, including the polished band where it is held',
    },
    {
      name: 'wax-albedo.png',
      size: WAX,
      pixels: (() => {
        const size = WAX
        const out = new Uint8Array(size * size * 3)
        const LAC = [148, 36, 27]
        const DEEP = [104, 22, 18]
        const SHEEN = [178, 62, 44]
        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const u = x / size
            const v = y / size
            const pour = warped(u, v, { period: 3, octaves: 5, seed: 611, strength: 0.11 })
            const sheen = fbm(u, v, { period: 5, octaves: 3, seed: 991 })
            let colour = mix(DEEP, LAC, smoothstep(0.3, 0.7, pour))
            colour = mix(colour, SHEEN, smoothstep(0.62, 0.9, sheen) * 0.5)
            const i = (y * size + x) * 3
            out[i] = Math.round(colour[0])
            out[i + 1] = Math.round(colour[1])
            out[i + 2] = Math.round(colour[2])
          }
        }
        return out
      })(),
      note: 'lac wax — deep red mottling',
    },
    {
      name: 'wax-normal.png',
      size: WAX,
      pixels: heightToNormal(waxHeightField, WAX, 3.5),
      note: 'lac wax — poured lumps and spread rings',
    },
    {
      name: 'wax-rough.png',
      size: WAX,
      pixels: grayscaleMap(WAX, (u, v) => {
        const n = fbm(u, v, { period: 4, octaves: 4, seed: 1234 })
        // Wax is glossy; the variation is small but it is what makes it read
        // as a soft solid rather than painted plastic.
        return 0.3 + (n - 0.5) * 0.18
      }),
      note: 'lac wax — gloss variation',
    },
    {
      name: 'table-normal.png',
      size: TABLE,
      pixels: (() => {
        const height = new Float32Array(TABLE * TABLE)
        for (let y = 0; y < TABLE; y += 1) {
          for (let x = 0; x < TABLE; x += 1) {
            const u = x / TABLE
            const v = y / TABLE
            // `tile: true` — the table is the one surface that repeats across
            // the whole screen, so its lattice has to wrap exactly.
            height[y * TABLE + x] =
              (fbm(u, v, { period: 8, octaves: 5, seed: 303, tile: true }) - 0.5) * 0.6 +
              (fbm(u, v, { period: 24, octaves: 3, seed: 707, tile: true }) - 0.5) * 0.25
          }
        }
        return heightToNormal(height, TABLE, 2.2)
      })(),
      note: 'the table — grain and wear under the leaf',
    },
    {
      name: 'lamp-env.png',
      width: 512,
      height: 256,
      channels: 3,
      pixels: lampEnvironment(512, 256),
      note: 'the room as an environment map — one lamp, warm walls, dark ceiling',
    },
  ]
}

async function main() {
  const assets = buildAll()
  let total = 0
  let failed = 0

  if (!check) await mkdir(outDir, { recursive: true })

  for (const asset of assets) {
    const size = asset.size ?? asset.width
    const height = asset.height ?? asset.size
    const buffer = encodePng(size, height, asset.pixels, asset.channels ?? 3)
    const file = join(outDir, asset.name)
    total += buffer.length

    if (check) {
      if (!existsSync(file)) {
        console.error(`  ✗ ${asset.name} is missing — run \`npm run build-materials\``)
        failed += 1
        continue
      }
      const existing = await readFile(file)
      if (createHash('sha256').update(existing).digest('hex') !== createHash('sha256').update(buffer).digest('hex')) {
        console.error(`  ✗ ${asset.name} has drifted from the generator — regenerate it`)
        failed += 1
        continue
      }
      console.log(`  ✓ ${asset.name} (${(existing.length / 1024).toFixed(0)} KB)`)
    } else {
      await writeFile(file, buffer)
      console.log(`  ✓ ${asset.name} · ${size}×${height} · ${(buffer.length / 1024).toFixed(0)} KB — ${asset.note}`)
    }
  }

  if (failed > 0) process.exit(1)
  console.log(
    check
      ? `\n✓ material maps verified (${(total / 1024 / 1024).toFixed(2)} MB)`
      : `\n✓ baked ${assets.length} material maps into assets/materials (${(total / 1024 / 1024).toFixed(2)} MB)`,
  )
}

await main()
