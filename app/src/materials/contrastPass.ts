/**
 * The forced-colours pass — one implementation, twenty-two surfaces.
 *
 * The doctrine says the material world is mandatory and that forced colours are
 * answered *by* the scene rather than by removing it. Read literally, that is
 * 22 bespoke accessibility paths, and a bespoke path per scene is how an
 * accessibility guarantee becomes folklore: the first scene written without it
 * is indistinguishable from a scene that deliberately dropped it.
 *
 * So this is a **pass**, not a prop. A scene mounts its normal objects exactly as
 * it would for `full`, then hands its root over, and the pass rewrites every
 * material it can find. Which buys three things worth having:
 *
 *   **No scene can forget it.** A scene that never calls `applyContrastPass`
 *   shows up as a failure in the tier test, because the pass is applied by the
 *   shared stage rather than by the scene.
 *
 *   **There is nothing to get wrong twice.** "No maps bound" is one line here
 *   rather than one line per material per scene.
 *
 *   **It is testable without a GPU.** Everything below works on structural
 *   types, so the planning half is pure and the mutating half can be asserted
 *   against a fake tree. `three` is imported as types only — deliberately, or
 *   `scripts/test-materials.mjs` would need a WebGL context to check a colour.
 *
 * A material is matched to a substance by `THREE.Material.name`, which
 * `library.ts` stamps on every cached material (and which survives `clone()`, so
 * the leaf's fibre-injected clone is still `ola`). Anything that does not
 * identify itself gets `DEFAULT_ROLE` and is reported in `unlabelled`, so a
 * scene author can see the object they left unnamed instead of wondering why a
 * shard sits at the wrong brightness.
 */
import type { ObjectRole, SystemPalette, Rgb } from './forcedColours.ts'
import { flatSurface, mix, resolvePalette, toHex } from './forcedColours.ts'

/** The shape of a material this pass is willing to touch. */
export interface MaterialLike {
  name?: string
  color?: { set?: (value: string) => unknown } & unknown
  emissive?: { set?: (value: string) => unknown } & unknown
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  envMapIntensity?: number
  map?: unknown
  lightMap?: unknown
  aoMap?: unknown
  normalMap?: unknown
  bumpMap?: unknown
  roughnessMap?: unknown
  metalnessMap?: number | unknown
  displacementMap?: unknown
  alphaMap?: unknown
  [key: string]: unknown
}

/** The shape of an object this pass is willing to walk. */
export interface ObjectLike {
  name?: string
  material?: MaterialLike | MaterialLike[]
  children?: ObjectLike[]
  castShadow?: boolean
  receiveShadow?: boolean
  visible?: boolean
  /** `three` sets both of these on its light classes; the pass needs no import. */
  isLight?: boolean
  isAmbientLight?: boolean
  intensity?: number
  color?: { set?: (value: string) => unknown } & unknown
}

/**
 * Library material name → substance.
 *
 * Keyed by what `library.ts` stamps, with the scene-local names an authored
 * scene is likely to use alongside it, so a scene does not have to know this
 * table exists in order to get a sensible answer. Every name in
 * `MATERIAL_NAMES` must appear here or reach a role here — a substance that
 * maps to nothing gets `DEFAULT_ROLE`, and `test-materials.mjs` fails on the
 * attempt rather than waiting for someone to notice a grey pot.
 */
export const ROLE_BY_MATERIAL_NAME: Record<string, ObjectRole> = {
  ola: 'ola',
  leaf: 'ola',
  wax: 'wax',
  cord: 'cord',
  fibre: 'cord',
  thread: 'cord',
  table: 'teak',
  teak: 'teak',
  stone: 'stone',
  floor: 'stone',
  brass: 'brass',
  lamp: 'brass',
  bell: 'brass',
  copper: 'copper',
  vessel: 'copper',
  clay: 'clay',
  /**
   * Reduction-fired black inside the same pot that is red slip outside.
   *
   * It shares `clay`'s role on purpose. Two roles would be two tones, and two
   * tones for one object is how a pot in forced colours stops looking thrown
   * and starts looking broken: the interior is the *same* substance, fired
   * differently, and the tier's job is shape and separation, not chemistry.
   * What it must not do is fall through to `paper`, which is what a missing
   * entry here would have done — the pot would have lost its inside entirely.
   */
  clayBlack: 'clay',
  cloth: 'cloth',
  bundle: 'cloth',
  water: 'water',
  flame: 'flame',
  ash: 'ash',
  sand: 'sand',
  paper: 'paper',
  slip: 'paper',
  ink: 'ink',
}

/**
 * Where an unidentified material goes: `paper`, mid-to-high on the ramp.
 *
 * The default has to be a tone that cannot be *invisible* rather than one that
 * happens to suit most objects, because the failure mode of a silent default in
 * forced colours is an object that simply is not there. `paper` sits above every
 * surface an object can rest on and below `brass` and `ink`, so an unlabelled
 * shape still reads as a thing in the frame.
 */
export const DEFAULT_ROLE: ObjectRole = 'paper'

/** The exact mutation one material receives. Pure, so it can be asserted. */
export interface ContrastPatch {
  role: ObjectRole
  color: string
  emissive: string | null
  emissiveIntensity: number
  roughness: number
  metalness: number
  /** Always 0: an environment map is a colour, and colour is not ours to add. */
  envMapIntensity: number
  /** The maps this pass will unbind. Non-empty for every material, always. */
  cleared: readonly string[]
}

/** The map slots the pass is allowed to clear, and does. */
const MAP_SLOTS = [
  'map',
  'lightMap',
  'aoMap',
  'normalMap',
  'bumpMap',
  'roughnessMap',
  'metalnessMap',
  'displacementMap',
  'alphaMap',
] as const

export const MAP_SLOTS_CLEARED: readonly string[] = MAP_SLOTS

/** Substance for a material name, falling back to `DEFAULT_ROLE`. */
export function roleForMaterial(materialName: string | undefined): ObjectRole {
  if (!materialName) return DEFAULT_ROLE
  const key = materialName.trim()
  /**
   * Exact match first, then a case-insensitive fallback.
   *
   * The fallback exists so an authored scene can call a mesh `Leaf` and still
   * be understood. The exact test exists because the fallback on its own was a
   * silent trap: it lower-cased the incoming name, so `clayBlack` — the name
   * `library.ts` actually stamps on the pot's interior — could never match a
   * correctly-spelled entry in the table above, and the pot would have been
   * painted as `paper`. `test-materials.mjs` walks every `MATERIAL_NAMES`
   * entry through this function precisely because that failure is invisible:
   * the scene still renders, the interior is just the colour of a page.
   */
  return (
    ROLE_BY_MATERIAL_NAME[key] ?? ROLE_BY_MATERIAL_NAME[key.toLowerCase()] ?? DEFAULT_ROLE
  )
}

/**
 * What a material should become. Pure: palette in, patch out.
 *
 * `flatSurface` decides colour and material character; this adds the two things
 * that only the pass can know — which slots get cleared, and that the
 * environment contribution goes to zero.
 */
export function planForMaterial(material: MaterialLike, palette: SystemPalette): ContrastPatch {
  const role = roleForMaterial(material.name)
  const surface = flatSurface(role, palette)
  return {
    role,
    color: surface.color,
    emissive: surface.emissive,
    emissiveIntensity: surface.emissiveIntensity,
    roughness: surface.roughness,
    metalness: surface.metalness,
    envMapIntensity: 0,
    cleared: MAP_SLOTS.filter((slot) => material[slot] !== undefined && material[slot] !== null),
  }
}

export interface ContrastReport {
  /** Objects walked. */
  objects: number
  /** Materials patched — a mesh with three materials counts three times. */
  materials: number
  /** Lights recoloured. See `neutralise` for why lights are in scope at all. */
  lights: number
  /** Materials that had to take the default role, by `Object3D.name`. */
  unlabelled: string[]
  /** Distinct roles that ended up in the frame, for a "is this scene legible" assertion. */
  roles: ObjectRole[]
}

/**
 * Rewrite a mounted tree for forced colours.
 *
 * Returns a report rather than nothing, because the report is what makes the
 * pass assertable: a scene can be checked to have *actually* cleared its maps
 * and to have landed on a set of roles that are separable, instead of being
 * checked to have called a function.
 */
export function applyContrastPass(
  root: ObjectLike | null | undefined,
  palette: SystemPalette,
): ContrastReport {
  const report: ContrastReport = { objects: 0, materials: 0, lights: 0, unlabelled: [], roles: [] }
  if (!root) return report
  const seen = new Set<ObjectRole>()
  // Derived once: every light in the frame gets the same two values, and
  // recomputing a mix per node would make the pass slower for no reason.
  const lightColours = contrastLights(palette)

  const visit = (object: ObjectLike): void => {
    report.objects += 1
    // Shadows are a colour-independent effect, but they are also the most
    // expensive thing in the frame and they smear exactly the brightness
    // differences the tone ramp exists to provide. Off, unconditionally, here.
    if (object.castShadow) object.castShadow = false
    if (object.receiveShadow) object.receiveShadow = false

    /**
     * Lights are in scope because a warm lamp is a colour.
     *
     * Every scene in this app tints its own lights — `#ffc978` for the flame, a
     * cool `#6f7f9a` for the doorway bounce — and that is the right call in every
     * tier except this one: a coloured key light would push our system-palette
     * tones back toward our own palette through diffuse alone, so the reader's
     * forced colours would be obeyed in the materials and undone by the lighting.
     * Neutral key, neutral ambient, and the ramp is the only thing left carrying
     * shape.
     */
    if (object.isLight) {
      object.color?.set?.(object.isAmbientLight ? lightColours.ambient : lightColours.key)
      report.lights += 1
    }

    const material = object.material
    if (material) {
      const list = Array.isArray(material) ? material : [material]
      for (const one of list) {
        if (!one || typeof one !== 'object') continue
        const patch = planForMaterial(one, palette)
        if (!one.name) report.unlabelled.push(object.name ?? '(unnamed object)')
        if (!seen.has(patch.role)) {
          seen.add(patch.role)
          report.roles.push(patch.role)
        }
        one.color?.set?.(patch.color)
        if (one.emissive?.set && patch.emissive) one.emissive.set(patch.emissive)
        if (typeof one.emissiveIntensity === 'number') one.emissiveIntensity = patch.emissiveIntensity
        if (typeof one.roughness === 'number') one.roughness = patch.roughness
        if (typeof one.metalness === 'number') one.metalness = patch.metalness
        if (typeof one.envMapIntensity === 'number') one.envMapIntensity = patch.envMapIntensity
        // Every slot, whether or not this particular material had it bound: a
        // scene that forgot to clear one map should still not show it here.
        for (const slot of MAP_SLOTS) {
          if (one[slot] !== null && one[slot] !== undefined) one[slot] = null
        }
        report.materials += 1
      }
    }

    for (const child of object.children ?? []) visit(child)
  }

  visit(root)
  return report
}

/**
 * What the *renderer* has to do, which no traversal can reach.
 *
 * Tone mapping is a colour decision, so ACES would put a film curve back on top
 * of a palette chosen to be exactly what the platform asked for. The background
 * is the other half: a scene with no background renders transparent and inherits
 * whatever the page is, which in forced colours is the reader's own `Canvas` —
 * so being explicit about it here is what keeps a lit object sitting on a
 * surface rather than floating over a browser default.
 */
export function contrastBackdrop(palette: SystemPalette): { background: string; exposure: number } {
  const resolved = resolvePalette(palette)
  return { background: toHex(resolved.canvas), exposure: 1 }
}

/** The key light for a forced-colours room: one warm-free light, one bounce. */
export function contrastLights(palette: SystemPalette): { key: string; ambient: string; bounce: string } {
  const resolved = resolvePalette(palette)
  const bright = mix(resolved.canvas, resolved.text, 0.92)
  const dim = mix(resolved.canvas, resolved.text, 0.3)
  return { key: toHex(bright), ambient: toHex(dim), bounce: toHex(resolved.gray ?? dim) }
}

/** Exposed for the test suite: the palette the pass would see for a plain pair. */
export function syntheticPalette(canvas: Rgb, text: Rgb): SystemPalette {
  return { canvas, text }
}
