import { createContext, useContext, useEffect, useState } from 'react'
import { usePersistent } from './state'

const ThemeCtx = createContext(null)

export const THEMES = [
  { id: 'light', label: 'Day', icon: '☀️' },
  { id: 'night', label: 'Night', icon: '🌙' },
  { id: 'olive', label: 'Olive', icon: '🌿' },
]

export const FONT_SIZES = [
  { id: 'small', label: 'A', size: '13px' },
  { id: 'medium', label: 'A', size: '16px' },
  { id: 'large', label: 'A', size: '20px' },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = usePersistent('ts.theme', 'light')
  const [fontsize, setFontsize] = usePersistent('ts.fontsize', 'medium')
  const [systemDark, setSystemDark] = useState(false)
  const [showTranslit, setShowTranslit] = usePersistent('ts.showTranslit', true)
  const [showTranslation, setShowTranslation] = usePersistent('ts.showTranslation', true)
  const [showMeaning, setShowMeaning] = usePersistent('ts.showMeaning', true)
  const [reducedMotion, setReducedMotion] = useState(false)

  // Auto-detect dark mode on first load if no explicit preference set yet.
  useEffect(() => {
    const stored = localStorage.getItem('ts.theme')
    if (stored == null) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      setSystemDark(mq.matches)
      if (mq.matches) setTheme('night')
    }
  }, [setTheme]) // eslint-disable-line

  // Apply theme + font-size + hide-* flags to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-fontsize', fontsize)
    document.body.setAttribute('data-hide-translit', showTranslit ? '0' : '1')
    document.body.setAttribute('data-hide-translation', showTranslation ? '0' : '1')
    document.body.setAttribute('data-hide-meaning', showMeaning ? '0' : '1')
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'night' ? '#131316' : theme === 'olive' ? '#3f6a3d' : '#a94f31')
    }
  }, [theme, fontsize, showTranslit, showTranslation, showMeaning])

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e) => setReducedMotion(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const value = {
    theme, setTheme,
    fontsize, setFontsize,
    showTranslit, setShowTranslit,
    showTranslation, setShowTranslation,
    showMeaning, setShowMeaning,
    reducedMotion, systemDark,
  }
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
