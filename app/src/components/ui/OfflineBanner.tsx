/**
 * Offline banner (Feature 11) — appears only when the device loses the network,
 * and reassures rather than alarms: the corpus is already on the device.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus, useReducedMotion } from '../../hooks/useReader'

export function OfflineBanner() {
  const online = useOnlineStatus()
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {!online ? (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          role="status"
          className="glass-panel glass-panel--quiet fixed inset-x-0 bottom-0 z-[var(--z-nav)] m-3 flex items-center justify-center gap-2 px-4 py-3 text-sm text-muted no-print"
        >
          <WifiOff size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>You&rsquo;re offline — reading from cached kurals</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
