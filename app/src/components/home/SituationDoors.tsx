/**
 * SituationDoors — "where are you today?" shortcuts. Each door opens the chapter
 * browser filtered to the theme it maps to (deep-linkable as /chapters?theme=…).
 */
import { Link } from 'react-router-dom'
import { SITUATIONS } from '../../lib/situations'
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
        return (
          <li key={situation.id}>
            <Link
              to={`/chapters?theme=${situation.theme}`}
              className="glass-panel glass-panel--quiet flex h-full flex-col gap-1 p-3 no-underline"
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" className="text-accent-text" />
              <span lang="ta" className="text-sm text-ink">
                {situation.ta}
              </span>
              <span className="text-xs text-muted">{situation.en}</span>
              {theme ? (
                <span className="mt-auto text-[11px] text-muted">
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
