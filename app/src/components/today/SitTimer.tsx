/**
 * Sit with it — one quiet minute with today's couplet.
 *
 * The app measures two different things: *reading* a couplet (which happens on
 * arrival) and *sitting* with one (a deliberate minute). Only the second is
 * recorded here, once a day, and nothing in the UI ever reports that a day was
 * missed.
 *
 * Timing is deadline-based rather than accumulated, so a backgrounded tab — or
 * a phone that dozes mid-minute — cannot drift the countdown.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'
import { useReaderStore } from '../../store/appStore'
import { didSit, satStreak } from '../../lib/ritual'
import { localDayKey } from '../../lib/dayKey'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
import { format } from '../../i18n'

const DURATIONS = [1, 2, 3] as const
const TICK_MS = 250

function clock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export interface SitTimerProps {
  className?: string
}

export function SitTimer({ className }: SitTimerProps) {
  const sat = useReaderStore((state) => state.sat)
  const sit = useReaderStore((state) => state.sit)
  const pushToast = useReaderStore((state) => state.pushToast)
  const t = useT()

  const [minutes, setMinutes] = useState<number>(1)
  const [remaining, setRemaining] = useState<number>(minutes * 60_000)
  const [running, setRunning] = useState(false)
  const deadlineRef = useRef<number | null>(null)

  const day = localDayKey()
  const alreadySat = didSit(sat, day)
  const streak = satStreak(sat, day)

  // Changing the length while idle simply resets the countdown to it.
  useEffect(() => {
    if (running) return
    setRemaining(minutes * 60_000)
  }, [minutes, running])

  const complete = useCallback(() => {
    setRunning(false)
    setRemaining(0)
    sit()
    pushToast(t('ritual.sit.toast', 'You sat with it ✓'), 'success')
  }, [sit, pushToast, t])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const deadline = deadlineRef.current
      if (deadline === null) return
      const left = Math.max(0, deadline - Date.now())
      setRemaining(left)
      if (left <= 0) complete()
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [running, complete])

  const start = (): void => {
    if (remaining <= 0) setRemaining(minutes * 60_000)
    deadlineRef.current = Date.now() + (remaining > 0 ? remaining : minutes * 60_000)
    setRunning(true)
  }

  const pause = (): void => {
    deadlineRef.current = null
    setRunning(false)
  }

  const reset = (): void => {
    deadlineRef.current = null
    setRunning(false)
    setRemaining(minutes * 60_000)
  }

  const progress = 1 - remaining / (minutes * 60_000)
  const circumference = 2 * Math.PI * 26

  return (
    <GlassCard quiet className={cn('p-5', className)}>
      <div className="flex flex-wrap items-center gap-5">
        <svg
          viewBox="0 0 64 64"
          width="64"
          height="64"
          role="img"
          aria-label={`${clock(remaining)} remaining`}
        >
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border-color)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
            transform="rotate(-90 32 32)"
          />
          <text
            x="32"
            y="37"
            textAnchor="middle"
            fontSize="13"
            fill="var(--ink-primary)"
            fontFamily="var(--font-ui)"
          >
            {remaining > 0 ? clock(remaining) : '✓'}
          </text>
        </svg>

        <div className="min-w-[12rem] flex-1">
          <h2 className="m-0 text-base text-ink">
            <span lang="ta">{t('ritual.sit.ta', 'அமைதி')}</span> · {t('ritual.sit.title', 'Sit with it')}
          </h2>
          <p className="mt-1 mb-0 text-sm text-muted" aria-live="polite">
            {alreadySat && !running
              ? t('ritual.sit.done', 'You sat with today’s couplet.')
              : t('ritual.sit.sub', 'One minute with the couplet, and nothing else.')}
          </p>
          {alreadySat ? (
            <p className="mt-1 mb-0 text-xs text-muted">
              {format(t('ritual.sit.streak', '{s} days sat with'), { s: streak })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-3">
        {running ? (
          <Button variant="primary" onClick={pause} icon={<Pause size={18} strokeWidth={1.5} />}>
            {t('ritual.sit.pause', 'Pause')}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={start}
            icon={
              remaining > 0 && remaining < minutes * 60_000 ? (
                <Play size={18} strokeWidth={1.5} />
              ) : (
                <Timer size={18} strokeWidth={1.5} />
              )
            }
          >
            {remaining > 0 && remaining < minutes * 60_000
              ? t('ritual.sit.resume', 'Resume')
              : t('ritual.sit.start', 'Start')}
          </Button>
        )}

        <Button variant="ghost" onClick={reset} icon={<RotateCcw size={18} strokeWidth={1.5} />}>
          {t('ritual.sit.reset', 'Reset')}
        </Button>

        <div className="ml-auto flex items-center gap-2" role="group" aria-label={t('ritual.sit.length', 'Length')}>
          {DURATIONS.map((value) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={minutes === value}
              disabled={running}
              onClick={() => setMinutes(value)}
            >
              {value}′
            </button>
          ))}
        </div>
      </div>

      {alreadySat && !running ? (
        <p className="mt-[var(--space-3)] mb-0 flex items-center gap-2 text-xs text-muted">
          <Check size={14} strokeWidth={2} aria-hidden="true" />
          {t('ritual.sit.recorded', 'Recorded for today. Sitting again is yours to do, not a tally.')}
        </p>
      ) : null}
    </GlassCard>
  )
}
