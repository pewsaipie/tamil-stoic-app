/**
 * Service worker registration.
 *
 * `registerType: 'prompt'` means the reader decides when an update is applied —
 * nothing swaps under them mid-read. Registration is skipped in dev so the
 * Vite dev server is never shadowed by a stale precache.
 */
import { registerSW } from 'virtual:pwa-register'

export function registerServiceWorker(onReady?: () => void): void {
  if (import.meta.env.DEV) return

  registerSW({
    immediate: true,
    onOfflineReady() {
      onReady?.()
    },
  })
}
