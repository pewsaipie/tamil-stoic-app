/**
 * Local day keys — the single definition of "today" the app uses.
 *
 * The reader's day is a *local* day: a reader in Chennai opening the app at
 * 4:30am is on a new day, even though UTC still says it is yesterday. The
 * previous implementation derived day keys from `toISOString()`, which is UTC
 * and therefore wrong for every reader east of Greenwich between midnight and
 * their UTC offset — five and a half hours of every day in India.
 *
 * That mattered little while day keys only fed a streak counter. It matters a
 * great deal now that they decide whether today's couplet is still sealed: with
 * a UTC key, the seal could lift a day early, or refuse to lift at all.
 *
 * Every date-aware feature — the streak, the daily couplet, the ritual — must
 * ask this module what day it is.
 */

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

/**
 * `2026-10-04` for the given local date — never the UTC date.
 *
 * Built from the date's own calendar fields rather than from an ISO string, so
 * no timezone conversion can shift it across a boundary.
 */
export function localDayKey(date: Date = new Date()): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** True for a well-formed `YYYY-MM-DD` key. */
export function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && KEY.test(value)
}

/** Parse a key as midnight UTC, so arithmetic never crosses a DST seam. */
function utcFromKey(key: string): number {
  const match = KEY.exec(key)
  if (!match) return Number.NaN
  const [, year, month, day] = match
  return Date.UTC(Number(year), Number(month) - 1, Number(day))
}

/** The key `deltaDays` before or after `key` (negative for earlier). */
export function shiftDayKey(key: string, deltaDays: number): string {
  const utc = utcFromKey(key)
  if (Number.isNaN(utc)) return key
  return new Date(utc + deltaDays * DAY_MS).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to` — negative when `to` is earlier. */
export function daysBetweenKeys(from: string, to: string): number {
  const start = utcFromKey(from)
  const end = utcFromKey(to)
  if (Number.isNaN(start) || Number.isNaN(end)) return Number.NaN
  return Math.round((end - start) / DAY_MS)
}

/** Minutes since local midnight, for comparing a wall-clock hour. */
export function minutesIntoDay(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes()
}
