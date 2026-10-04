/**
 * The daily reminder — scheduled entirely on the reader's own device.
 *
 * There is no server, no push subscription and no account behind this, and
 * there never will be: nothing about a reader's habits leaves the phone. That
 * constraint shapes everything here, so it is worth being precise about what a
 * local-only reminder can and cannot promise.
 *
 * **Three ways the reminder can arrive, in order of reliability:**
 *
 *   1. *OS-level alarm* — the Notification Triggers API (`showTrigger`), where
 *      the browser supports it. This survives the app being closed, which is
 *      the real thing a reader wants.
 *   2. *In-session timer* — a plain `setTimeout` that fires a notification if
 *      the app happens to be open in a foreground or backgrounded tab. It does
 *      not survive the tab being killed.
 *   3. **The quiet greeting** — no permission, no notification, no API at all.
 *      When the reader next opens the app past their chosen hour with the leaf
 *      still sealed, the app simply says so. See `isReminderDue`.
 *
 * The third path is the one that works everywhere, including on iOS and
 * wherever notifications are denied, so it is the one the UI leans on. The
 * first two are upgrades layered on top, never requirements.
 *
 * Permission is only ever requested from a real button press — never on load,
 * never implicitly. A denial is treated as a valid answer and changes nothing
 * about how the app behaves.
 */
import type { ReminderSettings } from './ritual.ts'
import { minutesIntoDay } from './dayKey.ts'

export const REMINDER_TAG = 'tamil-stoic-daily'

export type ReminderPermission = 'unsupported' | 'default' | 'granted' | 'denied'

export type ReminderOutcome =
  /** Scheduled as a real OS-level alarm (best case). */
  | 'scheduled'
  /** Scheduled as an in-session timer; it will not survive a killed tab. */
  | 'timer'
  /** Notifications are unavailable on this device. */
  | 'unsupported'
  /** The reader has not granted permission — the quiet greeting still works. */
  | 'denied'
  /** Switched off, or the next occurrence is too far out to schedule. */
  | 'disabled'

export interface ReminderPayload {
  title: string
  body: string
  /** Where a tap should land. Relative, so the Pages sub-path is preserved. */
  url?: string
}

/** Beyond a day out, a timer is more likely to be stale than useful. */
const MAX_DELAY_MS = 25 * 60 * 60 * 1000

/** `showTrigger` is not yet in lib.dom; this is the shape we use if present. */
interface TimestampTriggerLike {
  new (timestamp: number): unknown
}

function timestampTriggerConstructor(): TimestampTriggerLike | null {
  const scope = globalThis as unknown as { TimestampTrigger?: TimestampTriggerLike }
  return typeof scope.TimestampTrigger === 'function' ? scope.TimestampTrigger : null
}

function serviceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return Promise.resolve(null)
  return navigator.serviceWorker.ready.catch(() => null)
}

export function reminderSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function reminderPermission(): ReminderPermission {
  if (!reminderSupported()) return 'unsupported'
  try {
    return (['default', 'granted', 'denied'] as const).includes(Notification.permission)
      ? (Notification.permission as ReminderPermission)
      : 'default'
  } catch {
    return 'unsupported'
  }
}

/**
 * Ask for permission — only ever called from a reader's own tap.
 * Returns the resulting state rather than throwing.
 */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!reminderSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return reminderPermission()
  try {
    await Notification.requestPermission()
  } catch {
    return 'denied'
  }
  return reminderPermission()
}

/** The next local `hour:minute` at or after `from` — tomorrow if today's passed. */
export function nextReminderAt(settings: ReminderSettings, from: Date = new Date()): Date {
  const target = new Date(from.getTime())
  target.setHours(settings.hour, settings.minute, 0, 0)
  if (target.getTime() <= from.getTime()) target.setDate(target.getDate() + 1)
  return target
}

/** Is the wall clock already past today's reminder time? */
export function isPastReminderHour(settings: ReminderSettings, now: Date = new Date()): boolean {
  return minutesIntoDay(now) >= settings.hour * 60 + settings.minute
}

/**
 * Should the app greet the reader with "today's couplet is waiting"?
 *
 * This is the permission-free path: the reminder hour has passed, the leaf has
 * not been opened today, and the ceremony is on. It asks for nothing and works
 * on every device.
 */
export function isReminderDue(
  settings: ReminderSettings,
  options: { sealed: boolean; ceremony: boolean; now?: Date },
): boolean {
  if (!options.ceremony || !options.sealed) return false
  return isPastReminderHour(settings, options.now ?? new Date())
}

async function showNow(payload: ReminderPayload): Promise<boolean> {
  const options = {
    tag: REMINDER_TAG,
    body: payload.body,
    // A reminder replaces yesterday's; it never stacks into a pile of guilt.
    renotify: false,
    data: { url: payload.url ?? '/' },
    lang: 'ta',
  } as NotificationOptions

  const registration = await serviceWorkerReady()
  if (registration) {
    try {
      await registration.showNotification(payload.title, options)
      return true
    } catch {
      // Fall through to the page-level API.
    }
  }
  try {
    new Notification(payload.title, options)
    return true
  } catch {
    return false
  }
}

let timer: ReturnType<typeof setTimeout> | null = null

/** Drop any pending in-session timer and any notification already queued. */
export async function cancelReminder(): Promise<void> {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  const registration = await serviceWorkerReady()
  if (!registration) return
  try {
    const pending = await registration.getNotifications({ tag: REMINDER_TAG })
    for (const notification of pending) notification.close()
  } catch {
    // Nothing queued, or the platform will not say. Either way, resolved.
  }
}

/**
 * (Re)arm the reminder. Safe to call on every render and every app resume:
 * it cancels first, so re-arming can never double-fire.
 */
export async function scheduleReminder(
  settings: ReminderSettings,
  payload: ReminderPayload,
): Promise<ReminderOutcome> {
  await cancelReminder()

  if (!settings.enabled) return 'disabled'
  if (!reminderSupported()) return 'unsupported'
  if (reminderPermission() !== 'granted') return 'denied'

  const at = nextReminderAt(settings)
  const delay = at.getTime() - Date.now()
  if (delay <= 0 || delay > MAX_DELAY_MS) return 'disabled'

  // Prefer a real alarm: it is the only path that survives a closed app.
  const Trigger = timestampTriggerConstructor()
  const registration = await serviceWorkerReady()
  if (Trigger && registration) {
    try {
      await registration.showNotification(payload.title, {
        tag: REMINDER_TAG,
        body: payload.body,
        renotify: false,
        data: { url: payload.url ?? '/' },
        lang: 'ta',
        showTrigger: new Trigger(at.getTime()),
      } as unknown as NotificationOptions)
      return 'scheduled'
    } catch {
      // Unsupported in practice, or rejected by the platform — use the timer.
    }
  }

  timer = setTimeout(() => {
    timer = null
    void showNow(payload)
  }, delay)

  return 'timer'
}
