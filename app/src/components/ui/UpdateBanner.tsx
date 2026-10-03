/**
 * Update banner — the reader decides when to take a new version, so a recitation
 * or a half-read couplet is never yanked out from under them.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { registerServiceWorker, type UpdateAction } from '../../lib/pwa'
import { useReaderStore } from '../../store/appStore'
import { useOnlineStatus, useReducedMotion } from '../../hooks/useReader'
import { Button } from './Button'

export function UpdateBanner() {
  const [apply, setApply] = useState<UpdateAction | null>(null)
  const reducedMotion = useReducedMotion()
  const online = useOnlineStatus()
  const pushToast = useReaderStore((state) => state.pushToast)

  useEffect(() => {
    registerServiceWorker({
      onOfflineReady: () => pushToast('Ready to read offline ✓', 'success'),
      onUpdateReady: (applyUpdate) => setApply(() => applyUpdate),
    })
  }, [pushToast])

  return (
    <AnimatePresence>
      {apply && online ? (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          role="status"
          className="glass-panel glass-panel--quiet fixed inset-x-0 bottom-[72px] z-[var(--z-nav)] m-3 flex flex-wrap items-center justify-center gap-3 px-4 py-3 text-sm no-print"
        >
          <span className="text-muted">
            A calmer, newer version of Tamil Stoic is ready.
          </span>
          <Button size="sm" onClick={() => void apply(true)}>
            Update now
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setApply(null)}>
            Later
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
