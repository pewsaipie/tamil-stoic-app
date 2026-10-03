/**
 * ChapterMap — all 133 அதிகாரங்கள் in one leaf-stack grid, grouped by book, with
 * a quiet visited mark for chapters the reader has opened.
 */
import { useMemo } from 'react'
import type { Chapter, Section } from '../../lib/types'
import { cn } from '../../lib/cn'

export interface ChapterMapProps {
  chapters: readonly Chapter[]
  sections: readonly Section[]
  /** Chapter numbers the reader has visited. */
  visited: Record<string, true>
  activeBook: number | 'all'
  activeChapter: number | null
  onSelect: (chapter: number) => void
}

export function ChapterMap({
  chapters,
  sections,
  visited,
  activeBook,
  activeChapter,
  onSelect,
}: ChapterMapProps) {
  const groups = useMemo(
    () =>
      sections.map((section) => ({
        section,
        chapters: chapters.filter((chapter) => chapter.sec === section.id),
      })),
    [chapters, sections],
  )

  return (
    <div className="space-y-[var(--space-5)]">
      {groups.map(({ section, chapters: group }) => {
        const hidden = activeBook !== 'all' && activeBook !== section.id
        return (
          <div key={section.id} hidden={hidden} className="space-y-2">
            <h4 className="m-0 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span lang="ta" className="text-ink">
                {section.ta}
              </span>
              <span className="text-xs text-muted">
                {section.en} · {group.length} chapters
              </span>
            </h4>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1">
              {group.map((chapter) => {
                const isVisited = visited[String(chapter.n)] === true
                const isActive = activeChapter === chapter.n
                return (
                  <button
                    key={chapter.n}
                    type="button"
                    onClick={() => onSelect(chapter.n)}
                    aria-pressed={isActive}
                    title={`${chapter.n} · ${chapter.ta} (${chapter.en})`}
                    className={cn(
                      'relative inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-sm)]',
                      'border border-line bg-glass text-sm text-muted',
                      'transition-colors duration-[var(--dur)] hover:border-line-strong hover:text-ink',
                      isActive && 'border-accent bg-accent text-on-accent',
                      !isActive && isVisited && 'text-accent-text',
                    )}
                  >
                    <span aria-hidden="true">{chapter.n}</span>
                    {isVisited && !isActive ? (
                      <span
                        aria-hidden="true"
                        className="absolute right-1 bottom-1 h-1.5 w-1.5 rounded-full bg-accent"
                      />
                    ) : null}
                    <span className="sr-only">
                      Chapter {chapter.n}: {chapter.ta} ({chapter.en})
                      {isVisited ? ' — visited' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
