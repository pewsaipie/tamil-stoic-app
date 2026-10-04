/**
 * The room's light, as data.
 *
 * §4.16 of the brief says themes are not themes — they are **the light in the
 * room**, so day and night have to be the same rig with the sun moved and the
 * wick trimmed, not two palettes. That makes the light a *shared* decision, and
 * a shared decision belongs in one pure module that every scene reads and no
 * scene can argue with.
 *
 * It is also where image-based lighting is decided, which is the single change
 * that makes PBR materials stop looking like painted matte. Two rules keep it
 * honest, and both exist because the alternative is a slow, quiet failure:
 *
 *   **Environment maps are vendored or absent, never fetched.** The app is an
 *   offline PWA and the precache is its contract (`scripts/test-pwa.mjs`). An
 *   HDRI pulled from a CDN at runtime would render beautifully in a hotel room
 *   and flat everywhere the reader actually is. So `HDRI_SLOTS` names files in
 *   the committed asset root, `resolveEnvironment` falls back to procedural when
 *   they are not there, and the fallback is a designed state rather than an error.
 *
 *   **Only the CC0 / no-attribution tier is eligible.** The material bake exists
 *   (`scripts/build-materials.mjs`) specifically so there is no third-party
 *   licence to honour. An HDRI set breaks that promise the moment it carries an
 *   attribution obligation, which is why the slot list and the ledger are one
 *   file and why `THIRD_PARTY_NOTICES.md` gains an entry per map, not per app.
 *
 * Nothing here imports `three` or touches `window`, for the same reason as
 * `forcedColours.ts`: the numbers are what CI can check.
 */
import type { MaterialTier } from './quality.ts'

/** The two states of the room. Mapped from the stored theme, not from the clock. */
export type TimeOfDay = 'day' | 'dusk'

/** The app's theme ids, as they are stored today (`lib/preferences.ts`). */
export type StoredTheme = 'palm' | 'night' | 'system'

/**
 * Where an HDRI would live if we had vendored one.
 *
 * Deliberately **not shipped by this change.** These paths are the contract for
 * the next one: drop a `.hdr` in `assets/env/`, add its provenance line, and the
 * scene picks it up with no other edit. Until then every environment is
 * procedural, and `source` says so out loud rather than pretending.
 */
export const HDRI_SLOTS: Record<TimeOfDay, string> = {
  day: 'assets/env/scriptorium-day.hdr',
  dusk: 'assets/env/scriptorium-dusk.hdr',
}

/**
 * The ceiling for one environment's contribution to the precache, after
 * compression. A 16-bit 4k HDRI is ~34 MB, which is more than the whole app is
 * today (16 MB) — so the budget is what forces the real decision: 1k–2k
 * half-float or RGBE-compressed maps, baked down, not raw authoring exports.
 */
export const ENV_BUDGET_BYTES = 1.75 * 1024 * 1024

/** Kelvin of the room's key light. Real values, so a material cannot be tuned to a lie. */
const COLOR_TEMPERATURE: Record<TimeOfDay, number> = {
  day: 5600,
  dusk: 2100,
}

export interface EnvironmentSpec {
  timeOfDay: TimeOfDay
  /** `hdri` only when a vendored map is actually available. */
  source: 'hdri' | 'procedural'
  /** The URL the scene should load, or `null` when it must not load anything. */
  url: string | null
  colorTemperature: number
  /** The lamp or the sun. */
  keyIntensity: number
  ambientIntensity: number
  /** How much of the environment map reaches a surface. */
  environmentIntensity: number
  exposure: number
  /**
   * `null` means post is off, which is what the flat tiers require: bloom is a
   * colour decision, and a colour decision is not ours to make in forced colours.
   */
  bloom: { threshold: number; strength: number } | null
  shadows: boolean
  /**
   * Whether the animated flicker runs. Reduced motion and the no-canvas tier
   * both turn it off; the *end state* of the light is unchanged either way.
   */
  flicker: boolean
}

/** Theme storage → the light in the room. */
export function timeOfDayFor(theme: StoredTheme | 'system', prefersDark = false): TimeOfDay {
  if (theme === 'palm') return 'day'
  if (theme === 'night') return 'dusk'
  return prefersDark ? 'dusk' : 'day'
}

export interface ResolveInput {
  timeOfDay: TimeOfDay
  tier: MaterialTier
  /** Supplied by the caller, never probed here: whether the vendored map exists. */
  hdriAvailable?: Partial<Record<TimeOfDay, boolean>>
}

/**
 * The rig for one tier, in one light.
 *
 * `contrast` (forced colours) and `css3d` (no canvas) get the *same* geometry
 * decision as `full` — the room is the room — but they lose post and shadows.
 * That asymmetry is the point of the whole file: a reader in high contrast is
 * being denied colour and detail, not shape and light, and denying them the
 * light would be denying them the thing that makes an object an object.
 */
export function resolveEnvironment({ timeOfDay, tier, hdriAvailable = {} }: ResolveInput): EnvironmentSpec {
  const base = {
    timeOfDay,
    colorTemperature: COLOR_TEMPERATURE[timeOfDay],
  }

  // The flat tiers have no maps and no post. Note that this branch returns
  // *before* the HDRI is consulted: even if a map were available, binding it in
  // forced colours would put a colour we did not choose back into the frame.
  if (tier === 'contrast') {
    return {
      ...base,
      source: 'procedural',
      url: null,
      keyIntensity: 1.9,
      ambientIntensity: 0.55,
      environmentIntensity: 0,
      exposure: 1,
      bloom: null,
      shadows: false,
      flicker: true,
    }
  }

  const day = timeOfDay === 'day'

  // `still` is the same scene with the moving parts stopped: no shadows (they
  // are the most expensive thing that changes per frame) and no post.
  if (tier === 'still' || tier === 'css3d' || tier === 'plain') {
    return {
      ...base,
      source: 'procedural',
      url: null,
      keyIntensity: day ? 1.6 : 1.15,
      ambientIntensity: day ? 0.3 : 0.16,
      environmentIntensity: day ? 0.5 : 0.32,
      exposure: day ? 1 : 1.05,
      bloom: null,
      shadows: false,
      flicker: false,
    }
  }

  const url = HDRI_SLOTS[timeOfDay]
  const hasHdri = hdriAvailable[timeOfDay] === true
  return {
    ...base,
    source: hasHdri ? 'hdri' : 'procedural',
    url: hasHdri ? url : null,
    // Daylight through a doorway is a hard-ish key with a bright room to bounce
    // in it; dusk is one small flame in a dim room, so the ambient must not
    // flatten the pools of shadow or the lamp stops being a lamp.
    keyIntensity: day ? 2.1 : 1.35,
    ambientIntensity: day ? 0.38 : 0.14,
    environmentIntensity: hasHdri ? (day ? 0.85 : 0.62) : day ? 0.55 : 0.32,
    exposure: day ? 0.98 : 1.08,
    // Threshold sits above the lamp's own brightness on purpose: bloom is for
    // the flame and the brass catching it, not for lifting the whole leaf.
    bloom: { threshold: day ? 0.92 : 0.78, strength: day ? 0.22 : 0.4 },
    shadows: true,
    flicker: true,
  }
}

/**
 * Approximate a blackbody temperature as an sRGB multiplier.
 *
 * Scenes need *a* colour for their light and Kelvin is the honest quantity;
 * this is the Tanner Helland approximation, good to a couple of hundred Kelvin
 * over the range the room actually uses (2100–5600). It is here rather than in a
 * scene so a day light and a dusk light in different screens are the same light.
 */
export function kelvinToRgb(kelvin: number): { r: number; g: number; b: number } {
  const temperature = Math.min(40000, Math.max(1000, kelvin)) / 100

  let r: number
  if (temperature <= 66) r = 255
  else r = 329.698727446 * (temperature - 60) ** -0.1332047592

  let g: number
  if (temperature <= 66) g = 99.4708025861 * Math.log(temperature) - 161.1195681661
  else g = 288.1221695283 * (temperature - 60) ** -0.0755148492

  let b: number
  if (temperature >= 66) b = 255
  else if (temperature <= 19) b = 0
  else b = 138.5177312231 * Math.log(temperature - 10) - 305.0447927307

  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n))) / 255
  return { r: clamp(r), g: clamp(g), b: clamp(b) }
}
