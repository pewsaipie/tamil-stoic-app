/**
 * The ola leaf, as geometry rather than a picture.
 *
 * A palm-leaf manuscript is a strip that has been rolled. Unrolling it is not
 * a scale or a fade — it is the strip *straightening*, and to look real the
 * geometry has to actually do that:
 *
 *   - **The mid-surface** is parametrised so the roll is exact. A point at arc
 *     length `t·LENGTH` wraps by `θ = φ·t`, and the radius follows as
 *     `R = LENGTH / φ`. As `φ → 0` the curvature vanishes and the strip is
 *     flat, so one parameter — the total swept angle `φ` — moves the leaf
 *     continuously from a tight roll to a flat sheet. There is exactly one
 *     special case, the `φ → 0` limit, and it is written out explicitly.
 *
 *   - **It has thickness.** Front and back surfaces are built from the same
 *     mid-surface, offset along its normal, and stitched around the rim. A
 *     single double-sided plane has no edge; a leaf seen nearly edge-on is
 *     *all* edge, and that is most of the interaction.
 *
 *   - **It is not a rectangle.** The width tapers, the ends round off, the
 *     cross-section domes, and the free edges flutter while the roll springs
 *     open and settle once it has. Palm leaf is stiff, so the flutter is small
 *     and damped, never a wave.
 *
 * `setUnroll()` is the only thing the animation loop calls. Everything
 * expensive — the topology, the index buffers, the border stitch — is built
 * once, and the per-frame work is arithmetic on typed arrays with no
 * allocation.
 */
import * as THREE from 'three'

/**
 * Total swept angle of a fully rolled leaf — five full turns.
 *
 * Not an arbitrary number. The strip is 34 cm long and the layers stack at one
 * sheet-thickness each, so the arc length fixes the geometry completely:
 *
 *     L = ∫ r dθ  with  r = r₀ + (thickness/2π)·θ   over θ ∈ [0, φ]
 *       → r₀ = L/φ − k·φ/2,  k = thickness/2π
 *
 * At five turns that gives an inner radius of 7.3 mm and an outer radius of
 * 14.3 mm — a roll **2.9 cm across**, which is what a rolled ola bundle
 * actually measures. Two turns would have produced a 9 cm curl and looked like
 * a poster somebody had half-heartedly started to roll up.
 */
const ROLL_ANGLE = Math.PI * 10

export interface LeafOptions {
  /** Along the strip, in metres. A real ola leaf is roughly 0.34 m. */
  length?: number
  width?: number
  /** A split and smoothed palm leaf is about a millimetre thick. */
  thickness?: number
  /** Segments along the length. The roll needs this many to stay smooth. */
  segmentsAlong?: number
  /** Segments across the width. */
  segmentsAcross?: number
}

/**
 * Deterministic value noise, in the geometry rather than a texture.
 *
 * The leaf's waviness is a *shape*, so it belongs in the vertex positions: a
 * normal map can suggest a ripple but it cannot make the silhouette undulate,
 * and the silhouette is what sells a rounded three-dimensional object.
 */
function hash(n: number, seed: number): number {
  let v = Math.imul(n ^ seed, 0x27d4eb2d)
  v = Math.imul(v ^ (v >>> 15), 0x85ebca6b)
  v ^= v >>> 13
  return (v >>> 0) / 4294967296
}

function noise1(x: number, seed: number): number {
  const i = Math.floor(x)
  const f = x - i
  const smooth = f * f * (3 - 2 * f)
  return hash(i, seed) * (1 - smooth) + hash(i + 1, seed) * smooth
}

function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash(ix + iy * 57, seed)
  const b = hash(ix + 1 + iy * 57, seed)
  const c = hash(ix + (iy + 1) * 57, seed)
  const d = hash(ix + 1 + (iy + 1) * 57, seed)
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy
}

/**
 * Width profile: a slight taper, and corners rounded rather than cut square.
 *
 * Two failed attempts are recorded here, because the reason is not obvious.
 *
 * The first pinched the strip to a *point* at each end. That makes dP/dj zero,
 * so the normal — the cross product of two nearly parallel vectors — became
 * numerical noise, and in a rolled leaf the ends are exactly where the surface
 * turns over.
 *
 * The second made the tip blunt but rounded it over only ~10 mm. That is worse
 * than it sounds: over one row step the half-width then changes by 19 mm while
 * the strip advances 4 mm *along*, so the "along" tangent is dominated by its
 * lateral component. Both tangents end up nearly parallel to x, and the surface
 * normal comes out pointing sideways instead of up. Nineteen of 207 sampled
 * normals were inverted — and they were inverted by a *full* 180°, which is the
 * kind of thing that shows up as one black facet on an otherwise perfect leaf.
 *
 * What works is what a real ola leaf actually is: a rectangle with a small
 * radius at the corners. The width stays near full, the rounding is gentle
 * enough that the lateral and along changes stay comparable, and the normals
 * are well-conditioned everywhere.
 */
const TIP_WIDTH = 0.86
/** Rounded over roughly 7 mm at each end. */
const TIP_ZONE = 0.022

function widthProfile(t: number): number {
  const taper = 1 - 0.05 * Math.pow(2 * t - 1, 2)
  const corner = Math.min(1, Math.min(t, 1 - t) / TIP_ZONE)
  return taper * (TIP_WIDTH + (1 - TIP_WIDTH) * Math.sqrt(Math.max(0, corner)))
}

/**
 * Cross-section doming across the width — a leaf is never a flat ribbon.
 *
 * These amplitudes are *small*, and deliberately so. An earlier version domed
 * the strip by 7.5 mm across its width, which looked harmless in isolation and
 * was in fact larger than the roll's inner radius (7.3 mm). The result was a
 * section whose bulge exceeded the whole coil: the strip intersected itself at
 * the tightest part of the roll, and the surface normals there pointed at the
 * axis instead of away from it.
 *
 * A displacement in this file has to be judged against the roll, not against
 * the leaf. Roughly a millimetre is what a 75 mm-wide palm leaf actually bows.
 */
function domeProfile(s: number, rolled: boolean): number {
  return (1 - s * s) * (0.00085 + (rolled ? 0.00055 : 0))
}

/** The rim lifts a little where a dried leaf has curled away from its board. */
function edgeLift(s: number): number {
  return Math.pow(Math.abs(s), 5) * 0.0013
}

/**
 * Where the roll's axis is, and how high its crest sits — measured from the
 * generated geometry rather than derived from the constants, so the seal
 * cannot end up floating above the leaf if the roll is ever retuned.
 */
export interface RollMetrics {
  /** Height of the roll's axis above the table, in metres. */
  axisY: number
  /** The highest point of the sealed roll, in table coordinates. */
  crest: { y: number; z: number }
  /** Outer radius of the coil. */
  outerRadius: number
}

/** Where the strip is split between the coil and the table, at one moment. */
interface CoilState {
  /** Arc length still wound, in metres, measured from the strip's inner end. */
  woundArc: number
  /** Total angle swept by the wound spiral, in radians. */
  angle: number
  /** Radius of the outermost turn. */
  outerRadius: number
  /** Height of the coil's axis above the table. */
  axisY: number
}

export interface LeafSurface {
  geometry: THREE.BufferGeometry
  /** 0 = fully rolled, 1 = flat. Values slightly above 1 spring past flat. */
  setUnroll(value: number): void
  /** Only meaningful while rolled; the seal is placed from this. */
  metrics: RollMetrics
  dispose(): void
}

export function createLeaf(options: LeafOptions = {}): LeafSurface {
  const length = options.length ?? 0.34
  const width = options.width ?? 0.075
  const thickness = options.thickness ?? 0.0011
  const along = options.segmentsAlong ?? 84
  const across = options.segmentsAcross ?? 16
  /** Radial growth per full turn — one sheet thickness, and a little air. */
  const layerPitch = thickness * 1.28

  /**
   * The coil's radius at its innermost turn.
   *
   * Solved from the fully-wound case, so that the whole strip fits the spiral
   * exactly: `∫r dθ` over the full sweep must come to the strip's length, which
   * is the naive `L/φ` less the length the outward growth contributes.
   */
  const innerRadius = (length - (layerPitch * ROLL_ANGLE * ROLL_ANGLE) / (Math.PI * 4)) / ROLL_ANGLE
  /** Radial growth per radian of sweep. */
  const growth = layerPitch / (Math.PI * 2)

  /**
   * The angle a length of strip occupies in the coil.
   *
   * The spiral's arc length from its inner end out to angle Δ is
   * `innerRadius·Δ + growth·Δ²/2`; this inverts that. Written with the
   * conjugate on the top, because the obvious `(−r + √(r² + 2cM)) / c` loses
   * every significant figure to cancellation as the last millimetre of strip
   * unwinds — which is precisely when the leaf is most closely watched.
   */
  const angleForArc = (arc: number): number => {
    if (arc <= 0) return 0
    return (2 * arc) / (innerRadius + Math.sqrt(innerRadius * innerRadius + 2 * growth * arc))
  }

  /**
   * ## How the leaf unrolls
   *
   * The first version of this file wrapped the *entire* strip into a spiral at
   * every moment of the unroll, with the radius chosen to keep the arc length
   * right: `r = L/φ`. The endpoints were correct — a 28 mm coil, a 341 mm strip
   * — and everything between them was wrong, in a way that took a projection to
   * see: as the sweep angle φ fell, `L/φ` grew, so a *half-unrolled* leaf was a
   * single enormous loop 110 mm across with its whole length still wrapped into
   * it. It never unrolled. It breathed outwards and then, in the last tenth of
   * the animation, collapsed flat.
   *
   * A real coil does the opposite: **its diameter barely changes**. What changes
   * is how much strip is left in it. The turns come off the outside, the coil
   * gets smaller in radius only as its layers leave, and the strip that has come
   * off lies on the table getting longer — which is the entire visual point of
   * the interaction.
   *
   * So the strip is in two pieces, and the split is the thing the animation
   * moves:
   *
   * **Wound** — material still in the coil, arc length `woundArc` measured from
   * the *inner* end. Its radius follows the spiral, `r = innerRadius + growth·Δ`.
   *
   * **Laid out** — the rest, running straight along −z away from the coil. It
   * leaves the coil at the point where the spiral's tangent points that way,
   * which is the coil's lowest point — so the peel point is also the contact
   * patch with the table, and the strip meets the wood exactly where a strip
   * would.
   *
   * Two consequences fall out for free. The coil's axis sits at `thickness/2 +
   * outerRadius`, so the coil rests on the table *by construction* — the whole
   * `rollLift` scan that used to sit here, sampling for the coil's lowest point
   * and adding half a sheet thickness, is gone. And the coil's *angular* speed
   * rises as it empties, because the same strip length leaves a smaller circle
   * each second: five turns at the start, and the last turn comes off fast. That
   * is the real behaviour of unrolling something, and it is the detail that
   * makes the leaf look like it is obeying something.
   */
  const coilAt = (unroll: number): CoilState => {
    const woundFraction = Math.max(0, Math.min(1, 1 - unroll))
    const woundArc = length * woundFraction
    const angle = angleForArc(woundArc)
    const outerRadius = innerRadius + growth * angle
    return {
      woundArc,
      angle,
      outerRadius,
      // Radius of the axis above the table, so the coil's underside just
      // touches: it is the leaf's underside that rests on the wood.
      axisY: thickness / 2 + outerRadius,
    }
  }

  const rows = along + 1
  const cols = across + 1
  const perSurface = rows * cols

  /**
   * Two surfaces and one shell.
   *
   * Vertex index space is `[0, perSurface)` for the writing face and
   * `[perSurface, 2·perSurface)` for the underside, so a face is identified by
   * its index alone. `aFace` carries that to the shader as ±1 — the writing
   * face is the one that has been handled, takes ink, and comes *up* when the
   * leaf is unrolled, because it was the inside of the coil.
   */
  const positions = new Float32Array(perSurface * 6)
  const normals = new Float32Array(perSurface * 6)
  const uvs = new Float32Array(perSurface * 4)
  const faces = new Float32Array(perSurface * 2)

  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const index = i * cols + j
      // Across the leaf, then along it — the shader states the same convention.
      const u = j / across
      const v = i / along
      uvs[index * 2] = u
      uvs[index * 2 + 1] = v
      uvs[(perSurface + index) * 2] = u
      uvs[(perSurface + index) * 2 + 1] = v
      faces[index] = 1
      faces[perSurface + index] = -1
    }
  }

  const indices: number[] = []
  // Writing face, wound counter-clockwise seen from its own normal.
  for (let i = 0; i < along; i += 1) {
    for (let j = 0; j < across; j += 1) {
      const a = i * cols + j
      const b = a + 1
      const c = (i + 1) * cols + j
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
  // Underside, wound the other way so its faces point −n. Without this the
  // shell is inside-out: `MeshStandardMaterial` is single-sided by default, and
  // half the leaf would simply not be drawn.
  for (let i = 0; i < along; i += 1) {
    for (let j = 0; j < across; j += 1) {
      const a = perSurface + i * cols + j
      const b = a + 1
      const c = perSurface + (i + 1) * cols + j
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setAttribute('aFace', new THREE.BufferAttribute(faces, 1))
  geometry.setIndex(indices)

  // Scratch buffers reused by every update — the hot path allocates nothing.
  const mid = new Float32Array(perSurface * 3)
  const midNormals = new Float32Array(perSurface * 3)

  /**
   * Sample the mid-surface at grid position `(i, j)`.
   *
   * `coil` is the split between wound and laid-out material, computed once per
   * `setUnroll`; `flutter` is how much life the free edges have left in them
   * (1 while springing open, 0 once settled).
   */
  const sample = (i: number, j: number, coil: CoilState, flutter: number): void => {
    const t = i / along
    const s = (j / across) * 2 - 1
    const arc = t * length

    let y: number
    let z: number
    if (arc < coil.woundArc) {
      // Still in the coil. Its own angle from the inner end, and its radius at
      // that angle — a spiral, not a circle: with a constant radius the layers
      // would sit exactly on one another and z-fight.
      const delta = angleForArc(arc)
      const radius = innerRadius + growth * delta
      // Measured from the peel point, so `delta == angle` lands on the coil's
      // lowest point with the strip's tangent running along −z — which is where
      // the laid-out part picks it up, without a kink.
      const theta = delta - coil.angle
      y = coil.axisY - radius * Math.cos(theta)
      z = -radius * Math.sin(theta)
    } else {
      // Laid out on the table, running straight away from the coil. In the
      // flat limit `arc < woundArc` is never true and this is `z = -arc`, which
      // is exactly what a flat strip is.
      y = thickness / 2
      z = -(arc - coil.woundArc)
    }

    const halfWidth = (width / 2) * widthProfile(t)
    // A hair of asymmetry: no leaf was ever split perfectly straight.
    const skew = (noise1(t * 3.1, 17) - 0.5) * 0.004 * (1 - t)
    const x = s * halfWidth + skew

    // The coil is held by its own layers, so the cross-section bow only shows
    // where the strip is free of them; inside the coil it is suppressed, which
    // also keeps it from distorting the coil's circular silhouette.
    const inCoil = arc < coil.woundArc
    y += domeProfile(s, !inCoil) * (inCoil ? 0.25 : 1)
    y += edgeLift(s)
    // Damped ripple along the free edges: strongest mid-unroll, gone at rest.
    // The flutter is transient — it only exists while the roll is springing
    // open — so it can be larger than the resting curvature without colliding
    // with the coil. It is also **strictly upward**: the strip is lying on a
    // table, so a wave in it can lift off the surface but cannot pass through
    // it. A signed term here dipped the leaf 1.2 mm below the table at
    // mid-unroll, which is exactly the sort of thing that reads as "the
    // physics is fake" without a reader being able to say why.
    y += noise2(t * 7, s * 2, 5) * 0.0032 * flutter * (1 - Math.abs(s) * 0.6)
    z += (noise2(t * 4.5, s * 3, 23) - 0.5) * 0.0018 * flutter

    const index = (i * cols + j) * 3
    mid[index] = x
    mid[index + 1] = y
    mid[index + 2] = z
  }

  const setUnroll = (value: number): void => {
    const unroll = Math.max(0, Math.min(1.35, value))
    // The swept angle falls to zero as the strip flattens. Allowing a little
    // past 1 lets the leaf spring slightly the other way and settle, which is
    // what a stiff dried leaf actually does when you let it go.
    const coil = coilAt(unroll)
    // A flick of life as the strip springs free: nothing while it is wound,
    // strongest halfway out, and gone once it is flat. Written as one sine
    // rather than a sine plus a separate decaying tail, because the previous
    // version stepped from `sin(π·1) = 0` to `0.35` at exactly flat — a
    // millimetre of leaf jumping on the last frame, which is the frame where
    // the scene hands over to the DOM and the reader is looking hardest.
    const flutter = Math.sin(Math.PI * Math.min(1, Math.max(0, unroll)))

    for (let i = 0; i < rows; i += 1) {
      for (let j = 0; j < cols; j += 1) sample(i, j, coil, flutter)
    }

    // Normals by central differences on the mid-surface — cheaper and smoother
    // than rebuilding them from triangles, and it never leaves the faceted
    // seams that `computeVertexNormals` produces on a stitched shell.
    for (let i = 0; i < rows; i += 1) {
      for (let j = 0; j < cols; j += 1) {
        const i0 = i > 0 ? i - 1 : 0
        const i1 = i < rows - 1 ? i + 1 : rows - 1
        const j0 = j > 0 ? j - 1 : 0
        const j1 = j < cols - 1 ? j + 1 : cols - 1

        const a = (i1 * cols + j) * 3
        const b = (i0 * cols + j) * 3
        const c = (i * cols + j1) * 3
        const d = (i * cols + j0) * 3

        // dP/di and dP/dj, then their cross product.
        const dx = (mid[a] as number) - (mid[b] as number)
        const dy = (mid[a + 1] as number) - (mid[b + 1] as number)
        const dz = (mid[a + 2] as number) - (mid[b + 2] as number)
        const ex = (mid[c] as number) - (mid[d] as number)
        const ey = (mid[c + 1] as number) - (mid[d + 1] as number)
        const ez = (mid[c + 2] as number) - (mid[d + 2] as number)

        // `cross(dP/di, dP/dj)` gives −n on this parametrisation (checked at
        // roll = 0, where it must come out as −y), so the normal is its
        // negation. The sign is then consistent *everywhere* on the strip —
        // which is the whole reason not to "just point it up": on a rolled
        // leaf the writing face is the concave one, and a normal forced to +y
        // would flip sides halfway round the coil and light the roll wrongly.
        let nx = -(dy * ez - dz * ey)
        let ny = -(dz * ex - dx * ez)
        let nz = -(dx * ey - dy * ex)
        const len = Math.hypot(nx, ny, nz)
        if (len < 1e-12) {
          // Degenerate sample. Should not happen with a blunt tip, but a NaN
          // here would silently poison every downstream face, so it is worth
          // one branch to make it impossible.
          nx = 0
          ny = 1
          nz = 0
        } else {
          nx /= len
          ny /= len
          nz /= len
        }

        const index = (i * cols + j) * 3
        midNormals[index] = nx
        midNormals[index + 1] = ny
        midNormals[index + 2] = nz
      }
    }

    // Push the mid-surface out to the two faces along its own normal.
    const half = thickness / 2
    for (let i = 0; i < rows; i += 1) {
      for (let j = 0; j < cols; j += 1) {
        const m = (i * cols + j) * 3
        const px = mid[m] as number
        const py = mid[m + 1] as number
        const pz = mid[m + 2] as number
        const nx = midNormals[m] as number
        const ny = midNormals[m + 1] as number
        const nz = midNormals[m + 2] as number

        const index = i * cols + j
        const f = index * 3
        positions[f] = px + nx * half
        positions[f + 1] = py + ny * half
        positions[f + 2] = pz + nz * half
        normals[f] = nx
        normals[f + 1] = ny
        normals[f + 2] = nz

        const bb = (perSurface + index) * 3
        positions[bb] = px - nx * half
        positions[bb + 1] = py - ny * half
        positions[bb + 2] = pz - nz * half
        normals[bb] = -nx
        normals[bb + 1] = -ny
        normals[bb + 2] = -nz
      }
    }

    ;(geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true
  }

  setUnroll(0)

  /**
   * Measure the rolled leaf.
   *
   * Everything the caller needs in order to *place* something against the coil
   * — the seal, the cord — is either derived from the coil law or measured from
   * the real vertices, never re-derived by hand at the call site. The crest in
   * particular is measured rather than computed, because it is the one number a
   * reader will notice being wrong: the wax seal sits on it.
   */
  const metrics: RollMetrics = (() => {
    let crestY = -Infinity
    let crestZ = 0
    for (let i = 0; i < rows; i += 1) {
      for (let j = 0; j < cols; j += 1) {
        const index = (i * cols + j) * 3
        const y = positions[index + 1] as number
        if (y > crestY) {
          crestY = y
          crestZ = positions[index + 2] as number
        }
      }
    }
    // The sealed state, which is what `setUnroll(0)` just wrote.
    const coil = coilAt(0)
    return { axisY: coil.axisY, crest: { y: crestY, z: crestZ }, outerRadius: coil.outerRadius }
  })()

  return {
    geometry,
    setUnroll,
    metrics,
    dispose: () => geometry.dispose(),
  }
}
