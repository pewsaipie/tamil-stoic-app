/**
 * Three-step welcome tour, shown once per device (the same
 * `tamil-stoic-onboarding-seen-v1` flag the shipped reader writes, so a reader
 * who has seen it is never shown it twice).
 */
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { BookOpen, Bookmark, Sparkles } from 'lucide-react'
import { useReaderStore } from '../../store/appStore'
import { useT } from '../../i18n'
import { Button } from '../ui/Button'
import { useMotionSuspended } from '../../motion'
import { cn } from '../../lib/cn'

const STEPS = [
  {
    icon: Sparkles,
    titleKey: 'onboard.step1Title',
    title: "One kural a day",
    bodyKey: 'onboard.step1Body',
    body:
      "Today's kural greets you at the top. Tap “Another” for a different verse, or share it with someone who needs it.",
  },
  {
    icon: Bookmark,
    titleKey: 'onboard.step2Title',
    title: 'Save what meets you',
    bodyKey: 'onboard.step2Body',
    body:
      'Tap Save on any kural, or write a private reflection. Both stay on this device — never uploaded.',
  },
  {
    icon: BookOpen,
    titleKey: 'onboard.step3Title',
    title: 'Your way, offline',
    bodyKey: 'onboard.step3Body',
    body:
      'Choose text size, reading layers and the day/night palette in Reading settings. Install the app and the whole library reads offline.',
  },
] as const

export function OnboardingDialog() {
  const onboarded = useReaderStore((state) => state.onboarded)
  const completeOnboarding = useReaderStore((state) => state.completeOnboarding)
  const [step, setStep] = useState(0)

  // The first-run dialog is a modal like any other: the room waits behind it.
  useMotionSuspended(!onboarded)
  const t = useT()

  const current = STEPS[step] ?? STEPS[0]
  const Icon = current.icon
  const last = step === STEPS.length - 1

  return (
    // Controlled rather than unmounted: a Radix dialog that disappears while
    // it is still open never runs its cleanup, which leaves `aria-hidden`
    // stranded on the app shell — the whole page goes mute to a screen reader
    // the moment a reader dismisses the tour.
    <Dialog.Root
      open={!onboarded}
      onOpenChange={(open) => {
        if (!open) completeOnboarding()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'glass-panel grain fixed top-1/2 left-1/2 z-[var(--z-overlay)] w-[min(460px,92vw)]',
            '-translate-x-1/2 -translate-y-1/2 p-6',
          )}
        >
          <p className="m-0 text-xs tracking-wide text-muted uppercase">
            {step + 1} / {STEPS.length}
          </p>
          <Icon size={24} strokeWidth={1.5} aria-hidden="true" className="mt-3 text-accent-text" />
          <Dialog.Title className="mt-2 mb-0 text-xl text-ink">
            {t(current.titleKey, current.title)}
          </Dialog.Title>
          <Dialog.Description className="mt-2 mb-0 text-sm text-muted">
            {t(current.bodyKey, current.body)}
          </Dialog.Description>

          <div className="mt-[var(--space-5)] flex flex-wrap gap-3">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep((value) => value - 1)}>
                {t('onboard.back', 'Back')}
              </Button>
            ) : null}
            <Button
              onClick={() => {
                if (last) completeOnboarding()
                else setStep((value) => value + 1)
              }}
            >
              {last ? t('onboard.done', 'Start reading') : t('onboard.next', 'Next')}
            </Button>
            <Button variant="ghost" onClick={completeOnboarding}>
              {t('onboard.close', 'Skip')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
