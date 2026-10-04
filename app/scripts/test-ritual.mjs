/**
 * The daily ritual — day boundaries, the sealed leaf's state machine, and the
 * reminder's scheduling arithmetic.
 *
 *   npm run test:ritual
 *
 * Runs on Node's type stripping against the exact modules the app ships, so
 * there is no duplicated fixture and no build step. Storage is stubbed with an
 * in-memory `window.localStorage`, which means the persistence contract is
 * tested for real — not asserted around.
 */
/* ---------------------------------------------------------------------------
 * Storage stub, installed before the modules under test are exercised.
 * ------------------------------------------------------------------------ */
const store = new Map()

globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
}

const {
  localDayKey,
  shiftDayKey,
  daysBetweenKeys,
  isDayKey,
  minutesIntoDay,
} = await import('../src/lib/dayKey.ts')

const {
  RITUAL_KEY,
  DEFAULT_RITUAL,
  readRitual,
  writeRitual,
  wasUnrolled,
  didSit,
  isSealed,
  satStreak,
  satDays,
  unrollToday,
  markSat,
  resealToday,
  setSeal,
  setReminder,
  REMINDER_HOURS,
} = await import('../src/lib/ritual.ts')

const { nextReminderAt, isPastReminderHour, isReminderDue, reminderSupported } = await import(
  '../src/lib/reminder.ts'
)

let failed = 0
function check(condition, message) {
  if (condition) {
    console.log('  ✓', message)
  } else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

function resetStorage(value) {
  store.clear()
  if (value !== undefined) store.set(RITUAL_KEY, JSON.stringify(value))
}

/* ---------------------------------------------------------------------------
 * 1. Day boundaries — the bug this module exists to prevent.
 * ------------------------------------------------------------------------ */

console.log('local day keys:')

// 00:30 local on 4 October. In any timezone east of UTC (India is +5:30) the
// UTC date is still 3 October, which is what `toISOString()` returns.
const earlyMorning = new Date(2026, 9, 4, 0, 30)
check(localDayKey(earlyMorning) === '2026-10-04', 'a local day key follows the local calendar, not UTC')

const offsetMinutes = earlyMorning.getTimezoneOffset()
if (offsetMinutes < 0) {
  const utcKey = earlyMorning.toISOString().slice(0, 10)
  check(
    utcKey === '2026-10-03' && localDayKey(earlyMorning) === '2026-10-04',
    `east of UTC the old UTC key really was wrong here (${utcKey} vs 2026-10-04)`,
  )
} else {
  check(true, 'this machine is at or west of UTC — the UTC-key regression is skipped')
}

check(localDayKey(new Date(2026, 9, 4, 23, 30)) === '2026-10-04', 'late evening keeps the same local day')
check(localDayKey(new Date(2026, 0, 1, 0, 0)) === '2026-01-01', 'the first minute of a year is that year')
check(localDayKey(new Date(2026, 11, 31, 23, 59)) === '2026-12-31', 'the last minute of a year is that year')

check(isDayKey('2026-10-04'), 'a well-formed key is accepted')
check(!isDayKey('2026-1-4'), 'an unpadded key is rejected')
check(!isDayKey('yesterday'), 'a word is not a day key')
check(!isDayKey(20261004), 'a number is not a day key')

check(shiftDayKey('2026-10-04', -1) === '2026-10-03', 'shifting back crosses a day')
check(shiftDayKey('2026-10-01', -1) === '2026-09-30', 'shifting back crosses a month')
check(shiftDayKey('2026-01-01', -1) === '2025-12-31', 'shifting back crosses a year')
check(shiftDayKey('2024-02-28', 1) === '2024-02-29', 'shifting forward finds a leap day')
check(shiftDayKey('2026-02-28', 1) === '2026-03-01', 'shifting forward skips a missing leap day')

check(daysBetweenKeys('2026-10-04', '2026-10-04') === 0, 'the same day is zero days apart')
check(daysBetweenKeys('2026-10-01', '2026-10-31') === 30, 'a month apart counts 30 days')
check(daysBetweenKeys('2026-10-04', '2026-10-01') === -3, 'going backwards counts negative days')
check(Number.isNaN(daysBetweenKeys('nonsense', '2026-10-04')), 'a malformed key yields no answer')

check(minutesIntoDay(new Date(2026, 9, 4, 6, 30)) === 390, 'minutes into the day are wall-clock local')

/* ---------------------------------------------------------------------------
 * 2. Reading and writing the ritual state.
 * ------------------------------------------------------------------------ */

console.log('\nritual storage:')

resetStorage()
const fresh = readRitual()
check(fresh.seal === true, 'a new reader starts with the ceremony on')
check(Object.keys(fresh.unrolled).length === 0, 'a new reader has opened nothing')
check(fresh.reminder.enabled === false, 'a new reader has asked for no reminder')
check(fresh.reminder.hour === DEFAULT_RITUAL.reminder.hour, 'the reminder hour has a sensible default')

resetStorage({ seal: false, unrolled: { '2026-10-04': true, nonsense: true }, sat: {}, reminder: {} })
const stored = readRitual()
check(stored.seal === false, 'a reader who turned the ceremony off stays off')
check(wasUnrolled(stored.unrolled, '2026-10-04'), 'a recorded unroll is read back')
check(
  Object.keys(stored.unrolled).length === 1,
  'a malformed day key in storage is dropped rather than believed',
)
check(stored.reminder.hour === DEFAULT_RITUAL.reminder.hour, 'a missing hour falls back to the default')

resetStorage({ reminder: { enabled: true, hour: 99, minute: -5 } })
const clamped = readRitual()
check(clamped.reminder.enabled === true, 'an enabled reminder stays enabled')
check(clamped.reminder.hour === 23, 'an impossible hour is clamped into range')
check(clamped.reminder.minute === 0, 'a negative minute is clamped into range')

resetStorage('this is not json')
try {
  const recovered = readRitual()
  check(recovered.seal === true && Object.keys(recovered.unrolled).length === 0, 'corrupt storage falls back to a fresh state')
} catch (error) {
  check(false, `corrupt storage must not throw (${error.message})`)
}

resetStorage({ seal: 'yes', unrolled: 'no', sat: null, reminder: null })
const typed = readRitual()
check(typed.seal === true, 'a non-boolean seal falls back to on')
check(Object.keys(typed.unrolled).length === 0, 'a non-object day map falls back to empty')
check(typed.reminder.enabled === false, 'a null reminder falls back to off')

/* ---------------------------------------------------------------------------
 * 3. The state machine: sealed, unrolled, sat.
 * ------------------------------------------------------------------------ */

console.log('\nthe seal:')

const sealedState = { seal: true, unrolled: {}, sat: {}, reminder: DEFAULT_RITUAL.reminder }
check(isSealed(sealedState, '2026-10-04'), 'a couplet that was never opened is sealed')
check(!wasUnrolled(sealedState.unrolled, '2026-10-04'), 'and the day records nothing')

const openedState = unrollToday(sealedState, '2026-10-04')
check(wasUnrolled(openedState.unrolled, '2026-10-04'), 'opening records the day')
check(!isSealed(openedState, '2026-10-04'), 'and the leaf is no longer sealed')
check(isSealed(openedState, '2026-10-05'), 'tomorrow it is sealed again')

const twiceState = unrollToday(openedState, '2026-10-04')
check(
  Object.keys(twiceState.unrolled).length === 1,
  'opening twice in a day records one day, not two',
)

const unsealedState = setSeal(sealedState, false)
check(!isSealed(unsealedState, '2026-10-04'), 'turning the ceremony off leaves the couplet open')
check(
  isSealed(setSeal(unsealedState, true), '2026-10-04'),
  'turning it back on restores the seal',
)

const resealed = resealToday(openedState, '2026-10-04')
check(!wasUnrolled(resealed.unrolled, '2026-10-04'), 'sealing again forgets today’s opening')
check(isSealed(resealed, '2026-10-04'), 'and the leaf is sealed once more')
check(
  wasUnrolled(resealToday(openedState, '2026-10-04').unrolled, '2026-10-03') === false,
  'resealing touches today only, never another day',
)
check(
  resealToday(sealedState, '2026-10-04') === sealedState,
  'resealing a sealed leaf changes nothing at all',
)

console.log('\nsitting with the couplet:')

const satState = markSat(sealedState, '2026-10-04')
check(didSit(satState.sat, '2026-10-04'), 'finishing a minute records the day')
check(Object.keys(markSat(satState, '2026-10-04').sat).length === 1, 'sitting twice records one day')
check(!didSit(satState.sat, '2026-10-03'), 'a day not sat with is not claimed')

check(satStreak({}, '2026-10-04') === 0, 'no history is a streak of zero')
check(satStreak({ '2026-10-04': true }, '2026-10-04') === 1, 'one day is a streak of one')
check(
  satStreak({ '2026-10-02': true, '2026-10-03': true, '2026-10-04': true }, '2026-10-04') === 3,
  'consecutive days count back to the last gap',
)
check(
  satStreak({ '2026-10-01': true, '2026-10-04': true }, '2026-10-04') === 1,
  'a gap ends the count without erasing history',
)
check(
  satStreak({ '2026-10-03': true, '2026-10-04': true }, '2026-10-06') === 0,
  'a streak is counted from the day asked about, not from the last entry',
)
check(satStreak({ '2026-10-04': true }, 'not-a-day') === 0, 'a malformed day yields no streak')

// The walk is bounded: a state claiming every day for two years must not hang.
const dense = {}
for (let i = 0; i < 800; i += 1) dense[shiftDayKey('2026-10-04', -i)] = true
const started = Date.now()
const denseStreak = satStreak(dense, '2026-10-04')
check(denseStreak >= 730, 'a long unbroken history is counted')
check(Date.now() - started < 1000, 'and counted quickly')

check(satDays({ '2026-10-01': true, '2026-10-04': true })[0] === '2026-10-04', 'sat days come back newest first')

console.log('\npersistence:')

resetStorage()
const persisted = unrollToday(readRitual(), '2026-10-04')
check(store.has(RITUAL_KEY), 'opening the leaf writes storage')
check(readRitual().unrolled['2026-10-04'] === true, 'and the write survives a re-read')
check(
  JSON.parse(store.get(RITUAL_KEY)).unrolled['2026-10-04'] === true,
  'the stored shape is the one the app documents',
)
check(markSat(persisted, '2026-10-04').sat['2026-10-04'] === true, 'a finished minute is persisted too')
check(setReminder(persisted, { enabled: true, hour: 6, minute: 0 }).reminder.enabled === true, 'reminder changes persist')

// Private browsing: every write can fail, and the app must keep working.
const realWindow = globalThis.window
globalThis.window = {
  localStorage: {
    getItem: () => {
      throw new Error('denied')
    },
    setItem: () => {
      throw new Error('denied')
    },
    removeItem: () => {},
  },
}
try {
  const denied = unrollToday(readRitual(), '2026-10-04')
  check(denied.unrolled['2026-10-04'] === true, 'denied storage still opens the leaf in memory')
} catch (error) {
  check(false, `denied storage must not throw (${error.message})`)
}
globalThis.window = realWindow

// No window at all (server-side rendering, or a bare node import).
delete globalThis.window
try {
  const headless = readRitual()
  check(headless.seal === true, 'a module imported outside a browser still has a valid state')
  check(unrollToday(headless, '2026-10-04').unrolled['2026-10-04'] === true, 'and can still be opened')
} catch (error) {
  check(false, `a headless import must not throw (${error.message})`)
}
globalThis.window = realWindow

/* ---------------------------------------------------------------------------
 * 4. The reminder's arithmetic.
 * ------------------------------------------------------------------------ */

console.log('\nreminder scheduling:')

const settings = { enabled: true, hour: 6, minute: 0 }
const atFour = new Date(2026, 9, 4, 4, 0)
const atEight = new Date(2026, 9, 4, 8, 0)

const morning = nextReminderAt(settings, atFour)
check(
  morning.getDate() === 4 && morning.getHours() === 6 && morning.getMinutes() === 0,
  'before the hour, the reminder is later today',
)

const nextDay = nextReminderAt(settings, atEight)
check(
  nextDay.getDate() === 5 && nextDay.getHours() === 6,
  'after the hour, the reminder moves to tomorrow',
)
check(
  nextReminderAt(settings, new Date(2026, 9, 4, 6, 0)).getDate() === 5,
  'exactly on the hour, the moment has passed and it moves to tomorrow',
)

check(!isPastReminderHour(settings, atFour), 'four in the morning is before a six o’clock reminder')
check(isPastReminderHour(settings, atEight), 'eight is after it')
check(isPastReminderHour({ enabled: true, hour: 21, minute: 30 }, new Date(2026, 9, 4, 21, 30)), 'the exact hour counts as past')

check(
  !isReminderDue(settings, { sealed: true, ceremony: true, now: atFour }),
  'nothing is due before the hour',
)
check(
  isReminderDue(settings, { sealed: true, ceremony: true, now: atEight }),
  'past the hour with the leaf sealed, the reminder is due',
)
check(
  !isReminderDue(settings, { sealed: false, ceremony: true, now: atEight }),
  'once opened, there is nothing to remind about',
)
check(
  !isReminderDue(settings, { sealed: true, ceremony: false, now: atEight }),
  'a reader who turned the ceremony off is never reminded',
)

check(REMINDER_HOURS.length >= 4, 'settings offer a real choice of hours')
check(
  REMINDER_HOURS.every((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23),
  'every offered hour is a real hour of the day',
)
check(reminderSupported() === false, 'this test environment correctly reports no notifications')

// The app must never schedule a reminder for a moment already gone.
for (const hour of REMINDER_HOURS) {
  const candidate = nextReminderAt({ enabled: true, hour, minute: 0 }, atEight)
  check(candidate.getTime() > atEight.getTime(), `hour ${hour} always schedules a future moment`)
}

/* ---------------------------------------------------------------------------
 * report
 * ------------------------------------------------------------------------ */

if (failed > 0) {
  console.error(`\n✗ daily ritual: ${failed} failure(s)`)
  process.exit(1)
}
console.log('\n✓ daily ritual: local day keys, seal state machine, persistence and reminder arithmetic\n')
