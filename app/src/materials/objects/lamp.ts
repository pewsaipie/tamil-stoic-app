/**
 * The brass oil lamp — the room's light, and the reader's minute.
 *
 * The sit-timer is not a countdown here: it is a **lamp that burns down**. The
 * reader lights it, the flame catches and breathes, the oil line drops, and at
 * the end it settles and goes out on its own. Nothing scolds anyone for
 * stopping, which is the same promise `SitTimer` has always made — only now the
 * promise is made of brass and fire instead of a ring.
 *
 * Three rules:
 *
 *   - **The light is the animation.** The flame is a small emissive shape; what
 *     the reader actually sees move is the *room* — one `PointLight` whose
 *     intensity and position follow the flame, so shadows sway on the table.
 *   - **It obeys the tier.** `still` and `contrast` keep the lamp and its light
 *     but stop the flicker; reduced motion keeps the flame's shape and drops the
 *     movement, never the object.
 *   - **It is driven from outside.** The lamp knows nothing about timers: the
 *     scene pushes `burn` (1 = full bowl, 0 = spent) and `lit`, and the lamp
 *     reports its light up so the bloom pass has something to find.
 *
 * Its Sangam anchor is the **agal vilakku / copper lamp of the Tamil house**,
 * the same object the chapter map lights one of per chapter.
 */
import * as THREE from 'three'
import { getMaterial } from '../library.ts'

export interface Lamp {
  group: THREE.Group
  /** The flame's own position, so a bloom or a smoke ribbon can find it. */
  flame: THREE.Mesh
  light: THREE.PointLight
  /** 1 = a full bowl, 0 = spent. Drives the flame's size and the oil level. */
  setBurn(burn: number): void
  setLit(lit: boolean): void
  /** `motion` false freezes the flicker (still / contrast / reduced motion). */
  update(delta: number, motion: boolean): void
  dispose(): void
}

/** The lamp's bowl profile, in metres: base plate → stem → oil bowl → lip. */
const BOWL: ReadonlyArray<readonly [number, number]> = [
  [0.036, 0.0],
  [0.034, 0.004],
  [0.016, 0.008],
  [0.011, 0.022],
  [0.012, 0.03],
  [0.03, 0.034],
  [0.033, 0.04],
  [0.031, 0.044],
  [0.012, 0.0445],
  [0.0095, 0.042],
  [0.009, 0.036],
  [0.009, 0.03],
]

/** The spout — where the wick lies, and therefore where the flame is. */
const SPOUT_X = 0.031

export function createLamp(): Lamp {
  const group = new THREE.Group()
  group.name = 'lamp-group'

  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(
      BOWL.map(([r, y]) => new THREE.Vector2(r, y)),
      40,
    ),
    getMaterial('brass', { side: THREE.DoubleSide, roughness: 0.32 }),
  )
  bowl.castShadow = true
  bowl.name = 'lamp'
  group.add(bowl)

  const spout = new THREE.Mesh(
    new THREE.ConeGeometry(0.008, 0.03, 16, 1, false, 0, Math.PI),
    getMaterial('brass', { side: THREE.DoubleSide }),
  )
  spout.rotation.z = -Math.PI / 2.1
  spout.position.set(SPOUT_X, 0.041, 0)
  spout.name = 'lamp-spout'
  group.add(spout)

  // The flame: a small cone, emissive, scaled by the burn. Additive blending so
  // it reads as light rather than as a yellow object.
  const flameMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffdf9a'),
    emissive: new THREE.Color('#ff9c2e'),
    emissiveIntensity: 2.4,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  flameMaterial.name = 'flame'

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.026, 14), flameMaterial)
  flame.position.set(SPOUT_X + 0.002, 0.058, 0)
  flame.name = 'lamp-flame'
  group.add(flame)

  const light = new THREE.PointLight(new THREE.Color('#ffb457'), 0, 1.6, 2)
  light.position.set(SPOUT_X + 0.002, 0.062, 0)
  light.name = 'lamp-light'
  group.add(light)

  let burn = 1
  let lit = false
  let phase = Math.random() * Math.PI * 2
  /** Current flicker multiplier, smoothed so it never strobes. */
  let flicker = 1

  const applyBurn = (): void => {
    if (!lit) {
      flame.visible = false
      light.intensity = 0
      return
    }
    flame.visible = true
    // A low bowl gives a small flame: the wick can only reach so far down.
    const height = 0.55 + 0.45 * burn
    flame.scale.set(1, height * flicker, 1)
    flame.position.y = 0.052 + 0.008 * height * flicker
    light.position.y = flame.position.y + 0.004
    light.intensity = (0.9 + 1.5 * burn) * flicker
  }

  return {
    group,
    flame,
    light,
    setBurn(next) {
      burn = Math.min(1, Math.max(0, next))
      applyBurn()
    },
    setLit(next) {
      lit = next
      applyBurn()
    },
    update(delta, motion) {
      if (!motion) {
        flicker = 1
        applyBurn()
        return
      }
      // Two incommensurable frequencies: the sum is aperiodic, which is what a
      // flame is, without needing noise.
      phase += delta
      const target =
        0.88 +
        0.07 * Math.sin(phase * 7.3) +
        0.05 * Math.sin(phase * 11.7 + 1.3) +
        0.03 * Math.sin(phase * 19.1 + 0.4)
      flicker += (target - flicker) * Math.min(1, delta * 18)
      applyBurn()
    },
    dispose() {
      bowl.geometry.dispose()
      spout.geometry.dispose()
      flame.geometry.dispose()
      flameMaterial.dispose()
    },
  }
}
