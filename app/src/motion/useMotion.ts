/**
 * The runtime, as hooks.
 *
 * Everything here is a thin reading of two pure pieces — `conditions.ts` and
 * `registers.ts` — plus the loop registry. The hooks exist so a component never
 * has to know the matrix: it asks whether the room is alive, which register it
 * is standing in, and registers its frames. It never asks whether the reader is
 * on Windows high contrast.
 *
 * `.ts` rather than `.tsx`, deliberately: these are functions with no JSX, and
 * the project's test scripts can import a `.ts` module directly but not a
 * `.tsx` one. Keeping the hooks importable means the *policy* can be tested
 * even though the components that use it cannot be rendered in CI.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useReaderStore } from '../store/appStore.ts'
import { useSystemReducedMotion } from '../hooks/useReader.ts'
import { useMaterials } from '../materials/useMaterials.ts'
import { motionVerdict, type MotionConditions, type MotionVerdict } from './conditions.ts'
import { LOOP_BUDGET } from './budget.ts'
import { routeLoops, type LoopReport } from './loops.ts'
import { registerForPath, type MotionRegister } from './registers.ts'

/* ---------------------------------------------------------------------------
 * the context
 * ------------------------------------------------------------------------ */

export interface MotionContextValue {
  /** Which landscape this screen is standing in. */
  register: MotionRegister
  conditions: MotionConditions
  verdict: MotionVerdict
  /** What the route is running, for a dev overlay and for the tests. */
  loops: LoopReport
  /** A dialog opening suspends the room behind it. Counting, not boolean. */
  suspend: (open: boolean) => void
}

export const MotionContext = createContext<MotionContextValue | null>(null)

export function useMotionContext(): MotionContextValue | null {
  return useContext(MotionContext)
}

/* ---------------------------------------------------------------------------
 * conditions
 * ------------------------------------------------------------------------ */

/** A media query as state. One helper, so no component re-implements `matchMedia`. */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const list = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches)
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** `document.hidden`, as state. */
export function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)

  useEffect(() => {
    const onVisibility = (): void => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return hidden
}

/**
 * Everything the verdict needs, gathered from the four places it lives.
 *
 * `dialogsOpen` is passed in rather than read, because it belongs to the
 * provider's own state and reading it here would make the provider depend on
 * itself.
 */
export function useMotionConditions(dialogsOpen: number): MotionConditions {
  const reduceMotion = useReaderStore((state) => state.reduceMotion)
  const highContrast = useReaderStore((state) => state.highContrast)
  const prefersReducedMotion = useSystemReducedMotion()
  const forcedColors = useMedia('(forced-colors: active)')
  const hidden = usePageHidden()
  const { tier } = useMaterials()

  const [saveData, setSaveData] = useState(false)
  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
    setSaveData(nav.connection?.saveData === true)
  }, [])

  return {
    reduceMotion,
    prefersReducedMotion,
    highContrast,
    forcedColors,
    saveData,
    tier,
    dialogsOpen,
    hidden,
  }
}

/**
 * The verdict for this screen.
 *
 * Falls back to computing it locally when there is no provider, which keeps a
 * component mountable on its own — the atmosphere layer is used by every route
 * and should not crash because one of them forgot the wrapper. Outside a
 * provider there is no dialog state to read, so it is assumed to be zero.
 */
export function useMotionVerdict(): MotionVerdict {
  const context = useContext(MotionContext)
  const local = useMotionConditions(0)
  return context ? context.verdict : motionVerdict(local)
}

/* ---------------------------------------------------------------------------
 * register
 * ------------------------------------------------------------------------ */

/** The register of the current route, with or without a provider. */
export function useMotionRegister(): MotionRegister {
  const context = useContext(MotionContext)
  const { pathname } = useLocation()
  return context ? context.register : registerForPath(pathname)
}

/* ---------------------------------------------------------------------------
 * frames
 * ------------------------------------------------------------------------ */

export interface MotionLoopStatus {
  running: boolean
  /** Why it is or is not running — shown in Reading settings, and in tests. */
  reason: string
}

/**
 * Run a frame callback while the room is alive, and only then.
 *
 * The hook is the *only* sanctioned way to start a `requestAnimationFrame`
 * chain in a component, and it earns that by doing five things a hand-rolled
 * loop forgets at least one of:
 *
 *   1. **It asks the verdict first.** Reduced motion, high contrast, forced
 *      colours, save-data and the flat reader all stop it before a frame is
 *      scheduled; a hidden tab and an open dialog pause it.
 *   2. **It registers against the route ceiling** and stands down, by name, if
 *      the route already has its three loops.
 *   3. **It throttles.** Idle weather does not need 60 fps; 30 is the default,
 *      and a caller can ask for less.
 *   4. **It survives a throw.** A loop whose drawing code throws is stopped and
 *      released rather than throwing sixty times a second for the life of the
 *      screen — the same doctrine as the scene boundary, applied to frames.
 *   5. **It gives `delta` in seconds, clamped.** A backgrounded tab returns with
 *      a delta of thirty seconds; unclamped, the first frame back teleports
 *      everything it draws.
 */
export function useMotionLoop(
  name: string,
  onFrame: (time: number, delta: number) => void,
  options: { fps?: number; enabled?: boolean } = {},
): MotionLoopStatus {
  const { fps = 30, enabled = true } = options
  const verdict = useMotionVerdict()
  const frame = useRef(onFrame)
  frame.current = onFrame
  const [status, setStatus] = useState<MotionLoopStatus>({ running: false, reason: 'not started' })

  const shouldRun = verdict.moving && enabled

  useEffect(() => {
    if (!shouldRun) {
      setStatus({ running: false, reason: enabled ? verdict.reason : 'waiting until it is in view' })
      return
    }

    const release = routeLoops.start(name)
    if (!release) {
      setStatus({
        running: false,
        reason: `refused: ${LOOP_BUDGET.idles} loops are already alive on this route`,
      })
      return
    }

    let raf = 0
    let origin = 0
    let last = 0
    const step = 1000 / fps

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick)
      if (origin === 0) {
        origin = now
        last = now - step
      }
      if (now - last < step) return
      const delta = Math.min(0.25, (now - last) / 1000)
      last = now
      try {
        frame.current((now - origin) / 1000, delta)
      } catch (error) {
        cancelAnimationFrame(raf)
        release()
        setStatus({ running: false, reason: 'the loop threw, and was stopped' })
        if (import.meta.env.DEV) console.error(`motion loop "${name}" stopped:`, error)
      }
    }

    raf = requestAnimationFrame(tick)
    setStatus({ running: true, reason: verdict.reason })

    return () => {
      cancelAnimationFrame(raf)
      release()
    }
  }, [shouldRun, name, fps, enabled, verdict.reason])

  return status
}

export interface InFrame<T extends Element> {
  /** Attach to the element that must be visible for the loop to be worth running. */
  ref: (node: T | null) => void
  node: T | null
  inFrame: boolean
}

/**
 * Whether an element is worth animating yet.
 *
 * Passed to `useMotionLoop` as `enabled`, so an off-screen canvas is not merely
 * invisible but stopped — the difference between a long page and a long page
 * that drains a battery. The same 160 px margin the scene stage uses, so a
 * scene is warm by the time it is on screen.
 */
export function useInFrame<T extends Element>(margin = '160px'): InFrame<T> {
  const [node, setNode] = useState<T | null>(null)
  const [inFrame, setInFrame] = useState(true)

  useEffect(() => {
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInFrame(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (entry) setInFrame(entry.isIntersecting)
      },
      { rootMargin: margin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, margin])

  const ref = useCallback((next: T | null) => setNode(next), [])

  return { ref, node, inFrame }
}

/**
 * Say that a modal is open, so the room behind it can wait.
 *
 * Counting rather than boolean: Home can have the palette and the settings sheet
 * tracked at once, and the last one to close should be the one that resumes the
 * frame. A no-op without a provider, so a dialog remains mountable on its own.
 */
export function useMotionSuspended(open: boolean): void {
  const suspend = useContext(MotionContext)?.suspend

  useEffect(() => {
    if (!suspend || !open) return
    suspend(true)
    return () => suspend(false)
  }, [suspend, open])
}
