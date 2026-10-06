/**
 * The motion contract — every movement in the app, asserted.
 *
 * "Motion in every aspect of the UI" is a promise that decays the moment it
 * depends on someone remembering it. This suite makes the promise mechanical:
 *
 *   1. **Every keyframe is gated.** A CSS animation that no kill-switch can stop
 *      is a bug, not a feature. Each animated class must be silenced by *both*
 *      the OS preference and the in-app toggle, and the decorative layers must
 *      be removed under high contrast and forced colours.
 *   2. **Every door has weather.** The twelve situation doors map onto the five
 *      Sangam landscapes by feeling; an unmapped door or an unregistered
 *      landscape is a design hole, and this fails on it.
 *   3. **The budget holds.** The particles in the room fit inside the stated
 *      per-route budget, and the numbers live in one module rather than in the
 *      files that use them.
 *   4. **The verse never moves.** The couplet's two-line block is text, and text
 *      is the one thing on screen that must hold still.
 *   5. **The scene declares its pass.** Anything that mounts a `<Canvas>` applies
 *      the forced-colours pass (also asserted in `test-materials.mjs`; repeated
 *      here so a motion change cannot break it silently).
 *
 *   npm run test:motion
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

let failed = 0
function check(condition, message) {
  if (condition) console.log('  ✓', message)
  else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

const read = (path) => readFileSync(path, 'utf8')

/* ---------------------------------------------------------------------------
 * 1. Every keyframe is gated
 * ------------------------------------------------------------------------ */

console.log('the kill-switches:')

const ambient = read('src/styles/ambient.css')

const keyframes = [...ambient.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1])
check(keyframes.length > 0, `the stylesheet declares its movements (${keyframes.length} keyframes)`)

/** The class(es) each keyframe is attached to. */
const animatedClasses = [...ambient.matchAll(/\.([\w-]+)\s*\{[^}]*animation:\s*([^;]+);/g)]
  .filter((match) => keyframes.some((name) => match[2].includes(name)))
  .map((match) => match[1])

check(
  animatedClasses.length > 0,
  `and attaches them to named classes (${animatedClasses.join(', ')})`,
)

const reducedBlock = ambient.slice(
  ambient.indexOf('@media (prefers-reduced-motion: reduce)'),
  ambient.indexOf("[data-contrast='high']"),
)
const toggleBlock = ambient.slice(
  ambient.indexOf("[data-motion='reduced'] .anim-sky"),
  ambient.indexOf("[data-contrast='high']"),
)

const ungated = animatedClasses.filter(
  (name) => !reducedBlock.includes(`.${name}`) && !reducedBlock.includes(`${name}::`),
)
check(
  ungated.length === 0,
  ungated.length === 0
    ? 'every animated class is silenced by prefers-reduced-motion'
    : `ungated under reduced motion: ${ungated.join(', ')}`,
)

const ungatedToggle = animatedClasses.filter(
  (name) => !toggleBlock.includes(`.${name}`) && !toggleBlock.includes(`${name}::`),
)
check(
  ungatedToggle.length === 0,
  ungatedToggle.length === 0
    ? 'and every one is silenced by the in-app toggle as well'
    : `ungated under the in-app toggle: ${ungatedToggle.join(', ')}`,
)

check(
  ambient.includes("[data-contrast='high'] .ambient-decor") &&
    ambient.includes("[data-contrast='high'] .door-weather"),
  'high contrast removes the decorative layers entirely',
)
check(
  ambient.includes('forced-colors: active') &&
    /\.ambient-canvas,[\s\S]*\.door-weather\s*\{[\s\S]*display: none/.test(ambient),
  'and so does forced colours',
)

/* ---------------------------------------------------------------------------
 * 2. Every door has weather
 * ------------------------------------------------------------------------ */

console.log('\nthe situation doors:')

const { SITUATIONS } = await import('../src/lib/situations.ts')
const { DOOR_WEATHER, WEATHER_REGISTERS } = await import('../src/lib/thinai.ts')

const unmapped = SITUATIONS.filter((situation) => DOOR_WEATHER[situation.id] === undefined).map(
  (situation) => situation.id,
)
check(
  unmapped.length === 0,
  unmapped.length === 0
    ? `all ${SITUATIONS.length} doors belong to a landscape`
    : `doors with no weather: ${unmapped.join(', ')}`,
)

const missing = WEATHER_REGISTERS.filter(
  (register) => !ambient.includes(`[data-register='${register}']`),
)
check(
  missing.length === 0,
  missing.length === 0
    ? 'and every landscape has a weather in the stylesheet'
    : `landscapes with no CSS: ${missing.join(', ')}`,
)

const strange = Object.entries(DOOR_WEATHER).filter(
  ([, register]) => !WEATHER_REGISTERS.includes(register),
)
check(strange.length === 0, 'no door points at a landscape that does not exist')

check(
  [...new Set(Object.values(DOOR_WEATHER))].length === WEATHER_REGISTERS.length,
  'and all five landscapes are actually used by the doors',
)

/* ---------------------------------------------------------------------------
 * 3. The budget holds
 * ------------------------------------------------------------------------ */

console.log('\nthe budget:')

const { PARTICLE_BUDGET, LOOP_BUDGET, IDLE_PERIOD_SECONDS_MIN, INTERACTION_MAX_MS, FAST_LOOPS } =
  await import('../src/motion/budget.ts')

check(
  PARTICLE_BUDGET.atmosphere + PARTICLE_BUDGET.dust <= PARTICLE_BUDGET.perRoute,
  `the room's particles fit the per-route budget (${PARTICLE_BUDGET.atmosphere} + ${PARTICLE_BUDGET.dust} ≤ ${PARTICLE_BUDGET.perRoute})`,
)
check(
  IDLE_PERIOD_SECONDS_MIN >= 6,
  'idle movement is slower than six seconds, so it is weather and not noise',
)

/**
 * The material exceptions are a ceiling, and the scene is the floor.
 *
 * A pot is thrown in 2.6 s and set down in 0.9 s; the day's water is poured in
 * 2.4 s. Those numbers live in `TableScene.tsx` because that is where the motion
 * is, and the *budget* lives here — so this reads both and fails if the scene has
 * grown past what the budget declares. Otherwise the exception list becomes
 * folklore: nobody knows whether 3,500 ms still means anything.
 */
const scene = read('src/materials/scenes/table/TableScene.tsx')
const seconds = (name) => {
  const match = scene.match(new RegExp(`const ${name} = ([\\d.]+)`))
  return match ? Number(match[1]) : NaN
}
const { MATERIAL_EXCEPTION_MS } = await import('../src/motion/budget.ts')
const throwMs = (seconds('FORM_SECONDS') + seconds('SETTLE_SECONDS')) * 1000
const pourMs = seconds('POUR_SECONDS') * 1000
check(
  Number.isFinite(throwMs) && throwMs <= MATERIAL_EXCEPTION_MS.potThrow,
  `the pot's throw and settle fit the declared exception (${throwMs} ms ≤ ${MATERIAL_EXCEPTION_MS.potThrow} ms)`,
)
check(
  Number.isFinite(pourMs) && pourMs <= MATERIAL_EXCEPTION_MS.potPour,
  `and so does the pour (${pourMs} ms ≤ ${MATERIAL_EXCEPTION_MS.potPour} ms)`,
)
check(
  MATERIAL_EXCEPTION_MS.potThrow > INTERACTION_MAX_MS,
  'both are longer than an interaction on purpose — a pot is not a button',
)
check(
  read('src/components/ambient/Atmosphere.tsx').includes('PARTICLE_BUDGET') &&
    read('src/materials/scenes/table/TableScene.tsx').includes('PARTICLE_BUDGET'),
  'both particle systems take their counts from the budget, not from a local literal',
)

/**
 * Every loop is either slow, or fast *and* written down.
 *
 * The law is about movement: a loop that translates or scales must be weather.
 * An opacity-only signal (a glint, a twinkle) and the two fast weather registers
 * are allowed, but only by name, in `FAST_LOOPS` — so a fast loop is always a
 * decision somebody made rather than a number somebody typed.
 */
const loops = [...ambient.matchAll(/animation:\s*([\w-]+)\s+([\d.]+)s/g)].map((match) => ({
  name: match[1],
  seconds: Number(match[2]),
}))
const tooFast = loops.filter((loop) => loop.seconds < IDLE_PERIOD_SECONDS_MIN)
const undocumented = tooFast.filter((loop) => FAST_LOOPS[loop.name] === undefined)

check(
  undocumented.length === 0,
  undocumented.length === 0
    ? `every loop faster than ${IDLE_PERIOD_SECONDS_MIN}s is a written exception (${tooFast.map((loop) => loop.name).join(', ') || 'none'})`
    : `undocumented fast loops: ${undocumented.map((loop) => `${loop.name} (${loop.seconds}s)`).join(', ')}`,
)

check(
  loops.length > 0,
  `the stylesheet's loops are all accounted for (slowest ${Math.max(...loops.map((loop) => loop.seconds))}s)`,
)

/* ---------------------------------------------------------------------------
 * 4. The runtime — the grammar, the kill matrix, the ceiling
 *
 * The CSS half of the budget is asserted above. This half is the JavaScript:
 * the thinai registers that give motion its timing, the single predicate that
 * decides whether anything may move at all, and the registry that keeps a route
 * from running more frames than it is allowed.
 * ------------------------------------------------------------------------ */

console.log('\nthe runtime:')

const { REGISTER_MOTION, ROUTE_REGISTER, REGISTER_BY_STATE, DEFAULT_REGISTER, MOTION_REGISTERS, registerFor, registerForPath } =
  await import('../src/motion/registers.ts')
const { motionVerdict } = await import('../src/motion/conditions.ts')
const { LoopRegistry } = await import('../src/motion/loops.ts')

/* The routes are read out of the router rather than trusted to agree: a route
 * added without a landscape would fall to the everyday register and nobody
 * would notice, because `marutham` is a perfectly good answer. */
const appSource = read('src/App.tsx')
const declared = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1])
check(declared.length >= 6, `the router declares its routes (${declared.length} found)`)
const unmappedRoutes = declared.filter((path) => path !== '*' && ROUTE_REGISTER[path] === undefined)
check(
  unmappedRoutes.length === 0,
  `every route stands in a landscape (unmapped: ${unmappedRoutes.join(', ') || 'none'})`,
)
const staleRoutes = Object.keys(ROUTE_REGISTER).filter((path) => !declared.includes(path))
check(staleRoutes.length === 0, `and no landscape is left for a route that no longer exists (stale: ${staleRoutes.join(', ') || 'none'})`)

check(
  MOTION_REGISTERS.every((register) => REGISTER_MOTION[register] !== undefined),
  `all five landscapes have a register (${MOTION_REGISTERS.length})`,
)
check(
  MOTION_REGISTERS.every((register) => REGISTER_MOTION[register].beatSeconds >= IDLE_PERIOD_SECONDS_MIN),
  `no register moves faster than the weather floor (slowest beat ${Math.max(...MOTION_REGISTERS.map((r) => REGISTER_MOTION[r].beatSeconds))}s)`,
)
check(
  MOTION_REGISTERS.every((register) => REGISTER_MOTION[register].amplitude <= 0.02),
  'and none travels further than two per cent of its own size',
)
check(
  MOTION_REGISTERS.every((register) => typeof REGISTER_MOTION[register].drum === 'string' && REGISTER_MOTION[register].drum.length > 0),
  'each one names the drum its beat is taken from, rather than inventing a duration',
)
/* A register names an easing *token*, and a token that does not exist in
 * `tokens.css` silently becomes the CSS fallback — every landscape settling with
 * the same curve, which is the drift this runtime exists to stop. */
const cssTokens = read('src/styles/tokens.css')
const CSS_KEYWORDS = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end']
const easings = [...new Set(MOTION_REGISTERS.map((register) => REGISTER_MOTION[register].easing))]
const missingEasings = easings.filter(
  (easing) =>
    (easing.startsWith('--') && !cssTokens.includes(`${easing}:`)) ||
    (!easing.startsWith('--') && !CSS_KEYWORDS.includes(easing)),
)
check(
  missingEasings.length === 0,
  `and every easing it names resolves — a token in the token set, or a CSS keyword (${easings.join(', ')})`,
)
check(
  easings.filter((easing) => CSS_KEYWORDS.includes(easing)).length === 1 &&
    REGISTER_MOTION.palai.easing === 'linear',
  'with exactly one keyword: palai is linear because the parched passage has no curve to give',
)

check(registerForPath('/kural/1330') === 'kurinji', 'a parameterised route resolves to its landscape')
check(registerForPath('/kural/1330/') === 'kurinji', 'and so does the same path with a trailing slash')
check(registerForPath('/nowhere') === DEFAULT_REGISTER, 'an unknown path lands on the everyday landscape, not on nothing')
check(
  registerFor('/kural/1330', 'offline') === 'palai',
  'a state outranks a route: a kural read offline is the hard passage, not a meeting',
)
check(registerFor('/chapters', 'arrived') === 'kurinji', 'and an arrival is a meeting wherever it happens')
check(
  ['empty', 'offline', 'error'].every((state) => REGISTER_BY_STATE[state] === 'palai'),
  'the three states with nothing to hold on to are all palai',
)

/* The kill matrix. `still` and `paused` are different answers and the
 * difference is the accessibility guarantee: one draws the end state, the other
 * holds the frame for later. */
const calm = {
  reduceMotion: false,
  prefersReducedMotion: false,
  highContrast: false,
  forcedColors: false,
  saveData: false,
  tier: 'full',
  dialogsOpen: 0,
  hidden: false,
}
check(motionVerdict(calm).moving === true, 'an unencumbered room is allowed to move')

const stilled = [
  ['the reader\'s own switch', { reduceMotion: true }],
  ['the system preference', { prefersReducedMotion: true }],
  ['high contrast', { highContrast: true }],
  ['forced colours', { forcedColors: true }],
  ['save-data', { saveData: true }],
  ['the flat reader', { tier: 'plain' }],
]
for (const [label, override] of stilled) {
  const verdict = motionVerdict({ ...calm, ...override })
  check(
    verdict.moving === false && verdict.still === true,
    `${label} stops the movement and draws the end state instead`,
  )
  check(verdict.reason.length > 10, `and says why, in words: “${verdict.reason}”`)
}
check(
  new Set(stilled.map(([, override]) => motionVerdict({ ...calm, ...override }).reason)).size === stilled.length,
  'each of the six reasons is its own, so the reader is told the truth about which one applied',
)

for (const [label, override] of [
  ['a hidden tab', { hidden: true }],
  ['an open dialog', { dialogsOpen: 1 }],
]) {
  const verdict = motionVerdict({ ...calm, ...override })
  check(
    verdict.moving === false && verdict.still === false,
    `${label} pauses the room without finishing it — the frame is held, not repainted`,
  )
}
check(
  motionVerdict({ ...calm, hidden: true, reduceMotion: true }).still === false,
  'and pausing outranks the preferences, so the first frame back is not a jump to the end state',
)

/* The ceiling. Four frames a route: one WebGL scene, three idle loops. */
check(
  LOOP_BUDGET.perRoute === LOOP_BUDGET.webgl + LOOP_BUDGET.idles,
  `the loop arithmetic adds up (${LOOP_BUDGET.webgl} + ${LOOP_BUDGET.idles} = ${LOOP_BUDGET.perRoute})`,
)
const registry = new LoopRegistry()
const releases = ['weather', 'hero-mist', 'touch-sheen'].map((name) => registry.start(name))
check(releases.every((release) => typeof release === 'function'), 'a route admits its three idle loops')
check(registry.start('fourth') === null, 'and refuses a fourth')
check(
  registry.report().refused.includes('fourth'),
  'naming what it refused, rather than dropping frames silently',
)
check(registry.start('weather') === null, 'and refusing a duplicate name, which would be the same canvas driven twice')
releases[0]()
check(registry.start('fourth') !== null, 'while a released slot is reusable — the ceiling is on concurrency, not on the session')
const oneSlot = new LoopRegistry(1)
check(
  oneSlot.start('a') !== null && oneSlot.start('b') === null,
  'the cap is a parameter, so the policy is testable at any size',
)

/* One writer for `data-motion`. The stylesheet's kill-switch block only works if
 * something sets the attribute, and it only *stays* working if one thing does. */
check(
  ambient.includes("[data-motion='reduced']"),
  'the stylesheet has a kill switch for the in-app motion setting',
)
const writers = [...sceneFiles('src').filter((file) => /dataset\.motion\s*=/.test(read(file)))]
check(
  writers.length === 1 && writers[0].endsWith('src/motion/MotionProvider.tsx'),
  `and exactly one module sets it (${writers.map((file) => file.replace('src/', '')).join(', ') || 'none'})`,
)
const frameStarters = sceneFiles('src').filter((file) => /(?<!cancel)requestAnimationFrame\(/.test(read(file)))
check(
  frameStarters.length === 1 && frameStarters[0].endsWith('src/motion/useMotion.ts'),
  `and one module starts animation frames, so the ceiling is real (${frameStarters.map((file) => file.replace('src/', '')).join(', ') || 'none'})`,
)

/* ---------------------------------------------------------------------------
 * 5. The verse never moves
 * ------------------------------------------------------------------------ */

console.log('\nthe verse:')

const global = read('src/styles/global.css')
const verseRule = global.slice(global.indexOf('.verse__line {'), global.indexOf('.transliteration'))

check(verseRule.includes('white-space: nowrap'), 'the couplet keeps its two-line, non-wrapping contract')
check(!/animation\s*:/.test(verseRule), 'and nothing animates it')
check(!/transition\s*:/.test(verseRule), 'and nothing transitions it')
check(
  !/@keyframes[\s\S]{0,200}verse/.test(global),
  'no keyframe anywhere targets the verse block',
)

/* ---------------------------------------------------------------------------
 * 6. Every scene answers forced colours
 * ------------------------------------------------------------------------ */

console.log('\nthe scenes:')

function sceneFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sceneFiles(path, found)
    else if (/\.(tsx|ts)$/.test(entry)) found.push(path)
  }
  return found
}

const mounting = sceneFiles('src/materials/scenes').filter((file) =>
  /<Canvas[\s>]/.test(read(file)),
)
check(mounting.length > 0, `the scan finds the scenes (${mounting.length})`)
check(
  mounting.every((file) => read(file).includes('applyContrastPass')),
  'and every one applies the forced-colours pass',
)

/* ---------------------------------------------------------------------------
 * report
 * ------------------------------------------------------------------------ */

if (failed > 0) {
  console.error(`\n✗ motion contract: ${failed} failure(s)`)
  process.exit(1)
}
console.log(
  '\n✓ motion contract: every keyframe is gated, every door has weather, the registers are sourced, the kill matrix is total, the loop ceiling holds and the verse holds still\n',
)
