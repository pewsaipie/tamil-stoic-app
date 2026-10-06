/**
 * The kill matrix, as one predicate.
 *
 * Before this file the app answered "may this move?" in at least three places —
 * `Atmosphere` computed its own `active`, `HeroCanvas` had its own reduced-motion
 * check, `TableStage` had a third — and the CSS layer had a fourth answer keyed
 * on `[data-motion='reduced']`, an attribute **nothing ever set**. That is the
 * failure mode of a rule enforced by repetition: four copies, one of them dead,
 * and no way to see it from any of them.
 *
 * So the answer is computed once, as a pure function of the conditions, and
 * everything else — the provider, the CSS, the hooks, the tests — is downstream
 * of it. It is pure on purpose: the whole matrix can be asserted in
 * `scripts/test-motion.mjs` on a machine with no browser and no GPU, which is
 * the only kind of machine CI has.
 *
 * Two distinct answers, not one, and the distinction is the accessibility
 * guarantee (motion plan L5):
 *
 *   **moving: false, still: true** — the reader has asked for less motion, or
 *   the system is painting the colours. The surface is not *removed*: it is
 *   drawn in its end state. The pot is full, the lamp is lit, the leaf is flat.
 *
 *   **moving: false, still: false** — the frame is paused, not finished. A
 *   hidden tab and a modal dialog both want the surface to stay exactly as it
 *   was and resume later; repainting them into an end state would be a jump.
 *
 * Getting those two cases mixed up is how "reduced motion" turns into "missing
 * feature" — the house rule from `docs/reality-first-ui.md` §5 is that it never
 * does.
 */
import type { MaterialTier } from '../materials/quality.ts'

export interface MotionConditions {
  /** The reader's own switch, in Reading settings. */
  reduceMotion: boolean
  /** `prefers-reduced-motion: reduce`. */
  prefersReducedMotion: boolean
  highContrast: boolean
  forcedColors: boolean
  /** `navigator.connection.saveData`, where the browser offers it. */
  saveData: boolean
  /** What `materials/quality.ts` decided for this device, including by choice. */
  tier: MaterialTier
  /** Modals are modal: nothing behind one keeps playing. */
  dialogsOpen: number
  /** `document.hidden`. */
  hidden: boolean
}

export interface MotionVerdict {
  /** May pixels move? */
  moving: boolean
  /** Should the surface be drawn in its end state rather than left as it was? */
  still: boolean
  /** Why, in one line, in the reader's language. */
  reason: string
}

/**
 * In order, and the order is the argument.
 *
 * Pausing comes first because a paused frame is not a decision about motion —
 * it is a decision about *when*, and it must not be overridden by a preference
 * either way. After that the reader's own switch outranks the operating
 * system's, the two colour modes outrank the device tier (an accessibility need
 * is not a capability), and save-data comes last before the tier because it is
 * a promise about bytes rather than about pixels.
 */
export function motionVerdict(conditions: MotionConditions): MotionVerdict {
  if (conditions.hidden) {
    return { moving: false, still: false, reason: 'the tab is in the background — the frame is held as it was' }
  }
  if (conditions.dialogsOpen > 0) {
    return { moving: false, still: false, reason: 'a dialog is open — the room behind it waits' }
  }
  if (conditions.reduceMotion) {
    return { moving: false, still: true, reason: 'you asked for less motion — every object is shown at rest' }
  }
  if (conditions.prefersReducedMotion) {
    return {
      moving: false,
      still: true,
      reason: 'your device asks for reduced motion — every object is shown at rest',
    }
  }
  if (conditions.highContrast) {
    return { moving: false, still: true, reason: 'high contrast is on — decoration steps out of the way' }
  }
  if (conditions.forcedColors) {
    return { moving: false, still: true, reason: 'your system is painting the colours — the scene is drawn flat' }
  }
  if (conditions.saveData) {
    return { moving: false, still: true, reason: 'save-data is on — the room is drawn once and left alone' }
  }
  if (conditions.tier === 'plain') {
    return { moving: false, still: true, reason: 'the flat reader is on — nothing animates' }
  }
  return { moving: true, still: false, reason: 'the room is alive' }
}
