/**
 * Command palette (⌘K / Ctrl+K) — go anywhere and do the common things without
 * leaving the keyboard: kural numbers, chapter names, theme filters, the reader's
 * destinations, appearance toggles and the interface language.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Bookmark,
  Contrast,
  Languages,
  Moon,
  Search,
  Settings2,
  Sparkles,
  Sun,
} from 'lucide-react'
import { useCorpus } from '../../hooks/useReader'
import { useReaderStore } from '../../store/appStore'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'

interface PaletteItem {
  id: string
  label: string
  hint?: string
  group: string
  icon: React.ReactNode
  run: () => void
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenSettings: () => void
  onOpenShortcuts: () => void
}

export function CommandPalette({ open, onOpenChange, onOpenSettings, onOpenShortcuts }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { corpus } = useCorpus()
  const t = useT()
  const theme = useReaderStore((state) => state.theme)
  const setTheme = useReaderStore((state) => state.setTheme)
  const uiLanguage = useReaderStore((state) => state.uiLanguage)
  const setUiLanguage = useReaderStore((state) => state.setUiLanguage)
  const highContrast = useReaderStore((state) => state.highContrast)
  const setHighContrast = useReaderStore((state) => state.setHighContrast)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  const items = useMemo<PaletteItem[]>(() => {
    const go = (to: string) => () => {
      navigate(to)
      onOpenChange(false)
    }
    const base: PaletteItem[] = [
      {
        id: 'today',
        label: t('nav.today', "Today's Kural"),
        group: 'Go to',
        icon: <Sparkles size={16} strokeWidth={1.6} />,
        run: go('/'),
      },
      {
        id: 'chapters',
        label: t('nav.chapters', 'Chapters'),
        hint: '133 அதிகாரங்கள்',
        group: 'Go to',
        icon: <BookOpen size={16} strokeWidth={1.6} />,
        run: go('/chapters'),
      },
      {
        id: 'ask',
        label: t('nav.ask', 'Ask Valluvar'),
        hint: 'வள்ளுவரைக் கேள்',
        group: 'Go to',
        icon: <Sparkles size={16} strokeWidth={1.6} />,
        run: go('/ask'),
      },
      {
        id: 'saved',
        label: t('nav.saved', 'Saved Kurals'),
        group: 'Go to',
        icon: <Bookmark size={16} strokeWidth={1.6} />,
        run: go('/saved'),
      },
      {
        id: 'search',
        label: 'Search all 1,330 kurals',
        group: 'Actions',
        icon: <Search size={16} strokeWidth={1.6} />,
        run: go('/chapters'),
      },
      {
        id: 'settings',
        label: t('action.settings', 'Reading settings'),
        group: 'Actions',
        icon: <Settings2 size={16} strokeWidth={1.6} />,
        run: () => {
          onOpenChange(false)
          onOpenSettings()
        },
      },
      {
        id: 'shortcuts',
        label: t('shortcuts.title', 'Keyboard shortcuts'),
        group: 'Actions',
        icon: <Search size={16} strokeWidth={1.6} />,
        run: () => {
          onOpenChange(false)
          onOpenShortcuts()
        },
      },
      {
        id: 'theme',
        label: theme === 'palm' ? 'Switch to Sangam clay' : 'Switch to Palm-leaf day',
        group: 'Appearance',
        icon:
          theme === 'palm' ? <Moon size={16} strokeWidth={1.6} /> : <Sun size={16} strokeWidth={1.6} />,
        run: () => {
          setTheme(theme === 'palm' ? 'night' : 'palm')
          onOpenChange(false)
        },
      },
      {
        id: 'contrast',
        label: highContrast ? 'Turn off higher contrast' : 'Turn on higher contrast',
        group: 'Appearance',
        icon: <Contrast size={16} strokeWidth={1.6} />,
        run: () => {
          setHighContrast(!highContrast)
          onOpenChange(false)
        },
      },
      {
        id: 'language',
        label: uiLanguage === 'ta' ? 'Switch interface to English' : 'இடைமுகத்தை தமிழில் மாற்று',
        group: 'Appearance',
        icon: <Languages size={16} strokeWidth={1.6} />,
        run: () => {
          setUiLanguage(uiLanguage === 'ta' ? 'en' : 'ta')
          onOpenChange(false)
        },
      },
    ]

    if (!corpus) return base

    const trimmed = query.trim().toLowerCase()
    const numeric = /^\d{1,4}$/.test(trimmed)

    if (numeric) {
      const n = Number.parseInt(trimmed, 10)
      if (n >= 1 && n <= corpus.kurals.length) {
        base.unshift({
          id: `kural-${n}`,
          label: `Kural ${n}`,
          hint: corpus.kurals[n - 1]?.ta.join(' ') ?? '',
          group: 'Kurals',
          icon: <Search size={16} strokeWidth={1.6} />,
          run: go(`/kural/${n}`),
        })
      }
    }

    if (trimmed.length >= 2) {
      for (const chapter of corpus.chapters) {
        if (base.length > 24) break
        if (
          chapter.ta.toLowerCase().includes(trimmed) ||
          chapter.en.toLowerCase().includes(trimmed)
        ) {
          base.push({
            id: `chapter-${chapter.n}`,
            label: `${chapter.n}. ${chapter.ta}`,
            hint: `${chapter.en} · ${chapter.start}–${chapter.end}`,
            group: 'Chapters',
            icon: <BookOpen size={16} strokeWidth={1.6} />,
            run: go(`/chapters?chapter=${chapter.n}`),
          })
        }
      }
      for (const themeTag of corpus.themes) {
        if (themeTag.id === 'all') continue
        if (
          themeTag.ta.toLowerCase().includes(trimmed) ||
          themeTag.en.toLowerCase().includes(trimmed)
        ) {
          base.push({
            id: `theme-${themeTag.id}`,
            label: `${themeTag.ta} · ${themeTag.en}`,
            hint: 'Theme filter',
            group: 'Themes',
            icon: <Sparkles size={16} strokeWidth={1.6} />,
            run: go(`/chapters?theme=${themeTag.id}`),
          })
        }
      }
      base.push({
        id: 'search-query',
        label: `Search “${query.trim()}”`,
        group: 'Search',
        icon: <Search size={16} strokeWidth={1.6} />,
        run: go(`/chapters?q=${encodeURIComponent(query.trim())}`),
      })
    }

    return base
  }, [
    corpus,
    query,
    navigate,
    onOpenChange,
    onOpenSettings,
    onOpenShortcuts,
    t,
    theme,
    setTheme,
    highContrast,
    setHighContrast,
    uiLanguage,
    setUiLanguage,
  ])

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return items
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(trimmed) ||
        (item.hint ?? '').toLowerCase().includes(trimmed) ||
        item.group.toLowerCase().includes(trimmed),
    )
  }, [items, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [filtered.length])

  const runItem = (item: PaletteItem | undefined): void => {
    if (!item) return
    item.run()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'glass-panel grain fixed top-[10vh] left-1/2 z-[var(--z-overlay)] w-[min(620px,92vw)]',
            '-translate-x-1/2 p-4',
          )}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{t('palette.title', 'Search and commands')}</Dialog.Title>
          <label htmlFor="palette-input" className="sr-only">
            {t('palette.placeholder', 'Search kurals, chapters or commands')}
          </label>
          <input
            id="palette-input"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((index) => Math.max(index - 1, 0))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                runItem(filtered[activeIndex])
              }
            }}
            placeholder={t('palette.placeholder', 'Search kurals, chapters or commands…')}
            className="min-h-[48px] w-full rounded-[var(--radius-md)] border border-line bg-glass px-3 text-[15px] text-ink"
          />

          <ul
            ref={listRef}
            aria-label="Results"
            className="mt-3 max-h-[52vh] list-none overflow-y-auto p-0"
          >
            {filtered.map((item, index) => (
              <li key={item.id} className="p-0">
                <button
                  type="button"
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => runItem(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left',
                    index === activeIndex ? 'bg-accent/12 text-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  <span aria-hidden="true" className="text-accent-text">
                    {item.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm">{item.label}</span>
                    {item.hint ? (
                      <span lang="ta" className="block text-xs text-muted">
                        {item.hint}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[11px] tracking-wide text-muted uppercase">{item.group}</span>
                </button>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? (
            <p className="mt-3 mb-0 text-sm text-muted">{t('palette.empty', 'Nothing matches.')}</p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
