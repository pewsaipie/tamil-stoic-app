import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './views/Home'
import { KuralView } from './views/KuralView'
import { Chapters } from './views/Chapters'
import { Saved } from './views/Saved'
import { Credits } from './views/Credits'
import { AskValluvar } from './views/AskValluvar'
import { BottomNav } from './components/layout/BottomNav'
import { Atmosphere } from './components/ambient/Atmosphere'
import { Toasts } from './components/ui/Toasts'
import { OfflineBanner } from './components/ui/OfflineBanner'
import { UpdateBanner } from './components/ui/UpdateBanner'
import { CommandPalette } from './components/palette/CommandPalette'
import { ShortcutsDialog } from './components/palette/ShortcutsDialog'
import { OnboardingDialog } from './components/onboarding/OnboardingDialog'
import { SettingsSheet } from './components/settings/SettingsSheet'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { hydrateLibrary } from './store/appStore'
import { useAppliedAppearance, useInstallPrompt } from './hooks/useReader'

export function App() {
  // Node between the store and the document: theme, motion, contrast, chrome.
  useAppliedAppearance()
  useInstallPrompt()

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    void hydrateLibrary()
  }, [])

  // `/` jumps to the browse screen's search field.
  const openSearch = useCallback(() => {
    window.location.hash = '#/chapters'
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
    }, 60)
  }, [])

  useGlobalShortcuts({
    onPalette: () => setPaletteOpen(true),
    onHelp: () => setHelpOpen(true),
    onSearch: openSearch,
  })

  return (
    <>
      {/* The living-cover layer: petals by day, fireflies at midnight. */}
      <Atmosphere />
      <nav aria-label="Skip links">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[var(--z-overlay)] focus:rounded-[var(--radius-sm)] focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
        >
          Skip to content
        </a>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chapters" element={<Chapters />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/ask" element={<AskValluvar />} />
        <Route path="/kural/:number" element={<KuralView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BottomNav />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setHelpOpen(true)}
      />
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <OnboardingDialog />
      <Toasts />
      <UpdateBanner />
      <OfflineBanner />
    </>
  )
}
