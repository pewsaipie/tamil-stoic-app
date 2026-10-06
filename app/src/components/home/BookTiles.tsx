/**
 * BookTiles — the three books (அறம் · பொருள் · காமம்) with real, data-derived
 * counts. Tapping one opens the chapter browser filtered to that book.
 *
 * The three books are **bundles of palm-leaf manuscripts on the table**, each
 * tied with its own cord and each carrying its own object: அறம் a stone slab,
 * பொருள் a coin vessel, காமம் a flower. They are drawn here rather than rendered
 * in 3D on purpose — the table scene owns the WebGL budget for this route, and
 * a bundle's *behaviour* is something CSS does perfectly: it lifts when the
 * reader reaches for it, its cord pulls tight, and its contact shadow separates
 * from the table so the lift is felt rather than merely seen.
 *
 * The counts and the links are untouched: a reader using a screen reader or a
 * keyboard gets exactly the list that shipped before.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Chapter, Kural, Section } from '../../lib/types'

/** The object each book carries, drawn as a small original SVG. */
function BookMark({ id }: { id: string }) {
  if (id === 'aram') {
    // A stone inscription slab: a struck edge on a pillar.
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7">
        <path d="M9 5h14v22H9z" fill="none" stroke="var(--gold)" strokeWidth="1.4" />
        <path d="M12.5 10h7M12.5 13.5h7M12.5 17h4.5" stroke="var(--gold)" strokeWidth="1.1" />
      </svg>
    )
  }
  if (id === 'porul') {
    // A small coin vessel with a coin resting on its mouth.
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7">
        <path d="M8 14h16l-2.4 10.5H10.4z" fill="none" stroke="var(--gold)" strokeWidth="1.4" />
        <circle cx="16" cy="10.5" r="3.4" fill="none" stroke="var(--gold-bright)" strokeWidth="1.3" />
        <path d="M16 8.4v4.2" stroke="var(--gold-bright)" strokeWidth="1" />
      </svg>
    )
  }
  // A jasmine garland: the flower of காமம்'s own landscape, mullai.
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7">
      <path
        d="M16 6.5c2.6 0 3.6 2.4 2.2 4.2 2.3-.9 4.4.9 3.3 3.1 2.4.3 3 2.9 1 4.1-2 1.2-4.2-.2-4.1-2.4-1 2.2-3.9 2.4-5.1.4-1.2 2-4.1 1.8-5.1-.4.1 2.2-2.1 3.6-4.1 2.4-2-1.2-1.4-3.8 1-4.1-1.1-2.2 1-4 3.3-3.1C7.4 8.9 8.4 6.5 11 6.5c1.6 0 2.7.9 3.2 2.1"
        fill="none"
        stroke="var(--kantal)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="14" r="2.1" fill="var(--gold-bright)" opacity="0.9" />
    </svg>
  )
}

function Bundle({ children }: { children: ReactNode }) {
  /*
   * The cord: two strands crossing the bundle, tied in a knot at the crossing.
   *
   * Reaching for the bundle pulls the cord tight — the strands draw in a
   * little and the knot darkens — which is the only movement in this file that
   * is a response rather than a lift, and it is what makes the shape read as
   * *tied* rather than as two lines drawn on a card. Under `motion-safe`, so a
   * reader who has asked for less motion still gets the lift's shadow and the
   * knot's colour change, just none of the tightening.
   */
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span
        className="absolute inset-y-3 left-[46%] w-px opacity-70 transition-transform duration-200 ease-out motion-safe:group-hover:scale-y-[1.08]"
        style={{ background: 'linear-gradient(180deg, transparent, var(--kantal-fill), transparent)' }}
      />
      <span
        className="absolute top-[62%] right-3 left-3 h-px opacity-60 transition-transform duration-200 ease-out motion-safe:group-hover:scale-x-[1.04]"
        style={{ background: 'linear-gradient(90deg, transparent, var(--kantal-fill), transparent)' }}
      />
      {/* The knot itself: one small circle where the strands cross. */}
      <span
        className="absolute top-[calc(62%-3px)] left-[calc(46%-3px)] h-[7px] w-[7px] rounded-full opacity-80 transition-opacity duration-200 ease-out group-hover:opacity-100"
        style={{ background: 'var(--kantal-fill)' }}
      />
      {children}
    </span>
  )
}

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
          <li key={section.id} className="group">
            <Link
              to={`/chapters?book=${section.id}`}
              /* The lift: reach for it and the bundle comes off the table a
                 little, its shadow separating underneath — so the movement is
                 the movement of an object, not of a card. */
              className="glass-panel glass-panel--quiet relative block h-full p-4 no-underline shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-200 ease-out group-hover:shadow-[var(--shadow-lg)] motion-safe:group-hover:-translate-y-[3px] motion-safe:group-focus-within:-translate-y-[3px]"
            >
              <Bundle>
                <span className="absolute top-3 right-3">
                  <BookMark id={String(section.id)} />
                </span>
              </Bundle>
              <span lang="ta" className="relative block text-lg text-ink">
                {section.ta}
              </span>
              <span className="relative mt-1 block text-sm text-muted">
                {section.en} · {bookChapters.length} chapters · {bookKurals.length} kurals
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
