/**
 * The couplet line contract — c8.
 *
 * A குறள் (Thirukkural couplet) is a single வெண்பா stanza of **seven சீர்** split
 * in the standard way: **four சீர் in the முதல் அடி (top line)** and **three சீர் in
 * the ஈற்றடி (bottom line)**. The reader therefore shows every couplet as a fixed
 * two-line block, top line first, and never merges, re-cuts, reorders or truncates
 * the lines — not for search results, not for the focus view, not for any
 * accessibility setting.
 *
 * Because a சீர் boundary usually coincides with a Tamil word boundary, that
 * standard split lands on **four words on top and three below in 1,301 of the
 * 1,330 couplets** — the reading the app is specified to show. In the remaining
 * **29** couplets the சீர் boundary falls inside a written word or inside a
 * sandhi compound, so the same standard split yields a different *word* count
 * (4/4, 4/2, 5/3, 3/3 or 4/5). The split is still the standard one, and a word is
 * never cut to force a 4/3 look. The full exception table, with the reasoning and
 * the textual sources behind each one, is in `docs/couplet-line-contract.md`, and
 * `scripts/test-couplet.mjs` fails if this file, the corpus and that document
 * disagree.
 *
 * This module is the only place where a couplet is turned into lines: every
 * surface renders through it, so the layout cannot drift between views.
 */
import type { Kural } from './types'

/** சீர் per line in the standard split: 4 (முதல் அடி) + 3 (ஈற்றடி). */
export const STHEER_PER_LINE = { top: 4, bottom: 3 } as const

/** Word counts the standard split produces in the overwhelming majority of couplets. */
export const STANDARD_WORD_SPLIT = { top: 4, bottom: 3 } as const

/** The document that carries the reasoning, the exception table and the sources. */
export const COUPLET_CONTRACT_DOC = 'docs/couplet-line-contract.md'

type Verseish = Pick<Kural, 'n' | 'ta'>

/**
 * The couplet as its two standard lines.
 *
 * The text is never altered: each line is the corpus line with its own internal
 * spacing tidied (the corpus inherits a few சீர் gaps from the source dataset),
 * and nothing is ever moved across the line break.
 */
export function coupletLines(kural: Verseish): [string, string] {
  return [tidy(kural.ta?.[0]), tidy(kural.ta?.[1])]
}

/** Word counts of the two standard lines, in reading order. */
export function lineWordCounts(kural: Verseish): [number, number] {
  const [top, bottom] = coupletLines(kural)
  return [wordCount(top), wordCount(bottom)]
}

/** True when the couplet's standard split lands on four words over three. */
export function isStandardWordSplit(kural: Verseish): boolean {
  const [top, bottom] = lineWordCounts(kural)
  return top === STANDARD_WORD_SPLIT.top && bottom === STANDARD_WORD_SPLIT.bottom
}

/** Everything after the first line of a couplet, as one string — for search and copy. */
export function coupletText(kural: Verseish): string {
  const [top, bottom] = coupletLines(kural)
  return `${top} ${bottom}`.trim()
}

export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function tidy(line: string | undefined): string {
  return String(line ?? '').replace(/\s+/g, ' ').trim()
}
