/**
 * TopBar — the reader's small tool row: Reading settings, the private saved
 * collection, and (once M3 lands) the command palette.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Settings2 } from 'lucide-react'
import { SettingsSheet } from '../settings/SettingsSheet'
import { useReaderStore } from '../../store/appStore'
import { cn } from '../../lib/cn'

export interface TopBarProps {
  /** Title shown on the left (Tamil wordmark). */
  title?: string
  className?: string
}

export function TopBar({ title = 'திருக்குறள்', className }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const savedCount = useReaderStore((state) => state.saved.length)

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <span lang="ta" className="mr-auto text-sm text-muted">
          {title}
        </span>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-haspopup="dialog"
          aria-label="Reading settings"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:text-ink"
        >
          <Settings2 size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>

        <Link
          to="/saved"
          aria-label={`Saved kurals (${savedCount})`}
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
