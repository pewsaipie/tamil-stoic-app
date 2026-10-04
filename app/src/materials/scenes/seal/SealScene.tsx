/**
 * The table, and what happens on it.
 *
 * This is the first movement of the app in one scene: a rolled palm leaf, a
 * fibre cord, a wax seal — and the sequence that breaks the seal and unrolls
 * the leaf.
 *
 * **One clock.** Everything below is a pure function of `t`, the seconds since
 * the reader pressed. That is the whole design of this file, and it is worth
 * stating because the obvious alternative — a `phase` state with effects that
 * advance it — is wrong in a way that is hard to see: Phase A's elapsed time
 * resets when Phase B begins, so anything spanning the boundary (the cord
 * falling, the shards flying) jumps. With a single monotonic `t`, every object
 * can be at a different point in its own beat and still agree about when
 * "now" is.
 *
 * **Nothing here owns app state.** When the leaf has finished unrolling the
 * scene calls `onRevealed()`, and the DOM — which always owned the decision —
 * takes over and shows the couplet.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { createLeaf } from './leafGeometry.ts'
import { createLeafMaterial } from './leafSurface.ts'
import { createWaxSeal, type WaxSeal } from './waxSeal.ts'
import { createCord, type Cord } from './cord.ts'
import { getEnvironment, getMaterial } from '../../library.ts'
import { applyContrastPass, contrastBackdrop } from '../../contrastPass.ts'
import { readSystemPalette } from '../../forcedColours.ts'
import { play } from '../../sound.ts'
import { SEAL_BEGIN_EVENT } from './events.ts'
import { SCENE_FOV_DEGREES, framingAt } from './framing.ts'
import {
  T_BREAK,
  T_CORD_RELEASE,
  T_PRESS_END,
  T_REVEAL,
  openingAt,
  phaseAt,
  unrollAt,
} from './timeline.ts'

/* ---------------------------------------------------------------------------
 * The timeline, in seconds from the moment of the press.
 *
 * These are the only numbers in the app that decide how the ceremony feels.
 * They are here, together, for exactly that reason — a beat that is wrong
 * should be a one-line change, not an archaeology expedition.
 * ------------------------------------------------------------------------ */
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

function easeInOut(t: number): number {
  const c = clamp01(t)
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2
}

export interface SealSceneProps {
  /** Fired once the leaf is open and the DOM should take over. */
  onRevealed: () => void
  /** Fired the moment the wax actually fails — for haptics. */
  onBreak?: () => void
  /** The reader's reduced-motion preference. */
  reducedMotion: boolean
  /**
   * Render quality. `still` drops shadows and post effects, never the scene;
   * `contrast` keeps the scene and hands the whole frame to the forced-colours
   * pass — same objects, same one clock, no maps, no colour of ours.
   */
  quality?: 'full' | 'still' | 'contrast'
  /**
   * Fired once the renderer exists and has drawn. The caller uses it to fall
   * back to the flat seal if a canvas never comes up — a context that is
   * created and then dies should not leave the reader with an empty box.
   */
  onReady?: () => void
}

/* ---------------------------------------------------------------------------
 * The leaf
 * ------------------------------------------------------------------------ */

function LeafMesh({ t }: { t: number }) {
  const leaf = useMemo(
    () =>
      createLeaf({
        length: 0.34,
        width: 0.075,
        thickness: 0.0011,
        segmentsAlong: 96,
        segmentsAcross: 18,
      }),
    [],
  )
  const surface = useMemo(() => createLeafMaterial(), [])

  useEffect(
    () => () => {
      leaf.dispose()
      surface.dispose()
    },
    [leaf, surface],
  )

  useFrame((_, delta) => {
    // Straight from the timeline: a steady pull while the strip is coming off
    // the coil, then the last curl relaxing into flat. No easing here — the
    // speed of the pull is the *reader's* speed, and the leaf's own geometry
    // supplies everything that follows from it.
    const unroll = unrollAt(t)

    leaf.setUnroll(unroll)
    surface.uniforms.uUnroll.value = clamp01(unroll)
    // The writing is on the inner face, so it only exists once the leaf has
    // turned over far enough to expose it.
    surface.uniforms.uInk.value = clamp01((unroll - 0.4) / 0.55)
    surface.uniforms.uTime.value += delta
  })

  return (
    <mesh
      geometry={leaf.geometry}
      material={surface.material}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  )
}

/* ---------------------------------------------------------------------------
 * The wax
 * ------------------------------------------------------------------------ */

function Wax({
  t,
  onBreak,
  position,
}: {
  t: number
  onBreak: () => void
  position: [number, number, number]
}) {
  const seal: WaxSeal = useMemo(() => createWaxSeal({ radius: 0.0135, height: 0.0045 }), [])
  const struck = useRef(false)

  useEffect(
    () => () => {
      seal.dispose()
    },
    [seal],
  )

  useFrame((_, delta) => {
    const phase = phaseAt(t)

    if (phase === 'pressing') {
      seal.setImpression(clamp01(t / T_PRESS_END))
      // A held thumb is never perfectly still, and wax under pressure creeps.
      const creep = 1 - clamp01(t / T_PRESS_END)
      seal.group.position.set(Math.sin(t * 84) * 0.00016 * creep, 0, Math.sin(t * 61) * 0.0001 * creep)
    }

    if (t >= T_BREAK && !struck.current) {
      struck.current = true
      seal.setImpression(0)
      // Struck from the front-right, which is where a right thumb lands.
      seal.break(new THREE.Vector3(0.32, 0, 0.95), 3.6)
      play('wax-crack', { intensity: 1 })
      onBreak()
    }

    if (struck.current) seal.update(delta, 0)
  })

  return <primitive object={seal.group} position={position} />
}

/* ---------------------------------------------------------------------------
 * The table
 * ------------------------------------------------------------------------ */

function Table() {
  const material = useMemo(
    () =>
      getMaterial('table', {
        // Teak, oiled and darkened by a century of hands.
        color: new THREE.Color('#6a4a2c'),
        roughness: 0.8,
        metalness: 0,
        envMapIntensity: 0.3,
      }),
    [],
  )

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[2.4, 2.4]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ---------------------------------------------------------------------------
 * Light — one lamp, and the room it makes
 * ------------------------------------------------------------------------ */

function Lamp() {
  const light = useRef<THREE.SpotLight>(null)
  const target = useMemo(() => {
    const object = new THREE.Object3D()
    object.position.set(0, 0, 0)
    return object
  }, [])

  useFrame(({ clock }) => {
    const spot = light.current
    if (!spot) return
    // The flame is never still. Two incommensurate frequencies stop it pulsing
    // in an obvious loop, and because the shadows move with it the scene is
    // alive before anything has happened in it — which is most of the reason
    // it reads as a place rather than a render.
    const time = clock.getElapsedTime()
    const flicker =
      1 + Math.sin(time * 7.3) * 0.022 + Math.sin(time * 17.9) * 0.012 + Math.sin(time * 2.1) * 0.018
    spot.intensity = 5.4 * flicker
    spot.position.x = 0.34 + Math.sin(time * 1.3) * 0.004
    spot.position.y = 0.46 + Math.sin(time * 2.7) * 0.003
  })

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        position={[0.34, 0.46, 0.22]}
        target={target}
        angle={0.9}
        penumbra={0.8}
        decay={2}
        distance={4}
        intensity={5.4}
        color="#ffc978"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0009}
        shadow-normalBias={0.005}
      />
      {/* Ambient is almost nothing. Letting the far side go properly dark is
          what makes the lamp read as a light source rather than a filter. */}
      <ambientLight intensity={0.14} color="#5a4020" />
      {/* A dim cool bounce from the doorway, so the shadow side is not dead. */}
      <directionalLight position={[-0.6, 0.5, -0.4]} intensity={0.2} color="#6f7f9a" />
    </>
  )
}

/* ---------------------------------------------------------------------------
 * Camera — a head at the table, not a page
 * ------------------------------------------------------------------------ */

/**
 * Move the camera along the framing the scene data asks for.
 *
 * The positions themselves live in `framing.ts` — pure numbers, no three.js —
 * so they can be projected and checked without a browser. This component only
 * animates towards them and adds the small parallax that makes the room feel
 * like a place the reader is standing in rather than a picture they are
 * looking at.
 */
function CameraRig({ t, reducedMotion }: { t: number; reducedMotion: boolean }) {
  const { camera, size } = useThree()
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (reducedMotion) return
    const onMove = (event: PointerEvent): void => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [reducedMotion])

  useFrame((_, delta) => {
    const aspect = size.width / Math.max(1, size.height)
    const opening = openingAt(t)

    // Parallax is applied as a rotation of the camera about its subject, not as
    // a slide in world space. The camera swings from straight-on to 60° round
    // during the reveal, so "sideways" on screen is a different world direction
    // at every moment; rotating keeps the sway reading as the reader leaning,
    // wherever the camera happens to be standing.
    const parallax = reducedMotion ? 0 : 1
    const sway = {
      azimuth: pointer.current.x * 0.035 * parallax,
      elevation: -pointer.current.y * 0.022 * parallax,
    }
    const framing = framingAt(opening, aspect, sway)

    // The reader leans in as they press — a small move, but it is the
    // difference between watching and doing. It eases away as the leaf opens.
    const lean = t > 0 && t < T_BREAK ? easeInOut(t / T_PRESS_END) : t >= T_BREAK ? 1 : 0
    const push = 0.004 * lean * (1 - opening)

    const targetX = framing.position[0]
    const targetY = framing.position[1] - push
    const targetZ = framing.position[2]

    const ease = 1 - Math.pow(0.0015, Math.min(delta, 0.1))
    camera.position.x += (targetX - camera.position.x) * ease
    camera.position.y += (targetY - camera.position.y) * ease
    camera.position.z += (targetZ - camera.position.z) * ease
    camera.lookAt(framing.look[0], framing.look[1], framing.look[2])
  })

  return null
}

/* ---------------------------------------------------------------------------
 * Assembly
 * ------------------------------------------------------------------------ */

function SceneContents({ onRevealed, onBreak, reducedMotion }: SealSceneProps) {
  const [t, setT] = useState(-1)
  const elapsed = useRef(-1)
  const revealed = useRef(false)

  /**
   * The roll's real measurements, taken from the geometry that will actually be
   * drawn. The cord and the seal are placed from these rather than from a
   * constant in this file, so re-tuning the leaf can never leave the seal
   * hovering a centimetre above it — which is exactly what happened while the
   * roll angle was still being decided.
   */
  const roll = useMemo(() => createLeaf({ length: 0.34, width: 0.075 }).metrics, [])

  const cord: Cord = useMemo(
    () =>
      createCord({
        rollRadius: roll.outerRadius,
        releaseAt: T_CORD_RELEASE,
        fallDuration: 0.9,
      }),
    [roll],
  )

  useEffect(
    () => () => {
      cord.dispose()
    },
    [cord],
  )

  // The DOM button and the 3-D object both land here, so the ceremony has
  // exactly one entry point.
  const begin = useCallback(() => {
    setT((current) => (current < 0 ? 0 : current))
  }, [])

  useEffect(() => {
    window.addEventListener(SEAL_BEGIN_EVENT, begin)
    return () => window.removeEventListener(SEAL_BEGIN_EVENT, begin)
  }, [begin])

  useFrame((_, delta) => {
    if (elapsed.current < 0) return
    elapsed.current += delta
    setT(elapsed.current)
    cord.update(delta, phaseAt(elapsed.current), elapsed.current)
  })

  useEffect(() => {
    if (t >= 0 && elapsed.current < 0) elapsed.current = t
  }, [t])

  // Reduced motion is not "broken wax, instantly". It is the quiet path: the
  // reader asked for no animation, so the scene reports itself revealed at
  // once and the DOM shows the couplet, exactly as it always did.
  useEffect(() => {
    if (reducedMotion && !revealed.current) {
      revealed.current = true
      onRevealed()
    }
  }, [reducedMotion, onRevealed])

  useEffect(() => {
    if (t < 0 || reducedMotion || revealed.current) return
    if (t >= T_REVEAL) {
      revealed.current = true
      onRevealed()
    }
  }, [t, reducedMotion, onRevealed])

  return (
    <>
      <CameraRig t={t} reducedMotion={reducedMotion} />
      <Lamp />
      <Table />
      <LeafMesh t={t} />
      <primitive object={cord.group} />
      <Wax
        t={t}
        // The crest of the roll, where the cord passes under the seal. Measured
        // from the geometry, with the wax's own half-thickness added so its
        // underside meets the leaf instead of sinking into it.
        position={[0, roll.crest.y + 0.0022, roll.crest.z]}
        onBreak={() => onBreak?.()}
      />
    </>
  )
}

/**
 * Announces readiness from *inside* the canvas.
 *
 * Not on context creation: a context can be created and then immediately lost,
 * and a caller told "ready" at that moment would keep an empty box on screen
 * forever. One drawn frame is the smallest honest signal.
 */
function ReadyOnce({ onReady }: { onReady: () => void }) {
  const announced = useRef(false)
  useFrame(() => {
    if (announced.current) return
    announced.current = true
    onReady()
  })
  return null
}

/**
 * The stage.
 *
 * Deliberately thin: it owns the renderer settings that protect the reader's
 * battery and colour pipeline, and decides nothing about app state.
 */
/**
 * The forced-colours pass, mounted inside the canvas.
 *
 * It has to be a sibling rendered *after* the contents, not an effect in the
 * parent: React runs child effects before parent ones, so as a later sibling
 * this sees a tree whose materials already exist. As a parent effect it would
 * walk an empty group, report zero materials, and look like it had succeeded.
 *
 * The report is logged in development on purpose. A scene that silently renders
 * in `DEFAULT_ROLE` because nobody named its material is a scene that is
 * almost certainly wrong and will not look broken to the person who wrote it.
 */
function ForcedColoursPass({ enabled }: { enabled: boolean }) {
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    if (!enabled) return
    const report = applyContrastPass(scene, readSystemPalette())
    if (import.meta.env.DEV && (report.materials === 0 || report.unlabelled.length > 0)) {
      console.warn('[contrast] seal scene:', report)
    }
  }, [enabled, scene])
  return null
}

export function SealScene({ quality = 'full', onReady, ...props }: SealSceneProps) {
  const environment = useMemo(() => getEnvironment(), [])
  const full = quality === 'full'
  const flat = quality === 'contrast'
  const announced = useRef(false)

  const onCreated = useCallback(
    ({ gl, scene }: { gl: THREE.WebGLRenderer; scene: THREE.Scene }) => {
      // ACES is what stops the lamp blowing out to white paper when it flares.
      if (flat) {
        // Tone mapping is a colour decision. ACES would bend the system palette
        // back toward our own judgement, which is the one thing this tier is not
        // allowed to do, so the renderer is left to pass its colours through.
        const backdrop = contrastBackdrop(readSystemPalette())
        gl.toneMapping = THREE.NoToneMapping
        gl.toneMappingExposure = backdrop.exposure
        gl.shadowMap.enabled = false
        scene.background = new THREE.Color(backdrop.background)
        return
      }
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = 1.05
      gl.shadowMap.enabled = full
      gl.shadowMap.type = THREE.PCFSoftShadowMap
      scene.environment = environment
      // The room is dim. Without this the environment map lights the table as
      // brightly as the lamp and everything flattens out.
      scene.environmentIntensity = 0.32
    },
    [environment, full, flat],
  )

  const handleReady = useCallback(() => {
    if (announced.current) return
    announced.current = true
    onReady?.()
  }, [onReady])

  return (
    <Canvas
      frameloop="always"
      dpr={full ? [1, 2] : 1}
      shadows={full}
      // `default` rather than `high-performance`: this is a 3 cm object on a
      // table, and waking a discrete GPU for it is rude to the reader's battery.
      gl={{ antialias: full, alpha: true, powerPreference: 'default' }}
      // The initial position matches the sealed framing, so the first frame is
      // already composed instead of swooping into place.
      camera={{
        fov: SCENE_FOV_DEGREES,
        near: 0.02,
        far: 12,
        // The sealed framing, so the first frame is already composed.
        position: framingAt(0, 1.6).position,
      }}
      onCreated={onCreated}
      style={{ width: '100%', height: '100%' }}
    >
      <ReadyOnce onReady={handleReady} />
      <SceneContents quality={quality} {...props} />
      <ForcedColoursPass enabled={flat} />
    </Canvas>
  )
}

export default SealScene
