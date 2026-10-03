/**
 * TopBar — the reader's small tool row: Reading settings, the private saved
 * collection, and (once M3 lands) the command palette.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Search, Settings2 } from 'lucide-react'
import { SettingsSheet } from '../settings/SettingsSheet'
import { useReaderStore } from '../../store/appStore'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'

export interface TopBarProps {
  /** Title shown on the left (Tamil wordmark). */
  title?: string
  /** Opens the command palette; omitted on screens that own their own search. */
  onOpenPalette?: () => void
  className?: string
}

export function TopBar({ title = 'திருக்குறள்', onOpenPalette, className }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const savedCount = useReaderStore((state) => state.saved.length)
  const t = useT()

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <span lang="ta" className="mr-auto text-sm text-muted">
          {title}
        </span>

        {onOpenPalette ? (
          <button
            type="button"
            onClick={onOpenPalette}
            aria-haspopup="dialog"
            aria-label={t('action.palette', 'Search and commands')}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <Search size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-haspopup="dialog"
          aria-label={t('action.settings', 'Reading settings')}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:text-ink"
        >
          <Settings2 size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>

        <Link
          to="/saved"
          aria-label={`${t('action.saved', 'Saved Kurals')} (${savedCount})`}
          className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted no-underline hover:text-ink"
        >
          <Bookmark size={20} strokeWidth={1.5} aria-hidden="true" />
          {savedCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] text-on-accent"
            >
              {savedCount}
            </span>
          ) : null}
        </Link>
      </div>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
