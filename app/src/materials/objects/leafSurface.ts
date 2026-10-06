/**
 * The leaf's surface — the part a baked map cannot carry.
 *
 * The baked maps (`scripts/build-materials.mjs`) hold the *low-frequency*
 * structure: mottling, staining, the broad warp of the strip. What they cannot
 * hold is the thing that actually reads as palm leaf at reading distance: the
 * fibre. Ola is a split leaf, and those fibres run lengthwise, catch the light
 * in raking angles, and are why an ola leaf looks like nothing else.
 *
 * Generating the fibre here rather than baking it is deliberate — a 1024² map
 * cannot resolve fibre at the scale the reader sees it when the leaf is
 * close, and it is exactly at that distance that the illusion is won or lost.
 *
 * Three things are injected into `MeshStandardMaterial`:
 *
 *   1. **Fibre relief.** A stretched noise field differentiated analytically
 *      and applied through a proper cotangent frame, so the relief is correct
 *      at every viewing angle instead of being a horizontal smudge.
 *   2. **Fibre-driven roughness.** The same field modulates gloss. This is the
 *      single biggest contributor to "it looks like a material" — a surface
 *      that is uniformly glossy reads as plastic no matter how good its normal
 *      map is.
 *   3. **A face distinction.** The inner face is the writing surface: paler,
 *      cleaner, with the faint scored band the scribe ruled before writing.
 *      The outer face is what centuries of handling did to it: darker, warmer,
 *      more worn, slightly rougher.
 */
import * as THREE from 'three'
import { getMaterial } from '../library.ts'

/** The extra uniforms the injected code reads. */
export interface LeafUniforms {
  /** 0 while sealed, 1 once fully unrolled — fades the writing face in. */
  uUnroll: { value: number }
  /** Ink darkening, driven by the DOM text fading in over the surface. */
  uInk: { value: number }
  /** Seconds. Fibre breathes very slightly, so a static leaf is never dead. */
  uTime: { value: number }
}

export interface LeafMaterial {
  material: THREE.MeshStandardMaterial
  uniforms: LeafUniforms
  dispose(): void
}

/**
 * GLSL helpers, shared by the vertex and fragment stages.
 *
 * The noise is the usual hash-based value noise, but the *sampling* is what
 * matters: the fibre field is stretched roughly 40:1 along the leaf, so it
 * resolves into strands rather than blobs.
 *
 * **This block must compile in a vertex stage**, so it contains no derivative
 * functions: GLSL ES 3.00 allows `dFdx`/`dFdy` in fragment shaders only, and
 * ANGLE enforces that even in code the compiler would dead-strip. The cotangent
 * frame that needs them lives in `LEAF_FRAME_GLSL` below and is injected into
 * the fragment stage alone. (The first version shared one block between both
 * stages; it compiled on some drivers and failed on SwiftShader, which is the
 * worst possible way for a shader to be wrong.)
 */
const LEAF_GLSL = /* glsl */ `
  varying float vFace;
  varying vec2 vLeafUv;
  uniform float uUnroll;
  uniform float uInk;
  uniform float uTime;

  float leafHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float leafNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(leafHash(i), leafHash(i + vec2(1.0, 0.0)), u.x),
      mix(leafHash(i + vec2(0.0, 1.0)), leafHash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  /**
   * The fibre field. u runs across the leaf, v along it, so the field is
   * sampled with a large u frequency and a tiny v frequency — that is the
   * whole difference between "fibre" and "noise".
   */
  float leafFibre(vec2 uv) {
    vec2 p = vec2(uv.x * 330.0, uv.y * 9.0);
    float f = leafNoise(p) * 0.6 + leafNoise(p * 2.7) * 0.3 + leafNoise(p * 6.1) * 0.1;
    // Fibres are not a smooth field: they are discrete strands. Taking a
    // ridged form of the field turns the soft blobs into crests and troughs.
    return 1.0 - abs(2.0 * f - 1.0);
  }
`

/**
 * The cotangent frame — fragment-stage only.
 *
 * The standard way to turn a height gradient into a perturbation of the
 * shading normal without shipping tangent attributes. It needs screen-space
 * derivatives, which is exactly why it cannot live in the shared block: a
 * vertex shader that merely *contains* the call fails to link on strict GLSL ES
 * 3.00 compilers.
 */
const LEAF_FRAME_GLSL = /* glsl */ `
  mat3 leafFrame(vec3 N, vec3 p, vec2 uv) {
    vec3 dp1 = dFdx(p);
    vec3 dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);
    vec3 dp2perp = cross(dp2, N);
    vec3 dp1perp = cross(N, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
    float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
    return mat3(T * invmax, B * invmax, N);
  }
`

export function createLeafMaterial(): LeafMaterial {
  const base = getMaterial('ola', {
    // A leaf is a dielectric with a soft sheen — never metallic, and never
    // fully matte; the wax on the surface is what lifts the fibre into view.
    metalness: 0,
    envMapIntensity: 0.5,
  })

  const material = base.clone()
  const uniforms: LeafUniforms = {
    uUnroll: { value: 0 },
    uInk: { value: 0 },
    uTime: { value: 0 },
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms['uUnroll'] = uniforms.uUnroll
    shader.uniforms['uInk'] = uniforms.uInk
    shader.uniforms['uTime'] = uniforms.uTime

    // ---- vertex ----------------------------------------------------------
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aFace;
        ${LEAF_GLSL}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vFace = aFace;
        vLeafUv = uv;`,
      )

    // ---- fragment --------------------------------------------------------
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${LEAF_GLSL}\n${LEAF_FRAME_GLSL}`)
      // Albedo: the two faces are the same leaf, differently used.
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float fibre = leafFibre(vLeafUv);
          // Raking streaks along the fibre, very faint.
          diffuseColor.rgb *= 1.0 - (1.0 - fibre) * 0.055;

          float inner = clamp(vFace * 0.5 + 0.5, 0.0, 1.0);
          // The outer face has been handled for a very long time.
          vec3 weathered = vec3(0.80, 0.72, 0.58);
          diffuseColor.rgb *= mix(weathered, vec3(1.02, 1.00, 0.97), inner);

          // The ruled band the scribe scored before writing, only on the
          // writing face, and only once the leaf is open enough to read.
          float band = smoothstep(0.16, 0.24, vLeafUv.x) * (1.0 - smoothstep(0.76, 0.84, vLeafUv.x));
          float ruled = band * inner * smoothstep(0.35, 0.85, uUnroll);
          diffuseColor.rgb *= 1.0 - ruled * 0.04;

          // Ink: darkest where the couplet is, which is the middle of the leaf.
          float inkMask = band * inner * uInk;
          diffuseColor.rgb *= 1.0 - inkMask * 0.30;
        }`,
      )
      // Normal: fibre relief, applied in a real tangent frame.
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          float e = 0.0009;
          float f0 = leafFibre(vLeafUv);
          float fu = leafFibre(vLeafUv + vec2(e, 0.0));
          float fv = leafFibre(vLeafUv + vec2(0.0, e));
          vec2 grad = vec2(fu - f0, fv - f0) / e;
          // A slow swell along the fibre, so the relief is never perfectly
          // regular — real strands vary in height along their length.
          float swell = 0.65 + 0.35 * leafNoise(vec2(vLeafUv.y * 14.0, vLeafUv.x * 3.0 + uTime * 0.02));
          vec3 n = normalize(normal);
          mat3 frame = leafFrame(n, vViewPosition, vLeafUv);
          normal = normalize(frame * vec3(-grad * 0.0022 * swell, 1.0));
        }`,
      )
      // Roughness: the fibre drives gloss, which is what makes it read as a
      // material rather than a bumpy surface.
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        {
          float fibre = leafFibre(vLeafUv);
          roughnessFactor = clamp(roughnessFactor + (fibre - 0.5) * 0.22, 0.08, 1.0);
          float inner = clamp(vFace * 0.5 + 0.5, 0.0, 1.0);
          // The handled outside has been polished by hands; the inside is
          // drier and takes ink.
          roughnessFactor = clamp(roughnessFactor + (1.0 - inner) * -0.12 + inner * 0.05, 0.05, 1.0);
        }`,
      )
  }

  // Without this the program cache hands the injected material to every other
  // MeshStandardMaterial in the scene that happens to share its parameters.
  material.customProgramCacheKey = () => 'leaf-fibre-v2'

  return {
    material,
    uniforms,
    dispose: () => material.dispose(),
  }
}
