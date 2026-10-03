/**
 * Keyboard shortcuts help (`?`).
 */
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'

const SHORTCUTS: readonly { keys: string; key: string; english: string }[] = [
  { keys: '/', key: 'shortcuts.search', english: 'Focus search' },
  { keys: '⌘K / Ctrl+K', key: 'shortcuts.palette', english: 'Open the command palette' },
  { keys: 'j', key: 'shortcuts.j', english: 'Next kural' },
  { keys: 'k', key: 'shortcuts.k', english: 'Previous kural' },
  { keys: 's', key: 'shortcuts.s', english: 'Save the Kural' },
  { keys: 'l', key: 'shortcuts.l', english: 'Listen to the Kural' },
  { keys: 'Enter', key: 'shortcuts.enter', english: 'Open the focused result' },
  { keys: '?', key: 'shortcuts.help', english: 'Show this help' },
]

export interface ShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const t = useT()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'glass-panel grain fixed top-1/2 left-1/2 z-[var(--z-overlay)] w-[min(460px,92vw)]',
            '-translate-x-1/2 -translate-y-1/2 p-5',
          )}
          aria-describedby={undefined}
        >
          <div className="mb-[var(--space-4)] flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-xs tracking-wide text-muted uppercase">
                {t('shortcuts.eyebrow', 'Keyboard')}
              </p>
              <Dialog.Title className="m-0 text-lg text-ink">
                {t('shortcuts.title', 'Keyboard shortcuts')}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close keyboard shortcuts"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <X size={18} strokeWidth={1.6} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.keys} className="col-span-2 grid grid-cols-[auto_1fr] items-center gap-x-4">
                <dt className="m-0">
                  <kbd className="rounded-[var(--radius-xs)] border border-line bg-surface px-2 py-1 text-xs text-ink">
                    {shortcut.keys}
                  </kbd>
                </dt>
                <dd className="m-0 text-sm text-muted">{t(shortcut.key, shortcut.english)}</dd>
              </div>
            ))}
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
