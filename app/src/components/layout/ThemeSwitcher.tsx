/**
 * Theme switcher — three swatch buttons (Feature 8, Appearance).
 *
 * The swatches are real previews: each carries its own theme tokens via a
 * `data-theme` attribute, so the tile renders the palette it offers.
 */
import { Sun, Moon, MonitorSmartphone } from 'lucide-react'
import { useReaderStore } from '../../store/appStore'
import type { ThemeMode } from '../../lib/preferences'
import { cn } from '../../lib/cn'

const OPTIONS: ReadonlyArray<{ id: ThemeMode; label: string; ta: string; icon: typeof Sun }> = [
  { id: 'day', label: 'Kurinji Day', ta: 'பகல்', icon: Sun },
  { id: 'night', label: 'Kurinji Night', ta: 'இரவு', icon: Moon },
  { id: 'system', label: 'System', ta: 'கணினி', icon: MonitorSmartphone },
]

export function ThemeSwitcher({ className }: { className?: string }) {
  const theme = useReaderStore((state) => state.theme)
  const setTheme = useReaderStore((state) => state.setTheme)

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn('flex flex-wrap gap-2', className)}
    >
      {OPTIONS.map(({ id, label, ta, icon: Icon }) => {
        const active = theme === id
        return (
          <button
            key={id}
            type="button"
            data-theme={id === 'system' ? undefined : id}
            aria-pressed={active}
            onClick={() => setTheme(id)}
            className={cn(
              'flex min-h-[44px] items-center gap-2 rounded-[var(--radius-pill)] border px-4 text-sm',
              'transition-colors duration-[var(--dur)]',
              active
                ? 'border-accent bg-accent/15 text-accent-text'
                : 'border-line text-muted hover:border-line-strong hover:text-ink',
            )}
          >
            <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{label}</span>
            <span lang="ta" className="text-xs opacity-80">
              {ta}
            </span>
          </button>
        )
      })}
    </div>
  )
}
