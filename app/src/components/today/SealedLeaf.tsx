/**
 * The sealed leaf — today's couplet before it is opened.
 *
 * The reader does not "open a card" here. They **press a thumb into wax until
 * it breaks, and the leaf unrolls**. That happens in a real scene (see
 * `materials/scenes/seal/`), and this component is the seam between it and the
 * DOM.
 *
 * Three rules govern the seam, and they are the reason the ritual still works
 * for everyone:
 *
 *   1. **The DOM owns the interaction.** There is a real `<button>` with a real
 *      label, `aria-controls` and `aria-expanded`, exactly as before. The scene
 *      is decoration on top of it. Screen readers, keyboards, and every
 *      existing test see the same contract they always did.
 *   2. **The tier decides what the button is sitting on** — a live scene, the
 *      same scene frozen, or the flat SVG seal that shipped before the rework.
 *      All three open the couplet; none of them is a broken state.
 *   3. **Reduced motion skips the ceremony entirely.** Not "a shorter
 *      animation" — the reader asked for no animation, so the leaf is simply
 *      open, exactly as it was before any of this existed.
 */
import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { motion } from 'framer-motion'
import { taNumeral } from '../../lib/shareCard'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
import { readSoundEnabled } from '../../materials/preference.ts'
import { Css3dStage } from '../canvas/Css3dStage.tsx'
import { primeSound, setSoundEnabled } from '../../materials/sound.ts'
import { beginSeal } from '../../materials/scenes/seal/events.ts'
import { useMaterials } from '../../materials/useMaterials.ts'

/**
 * The scene is fetched only when the tier says it will actually be shown, and
 * only after the leaf mounts. Three.js is ~135 KB of library; it has no business
 * in the first paint of a page whose job is to show a couplet, and it has no
 * business in a jsdom test either.
 */
const SealScene = lazy(() =>
  import('../../materials/scenes/seal/SealScene.tsx').then((module) => ({ default: module.SealScene })),
)

/**
 * A scene that throws must not take the ritual with it.
 *
 * The failure modes are real and none of them are hypothetical: a driver that
 * loses the context under memory pressure, a shader that fails to compile on an
 * old mobile GPU, a lazy chunk that never arrives because the reader went
 * offline mid-session. Every one of them ends with the flat seal on screen and
 * a working couplet, which is the only acceptable outcome.
 */
class SceneBoundary extends Component<
  { children: ReactNode; onFailed: () => void },
  { failed: boolean }
> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.props.onFailed()
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * How long the scene gets to draw its first frame before the flat seal takes
 * over. Generous enough for a cold three.js parse on a slow phone, short enough
 * that a reader is never left staring at an empty box.
 */
const SCENE_READY_TIMEOUT_MS = 6000

export interface SealedLeafProps {
  kuralNumber: number
  /** `instant` skips the animation — used by "open without the ceremony". */
  onOpen: (options?: { instant?: boolean }) => void
  reducedMotion: boolean
  className?: string
}

/* ---------------------------------------------------------------------------
 * Tier 3 — the flat seal.
 *
 * This is the seal that shipped before the rework, kept as a first-class
 * renderer rather than a fallback nobody tests. It draws the same object in CSS
 * and SVG: twelve scallops of wax, the kural number struck into it, the fibre
 * of the leaf beneath. It costs nothing, works everywhere, and is what a reader
 * with forced colours, no WebGL, or an explicit request for the flat reader
 * sees.
 * ------------------------------------------------------------------------ */

function FlatWaxSeal({ number }: { number: number }) {
  const scallops = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2
    return { cx: 32 + Math.cos(angle) * 26, cy: 32 + Math.sin(angle) * 26, key: index }
  })

  return (
    <svg
      viewBox="0 0 64 64"
      width="76"
      height="76"
      aria-hidden="true"
      className="drop-shadow-[0_2px_6px_var(--accent-glow)]"
    >
      {scallops.map((dot) => (
        <circle key={dot.key} cx={dot.cx} cy={dot.cy} r="3.4" fill="var(--accent)" opacity="0.85" />
      ))}
      <circle cx="32" cy="32" r="23" fill="var(--accent)" />
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        stroke="var(--on-accent)"
        strokeWidth="0.9"
        opacity="0.45"
      />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fontSize="14"
        fontWeight={600}
        fill="var(--on-accent)"
        fontFamily="var(--font-tamil)"
      >
        {taNumeral(number)}
      </text>
    </svg>
  )
}

function FlatSealedLeaf({ kuralNumber }: { kuralNumber: number }) {
  const t = useT()

  return (
    <>
      {/* Rolled-leaf shading and the fibre of the palm leaf. Both sit under the
          text and use only verified surface tokens, so contrast holds. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.04) 45%, rgba(0,0,0,0.10) 100%)',
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 7px)',
        }}
      />
      <span className="relative flex flex-col items-center gap-[var(--space-4)]">
        <FlatWaxSeal number={kuralNumber} />
        <span className="flex flex-col gap-[var(--space-2)]">
          <span lang="ta" className="block text-xs tracking-wide text-muted uppercase">
            {t('ritual.sealed.eyebrow', "Today's couplet")}
          </span>
          <span className="block text-xl text-ink">
            {t('ritual.sealed.title', 'The leaf is still sealed')}
          </span>
          <span className="block text-sm text-muted">{t('ritual.sealed.hint', 'Tap to unroll it')}</span>
        </span>
        <span className="sr-only">
          {t(
            'ritual.sealed.sr',
            'Today’s couplet is sealed behind a palm leaf. Activate to unroll it and read.',
          )}
        </span>
      </span>
    </>
  )
}

/* ---------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------ */

export function SealedLeaf({ kuralNumber, onOpen, reducedMotion, className }: SealedLeafProps) {
  const t = useT()
  const started = useRef(false)
  const [revealed, setRevealed] = useState(false)

  /**
   * The tier comes from the shared materials hook, so a change in Reading
   * settings takes effect here rather than at the next reload — while the
   * capability probe itself is memoised inside the hook and never re-run
   * mid-press.
   */
  const { tier } = useMaterials()
  /**
   * `pending` while the scene is loading and drawing its first frame. If it
   * never gets there — no chunk, no context, a thrown error — this falls to
   * `failed` and the flat seal renders instead. The reader always ends up with
   * a couplet they can open.
   */
  const [scene, setScene] = useState<'pending' | 'ready' | 'failed'>('pending')
  const live = (tier === 'full' || tier === 'still' || tier === 'contrast') && scene !== 'failed'
  /**
   * The tier the scene is allowed to be told about.
   *
   * `css3d` and `plain` never mount a scene, so they never reach this prop — but
   * the type cannot see that, and narrowing here is what keeps the scene's
   * `quality` union small enough that adding a tier is a compile error in every
   * scene rather than a runtime question.
   */
  const sceneQuality = tier === 'contrast' ? 'contrast' : tier === 'still' ? 'still' : 'full'
  /**
   * No canvas exists at all on `css3d`, so the depth comes from CSS instead.
   * This is the one branch that is not a failure path: it renders for readers
   * whose browser cannot give them anything else, and it renders the same object
   * the flat seal is already drawing, at an angle in a room.
   */
  const cssDepth = tier === 'css3d' && scene !== 'failed'

  useEffect(() => {
    if (!live || scene !== 'pending') return
    const timer = window.setTimeout(() => {
      setScene((current) => (current === 'pending' ? 'failed' : current))
    }, SCENE_READY_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [live, scene])

  // Sound is off unless the reader turned it on; priming has to happen inside
  // the gesture, because the seal cracks 400 ms later.
  const armSound = useCallback(() => {
    if (!readSoundEnabled()) return
    setSoundEnabled(true)
    primeSound()
  }, [])

  /** Set when the reader pressed before the scene had finished loading. */
  const waiting = useRef(false)

  /**
   * The one entry point. Everything — a click, Enter, Space, a thumb on the
   * glass — arrives here and starts the same ceremony.
   *
   * The awkward case is a press that lands *while the scene is still being
   * fetched*. Three.js is a lazy chunk; on a slow connection there is a real
   * window where the leaf is on screen and the renderer is not. Firing the
   * start event into that window would lose it, leave the leaf sealed, and —
   * because the press is guarded against repeats — leave it sealed for good.
   * So the press is remembered and replayed the moment the scene is up.
   */
  const begin = useCallback(() => {
    if (started.current) return
    started.current = true
    armSound()

    if (!live) {
      // No scene to watch: open it the way this always worked, and keep the
      // haptic here rather than at the break, because there is no break to
      // watch.
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([6, 40, 10])
      }
      onOpen()
      return
    }

    if (scene === 'ready') beginSeal()
    else waiting.current = true
  }, [armSound, live, onOpen, scene])

  // Replay a press that arrived before the scene was ready…
  useEffect(() => {
    if (scene === 'ready' && waiting.current) {
      waiting.current = false
      beginSeal()
    }
  }, [scene])

  // …and if the scene never arrives at all, open the leaf the old way rather
  // than leaving the reader pressing a button that does nothing.
  useEffect(() => {
    if (scene === 'failed' && waiting.current) {
      waiting.current = false
      onOpen()
    }
  }, [scene, onOpen])

  /** The scene has finished. The DOM takes over and shows the couplet. */
  const handleRevealed = useCallback(() => {
    if (revealed) return
    setRevealed(true)
    onOpen()
  }, [onOpen, revealed])

  /** The wax just failed — the moment worth a haptic, not the page load. */
  const handleBreak = useCallback(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([6, 40, 10])
    }
  }, [])

  return (
    <div className={cn('text-center', className)}>
      {/*
        The scene sits *behind* the button, not inside it.

        A `<button>` may only contain phrasing content, and the renderer mounts
        a `<div>` around its canvas — so putting the scene inside would produce
        markup the HTML parser is entitled to rewrite. Keeping the button on top
        and transparent also means the reader is pressing a real button the
        whole time, which is what keeps the keyboard, the screen reader and the
        existing tests working.
      */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line">
        {cssDepth ? <Css3dStage reducedMotion={reducedMotion} /> : null}
        {live ? (
          <>
            {/* The room is dark in every theme on this screen. The lamp inside
                the scene is the only light, which is what makes it read as a
                place rather than a panel. */}
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'var(--stage-room)' }}
            />
            <span aria-hidden="true" className="absolute inset-0">
              <SceneBoundary onFailed={() => setScene('failed')}>
                <Suspense fallback={null}>
                  <SealScene
                    quality={sceneQuality}
                    reducedMotion={reducedMotion}
                    onRevealed={handleRevealed}
                    onBreak={handleBreak}
                    onReady={() => setScene('ready')}
                  />
                </Suspense>
              </SceneBoundary>
            </span>
          </>
        ) : null}

        <motion.button
          type="button"
          onClick={begin}
          // Pressing the object is the gesture, so the ceremony starts on the
          // way down rather than on release — a thumb pressed into wax does not
          // wait for you to let go.
          onPointerDown={begin}
          aria-expanded={false}
          aria-controls="daily-couplet"
          whileTap={!live && !reducedMotion ? { scale: 0.985 } : undefined}
          className={cn(
            'relative block w-full cursor-pointer text-center',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
            live ? 'bg-transparent' : 'bg-surface p-6 sm:p-8',
          )}
        >
          {live ? (
            <span className="flex h-[clamp(280px,46vw,400px)] w-full flex-col items-center justify-end gap-[var(--space-1)] p-4">
              {/* The caption sits where nothing is happening — the seal is the
                  thing being looked at, and it is up and to the left. */}
              <span lang="ta" className="block text-[11px] tracking-wide text-white/55 uppercase">
                {t('ritual.sealed.eyebrow', "Today's couplet")}
              </span>
              <span className="block text-base text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {t('ritual.sealed.title', 'The leaf is still sealed')}
              </span>
              <span className="block text-sm text-white/60">
                {t('ritual.sealed.hint', 'Tap to break the seal')}
              </span>
            </span>
          ) : (
            <FlatSealedLeaf kuralNumber={kuralNumber} />
          )}

          <span className="sr-only">
            {t(
              'ritual.sealed.sr',
              'Today’s couplet is sealed behind a palm leaf. Activate to unseal it and read.',
            )}
          </span>
        </motion.button>
      </div>

      <p className="mt-[var(--space-3)] mb-0">
        <button
          type="button"
          onClick={() => onOpen({ instant: true })}
          className="inline-flex min-h-[44px] items-center text-sm text-muted underline decoration-dotted underline-offset-4 hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t('ritual.sealed.skip', 'Open without the ceremony')}
        </button>
      </p>
    </div>
  )
}
