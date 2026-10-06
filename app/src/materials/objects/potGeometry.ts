/**
 * The pot — black-and-red ware, thrown on a wheel.
 *
 * This is the object the brief named: *"if we have a clay pot, it should have
 * some movement."* A painted pot cannot move, so the pot is built as geometry
 * and given the three movements its material has:
 *
 *   1. **It is thrown.** `setForm(t)` takes it from a disc of clay on the wheel
 *      to a finished vessel — the wall rises, the belly swells, the neck closes,
 *      and the rim wobbles while it is off-centre and steadies as it centres.
 *      That is craft, not decoration: the marutham register (regular, circular,
 *      unhurried) applied to a load state.
 *   2. **It holds water.** The interior carries a surface at
 *      `waterLevelAt(fraction)`, so reading progress is a *level in a vessel*
 *      rather than a progress bar.
 *   3. **It pours.** The scene tilts it by a few degrees to mark the first kural
 *      of a day; the water answers.
 *
 * **Black-and-red ware.** Sangam-era pottery is wheel-thrown and fired so the
 * *outside* is red (hematite slip) and the *inside* is black (carbon, drawn in
 * by a reduction fire at about 1100 °C — the Keeladi sherds). That is why this
 * is one shell with two finishes rather than two objects: the same geometry is
 * drawn twice, `FrontSide` in red slip and `BackSide` in the fired black, which
 * is exactly what the pot is. See the note on `clay` / `clayBlack` in
 * `materials/library.ts`.
 *
 * Everything is in **metres**, at real scale: a 16 cm household pot on a table
 * the room is built around.
 */
import * as THREE from 'three'
import { getMaterial } from '../library.ts'

/** Outer contour, base centre → rim. */
const OUTER: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.0],
  [0.028, 0.0],
  [0.04, 0.007],
  [0.062, 0.034],
  [0.068, 0.07],
  [0.058, 0.104],
  [0.046, 0.128],
  [0.047, 0.144],
  [0.059, 0.16],
]

/** Inner contour, rim → inner floor. */
const INNER: ReadonlyArray<readonly [number, number]> = [
  [0.0535, 0.159],
  [0.0425, 0.144],
  [0.0415, 0.128],
  [0.0535, 0.104],
  [0.0635, 0.07],
  [0.058, 0.034],
  [0.036, 0.0085],
  [0.0, 0.0115],
]

/** The inner floor and the highest a still surface can sit. */
export const INNER_FLOOR_Y = 0.0115
export const MAX_FILL_Y = 0.142

export interface Pot {
  /** Draw this twice: front side (red slip) and back side (fired black). */
  geometry: THREE.BufferGeometry
  group: THREE.Group
  /** 0 = a disc of clay on the wheel, 1 = the finished vessel. */
  setForm(t: number): void
  /** The wheel under it — spins while throwing, stops when the pot is lifted. */
  wheel: THREE.Mesh
  /** Y and radius of a water surface filled to `fraction` of the usable depth. */
  waterLevelAt(fraction: number): { y: number; radius: number }
  /** Height of the rim, so a scene never has to guess where the mouth is. */
  rimY: number
  dispose(): void
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Sample the inner wall's radius at a height, for sizing the water surface. */
function innerRadiusAtY(y: number): number {
  for (let i = 0; i < INNER.length - 1; i += 1) {
    const a = INNER[i]
    const b = INNER[i + 1]
    if (!a || !b) continue
    const [ra, ya] = a
    const [rb, yb] = b
    if ((y >= yb && y <= ya) || (y >= ya && y <= yb)) {
      const span = yb - ya
      const u = span === 0 ? 0 : (y - ya) / span
      return lerp(ra, rb, u)
    }
  }
  return 0.05
}

/**
 * The throwing profile.
 *
 * A real throwing sequence is: centre the clay, open the mouth, pull the wall
 * up, then shape the belly and close the neck. Two effects read as "being
 * thrown" and both are here: the whole profile **tallies as it rises** (early
 * on it is a short, wide dome; late it is the finished silhouette), and it
 * **wobbles less the closer it gets** — `centring`, a decaying sinusoid around
 * the circumference that is largest in the first half-second.
 */
function formingShape(t: number): { height: number; radius: number; centring: number } {
  const shaped = Math.min(1, Math.max(0, t))
  return {
    // The wall tallies faster than it widens: a pot is pulled up, not inflated.
    height: Math.pow(shaped, 0.72),
    radius: 0.6 + 0.4 * Math.pow(shaped, 0.55),
    centring: Math.pow(1 - shaped, 1.6) * 0.0055,
  }
}

export function createPot(options: { radial?: number; profileSteps?: number } = {}): Pot {
  const radial = options.radial ?? 56
  const profile = [...OUTER, ...INNER]
  const rings = profile.length
  const vertices = (radial + 1) * rings

  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(vertices * 3)
  const uvs = new Float32Array(vertices * 2)
  const indices: number[] = []

  for (let i = 0; i < radial; i += 1) {
    for (let j = 0; j < rings - 1; j += 1) {
      const a = i * rings + j
      const b = a + rings
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(indices)

  const write = (t: number): void => {
    const shape = formingShape(t)
    for (let i = 0; i <= radial; i += 1) {
      const theta = (i / radial) * Math.PI * 2
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      // Centring runs around the circumference at three lobes — the classic
      // wobble of clay that is not yet true on the wheel.
      const wobble = shape.centring * Math.sin(theta * 3 + t * 9)
      for (let j = 0; j < rings; j += 1) {
        const point = profile[j]
        if (!point) continue
        const [baseR, baseY] = point
        const r = baseR * shape.radius * (1 + wobble)
        const y = baseY * shape.height
        const index = (i * rings + j) * 3
        positions[index] = r * cos
        positions[index + 1] = y
        positions[index + 2] = r * sin
        const uvIndex = (i * rings + j) * 2
        uvs[uvIndex] = i / radial
        uvs[uvIndex + 1] = j / (rings - 1)
      }
    }
    const position = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    if (position) position.needsUpdate = true
    if (uv) uv.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
  }

  write(1)

  const outer = new THREE.Mesh(
    geometry,
    getMaterial('clay', { side: THREE.FrontSide, flatShading: false }),
  )
  const inner = new THREE.Mesh(
    geometry,
    getMaterial('clayBlack', { side: THREE.BackSide, flatShading: false }),
  )
  outer.castShadow = true
  outer.receiveShadow = true
  outer.name = 'pot'

  const group = new THREE.Group()
  group.name = 'pot-group'
  group.add(outer, inner)

  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.11, 0.012, 48),
    getMaterial('stone', { roughness: 0.7 }),
  )
  wheel.name = 'wheel'
  wheel.receiveShadow = true
  wheel.position.y = -0.006
  group.add(wheel)

  return {
    geometry,
    group,
    wheel,
    rimY: 0.16,
    setForm: write,
    waterLevelAt(fraction) {
      const f = Math.min(1, Math.max(0, fraction))
      const y = lerp(INNER_FLOOR_Y, MAX_FILL_Y, f)
      return { y, radius: Math.max(0.02, innerRadiusAtY(y) * 0.985) }
    },
    dispose() {
      geometry.dispose()
      wheel.geometry.dispose()
    },
  }
}
