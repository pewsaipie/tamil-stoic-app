/**
 * The daily ritual (நாள்தோறும்) — the reader's own record of "I came back".
 *
 * Everything here is device-local, and the shape is deliberately small and
 * forgiving: a reader who never opens the settings sheet still has a valid
 * state, and a state written by a future version that adds fields is read
 * without complaint.
 *
 *   tamil-stoic-ritual-v1   { seal, unrolled, sat, reminder }
 *
 * Three promises shape the design:
 *
 *   1. **The ritual never gates the text.** A sealed leaf is an invitation, not
 *      a lock. "Open without the ceremony" is always one tap away, and the
 *      ceremony can be switched off entirely.
 *   2. **Nothing here is a streak to protect.** `satStreak` counts *days sat
 *      with*, and nothing in the app ever says a chain was broken. A missed day
 *      is a day, not a failure.
 *   3. **Day boundaries are local** — see `lib/dayKey.ts`.
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
  /** False once the reader turns the ceremony off; it then always opens. */
  seal: boolean
  /** Day keys on which the leaf was unrolled. */
  unrolled: Record<string, true>
  /** Day keys on which the reader finished sitting with the couplet. */
  sat: Record<string, true>
  reminder: ReminderSettings
}

/** The hours offered in settings — early morning, midday, evening, night. */
export const REMINDER_HOURS: readonly number[] = [6, 9, 12, 18, 21]

export const DEFAULT_RITUAL: RitualState = {
  seal: true,
  unrolled: {},
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
  if (!stored) return { ...DEFAULT_RITUAL, unrolled: {}, sat: {}, reminder: { ...DEFAULT_RITUAL.reminder } }

  return {
    seal: stored['seal'] !== false,
    unrolled: readDays(stored['unrolled']),
    sat: readDays(stored['sat']),
    reminder: readReminder(stored['reminder']),
  }
}

/* ---------------------------------------------------------------------------
 * Queries — pure, so the test suite can exercise them without a browser.
 * ------------------------------------------------------------------------ */

/**
 * Has the leaf been opened on this day?
 *
 * Takes the day map rather than the whole state so components can subscribe to
 * `unrolled` alone instead of re-rendering on every store change.
 */
export function wasUnrolled(days: Record<string, true>, day: string = localDayKey()): boolean {
  return days[day] === true
}

/** Has the reader sat with the couplet on this day? */
export function didSit(days: Record<string, true>, day: string = localDayKey()): boolean {
  return days[day] === true
}

/**
 * True when the couplet should still be sealed: the ceremony is on and today's
 * leaf has not been opened.
 */
export function isSealed(state: RitualState, day: string = localDayKey()): boolean {
  return state.seal && !wasUnrolled(state.unrolled, day)
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

/** Days on which the leaf was opened, most recent first. */
export function unrolledDays(days: Record<string, true>): string[] {
  return Object.keys(days).sort().reverse()
}

/** Days on which the reader sat with the couplet, most recent first. */
export function satDays(days: Record<string, true>): string[] {
  return Object.keys(days).sort().reverse()
}

/**
 * Whole days since the leaf was last opened — `null` when it never was.
 * Used only to decide how warm a greeting to offer; never to chide.
 */
export function daysSinceLastUnroll(
  days: Record<string, true>,
  day: string = localDayKey(),
): number | null {
  const latest = unrolledDays(days).find((key) => daysBetweenKeys(key, day) >= 0)
  if (latest === undefined) return null
  return daysBetweenKeys(latest, day)
}

/* ---------------------------------------------------------------------------
 * Transitions — read, return a new state, and persist it.
 * ------------------------------------------------------------------------ */

/** Open today's leaf. Idempotent: opening twice is still one day. */
export function unrollToday(state: RitualState, day: string = localDayKey()): RitualState {
  if (wasUnrolled(state.unrolled, day)) return state
  const next: RitualState = { ...state, unrolled: { ...state.unrolled, [day]: true } }
  writeRitual(next)
  return next
}

/** Record that the reader finished sitting with today's couplet. */
export function markSat(state: RitualState, day: string = localDayKey()): RitualState {
  if (didSit(state.sat, day)) return state
  const next: RitualState = { ...state, sat: { ...state.sat, [day]: true } }
  writeRitual(next)
  return next
}

/**
 * Seal today's leaf again.
 *
 * A reader who opened it on the way to work, or by accident, may want the
 * moment back — the minute of quiet is worth arriving at properly. This forgets
 * today's opening only; every other day's record is untouched.
 */
export function resealToday(state: RitualState, day: string = localDayKey()): RitualState {
  if (!wasUnrolled(state.unrolled, day)) return state
  const unrolled = { ...state.unrolled }
  delete unrolled[day]
  const next: RitualState = { ...state, unrolled }
  writeRitual(next)
  return next
}

/** Turn the ceremony on or off. The couplet is never hidden either way. */
export function setSeal(state: RitualState, seal: boolean): RitualState {
  const next: RitualState = { ...state, seal }
  writeRitual(next)
  return next
}

export function setReminder(state: RitualState, reminder: ReminderSettings): RitualState {
  const next: RitualState = { ...state, reminder }
  writeRitual(next)
  return next
}
