import { useEffect, type RefObject } from 'react'
import { useMedia, useMotionVerdict } from '../../motion'

/**
 * Shared, input-driven depth for every canon stage.
 *
 * This deliberately starts no animation frame: pointer samples are throttled
 * to roughly 20 Hz and CSS settles the response. Reduced motion, open dialogs,
 * hidden tabs, save-data and the other runtime verdicts all stop the input.
 */
export function useOrnamentParallax(stageRef: RefObject<HTMLDivElement | null>): void {
  const { moving } = useMotionVerdict()
  const finePointer = useMedia('(pointer: fine)')

  useEffect(() => {
    if (!moving || !finePointer) return
    const stage = stageRef.current
    if (!stage) return

    let last = 0
    const onMove = (event: PointerEvent): void => {
      const now = performance.now()
      if (now - last < 48) return
      last = now
      stage.style.setProperty('--ornament-par-x', ((event.clientX / window.innerWidth - 0.5) * 2).toFixed(3))
      stage.style.setProperty(
        '--ornament-par-y',
        ((event.clientY / Math.max(1, window.innerHeight) - 0.5) * 1.2).toFixed(3),
      )
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [finePointer, moving, stageRef])
}
