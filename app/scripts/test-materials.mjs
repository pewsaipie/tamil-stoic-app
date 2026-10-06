/**
 * The material world, verified without a GPU.
 *
 *   npm run test:materials
 *
 * A renderer cannot be asserted against — "does the pot look like fired clay" is
 * not a test. But almost everything *under* the picture is mathematics, and
 * mathematics can be tested: a thrown pot either stands on its foot or sinks
 * through the table, a rolled leaf either rests on it or tears, a substance
 * either keeps its own tone in forced colours or silently becomes paper.
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

let failed = 0
function check(condition, message) {
  if (condition) console.log('  ✓', message)
  else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

const { createLeaf } = await import('../src/materials/objects/leaf.ts')
/*
 * The wax-fracture fixture used to be imported here. The seal ceremony was
 * withdrawn on the reader's instruction ("a waste for an idea") and its module
 * with it; the leaf, the pot, the writing side, the tiers, the library, the
 * forced-colours pass and the room's light are all still asserted below.
 */

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

/**
 * Accessibility outranks capability — and, for forced colours, an explicit
 * request. What changed is what "outranks" *does*: the reader used to be moved
 * out of the material world, and now the material world is moved to meet them.
 *
 * These three assertions are the doctrine in three lines. If a future change
 * sends forced colours back to `plain`, it is not failing a preference test, it
 * is removing a reader's objects because their OS asked for more contrast.
 */
check(
  decideTier('auto', caps({ forcedColors: true })).tier === 'contrast',
  'forced colours renders the scene without colour or maps',
)
check(
  decideTier('full', caps({ forcedColors: true })).tier === 'contrast',
  'and an explicit request for every detail cannot buy colour back',
)
check(
  decideTier('full', caps({ forcedColors: true })).reason.includes('forced colours'),
  'and the settings sheet says so rather than silently changing its mind',
)
check(
  decideTier('full', caps({ webgl: false })).tier === 'css3d',
  'a device with no WebGL gets CSS depth even when asked for every detail',
)

// Capability.
check(decideTier('auto', caps({ webgl: false })).tier === 'css3d', 'no WebGL at all falls to the canvas-free renderer')
/**
 * This one is a bug fix, not a doctrine change, and it is worth stating plainly
 * because it was invisible for a whole release: WebGL 1-only browsers were sent
 * to `still`, and `still` is a live three.js scene. Three.js dropped WebGL 1 in
 * r163, so the tier they were promised was the one tier they could not render.
 * `css3d` is the first fallback here that needs no GPU at all, which is the
 * property a fallback was always supposed to have.
 */
check(decideTier('auto', caps({ webgl2: false })).tier === 'css3d', 'WebGL 1 only falls to the renderer that needs no GPU')
check(decideTier('auto', caps({})).tier === 'full', 'and a capable browser is never sent there by mistake')
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
  /**
   * The headless probe is also the "no GPU anywhere" case, and it has to land on
   * the tier that needs none. `css3d` is that tier — and note it is *not* the
   * flat reader any more, which is the point of the doctrine: the canvas-free
   * path still shows the object, because CSS perspective asks nothing of a
   * driver. The property being protected here is "no throw, no GL context".
   */
  check(decideTier('auto', headless).tier === 'css3d', 'and falls back to the renderer that needs no GPU at all')
  check(headless.forcedColors === false, 'and does not claim a system setting it cannot see')
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

  /**
   * The pot's two skins, verbatim from `potGeometry.ts`.
   *
   * This is the case a cache keyed on the substance name alone would get wrong,
   * and it would get it wrong invisibly: `clay` and `clayBlack` share a queue
   * position, so the second call would be handed the first call's material and
   * the pot would come out red on the inside — or black on the outside — with a
   * valid-looking scene and nothing in the log. The key has to carry the
   * parameters, not just the name.
   */
  const { FrontSide, BackSide, EquirectangularReflectionMapping } = await import('three')
  const slip = getMaterial('clay', { side: FrontSide, flatShading: false })
  const ware = getMaterial('clayBlack', { side: BackSide, flatShading: false })
  check(slip !== ware, 'the pot\'s red slip and its black interior are two materials')
  check(slip.side === FrontSide && ware.side === BackSide, 'and each keeps the side it was asked for')
  check(
    getMaterial('clay', { side: FrontSide, flatShading: false }) === slip,
    'while the same substance with the same parameters is still one shared material',
  )
  check(
    getMaterial('clay', { side: BackSide }) !== slip,
    'a different side on the same substance is a different material, not a silently flipped one',
  )

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
  check(
    environment.mapping === EquirectangularReflectionMapping,
    'and is mapped as an equirectangular sky',
  )

  /**
   * The cross-module invariant: a substance exists ⇒ it has a tone.
   *
   * `MATERIAL_NAMES` is exported as a value precisely so this can be walked.
   * The pass matches materials to roles by name and defaults to `paper` when a
   * name is unknown, which is the right *behaviour* — a nameless shard still has
   * to be visible — and the wrong *silence*. A substance added to the library
   * and forgotten in `ROLE_BY_MATERIAL_NAME` renders as a page: still legible,
   * still lit, and no longer the pot it was.
   */
  const { MATERIAL_NAMES } = library
  const { roleForMaterial: roleFor, DEFAULT_ROLE: fallback } = await import(
    '../src/materials/contrastPass.ts'
  )
  const unroled = MATERIAL_NAMES.filter((name) => roleFor(name) === fallback)
  check(
    unroled.length === 0,
    `every substance in the library answers the forced-colours pass by name (unmapped: ${unroled.join(', ') || 'none'})`,
  )
  check(
    roleFor('clayBlack') === roleFor('clay'),
    'and the reduction-fired interior shares the clay body\'s role rather than inventing a second tone',
  )

  // Teardown. The app never needs this; the tests do.
  disposeMaterials()
  check(getMaterial('ola') !== plain, 'after teardown the leaf is rebuilt rather than handed back stale')
  check(getTexture(url) !== undefined, 'and the library still works afterwards')
}

/* ---------------------------------------------------------------------------
 * 8. Parts of a thousandth of a millimetre
 * ------------------------------------------------------------------------ */

/* ---------------------------------------------------------------------------
 * forced colours: the pass, and the ramp that makes it legible
 *
 * These are the gates the confirmed brief asked for *per surface*, written so a
 * surface cannot opt out of them by accident. Two of them are deliberately
 * unusual: one asserts a property of the source tree rather than of a
 * computation, and one asserts a contrast ratio against a synthetic palette
 * rather than a screenshot, because a screenshot would need a GPU and this file
 * has to run in CI on a machine with none.
 * ------------------------------------------------------------------------ */

console.log('\nforced colours:')

const {
  SURFACE_GRAPH,
  FOREGROUND_ROLES,
  MIN_OBJECT_CONTRAST,
  MIN_TEXT_CONTRAST,
  MIN_SIBLING_RATIO,
  contrastRatio,
  flatSurface,
  legibilityViolations,
  luminanceAt,
  mix,
  parseColor,
  relativeLuminance,
  resolvePalette,
  toneForLuminance,
} = await import('../src/materials/forcedColours.ts')

const { applyContrastPass, planForMaterial, roleForMaterial, DEFAULT_ROLE } = await import(
  '../src/materials/contrastPass.ts'
)

const { resolveEnvironment, timeOfDayFor, ENV_BUDGET_BYTES } = await import('../src/materials/environment.ts')

const BLACK = { r: 0, g: 0, b: 0 }
const WHITE = { r: 255, g: 255, b: 255 }
/** A real one: Windows' "Desert" high-contrast scheme, close enough to matter. */
const DESERT_CANVAS = { r: 61, g: 49, b: 33 }
const DESERT_TEXT = { r: 250, g: 241, b: 221 }
/** The cramped case: a palette with barely any range to spend. */
const NARROW = { canvas: { r: 40, g: 40, b: 40 }, text: { r: 150, g: 150, b: 150 } }

/** Every palette a reader can actually be in, including the near-miss ones. */
const PALETTES = [
  { name: 'black on white', canvas: WHITE, text: BLACK },
  { name: 'white on black', canvas: BLACK, text: WHITE },
  { name: 'desert', canvas: DESERT_CANVAS, text: DESERT_TEXT },
  { name: 'narrow', canvas: NARROW.canvas, text: NARROW.text },
]

check(parseColor('#0a141e')?.r === 10 && parseColor('rgb(10 20 30)')?.g === 20, 'colour parsing takes both forms a probe can return')
check(parseColor('rebeccapurple') === null, 'and refuses a colour it cannot resolve, rather than guessing black')
check(Math.abs(relativeLuminance(WHITE) - 1) < 1e-9 && relativeLuminance(BLACK) === 0, 'luminance is anchored at both ends')
check(Math.abs(contrastRatio(BLACK, WHITE) - 21) < 1e-9, 'and the WCAG ratio for the pair is 21:1')

check(
  contrastRatio(mix(BLACK, WHITE, 0), BLACK) === 1 && contrastRatio(mix(BLACK, WHITE, 1), WHITE) === 1,
  'the ramp starts and ends on the platform colours themselves, not near them',
)
/**
 * The midpoint of a ramp mixed in *linear* light is 0.5 luminance. Take the
 * same midpoint in sRGB space — 128, 128, 128, the number an author reaches for
 * — and it is 0.216: barely a third of the way up. That asymmetry is why the
 * hand-tuned table this module replaced bunched its objects at the dark end and
 * failed its own contrast check, and it is worth asserting in both directions so
 * the next person does not "fix" `mix` into the naive version.
 */
{
  const mid = relativeLuminance(mix(BLACK, WHITE, 0.5))
  check(
    mid > 0.45 && mid < 0.52,
    `mixed in linear light, the ramp midpoint is about half luminance (measured ${mid.toFixed(4)}; the shortfall is the 8-bit round trip)`,
  )
}
check(
  relativeLuminance({ r: 128, g: 128, b: 128 }) < 0.25,
  'while the naive 50% sRGB grey is only 0.216 — the trap this ramp exists to avoid',
)

/**
 * The closed form is the load-bearing claim: luminance is *exactly* linear in
 * the blend parameter, which is what lets a ratio be solved instead of searched
 * and lets an unreachable ratio be recognised instead of converged onto.
 */
for (const t of [0, 0.17, 0.5, 0.83, 1]) {
  for (const palette of PALETTES) {
    const system = { canvas: palette.canvas, text: palette.text }
    const back = toneForLuminance(luminanceAt(t, system), system)
    if (back === null || Math.abs(back - t) > 1e-9) {
      check(false, `tone → luminance → tone is exact at t=${t} for ${palette.name} (got ${back})`)
    }
  }
}
check(true, 'tone ↔ luminance round-trips exactly on every palette, so the solver is arithmetic, not search')

/**
 * The ramp order, as relationships rather than numbers — these are the claims a
 * reader of the scene would notice if they were broken.
 */
for (const palette of PALETTES) {
  const system = { canvas: palette.canvas, text: palette.text }
  const ola = flatSurface('ola', system)
  const teak = flatSurface('teak', system)
  const brass = flatSurface('brass', system)
  check(
    ola.contrastAgainstParent >= SURFACE_GRAPH.ola.minRatio - 1e-9,
    `${palette.name}: the leaf stands off the table it lies on`,
  )
  check(
    flatSurface('ink', system).contrastAgainstParent >= MIN_TEXT_CONTRAST,
    `${palette.name}: the ink is separable from the leaf it is written on`,
  )
  check(
    flatSurface('clay', system).contrastAgainstParent >= MIN_OBJECT_CONTRAST,
    `${palette.name}: and the pot from the table it stands on`,
  )
  check(
    flatSurface('brass', system).contrastAgainstParent >= MIN_OBJECT_CONTRAST,
    `${palette.name}: the lamp is a thing the reader acts on, so it clears the object bar too`,
  )
  /**
   * "Metal is not the leaf" is a claim about the rendered pixels, not about
   * brightness: which end of the ramp a palette puts "bright" on is the
   * platform's choice, so `tone` order means nothing across themes. Two
   * substances may only share a colour if the solver *said* the palette was too
   * cramped to place them apart — a collision nobody reported is a defect, and a
   * collision reported on a 40→150 palette is just physics.
   */
  check(
    brass.color !== ola.color || brass.violated,
    `${palette.name}: metal and leaf either differ, or the solver admitted it could not separate them`,
  )
  check(flatSurface('flame', system).emissive !== null, `${palette.name}: the flame keeps the accent, so it still pulls the eye`)
  check(flatSurface('ola', system).emissive === null, `${palette.name}: and nothing else glows`)
  check(
    FOREGROUND_ROLES.every((role) => flatSurface(role, system).mapsBound === false),
    `${palette.name}: no surface in this tier may bind a map, and none reports one`,
  )
}

/**
 * The guarantee, per palette: every substance clears its own bar against the
 * surface it rests on — or the palette is reported as too cramped to hold it.
 *
 * `narrow` is in this loop deliberately, and it is allowed to fail. A palette
 * with 40→150 of range cannot host fifteen substances three-to-one apart and no
 * amount of code can make it so; what the code has to do is *say* which
 * placements did not fit. That is the first assertion below, and it is made of
 * every role rather than a chosen few: a substance added to the room later
 * inherits the gate instead of being added outside it.
 *
 * The second assertion is the stricter one, and it is deliberately short. A role
 * may only be *reported* as unplaceable when the palette itself is cramped
 * (40→150 of luminance is the honest case, and it is named above). The reading
 * surface and what it rests on are the exception: if the leaf, the ink on it,
 * the table or the ground cannot be separated, the app has stopped being a
 * reader in that theme, and no palette may claim that is merely cramped.
 */
const READING_SURFACES = ['stone', 'teak', 'ola', 'ink']
for (const palette of PALETTES) {
  const system = { canvas: palette.canvas, text: palette.text }
  const violations = legibilityViolations(system)
  for (const role of Object.keys(SURFACE_GRAPH)) {
    const surface = flatSurface(role, system)
    const needed = SURFACE_GRAPH[role].minRatio
    check(
      surface.contrastAgainstParent >= needed - 1e-9,
      `${palette.name}: ${role} clears ${needed.toFixed(2)}:1 against ${SURFACE_GRAPH[role].restsOn ?? 'the void'} (got ${surface.contrastAgainstParent.toFixed(2)})`,
    )
  }
  check(
    violations.every((role) => !READING_SURFACES.includes(role)),
    `${palette.name}: the reading surface and its ground are always placeable (unplaceable: ${violations.join(', ') || 'none'})`,
  )
  const onTheTable = ['ola', 'paper', 'clay', 'cloth', 'water', 'brass', 'copper', 'sand', 'ash']
    .map((role) => flatSurface(role, system).tone)
  const distinct = onTheTable.filter(
    (tone) => onTheTable.filter((other) => Math.abs(other - tone) < 1e-6).length === 1,
  ).length
  /**
   * Tabletop surfaces must not collapse onto one grey — unless the palette
   * genuinely cannot hold them apart, in which case the solver has to have *said*
   * so. That exemption is the whole difference between a documented limit and a
   * silent bug: `narrow` spans 40→150 of luminance and cannot host nine
   * substances at 3:1 and 1.15:1, and the run below proves it reported that
   * rather than quietly rendering nine identical objects. The nine are the pot,
   * the lamp, the water in it, the leaf, the paper under it: the room's objects,
   * which is why the list is spelled out here rather than derived.
   */
  const cramped = violations.length > 0
  check(
    distinct >= 6 || cramped,
    `${palette.name}: ${distinct} of ${onTheTable.length} tabletop surfaces keep their own tone${cramped ? ' — and the palette admitted it could not' : ''}`,
  )
  if (palette.name === 'narrow') {
    check(violations.length > 0, 'a 40→150 palette is reported as too cramped rather than faked into working')
  }
}

check(
  Math.min(...PALETTES.slice(0, 3).map((palette) => flatSurface('clay', { canvas: palette.canvas, text: palette.text }).contrastAgainstParent)) >= MIN_OBJECT_CONTRAST,
  'the pot against the table clears the object bar on every palette that can hold it',
)
check(
  flatSurface('ink', { canvas: DESERT_CANVAS, text: DESERT_TEXT }).contrastAgainstParent >= MIN_TEXT_CONTRAST,
  'the ink clears the text bar on the cramped real-world palette, not just on black-on-white',
)
check(
  resolvePalette({}).text !== undefined && resolvePalette({}).accent !== undefined,
  'a missing role is derived from Canvas/CanvasText, never from our own palette',
)
check(
  Object.values(SURFACE_GRAPH).every((placement) => placement.minRatio >= 1),
  'every placement asks for a real separation, including the residues',
)

/**
 * A fake mount, in the shape `three` uses, so the pass can be verified at all.
 *
 * The tree is the room as `TableScene` actually builds it, substance for
 * substance: ground, table, leaf, the pot's two skins, the water in it and the
 * brass lamp. That is the point of re-authoring it here rather than keeping a
 * fixture that matched the deleted scene: the pass is only proven against the
 * objects the app really mounts, and `clayBlack` in particular is a name that
 * would have gone in unnoticed if this tree had not carried it.
 */
function fakeRoom() {
  const bound = (name) => ({
    name,
    color: { value: 0, set(v) { this.value = v } },
    emissive: { value: 0, set(v) { this.value = v } },
    emissiveIntensity: 0,
    roughness: 0.5,
    metalness: 0.9,
    envMapIntensity: 0.55,
    map: { textureId: `${name}-albedo` },
    normalMap: { textureId: `${name}-normal` },
    roughnessMap: { textureId: `${name}-rough` },
  })
  const mesh = (name, material, extra = {}) => ({ name, material, castShadow: true, receiveShadow: true, children: [], ...extra })
  return {
    name: 'Scene',
    children: [
      mesh('ground', bound('stone')),
      mesh('table', bound('table')),
      mesh('leaf', bound('ola')),
      mesh('pot', bound('clay')),
      mesh('pot-interior', bound('clayBlack')),
      mesh('water', bound('water')),
      mesh('lamp', bound('brass')),
      // A shard material that never announced itself — the failure mode the
      // report exists to make visible instead of silent.
      mesh('shard-3', { ...bound(undefined), name: undefined }),
      { name: 'lamp-light', isLight: true, color: { value: 0, set(v) { this.value = v } }, intensity: 5.4, castShadow: true, children: [] },
      { name: 'room', isLight: true, isAmbientLight: true, color: { value: 0, set(v) { this.value = v } }, intensity: 0.14, children: [] },
    ],
    castShadow: false,
    receiveShadow: false,
  }
}

const system = { canvas: DESERT_CANVAS, text: DESERT_TEXT }
const tree = fakeRoom()
const report = applyContrastPass(tree, system)

check(report.materials === 8 && report.objects >= 9, 'the pass walks the whole tree, including nested meshes')
check(
  tree.children
    .filter((node) => node.material)
    .every(
      (node) =>
        node.material.map === null &&
        node.material.normalMap === null &&
        node.material.roughnessMap === null,
    ),
  'and unbinds every map on every material it reaches',
)
check(
  tree.children.every((node) => node.castShadow !== true && node.receiveShadow !== true),
  'no object casts or receives a shadow in this tier',
)
check(report.unlabelled.length === 1 && report.unlabelled[0] === 'shard-3', 'an unnamed material is reported, not silently defaulted')
check(roleForMaterial(undefined) === DEFAULT_ROLE, 'and the default is the tone that cannot be invisible')
check(
  tree.children.filter((n) => n.isLight).every((light) => light.color.value !== 0 || light.castShadow === false),
  'lights are rewritten too: a warm lamp would push our colours back into a frame that is not allowed to have them',
)
check(tree.children.find((n) => n.name === 'lamp-light').castShadow === false, 'a light that cannot cast cannot leak a shadow either')
check(
  ['stone', 'teak', 'ola', 'clay', 'water', 'brass'].every((role) => report.roles.includes(role)),
  'the frame still contains distinct substances after the pass',
)
check(
  report.roles.filter((role) => role === 'clay').length === 1,
  'and the pot is one substance in the report, whatever it was fired to',
)
check(planForMaterial({ name: 'brass' }, system).metalness > planForMaterial({ name: 'stone' }, system).metalness, 'metal is still metal, and stone is still matte')
check(planForMaterial({ name: 'brass' }, system).envMapIntensity === 0, 'but the environment contributes no colour to either')

/* ---------------------------------------------------------------------------
 * the room's light
 * ------------------------------------------------------------------------ */

console.log('\nthe room:')

check(timeOfDayFor('day') === 'day' && timeOfDayFor('night') === 'dusk', 'the theme switch moves the sun, as §4.16 says')
check(timeOfDayFor('system', true) === 'dusk' && timeOfDayFor('system', false) === 'day', 'and following the OS follows the OS')

const full = resolveEnvironment({ timeOfDay: 'dusk', tier: 'full' })
const still = resolveEnvironment({ timeOfDay: 'dusk', tier: 'still' })
const contrast = resolveEnvironment({ timeOfDay: 'dusk', tier: 'contrast' })
const css3d = resolveEnvironment({ timeOfDay: 'dusk', tier: 'css3d' })

check(full.shadows === true && still.shadows === false, 'shadows are the first thing a weaker device stops paying for')
check(full.bloom !== null && still.bloom === null && css3d.bloom === null, 'post is off everywhere the lamp is not live')
check(contrast.url === null && contrast.source === 'procedural' && contrast.bloom === null, 'forced colours binds no environment map at all')
check(contrast.shadows === false && contrast.keyIntensity > full.keyIntensity, 'and raises its key light to carry shape on its own')
check(still.flicker === false && full.flicker === true, 'the flame stops moving in the still tiers, and only there')
check(resolveEnvironment({ timeOfDay: 'day', tier: 'full' }).colorTemperature > full.colorTemperature, 'daylight is cooler than the lamp, physically')
check(
  resolveEnvironment({ timeOfDay: 'day', tier: 'full', hdriAvailable: { day: true } }).source === 'hdri',
  'a vendored HDRI is picked up with no other edit',
)
check(
  resolveEnvironment({ timeOfDay: 'day', tier: 'contrast', hdriAvailable: { day: true } }).source === 'procedural',
  'and is still refused in forced colours, because that is a colour we did not earn',
)
check(ENV_BUDGET_BYTES * 2 < 4 * 1024 * 1024, 'the whole environment budget fits inside the app it belongs to')

/**
 * The rule that makes "every surface" mean something.
 *
 * A doctrine enforced by review is a doctrine that holds until the PR is
 * large. This asserts it against the source tree instead: any file that mounts a
 * `<Canvas>` must apply the pass. It costs nothing today and it is the only
 * assertion here that still works when there are 22 scenes and nobody is
 * reading the diff.
 */
const { readdirSync, readFileSync, statSync } = await import('node:fs')
const { join } = await import('node:path')

function sceneFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sceneFiles(path, found)
    else if (/\.(tsx|ts)$/.test(entry)) found.push(path)
  }
  return found
}

const mountingCanvas = sceneFiles('src/materials/scenes').filter((file) =>
  /<Canvas[\s>]/.test(readFileSync(file, 'utf8')),
)
const skippingPass = mountingCanvas.filter((file) => !readFileSync(file, 'utf8').includes('applyContrastPass'))

check(mountingCanvas.length > 0, 'the scan found the scenes that mount a canvas')
check(
  skippingPass.length === 0,
  skippingPass.length === 0
    ? 'every scene that mounts a canvas also applies the forced-colours pass'
    : `these scenes mount a canvas without the pass: ${skippingPass.join(', ')}`,
)

console.log('\nscale:')

check(
  Math.abs(LENGTH - 0.34) < 1e-9,
  'the leaf is 34 cm long — a real ola strip, at real scale in metres',
)
check(rolled.maxY < 0.045, `and rolls into something that fits in a palm (${(rolled.maxY * 100).toFixed(1)} cm tall)`)

/* ---------------------------------------------------------------------------
 * report
 * ------------------------------------------------------------------------ */

if (failed > 0) {
  console.error(`\n✗ material world: ${failed} failure(s)`)
  process.exit(1)
}
console.log(
  '\n✓ material world: the leaf rolls and unrolls without sinking, tearing or popping; every substance is named, and every scene answers forced colours\n',
)
