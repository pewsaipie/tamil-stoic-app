/**
 * SituationDoors — "where are you today?" shortcuts. Each door opens the chapter
 * browser filtered to the theme it maps to (deep-linkable as /chapters?theme=…).
 *
 * ## Why each door has its own weather
 *
 * The twelve doors are **states of a reader**, and in the Sangam frame a state
 * *is* a landscape: the thinai system does not describe scenery, it codifies
 * feeling as ecology. So a door is not a card with an icon on it — it is the
 * place that feeling belongs to, and it carries that place's weather:
 *
 *   - **குறிஞ்சி Kurinji** (union, joy) — kantal petals on the hill wind.
 *     In love, and thinking of friends.
 *   - **முல்லை Mullai** (patient waiting, hope) — the first rain on leaves.
 *     Patience, starting something, learning, and the pause before speaking.
 *   - **மருதம் Marutham** (the household: friction and abundance) — pond
 *     ripples. Anger, family, money and work.
 *   - **நெய்தல் Neithal** (pining, the tide) — grief.
 *   - **பாலை Palai** (the hard passage) — heat shimmer over dry ground. Fear.
 *
 * The weather is CSS, decorative, and silenced by the same two kill-switches as
 * everything else (`styles/ambient.css`). The mapping is data, not styling — it
 * lives in `lib/thinai.ts` and is asserted in `scripts/test-motion.mjs`, so a
 * door without a landscape, or a landscape without weather, fails the build.
 */
import { Link } from 'react-router-dom'
import { SITUATIONS } from '../../lib/situations'
import { DOOR_WEATHER } from '../../lib/thinai'
import { themeById } from '../../lib/search'
import type { ThemeTag } from '../../lib/types'

export interface SituationDoorsProps {
  themes: readonly ThemeTag[]
}

export function SituationDoors({ themes }: SituationDoorsProps) {
  return (
    <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
      {SITUATIONS.map((situation) => {
        const Icon = situation.icon
        const theme = themeById(themes, situation.theme)
        const register = DOOR_WEATHER[situation.id] ?? 'marutham'
        return (
          <li key={situation.id}>
            <Link
              to={`/chapters?theme=${situation.theme}`}
              className="glass-panel glass-panel--quiet group relative flex h-full flex-col gap-1 overflow-hidden p-3 no-underline transition-transform duration-200 ease-out motion-safe:hover:-translate-y-[2px] motion-safe:active:translate-y-0"
            >
              {/* The place this feeling belongs to, moving quietly behind it. */}
              <span aria-hidden="true" className="door-weather" data-register={register} />
              <Icon
                size={20}
                strokeWidth={1.5}
                aria-hidden="true"
                className="relative text-accent-text"
              />
              <span lang="ta" className="relative text-sm text-ink">
                {situation.ta}
              </span>
              <span className="relative text-xs text-muted">{situation.en}</span>
              {theme ? (
                <span className="relative mt-auto text-[11px] text-muted">
                  {theme.ta} · {theme.en}
                </span>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
