/**
 * Service-worker registration and the reader-controlled update flow.
 *
 * `registerType: 'prompt'` means nothing swaps under the reader mid-kural: the
 * app announces that a new version is ready and applies it only when asked.
 * Registration is skipped in dev so the Vite dev server is never shadowed by a
 * stale precache (the test suite stubs the virtual module).
 */
import { registerSW } from 'virtual:pwa-register'

export type UpdateAction = (reload?: boolean) => Promise<void>

let applyUpdate: UpdateAction | null = null

export interface PwaCallbacks {
  /** The whole library is cached and the app will work offline. */
  onOfflineReady?: () => void
  /** A newer build is waiting; the reader decides when to take it. */
  onUpdateReady?: (apply: UpdateAction) => void
}

async function purgeLegacyVanillaCaches(): Promise<boolean> {
  if (typeof caches === 'undefined') return false
  try {
    const keys = await caches.keys()
    const legacy = keys.filter((key) => key.startsWith('tamil-stoic-'))
    if (legacy.length === 0) return false
    await Promise.all(legacy.map((key) => caches.delete(key)))
    return true
  } catch {
    return false
  }
}

export function registerServiceWorker(callbacks: PwaCallbacks = {}): void {
  if (import.meta.env.DEV) return

  const hadLegacyPromise = purgeLegacyVanillaCaches()

  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      callbacks.onOfflineReady?.()
    },
    onNeedRefresh() {
      applyUpdate = async (reload = true) => {
        await updateSW(reload)
      }
      void hadLegacyPromise.then((hadLegacy) => {
        if (hadLegacy) {
          void applyUpdate?.(true)
          return
        }
        callbacks.onUpdateReady?.(applyUpdate!)
      })
    },
  }) as unknown as UpdateAction
}

/** Apply a waiting update (used by the update banner). */
export async function applyWaitingUpdate(): Promise<void> {
  await applyUpdate?.(true)
}
