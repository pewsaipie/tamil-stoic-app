/**
 * Interface language — English strings live at the call sites; the Tamil
 * dictionary ships the translations. Switching to தமிழ் changes the chrome only:
 * the couplet is always Tamil, and its two-line layout never changes.
 */
import { useCallback } from 'react'
import { TA } from './ta'
import { useReaderStore } from '../store/appStore'

export type Translate = (key: string, english: string) => string

/** Translate with variable substitution: `{n}`, `{r}`, `{c}`, `{s}` … */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  )
}

export function useUiLanguage(): 'en' | 'ta' {
  return useReaderStore((state) => state.uiLanguage)
}

/** `t('nav.today', 'Today')` → "இன்று" in Tamil, "Today" in English. */
export function useT(): Translate {
  const language = useUiLanguage()
  return useCallback(
    (key: string, english: string): string => (language === 'ta' ? TA[key] ?? english : english),
    [language],
  )
}
