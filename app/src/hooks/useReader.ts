/**
 * Reader-side hooks: corpus loading, motion preference, connectivity and the
 * deferred install prompt.
 */
import { useEffect, useMemo, useState } from 'react'
import { loadCorpus } from '../lib/corpus'
import type { Corpus } from '../lib/types'
import { useReaderStore } from '../store/appStore'

type CorpusState =
  | { status: 'loading'; corpus: null; error: null }
  | { status: 'ready'; corpus: Corpus; error: null }
  | { status: 'error'; corpus: null; error: Error }

let cachedCorpus: Corpus | null = null

/** Load the corpus once and share it across every mounted consumer. */
export function useCorpus(): CorpusState {
  const [state, setState] = useState<CorpusState>(() =>
    cachedCorpus
      ? { status: 'ready', corpus: cachedCorpus, error: null }
      : { status: 'loading', corpus: null, error: null },
  )

  useEffect(() => {
    if (cachedCorpus) return
    let active = true

    loadCorpus()
      .then((corpus) => {
        cachedCorpus = corpus
        if (active) setState({ status: 'ready', corpus, error: null })
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            corpus: null,
            error: error instanceof Error ? error : new Error('unable to load the kurals'),
          })
        }
      })

    return () => {
      active = false
    }
  }, [])

  return state
}

/** True when the OS asks for reduced motion. */
export function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent): void => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * The single source of truth for motion: OS preference OR the in-app toggle.
 * Every animation in the app is gated on this.
 */
export function useReducedMotion(): boolean {
  const systemReduced = useSystemReducedMotion()
  const storeReduced = useReaderStore((state) => state.reduceMotion)
  return systemReduced || storeReduced
}

/** Reflect connectivity into the store so the offline banner can react. */
export function useOnlineStatus(): boolean {
  const online = useReaderStore((state) => state.online)
  const setOnline = useReaderStore((state) => state.setOnline)

  useEffect(() => {
    const goOnline = (): void => setOnline(true)
    const goOffline = (): void => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    setOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [setOnline])

  return online
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Capture the install prompt so the app can offer its own button instead of
 * the browser's default banner.
 */
export function useInstallPrompt(): { canInstall: boolean; promptInstall: () => Promise<void> } {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const installAvailable = useReaderStore((state) => state.installAvailable)
  const setInstallAvailable = useReaderStore((state) => state.setInstallAvailable)

  useEffect(() => {
    const onPrompt = (raw: Event): void => {
      raw.preventDefault()
      setEvent(raw as BeforeInstallPromptEvent)
      setInstallAvailable(true)
    }
    const onInstalled = (): void => {
      setEvent(null)
      setInstallAvailable(false)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [setInstallAvailable])

  return useMemo(
    () => ({
      canInstall: installAvailable && event !== null,
      promptInstall: async () => {
        if (!event) return
        await event.prompt()
        const choice = await event.userChoice
        if (choice.outcome === 'accepted') setInstallAvailable(false)
      },
    }),
    [event, installAvailable, setInstallAvailable],
  )
}

/** Apply the reader's theme / type / motion / contrast choices to <html>. */
export function useAppliedAppearance(): void {
  const theme = useReaderStore((state) => state.theme)
  const fontSize = useReaderStore((state) => state.fontSize)
  const lineSpacing = useReaderStore((state) => state.lineSpacing)
  const reduceMotion = useReaderStore((state) => state.reduceMotion)
  const highContrast = useReaderStore((state) => state.highContrast)

  useEffect(() => {
    const root = document.documentElement
    root.dataset['theme'] = theme
    // Type settings scale the reader's faces through CSS variables — they never
    // touch how a couplet is divided into lines.
    root.dataset['fontSize'] = fontSize
    root.dataset['lineSpacing'] = lineSpacing
    root.dataset['motion'] = reduceMotion ? 'reduced' : 'full'
    root.dataset['contrast'] = highContrast ? 'high' : 'normal'

    // Keep the browser/PWA chrome in step with the active theme.
    const base = getComputedStyle(root).getPropertyValue('--bg-base').trim()
    const meta = document.querySelector('meta[name="theme-color"]')
    if (base && meta) meta.setAttribute('content', base)
  }, [theme, fontSize, lineSpacing, reduceMotion, highContrast])
}
