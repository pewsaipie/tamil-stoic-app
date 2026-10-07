/**
 * Home — the vāsal (வாசல்), the dawn kolam threshold.
 *
 * The approved concept (docs/DESIGN-LANGUAGE-VASAL.md, reference image
 * design/home-concept-kolam.jpg): one red-oxide field, one dawn glow, the
 * day's couplet held in a white kolam frame, three kolam-ringed doors and a
 * small knot anchoring the bottom edge. Calm density — everything else the
 * reader needs lives one tap away through the doors, the palette or settings.
 *
 * All of the old home's behaviour survives: the couplet of the day, "another",
 * share, mark-read, loading and error states, and the view's own dialogs.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Bookmark, Search, Settings2, Sparkles } from 'lucide-react'
import { kuralOfTheDay } from '../lib/corpus'
import { shareKural } from '../lib/share'
import { useCorpus, useReducedMotion } from '../hooks/useReader'
import { useReaderStore } from '../store/appStore'
import { KolamFrame, KolamMotif, KolamRing } from '../components/vasal/kolam'
import { CommandPalette } from '../components/palette/CommandPalette'
import { ShortcutsDialog } from '../components/palette/ShortcutsDialog'
import { SettingsSheet } from '../components/settings/SettingsSheet'
import { useT, useUiLanguage } from '../i18n'
import { useMotionSuspended } from '../motion'
import type { Kural } from '../lib/types'
import '../styles/vasal.css'

function pickAnother(kurals: readonly Kural[], current: Kural): Kural {
  if (kurals.length < 2) return current
  let next = current
  while (next.n === current.n) {
    const candidate = kurals[Math.floor(Math.random() * kurals.length)]
    if (candidate) next = candidate
  }
  return next
}

/**
 * Tamil-first, like the concept: the Tamil label is the label in both
 * interface languages; the English line is a quiet sub-caption and only
 * appears when the interface itself is English.
 */
const DOORS = [
  { to: '/chapters', ta: 'அத்தியாயங்கள்', en: 'Chapters', Icon: BookOpen },
  { to: '/ask', ta: 'வள்ளுவரைக் கேள்', en: 'Ask Valluvar', Icon: Sparkles },
  { to: '/saved', ta: 'சேமித்தவை', en: 'Saved', Icon: Bookmark },
] as const

export function Home() {
  const { status, corpus, error } = useCorpus()
  const reducedMotion = useReducedMotion()
  const markRead = useReaderStore((state) => state.markRead)
  const pushToast = useReaderStore((state) => state.pushToast)
  const [override, setOverride] = useState<Kural | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const t = useT()
  const uiLanguage = useUiLanguage()

  const today = useMemo(() => (corpus ? kuralOfTheDay(corpus.kurals) : null), [corpus])
  const current = override ?? today

  useEffect(() => {
    if (current && corpus) markRead(current.n, current.ch)
  }, [current, corpus, markRead])

  useMotionSuspended(paletteOpen || settingsOpen || helpOpen)

  const share = useCallback(async () => {
    if (!current) return
    const outcome = await shareKural(current)
    if (outcome === 'copied') pushToast(t('vasal.toastCopied', 'Kural copied to the clipboard ✓'), 'success')
    if (outcome === 'failed') pushToast(t('vasal.toastFail', 'Sharing is unavailable on this device'), 'danger')
  }, [current, pushToast, t])

  return (
    <div className="vasal-root">
      {/* Quiet top row: eyebrow + the two utility doors. */}
      <header className="mx-auto w-full max-w-[var(--content-max)] px-4">
        <div className="vasal-top">
          <span className="vasal-eyebrow" lang="ta">
            {t('header.eyebrow', 'தமிழ் ஸ்டோயிக் · Tamil Stoic')}
          </span>
          <div className="vasal-top-actions">
            <button
              type="button"
              className="vasal-icon-btn"
              aria-label={t('action.palette', 'Search and commands')}
              onClick={() => setPaletteOpen(true)}
            >
              <Search size={20} strokeWidth={1.7} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="vasal-icon-btn"
              aria-label={t('action.settings', 'Reading settings')}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={20} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto flex w-full max-w-[var(--content-max)] flex-col items-center gap-[var(--space-7)] px-4 pt-[var(--space-6)] pb-[var(--space-7)]"
      >
        {/* The framed couplet. */}
        <section className="vasal-frame-wrap" aria-busy={status === 'loading'}>
          <KolamFrame className="vasal-frame" />
          <div className="vasal-frame-inner">
            <p className="vasal-label" lang="ta">
              {t('vasal.today', 'திருக்குறள் · இன்றைய குறள்')}
            </p>

            {status === 'loading' ? (
              <p className="vasal-status" lang="ta">
                {t('vasal.loading', 'குறள் வருகிறது…')}
              </p>
            ) : null}

            {status === 'error' ? (
              <div className="vasal-status" role="alert">
                <p>{error.message}</p>
                <p>{t('vasal.offline', 'The kurals live on your device after the first visit — reconnect once to fill the cache.')}</p>
              </div>
            ) : null}

            {current && corpus ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.blockquote
                  lang="ta"
                  key={current.n}
                  id="daily-couplet"
                  className="vasal-couplet"
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="vasal-line" data-verse-line="1">
                    {current.ta[0]}
                  </span>
                  <span className="vasal-line" data-verse-line="2">
                    {current.ta[1]}
                  </span>
                </motion.blockquote>
              </AnimatePresence>
            ) : null}

            {current && corpus ? (
              <div className="vasal-actions">
                <button
                  type="button"
                  lang="ta"
                  onClick={() => {
                    setOverride(pickAnother(corpus.kurals, current))
                    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                      navigator.vibrate([6, 50, 6])
                    }
                  }}
                >
                  {t('daily.shuffle', 'Another')}
                </button>
                <button type="button" lang="ta" onClick={() => void share()}>
                  {t('daily.share', 'Share')}
                </button>
                <Link to={`/kural/${current.n}`} lang="ta">
                  {t('vasal.open', 'முழுக் குறள்')}
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {/* Three kolam-ringed doors. */}
        <nav aria-label={t('nav.main', 'Primary')}>
          <ul className="vasal-doors">
            {DOORS.map(({ to, ta, en, Icon }) => (
              <li key={to}>
                <Link to={to} className="vasal-door">
                  <span className="vasal-door-ring">
                    <KolamRing />
                    <span className="vasal-door-glyph">
                      <Icon aria-hidden="true" />
                    </span>
                  </span>
                  <span className="vasal-door-label" lang="ta">
                    {ta}
                  </span>
                  {uiLanguage === 'en' ? <span className="vasal-door-sub">{en}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <KolamMotif className="vasal-motif" />
      </main>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setHelpOpen(true)}
      />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
