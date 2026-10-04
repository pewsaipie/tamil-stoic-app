/**
 * The ceremony's clock.
 *
 * The seal has seven physical beats — the thumb presses, the wax fails, the
 * cord goes slack, the leaf is let go, it springs open, it settles, the room
 * hands the reader back to the page — and they are not seven animations. They
 * are one sequence, so the scene keeps a **single monotonic clock** and asks
 * this module what that moment means.
 *
 * The first version gave each phase its own `elapsed` counter, which reads
 * tidier and does not survive contact with the sequence: the cord's fall begins
 * during the fracture and ends during the unroll, so its counter had to be
 * re-based twice, and every re-base is a jump — the cord teleporting backwards
 * mid-fall. With one clock, `0.68` means `0.68` to the wax, the cord, the leaf
 * and the camera, and nobody has to agree about when anything started.
 *
 * Kept free of three.js and React so the boundaries can be checked as a table.
 * An off-by-one on a `<=` is invisible in a running scene and obvious in a
 * table, which is the whole argument for this file existing.
 */

/** The thumb is fully pressed in; the wax has not yet failed. */
export const T_PRESS_END = 0.28
/** The wax fails. Sound, haptic, and the first shard leaves the seal. */
export const T_BREAK = 0.4
/** The cord is free and starts to fall — during the break, not after it. */
export const T_CORD_RELEASE = T_BREAK + 0.28
/** The leaf is let go and begins to unroll. */
export const T_UNROLL_START = T_BREAK + 0.55
/** The leaf has come off the coil; the last curl is still to straighten. */
export const T_UNROLL_END = T_UNROLL_START + 2.35
/** The leaf is at rest and the DOM couplet takes over. */
export const T_REVEAL = T_UNROLL_END + 0.55

/** Total duration of the ceremony, for callers that need to plan around it. */
export const SEAL_TIMELINE_SECONDS = T_REVEAL

/**
 * How much of the strip is off the coil when the pull is finished.
 *
 * Not 1. A leaf is not a ribbon: the last two centimetres keep a curl of their
 * own, and watching that curl straighten is the difference between a leaf that
 * has stopped moving and a leaf that has *come to rest*. So the pull finishes
 * at 94%, and the remaining 0.55 s is the curl relaxing — which is also where
 * the flutter lives, decaying to nothing as the strip approaches flat.
 */
const PULLED = 0.94

export type Phase = 'sealed' | 'pressing' | 'breaking' | 'unrolling' | 'open'

/**
 * What the given moment in the timeline is.
 *
 * `sealed` is the resting state before anything is pressed, which is why a
 * negative `t` is legal: the scene mounts at `t = -1` rather than `0`, so a
 * leaf that arrives already open cannot be mistaken for a press in progress.
 */
export function phaseAt(t: number): Phase {
  if (t < 0) return 'sealed'
  if (t < T_BREAK) return 'pressing'
  if (t < T_UNROLL_START) return 'breaking'
  if (t < T_REVEAL) return 'unrolling'
  return 'open'
}

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value)

/**
 * How much of the strip has come off the coil.
 *
 * During the pull this is **linear**, and that is a statement about physics
 * rather than laziness: a hand pulling a strip off a coil moves the strip at a
 * steady speed, and the fact that the coil then has to spin faster as it empties
 * is a *consequence* the leaf geometry works out for itself. Easing this would
 * be animating the pull instead of performing it.
 *
 * The settle is the one place easing belongs, because what is happening there
 * is a leaf relaxing rather than a hand moving: it approaches flat without ever
 * quite arriving, which is what coming to rest looks like.
 */
export function unrollAt(t: number): number {
  if (t <= T_UNROLL_START) return 0
  if (t >= T_UNROLL_END) {
    const settle = clamp01((t - T_UNROLL_END) / Math.max(1e-6, T_REVEAL - T_UNROLL_END))
    const relaxed = 1 - Math.pow(1 - settle, 3)
    return PULLED + (1 - PULLED) * relaxed
  }
  return PULLED * ((t - T_UNROLL_START) / (T_UNROLL_END - T_UNROLL_START))
}

/**
 * How far the reveal has come along, 0 to 1 — the camera's parameter.
 *
 * Reaches 1 when the strip is off the coil, so the camera has finished its
 * move and is *still* while the leaf settles. A camera that is still travelling
 * during the last beat draws attention to itself at the exact moment the reader
 * should be arriving at the couplet.
 */
export function openingAt(t: number): number {
  return clamp01((t - T_UNROLL_START) / (T_UNROLL_END - T_UNROLL_START))
}
