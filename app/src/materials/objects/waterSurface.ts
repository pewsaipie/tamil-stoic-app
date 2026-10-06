/**
 * Water in the pot — the reader's progress, as a level in a vessel.
 *
 * A progress bar reports; water *behaves*. This surface carries three behaviours
 * and no numbers:
 *
 *   - **A level.** `setLevel(y, radius)` moves the surface inside the pot, so
 *     reading raises the water. Drawn from the pot's own interior profile, so it
 *     can never clip through the wall.
 *   - **Rings.** `rippleAt()` drops a ring at a point; rings advance, weaken and
 *     die. A kural read is one ring (and today's first kural is a poured measure
 *     — see the pour in `TableScene`).
 *   - **A tide.** A slow ambient movement so still water is never a painted disc,
 *     silenced by reduced motion with everything else.
 *
 * It is the **neytal** register made physical: long, tidal, never decisive. The
 * material is cloned from the shared `water` substance (see `library.ts`), so
 * the room's light and the forced-colours rules treat it as water wherever it
 * appears.
 */
import * as THREE from 'three'
import { getMaterial } from '../library.ts'

const RIPPLE_COUNT = 6

export interface WaterUniforms {
  uTime: { value: number }
  /** xy = centre in the surface's own space, z = start time, w = strength. */
  uRipples: { value: THREE.Vector4[] }
  /** Set to 0 by reduced motion: the surface keeps its level, loses its tide. */
  uMotion: { value: number }
}

export interface WaterSurface {
  mesh: THREE.Mesh
  uniforms: WaterUniforms
  /** Drop a ring. Position is in the surface's local xz, in metres. */
  rippleAt(x: number, z: number, strength?: number): void
  /** Move the surface to a level and resize it to the pot's wall at that height. */
  setLevel(y: number, radius: number): void
  update(delta: number): void
  dispose(): void
}

const WATER_GLSL = /* glsl */ `
  uniform float uTime;
  uniform vec4 uRipples[RIPPLE_COUNT];
  uniform float uMotion;

  /**
   * The moving normal. A tide plus up to six rings, summed as a gradient and
   * applied through the standard tangent-space normal, so the highlight slides
   * across the surface the way light on water does.
   */
  vec3 waterNormal(vec2 p, vec3 base) {
    vec2 grad = vec2(0.0);

    if (uMotion > 0.5) {
      // The tide: two crossed low-frequency waves, deliberately slow.
      grad += vec2(
        cos(p.x * 15.0 + uTime * 0.7),
        cos(p.y * 17.0 - uTime * 0.55)
      ) * 0.0016;
    }

    for (int i = 0; i < RIPPLE_COUNT; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (r.w <= 0.0 || age < 0.0 || age > 4.0) continue;
      vec2 d = p - r.xy;
      float dist = length(d);
      if (dist < 1e-4) continue;
      float front = age * 0.32;
      float band = exp(-pow((dist - front) * 16.0, 2.0));
      float decay = exp(-age * 1.1) * r.w;
      grad += normalize(d) * band * decay * 0.028;
    }

    return normalize(base + vec3(grad.x, 0.0, grad.y));
  }
`

export function createWater(): WaterSurface {
  const base = getMaterial('water')
  const material = base.clone()
  material.name = 'water'

  const uniforms: WaterUniforms = {
    uTime: { value: 0 },
    uRipples: { value: Array.from({ length: RIPPLE_COUNT }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uMotion: { value: 1 },
  }

  let nextRipple = 0

  material.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = uniforms.uTime
    shader.uniforms['uRipples'] = uniforms.uRipples
    shader.uniforms['uMotion'] = uniforms.uMotion

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        #define RIPPLE_COUNT ${RIPPLE_COUNT}
        varying vec2 vWaterXZ;
        ${WATER_GLSL}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        normal = waterNormal(vWaterXZ, normal);`,
      )

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vWaterXZ;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWaterXZ = position.xy;`,
      )
  }

  material.customProgramCacheKey = () => 'water-ripple-v1'

  const geometry = new THREE.CircleGeometry(1, 56)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'water'
  // The disc is authored in xy and laid flat, so `position.xy` is the surface's
  // own coordinate system — which is what the ripple shader reads.
  mesh.rotation.x = -Math.PI / 2
  mesh.receiveShadow = false

  return {
    mesh,
    uniforms,
    rippleAt(x, z, strength = 1) {
      const slot = uniforms.uRipples.value[nextRipple % RIPPLE_COUNT]
      nextRipple += 1
      if (!slot) return
      slot.set(x, z, uniforms.uTime.value, strength)
    },
    setLevel(y, radius) {
      mesh.position.y = y
      mesh.scale.setScalar(radius)
    },
    update(delta) {
      uniforms.uTime.value += delta
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}
