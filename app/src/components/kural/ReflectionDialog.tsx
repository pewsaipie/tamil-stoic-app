/**
 * A private reflection — the reader's own note attached to a saved kural.
 * Stored only on this device (same IndexedDB record as the shipped reader, so
 * notes written before the rewrite are still here), capped at 500 characters.
 */
import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { NOTE_LIMIT } from '../../lib/library'
import { useReaderStore } from '../../store/appStore'
import { KuralVerse } from './KuralVerse'
import { Button } from '../ui/Button'
import type { Kural } from '../../lib/types'
import { cn } from '../../lib/cn'

export interface ReflectionDialogProps {
  kural: Kural | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReflectionDialog({ kural, open, onOpenChange }: ReflectionDialogProps) {
  const setNote = useReaderStore((state) => state.setNote)
  const pushToast = useReaderStore((state) => state.pushToast)
  const existing = useReaderStore((state) =>
    kural ? state.saved.find((record) => record.n === kural.n)?.note ?? '' : '',
  )
  const [note, setLocalNote] = useState(existing)

  useEffect(() => {
    if (open) setLocalNote(existing)
  }, [open, existing])

  if (!kural) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-[var(--z-overlay)] max-h-[90dvh] overflow-y-auto',
            'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(540px,92vw)]',
            'sm:-translate-x-1/2 sm:-translate-y-1/2',
            'glass-panel grain p-5 pb-[calc(var(--space-6)+env(safe-area-inset-bottom))] sm:p-6',
          )}
        >
          <div className="mb-[var(--space-4)] flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-xs tracking-wide text-muted uppercase">Kural #{kural.n}</p>
              <Dialog.Title className="m-0 text-xl text-ink">A private reflection</Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close reflection editor"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <X size={18} strokeWidth={1.6} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="mb-[var(--space-4)] border-y border-line py-3">
            <KuralVerse kural={kural} />
          </div>

          <Dialog.Description className="sr-only">
            Write a note that stays on this device with the kural you saved.
          </Dialog.Description>

          <label htmlFor="reflection-input" className="text-sm text-muted">
            What do you want to remember?
          </label>
          <textarea
            id="reflection-input"
            value={note}
            maxLength={NOTE_LIMIT}
            rows={5}
            onChange={(event) => setLocalNote(event.target.value.slice(0, NOTE_LIMIT))}
            placeholder="A thought for yourself — stored only on this device."
            className="mt-2 w-full rounded-[var(--radius-md)] border border-line bg-glass p-3 text-[15px] text-ink"
          />
          <p className="mt-1 mb-0 text-xs text-muted">
            Up to {NOTE_LIMIT} characters. Leaving this blank still saves the kural.
          </p>

          <div className="mt-[var(--space-4)] flex flex-wrap gap-3">
            <Button
              onClick={() => {
                void setNote(kural.n, note.trim())
                onOpenChange(false)
                pushToast(
                  note.trim()
                    ? 'Private reflection saved on this device.'
                    : 'Reflection cleared — the kural stays saved.',
                  'success',
                )
              }}
            >
              Save reflection
            </Button>
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
