/**
 * "AgedLeaf" — the hero material shader (Feature 1).
 *
 * Written as GLSL 1 so it compiles on WebGL 1 and 2 alike. The look is built
 * from four passes over the same field of value noise:
 *
 *   1. fibres  — noise stretched ~9:1 horizontally, because palm-leaf
 *                manuscripts are striated along the leaf
 *   2. grain   — isotropic mid-frequency noise for paper tooth
 *   3. veins   — ridged noise (1 - |2n-1|), which creases instead of blobs
 *   4. vignette— edges fall away so the typography keeps its contrast
 *
 * Colours arrive as uniforms read from the CSS design tokens, so the material
 * re-tints when the reader switches theme. Motion is a slow pan (0.003 u/s);
 * `uTime` simply stops advancing when reduced motion is on.
 */

export const AGED_LEAF_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  // Full-screen quad: the plane already spans clip space, so no camera maths.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const AGED_LEAF_FRAGMENT = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uEmber;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  // Aspect-corrected coordinates keep the grain square on any hero aspect.
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);

  // The only motion: a very slow drift (spec: speed 0.003).
  vec2 drift = vec2(uTime * 0.003, uTime * 0.0012);

  // 1. fibres — horizontal striation
  float fibres = fbm(vec2((p.x + drift.x) * 1.6, (p.y + drift.y) * 14.0) * 1.4);

  // 2. grain — paper tooth
  float grain = fbm(vec2((p.x - drift.x) * 6.0, (p.y - drift.y) * 6.0) * 1.1);

  // 3. veins — ridged noise, then sharpened
  float ridges = 1.0 - abs(2.0 * fbm(vec2((p.x + drift.x) * 1.1, (p.y - drift.y) * 5.5)) - 1.0);
  ridges = pow(ridges, 2.2);

  float tone = clamp(fibres * 0.75 + grain * 0.35, 0.0, 1.0);

  vec3 color = mix(uColorA, uColorB, tone);
  color = mix(color, uColorC, ridges * 0.55);

  // Ember glow — warm light pooling in the fibres on Sangam Night.
  float ember = smoothstep(0.55, 1.0, fibres) * uEmber;
  color += vec3(0.35, 0.16, 0.02) * ember;

  // 4. vignette — protects the headline's contrast at the edges
  float vignette = 1.0 - smoothstep(0.25, 0.95, length(p * vec2(0.85, 1.15)));
  color *= mix(0.72, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`
