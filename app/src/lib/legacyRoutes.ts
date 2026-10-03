/**
 * Legacy deep links — the shipped reader used flat fragment ids, and every
 * bookmark, shared link and PWA shortcut built from them must keep working after
 * the React rewrite takes over the live site.
 *
 * This runs *before* the router mounts, so a legacy fragment is upgraded to a
 * router route synchronously (the router would otherwise treat `#kural-151` as
 * an unknown path and replace it with `/`).
 *
 *   #kural-151     → /kural/151
 *   #theme-anger   → /chapters?theme=anger
 *   #chapter-16    → /chapters?chapter=16
 *   #daily         → /
 *   #browse, #main → /chapters
 *   #saved, #ask   → reserved for the features landing in M2/M3
 *
 * The manifest's `share_target` also delivers `?q=…`; that becomes a search.
 */
const KURAL = /^#kural-(\d{1,4})$/
const THEME = /^#theme-([a-z-]+)$/
const CHAPTER = /^#chapter-(\d{1,3})$/

export function upgradeLegacyUrl(): void {
  if (typeof window === 'undefined') return
  const { hash, pathname, search } = window.location

  if (hash && !hash.startsWith('#/')) {
    const kural = KURAL.exec(hash)
    const theme = THEME.exec(hash)
    const chapter = CHAPTER.exec(hash)
    let route: string | null = null

    if (kural?.[1]) route = `/kural/${kural[1]}`
    else if (theme?.[1]) route = `/chapters?theme=${theme[1]}`
    else if (chapter?.[1]) route = `/chapters?chapter=${chapter[1]}`
    else if (hash === '#daily' || hash === '#top') route = '/'
    else if (hash === '#browse' || hash === '#main' || hash === '#chapters') route = '/chapters'

    if (route) {
      window.history.replaceState(null, '', `${pathname}${search}#${route}`)
      return
    }
  }

  // Shared text arrives as ?q=… and should land on a search.
  if (!hash) {
    const params = new URLSearchParams(search)
    const q = params.get('q')
    if (q) {
      window.history.replaceState(null, '', `${pathname}#/chapters?q=${encodeURIComponent(q)}`)
    }
  }
}
