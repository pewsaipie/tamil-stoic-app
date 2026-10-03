/**
 * SearchBar — the reader's search field with an as-you-type suggestion listbox
 * and recent searches. Numbers, Tamil, transliteration and English all work
 * (see lib/search.ts); recent searches are device-local.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Suggestion } from '../../lib/search'
import { cn } from '../../lib/cn'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  suggestions: readonly Suggestion[]
  recents: readonly string[]
  onPickSuggestion: (suggestion: Suggestion) => void
  onPickRecent: (value: string) => void
  onClearRecents: () => void
  /** id of the element that reports how many results are shown. */
  statusId?: string
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  suggestions,
  recents,
  onPickSuggestion,
  onPickRecent,
  onClearRecents,
  statusId,
}: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listId = useId()
  const containerRef = useRef<HTMLDivElement | null>(null)

  const showRecents = value.trim().length === 0 && recents.length > 0
  const showSuggestions = value.trim().length > 0 && suggestions.length > 0
  const visible = showSuggestions || showRecents

  useEffect(() => {
    setActiveIndex(-1)
  }, [value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const optionIds = useMemo(
    () => suggestions.map((suggestion) => `${listId}-${suggestion.id}`),
    [listId, suggestions],
  )

  const commit = (): void => {
    onSubmit(value)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          commit()
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search by kural number, Tamil, transliteration or English
        </label>
        <div className="relative">
          <Search
            size={18}
            strokeWidth={1.6}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            id={`${listId}-input`}
            type="search"
            role="combobox"
            aria-expanded={open && visible}
            aria-controls={open && visible ? listId : undefined}
            aria-autocomplete="list"
            aria-describedby={statusId}
            aria-activedescendant={
              open && visible && activeIndex >= 0 ? optionIds[activeIndex] : undefined
            }
            autoComplete="off"
            value={value}
            placeholder="151, பொறுத்தல், patience…"
            onChange={(event) => {
              onChange(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpen(false)
                return
              }
              if (!visible) return
              const count = showSuggestions ? suggestions.length : recents.length
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((index) => (index + 1) % Math.max(count, 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((index) => (index <= 0 ? count - 1 : index - 1))
              } else if (event.key === 'Enter' && activeIndex >= 0) {
                event.preventDefault()
                const suggestion = suggestions[activeIndex]
                if (suggestion) {
                  onPickSuggestion(suggestion)
                  setOpen(false)
                  return
                }
                const recent = recents[activeIndex]
                if (recent) {
                  onPickRecent(recent)
                  setOpen(false)
                }
              }
            }}
            className={cn(
              'min-h-[44px] w-full rounded-[var(--radius-pill)] border border-line bg-glass',
              'pr-10 pl-10 text-[15px] text-ink placeholder:text-muted',
            )}
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 inline-flex min-h-[36px] min-w-[36px] -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <X size={16} strokeWidth={1.6} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </form>

      {visible && open ? (
        <div className="absolute z-[var(--z-sticky)] mt-2 w-full">
          <ul
            id={listId}
            role="listbox"
            aria-label="Search suggestions"
            className="glass-panel max-h-[320px] overflow-auto p-1"
          >
            {showSuggestions
              ? suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.id}
                    id={`${listId}-${suggestion.id}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      'cursor-pointer rounded-[var(--radius-sm)] px-3 py-2',
                      index === activeIndex && 'bg-accent/10',
                    )}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      onPickSuggestion(suggestion)
                      setOpen(false)
                    }}
                  >
                    <span lang="ta" className="block text-sm text-ink">
                      {suggestion.label}
                    </span>
                    <span className="block text-xs text-muted">{suggestion.hint}</span>
                  </li>
                ))
              : recents.map((recent, index) => (
                  <li
                    key={recent}
                    id={`${listId}-recent-${index}`}
                    role="option"
                    aria-selected={false}
                    className="cursor-pointer rounded-[var(--radius-sm)] px-3 py-2 text-sm text-muted"
                    onPointerDown={(event) => {
                      event.preventDefault()
                      onPickRecent(recent)
                      setOpen(false)
                    }}
                  >
                    {recent}
                  </li>
                ))}
          </ul>
          {showRecents ? (
            <button type="button" onClick={onClearRecents} className="mt-1 px-3 text-xs text-muted">
              Clear recent searches
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
