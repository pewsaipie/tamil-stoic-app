/**
 * Reminder settings — where the reader decides whether the app may knock.
 *
 * The wording here is deliberately plain about limits. A local-only app cannot
 * promise a notification at a fixed hour on every device, so this screen says
 * what will actually happen instead of implying more: an OS-level alarm where
 * the browser supports one, an in-session timer while the app is open, and —
 * always — the sealed leaf waiting on the home screen.
 *
 * Permission is requested only from the button below. Never on load, never
 * implicitly as a side effect of turning the reminder on: a reader must be able
 * to set an hour without being asked for anything.
 */
import { useEffect, useState } from 'react'
import { Bell, BellOff, RefreshCw } from 'lucide-react'
import { useReaderStore } from '../../store/appStore'
import { REMINDER_HOURS, wasUnrolled, type ReminderSettings } from '../../lib/ritual'
import { localDayKey } from '../../lib/dayKey'
import {
  nextReminderAt,
  reminderPermission,
  reminderSupported,
  requestReminderPermission,
  type ReminderPermission,
} from '../../lib/reminder'
import { useT } from '../../i18n'

function formatHour(hour: number, minute: number): string {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function ReminderSettings() {
  const reminder = useReaderStore((state) => state.reminder)
  const updateReminder = useReaderStore((state) => state.updateReminder)
  const seal = useReaderStore((state) => state.seal)
  const unrolled = useReaderStore((state) => state.unrolled)
  const setCeremony = useReaderStore((state) => state.setCeremony)
  const reseal = useReaderStore((state) => state.reseal)
  const pushToast = useReaderStore((state) => state.pushToast)
  const t = useT()

  const [permission, setPermission] = useState<ReminderPermission>('default')
  const openedToday = wasUnrolled(unrolled, localDayKey())

  useEffect(() => {
    setPermission(reminderPermission())
  }, [])

  const supported = reminderSupported()

  const setReminder = (patch: Partial<ReminderSettings>): void => {
    updateReminder({ ...reminder, ...patch })
  }

  const ask = async (): Promise<void> => {
    const result = await requestReminderPermission()
    setPermission(result)
    if (result === 'granted') {
      pushToast(t('reminder.granted', 'Reminders are on ✓'), 'success')
    } else if (result === 'denied') {
      pushToast(t('reminder.denied', 'No notifications — the leaf will still be waiting here'), 'info')
    }
  }

  const next = nextReminderAt(reminder)
  const nextLabel = `${isSameDay(next, new Date()) ? t('reminder.today', 'Today') : t('reminder.tomorrow', 'Tomorrow')} · ${formatHour(reminder.hour, reminder.minute)}`

  return (
    <section className="space-y-3">
      <h3 className="m-0 text-sm text-muted">{t('settings.ritual', 'The daily ritual')}</h3>

      <label className="flex min-h-[44px] items-center gap-3 text-[15px]">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--accent)]"
          checked={seal}
          onChange={(event) => setCeremony(event.target.checked)}
        />
        <span>{t('settings.seal', 'Seal today’s couplet until I open it')}</span>
      </label>

      {seal && openedToday ? (
        <button
          type="button"
          onClick={reseal}
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted underline decoration-dotted underline-offset-4 hover:text-accent-text"
        >
          <RefreshCw size={15} strokeWidth={1.6} aria-hidden="true" />
          {t('settings.reseal', 'Seal today’s leaf again')}
        </button>
      ) : null}

      <label className="flex min-h-[44px] items-center gap-3 text-[15px]">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--accent)]"
          checked={reminder.enabled}
          onChange={(event) => setReminder({ enabled: event.target.checked })}
        />
        <span>{t('settings.reminder', 'Remind me to open it')}</span>
      </label>

      {reminder.enabled ? (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('settings.reminderHour', 'Reminder time')}>
            {REMINDER_HOURS.map((hour) => (
              <button
                key={hour}
                type="button"
                className="chip"
                aria-pressed={reminder.hour === hour}
                onClick={() => setReminder({ hour, minute: 0 })}
              >
                {formatHour(hour, 0)}
              </button>
            ))}
          </div>

          <p className="m-0 text-xs text-muted">
            {t('reminder.next', 'Next')}: {nextLabel}
          </p>

          {permission === 'default' ? (
            <button
              type="button"
              onClick={() => void ask()}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm text-accent-text underline decoration-dotted underline-offset-4"
            >
              <Bell size={16} strokeWidth={1.6} aria-hidden="true" />
              {t('reminder.enable', 'Allow notifications on this device')}
            </button>
          ) : null}

          {permission === 'granted' ? (
            <p className="m-0 flex items-center gap-2 text-xs text-muted">
              <Bell size={14} strokeWidth={1.6} aria-hidden="true" />
              {t('reminder.armed', 'Scheduled on this device — nothing is sent anywhere.')}
            </p>
          ) : null}

          {permission === 'denied' || !supported ? (
            <p className="m-0 flex items-center gap-2 text-xs text-muted">
              <BellOff size={14} strokeWidth={1.6} aria-hidden="true" />
              {t(
                'reminder.fallback',
                'Notifications are off here. The sealed leaf will still be waiting when you open the app.',
              )}
            </p>
          ) : null}
        </>
      ) : null}

      <p className="m-0 text-xs text-muted">
        {t(
          'settings.ritualNote',
          'The ritual never hides the couplet — “open without the ceremony” is always available, and everything stays on this device.',
        )}
      </p>
    </section>
  )
}
