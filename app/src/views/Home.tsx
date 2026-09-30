/**
 * Home — the reader's landing screen.
 *
 * Scope so far (scaffold step): the design system, the real corpus pipeline and
 * a working Today's Kural card. The Three.js hero canvas, the books tabs, the
 * situation doors and the command palette arrive in the next steps; the hero
 * zone below already renders the documented CSS fallback so the layout is final.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { chapterOf, kuralOfTheDay, sectionOf } from '../lib/corpus'
import { useCorpus, useReducedMotion } from '../hooks/useReader'
import { useReaderStore } from '../store/appStore'
import { TodayKuralCard } from '../components/today/TodayKuralCard'
import { SkeletonKuralCard } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher'
import { HeroCanvas } from '../components/canvas/HeroCanvas'
import type { Kural } from '../lib/types'

function pickAnother(kurals: readonly Kural[], current: Kural): Kural {
  if (kurals.length < 2) return current
  let next = current
  while (next.n === current.n) {
    const candidate = kurals[Math.floor(Math.random() * kurals.length)]
    if (candidate) next = candidate
  }
  return next
}

export function Home() {
  const { status, corpus, error } = useCorpus()
  const reducedMotion = useReducedMotion()
  const markRead = useReaderStore((state) => state.markRead)
  const pushToast = useReaderStore((state) => state.pushToast)
  const [override, setOverride] = useState<Kural | null>(null)

  const today = useMemo(() => (corpus ? kuralOfTheDay(corpus.kurals) : null), [corpus])
  const current = override ?? today

  useEffect(() => {
    if (current && corpus) markRead(current.n, current.ch)
  }, [current, corpus, markRead])

  const share = useCallback(async () => {
    if (!current) return
    const url = `${window.location.origin}${window.location.pathname}#/kural/${current.n}`
    const text = `${current.ta[0]} ${current.ta[1]}\n\n${current.s}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: `Kural ${current.n}`, text, url })
        return
      }
      await navigator.clipboard.writeText(`${text}\n\n${url}`)
      pushToast('Kural copied to the clipboard ✓', 'success')
    } catch {
      pushToast('Sharing is unavailable on this device', 'danger')
    }
  }, [current, pushToast])

  return (
    <div className="min-h-dvh">
      {/* Hero zone. The gradient is the documented no-WebGL fallback; when the
          device can render it, the AgedLeaf shader paints over it. */}
      <header
        className="relative isolate overflow-hidden px-4 pt-[var(--space-7)] pb-[var(--space-6)]"
        style={{
          minHeight: '240px',
          backgroundImage:
            'radial-gradient(120% 90% at 50% 0%, var(--hero-tint-a) 0%, var(--hero-tint-b) 55%, var(--hero-tint-c) 100%)',
        }}
      >
        <HeroCanvas />
        <div className="relative z-10 mx-auto flex max-w-[var(--content-max)] flex-col items-center gap-[var(--space-4)] text-center">
          <h1
            lang="ta"
            className="m-0 text-[clamp(28px,6vw,44px)] text-ink drop-shadow-[0_1px_0_rgba(255,255,255,0.25)]"
          >
            திருக்குறள்
          </h1>
          <p className="m-0 max-w-[36ch] text-sm text-ink/80">
            One couplet a day, with a plain-English meaning. Everything stays on your device.
          </p>
          <ThemeSwitcher className="justify-center" />
        </div>
      </header>

      <main className="mx-auto -mt-[var(--space-6)] max-w-[var(--content-max)] px-4 pb-[var(--space-9)]">
        {status === 'loading' ? <SkeletonKuralCard /> : null}

        {status === 'error' ? (
          <div className="glass-panel p-6 text-center" role="alert">
            <p className="m-0 text-danger">{error.message}</p>
            <p className="mt-2 mb-0 text-sm text-muted">
              The kurals are stored offline after the first visit — reconnect once to fill the cache.
            </p>
          </div>
        ) : null}

        {current && corpus ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.n}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, filter: 'blur(4px)' }}
              transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <TodayKuralCard
                kural={current}
                chapter={chapterOf(corpus.chapters, current)}
                section={sectionOf(corpus.sections, current)}
                onAnother={() => {
                  setOverride(pickAnother(corpus.kurals, current))
                  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                    navigator.vibrate([6, 50, 6]) // haptic hint on swap
                  }
                }}
                onShare={() => void share()}
              />
            </motion.div>
          </AnimatePresence>
        ) : null}

        {/* Design-system proof: the primitives this app is built from. */}
        <section aria-labelledby="system-title" className="mt-[var(--space-7)]">
          <h2 id="system-title" className="m-0 text-lg text-ink">
            Design system
          </h2>
          <p className="mt-1 mb-[var(--space-4)] text-sm text-muted">
            Buttons, chips and loading states as they will appear across the app.
          </p>

          <div className="glass-panel grain space-y-[var(--space-4)] p-5">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" aria-pressed="true">
                அறம் · Virtue
              </button>
              <button type="button" className="chip" aria-pressed="false">
                பொருள் · Wealth
              </button>
              <button type="button" className="chip" aria-pressed="false">
                காமம் · Love
              </button>
            </div>

            <div className="space-y-2" aria-hidden="true">
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
