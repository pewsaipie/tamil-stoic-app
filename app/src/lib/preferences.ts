/**
 * Preference & journey bridge.
 *
 * The shipped vanilla app already stores reader preferences, the reading
 * journey and onboarding state under well-known keys. This module reads those
 * shapes, migrates them into the React store's vocabulary, and writes them back
 * in the same shape — so a reader can move between the two implementations
 * without losing settings, and rolling back the rewrite stays safe.
 *
 *   tamil-stoic-reader-preferences-v1   preferences (see below)
 *   tamil-stoic-journey-v1              { read, chapters, streak, last }
 *   tamil-stoic-onboarding-seen-v1      "1"
 *   tamil-stoic-install-dismissed-v1    "1"
 */
import type { LayerKey } from './types'

export const PREF_KEY = 'tamil-stoic-reader-preferences-v1'
export const JOURNEY_KEY = 'tamil-stoic-journey-v1'
export const ONBOARDING_KEY = 'tamil-stoic-onboarding-seen-v1'
export const INSTALL_DISMISSED_KEY = 'tamil-stoic-install-dismissed-v1'

export type ThemeMode = 'day' | 'night' | 'system'
export type FontSize = 'standard' | 'large' | 'x-large'
export type LineSpacing = 'comfortable' | 'relaxed'
export type UiLanguage = 'en' | 'ta'

export interface Preferences {
  theme: ThemeMode
  fontSize: FontSize
  lineSpacing: LineSpacing
  uiLanguage: UiLanguage
  layers: Record<LayerKey, boolean>
  reduceMotion: boolean
  highContrast: boolean
}

export interface Journey {
  read: Record<string, true>
  chapters: Record<string, true>
  streak: number
  last: string
}

/** Legacy vocabulary → React vocabulary. */
const THEME_FROM_LEGACY: Record<string, ThemeMode> = {
  dark: 'night', // "Sangam clay" shipped in the dark slot
  light: 'day',
  palm: 'day', // pre-Kurinji day theme id
  system: 'system',
}
const THEME_TO_LEGACY: Record<ThemeMode, string> = {
  night: 'dark',
  day: 'light',
  system: 'system',
}

const FONT_SIZES: readonly FontSize[] = ['standard', 'large', 'x-large']
const LINE_SPACINGS: readonly LineSpacing[] = ['comfortable', 'relaxed']

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'night',
  fontSize: 'standard',
  lineSpacing: 'comfortable',
  uiLanguage: 'en',
  layers: { tamil: true, translit: true, english: true, simple: true },
  reduceMotion: false,
  highContrast: false,
}

function readJson(key: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode: preferences simply do not persist.
  }
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return fallback
}

export function readPreferences(): Preferences {
  const stored = readJson(PREF_KEY)
  if (!stored) return DEFAULT_PREFERENCES

  const layers: Record<LayerKey, boolean> = {
    tamil: asBoolean(stored['showTamil'], true),
    translit: asBoolean(stored['showTransliteration'], true),
    english: asBoolean(stored['showTranslation'], true),
    simple: asBoolean(stored['showSimple'], true),
  }
  // Never let a migration or a malformed value hide every layer at once.
  if (!layers.tamil && !layers.translit && !layers.english && !layers.simple) {
    layers.simple = true
  }

  const legacyScheme = typeof stored['colorScheme'] === 'string' ? stored['colorScheme'] : ''
  const fontSize = FONT_SIZES.find((size) => size === stored['fontSize'])
  const lineSpacing = LINE_SPACINGS.find((spacing) => spacing === stored['lineSpacing'])
  const uiLanguage = stored['uiLanguage'] === 'ta' ? 'ta' : 'en'

  return {
    theme: THEME_FROM_LEGACY[legacyScheme] ?? DEFAULT_PREFERENCES.theme,
    fontSize: fontSize ?? DEFAULT_PREFERENCES.fontSize,
    lineSpacing: lineSpacing ?? DEFAULT_PREFERENCES.lineSpacing,
    uiLanguage,
    layers,
    reduceMotion: asBoolean(stored['reduceMotion'], false),
    highContrast: asBoolean(stored['highContrast'], false),
  }
}

/** Persist in the legacy shape so the vanilla app still understands it. */
export function writePreferences(preferences: Preferences): void {
  writeJson(PREF_KEY, {
    fontSize: preferences.fontSize,
    lineSpacing: preferences.lineSpacing,
    colorScheme: THEME_TO_LEGACY[preferences.theme],
    uiLanguage: preferences.uiLanguage,
    showTamil: preferences.layers.tamil,
    showTransliteration: preferences.layers.translit,
    showTranslation: preferences.layers.english,
    showSimple: preferences.layers.simple,
    reduceMotion: preferences.reduceMotion,
    highContrast: preferences.highContrast,
  })
}

function today(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)
}

export function readJourney(): Journey {
  const stored = readJson(JOURNEY_KEY) ?? {}
  const read = typeof stored['read'] === 'object' && stored['read'] !== null ? stored['read'] : {}
  const chapters =
    typeof stored['chapters'] === 'object' && stored['chapters'] !== null ? stored['chapters'] : {}

  const journey: Journey = {
    read: read as Record<string, true>,
    chapters: chapters as Record<string, true>,
    streak: Number(stored['streak']) || 0,
    last: typeof stored['last'] === 'string' ? stored['last'] : '',
  }

  // Gentle streak: continuing a chain, restarting it, or simply visiting.
  if (journey.last !== today()) {
    journey.streak = journey.last === today(-1) ? journey.streak + 1 : 1
    journey.last = today()
    writeJourney(journey)
  }

  return journey
}

export function writeJourney(journey: Journey): void {
  writeJson(JOURNEY_KEY, journey)
}

export function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

export function writeFlag(key: string): void {
  try {
    window.localStorage.setItem(key, '1')
  } catch {
    // ignore
  }
}
