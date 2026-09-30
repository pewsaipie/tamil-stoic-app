/**
 * Toast queue (Feature 10E) — top-centre so the mobile keyboard never covers
 * it, glass styling, auto-dismissed by the store after 2.5s.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useReaderStore } from '../../store/appStore'
import { cn } from '../../lib/cn'
import { useReducedMotion } from '../../hooks/useReader'

const TONES: Record<'info' | 'success' | 'danger', string> = {
  info: 'text-ink',
  success: 'text-success',
  danger: 'text-danger',
}

export function Toasts() {
  const toasts = useReaderStore((state) => state.toasts)
  const reducedMotion = useReducedMotion()

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-toast)] flex flex-col items-center gap-2 p-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.p
            key={toast.id}
            layout
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={cn(
              'glass-panel glass-panel--quiet pointer-events-auto m-0 px-4 py-3 text-sm',
              TONES[toast.tone],
            )}
          >
            {toast.message}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  )
}
