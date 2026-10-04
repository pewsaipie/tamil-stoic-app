/**
 * The daily ritual — the home screen's first movement.
 *
 * Today's couplet arrives sealed behind a rolled palm leaf. Opening it is a
 * small act, done once a day, and it is what the reader comes back for. Below
 * the opened couplet sits the minute of quiet.
 *
 * Two rules keep this honest:
 *
 *   - **The ceremony is optional.** `seal` off means the couplet is simply
 *     there, as it always was, and every part of this card still works.
 *   - **The reminder spoils nothing.** A notification says the leaf is waiting;
 *     it never quotes the couplet, which would undo the one thing the seal is
 *     for.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SealedLeaf } from './SealedLeaf'
import { SitTimer } from './SitTimer'
import { TodayKuralCard } from './TodayKuralCard'
import { useReaderStore } from '../../store/appStore'
import { useReducedMotion } from '../../hooks/useReader'
import { wasUnrolled } from '../../lib/ritual'
import { localDayKey } from '../../lib/dayKey'
import { isPastReminderHour, scheduleReminder, cancelReminder } from '../../lib/reminder'
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
  const seal = useReaderStore((state) => state.seal)
  const unrolled = useReaderStore((state) => state.unrolled)
  const reminder = useReaderStore((state) => state.reminder)
  const unroll = useReaderStore((state) => state.unroll)
  const reducedMotion = useReducedMotion()
  const t = useT()

  const revealRef = useRef<HTMLDivElement | null>(null)
  /** Set when the reader opens the leaf; consumed when the couplet mounts. */
  const pendingFocusRef = useRef(false)
  const [instant, setInstant] = useState(false)

  const day = localDayKey()
  const sealed = seal && !wasUnrolled(unrolled, day)

  /**
   * Focus the couplet the moment it mounts — not when the leaf is opened.
   *
   * The reveal is behind an exit animation, so the couplet does not exist yet
   * at click time; a callback ref fires exactly when it does. The button that
   * opened the leaf is gone by then, and without this a keyboard or
   * screen-reader reader is dropped back at the top of the page.
   */
  const attachReveal = useCallback((node: HTMLDivElement | null): void => {
    revealRef.current = node
    if (node !== null && pendingFocusRef.current) {
      pendingFocusRef.current = false
      node.focus()
    }
  }, [])

  /** Only ever says the leaf is waiting; never what is behind it. */
  const open = useCallback(
    (options?: { instant?: boolean }) => {
      setInstant(options?.instant === true || reducedMotion)
      pendingFocusRef.current = true
      unroll()
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([6, 40, 10])
      }
    },
    [unroll, reducedMotion],
  )

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
        body: t('reminder.body', 'Today’s couplet is waiting to be opened.'),
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

  const revealAnimation =
    instant || reducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : {
          initial: { opacity: 0, y: 20, scale: 0.985 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -12, filter: 'blur(4px)' },
        }

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {sealed ? (
          <motion.div
            key="sealed"
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <SealedLeaf
              kuralNumber={kural.n}
              onOpen={open}
              reducedMotion={reducedMotion}
            />
            {late ? (
              <p className="mt-[var(--space-3)] mb-0 text-center text-xs text-muted">
                {t('ritual.late', 'It is past the hour you set. The leaf is still sealed.')}
              </p>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="open"
            id="daily-couplet"
            ref={attachReveal}
            tabIndex={-1}
            {...revealAnimation}
            transition={{ duration: instant || reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <TodayKuralCard
              kural={kural}
              chapter={chapter}
              section={section}
              onAnother={onAnother}
              onShare={onShare}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {sealed ? null : <SitTimer className="mt-[var(--space-5)]" />}
    </>
  )
}
