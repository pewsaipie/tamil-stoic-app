/**
 * The daily ritual — today's leaf, and the minute spent with it.
 *
 * The reader arrives to find the couplet already on the table: no seal, no
 * ceremony to get past, nothing between them and the verse. What the screen
 * offers is *attention* — the lamp, and a minute of quiet under it — and the
 * reminder that says the leaf is waiting. That is the whole ritual.
 *
 * Two rules keep this honest:
 *
 *   - **The verse is never gated.** There is no state in which the couplet is
 *     hidden. Everything below it is optional.
 *   - **The reminder spoils nothing.** A notification says the couplet is
 *     ready; it never quotes it.
 *
 * The lamp in the table scene is driven from here, through `lampBus`, so a
 * reader who lights the lamp sees the *room* answer rather than a progress bar.
 * See `materials/objects/lampBus.ts`.
 */
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { SitTimer } from './SitTimer'
import { TodayKuralCard } from './TodayKuralCard'
import { useReaderStore } from '../../store/appStore'
import { useReducedMotion } from '../../hooks/useReader'
import { scheduleReminder, cancelReminder, isPastReminderHour } from '../../lib/reminder'
import { useT } from '../../i18n'
import type { Chapter, Kural, Section } from '../../lib/types'

export interface DailyRitualProps {
  kural: Kural
  chapter?: Chapter | undefined
  section?: Section | undefined
  onAnother: () => void
  onShare: () => void
}

export function DailyRitual({ kural, chapter, section, onAnother, onShare }: DailyRitualProps) {
  const reminder = useReaderStore((state) => state.reminder)
  const reducedMotion = useReducedMotion()
  const t = useT()

  // Arm (and re-arm) the reminder. It is cancelled and rebuilt on every change,
  // so this can never double-fire, and a tab returning to the foreground picks
  // the schedule back up.
  useEffect(() => {
    if (!reminder.enabled) {
      void cancelReminder()
      return
    }

    const arm = (): void => {
      void scheduleReminder(reminder, {
        title: t('reminder.title', 'திருக்குறள் · Thirukkural'),
        body: t('reminder.body', 'Your couplet for today is ready.'),
        url: '/',
      })
    }

    arm()
    document.addEventListener('visibilitychange', arm)
    return () => {
      document.removeEventListener('visibilitychange', arm)
      void cancelReminder()
    }
  }, [reminder, t])

  // A reader who chose an hour and is past it gets told the plain fact of it —
  // never a scolding, and never anything at all if they did not opt in.
  const late = reminder.enabled && isPastReminderHour(reminder)

  return (
    <>
      <motion.div
        id="daily-couplet"
        tabIndex={-1}
        // Kurinji register: the verse's arrival is a union, so it lands with one
        // quick upward beat and settles. Reduced motion gets the flat end state,
        // which is the card itself — nothing is lost by skipping it.
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <TodayKuralCard
          kural={kural}
          chapter={chapter}
          section={section}
          onAnother={onAnother}
          onShare={onShare}
        />
      </motion.div>

      {late ? (
        <p className="mt-[var(--space-3)] mb-0 text-center text-xs text-muted">
          {t('ritual.late', 'It is past the hour you set. The couplet is here whenever you are.')}
        </p>
      ) : null}

      <SitTimer className="mt-[var(--space-5)]" />
    </>
  )
}
