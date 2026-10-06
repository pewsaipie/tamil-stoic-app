/**
 * The table — the room the reader actually sits in, and the first thing the app
 * shows them.
 *
 * Four objects, each of them a Sangam object rather than a UI metaphor:
 *
 *   - **The pot** (black-and-red ware, thrown on a wheel) holds the reader's
 *     progress as a level of water, and is *thrown* while the corpus loads.
 *   - **The lamp** (brass, agal-vilakku) is lit by the sit-timer and burns down
 *     through the minute.
 *   - **The ola leaf** lies on the table, fibre breathing — the surface the whole
 *     app is about, present as an object instead of as a hero image.
 *   - **The dust** in the lamp's beam, which is what makes a lit room read as
 *     lit rather than as a scene with a bright spot in it.
 *
 * One clock, one scene, one canvas per route. Everything animated here is a pure
 * function of the frame's `delta` and of props that arrive from the store; the
 * scene owns no app state, exactly as the seal scene did not before it was
 * withdrawn.
 *
 * **Tiers.** `full` gets shadows and a live flame; `still` and `contrast` keep
 * every object and stop the movement; `css3d` and `plain` never mount this file
 * at all (see `TableStage`). The rig comes from `environment.ts`, so the room's
 * light is the same decision the rest of the app makes about light — one place,
 * tested without a GPU.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { createPot, type Pot } from '../../objects/potGeometry.ts'
import { createWater, type WaterSurface } from '../../objects/waterSurface.ts'
import { createLamp, type Lamp } from '../../objects/lamp.ts'
import { createLeaf } from '../../objects/leaf.ts'
import { createLeafMaterial, type LeafMaterial } from '../../objects/leafSurface.ts'
import { getEnvironment, getMaterial, preloadMaterials } from '../../library.ts'
import { applyContrastPass, contrastBackdrop } from '../../contrastPass.ts'
import { readSystemPalette } from '../../forcedColours.ts'
import { readLamp } from '../../objects/lampBus.ts'
import { PARTICLE_BUDGET } from '../../../motion/budget.ts'
import { resolveEnvironment, timeOfDayFor, type TimeOfDay } from '../../environment.ts'
import { useReaderStore } from '../../../store/appStore.ts'

export type TableQuality = 'full' | 'still' | 'contrast'

export interface TableSceneProps {
  /** True while the corpus is loading: the pot is on the wheel. */
  forming?: boolean
  /** 0–1 of the corpus read. The water level. */
  progress?: number
  /** Increments when a kural is marked read: one ring, and a pour on the first. */
  ripple?: number
  /** Freeze every movement. The objects, their state and their light remain. */
  frozen?: boolean
  quality?: TableQuality
  onReady?: () => void
}

const FORM_SECONDS = 2.6
const SETTLE_SECONDS = 0.9
const POUR_SECONDS = 2.4

interface Objects {
  pot: Pot
  water: WaterSurface
  lamp: Lamp
  leaf: LeafMaterial
  leafMesh: THREE.Mesh
}

function buildObjects(): Objects {
  const pot = createPot()
  const water = createWater()
  const lamp = createLamp()

  const leaf = createLeafMaterial()
  const geometry = createLeaf({ length: 0.3, width: 0.072 })
  // The leaf lies open on the table: its roll is at the flat end of the range.
  geometry.setUnroll(1)
  leaf.uniforms.uUnroll.value = 1
  leaf.uniforms.uInk.value = 0.45

  const leafMesh = new THREE.Mesh(geometry.geometry, leaf.material)
  leafMesh.name = 'ola-leaf'
  leafMesh.receiveShadow = true
  leafMesh.rotation.y = -0.22
  leafMesh.position.set(-0.42, 0, 0.05)

  // The water lives inside the pot's own transform, so the level is the only
  // thing that ever moves it.
  pot.group.add(water.mesh)

  return { pot, water, lamp, leaf, leafMesh }
}

function Contents({
  forming,
  progress,
  ripple,
  frozen,
}: {
  forming: boolean
  progress: number
  ripple: number
  frozen: boolean
}) {
  const scene = useThree((state) => state.scene)
  const objects = useMemo(buildObjects, [])

  const clock = useRef(0)
  const formT = useRef(forming ? 0 : 1)
  const settle = useRef(forming ? 0 : 1)
  const spin = useRef(0)
  const level = useRef(progress)
  const pour = useRef(0)
  const lastRipple = useRef(ripple)

  // Props arrive as values; the frame loop reads them through a ref so a store
  // change never rebuilds the scene graph.
  const live = useRef({ forming, progress, ripple })
  live.current = { forming, progress, ripple }

  useFrame((state, rawDelta) => {
    const delta = Math.min(0.05, rawDelta)
    const motion = !frozen
    if (motion) clock.current += delta
    const t = clock.current

    /* ---------- the pot, on the wheel ---------- */
    if (live.current.forming && formT.current < 1) {
      formT.current = motion ? Math.min(1, formT.current + delta / FORM_SECONDS) : 1
      objects.pot.setForm(formT.current)
      // Clay turns fast while it is being pulled, and slows as it centres.
      spin.current = motion ? (1 - formT.current) * 7.5 : 0
    } else if (settle.current < 1) {
      // Lifting the finished pot off the wheel: a small rise, then a set-down.
      settle.current = motion ? Math.min(1, settle.current + delta / SETTLE_SECONDS) : 1
      spin.current = motion ? Math.max(0, spin.current - delta * 9) : 0
      const s = settle.current
      const lift = Math.sin(Math.min(1, s * 1.6) * Math.PI) * 0.012
      // A settling wobble on the way down — the thud you feel, not hear.
      const wobble = s > 0.75 ? Math.sin((s - 0.75) * 40) * (1 - s) * 0.0018 : 0
      objects.pot.group.position.y = Math.max(0, lift + wobble)
    }
    if (motion) {
      objects.pot.group.rotation.y += spin.current * delta
      objects.pot.wheel.rotation.y += (spin.current + 0.32) * delta
    }

    /* ---------- the water: a level, and the rings in it ---------- */
    const target = Math.min(1, Math.max(0, live.current.progress))
    // Water finds its level; it does not jump to it.
    level.current += (target - level.current) * Math.min(1, delta * 2.2)
    const levelNow = objects.pot.waterLevelAt(level.current)
    objects.water.setLevel(levelNow.y, levelNow.radius)
    if (motion) objects.water.update(delta)

    if (live.current.ripple !== lastRipple.current) {
      const first = lastRipple.current === 0 && target <= 0.001
      lastRipple.current = live.current.ripple
      // One ring per kural read, at a point that is not always the centre.
      const a = t * 1.7
      objects.water.rippleAt(
        Math.cos(a) * levelNow.radius * 0.35,
        Math.sin(a) * levelNow.radius * 0.35,
        1,
      )
      // The first kural of a day is a *poured measure*: the pot tips.
      if (first) pour.current = 1
    }

    /* ---------- pouring ---------- */
    if (pour.current > 0) {
      pour.current = motion ? Math.max(0, pour.current - delta / POUR_SECONDS) : 0
      const tilt = Math.sin(Math.min(1, pour.current * 1.4) * Math.PI) * 0.16
      objects.pot.group.rotation.z = tilt
      objects.water.rippleAt(0, 0, 1.2)
    } else {
      objects.pot.group.rotation.z += (0 - objects.pot.group.rotation.z) * Math.min(1, delta * 6)
    }

    /* ---------- the lamp ---------- */
    const signal = readLamp()
    objects.lamp.setLit(signal.lit)
    objects.lamp.setBurn(signal.burn)
    objects.lamp.update(delta, motion)

    /* ---------- the leaf ---------- */
    objects.leaf.uniforms.uTime.value = motion ? t : 0
    objects.leafMesh.position.y = motion ? Math.sin(t * 0.6) * 0.0002 : 0

    /* ---------- dust in the beam ---------- */
    const dust = scene.getObjectByName('dust') as THREE.Points | null
    if (dust && motion) {
      const positions = dust.geometry.getAttribute('position') as THREE.BufferAttribute
      const array = positions.array as Float32Array
      for (let i = 0; i < array.length; i += 3) {
        array[i] = (array[i] ?? 0) + Math.sin(t * 0.3 + i) * 0.00004
        array[i + 1] = (array[i + 1] ?? 0) + 0.00006 + Math.sin(t * 0.5 + i * 0.7) * 0.00005
        if ((array[i + 1] ?? 0) > 0.34) array[i + 1] = 0.02
      }
      positions.needsUpdate = true
    }

    // A slow camera breath, so the room is never a photograph.
    if (motion) {
      state.camera.position.x = Math.sin(t * 0.11) * 0.012
      state.camera.position.y = 0.225 + Math.sin(t * 0.17) * 0.004
      state.camera.lookAt(0, 0.05, 0)
    }
  })

  // Dust, built once, inside the beam. The count is the motion budget's, not a
  // local preference — see `motion/budget.ts`.
  useEffect(() => {
    const count = PARTICLE_BUDGET.dust
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.35) * 0.4
      positions[i * 3 + 1] = 0.02 + Math.random() * 0.3
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.34
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: new THREE.Color('#f4d59a'),
      size: 0.0022,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const points = new THREE.Points(geometry, material)
    points.name = 'dust'
    scene.add(points)
    return () => {
      scene.remove(points)
      geometry.dispose()
      material.dispose()
    }
  }, [scene])

  useEffect(
    () => () => {
      objects.pot.dispose()
      objects.water.dispose()
      objects.lamp.dispose()
      objects.leaf.dispose()
      objects.leafMesh.geometry.dispose()
    },
    [objects],
  )

  return (
    <>
      <primitive object={objects.pot.group} position={[-0.3, 0, 0.02]} />
      <primitive object={objects.leafMesh} />
      <primitive object={objects.lamp.group} position={[0.06, 0, -0.03]} />
    </>
  )
}

/* ---------------------------------------------------------------------------
 * Lighting
 * ------------------------------------------------------------------------ */

/**
 * The room's light, from the same rig the rest of the app uses.
 *
 * Day is kurinji daylight through the door (cool hemisphere, warm shaft, long
 * shadows); dusk is the lamp alone with the moon for shape. Reduced motion and
 * the flat tiers stop the flicker, never the light — `resolveEnvironment` owns
 * that decision, including how much of the environment map may reach a surface.
 */
function RoomLight({ timeOfDay, tier }: { timeOfDay: TimeOfDay; tier: TableQuality }) {
  const { scene } = useThree()
  const spec = useMemo(() => resolveEnvironment({ timeOfDay, tier }), [timeOfDay, tier])

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement)
    const read = (name: string, fallback: string): string =>
      styles.getPropertyValue(name).trim() || fallback

    const hemi = new THREE.HemisphereLight(
      new THREE.Color(read('--sky-a', '#a8d8ef')),
      new THREE.Color(read('--kantal', '#9c2024')).multiplyScalar(0.22),
      spec.ambientIntensity,
    )
    hemi.name = 'room-sky'

    const key = new THREE.DirectionalLight(
      new THREE.Color(timeOfDay === 'day' ? '#fff3d6' : '#c3d4ff'),
      spec.keyIntensity,
    )
    key.name = 'room-key'
    key.position.set(0.55, 1.1, 0.55)
    key.castShadow = spec.shadows
    if (spec.shadows) {
      key.shadow.mapSize.set(1024, 1024)
      key.shadow.camera.near = 0.2
      key.shadow.camera.far = 4
      const cam = key.shadow.camera as THREE.OrthographicCamera
      cam.left = -0.7
      cam.right = 0.7
      cam.top = 0.7
      cam.bottom = -0.7
    }

    scene.add(hemi, key)
    return () => {
      scene.remove(hemi, key)
      hemi.dispose()
      key.dispose()
    }
  }, [scene, spec, timeOfDay])

  return null
}

function TableTop({ shadows }: { shadows: boolean }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1.8, 1.3), [])
  const material = useMemo(() => getMaterial('table', { roughness: 0.82 }), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation-x={-Math.PI / 2}
      receiveShadow={shadows}
      name="table-top"
    />
  )
}

/**
 * The forced-colours pass, as a later sibling so it walks a populated tree
 * (React runs child effects before parent ones). Every scene that mounts a
 * `<Canvas>` must apply it — `scripts/test-materials.mjs` enforces exactly that.
 */
function ForcedColoursPass({ enabled }: { enabled: boolean }) {
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    if (!enabled) return
    const report = applyContrastPass(scene, readSystemPalette())
    if (import.meta.env.DEV && (report.materials === 0 || report.unlabelled.length > 0)) {
      console.warn('[contrast] table scene:', report)
    }
  }, [enabled, scene])
  return null
}

function ReadyOnce({ onReady }: { onReady: () => void }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    onReady()
  })
  return null
}

export function TableScene({
  forming = false,
  progress = 0,
  ripple = 0,
  frozen = false,
  quality = 'full',
  onReady,
}: TableSceneProps) {
  const theme = useReaderStore((state) => state.theme)
  const environment = useMemo(() => getEnvironment(), [])
  const full = quality === 'full'
  const flat = quality === 'contrast'
  const announced = useRef(false)

  const timeOfDay = useMemo(() => {
    const prefersDark =
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    return timeOfDayFor(theme, prefersDark)
  }, [theme])

  const handleReady = useCallback(() => {
    if (announced.current) return
    announced.current = true
    onReady?.()
  }, [onReady])

  // Warm the shared maps before the first frame, so the table does not pop in
  // half-textured. Failure is not fatal: a missing map is a flatter surface.
  useEffect(() => {
    void preloadMaterials(['table', 'ola'])
  }, [])

  const onCreated = useCallback(
    ({ gl, scene }: { gl: THREE.WebGLRenderer; scene: THREE.Scene }) => {
      if (flat) {
        const backdrop = contrastBackdrop(readSystemPalette())
        gl.toneMapping = THREE.NoToneMapping
        gl.toneMappingExposure = backdrop.exposure
        gl.shadowMap.enabled = false
        scene.background = new THREE.Color(backdrop.background)
        return
      }
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = 1.02
      gl.shadowMap.enabled = full
      gl.shadowMap.type = THREE.PCFSoftShadowMap
      scene.environment = environment
      scene.environmentIntensity = 0.3
    },
    [environment, full, flat],
  )

  return (
    <Canvas
      frameloop={frozen ? 'demand' : 'always'}
      dpr={full ? [1, 2] : 1}
      shadows={full}
      gl={{ antialias: full, alpha: true, powerPreference: 'default' }}
      camera={{ fov: 32, near: 0.02, far: 8, position: [0, 0.225, 0.45] }}
      onCreated={onCreated}
      style={{ width: '100%', height: '100%' }}
    >
      <RoomLight timeOfDay={timeOfDay} tier={quality} />
      <TableTop shadows={full} />
      <Contents forming={forming} progress={progress} ripple={ripple} frozen={frozen} />
      <ForcedColoursPass enabled={flat} />
      <ReadyOnce onReady={handleReady} />
    </Canvas>
  )
}

export default TableScene
