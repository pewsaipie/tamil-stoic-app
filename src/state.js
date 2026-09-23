import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ---------- localStorage hook ----------
export function usePersistent(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return typeof initial === 'function' ? initial() : initial
      return JSON.parse(raw)
    } catch {
      return typeof initial === 'function' ? initial() : initial
    }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore quota / private mode */ }
  }, [key, value])
  return [value, setValue]
}

// ---------- Day-of-year key (Asia/Calcutta) ----------
export function todayKey(d = new Date()) {
  // Shift to IST so a user in Chennai sees the same "today" until midnight IST, not UTC.
  const ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000))
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`
}

// ---------- Daily kural index (stable per day + per-kural set) ----------
export function dailyIndexFor(date, total) {
  const key = todayKey(date)
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = ((h ^ key.charCodeAt(i)) * 16777619) >>> 0
  return h % Math.max(1, total)
}

// ---------- Streak ----------
export function useStreak() {
  const [openedDays, setOpenedDays] = usePersistent('ts.openedDays', [])
  const key = todayKey()
  useEffect(() => {
    setOpenedDays((prev) => {
      if (prev.includes(key)) return prev
      const next = [...prev, key].sort()
      // prune entries older than 60 days so storage stays tiny
      const cutoff = new Date(Date.now() - 60 * 86400000)
      return next.filter((k) => new Date(k) >= cutoff)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return useMemo(() => computeStreak(openedDays), [openedDays])
}

function computeStreak(days) {
  if (!days.length) return 0
  const set = new Set(days)
  let streak = 0
  const d = new Date()
  while (true) {
    const k = todayKey(d)
    if (set.has(k)) { streak += 1; d.setUTCDate(d.getUTCDate() - 1) } else break
    if (streak > 366) break
  }
  return streak
}

// ---------- Favorites ----------
export function useFavorites() {
  const [favs, setFavs] = usePersistent('ts.favs', [])
  const toggle = useCallback((n) => {
    setFavs((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
  }, [setFavs])
  return [favs, toggle]
}

// ---------- Reactions (local counts; seed with first click) ----------
export function useReactions() {
  const [counts, setCounts] = usePersistent('ts.reactions', {})
  const react = useCallback((kind, kuralN) => {
    setCounts((prev) => {
      const bucket = prev[kuralN] || { _pressed: {} }
      const key = `k${kuralN}_${kind}`
      const already = sessionStorage.getItem(key)
      if (already) return prev // one press per session per reaction/kural
      sessionStorage.setItem(key, '1')
      bucket[kind] = (bucket[kind] || 0) + 1
      return { ...prev, [kuralN]: bucket }
    })
    if (navigator.vibrate) navigator.vibrate(8)
  }, [setCounts])
  return [counts, react]
}

// ---------- Debounced value ----------
export function useDebounced(value, delay = 150) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

// ---------- Hash routing (simple #book-1, #chapter-16, #kural-151, #situation-anger) ----------
export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

// ---------- View transitions (graceful fallback) ----------
export function withTransition(fn) {
  if (typeof document !== 'undefined' && document.startViewTransition) {
    try { return document.startViewTransition(fn) } catch { fn() }
  } else {
    fn()
  }
}

// ---------- Haptic helper ----------
export function haptic(ms = 8) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(ms) } catch { /* ignore */ }
  }
}

// ---------- Install prompt ----------
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [dismissed, setDismissed] = usePersistent('ts.installDismissed', false)
  const [installed, setInstalled] = useState(() =>
    typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches ||
       window.navigator.standalone === true)
  )
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    const installedHandler = () => setInstalled(true)
    window.addEventListener('appinstalled', installedHandler)
    const mq = window.matchMedia('(display-mode: standalone)')
    const mqHandler = (e) => { if (e.matches) setInstalled(true) }
    mq.addEventListener?.('change', mqHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
      mq.removeEventListener?.('change', mqHandler)
    }
  }, [])
  const show = useCallback(async () => {
    if (!prompt) return false
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    setPrompt(null)
    return outcome === 'accepted'
  }, [prompt])
  return {
    canInstall: !installed && !dismissed && !!prompt,
    installed,
    prompt,
    show,
    dismiss: () => setDismissed(true),
  }
}

// ---------- Scroll to element (safe) ----------
export function scrollToId(id, opts = { block: 'start', behavior: 'smooth' }) {
  const el = document.getElementById(id)
  if (el && typeof el.scrollIntoView === 'function') {
    try { el.scrollIntoView(opts) } catch { /* ignore */ }
  }
}

// ---------- Hook to run once per session ----------
export function useOncePerSession(key, fn) {
  const ref = useRef(false)
  useEffect(() => {
    if (ref.current) return
    if (sessionStorage.getItem(key)) { ref.current = true; return }
    sessionStorage.setItem(key, '1')
    ref.current = true
    fn()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
