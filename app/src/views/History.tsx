/**
 * History of the Cholas — dedicated full-chronicle view (`#/history`).
 *
 * Dressed at the viewport edges by `SangamCanon` (`chola-varalaru`: solid
 * lost-wax Chola Nataraja bronze, Wootz steel weapons & standing-tiger shield,
 * Sangam Black-and-Red Ware / Kilaiyur wharf bricks / Mediterranean amphora /
 * Wootz crucible, and Uraiyur cloth with Mannar pearls, Kodumanal beads,
 * tiger copper coins & gold Kāsu).
 */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCorpus } from '../hooks/useReader'
import { useReaderStore } from '../store/appStore'
import { chapterOf } from '../lib/corpus'
import {
  CHOLA_PILLARS,
  CHOLA_TIMELINE,
  type CholaPillar,
  type CholaPillarId,
} from '../lib/cholaHistory'
import { GlassCard } from '../components/ui/GlassCard'
import { CanonDivider } from '../components/ornament/CanonDivider'
import { KuralVerse } from '../components/kural/KuralVerse'
import { SettingsSheet } from '../components/settings/SettingsSheet'
import { useMotionSuspended } from '../motion'
import { useT, useUiLanguage } from '../i18n'
import { cn } from '../lib/cn'

export function History() {
  const { corpus } = useCorpus()
  const [searchParams, setSearchParams] = useSearchParams()
  const highContrast = useReaderStore((state) => state.highContrast)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const lang = useUiLanguage()
  const t = useT()

  useMotionSuspended(settingsOpen)

  const selectedParam = searchParams.get('pillar') as CholaPillarId | null
  const activeFilter: CholaPillarId | 'all' =
    selectedParam && CHOLA_PILLARS.some((p) => p.id === selectedParam) ? selectedParam : 'all'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeFilter])

  const pick = (text: { readonly en: string; readonly ta: string }) =>
    lang === 'ta' ? text.ta : text.en

  const visiblePillars: readonly CholaPillar[] =
    activeFilter === 'all'
      ? CHOLA_PILLARS
      : CHOLA_PILLARS.filter((pillar) => pillar.id === activeFilter)

  return (
    <main
      id="main"
      className="mx-auto max-w-[var(--content-max)] px-4 pt-[var(--space-5)] pb-[var(--space-9)]"
    >
      <nav aria-label="Breadcrumb" className="mb-[var(--space-3)]">
        <Link to="/" className="text-sm text-muted no-underline hover:text-ink">
          ← {t('nav.today', 'Today')}
        </Link>
      </nav>

      <p className="m-0 text-xs tracking-wide text-muted uppercase">
        {t('history.eyebrow', 'Sangam Archaeology · Imperial Chola Civilization')}
      </p>
      <h1 className="mt-1 mb-2 text-2xl text-ink sm:text-3xl">
        <span lang="ta">சோழர் வரலாறு</span> · {t('history.title', 'History of the Cholas')}
      </h1>
      <p className="mt-0 mb-[var(--space-4)] max-w-[62ch] text-sm text-muted">
        {t(
          'history.intro',
          'A complete two-epoch chronicle uniting Sangam-age archaeological excavations (Puhar, Uraiyur, Kodumanal, Keezhadi, Arikamedu) with Imperial Chola statecraft, solid lost-wax bronzes, crucible-steel weaponry, and maritime guilds — paired with Thiruvalluvar’s verses on just rule and valour.',
        )}
      </p>

      {highContrast ? (
        <p className="mt-0 mb-[var(--space-4)] text-sm text-muted" role="status">
          {t('home.ornamentHidden', 'Higher contrast hides decorative art.')}{' '}
          <button
            type="button"
            className="min-h-[44px] underline underline-offset-4"
            onClick={() => setSettingsOpen(true)}
          >
            {t('action.settings', 'Reading settings')}
          </button>
        </p>
      ) : null}

      {/* Filter / focus bar */}
      <div
        role="group"
        aria-label={t('history.filterLabel', 'Filter Chola chronicle by chapter')}
        className="mb-[var(--space-5)] flex flex-wrap gap-2"
      >
        <button
          type="button"
          aria-pressed={activeFilter === 'all'}
          onClick={() => setSearchParams({})}
          className={cn(
            'min-h-[44px] rounded-[var(--radius-md)] border px-3.5 py-2 text-xs font-medium transition-colors',
            activeFilter === 'all'
              ? 'border-accent bg-accent text-on-accent'
              : 'border-line bg-glass text-ink hover:border-accent/60',
          )}
        >
          {t('history.allChapters', 'All 4 chapters & timeline')}
        </button>
        {CHOLA_PILLARS.map((pillar) => {
          const pressed = activeFilter === pillar.id
          return (
            <button
              key={pillar.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => setSearchParams({ pillar: pillar.id })}
              className={cn(
                'min-h-[44px] rounded-[var(--radius-md)] border px-3.5 py-2 text-xs font-medium transition-colors',
                pressed
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-line bg-glass text-ink hover:border-accent/60',
              )}
            >
              <span lang={lang === 'ta' ? 'ta' : undefined}>{pick(pillar.title)}</span>
            </button>
          )
        })}
      </div>

      <CanonDivider className="mb-[var(--space-6)]" />

      {/* Four researched chapters */}
      <div className="space-y-[var(--space-7)]">
        {visiblePillars.map((pillar) => (
          <section
            key={pillar.id}
            id={`pillar-${pillar.id}`}
            aria-labelledby={`heading-${pillar.id}`}
            className="space-y-[var(--space-4)]"
          >
            <GlassCard className="p-5 sm:p-6">
              <div className="grid items-center gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <div
                  aria-hidden="true"
                  className="chola-artifact-plaque-wrap relative mx-auto flex h-[220px] w-full max-w-[230px] items-center justify-center rounded-[var(--radius-md)] border border-line/80 p-3"
                  style={{
                    backgroundImage:
                      'radial-gradient(85% 80% at 50% 45%, rgba(214, 158, 78, 0.22), rgba(20, 16, 12, 0.1) 100%)',
                  }}
                >
                  <div className={cn('chola-artifact-plaque', `ornament-bg--${pillar.layerKey}`)} />
                </div>

                <div>
                  <p
                    lang={lang === 'ta' ? 'ta' : undefined}
                    className="m-0 text-xs tracking-wide text-muted uppercase"
                  >
                    {pick(pillar.eyebrow)} · {pick(pillar.era)}
                  </p>
                  <h2
                    id={`heading-${pillar.id}`}
                    lang={lang === 'ta' ? 'ta' : undefined}
                    className="mt-1 mb-2 text-xl text-ink"
                  >
                    {pick(pillar.title)}
                  </h2>
                  <p lang={lang === 'ta' ? 'ta' : undefined} className="m-0 text-sm text-muted">
                    {pick(pillar.summary)}
                  </p>
                  <p
                    lang={lang === 'ta' ? 'ta' : undefined}
                    className="mt-3 mb-0 border-l-2 border-accent pl-3 text-sm text-ink/90"
                  >
                    {pick(pillar.stoicBridge)}
                  </p>
                </div>
              </div>

              {/* Primary evidence records */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {pillar.records.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-[var(--radius-md)] border border-line/80 bg-glass/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                      <span className="font-semibold tracking-wide text-accent-text uppercase">
                        {record.evidenceKind}
                      </span>
                      <span lang={lang === 'ta' ? 'ta' : undefined}>{pick(record.period)}</span>
                    </div>
                    <h3
                      lang={lang === 'ta' ? 'ta' : undefined}
                      className="mt-1 mb-1.5 text-base text-ink"
                    >
                      {pick(record.title)}
                    </h3>
                    <p lang={lang === 'ta' ? 'ta' : undefined} className="m-0 text-sm text-muted">
                      {pick(record.body)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Paired Thirukkural couplets */}
              {corpus ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {pillar.kuralNumbers.map((n) => {
                    const kural = corpus.kurals[n - 1]
                    if (!kural) return null
                    const chapter = chapterOf(corpus.chapters, kural)
                    return (
                      <div
                        key={n}
                        className="rounded-[var(--radius-md)] border border-line/80 bg-glass/50 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
                          <span>
                            {chapter ? (
                              <>
                                <span lang="ta">{chapter.ta}</span> · {chapter.en}
                              </>
                            ) : null}
                          </span>
                          <Link
                            to={`/kural/${kural.n}`}
                            className="text-accent-text no-underline hover:underline"
                          >
                            Kural #{kural.n} →
                          </Link>
                        </div>
                        <KuralVerse kural={kural} />
                        <p className="mt-2 mb-0 text-sm text-muted">{kural.s}</p>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </GlassCard>
          </section>
        ))}
      </div>

      {/* Chronological Sangam-to-Imperial Timeline */}
      <section aria-labelledby="chola-timeline-heading" className="mt-[var(--space-7)]">
        <CanonDivider className="mb-[var(--space-5)]" />
        <h2 id="chola-timeline-heading" className="m-0 text-xl text-ink">
          <span lang="ta">காலவரிசை</span> ·{' '}
          {t('history.timelineTitle', 'Chronology from Sangam Chiefdoms to Imperial Cholas')}
        </h2>
        <p className="mt-1 mb-[var(--space-4)] text-sm text-muted">
          {t(
            'history.timelineSub',
            'Each horizon cites its archaeological stratigraphy, literary anthology, or stone/copper-plate charter.',
          )}
        </p>

        <ol className="m-0 list-none space-y-3 p-0">
          {CHOLA_TIMELINE.map((entry) => (
            <li key={entry.id}>
              <GlassCard quiet className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span lang={lang === 'ta' ? 'ta' : undefined} className="font-semibold text-accent-text">
                    {pick(entry.span)}
                  </span>
                  <span lang={lang === 'ta' ? 'ta' : undefined}>
                    {pick(entry.capital)}
                  </span>
                </div>
                <h3
                  lang={lang === 'ta' ? 'ta' : undefined}
                  className="mt-1 mb-1 text-base text-ink"
                >
                  {pick(entry.rulerOrPhase)}
                </h3>
                <p lang={lang === 'ta' ? 'ta' : undefined} className="m-0 text-sm text-muted">
                  {pick(entry.note)}
                </p>
                <p className="mt-2 mb-0 text-xs text-muted">
                  {t('history.sourceLabel', 'Primary record:')} {entry.source}
                </p>
              </GlassCard>
            </li>
          ))}
        </ol>
      </section>

      {/* Archaeological & visual evidence note */}
      <section aria-labelledby="chola-evidence-heading" className="mt-[var(--space-7)]">
        <CanonDivider className="mb-[var(--space-5)]" />
        <GlassCard quiet className="p-5">
          <h2 id="chola-evidence-heading" className="m-0 text-base text-ink">
            {t('history.evidenceTitle', 'Archaeological & visual evidence standard')}
          </h2>
          <p className="mt-2 mb-0 text-sm text-muted">
            {t(
              'history.evidenceBody',
              'The four edge layers on Home’s Chola subsection and on this route are AI-assisted studio reconstructions grounded in two distinct historical horizons: Sangam-age excavations (c. 3rd c. BCE – 3rd c. CE at Kaveripoompattinam, Uraiyur, Kodumanal, Keezhadi, and Arikamedu) supply the Black-and-Red Ware, Kilaiyur wharf bricks, Mediterranean amphora, Wootz crucible, carnelian-beryl beads, Mannar pearls, and square standing-tiger copper coins; solid lost-wax Nataraja bronzes and stamped gold Kāsu belong explicitly to the Imperial Chola era (9th–13th c. CE). All rendered coins and surfaces use purely pictorial emblems with zero invented script.',
            )}
          </p>
          <p className="mt-3 mb-0 flex flex-wrap gap-4 text-sm">
            <Link to="/" className="text-accent-text no-underline hover:underline">
              ← {t('nav.backHome', 'Back to Today’s Kural')}
            </Link>
            <Link to="/credits" className="text-accent-text no-underline hover:underline">
              {t('credits.title', 'Credits & open source')} →
            </Link>
          </p>
        </GlassCard>
      </section>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  )
}
