import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './views/Home'
import { KuralView } from './views/KuralView'
import { Chapters } from './views/Chapters'
import { BottomNav } from './components/layout/BottomNav'
import { Toasts } from './components/ui/Toasts'
import { OfflineBanner } from './components/ui/OfflineBanner'
import { hydrateLibrary } from './store/appStore'
import { useAppliedAppearance, useInstallPrompt } from './hooks/useReader'

export function App() {
  // Node between the store and the document: theme, motion, contrast, chrome.
  useAppliedAppearance()
  useInstallPrompt()

  useEffect(() => {
    void hydrateLibrary()
  }, [])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[var(--z-overlay)] focus:rounded-[var(--radius-sm)] focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Skip to content
      </a>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chapters" element={<Chapters />} />
        <Route path="/kural/:number" element={<KuralView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BottomNav />
      <Toasts />
      <OfflineBanner />
    </>
  )
}
