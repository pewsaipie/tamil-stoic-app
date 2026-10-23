/**
 * CholaHistorySection — Home subsection for Chola History (Sangam archaeology to
 * Imperial Chola bronzes, weaponry, and maritime wealth), dressed using the exact
 * PR #29 chroma-keyed alpha-WebP layer architecture.
 */
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Compass, Crown, Landmark, Shield } from 'lucide-react'
import type { Corpus } from '../../lib/types'
import { chapterOf } from '../../lib/corpus'
import { CHOLA_PILLARS, type CholaPillarId } from '../../lib/cholaHistory'
import { GlassCard } from '../ui/GlassCard'
import { KuralVerse } from '../kural/KuralVerse'
import { useMaterials } from '../../materials/useMaterials'
import { useOrnamentParallax } from '../ornament/useOrnamentParallax'
import { useT, useUiLanguage } from '../../i18n'
import { cn } from '../../lib/cn'

const PILLAR_ICONS: Record<CholaPillarId, typeof Landmark> = {
  archaeology: Landmark,
  bronzes: Crown,
  weapons: Shield,
  wealth: Compass,
}

const SHORT_LABELS: Record<CholaPillarId, { en: string; ta: string }> = {
  archaeology: { en: 'Sangam Archaeology', ta: 'சங்கத் தொல்லியல்' },
  bronzes: { en: 'Chola Bronzes', ta: 'செப்புத் திருமேனிகள்' },
  weapons: { en: 'Weapons & Navy', ta: 'ஆயுதங்களும் கடற்படையும்' },
  wealth: { en: 'Wealth & Trade', ta: 'வளமும் வாணிபமும்' },
}

function CholaHomeStage({ activePillar }: { activePillar: CholaPillarId }) {
  const { tier } = useMaterials()
  const stageRef = useRef<HTMLDivElement | null>(null)
  useOrnamentParallax(stageRef)

  if (tier === 'plain' || tier === 'contrast') return null

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      className="ornament-stage ornament-stage--chola-home"
      data-ornament="chola-varalaru-home"
      data-active-pillar={activePillar}
    >
      <div className="canon-weather canon-weather--chola-varalaru anim-canon-glow" />
      <div className="ornament-layer ornament-layer--chola-bronze">
        <div className="ornament-sway ornament-sway--chola-bronze ornament-bg--chola-bronze anim-chola-sheen" />
      </div>
      <div className="ornament-layer ornament-layer--chola-weapons">
        <div className="ornament-sway ornament-sway--chola-weapons ornament-bg--chola-weapons" />
      </div>
      <div className="ornament-layer ornament-layer--chola-archaeology">
        <div className="ornament-sway ornament-sway--chola-archaeology ornament-bg--chola-archaeology" />
      </div>
      <div className="ornament-layer ornament-layer--chola-wealth">
        <div className="ornament-sway ornament-sway--chola-wealth ornament-bg--chola-wealth anim-canon-glow" />
      </div>
    </div>
  )
}

export interface CholaHistorySectionProps {
  corpus: Corpus
}

export function CholaHistorySection({ corpus }: CholaHistorySectionProps) {
  const [activeId, setActiveId] = useState<CholaPillarId>('bronzes')
  const lang = useUiLanguage()
  const t = useT()

  const active = CHOLA_PILLARS.find((pillar) => pillar.id === activeId) ?? CHOLA_PILLARS[0]!
  const primaryKuralNumber = active.kuralNumbers[0]
  const pairedKural = corpus.kurals[primaryKuralNumber - 1]
  const pairedChapter = pairedKural ? chapterOf(corpus.chapters, pairedKural) : undefined

  const pick = (text: { readonly en: string; readonly ta: string }) =>
    lang === 'ta' ? text.ta : text.en

  return (
    <div className="chola-home-bleed rounded-[var(--radius-lg)] py-[var(--space-5)] px-3 sm:px-6">
      {/* PR #29 four-layer alpha-WebP edge stage around the Home subsection */}
      <CholaHomeStage activePillar={active.id} />

      <div className="relative z-10 mx-auto max-w-[var(--content-max)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="m-0 text-xs tracking-wide text-muted uppercase">
              {t('history.eyebrow', 'Sangam Archaeology · Imperial Chola Civilization')}
            </p>
            <h2 id="chola-history-title" className="mt-1 mb-0 text-lg text-ink">
              <span lang="ta">சோழர் வரலாறு</span> · {t('history.title', 'History of the Cholas')}
            </h2>
            <p className="mt-1 mb-0 max-w-[54ch] text-sm text-muted">
              {t(
                'history.homeSub',
                'From Puhar’s brick wharves and Kodumanal crucible steel to lost-wax bronzes, war shields, and ocean fleets — paired with Valluvar’s statecraft.',
              )}
            </p>
          </div>

          <Link
            to="/history"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius-md)] border border-line bg-glass px-3.5 py-2 text-sm text-accent-text no-underline transition-colors hover:border-accent"
          >
            <span>{t('history.openFull', 'Full chronicle')}</span>
            <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>

        {/* Four researched pillars — accessible WAI-ARIA tablist */}
        <div
          role="tablist"
          aria-label={t('history.tabsLabel', 'Chola history chapters')}
          className="mt-[var(--space-4)] grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {CHOLA_PILLARS.map((pillar) => {
            const selected = pillar.id === active.id
            const Icon = PILLAR_ICONS[pillar.id]
            const label = SHORT_LABELS[pillar.id]
            return (
              <button
                key={pillar.id}
                type="button"
                role="tab"
                id={`chola-tab-${pillar.id}`}
                aria-selected={selected}
                aria-controls={`chola-panel-${pillar.id}`}
                onClick={() => setActiveId(pillar.id)}
                className={cn(
                  'flex min-h-[46px] items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left text-xs font-medium transition-colors',
                  selected
                    ? 'border-accent bg-accent text-on-accent shadow-sm'
                    : 'border-line bg-glass/90 text-ink hover:border-accent/60',
                )}
              >
                <Icon size={15} strokeWidth={1.7} aria-hidden="true" className="shrink-0" />
                <span lang={lang === 'ta' ? 'ta' : undefined} className="leading-snug">
                  {pick(label)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Active pillar showcase panel */}
        <div
          role="tabpanel"
          id={`chola-panel-${active.id}`}
          aria-labelledby={`chola-tab-${active.id}`}
          className="mt-[var(--space-3)]"
        >
          <GlassCard className="p-4 sm:p-5">
            <div className="grid items-center gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
              {/* Unobstructed studio specimen plaque using the exact chroma-keyed WebP */}
              <div
                aria-hidden="true"
                className="chola-artifact-plaque-wrap relative mx-auto flex h-[196px] w-full max-w-[220px] flex-col items-center justify-center rounded-[var(--radius-md)] border border-line/80 p-3"
                style={{
                  backgroundImage:
                    'radial-gradient(85% 80% at 50% 45%, rgba(214, 158, 78, 0.2), rgba(20, 16, 12, 0.08) 100%)',
                }}
              >
                <div className={cn('chola-artifact-plaque', `ornament-bg--${active.layerKey}`)} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span lang={lang === 'ta' ? 'ta' : undefined} className="uppercase tracking-wide">
                    {pick(active.eyebrow)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span lang={lang === 'ta' ? 'ta' : undefined}>{pick(active.era)}</span>
                </div>

                <h3
                  lang={lang === 'ta' ? 'ta' : undefined}
                  className="mt-1 mb-2 text-base font-semibold text-ink sm:text-lg"
                >
                  {pick(active.title)}
                </h3>

                <p lang={lang === 'ta' ? 'ta' : undefined} className="m-0 text-sm text-muted">
                  {pick(active.summary)}
                </p>

                <ul className="mt-3 mb-0 list-disc space-y-1.5 pl-5 text-sm text-ink/90">
                  {active.highlights.map((item, idx) => (
                    <li key={idx} lang={lang === 'ta' ? 'ta' : undefined}>
                      {pick(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Stoic parallel + live two-line Thirukkural couplet */}
            <div className="mt-4 border-t border-line pt-4">
              <p lang={lang === 'ta' ? 'ta' : undefined} className="m-0 text-xs text-muted">
                <strong className="text-ink">
                  {t('history.stoicLens', 'Tamil Stoic lens:')}
                </strong>{' '}
                {pick(active.stoicBridge)}
              </p>

              {pairedKural ? (
                <div className="mt-3 rounded-[var(--radius-md)] border border-line/80 bg-glass/60 p-3.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>
                      {pairedChapter ? (
                        <>
                          <span lang="ta">{pairedChapter.ta}</span> · {pairedChapter.en}
                        </>
                      ) : null}
                    </span>
                    <Link
                      to={`/kural/${pairedKural.n}`}
                      className="text-accent-text no-underline hover:underline"
                    >
                      {t('history.readKural', 'Open Kural')} #{pairedKural.n} →
                    </Link>
                  </div>
                  <KuralVerse kural={pairedKural} />
                  <p className="mt-2 mb-0 text-sm text-muted">{pairedKural.s}</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Link
                  to={`/history?pillar=${active.id}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-2 text-sm font-medium text-on-accent no-underline"
                >
                  <span>
                    {t(
                      'history.explorePillar',
                      'Explore complete archaeological records & timeline',
                    )}
                  </span>
                  <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                </Link>
                <span className="text-xs text-muted">
                  {t(
                    'history.datingNote',
                    'Sangam excavations (pre-300 CE) & Imperial bronzes (9th–13th c. CE) dated separately.',
                  )}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
