/**
 * The daily ritual (நாள்தோறும்) — the reader's own record of "I came back".
 *
 * Everything here is device-local, and the shape is deliberately small and
 * forgiving: a reader who never opens the settings sheet still has a valid
 * state, and a state written by a future version that adds fields is read
 * without complaint.
 *
 *   tamil-stoic-ritual-v1   { sat, reminder, [retired: seal, unrolled] }
 *
 * Three promises shape the design:
 *
 *   1. **Nothing gates the text.** The couplet is simply there when the reader
 *      arrives; the ritual is the *minute* spent with it, not a lock on it.
 *   2. **Nothing here is a streak to protect.** `satStreak` counts *days sat
 *      with*, and nothing in the app ever says a chain was broken. A missed day
 *      is a day, not a failure.
 *   3. **Day boundaries are local** — see `lib/dayKey.ts`.
 *
 * ## What was retired, and why the reader sees nothing missing
 *
 * This module used to carry a `seal: boolean` and an `unrolled` day-map: today's
 * couplet arrived behind a rolled ola leaf with a wax seal, and the reader
 * broke the seal to unroll it. The ceremony was withdrawn on the reader's
 * instruction — *"a waste for an idea"* — so the couplet is now always open.
 * Old states that still contain `seal` and `unrolled` are read and ignored:
 * `writeRitual` simply stops writing them, so a reader who downgrades is not
 * asked to migrate anything.
 */
import { daysBetweenKeys, isDayKey, localDayKey, shiftDayKey } from './dayKey.ts'

export const RITUAL_KEY = 'tamil-stoic-ritual-v1'

export interface ReminderSettings {
  enabled: boolean
  /** Local hour, 0–23. */
  hour: number
  /** Local minute, 0–59. */
  minute: number
}

export interface RitualState {
  /** Day keys on which the reader finished sitting with the couplet. */
  sat: Record<string, true>
  reminder: ReminderSettings
}

/** The hours offered in settings — early morning, midday, evening, night. */
export const REMINDER_HOURS: readonly number[] = [6, 9, 12, 18, 21]

export const DEFAULT_RITUAL: RitualState = {
  sat: {},
  reminder: { enabled: false, hour: 6, minute: 0 },
}

/* ---------------------------------------------------------------------------
 * Storage — the same defensive pattern the rest of the reader uses: private
 * browsing can deny every read and write, and the app must keep working.
 * ------------------------------------------------------------------------ */

function readRaw(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(RITUAL_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function writeRitual(state: RitualState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RITUAL_KEY, JSON.stringify(state))
  } catch {
    // Private mode: the ritual lives for this session only.
  }
}

function readDays(value: unknown): Record<string, true> {
  const out: Record<string, true> = {}
  if (typeof value !== 'object' || value === null) return out
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (isDayKey(key)) out[key] = true
  }
  return out
}

function readReminder(value: unknown): ReminderSettings {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_RITUAL.reminder }
  const raw = value as Record<string, unknown>
  const hour = Number(raw['hour'])
  const minute = Number(raw['minute'])
  return {
    enabled: raw['enabled'] === true,
    hour: Number.isInteger(hour) ? Math.min(23, Math.max(0, hour)) : DEFAULT_RITUAL.reminder.hour,
    minute: Number.isInteger(minute)
      ? Math.min(59, Math.max(0, minute))
      : DEFAULT_RITUAL.reminder.minute,
  }
}

export function readRitual(): RitualState {
  const stored = readRaw()
  if (!stored) return { ...DEFAULT_RITUAL, sat: {}, reminder: { ...DEFAULT_RITUAL.reminder } }

  // `seal` and `unrolled` are read as absent regardless of what is on disk:
  // a state written by the previous version must not resurrect the ceremony.
  return {
    sat: readDays(stored['sat']),
    reminder: readReminder(stored['reminder']),
  }
}

/* ---------------------------------------------------------------------------
 * Queries — pure, so the test suite can exercise them without a browser.
 * ------------------------------------------------------------------------ */

/** Has the reader sat with the couplet on this day? */
export function didSit(days: Record<string, true>, day: string = localDayKey()): boolean {
  return days[day] === true
}

/**
 * Consecutive days ending at `day` on which the reader sat with the couplet.
 *
 * Walks backwards rather than storing a counter, so a counter can never drift
 * out of step with the days it claims. Ends quietly at the first gap — the app
 * never reports that a chain ended.
 */
export function satStreak(days: Record<string, true>, day: string = localDayKey()): number {
  if (!isDayKey(day)) return 0
  let streak = didSit(days, day) ? 1 : 0
  let cursor = day
  // A long history is bounded: two years of daily sitting is already generosity.
  for (let step = 0; step < 730; step += 1) {
    cursor = shiftDayKey(cursor, -1)
    if (!didSit(days, cursor)) break
    streak += 1
  }
  return streak
}

/** Days on which the reader sat with the couplet, most recent first. */
export function satDays(days: Record<string, true>): string[] {
  return Object.keys(days).sort().reverse()
}

/**
 * Whole days since the reader last sat with a couplet — `null` when they never
 * have. Used only to decide how warm a greeting to offer; never to chide.
 */
export function daysSinceLastSit(
  days: Record<string, true>,
  day: string = localDayKey(),
): number | null {
  const latest = satDays(days).find((key) => daysBetweenKeys(key, day) >= 0)
  if (latest === undefined) return null
  return daysBetweenKeys(latest, day)
}

/* ---------------------------------------------------------------------------
 * Transitions — read, return a new state, and persist it.
 * ------------------------------------------------------------------------ */

/** Record that the reader finished sitting with today's couplet. */
export function markSat(state: RitualState, day: string = localDayKey()): RitualState {
  if (didSit(state.sat, day)) return state
  const next: RitualState = { ...state, sat: { ...state.sat, [day]: true } }
  writeRitual(next)
  return next
}

export function setReminder(state: RitualState, reminder: ReminderSettings): RitualState {
  const next: RitualState = { ...state, reminder }
  writeRitual(next)
  return next
}
