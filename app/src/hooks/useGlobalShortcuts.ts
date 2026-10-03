/**
 * Reader-wide keyboard shortcuts: `/` search, ⌘K / Ctrl+K the command palette,
 * `?` this help, and Esc to close. (`j k s l` belong to the reader screen and
 * are handled there, where a "current kural" exists.)
 */
import { useEffect } from 'react'

export interface ShortcutHandlers {
  onPalette: () => void
  onHelp: () => void
  onSearch: () => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable
  )
}

export function useGlobalShortcuts({ onPalette, onHelp, onSearch }: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const typing = isTypingTarget(event.target)

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onPalette()
        return
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === '/') {
        event.preventDefault()
        onSearch()
      } else if (event.key === '?') {
        event.preventDefault()
        onHelp()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onPalette, onHelp, onSearch])
}
