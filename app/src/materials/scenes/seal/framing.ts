/**
 * Where the camera stands, and why.
 *
 * ## The problem
 *
 * The scene has two subjects a factor of fifty apart in size. Sealed, the
 * subject is a coil 75 mm wide and 28 mm across with a wax seal on top. Open, it
 * is a 341 mm strip lying on a table — and the strip runs along −z, *straight
 * away from the camera*. Photographed from behind, a 341 mm strip at the scale
 * of a 28 mm coil is a thin wedge disappearing into the distance: you cannot see
 * what it is, and you cannot read a couplet written along it.
 *
 * So there are two framings, and the move between them is the reveal:
 *
 * - **Sealed**: nearly square on, a fifth of a metre away, looking slightly
 *   down. The subject is the coil: its width wrapped around the seal.
 * - **Open**: the camera has swung round to about 60° and pulled back, so the
 *   strip now lies *across* the picture instead of running out of it.
 *
 * ## Why the numbers are computed rather than tuned
 *
 * The stage the scene is drawn in is `h-[clamp(280px,46vw,400px)] w-full`, so
 * its aspect is anywhere from about 1.2 to about 2.1 depending on the device. A
 * hand-tuned camera is correct for exactly one of those and crops the leaf on
 * the others — which is not a theoretical worry: the first version of this file
 * put the sealed roll at 186% of the frame height and let the open leaf fall off
 * the bottom of a wide stage.
 *
 * So the framing is stated the way it actually is — a subject, with a centre and
 * a radius — and the distance is *solved*: for a sphere of radius R at distance
 * d, every point of it projects within `asin(R/d)` of the frame's centre, so
 * placing the camera at `R / sin(halfFov)` puts the whole subject in shot on any
 * stage, tight to whichever axis is the binding one. This is the standard
 * fit-to-view calculation, and it is why `framingAt` takes an aspect at all.
 *
 * The subject radii are measured, not estimated: `scripts/test-materials.mjs`
 * computes them from the real geometry and fails if these constants drift away
 * from what the leaf actually is.
 *
 * This module imports nothing — no three.js, no React — so the projection can be
 * checked in a plain Node test. A framing bug is invisible in a diff and obvious
 * in a projection.
 */

export const SCENE_FOV_DEGREES = 32

const HALF_FOV_V = ((SCENE_FOV_DEGREES * Math.PI) / 180) / 2

/** A little air around the subject, so nothing is ever clipped by the edge. */
const HEADROOM = 1.06

interface Subject {
  /** Centre of the bounding sphere, in world metres. */
  centre: [number, number, number]
  /** Radius of the bounding sphere, in world metres — measured, not guessed. */
  radius: number
  /** Camera elevation above the table, in radians. */
  elevation: number
  /** Camera azimuth from straight-on (+z), in radians. */
  azimuth: number
}

/**
 * Sealed. Measured subject: the coil spans x ±38 mm, y 0.9…30.4 mm, z ±14 mm,
 * so its bounding sphere is r ≈ 40 mm about (0, 15.6, 0). The wax seal rides on
 * top of that and the cord hangs below, hence 44 mm.
 */
const SEALED: Subject = {
  centre: [0, 0.016, 0],
  radius: 0.044,
  elevation: 0.34,
  azimuth: 0,
}

/**
 * Open. Measured subject: the flat leaf spans z 0…−340 mm, x ±38 mm, so r ≈ 173 mm
 * about (0, 2, −170 mm).
 *
 * The azimuth is the load-bearing number. At 0° the strip runs dead away from
 * the camera and projects at 55% of its length; at 60° it projects at 90% and
 * lies across the picture. Past about 75° it starts to read as a bird's-eye
 * plan, and the table's far edge comes into shot — 60° is a three-quarter view,
 * which is what a person takes when they want to show you something long.
 *
 * The elevation also rises a little, from a natural 20° to 28°, for the same
 * reason: looking further down compresses the strip's length less.
 */
const OPEN: Subject = {
  centre: [0, 0.002, -0.17],
  radius: 0.18,
  elevation: 0.49,
  azimuth: 1.05,
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

/** Smooth in and out, so the camera starts and stops without a jolt. */
export const easeInOut = (value: number): number =>
  value < 0.5 ? 2 * value * value : 1 - (1 - value) * (1 - value) * 2

/** The subject the camera is framing at a given moment. Exported for the test. */
export function subjectAt(opening: number): Subject {
  const k = easeInOut(clamp01(opening))
  return {
    centre: [
      lerp(SEALED.centre[0], OPEN.centre[0], k),
      lerp(SEALED.centre[1], OPEN.centre[1], k),
      lerp(SEALED.centre[2], OPEN.centre[2], k),
    ],
    radius: lerp(SEALED.radius, OPEN.radius, k),
    elevation: lerp(SEALED.elevation, OPEN.elevation, k),
    azimuth: lerp(SEALED.azimuth, OPEN.azimuth, k),
  }
}

export interface CameraFraming {
  position: [number, number, number]
  look: [number, number, number]
}

/**
 * The camera for a point in the unroll.
 *
 * @param opening 0 while the leaf is sealed, 1 when it is lying flat.
 * @param aspect  The stage's width divided by its height.
 * @param sway    Optional small rotation from the reader's pointer, in radians.
 */
export function framingAt(
  opening: number,
  aspect: number,
  sway?: { azimuth: number; elevation: number },
): CameraFraming {
  const subject = subjectAt(opening)

  // The narrower of the two half-angles decides how far back the camera has to
  // stand for the subject to fit in both directions.
  const safeAspect = Math.max(0.6, aspect)
  const halfFovH = Math.atan(Math.tan(HALF_FOV_V) * safeAspect)
  const halfFov = Math.min(HALF_FOV_V, halfFovH)
  const distance = (subject.radius / Math.sin(halfFov)) * HEADROOM

  const azimuth = subject.azimuth + (sway?.azimuth ?? 0)
  const elevation = subject.elevation + (sway?.elevation ?? 0)
  const cosE = Math.cos(elevation)

  return {
    position: [
      subject.centre[0] + Math.sin(azimuth) * cosE * distance,
      subject.centre[1] + Math.sin(elevation) * distance,
      subject.centre[2] + Math.cos(azimuth) * cosE * distance,
    ],
    look: subject.centre,
  }
}
