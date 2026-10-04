/**
 * Global reader state.
 *
 * Zustand keeps this small and explicit. Everything persisted here goes through
 * `lib/preferences` and `lib/library`, which speak the *existing* on-device
 * storage contract — nothing is sent anywhere, and a reader's saved kurals,
 * reflections, streak and settings survive the rewrite.
 */
import { create } from 'zustand'
import type { LayerKey } from '../lib/types'
import {
  DEFAULT_PREFERENCES,
  ONBOARDING_KEY,
  INSTALL_DISMISSED_KEY,
  readFlag,
  readJourney,
  readPreferences,
  writeFlag,
  writeJourney,
  writePreferences,
  type FontSize,
  type LineSpacing,
  type Preferences,
  type ThemeMode,
  type UiLanguage,
} from '../lib/preferences'
import { listSaved, putSaved, removeSaved, type SavedRecord } from '../lib/library'
import { localDayKey } from '../lib/dayKey'
import {
  markSat,
  readRitual,
  resealToday,
  setReminder,
  setSeal,
  unrollToday,
  type ReminderSettings,
  type RitualState,
} from '../lib/ritual'

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'success' | 'danger'
}

interface ReaderPreferencesState extends Preferences {
  setTheme: (theme: ThemeMode) => void
  setFontSize: (size: FontSize) => void
  setLineSpacing: (spacing: LineSpacing) => void
  setUiLanguage: (language: UiLanguage) => void
  toggleLayer: (layer: LayerKey) => void
  setReduceMotion: (reduce: boolean) => void
  setHighContrast: (contrast: boolean) => void
}

interface LibraryState {
  saved: SavedRecord[]
  /** True once on-device saves have been read at boot. */
  hydrated: boolean
  toggleSaved: (n: number) => Promise<void>
  setNote: (n: number, note: string) => Promise<void>
}

interface JourneyState {
  read: Record<string, true>
  chapters: Record<string, true>
  streak: number
  markRead: (n: number, chapter: number) => void
}

interface RitualSlice extends RitualState {
  /** Open today's leaf. Idempotent — the day is the unit, not the tap. */
  unroll: () => void
  /** Record a finished minute of sitting with today's couplet. */
  sit: () => void
  /** Forget today's opening, so the leaf can be arrived at again. */
  reseal: () => void
  setCeremony: (seal: boolean) => void
  updateReminder: (reminder: ReminderSettings) => void
}

interface AppState {
  onboarded: boolean
  installDismissed: boolean
  installAvailable: boolean
  online: boolean
  toasts: Toast[]
  completeOnboarding: () => void
  dismissInstall: () => void
  setInstallAvailable: (available: boolean) => void
  setOnline: (online: boolean) => void
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

export type ReaderStore = ReaderPreferencesState &
  LibraryState &
  JourneyState &
  RitualSlice &
  AppState

const bootPreferences = readPreferences()
const bootJourney = readJourney()
const bootRitual = readRitual()

let toastSequence = 0

export const useReaderStore = create<ReaderStore>((set, get) => {
  /** Persist the preference slice in the legacy shape after every change. */
  const persistPreferences = (): void => {
    const state = get()
    writePreferences({
      theme: state.theme,
      fontSize: state.fontSize,
      lineSpacing: state.lineSpacing,
      uiLanguage: state.uiLanguage,
      layers: state.layers,
      reduceMotion: state.reduceMotion,
      highContrast: state.highContrast,
    })
  }

  const persistJourney = (): void => {
    const state = get()
    writeJourney({
      read: state.read,
      chapters: state.chapters,
      streak: state.streak,
      last: localDayKey(),
    })
  }

  return {
    /* ---------- reading preferences (persisted) ---------- */
    ...DEFAULT_PREFERENCES,
    ...bootPreferences,
    layers: { ...bootPreferences.layers },

    setTheme: (theme) => {
      set({ theme })
      persistPreferences()
    },
    setFontSize: (fontSize) => {
      set({ fontSize })
      persistPreferences()
    },
    setLineSpacing: (lineSpacing) => {
      set({ lineSpacing })
      persistPreferences()
    },
    setUiLanguage: (uiLanguage) => {
      set({ uiLanguage })
      persistPreferences()
    },
    toggleLayer: (layer) => {
      const layers = { ...get().layers, [layer]: !get().layers[layer] }
      // Refuse to hide every layer — the reader would face a blank card.
      if (!layers.tamil && !layers.translit && !layers.english && !layers.simple) return
      set({ layers })
      persistPreferences()
    },
    setReduceMotion: (reduceMotion) => {
      set({ reduceMotion })
      persistPreferences()
    },
    setHighContrast: (highContrast) => {
      set({ highContrast })
      persistPreferences()
    },

    /* ---------- library (IndexedDB + legacy fallback) ---------- */
    saved: [],
    hydrated: false,

    toggleSaved: async (n) => {
      const existing = get().saved.find((record) => record.n === n)
      if (existing) {
        await removeSaved(n)
        set({ saved: get().saved.filter((record) => record.n !== n) })
        get().pushToast('Removed from your library', 'info')
        return
      }
      const record = await putSaved({ n })
      set({ saved: [...get().saved.filter((item) => item.n !== n), record] })
      get().pushToast('Saved to your library ✓', 'success')
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(8) // haptic hint on mobile
      }
    },

    setNote: async (n, note) => {
      const record = await putSaved({ n, note })
      set({ saved: [...get().saved.filter((item) => item.n !== n), record] })
    },

    /* ---------- reading journey ---------- */
    read: { ...bootJourney.read },
    chapters: { ...bootJourney.chapters },
    streak: bootJourney.streak,

    markRead: (n, chapter) => {
      const key = String(n)
      const chapterKey = String(chapter)
      const { read, chapters } = get()
      if (read[key] && chapters[chapterKey]) return
      set({
        read: { ...read, [key]: true },
        chapters: { ...chapters, [chapterKey]: true },
      })
      persistJourney()
    },

    /* ---------- the daily ritual ---------- */
    ...bootRitual,
    unrolled: { ...bootRitual.unrolled },
    sat: { ...bootRitual.sat },
    reminder: { ...bootRitual.reminder },

    // Each transition below writes storage and returns the next state; only the
    // fields it actually changed are pushed back into the store, so a ritual
    // update can never disturb preferences, library or journey.
    unroll: () => set({ unrolled: unrollToday(get()).unrolled }),

    sit: () => {
      set({ sat: markSat(get()).sat })
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([8, 60, 12])
      }
    },

    reseal: () => set({ unrolled: resealToday(get()).unrolled }),

    setCeremony: (seal) => set({ seal: setSeal(get(), seal).seal }),

    updateReminder: (reminder) => set({ reminder: setReminder(get(), reminder).reminder }),

    /* ---------- app-level transient state ---------- */
    onboarded: readFlag(ONBOARDING_KEY),
    installDismissed: readFlag(INSTALL_DISMISSED_KEY),
    installAvailable: false,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    toasts: [],

    completeOnboarding: () => {
      writeFlag(ONBOARDING_KEY)
      set({ onboarded: true })
    },
    dismissInstall: () => {
      writeFlag(INSTALL_DISMISSED_KEY)
      set({ installDismissed: true })
    },
    setInstallAvailable: (installAvailable) => set({ installAvailable }),
    setOnline: (online) => set({ online }),

    pushToast: (message, tone = 'info') => {
      const id = ++toastSequence
      set({ toasts: [...get().toasts, { id, message, tone }] })
      window.setTimeout(() => get().dismissToast(id), 2500)
    },
    dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
  }
})

/** Read the device library once at boot; the store mirrors it afterwards. */
export async function hydrateLibrary(): Promise<void> {
  try {
    const saved = await listSaved()
    useReaderStore.setState({ saved: saved.sort((a, b) => b.savedAt - a.savedAt), hydrated: true })
  } catch {
    useReaderStore.setState({ hydrated: true })
  }
}

/* ---------------------------------------------------------------------------
 * Selectors — narrow subscriptions keep re-renders predictable.
 * ------------------------------------------------------------------------ */
export const selectIsSaved = (n: number) => (state: ReaderStore): boolean =>
  state.saved.some((record) => record.n === n)

export const selectReadCount = (state: ReaderStore): number => Object.keys(state.read).length
export const selectChapterCount = (state: ReaderStore): number => Object.keys(state.chapters).length
