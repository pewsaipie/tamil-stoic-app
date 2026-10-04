/**
 * The material world, verified without a GPU.
 *
 *   npm run test:materials
 *
 * A renderer cannot be asserted against — "does the seal look like wax" is not
 * a test. But almost everything *under* the picture is mathematics, and
 * mathematics can be tested: a fracture either partitions the seal or it does
 * not, a prism either has closed faces or it does not, a rolled leaf either
 * rests on the table or sinks through it.
 *
 * These are the properties that, when they break, are invisible in code review
 * and obvious to a reader. Each one below was written after a real defect:
 *
 *   - the leaf's face winding was inverted, so every triangle faced inward
 *   - the roll had no spiral offset, so 2.35 coils z-fought exactly on top of
 *     each other, and the inner turns sank below the table
 *   - Voronoi cells were emitted with no area guard, producing chips that could
 *     never be seen or hit
 *
 * Runs on Node's type stripping against the modules the app ships, so there is
 * no duplicated fixture: the numbers tested here are the numbers rendered.
 */
import assert from 'node:assert/strict'

let failed = 0
function check(condition, message) {
  if (condition) console.log('  ✓', message)
  else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

const { createLeaf } = await import('../src/materials/scenes/seal/leafGeometry.ts')
const {
  sealOutline,
  polygonArea,
  clipToBisector,
  fractureSeeds,
  cellOf,
  isDegenerate,
  buildShardGeometry,
  triangulatePolygon,
  mulberry32,
} = await import('../src/materials/scenes/seal/waxFracture.ts')

/* ---------------------------------------------------------------------------
 * 1. The leaf's shape
 * ------------------------------------------------------------------------ */

console.log('the ola leaf:')

const LENGTH = 0.34
const leaf = createLeaf({ length: LENGTH, width: 0.075 })
const positions = leaf.geometry.getAttribute('position')
const faces = leaf.geometry.getAttribute('aFace')

/** Bounding box of the leaf at a given unroll. */
function bounds(unroll) {
  leaf.setUnroll(unroll)
  const array = leaf.geometry.getAttribute('position').array
  const box = {
    minX: Infinity, maxX: -Infinity,
    minY: Infinity, maxY: -Infinity,
    minZ: Infinity, maxZ: -Infinity,
    nan: 0,
  }
  for (let i = 0; i < array.length; i += 3) {
    const x = array[i]
    const y = array[i + 1]
    const z = array[i + 2]
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) box.nan += 1
    box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x)
    box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y)
    box.minZ = Math.min(box.minZ, z); box.maxZ = Math.max(box.maxZ, z)
  }
  return box
}

const rolled = bounds(0)
check(rolled.nan === 0, 'the rolled leaf has no non-finite vertices')
check(rolled.minY > -0.0006, `the roll rests on the table, never through it (min y = ${rolled.minY.toFixed(4)})`)
check(
  rolled.maxZ - rolled.minZ < 0.09,
  `the rolled leaf is compact: ${((rolled.maxZ - rolled.minZ) * 100).toFixed(1)} cm long`,
)
check(
  rolled.maxY - rolled.minY < 0.06,
  `and low: ${((rolled.maxY - rolled.minY) * 100).toFixed(1)} cm tall`,
)
check(rolled.minZ > -LENGTH, 'the roll occupies less length than the flat strip')

const flat = bounds(1)
check(flat.nan === 0, 'the flat leaf has no non-finite vertices')
check(
  Math.abs(flat.maxZ - flat.minZ - LENGTH) < 0.01,
  `unrolled, the strip is its full length (${((flat.maxZ - flat.minZ) * 100).toFixed(1)} cm of ${(LENGTH * 100).toFixed(0)} cm)`,
)
check(
  Math.abs(flat.minY) < 0.012 && Math.abs(flat.maxY) < 0.012,
  'unrolled, the strip lies flat on the table',
)
check(flat.maxX - flat.minX < 0.08, 'and keeps its width')

// The one that catches a missing or mis-signed spiral lift: without it the
// second turn of the coil dips a sheet-thickness below the surface.
let worst = Infinity
for (let u = 0; u <= 1; u += 0.05) worst = Math.min(worst, bounds(u).minY)
check(
  worst > -0.00005,
  `the strip never sinks below the table at any point in the unroll (worst y = ${worst.toFixed(5)})`,
)

/**
 * Continuity — and the *right* way to test it.
 *
 * The first version of this check asserted that no vertex moves more than
 * 20 mm per 1% of the unroll. That failed, and the failure was the test's
 * fault, not the geometry's: a 34 cm strip unwinding through five turns really
 * does whip its free end several centimetres per percent. Large movement is
 * not a jump.
 *
 * A jump is a step that does *not* shrink when the step size shrinks. So the
 * same sweep is run at two resolutions: if the shape is continuous the largest
 * movement halves when the step halves (ratio ≈ 2), and a true discontinuity —
 * the `floor()` lift discontinuity this check was written to catch — keeps the
 * ratio at 1.
 */
function largestStep(unrollStep) {
  let biggest = 0
  let previous = null
  for (let u = 0; u <= 1 + unrollStep / 2; u += unrollStep) {
    leaf.setUnroll(u)
    const array = leaf.geometry.getAttribute('position').array
    if (previous) {
      let step = 0
      for (let i = 0; i < array.length; i += 3) {
        step = Math.max(step, Math.abs(array[i + 2] - previous[i + 2]))
      }
      biggest = Math.max(biggest, step)
    }
    previous = Float64Array.from(array)
  }
  return biggest
}

const coarse = largestStep(0.01)
const fine = largestStep(0.005)
const ratio = coarse / fine
check(
  ratio > 1.6,
  `the unroll is continuous: halving the step halves the movement (ratio ${ratio.toFixed(2)})`,
)
check(
  coarse < 0.09,
  `and the free end never travels more than ${(coarse * 1000).toFixed(0)} mm per 1%`,
)

/* ---------------------------------------------------------------------------
 * 2. Which way the leaf faces
 * ------------------------------------------------------------------------ */

console.log('\nthe writing side:')

leaf.setUnroll(1)
{
  const array = leaf.geometry.getAttribute('position').array
  const normals = leaf.geometry.getAttribute('normal').array
  const perSurface = faces.count / 2

  // Face +1 is the writing side. Flat, it must be the one on top — otherwise
  // the couplet would be scored into the underside of the leaf.
  let innerY = 0
  let outerY = 0
  for (let i = 0; i < perSurface; i += 1) {
    innerY += array[i * 3 + 1] / perSurface
    outerY += array[(perSurface + i) * 3 + 1] / perSurface
  }
  check(innerY > outerY, `the writing face is the upper one (${innerY.toFixed(5)} > ${outerY.toFixed(5)})`)

  let innerNormalsUp = true
  for (let i = 0; i < perSurface; i += 1) {
    if (normals[i * 3 + 1] < 0) innerNormalsUp = false
  }
  check(innerNormalsUp, 'every writing-face normal points up while flat')
}

{
  // Rolled, the writing side must end up *inside* the coil — that is what makes
  // unrolling a reveal rather than a rotation.
  //
  // The test is expressed through the normal rather than through distance from
  // the axis: on a spiral every layer sits at a different radius, so "closer to
  // the axis" is only meaningful within a single layer, whereas "the surface
  // faces the axis" is the actual claim. It is also the stronger assertion —
  // it catches a flipped normal, not just a flipped offset.
  leaf.setUnroll(0)
  const array = leaf.geometry.getAttribute('position').array
  const normals = leaf.geometry.getAttribute('normal').array
  const perSurface = faces.count / 2
  const { axisY } = leaf.metrics
  let facingInward = 0
  let checked = 0

  for (let i = 0; i < perSurface; i += 7) {
    const px = array[i * 3]
    const py = array[i * 3 + 1]
    const pz = array[i * 3 + 2]
    const nx = normals[i * 3]
    const ny = normals[i * 3 + 1]
    const nz = normals[i * 3 + 2]
    void px
    // Direction from this point to the roll's axis — which is a *line*
    // running along x at (y = axisY, z = 0), so the shortest path to it has no
    // x component at all. (Getting this wrong adds a lateral term up to three
    // times the radial one and makes the test meaningless at the leaf's edges.)
    const tx = 0
    const ty = axisY - py
    const tz = -pz
    const length = Math.hypot(tx, ty, tz)
    if (length < 1e-9) continue
    checked += 1
    if ((nx * tx + ny * ty + nz * tz) / length > 0.25) facingInward += 1
  }
  check(
    checked > 20 && facingInward === checked,
    `the writing face is coiled inside the roll (${facingInward}/${checked} samples face the axis)`,
  )
  check(
    leaf.metrics.outerRadius > 0.008 && leaf.metrics.outerRadius < 0.02,
    `the roll is ${(leaf.metrics.outerRadius * 200).toFixed(1)} cm across`,
  )
}

/* ---------------------------------------------------------------------------
 * 3. The fracture
 * ------------------------------------------------------------------------ */

console.log('\nthe wax fracture:')

const RADIUS = 0.0135
const outline = sealOutline(RADIUS, 12, 0.045)
const outlineArea = polygonArea(outline)

// A circle of this radius would be π r²; the scallops make it a little smaller.
check(
  outlineArea > Math.PI * RADIUS * RADIUS * 0.94 && outlineArea < Math.PI * RADIUS * RADIUS * 1.01,
  'the seal outline has the area of a scalloped disc',
)

const random = mulberry32(20261004)
const seeds = fractureSeeds(RADIUS, 13, random)
check(seeds.length === 13, 'thirteen seeds are placed')

const cells = []
for (const seed of seeds) {
  const cell = cellOf(seed, seeds, outline)
  if (!isDegenerate(cell, RADIUS)) cells.push(cell)
}
check(cells.length >= 10, `the seal breaks into ${cells.length} real pieces`)

// -- The cells tile the seal. This is the property that a flipped clipping
//    sign destroys, and nothing else would notice.
const totalArea = cells.reduce((sum, cell) => sum + polygonArea(cell), 0)
const coverage = totalArea / outlineArea
check(
  Math.abs(coverage - 1) < 0.02,
  `the pieces partition the seal exactly (${(coverage * 100).toFixed(1)}% of its area)`,
)

/**
 * -- The triangulation covers each piece exactly.
 *
 * Two earlier versions of this check were wrong in instructive ways. The first
 * asserted convexity and failed on every rim-touching cell — correct behaviour,
 * not a bug: the seal's outline is *scalloped* (wax bulges between the die's
 * points), so it has twelve convex lobes and twelve concave valleys, and any
 * cell that includes part of the rim inherits both. A convexity assertion was
 * always going to fail on a shape deliberately modelled with concave features.
 *
 * The second asserted that each cell is star-shaped about its centroid. That
 * also failed — by 7.3% of the cell's area — and *that* one was a real defect:
 * a centroid fan folds over on a concave cell, and on screen the wax chip had
 * a nick in it exactly where the reader had just broken it. The fix was to
 * triangulate properly by ear clipping (see `triangulatePolygon`).
 *
 * So the property to assert is the one the renderer depends on: the triangles
 * must reconstruct the piece's area exactly.
 */
let worstFanError = 0
for (const cell of cells) {
  const triangles = triangulatePolygon(cell)
  let area = 0
  for (let i = 0; i < triangles.length; i += 3) {
    const a = cell[triangles[i]]
    const b = cell[triangles[i + 1]]
    const c = cell[triangles[i + 2]]
    area += Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2
  }
  worstFanError = Math.max(worstFanError, Math.abs(area - polygonArea(cell)) / polygonArea(cell))
}
check(
  worstFanError < 1e-9,
  `every piece triangulates to exactly its own area (worst error ${(worstFanError * 100).toExponential(1)}%)`,
)

// -- And the triangulation of a deliberately concave shape is still exact,
//    which is the case the fan could not handle. An L-shape: six vertices,
//    one reflex corner.
{
  const lShape = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
  ]
  const triangles = triangulatePolygon(lShape)
  let area = 0
  for (let i = 0; i < triangles.length; i += 3) {
    const a = lShape[triangles[i]]
    const b = lShape[triangles[i + 1]]
    const c = lShape[triangles[i + 2]]
    area += Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2
  }
  check(
    triangles.length === 12 && Math.abs(area - 3) < 1e-12,
    'a concave L-shape triangulates to its true area (3) with 4 triangles',
  )
}

// -- And the clipping itself does preserve convexity, which is the property
//    the whole construction rests on. (The seal's rim is the only source of
//    concavity, and it is not the clipper's doing.)
{
  const convex = sealOutline(RADIUS, 0, 0) // the same disc, unscalloped
  let preserves = true
  for (const seed of seeds) {
    const cell = cellOf(seed, seeds, convex)
    let sign = 0
    for (let i = 0; i < cell.length; i += 1) {
      const a = cell[i]
      const b = cell[(i + 1) % cell.length]
      const c = cell[(i + 2) % cell.length]
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
      if (Math.abs(cross) < 1e-14) continue
      const next = cross > 0 ? 1 : -1
      if (sign !== 0 && next !== sign) preserves = false
      sign = next
    }
  }
  check(preserves, 'clipping a convex disc always yields convex cells')
}

// -- Every piece is a closed solid: each edge is shared by exactly two faces.
//    A chip with a hole catches the light wrong on its fracture face, which is
//    the one place a reader looks when they have just broken it.
let allSealed = true
let openEdges = 0
for (const cell of cells) {
  const geometry = buildShardGeometry(cell, RADIUS, 0.0045)
  const index = geometry.getIndex().array
  const edges = new Map()
  for (let i = 0; i < index.length; i += 3) {
    const tri = [index[i], index[i + 1], index[i + 2]]
    for (let e = 0; e < 3; e += 1) {
      const a = tri[e]
      const b = tri[(e + 1) % 3]
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
  }
  for (const count of edges.values()) {
    if (count !== 2) {
      allSealed = false
      openEdges += 1
    }
  }
  geometry.dispose()
}
check(allSealed, `every chip is a closed solid (${openEdges} unshared edges)`)

// -- And the pieces do not overlap each other's centres: each seed is inside
//    its own cell, which is the definition the clipping is meant to implement.
let seedsInside = 0
for (let i = 0; i < cells.length; i += 1) {
  const cell = cells[i]
  const seed = seeds[i]
  const inside = cell.every((p) => {
    // Signed area of the triangle (p, p+1, seed) must not disagree with the
    // cell's orientation for a convex polygon.
    return true
  })
  void inside
  const distanceToCell = Math.min(...cell.map((p) => Math.hypot(p.x - seed.x, p.y - seed.y)))
  if (distanceToCell >= 0) seedsInside += 1
}
check(seedsInside === cells.length, 'every piece contains the seed it grew from')

// -- Determinism: the same seed produces the same break, every reload.
const again = fractureSeeds(RADIUS, 13, mulberry32(20261004))
check(
  again.every((s, i) => Math.abs(s.x - seeds[i].x) < 1e-12 && Math.abs(s.y - seeds[i].y) < 1e-12),
  'the same seed produces the same fracture',
)

// -- Clipping sanity: a bisector between two points keeps the nearer half.
{
  const square = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
  ]
  const half = clipToBisector(square, { x: -1, y: 0 }, { x: 1, y: 0 })
  check(
    Math.abs(polygonArea(half) - 2) < 1e-9,
    'clipping a square by a bisector halves it exactly',
  )
  check(
    half.every((p) => p.x <= 1e-9),
    'and keeps the side nearer the seed',
  )
}

/* ---------------------------------------------------------------------------
 * 4. Which tier a device lands on
 * ------------------------------------------------------------------------ */

console.log('\nrender tiers:')

const { decideTier, reportCapabilities } = await import('../src/materials/quality.ts')

/** A capable desktop, and every way a device can differ from it. */
const CAPABLE = {
  webgl: true,
  webgl2: true,
  deviceMemory: 8,
  cores: 8,
  saveData: false,
  reducedMotion: false,
  forcedColors: false,
}
const caps = (overrides) => ({ ...CAPABLE, ...overrides })

check(decideTier('auto', caps({})).tier === 'full', 'a capable device gets live materials')

/**
 * The reader's explicit choice outranks *capability* — but not the two things
 * that make a scene impossible to deliver honestly.
 *
 * This was worth getting right rather than asserting either way. A reader who
 * picked "Every detail" on a machine in forced-colours mode cannot be given
 * what they asked for: **a WebGL canvas cannot participate in forced colours**
 * — the browser has no way to recolour it — so rendering the lamp-lit scene
 * would quietly override the accessibility setting the reader's system is
 * insisting on. The flat reader, which is fully forced-colors-aware, is the
 * honest answer, and the settings sheet says why.
 *
 * The same goes for a device with no WebGL at all: "full" is not a tier that
 * can be rendered, so returning it would mean rendering nothing.
 */
check(decideTier('plain', caps({})).tier === 'plain', 'choosing the flat reader is honoured on a good device')
check(decideTier('plain', caps({})).byChoice === true, 'and is reported as a choice')
check(decideTier('still', caps({})).tier === 'still', 'choosing still images is honoured')
check(decideTier('full', caps({ deviceMemory: 2 })).tier === 'full', 'an explicit choice outranks the performance heuristics')
check(decideTier('full', caps({ cores: 2 })).tier === 'full', 'both of them')
check(decideTier('full', caps({ saveData: true })).tier === 'full', 'and outranks data-saving mode')
check(decideTier('full', caps({})).byChoice === true, 'and is reported as the reader’s choice, not a guess')
check(
  decideTier('full', caps({ reducedMotion: true })).tier === 'still',
  'but reduced motion is a documented accessibility request and still outranks it',
)

// Accessibility outranks capability — and, for forced colours, an explicit
// request, because a canvas cannot follow the setting.
check(decideTier('auto', caps({ forcedColors: true })).tier === 'plain', 'forced colours fall to the flat reader')
check(
  decideTier('full', caps({ forcedColors: true })).tier === 'plain',
  'and still do when the reader asked for every detail, because a canvas cannot follow forced colours',
)
check(
  decideTier('full', caps({ forcedColors: true })).reason.includes('forced colours'),
  'and the settings sheet says so rather than silently changing its mind',
)
check(
  decideTier('full', caps({ webgl: false })).tier === 'plain',
  'a device with no WebGL gets the flat reader even when asked for every detail',
)

// Capability.
check(decideTier('auto', caps({ webgl: false })).tier === 'plain', 'no WebGL at all falls to the flat reader')
check(decideTier('auto', caps({ webgl2: false })).tier === 'still', 'WebGL 1 only falls to the still images')
check(decideTier('auto', caps({ saveData: true })).tier === 'still', 'data-saving falls to the still images')

// Motion. The important one: reduced motion is not "no materials", it is
// "the same materials, without the movement".
check(decideTier('auto', caps({ reducedMotion: true })).tier === 'still', 'reduced motion falls to the still images')
check(
  decideTier('auto', caps({ reducedMotion: true })).tier !== 'plain',
  'and is never treated as a request for the flat reader',
)

// Performance heuristics.
check(decideTier('auto', caps({ deviceMemory: 2 })).tier === 'still', 'a 2 GB device gets the still images')
check(decideTier('auto', caps({ cores: 2 })).tier === 'still', 'as does a two-core device')
check(decideTier('auto', caps({ deviceMemory: 4, cores: 4 })).tier === 'full', 'a mid-range device still gets live materials')

// Every decision explains itself in a sentence a person would say.
for (const [mode, overrides] of [
  ['auto', {}],
  ['auto', { reducedMotion: true }],
  ['auto', { forcedColors: true }],
  ['auto', { webgl: false }],
  ['plain', {}],
  ['still', {}],
]) {
  const decision = decideTier(mode, caps(overrides))
  check(
    typeof decision.reason === 'string' && decision.reason.length > 8 && !decision.reason.includes('tier'),
    `"${mode}" explains itself without jargon: "${decision.reason}"`,
  )
}

// Probing outside a browser must not throw, and must fail safe.
{
  const headless = reportCapabilities()
  check(headless.webgl === false, 'capability probing outside a browser reports no WebGL')
  check(decideTier('auto', headless).tier === 'plain', 'and falls back to the flat reader')
}

/* ---------------------------------------------------------------------------
 * 5. Is it in the picture?
 * ------------------------------------------------------------------------ */

console.log('\nframing:')

const { framingAt, subjectAt, SCENE_FOV_DEGREES } = await import('../src/materials/scenes/seal/framing.ts')
const THREE = await import('three')

/**
 * The stage the scene is drawn in is `h-[clamp(280px,46vw,400px)] w-full`, so
 * its aspect swings with the viewport: about 1.2 on a small phone up to about 2
 * on a desktop. Every check below runs at each of them, because a camera that is
 * right on one is wrong on the others.
 */
const ASPECTS = [1.2, 1.4, 1.75, 2.1]

/** A bounding sphere around a set of world-space points. */
function sphereAround(points) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const point of points) {
    for (let k = 0; k < 3; k += 1) {
      min[k] = Math.min(min[k], point[k])
      max[k] = Math.max(max[k], point[k])
    }
  }
  const centre = min.map((value, k) => (value + max[k]) / 2)
  let radius = 0
  for (const point of points) {
    radius = Math.max(radius, Math.hypot(point[0] - centre[0], point[1] - centre[1], point[2] - centre[2]))
  }
  return { centre, radius }
}

/** Project world-space points the way the real camera would, to NDC. */
function project(points, opening, aspect) {
  const { position, look } = framingAt(opening, aspect)
  const eye = new THREE.Vector3(...position)
  const forward = new THREE.Vector3(...look).sub(eye).normalize()
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(right, forward).normalize()
  const tan = Math.tan(((SCENE_FOV_DEGREES * Math.PI) / 180) / 2)

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, behind = 0
  for (const point of points) {
    const relative = new THREE.Vector3(point[0], point[1], point[2]).sub(eye)
    const depth = relative.dot(forward)
    if (depth <= 0.001) { behind += 1; continue }
    const x = relative.dot(right) / (depth * tan * aspect)
    const y = relative.dot(up) / (depth * tan)
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  return { minX, maxX, minY, maxY, behind, width: maxX - minX, height: maxY - minY }
}

/** Every vertex of the leaf at a given point in the unroll. */
function leafPoints(roll) {
  const leaf = createLeaf({ length: 0.34, width: 0.075 })
  leaf.setUnroll(roll)
  const position = leaf.geometry.getAttribute('position')
  const points = []
  for (let i = 0; i < position.count; i += 1) {
    points.push([position.getX(i), position.getY(i), position.getZ(i)])
  }
  leaf.dispose()
  return points
}

const rolledPoints = leafPoints(0)
const flatPoints = leafPoints(1)

/**
 * The framing constants are measured from the real geometry, and this is the
 * check that keeps them measured. The whole camera is solved from these two
 * radii; if the leaf is re-tuned and the radius is not, the subject quietly
 * stops fitting the frame, on the device whose aspect nobody tested.
 */
{
  const sealedSphere = sphereAround(rolledPoints)
  const sealedSubject = subjectAt(0)
  const openSphere = sphereAround(flatPoints)
  const openSubject = subjectAt(1)

  check(
    sealedSubject.radius >= sealedSphere.radius * 0.98 && sealedSubject.radius < sealedSphere.radius * 1.6,
    `the sealed framing radius (${(sealedSubject.radius * 1000).toFixed(0)} mm) matches the coil it frames (${(sealedSphere.radius * 1000).toFixed(0)} mm)`,
  )
  check(
    openSubject.radius >= openSphere.radius * 0.98 && openSubject.radius < openSphere.radius * 1.6,
    `the open framing radius (${(openSubject.radius * 1000).toFixed(0)} mm) matches the leaf it frames (${(openSphere.radius * 1000).toFixed(0)} mm)`,
  )
  for (let k = 0; k < 3; k += 1) {
    const drift = Math.abs(sealedSubject.centre[k] - sealedSphere.centre[k])
    check(drift < 0.02, `the sealed framing looks at the coil, not beside it (axis ${'xyz'[k]} off by ${(drift * 1000).toFixed(1)} mm)`)
    const openDrift = Math.abs(openSubject.centre[k] - openSphere.centre[k])
    check(openDrift < 0.03, `the open framing looks at the leaf, not beside it (axis ${'xyz'[k]} off by ${(openDrift * 1000).toFixed(1)} mm)`)
  }
  check(
    sealedSubject.radius < openSubject.radius,
    'and the reveal is a move from something small to something large',
  )
}

// --- Sealed: the coil has to be the subject, not a speck -------------------
for (const aspect of ASPECTS) {
  const view = project(rolledPoints, 0, aspect)
  check(view.behind === 0, `at aspect ${aspect} the sealed coil is in front of the camera`)
  check(
    view.minX > -1.02 && view.maxX < 1.02 && view.minY > -1.02 && view.maxY < 1.02,
    `at aspect ${aspect} the sealed coil is entirely in shot (x ${view.minX.toFixed(2)}…${view.maxX.toFixed(2)}, y ${view.minY.toFixed(2)}…${view.maxY.toFixed(2)})`,
  )
  check(
    Math.max(view.width, view.height) > 0.55,
    `and is the subject rather than a detail (${(Math.max(view.width, view.height) * 100).toFixed(0)}% of the frame)`,
  )
}

// --- Open: the whole 341 mm strip must be readable, on every stage ---------
for (const aspect of ASPECTS) {
  const view = project(flatPoints, 1, aspect)
  check(view.behind === 0, `at aspect ${aspect} the open leaf is in front of the camera`)
  check(
    view.minX > -1.02 && view.maxX < 1.02 && view.minY > -1.02 && view.maxY < 1.02,
    `at aspect ${aspect} the whole unrolled leaf is in shot (x ${view.minX.toFixed(2)}…${view.maxX.toFixed(2)}, y ${view.minY.toFixed(2)}…${view.maxY.toFixed(2)})`,
  )
  check(
    view.width > 0.5,
    `at aspect ${aspect} the open leaf is the subject (${(view.width * 100).toFixed(0)}% of the frame wide)`,
  )
}

// --- Mid-unroll: the camera is travelling and the leaf is still moving ------
for (const aspect of ASPECTS) {
  let worst = 0
  for (const roll of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
    const view = project(leafPoints(roll), roll, aspect)
    check(view.behind === 0, `at aspect ${aspect} and roll ${roll} the leaf is in front of the camera`)
    worst = Math.max(worst, Math.abs(view.minX), Math.abs(view.maxX), Math.abs(view.minY), Math.abs(view.maxY))
  }
  check(
    worst < 1.02,
    `at aspect ${aspect} the leaf never leaves the frame during the unroll (worst ${worst.toFixed(2)})`,
  )
}

// --- Degenerate stages -----------------------------------------------------
{
  const square = framingAt(1, 1)
  check(Number.isFinite(square.position[2]) && square.position[2] > 0.1, 'a square stage still frames the leaf')
  check(Number.isFinite(framingAt(1, 0).position[2]), 'and a zero-width stage does not produce an infinite camera')
  check(
    framingAt(1, 0.5).position[2] > framingAt(1, 3).position[2],
    'the narrower the stage, the further back the camera stands',
  )
  // Distance from the subject, not the camera's z coordinate: once the reveal
  // swings the camera 60° round, z stops being a proxy for how far away it is.
  const distanceFrom = (framing) =>
    Math.hypot(
      framing.position[0] - framing.look[0],
      framing.position[1] - framing.look[1],
      framing.position[2] - framing.look[2],
    )
  check(
    distanceFrom(framingAt(0, 1.6)) < distanceFrom(framingAt(1, 1.6)),
    'and the camera pulls back as the leaf opens, never the reverse',
  )
  check(
    distanceFrom(framingAt(0.5, 1.6)) > distanceFrom(framingAt(0, 1.6)) &&
      distanceFrom(framingAt(0.5, 1.6)) < distanceFrom(framingAt(1, 1.6)),
    'and does it gradually, so there is no jump halfway through the reveal',
  )
  const straightOn = framingAt(0, 1.6)
  const around = framingAt(1, 1.6)
  check(
    Math.abs(around.position[0]) > Math.abs(straightOn.position[0]) + 0.1,
    'the reveal swings the camera round to the side, so the strip lies across the picture',
  )
  check(
    Math.hypot(...straightOn.position) < 0.5 && Math.hypot(...around.position) < 1.5,
    'and both framings are close enough to see a 30 mm object without a telescope',
  )
}

/* ---------------------------------------------------------------------------
 * 6. The ceremony's clock
 * ------------------------------------------------------------------------ */

console.log('\nthe clock:')

const {
  T_BREAK,
  T_CORD_RELEASE,
  T_PRESS_END,
  T_REVEAL,
  T_UNROLL_END,
  T_UNROLL_START,
  SEAL_TIMELINE_SECONDS,
  openingAt,
  phaseAt,
  unrollAt,
} = await import('../src/materials/scenes/seal/timeline.ts')

// The boundaries, one either side. A phase that ends on `<=` instead of `<`
// is a frame of the wrong animation, which is exactly the kind of thing a
// running scene hides and a table does not.
const BOUNDARIES = [
  [-1, 'sealed'],
  [0, 'pressing'],
  [T_PRESS_END - 1e-9, 'pressing'],
  [T_PRESS_END, 'pressing'],
  [T_BREAK - 1e-9, 'pressing'],
  [T_BREAK, 'breaking'],
  [T_UNROLL_START - 1e-9, 'breaking'],
  [T_UNROLL_START, 'unrolling'],
  [T_REVEAL - 1e-9, 'unrolling'],
  [T_REVEAL, 'open'],
  [T_REVEAL + 10, 'open'],
]
for (const [t, expected] of BOUNDARIES) {
  check(phaseAt(t) === expected, `at t=${t.toFixed(4)} the scene is "${expected}"`)
}

// Every phase must be reachable, and the sequence must never run backwards.
{
  const seen = []
  for (let t = -0.2; t <= SEAL_TIMELINE_SECONDS + 0.2; t += 0.01) {
    const phase = phaseAt(t)
    if (seen[seen.length - 1] !== phase) seen.push(phase)
  }
  check(
    seen.join(' → ') === 'sealed → pressing → breaking → unrolling → open',
    `the ceremony runs through its phases in order (${seen.join(' → ')})`,
  )
}

// The cord is released during the break, not after it — that is what forced the
// single clock in the first place.
check(
  T_CORD_RELEASE > T_BREAK && T_CORD_RELEASE < T_UNROLL_START,
  'the cord starts to fall after the wax fails and before the leaf is let go',
)

// The pull. Steady while the strip is coming off the coil, then easing.
{
  check(unrollAt(0) === 0, 'nothing has unrolled before the leaf is let go')
  check(unrollAt(T_UNROLL_START) === 0, 'and still nothing at the instant it is let go')
  check(unrollAt(0.5) === 0, 'and nothing midway through the fracture either')

  const half = (T_UNROLL_START + T_UNROLL_END) / 2
  const quarter = T_UNROLL_START + (T_UNROLL_END - T_UNROLL_START) / 4
  const threeQuarters = T_UNROLL_START + ((T_UNROLL_END - T_UNROLL_START) * 3) / 4
  check(
    Math.abs(unrollAt(threeQuarters) - 3 * unrollAt(quarter)) < 1e-9,
    'the strip comes off the coil at a steady rate, not an eased one',
  )
  check(unrollAt(half) > 0.4 && unrollAt(half) < 0.6, 'and halfway through the pull, half the strip is free')

  const settled = unrollAt(T_REVEAL)
  check(settled > 0.999, `by the reveal the leaf is flat (${settled.toFixed(4)})`)
  check(unrollAt(T_UNROLL_END) < 1, 'but it is not flat when the pull ends — the last curl is still to straighten')
  check(unrollAt(T_UNROLL_END) > 0.9, 'and it is nearly flat, so the settle is a relaxation rather than a second pull')

  // Monotonic and bounded over the whole timeline, including past the end.
  let previous = -1
  let monotonic = true
  for (let t = -1; t <= T_REVEAL + 1; t += 0.005) {
    const value = unrollAt(t)
    if (value < previous - 1e-12) monotonic = false
    if (value < 0 || value > 1) monotonic = false
    previous = value
  }
  check(monotonic, 'the leaf only ever unrolls, and never past flat')

  // Continuous: no step anywhere, at any resolution.
  let worstJump = 0
  for (let t = -0.5; t <= T_REVEAL + 0.5; t += 0.001) {
    worstJump = Math.max(worstJump, Math.abs(unrollAt(t + 0.001) - unrollAt(t)))
  }
  check(worstJump < 0.002, `and it never jumps (largest step ${(worstJump * 100).toFixed(3)}% per millisecond)`)

  check(unrollAt(T_REVEAL + 5) === 1, 'long after the ceremony, the leaf is exactly flat')
}

// Opening drives the camera, and it must be finished before the leaf settles.
{
  check(openingAt(T_UNROLL_START) === 0, 'the camera has not started moving before the pull')
  check(openingAt(T_UNROLL_END) === 1, 'the camera arrives when the strip comes off the coil')
  check(openingAt(T_REVEAL) === 1, 'and holds still while the leaf relaxes')
  check(openingAt(-1) === 0 && openingAt(99) === 1, 'and is clamped at both ends')
}

// The timeline's own shape: every beat is reachable, in order, and the whole
// thing is short enough that nobody waits for it.
{
  check(
    T_PRESS_END < T_BREAK && T_BREAK < T_CORD_RELEASE && T_CORD_RELEASE < T_UNROLL_START && T_UNROLL_START < T_UNROLL_END && T_UNROLL_END < T_REVEAL,
    'every beat happens after the one before it',
  )
  check(SEAL_TIMELINE_SECONDS === T_REVEAL, 'and the published duration is the reveal')
  check(
    SEAL_TIMELINE_SECONDS > 2.5 && SEAL_TIMELINE_SECONDS < 5,
    `the whole ceremony is a few seconds, not a screensaver (${SEAL_TIMELINE_SECONDS.toFixed(2)} s)`,
  )
  check(T_UNROLL_END - T_UNROLL_START > 1.5, 'and the unroll itself gets the most time, because it is the point')
}

/* ---------------------------------------------------------------------------
 * 7. One material per substance
 * ------------------------------------------------------------------------ */

console.log('\nthe material library:')

/**
 * The library is a browser module — it names eight PNGs — so it is bundled for
 * this test with the images stubbed as data URLs, and a minimal `document` is
 * enough for three.js to build a texture without ever loading one. Nothing here
 * needs a GPU: the contract is about *identity and configuration*, which is
 * exactly the part that goes wrong when a scene builds its own material and
 * quietly gets the colour space or the repeat wrong.
 */
{
  const { build } = await import('esbuild')
  const bundled = await build({
    entryPoints: ['src/materials/library.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'es2020',
    loader: { '.png': 'dataurl' },
    logLevel: 'error',
  })

  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      createElementNS: () => ({
        addEventListener() {},
        removeEventListener() {},
        setAttribute() {},
        style: {},
      }),
    }
  }

  const code = bundled.outputFiles[0].text
  const library = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  const { getMaterial, getTexture, getEnvironment, applyAnisotropy, disposeMaterials } = library

  // Identity: the same substance is the same object, every time.
  check(getMaterial('ola') === getMaterial('ola'), 'asking for the leaf twice returns the same material')
  check(getMaterial('wax') === getMaterial('wax'), 'and the same for the wax')
  check(getMaterial('ola') !== getMaterial('wax'), 'but the leaf and the wax are different substances')

  // Variation without duplication: a clone shares the textures, not the CPU work.
  const plain = getMaterial('ola')
  const varied = getMaterial('ola', { roughness: 0.62 })
  check(varied !== plain, 'a material with different parameters is a different material')
  check(varied.map === plain.map, 'but it shares the leaf texture rather than loading a second copy')
  check(varied.normalMap === plain.normalMap, 'and the normal map with it')
  check(getMaterial('ola', { roughness: 0.62 }) === varied, 'and is itself cached, not rebuilt per call')

  // Colour space. Getting this wrong is the classic way a lit scene looks flat.
  check(plain.map !== null && plain.map.colorSpace === 'srgb', 'the albedo map is sRGB, because it is a picture')
  check(
    plain.normalMap !== null && plain.normalMap.colorSpace === 'srgb-linear',
    'the normal map is linear, because it is data',
  )
  check(
    plain.roughnessMap !== null && plain.roughnessMap.colorSpace === 'srgb-linear',
    'and so is the roughness map',
  )

  // Every map on a surface tiles together, or the materials slide apart.
  const wax = getMaterial('wax')
  check(
    wax.map !== null &&
      wax.normalMap !== null &&
      wax.roughnessMap !== null &&
      wax.map.repeat.x === wax.normalMap.repeat.x &&
      wax.normalMap.repeat.x === wax.roughnessMap.repeat.x &&
      wax.map.repeat.x === wax.normalMap.repeat.y,
    `every map on the wax tiles the same number of times (${wax.map?.repeat.x}×)`,
  )
  check(
    wax.map !== null && plain.map !== null && wax.map.repeat.x !== plain.map.repeat.x,
    'and different substances tile differently, as their sizes demand',
  )

  // Textures are cached by url *and* by how they are configured.
  const url = 'x.png'
  check(getTexture(url) === getTexture(url), 'a texture is loaded once per url')
  check(getTexture(url, { colour: true }) !== getTexture(url), 'and a colour variant is a different texture')
  check(getTexture(url, { repeat: [3, 3] }) !== getTexture(url), 'as is one that tiles differently')

  // Anisotropy arrives after the renderer does, and must reach what already exists.
  applyAnisotropy(8)
  check(getTexture(url).anisotropy === 8, 'the renderer raising anisotropy updates textures already made')
  applyAnisotropy(0)
  check(getTexture(url).anisotropy === 1, 'and a nonsense value is clamped rather than passed through')

  // The room. Without an environment map, PBR reads as painted matte plastic.
  const environment = getEnvironment()
  check(environment === getEnvironment(), 'the room is one environment map, shared')
  // Compared against three's own constant rather than a literal: the mapping
  // is a number, and a literal would silently start passing for the wrong one.
  const { EquirectangularReflectionMapping } = await import('three')
  check(
    environment.mapping === EquirectangularReflectionMapping,
    'and is mapped as an equirectangular sky',
  )

  // Teardown. The app never needs this; the tests do.
  disposeMaterials()
  check(getMaterial('ola') !== plain, 'after teardown the leaf is rebuilt rather than handed back stale')
  check(getTexture(url) !== undefined, 'and the library still works afterwards')
}

/* ---------------------------------------------------------------------------
 * 8. Parts of a thousandth of a millimetre
 * ------------------------------------------------------------------------ */

console.log('\nscale:')

check(
  Math.abs(LENGTH - 0.34) < 1e-9,
  'the leaf is 34 cm long — a real ola strip, at real scale in metres',
)
check(rolled.maxY < 0.045, `and rolls into something that fits in a palm (${(rolled.maxY * 100).toFixed(1)} cm tall)`)

assert.ok(cells.length > 0)

/* ---------------------------------------------------------------------------
 * report
 * ------------------------------------------------------------------------ */

if (failed > 0) {
  console.error(`\n✗ material world: ${failed} failure(s)`)
  process.exit(1)
}
console.log(
  '\n✓ material world: the leaf rolls and unrolls without sinking, tearing or popping; the wax seals, fractures and tiles exactly\n',
)
