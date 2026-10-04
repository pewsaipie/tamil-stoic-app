/**
 * How much reality this device gets.
 *
 * The brief is explicit that the material world is the default experience and
 * the flat UI is a real, supported mode — not a broken fallback. That promise
 * lives here, in one place, as three tiers:
 *
 *   **full**  — live WebGL surfaces, physics, light, sound.
 *   **still** — the *same* objects, pre-rendered, with instant state swaps.
 *               Chosen for reduced motion, no WebGL, a weak GPU, save-data, or
 *               by preference. It is a deliberate design, not a degraded one:
 *               the reader still sees a wax seal break and a leaf unroll.
 *   **plain** — the flat, AA-verified typographic UI that shipped before the
 *               rework. Kept forever. Forced-colors and print land here, and a
 *               reader may choose it at any time.
 *
 * Nothing in the scene layer reads `window` directly; everything asks this
 * module, so the decision is made once, is inspectable, and is testable.
 */
import { MATERIALS_KEY, readMaterialsMode, writeMaterialsMode } from './preference.ts'

export type MaterialMode = 'auto' | 'full' | 'still' | 'plain'
export type MaterialTier = 'full' | 'still' | 'plain'

export interface CapabilityReport {
  webgl: boolean
  webgl2: boolean
  /** `navigator.deviceMemory`, in GB, where the browser reveals it. */
  deviceMemory?: number
  cores: number
  saveData: boolean
  reducedMotion: boolean
  forcedColors: boolean
}

export interface TierDecision {
  tier: MaterialTier
  /** Why, in one line — shown in Reading settings so the choice is never opaque. */
  reason: string
  /** Whether the reader chose it, rather than the device deciding. */
  byChoice: boolean
}

function hasWebGL(): { webgl: boolean; webgl2: boolean } {
  if (typeof document === 'undefined') return { webgl: false, webgl2: false }
  try {
    const canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2')
    const gl = gl2 ?? canvas.getContext('webgl')
    if (!gl) return { webgl: false, webgl2: false }
    // Release the probe's context immediately: browsers cap live contexts, and
    // a leaked probe steals one from the scene that is about to be built.
    const context = gl as WebGLRenderingContext
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return { webgl: true, webgl2: gl2 !== null }
  } catch {
    return { webgl: false, webgl2: false }
  }
}

export function reportCapabilities(): CapabilityReport {
  if (typeof window === 'undefined') {
    return {
      webgl: false,
      webgl2: false,
      cores: 1,
      saveData: false,
      reducedMotion: false,
      forcedColors: false,
    }
  }

  const { webgl, webgl2 } = hasWebGL()
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  const memory = nav.deviceMemory

  return {
    webgl,
    webgl2,
    ...(typeof memory === 'number' ? { deviceMemory: memory } : {}),
    cores: nav.hardwareConcurrency ?? 4,
    saveData: nav.connection?.saveData === true,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    forcedColors: window.matchMedia('(forced-colors: active)').matches,
  }
}

/**
 * Choose a tier. Pure, so the whole matrix can be tested without a browser.
 *
 * The ordering below is a statement of values, not an implementation detail,
 * and it has three distinct bands:
 *
 * **1. An explicit choice, when the choice is between *quieter* options.**
 * "The flat reader" and "Still images" are always available and always
 * honoured, on any device.
 *
 * **2. Accessibility, and impossibility.** These outrank everything, including
 * an explicit request for the full experience — which is the non-obvious part,
 * and the part worth defending. A WebGL canvas cannot participate in forced
 * colours, so a reader whose system demands them would get a scene that
 * silently ignores the setting; the flat reader is the only honest answer. No
 * WebGL at all is not a preference, it is a fact. Reduced motion is a
 * documented request not to move things, and the still tier satisfies it
 * without taking the objects away.
 *
 * **3. Heuristics, and they yield to the reader.** Memory and core count are
 * guesses about what a device can cope with. They are good enough to pick a
 * default and nowhere near good enough to overrule someone who has gone into
 * settings and asked for every detail.
 */
export function decideTier(mode: MaterialMode, caps: CapabilityReport): TierDecision {
  // -- Band 1: quieter is always allowed.
  if (mode === 'plain') {
    return { tier: 'plain', reason: 'You chose the flat reader.', byChoice: true }
  }
  if (mode === 'still') {
    return { tier: 'still', reason: 'You chose still images.', byChoice: true }
  }

  // -- Band 2: accessibility and hard limits.
  if (caps.forcedColors) {
    return {
      tier: 'plain',
      reason: 'Your system asks for forced colours.',
      byChoice: false,
    }
  }
  if (!caps.webgl) {
    return { tier: 'plain', reason: 'This device has no WebGL.', byChoice: false }
  }
  // WebGL 1 is no longer enough: three.js dropped it in r163, so a WebGL1-only
  // browser cannot run the scene at all and gets the still images.
  if (!caps.webgl2) {
    return { tier: 'still', reason: 'This browser only offers WebGL 1.', byChoice: false }
  }
  if (caps.reducedMotion) {
    return { tier: 'still', reason: 'You prefer reduced motion.', byChoice: false }
  }

  // -- Band 3: what is left is a judgement call, so the reader may overrule it.
  if (mode === 'full') {
    return { tier: 'full', reason: 'You chose every detail.', byChoice: true }
  }
  if (caps.saveData) {
    return { tier: 'still', reason: 'Your browser is in data-saving mode.', byChoice: false }
  }
  const tightMemory = caps.deviceMemory !== undefined && caps.deviceMemory <= 2
  if (tightMemory || caps.cores <= 2) {
    return { tier: 'still', reason: 'This device is a little tight on memory.', byChoice: false }
  }

  return { tier: 'full', reason: 'Live materials.', byChoice: false }
}

/** Read the stored mode, defaulting to `auto`. */
export { readMaterialsMode, writeMaterialsMode, MATERIALS_KEY }
