import * as THREE from 'three'
import { getMaterial } from '../../library.ts'
import {
  buildShardGeometry,
  cellOf,
  fractureSeeds,
  isDegenerate,
  mulberry32,
  sealOutline,
} from './waxFracture.ts'

export interface WaxSealOptions {
  /** Seal radius, in metres. A struck seal is roughly 2.7 cm across. */
  radius?: number
  /** Thickness at the centre of the pour. */
  height?: number
  /** How many pieces it breaks into. */
  shards?: number
  /** Vertical scale on the scalloped rim. */
  scallop?: number
  seed?: number
}

export interface WaxShard {
  mesh: THREE.Mesh
  /** Overridden once the seal is struck. */
  velocity: THREE.Vector3
  spin: THREE.Vector3
  /** Cell centroid in seal-local space — used to decide how it is thrown. */
  origin: THREE.Vector3
  /** Shards resting on the table stop being integrated. */
  settled: boolean
  /** Distance from the strike point; the near cells move least. */
  strikeDistance: number
}

export interface WaxSeal {
  group: THREE.Group
  shards: WaxShard[]
  /** Push the thumb in: impressions deepen between 0 and 1. */
  setImpression(amount: number): void
  /** Strike it. `velocity` is in metres per second, table-relative. */
  break(strike: THREE.Vector3, velocity: number): void
  /** Integrate one step. Returns true while anything is still moving. */
  update(delta: number, tableHeight: number): boolean
  /** Back to a whole, unbroken seal. */
  reset(): void
  dispose(): void
}

export function createWaxSeal(options: WaxSealOptions = {}): WaxSeal {
  const radius = options.radius ?? 0.013
  const height = options.height ?? 0.0042
  const shardCount = options.shards ?? 13
  const scallop = options.scallop ?? 0.045
  const random = mulberry32(options.seed ?? 20261004)

  const material = getMaterial('wax', {
    // Wax is a soft dielectric: glossy, but with almost no reflection at
    // grazing angles. A little environment is all it should take.
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.85,
  })

  const group = new THREE.Group()
  const outline = sealOutline(radius, 12, scallop)

  // Seeding, clipping and the prism build all live in `waxFracture.ts`, with
  // no materials or scenes attached, so they can be tested on their own.
  const seeds = fractureSeeds(radius, shardCount, random)

  const strikePoint = new THREE.Vector3(0, 0, 0)
  const shards: WaxShard[] = []

  for (const seed of seeds) {
    const cell = cellOf(seed, seeds, outline)
    // A clip can leave a sliver with no area. A degenerate cell would emit a
    // zero-size chip that nothing can ever hit or see, so it is dropped.
    if (isDegenerate(cell, radius)) continue

    const geometry = buildShardGeometry(cell, radius, height)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false

    const origin = new THREE.Vector3(seed.x, 0, seed.y)
    group.add(mesh)
    shards.push({
      mesh,
      origin,
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      settled: true,
      strikeDistance: origin.distanceTo(strikePoint),
    })
  }

  /* ---- 2. Rigid bodies -------------------------------------------------
   * Deliberately a hand-rolled integrator rather than a physics engine. A
   * dozen convex chips with gravity, drag, a floor and a sleep rule is twenty
   * lines; a physics library is 400 KB shipped to a reader who wants to read a
   * couplet. */
  const gravity = -9.81
  const drag = 0.12
  const restitution = 0.18
  const settleSpeed = 0.035

  /** Unit vector the strike pushes along; set by `break()` before it is read. */
  const strikeDir = new THREE.Vector3(0, 0, 1)
  /** Scratch vectors, so integrating a frame allocates nothing. */
  const outward = new THREE.Vector3()
  const lift = new THREE.Vector3()

  const api: WaxSeal = {
    group,
    shards,

    setImpression(amount) {
      // The thumb mark is a real depression, so it is applied to the geometry
      // rather than painted: every vertex within a thumb's radius sinks.
      const clamped = Math.max(0, Math.min(1, amount))
      for (const shard of shards) {
        const geometry = shard.mesh.geometry
        const base = shard.mesh.userData['restPositions'] as Float32Array | undefined
        if (!base) continue
        const positions = geometry.getAttribute('position') as THREE.BufferAttribute
        const array = positions.array as Float32Array
        for (let i = 0; i < array.length; i += 3) {
          const rx = base[i] as number
          const ry = base[i + 1] as number
          const rz = base[i + 2] as number
          // A rounded-square thumb, offset slightly, deepening as it presses.
          const dx = (rx - 0.0016) / 0.0055
          const dy = (rz + 0.0022) / 0.0062
          const falloff = Math.max(0, 1 - (dx * dx + dy * dy))
          array[i + 1] = ry - falloff * falloff * height * 0.78 * clamped
        }
        positions.needsUpdate = true
      }
    },

    break(strikePosition, velocity) {
      // The push is whichever way the thumb was travelling — handed in already
      // in seal-local space, flattened so a downward press still throws wax
      // outward rather than into the table.
      strikeDir.set(strikePosition.x, 0, strikePosition.z)
      if (strikeDir.lengthSq() < 1e-8) strikeDir.set(0, 0, 1)
      strikeDir.normalize()
      lift.set(0, 1, 0)

      for (const shard of shards) {
        const distance = shard.origin.length()
        shard.settled = false
        // Near the strike, pieces barely move — those are the ones the thumb
        // is still holding. The rest are thrown.
        const near = Math.max(0, 1 - distance / (radius * 0.75))
        const throwFactor = (0.35 + (1 - near) * 0.9) * velocity

        // Outward from the centre, tilted up and pushed along the strike.
        outward.set(shard.origin.x, 0, shard.origin.z)
        if (outward.lengthSq() < 1e-8) outward.set(strikeDir.z, 0, -strikeDir.x)
        outward.normalize()
        outward.y = 0.15
        outward.normalize()

        shard.velocity
          .copy(outward)
          .multiplyScalar(throwFactor * 0.6)
          .addScaledVector(strikeDir, throwFactor * 0.45)
          .addScaledVector(lift, throwFactor * 0.3)

        shard.spin.set(
          (random() - 0.5) * 22 * (1 - near * 0.5),
          (random() - 0.5) * 26,
          (random() - 0.5) * 22 * (1 - near * 0.5),
        )
      }
    },

    update(delta, tableHeight) {
      let moving = false
      for (const shard of shards) {
        if (shard.settled) continue
        const mesh = shard.mesh

        shard.velocity.y += gravity * delta
        shard.velocity.multiplyScalar(1 - drag * delta)
        mesh.position.addScaledVector(shard.velocity, delta)

        // Spin, applied as a rotation delta in the shard's own frame.
        mesh.rotation.x += shard.spin.x * delta
        mesh.rotation.y += shard.spin.y * delta
        mesh.rotation.z += shard.spin.z * delta

        // The table. A shard lying flat is its own minuscule half-thickness
        // above the surface; anything below that has landed.
        const restHeight = tableHeight + 0.0006
        if (mesh.position.y < restHeight) {
          mesh.position.y = restHeight
          if (shard.velocity.y < 0) {
            shard.velocity.y = -shard.velocity.y * restitution
            // Friction on impact, and a last twist as it slides.
            shard.velocity.x *= 0.55
            shard.velocity.z *= 0.55
            shard.spin.multiplyScalar(0.4)
            // Chips land flat more often than they land on an edge.
            mesh.rotation.x *= 0.35
            mesh.rotation.z *= 0.35
          }
          if (shard.velocity.length() < settleSpeed && Math.abs(shard.spin.y) < 1.2) {
            shard.velocity.set(0, 0, 0)
            shard.spin.set(0, 0, 0)
            shard.settled = true
            continue
          }
        }
        moving = true
      }
      return moving
    },

    reset() {
      for (const shard of shards) {
        shard.mesh.position.copy(shard.origin)
        shard.mesh.rotation.set(0, 0, 0)
        shard.velocity.set(0, 0, 0)
        shard.spin.set(0, 0, 0)
        shard.settled = true
      }
      api.setImpression(0)
    },

    dispose() {
      for (const shard of shards) shard.mesh.geometry.dispose()
      group.clear()
    },
  }

  for (const shard of shards) {
    // Cache the modelled positions so the thumb impression is always applied
    // to the pristine shape, never accumulated on top of a previous press.
    const positions = shard.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    shard.mesh.userData['restPositions'] = Float32Array.from(positions.array as Float32Array)
    shard.mesh.position.copy(shard.origin)
  }

  api.reset()
  return api
}
