/**
 * The fibre cord that holds the roll shut.
 *
 * It exists for one reason: a wax seal on its own is a lump of wax. A wax seal
 * *over a knot* is a lock, and the reader understands instantly that breaking
 * the wax is what lets the leaf open. The cord is the mechanism; the wax is the
 * latch.
 *
 * Physically it is a loop of fibre around the rolled leaf's circumference,
 * passing under the seal at the crest. When the seal fails the loop is no
 * longer held, so it does not vanish — it **slackens, slides down the side of
 * the roll, and collapses onto the table**, where it stays. That is the same
 * rule the wax follows: a broken thing stays broken.
 *
 * The tube is rebuilt from a moving curve only while it is actually moving.
 * Once the cord has settled the geometry stops changing and the cost is zero.
 */
import * as THREE from 'three'

/** Sinew, but a warm one — a cord of twisted fibre, not plastic rope. */
const CORD_COLOUR = 0xb99a68
const CORD_RADIUS = 0.0017

export interface Cord {
  group: THREE.Group
  /** `elapsed` is seconds since the current phase began, owned by the caller. */
  update(delta: number, phase: string, elapsed: number): void
  dispose(): void
}

export interface CordOptions {
  /** Radius of the rolled leaf, in metres. The loop has to fit around it. */
  rollRadius?: number
  /** How far the loop sits from the roll's axis along its length. */
  offset?: number
  /**
   * Seconds after the press at which the cord comes free. Owned by the
   * timeline in `SealScene` — a second copy of that number here is exactly the
   * kind of duplicate that drifts apart six months later.
   */
  releaseAt?: number
  /** How long the loop takes to fall and settle. */
  fallDuration?: number
}

function easeInOut(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2
}

function easeIn(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return c * c
}

export function createCord(options: CordOptions = {}): Cord {
  const rollRadius = options.rollRadius ?? 0.34 / (Math.PI * 2.35)
  const offset = options.offset ?? 0
  const releaseAt = options.releaseAt ?? 0.68
  const fallDuration = options.fallDuration ?? 0.9

  // A cord is rough and matte. There is no fibre map for a cord, so its
  // surface comes from the table's grain at a very high repeat — which, on a
  // tube a few millimetres across, reads correctly as twist.
  const material = new THREE.MeshStandardMaterial({
    color: CORD_COLOUR,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.25,
    // Not from the library, so it has to say what it is made of for the
    // forced-colours pass to be able to tell. See `library.getMaterial`.
    name: 'cord',
  })

  const group = new THREE.Group()
  group.name = 'cord'

  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  group.add(mesh)

  const POINTS = 26
  const control: THREE.Vector3[] = Array.from({ length: POINTS }, () => new THREE.Vector3())

  /**
   * Lay the loop out.
   *
   * `taut = 0` is a loop stretched around the roll, in the plane perpendicular
   * to its axis. `taut = 1` is the same loop lying collapsed on the table,
   * wider than it is deep and no longer round — which is what a slack loop of
   * cord actually does when it is dropped.
   */
  const layout = (taut: number, drop: number, wobble: number): void => {
    for (let i = 0; i < POINTS; i += 1) {
      const a = (i / POINTS) * Math.PI * 2
      const point = control[i] as THREE.Vector3

      if (taut > 0) {
        // Around the roll: a circle in the y–z plane, centred on the roll axis
        // at (x = offset, y = rollRadius, z = 0).
        const r = rollRadius + CORD_RADIUS + easeIn(drop) * 0.004
        // Once the loop starts to fall it becomes elliptical and loses height.
        const squash = 1 - easeIn(drop) * 0.55
        const lift = rollRadius * squash + easeIn(drop) * 0.0012

        const y = lift - r * squash * Math.cos(a)
        const z = -r * Math.sin(a) * (1 - easeIn(drop) * 0.18)
        const x = offset + Math.sin(a * 3 + wobble) * 0.002 * drop

        point.set(x, Math.max(0.0012, y), z)
      }

      if (taut < 1) {
        // Collapsed on the table: a loose, slightly irregular oval lying flat.
        const relaxed = 1 - taut
        const rx = rollRadius * (1.35 + 0.15 * Math.sin(a * 2 + 0.6))
        const rz = rollRadius * (0.85 + 0.12 * Math.cos(a * 3))
        const flat = new THREE.Vector3(
          offset + Math.cos(a) * rx,
          0.0016,
          Math.sin(a) * rz,
        )
        if (taut <= 0) point.copy(flat)
        else point.lerp(flat, relaxed)
      }
    }
  }

  let builtTaut = -1
  let settled = false

  const rebuild = (taut: number, drop: number): void => {
    const curve = new THREE.CatmullRomCurve3(control, true, 'centripetal', 0.5)
    const radius = CORD_RADIUS * (1 - drop * 0.12)
    const next = new THREE.TubeGeometry(curve, 72, radius, 7, true)
    mesh.geometry.dispose()
    mesh.geometry = next
    builtTaut = taut
  }

  layout(1, 0, 0)
  rebuild(1, 0)

  return {
    group,

    update(delta, _phase, t) {
      // Only the fall moves the cord, and only while the loop is still
      // travelling. Once it has settled this is a single boolean test per
      // frame, forever.
      void delta
      if (settled) return

      // The loop is held by the wax for the first moments after the strike,
      // and only then comes free.
      const progress = Math.max(0, (t - releaseAt) / fallDuration)
      if (progress <= 0) return

      const drop = easeInOut(Math.min(1, progress))
      const taut = 1 - drop

      if (taut > 0 && Math.abs(taut - builtTaut) < 0.012) return

      layout(taut, drop, progress * 6)
      rebuild(taut, drop)

      if (taut <= 0) settled = true
    },

    dispose() {
      mesh.geometry.dispose()
      material.dispose()
      group.clear()
    },
  }
}
