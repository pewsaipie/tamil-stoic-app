/**
 * The material library — every physical substance the app knows about.
 *
 * Two rules govern this file, and they come straight out of the brief:
 *
 *   **One material per substance, shared by every object made of it.** The ola
 *   leaf on the table and the leaf a reader shares are the same ola; the pot's
 *   red slip and the pot's black interior are two finishes of one clay.
 *   `THREE.Material` objects are therefore created once, lazily, and handed
 *   out; nothing in a scene may construct its own.
 *
 *   **Every substance is lit and described the same way.** Albedo, normal,
 *   roughness and an environment map, from the same baked set (see
 *   `scripts/build-materials.mjs`), so a clay pot and a brass lamp in the same
 *   frame cannot drift into two different lighting models.
 *
 * Textures are loaded once and reference-counted by the cache, never disposed
 * by a consumer; `disposeMaterials()` exists for tests and for a full teardown.
 */
import * as THREE from 'three'

import olaAlbedoUrl from '../assets/materials/ola-albedo.png'
import olaNormalUrl from '../assets/materials/ola-normal.png'
import olaRoughUrl from '../assets/materials/ola-rough.png'
import waxAlbedoUrl from '../assets/materials/wax-albedo.png'
import waxNormalUrl from '../assets/materials/wax-normal.png'
import waxRoughUrl from '../assets/materials/wax-rough.png'
import tableNormalUrl from '../assets/materials/table-normal.png'
import lampEnvUrl from '../assets/materials/lamp-env.png'

/**
 * Every substance in the library, as a value rather than only as a type.
 *
 * It is a list because three things need to agree about it and a union type
 * enforces none of them across a module boundary: `SURFACES` below (typed
 * `Record<MaterialName, Surface>`, so a name without a description will not
 * compile), the forced-colours pass in `contrastPass.ts`, and
 * `scripts/test-materials.mjs`, which walks this array to prove that no
 * substance quietly falls through to the default role. A reader in forced
 * colours whose pot renders the colour of paper is not a small bug; it is the
 * pot being deleted from the frame, and a union alone cannot look for it.
 */
export const MATERIAL_NAMES = [
  'ola',
  'wax',
  'table',
  'clay',
  'clayBlack',
  'brass',
  'water',
  'stone',
] as const

export type MaterialName = (typeof MATERIAL_NAMES)[number]

interface Surface {
  map?: string
  normalMap?: string
  roughnessMap?: string
  /** Repeats applied to every map in this surface, so they stay registered. */
  repeat: [number, number]
  /** How strongly the normal map is applied. */
  normalScale: number
  /**
   * Constant finish, for substances whose baked set has not been cut yet.
   *
   * The doctrine is that a substance is described once — albedo, normal,
   * roughness — and every object made of it shares that description. A
   * substance with no baked maps is still described here rather than in a
   * scene, so the day its maps land in `build-materials.mjs` there is exactly
   * one place to add them. Black-and-red ware is the reason `clay` has two
   * entries: the same pot is red slip outside and reduction-fired black inside,
   * and those are two finishes, not two objects.
   */
  finish?: THREE.MeshStandardMaterialParameters
}

const SURFACES: Record<MaterialName, Surface> = {
  // A leaf is read at close range, so its maps tile once across the leaf.
  ola: {
    map: olaAlbedoUrl,
    normalMap: olaNormalUrl,
    roughnessMap: olaRoughUrl,
    repeat: [1, 1],
    normalScale: 0.55,
  },
  // Wax is a small object; the map tiles a few times so the lumps read.
  wax: {
    map: waxAlbedoUrl,
    normalMap: waxNormalUrl,
    roughnessMap: waxRoughUrl,
    repeat: [2, 2],
    normalScale: 0.85,
  },
  // The table is behind everything and must never compete for attention.
  table: {
    normalMap: tableNormalUrl,
    repeat: [6, 6],
    normalScale: 0.35,
  },

  /* ---------- the pot, the lamp and the water ------------------------------
   * Sangam-era pottery is **black-and-red ware**: wheel-thrown, red slip
   * outside (hematite), black inside (carbon, from a reduction fire at about
   * 1100 °C — the Keeladi sherds). So `clay` is the outside of the pot and
   * `clayBlack` is its inside. Same substance, two finishes.
   */
  clay: {
    repeat: [2, 2],
    normalScale: 0.5,
    finish: {
      color: new THREE.Color('#a8563a'),
      roughness: 0.62,
      metalness: 0,
      envMapIntensity: 0.4,
    },
  },
  clayBlack: {
    repeat: [2, 2],
    normalScale: 0.5,
    finish: {
      color: new THREE.Color('#1c1713'),
      roughness: 0.88,
      metalness: 0,
      envMapIntensity: 0.15,
    },
  },
  // A brass oil lamp, lit. Metal is the one place a strong environment earns
  // its keep: without reflected light, brass is a brown shape.
  brass: {
    repeat: [1, 1],
    normalScale: 0.2,
    finish: {
      color: new THREE.Color('#b98a34'),
      roughness: 0.34,
      metalness: 1,
      envMapIntensity: 1.15,
    },
  },
  // Water is mostly a *shape*: it takes the colour of what it reflects. The
  // ripple material in `objects/waterSurface.ts` clones this and injects the
  // surface motion, so the level, the rings and the colour are one object.
  water: {
    repeat: [1, 1],
    normalScale: 0,
    finish: {
      color: new THREE.Color('#2b4a5c'),
      roughness: 0.06,
      metalness: 0.1,
      envMapIntensity: 1.4,
      transparent: true,
      opacity: 0.92,
    },
  },
  // The floor the kolam is drawn on, and the wall the inscription is cut into.
  stone: {
    repeat: [3, 3],
    normalScale: 0.3,
    finish: {
      color: new THREE.Color('#7d7266'),
      roughness: 0.82,
      metalness: 0,
      envMapIntensity: 0.3,
    },
  },
}

/* ---------------------------------------------------------------------------
 * Loading
 * ------------------------------------------------------------------------ */

let loader: THREE.TextureLoader | null = null
const textureCache = new Map<string, THREE.Texture>()
const materialCache = new Map<string, THREE.Material>()
let environment: THREE.Texture | null = null
/** Highest anisotropy any consumer has asked for; textures are upgraded once. */
let pendingAnisotropy = 1

function getLoader(): THREE.TextureLoader {
  if (!loader) loader = new THREE.TextureLoader()
  return loader
}

/**
 * Load a texture, or return the already-loaded one.
 *
 * `colourSpace` is not optional in spirit: an albedo map is sRGB-encoded and a
 * normal or roughness map is linear data. Getting this wrong is the single
 * most common way a physically-lit scene ends up looking flat and washed out.
 */
export function getTexture(
  url: string,
  { colour = false, repeat = [1, 1] as [number, number] } = {},
): THREE.Texture {
  const key = `${url}|${colour ? 'srgb' : 'linear'}|${repeat[0]}x${repeat[1]}`
  const cached = textureCache.get(key)
  if (cached) return cached

  const texture = getLoader().load(url)
  texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat[0], repeat[1])
  texture.anisotropy = pendingAnisotropy
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  textureCache.set(key, texture)
  return texture
}

/**
 * Raise every texture's anisotropy to match the renderer. Called once per
 * context — the value is capped by the GPU and matters most on the leaf, which
 * is nearly edge-on to the camera for most of the interaction.
 */
export function applyAnisotropy(max: number): void {
  pendingAnisotropy = Math.max(1, Math.min(max, 8))
  for (const texture of textureCache.values()) texture.anisotropy = pendingAnisotropy
}

/**
 * The room, as an environment map. This is what gives brass, wax and the
 * glazed edge of a leaf something to reflect — without it, PBR materials read
 * as painted matte plastic no matter how good the maps are.
 */
export function getEnvironment(): THREE.Texture {
  if (!environment) {
    environment = getTexture(lampEnvUrl, { repeat: [1, 1] })
    environment.mapping = THREE.EquirectangularReflectionMapping
    environment.wrapS = THREE.RepeatWrapping
    environment.wrapT = THREE.ClampToEdgeWrapping
  }
  return environment
}

/**
 * The base material for a substance.
 *
 * `params` are merged onto a fresh clone rather than the cached original, so a
 * consumer can vary one object (the pot's two skins, a leaf lit differently)
 * without changing the substance for everyone else. The clones share the same
 * texture objects — which is the point.
 */
export function getMaterial(
  name: MaterialName,
  params: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  const key = `${name}|${JSON.stringify(params)}`
  const cached = materialCache.get(key)
  if (cached) return cached as THREE.MeshStandardMaterial

  const surface = SURFACES[name]
  const material = new THREE.MeshStandardMaterial({
    map: surface.map
      ? getTexture(surface.map, { colour: true, repeat: surface.repeat })
      : null,
    normalMap: surface.normalMap
      ? getTexture(surface.normalMap, { repeat: surface.repeat })
      : null,
    roughnessMap: surface.roughnessMap
      ? getTexture(surface.roughnessMap, { repeat: surface.repeat })
      : null,
    normalScale: new THREE.Vector2(surface.normalScale, surface.normalScale),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.55,
    ...surface.finish,
    ...params,
  })

  /**
   * Every material carries its substance's name, and `clone()` keeps it.
   *
   * That is not decoration and it is not debugging: it is how the forced-colours
   * pass knows what an object *is*. The pass walks a mounted scene rather than
   * threading a role through 22 components, so a material that cannot say what
   * it is made of gets a default tone instead of the right one.
   * `leafSurface.ts` clones this material to inject its fibre shading, and the
   * clone arriving still named `ola` is the whole reason that scene needs no
   * special case.
   */
  material.name = name

  materialCache.set(key, material)
  return material
}

/** Test/teardown hook. The app itself never needs this — scenes come and go. */
export function disposeMaterials(): void {
  for (const material of materialCache.values()) material.dispose()
  for (const texture of textureCache.values()) texture.dispose()
  materialCache.clear()
  textureCache.clear()
  environment = null
}

/**
 * Warm the cache before a scene is shown.
 *
 * The first frame of the table must not pop: textures arrive asynchronously,
 * so the stage resolves this promise and only then starts the reveal. A failure
 * here is not fatal — a missing map means a flatter surface, and the stage
 * decides that, not this function.
 */
export function preloadMaterials(names: readonly MaterialName[]): Promise<void> {
  const urls = new Set<string>()
  for (const name of names) {
    const surface = SURFACES[name]
    if (surface.map) urls.add(surface.map)
    if (surface.normalMap) urls.add(surface.normalMap)
    if (surface.roughnessMap) urls.add(surface.roughnessMap)
  }
  urls.add(lampEnvUrl)

  return Promise.all([...urls].map((url) => getLoader().loadAsync(url).then(() => undefined)))
    .then(() => undefined)
    .catch(() => undefined)
}

export const MATERIAL_URLS = {
  ola: { albedo: olaAlbedoUrl, normal: olaNormalUrl, rough: olaRoughUrl },
  wax: { albedo: waxAlbedoUrl, normal: waxNormalUrl, rough: waxRoughUrl },
  table: { normal: tableNormalUrl },
  environment: lampEnvUrl,
}
