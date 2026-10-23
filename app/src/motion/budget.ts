/**
 * The motion budget — the numbers that keep "every surface alive" from meaning
 * "every surface burning the reader's battery".
 *
 * These are constants rather than local literals because they are a promise, and
 * a promise that lives in two files is a promise that will drift. The particles
 * are counted here, the idle timings are counted here, the loops a route may run
 * are counted here, and `scripts/test-motion.mjs` asserts that they add up and
 * that nothing in the app quietly exceeds them.
 *
 * It lives in `src/motion/` rather than beside the materials because it governs
 * both halves of the room: the WebGL scene on the table and the Canvas-2D
 * weather over it, the CSS loops and the rAF loops. One file, so there is one
 * place to look when a screen is warmer than it should be.
 */

export const PARTICLE_BUDGET = {
  /** The most moving particles any one route may draw at once. */
  perRoute: 60,
  /** The global weather layer: petals by day, fireflies at night. */
  atmosphere: 16,
  /** Dust in the lamp's beam, on the table. */
  dust: 36,
} as const

/**
 * How many animation frames one route may keep running.
 *
 * The arithmetic is deliberately shown rather than implied, because "four" on
 * its own is a number nobody can check: a route gets its **one** WebGL scene —
 * the object the reader is actually handling — and **three** idle loops around
 * it, which is enough for weather, a second small canvas and a material
 * response, and not enough for a screen that shimmers everywhere at once.
 *
 * `LoopRegistry` in `loops.ts` enforces the idle half by refusing the fourth
 * registration and *naming* what it refused, so the ceiling is a thing the app
 * reports rather than a thing a reviewer has to remember.
 */
export const LOOP_BUDGET = {
  perRoute: 4,
  webgl: 1,
  idles: 3,
} as const

/**
 * Idle *movement* is weather, not noise: a loop that translates or scales may
 * not be faster than this. Opacity-only signals are exempt — a gold glint that
 * takes ten seconds is not a glint — and so are the two fast weather registers,
 * because monsoon rain and noon heat are fast in the world the words come from.
 *
 * The exemption is a named list rather than a rule with holes, so adding a fast
 * loop means writing down why it is fast.
 */
export const IDLE_PERIOD_SECONDS_MIN = 6

export const FAST_LOOPS: Record<string, string> = {
  glint: 'opacity only — gold catching the light, no movement',
  twinkle: 'opacity only — stars',
  'rain-fall': 'mullai weather: the first rain is quick by nature, on a door only',
  'heat-shimmer': 'palai weather: noon heat shimmers, on a door only',
}

/** How long a material's interaction may take before it stops being a response. */
export const INTERACTION_MAX_MS = 400

/**
 * The ornament budget — the canon dressing's own numbers.
 *
 * The route dressing (docs/sangam-theme-canon.md) composites a small number of
 * baked alpha layers at the edges of a screen. These are the ceilings, kept
 * beside the loop and particle ceilings because the same drift kills all three:
 * a limitation that lives in one file is a promise, in two is folklore.
 *
 * The layers must sit *under* the loop ceiling: the dressing never opens a
 * second WebGL canvas (LOOP_BUDGET.webgl stays at 1), and its motion is CSS,
 * registered in ambient.css like everything else. Bytes are enforced by
 * `scripts/build-ornaments.mjs --check` against the committed WebP under
 * `assets/img/ornaments/`, so a prettier-but-heavier layer fails CI rather
 * than shipping.
 */
export const ORNAMENT_BUDGET = {
  /** Full-canvas alpha layers a route's dressing may composite (mist is CSS). */
  layersPerRoute: 4,
  /** Heaviest single processed layer, bytes. */
  maxLayerBytes: 260_000,
  /** Biggest dressed route's total, bytes (six masters of one look would not fit twice). */
  maxRouteBytes: 780_000,
  /** The whole six-route canon ceiling, per docs/sangam-theme-canon.md §4. */
  maxAllRoutesBytes: 4_000_000,
} as const

/**
 * The material exceptions — the two movements that are longer than an
 * interaction because the material is.
 *
 * `INTERACTION_MAX_MS` governs a *response*: what happens when the reader
 * presses something. It does not govern what a pot does. Throwing a pot takes
 * as long as throwing a pot takes, and water poured into it does not hurry —
 * these are **state transitions**, and the reader is watching a vessel being
 * made and filled, not waiting on a button.
 *
 * The numbers here are a ceiling, and they are checked against the scene's own
 * constants by `test-motion.mjs` rather than trusted: if the throw is retuned in
 * `TableScene.tsx` past what is declared here, the test fails, because the
 * alternative is a budget in one file and a duration in another drifting apart
 * until neither means anything.
 *
 * (There was a third exception here once — an ola leaf unrolling in 3,850 ms.
 * The seal ceremony was withdrawn and the leaf now lies open on the table, so
 * the exception went with it. An exception nobody can point at is worse than no
 * exception at all.)
 */
export const MATERIAL_EXCEPTION_MS = {
  /** Thrown on the wheel (2.6 s) and set down (0.9 s). */
  potThrow: 3500,
  /** The day's measure of water poured in. */
  potPour: 2400,
} as const
