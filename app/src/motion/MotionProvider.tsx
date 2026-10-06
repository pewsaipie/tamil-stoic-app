/**
 * The provider — where the verdict becomes something the whole page can see.
 *
 * Two attributes on `<html>`, and one context, and that is the entire surface:
 *
 *   `data-motion="full" | "reduced"`
 *     Whether the room is animating, for the stylesheet. This attribute was
 *     already *designed* — `styles/ambient.css` carries a whole kill-switch block
 *     keyed on `[data-motion='reduced']` — and nothing in the app ever set it, so
 *     the in-app "Reduce motion" switch silenced the canvas and left every CSS
 *     loop running. The provider closes that gap: one writer, for both the
 *     reader's toggle and the system preference, and the stylesheet's own block
 *     becomes live without a line of CSS changing.
 *
 *   `data-register="kurinji" | …`
 *     Which landscape the page is standing in, for surfaces that want the
 *     register's timing in CSS rather than in JavaScript. Nothing keys off it
 *     yet; it is here because the alternative is each route reading its own
 *     pathname, which is how one route ends up in the wrong landscape.
 *
 * The value is rebuilt when it changes rather than memoised to a stable object
 * — the verdict *is* the state, and a stale context is worse than a re-render.
 * The provider sits above the router's outlet and re-renders on route changes
 * and settings changes only, so that is cheap.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motionVerdict } from './conditions.ts'
import { routeLoops } from './loops.ts'
import { registerForPath } from './registers.ts'
import { MotionContext, useMotionConditions } from './useMotion.ts'

export function MotionProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [dialogsOpen, setDialogsOpen] = useState(0)
  const conditions = useMotionConditions(dialogsOpen)
  const verdict = motionVerdict(conditions)
  const register = registerForPath(pathname)

  const suspend = useCallback((open: boolean) => {
    setDialogsOpen((count) => Math.max(0, open ? count + 1 : count - 1))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.motion = verdict.moving ? 'full' : 'reduced'
    root.dataset.register = register
  }, [verdict.moving, register])

  const value = useMemo(
    () => ({ register, conditions, verdict, loops: routeLoops.report(), suspend }),
    [register, conditions, verdict, suspend],
  )

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}
