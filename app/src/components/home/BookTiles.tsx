/**
 * BookTiles — the three books (அறம் · பொருள் · காமம்) with real, data-derived
 * counts. Tapping one opens the chapter browser filtered to that book.
 */
import { Link } from 'react-router-dom'
import type { Chapter, Kural, Section } from '../../lib/types'

export interface BookTilesProps {
  sections: readonly Section[]
  chapters: readonly Chapter[]
  kurals: readonly Kural[]
}

export function BookTiles({ sections, chapters, kurals }: BookTilesProps) {
  return (
    <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
      {sections.map((section) => {
        const bookChapters = chapters.filter((chapter) => chapter.sec === section.id)
        const bookKurals = kurals.filter((kural) => kural.sec === section.id)
        return (
          <li key={section.id}>
            <Link
              to={`/chapters?book=${section.id}`}
              className="glass-panel glass-panel--quiet block h-full p-4 no-underline"
            >
              <span lang="ta" className="block text-lg text-ink">
                {section.ta}
              </span>
              <span className="mt-1 block text-sm text-muted">
                {section.en} · {bookChapters.length} chapters · {bookKurals.length} kurals
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
