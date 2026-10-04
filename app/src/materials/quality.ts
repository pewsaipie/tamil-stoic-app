/**
 * How much reality this device gets.
 *
 * The brief is explicit that the material world is the default experience and
 * the flat UI is a real, supported mode — not a broken fallback. That promise
 * lives here, in one place, as three tiers:
 *
 *   **full**     — live WebGL surfaces, physics, light, sound.
 *   **still**    — the *same* live scene with the moving parts stopped: no
 *                  shadows, no post. Chosen for reduced motion, a weak GPU,
 *                  save-data, or by preference.
 *   **contrast** — forced colours. Same geometry, same light, **no maps and no
 *                  colour of our own**: every surface is a tone mixed between
 *                  the system's `Canvas` and `CanvasText`. See
 *                  `forcedColours.ts`, which is where the rules live.
 *   **css3d**    — no canvas at all. Real CSS perspective with parallax, over
 *                  the baked plates when they exist. This is the tier that needs
 *                  no GPU, which is what makes it the honest answer to a device
 *                  that cannot run `still`.
 *   **plain**    — the flat, AA-verified typographic UI that shipped before the
 *                  rework. No longer an accessibility landing: it is reached by
 *                  an explicit choice, or by print. Kept, not demoted.
 *
 * Nothing in the scene layer reads `window` directly; everything asks this
 * module, so the decision is made once, is inspectable, and is testable.
 */
import { MATERIALS_KEY, readMaterialsMode, writeMaterialsMode } from './preference.ts'

export type MaterialMode = 'auto' | 'full' | 'still' | 'plain'
export type MaterialTier = 'full' | 'still' | 'contrast' | 'css3d' | 'plain'

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
 * **2. Accessibility, and impossibility.** These outrank everything, including an
 * explicit request for the full experience — but *how* they outrank it changed,
 * and that change is the whole difference between this doctrine and the first
 * cut of the brief.
 *
 * A reader in forced colours used to be handed the flat DOM reader, on the
 * reasoning that a canvas cannot be recoloured by the browser and so rendering
 * the scene would silently ignore their setting. That reasoning was correct and
 * the conclusion was a dodge: it made an accessibility setting the reason a
 * person gets no objects at all. Now the canvas answers — `contrast` keeps the
 * form, the light and the material response, and gives up colour and texture,
 * which is exactly what the platform asked for and nothing more. An explicit
 * `"Every detail"` still cannot win, because forced colours is not a preference
 * about detail. It is a requirement about legibility.
 *
 * No WebGL at all is a fact rather than a preference, and it lands on `css3d`:
 * perspective, parallax and the baked plates, with no canvas anywhere. This band
 * also closes a bug the old matrix shipped. A WebGL 1-only browser was sent to
 * `still`, and `still` is a live scene — three.js dropped WebGL 1 in r163, so
 * that reader was promised a tier that cannot render. `css3d` is the first
 * fallback in this file that needs no GPU at all, which is the property a
 * fallback was always supposed to have.
 *
 * Reduced motion is a documented request not to move things, and `still`
 * satisfies it without taking the objects away.
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
      tier: 'contrast',
      reason: 'Your system asks for forced colours, so the objects keep their form and give up their colour.',
      byChoice: false,
    }
  }
  if (!caps.webgl) {
    return {
      tier: 'css3d',
      reason: 'This device cannot run a canvas, so the objects are rendered in CSS depth.',
      byChoice: false,
    }
  }
  // WebGL 1 is not enough: three.js dropped it in r163, so a WebGL1-only browser
  // cannot run the scene at all. It gets the renderer that needs no GPU, not the
  // one that only pretends to.
  if (!caps.webgl2) {
    return {
      tier: 'css3d',
      reason: 'This browser offers only WebGL 1, which cannot run the scene.',
      byChoice: false,
    }
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
