/**
 * The reader's material preference.
 *
 * Stored under its own key rather than folded into the legacy preferences
 * record on purpose: the flat reader (root `index.html`, `js/`) reads that
 * record and must keep understanding it exactly as it always has. Adding a key
 * it has never heard of costs nothing; changing one of its keys would be a
 * migration. See `lib/preferences.ts` for that contract.
 */
export const MATERIALS_KEY = 'tamil-stoic-materials-v1'

const MODES = ['auto', 'full', 'still', 'plain'] as const
export type StoredMaterialMode = (typeof MODES)[number]

export function readMaterialsMode(): StoredMaterialMode {
  if (typeof window === 'undefined') return 'auto'
  try {
    const raw = window.localStorage.getItem(MATERIALS_KEY)
    return MODES.find((mode) => mode === raw) ?? 'auto'
  } catch {
    // Private mode: the app still runs, the choice just does not persist.
    return 'auto'
  }
}

export function writeMaterialsMode(mode: StoredMaterialMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(MATERIALS_KEY, mode)
  } catch {
    // ignore
  }
}

/**
 * Sound is its own switch, and it starts **off**.
 *
 * A reader opening a couplet on a bus did not ask for a wax seal to crack out
 * loud. Sound is a reward for opting in, never a default.
 */
export const SOUND_KEY = 'tamil-stoic-sound-v1'

export function readSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SOUND_KEY) === 'on'
  } catch {
    return false
  }
}

export function writeSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off')
  } catch {
    // ignore
  }
}
