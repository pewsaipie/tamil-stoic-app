/**
 * KurinjiVaikarai — the Home dressing from the Sangam theme canon.
 *
 * Dawn on the hill country, at the edges of the hero: the bamboo stand on the
 * left with its quiet parakeet, the dripping honeycomb high right, the
 * kurinji sprig cut at the bottom-right corner. The content — the couplet,
 * the doors, the books — is untouched; the dressing lives around it, which is
 * the whole point of the canon (docs/sangam-theme-canon.md §4).
 *
 * Three contracts, one per file that enforces it:
 *
 *   - **Motion is CSS.** The sways and the drip's glisten are classes in
 *     ambient.css on the kurinji beat (6.5 s, `REGISTER_MOTION.kurinji`),
 *     gated by the same two kill-switches as every other loop.
 *   - **Parallax is a response, not a loop.** Pointer nudged, ~20 Hz at most,
 *     settling under the interaction ceiling; it only feeds when the verdict
 *     says the room may move. It starts no `requestAnimationFrame` —
 *     `useMotion.ts` remains the only starter in `src/`.
 *   - **Flat readers get the UI they chose.** The `plain` and `contrast`
 *     tiers do not mount the dressing at all; every other quieting lives in
 *     the stylesheet with the rest of the decor.
 */
import { useEffect, useRef } from 'react'
import { useMedia, useMotionVerdict } from '../../motion'
import { useMaterials } from '../../materials/useMaterials.ts'

export function KurinjiVaikarai() {
  const { moving } = useMotionVerdict()
  const { tier } = useMaterials()
  const finePointer = useMedia('(pointer: fine)')
  const stageRef = useRef<HTMLDivElement | null>(null)

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
  }, [finePointer, moving])

  if (tier === 'plain' || tier === 'contrast') return null

  return (
    <div ref={stageRef} aria-hidden="true" className="ornament-stage" data-ornament="kurinji-vaikarai">
      <div className="ornament-layer ornament-layer--bamboo">
        <div className="ornament-sway ornament-sway--bamboo ornament-bg--bamboo anim-ornament-bamboo" />
      </div>
      <div className="ornament-layer ornament-layer--honey">
        <div className="ornament-sway ornament-sway--honey ornament-bg--honey anim-ornament-honey">
          <div className="ornament-sheen ornament-bg--honey anim-ornament-glisten" />
        </div>
      </div>
      <div className="ornament-layer ornament-layer--bloom">
        <div className="ornament-sway ornament-sway--bloom ornament-bg--bloom anim-ornament-bloom" />
      </div>
    </div>
  )
}
