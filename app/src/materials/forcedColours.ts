/**
 * Forced colours, answered *inside* the canvas rather than dodged.
 *
 * The first cut of the reality-first brief handled a reader whose system
 * demanded forced colours by dropping them to the flat DOM reader. That was
 * honest, and it was a dodge: it said "we cannot render objects you can also see
 * in high contrast, so here is no object at all."
 *
 * The confirmed doctrine removes that escape hatch. The 3D world is the only
 * presentation, so the world itself has to obey. It obeys by giving up the two
 * things forced colours were always going to take away — **colour** and
 * **texture** — and keeping the two they never asked for — **form** and
 * **light**.
 *
 * The rules, and why each is here:
 *
 *   - **No colour of our own is used.** Every surface is a *tone* mixed between
 *     the system's `Canvas` and `CanvasText`, the one pair the platform
 *     guarantees to contrast. This module never invents a hue.
 *   - **Tones are solved, not chosen.** A substance is defined by which surface
 *     it rests on and how far it must stand off it; the number comes out of
 *     `computeTones()`. See `SURFACE_GRAPH` for the argument, which is a story
 *     about a hand-tuned ramp that failed its own test.
 *   - **No maps are bound.** `flatSurface()` reports `mapsBound: false`, and the
 *     pass that enforces it is asserted per scene: a normal map would reintroduce
 *     detail the platform asked us to stop drawing, and an albedo map would
 *     reintroduce the colour.
 *   - **`emissive` is allowed where the platform has its own word for
 *     "important".** A flame takes the accent role. That is not decoration; it
 *     is the same signal the OS uses for focus and selection.
 *
 * Nothing here imports `three`, and nothing here touches `window` except the
 * three functions at the bottom. That is the whole reason the rules above are
 * testable, and they are tested in `scripts/test-materials.mjs` on a machine
 * with no GPU.
 */

/** sRGB channels, 0–255. */
export interface Rgb {
  r: number
  g: number
  b: number
}

/** Every substance the material library knows. */
export type ObjectRole =
  | 'ola'
  | 'wax'
  | 'cord'
  | 'brass'
  | 'copper'
  | 'teak'
  | 'stone'
  | 'clay'
  | 'cloth'
  | 'water'
  | 'flame'
  | 'ash'
  | 'sand'
  | 'paper'
  | 'ink'

/** WCAG 1.4.11 — the bar for "this is a thing you can act on". */
export const MIN_OBJECT_CONTRAST = 3
/** WCAG 1.4.3 — the bar for a mark that exists to be read. */
export const MIN_TEXT_CONTRAST = 4.5
/** The separation asked of two substances resting on the same surface. */
export const MIN_SIBLING_RATIO = 1.15

/**
 * Where each substance sits, and what it has to stand out from.
 *
 * **This file used to hold a hand-picked luminance per substance**, and it is
 * worth keeping the record of why that was wrong, because the mistake is easy to
 * repeat anywhere a ramp is tuned by eye. Mixing in linear light makes the blend
 * parameter equal luminance, and WCAG ratios are ratios *plus 0.05* — so a ramp
 * spaced evenly by luminance is bunched uselessly at the dark end. The table
 * failed the check written against it: `sand`, `cord`, `clay`, `cloth`, `wax`,
 * `water` and `paper` all came in under 3:1 against the table, and the pair that
 * most needed separating — the leaf against the brass beside it — could not be
 * separated at all, because both were 3:1 above the same table by the same
 * amount, which is to say they were the same grey.
 *
 * Defining the relationships instead makes the numbers portable: Windows
 * `Desert`, black-on-white and an inverted scheme each get their own tones, all
 * meeting the same bar. It also makes the honest admission possible — fourteen
 * substances cannot each sit a factor of three above their parent inside one
 * channel, so `computeTones` reports what could not be placed rather than
 * pretending it fitted.
 *
 * Declaration order is part of the design: siblings on a surface are placed in
 * this order and each is pushed further from the parent than the ones before it,
 * so the earlier a substance appears the more of the contrast budget it gets.
 * The list therefore runs large-and-load-bearing first.
 */
export interface SurfacePlacement {
  /** The surface this substance rests on, or `null` for the room's ground. */
  restsOn: ObjectRole | null
  /** Which side of the parent it has to be readable against. */
  side: 'lighter' | 'darker'
  /** Required contrast against the parent. */
  minRatio: number
}

export const SURFACE_GRAPH: Record<ObjectRole, SurfacePlacement> = {
  // The ground may be nearly the void. A floor is not a control, and lifting it
  // any further steals range from every object sitting on it.
  stone: { restsOn: null, side: 'lighter', minRatio: 1.18 },
  teak: { restsOn: 'stone', side: 'lighter', minRatio: 1.35 },

  // The leaf carries the text, so it is the brightest *large* thing in frame.
  ola: { restsOn: 'teak', side: 'lighter', minRatio: MIN_OBJECT_CONTRAST },
  // Marks on a leaf are held to the text bar rather than the object bar. `ink`
  // is darker than the leaf for the same reason a pen is: that is what a mark
  // on a light surface looks like, and it is also the only direction with room.
  ink: { restsOn: 'ola', side: 'darker', minRatio: MIN_TEXT_CONTRAST },
  // Wax has to beat the leaf by the control bar, and it can only do that by
  // being darker than it. That is not a style preference for dark sealing wax:
  // the leaf already spent the headroom above the table.
  wax: { restsOn: 'ola', side: 'darker', minRatio: MIN_OBJECT_CONTRAST },
  cord: { restsOn: 'ola', side: 'darker', minRatio: MIN_OBJECT_CONTRAST },

  paper: { restsOn: 'teak', side: 'lighter', minRatio: MIN_OBJECT_CONTRAST },
  clay: { restsOn: 'teak', side: 'lighter', minRatio: MIN_OBJECT_CONTRAST },
  cloth: { restsOn: 'teak', side: 'lighter', minRatio: MIN_OBJECT_CONTRAST },
  water: { restsOn: 'teak', side: 'lighter', minRatio: MIN_OBJECT_CONTRAST },
  brass: { restsOn: 'teak', side: 'lighter', minRatio: MIN_OBJECT_CONTRAST },
  copper: { restsOn: 'teak', side: 'lighter', minRatio: MIN_OBJECT_CONTRAST },

  // Residues. Nothing in the app is gated on a reader seeing spilled ash, and
  // spending 3:1 on it would steal separation from the seal.
  sand: { restsOn: 'teak', side: 'lighter', minRatio: 1.6 },
  ash: { restsOn: 'teak', side: 'lighter', minRatio: 1.5 },

  /**
   * `flame` is placed like everything else — and then ignored.
   *
   * It exists in the graph so that "every role has a placement" cannot silently
   * fall through to `undefined`, and so a scene that renders a flame *without*
   * the accent is still able to ask what tone it should have had. The colour
   * itself comes from the platform's accent in `flatSurface`.
   */
  flame: { restsOn: 'teak', side: 'lighter', minRatio: MIN_OBJECT_CONTRAST },
}

/** Everything that must be legible as an object: all of it, except the ground. */
export const FOREGROUND_ROLES: readonly ObjectRole[] = (
  Object.keys(SURFACE_GRAPH) as ObjectRole[]
).filter((role) => role !== 'stone' && role !== 'teak')

/** The system colour each role is read from, in the names the platform uses. */
export const SYSTEM_COLOR_FOR_ROLE = {
  canvas: 'Canvas',
  text: 'CanvasText',
  link: 'LinkText',
  visited: 'VisitedText',
  active: 'ActiveText',
  control: 'ButtonFace',
  controlText: 'ButtonText',
  field: 'Field',
  fieldText: 'FieldText',
  highlight: 'Highlight',
  highlightText: 'HighlightText',
  gray: 'GrayText',
  accent: 'AccentColor',
  accentText: 'AccentTextColor',
  mark: 'Mark',
  markText: 'MarkText',
} as const

export type SystemRole = keyof typeof SYSTEM_COLOR_FOR_ROLE

/** The palette as read from the platform. Absent entries are derived: see `resolvePalette`. */
export type SystemPalette = Partial<Record<SystemRole, Rgb>>

/* -------------------------------------------------------------------------- */
/* colour maths — pure, no DOM, no three                                       */
/* -------------------------------------------------------------------------- */

/**
 * Parse the notations a computed style can come back in.
 *
 * `getComputedStyle` normalises to `rgb()`/`rgba()` in every browser that ships
 * forced colours, but these values are also authored in tests, and a colour
 * silently mis-parsed becomes a black surface in a scene that looks *plausible*.
 * That is the worst failure available, so unknown syntax returns `null` and the
 * caller has to handle it.
 */
export function parseColor(input: string): Rgb | null {
  const value = input.trim().toLowerCase()
  if (!value) return null

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value)
  if (hex) {
    const digits = hex[1]!
    if (digits.length === 3) {
      return {
        r: parseInt(digits[0]! + digits[0]!, 16),
        g: parseInt(digits[1]! + digits[1]!, 16),
        b: parseInt(digits[2]! + digits[2]!, 16),
      }
    }
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
    }
  }

  const rgb = /^rgba?\(([^)]+)\)$/.exec(value)
  if (rgb) {
    const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean)
    const [r, g, b] = parts
    if (r === undefined || g === undefined || b === undefined) return null
    const parsed = [r, g, b].map((channel) =>
      channel.endsWith('%') ? (parseFloat(channel) / 100) * 255 : parseFloat(channel),
    )
    if (parsed.some((n) => !Number.isFinite(n))) return null
    return { r: clamp255(Math.round(parsed[0]!)), g: clamp255(Math.round(parsed[1]!)), b: clamp255(Math.round(parsed[2]!)) }
  }

  return null
}

function clamp255(n: number): number {
  return Math.min(255, Math.max(0, n))
}

/** sRGB channel → linear. Mixing in sRGB is how ramps end up muddy. */
function toLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** linear → sRGB channel. */
function toSrgb(c: number): number {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return clamp255(Math.round(s * 255))
}

/** Relative luminance, per the WCAG 2.x definition. */
export function relativeLuminance(color: Rgb): number {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b)
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Mix two system colours, `t` from 0 (a) to 1 (b), in linear light.
 *
 * This is the only place a colour is produced in forced-colours mode, and it has
 * exactly two inputs, both from the platform. The consequence is the property
 * worth having: whatever palette the OS hands us, the whole ramp is as contrasty
 * as the OS says `Canvas` and `CanvasText` are, and no brighter or dimmer than
 * that range allows.
 */
export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t))
  const channel = (ca: number, cb: number) => toSrgb(toLinear(ca) * (1 - k) + toLinear(cb) * k)
  return { r: channel(a.r, b.r), g: channel(a.g, b.g), b: channel(a.b, b.b) }
}

/** `#rrggbb`, the form `three` wants. */
export function toHex(color: Rgb): string {
  const hex = (n: number) => clamp255(n).toString(16).padStart(2, '0')
  return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`
}

/**
 * Fill in whatever the platform did not give us.
 *
 * `AccentColor` and its text twin are recent and not universal. Rather than fall
 * back to the app's own warm palette — which would put our judgement back into a
 * mode whose entire premise is that we have none — every missing role is derived
 * from `Canvas` and `CanvasText`.
 */
export function resolvePalette(read: SystemPalette): SystemPalette & { canvas: Rgb; text: Rgb } {
  const canvas = read.canvas ?? { r: 0, g: 0, b: 0 }
  const text = read.text ?? { r: 255, g: 255, b: 255 }
  return {
    ...read,
    canvas,
    text,
    highlight: read.highlight ?? mix(canvas, text, 0.86),
    highlightText: read.highlightText ?? canvas,
    accent: read.accent ?? read.highlight ?? mix(canvas, text, 0.92),
    control: read.control ?? mix(canvas, text, 0.16),
    controlText: read.controlText ?? text,
    gray: read.gray ?? mix(canvas, text, 0.42),
  }
}

/* -------------------------------------------------------------------------- */
/* the tone solver                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Luminance of a blend, closed form.
 *
 * `mix` interpolates each channel in linear light and `relativeLuminance` is a
 * linear combination of linear-light channels, so luminance is *exactly* linear
 * in `t`. That is what lets the whole ramp be solved with arithmetic instead of
 * a search — and, more usefully, lets an unreachable ratio be recognised as
 * unreachable rather than converged onto by a bisection that never terminates.
 */
export function luminanceAt(t: number, palette: SystemPalette): number {
  const { canvas, text } = resolvePalette(palette)
  const a = relativeLuminance(canvas)
  const b = relativeLuminance(text)
  return a + Math.min(1, Math.max(0, t)) * (b - a)
}

/** Inverse: the blend that reaches a requested luminance, or `null` if it is out of range. */
export function toneForLuminance(luminance: number, palette: SystemPalette): number | null {
  const { canvas, text } = resolvePalette(palette)
  const a = relativeLuminance(canvas)
  const b = relativeLuminance(text)
  if (Math.abs(b - a) < 1e-6) return null
  const t = (luminance - a) / (b - a)
  return t >= 0 && t <= 1 ? t : null
}

export interface PlacedTone {
  role: ObjectRole
  tone: number
  /** The contrast actually achieved against the parent. */
  ratioToParent: number
  /** The contrast achieved against the nearest sibling on the same surface. */
  ratioToSibling: number
  /**
   * `true` when the placement could not be honoured inside the palette's range:
   * the tone is the best available, which will be *close* to the requirement and
   * is knowingly a compromise. Surfaced rather than swallowed, because the
   * alternative is a scene where two substances quietly share a grey.
   */
  violated: boolean
}

/**
 * Place every substance against its parent, in one pass.
 *
 * The ratio a role needs against its parent becomes a luminance target
 * (`R · (Lp + 0.05) − 0.05` for a lighter child, the reciprocal for a darker
 * one), the target becomes a tone, and siblings sharing that surface are pushed
 * outward one at a time so they cannot land on top of each other.
 *
 * **The declared side is a preference, not a demand, and that distinction came
 * out of a test failure rather than out of a theory.** A palette can be inverted:
 * in Windows' default dark scheme `CanvasText` is light, and "lighter than the
 * table" means "toward `CanvasText`"; in black-on-white the same words point the
 * other way, so the first version of this solver asked for a luminance above the
 * top of the range, found none, and reported the leaf and the seal as
 * unplaceable in the single most common high-contrast theme there is. When the
 * declared side has no room, the placement flips to the other side of the parent
 * — which still delivers the separation the bar is actually about — and only
 * reports a violation when *both* sides are out of range.
 *
 * The consequence worth stating for anyone adding a substance later: `side`
 * says which direction a surface should *look*, and the graph is still worth
 * getting right for that reason, but no reader's legibility depends on which of
 * the two directions the solver had room for.
 */
export function computeTones(palette: SystemPalette): Record<ObjectRole, PlacedTone> {
  const placed = {} as Record<ObjectRole, PlacedTone>
  const slots = new Map<string, number[]>()

  for (const role of Object.keys(SURFACE_GRAPH) as ObjectRole[]) {
    const placement = SURFACE_GRAPH[role]
    const parent = placement.restsOn
    const parentTone = parent ? (placed[parent]?.tone ?? 0) : 0
    const parentL = luminanceAt(parentTone, palette)
    const needed = placement.minRatio

    /** The tone that achieves `minRatio` on one side, or `null` if the range cannot. */
    const solve = (lighter: boolean): number | null => {
      const wanted = lighter
        ? placement.minRatio * (parentL + 0.05) - 0.05
        : (parentL + 0.05) / placement.minRatio - 0.05
      return toneForLuminance(wanted, palette)
    }

    let lighter = placement.side === 'lighter'
    let t = solve(lighter)
    if (t === null) {
      // Flip. Separation is the requirement; which end of the ramp carries it is
      // the palette's business, not ours.
      lighter = !lighter
      t = solve(lighter)
    }

    /**
     * Whether raising `t` raises or lowers luminance, for this palette.
     *
     * `t` is a position between two platform colours, and nothing in the CSS
     * contract promises which of them is the bright one: on white-on-black
     * `t = 1` is near-white, on black-on-white it is black. Any code that says
     * "push further from the parent" in terms of `Math.max` is therefore wrong in
     * exactly one of the two themes — which is how this line came to exist. The
     * sibling push was pulling objects *toward* their parents on the inverted
     * palette, and only a test that asserts separations rather than numbers
     * noticed.
     */
    const { canvas, text } = resolvePalette(palette)
    const colourAt = (tone: number): Rgb => mix(canvas, text, tone)
    const parentColour = colourAt(parentTone)
    const up = lighter === relativeLuminance(text) >= relativeLuminance(canvas)
    const step = 1 / 255

    /**
     * Walk outward, one rendered channel at a time, until every bar is met.
     *
     * Two problems, one loop.
     *
     * The first is quantization: a tone solved to exactly 3.00:1 lands on an
     * 8-bit colour that measures 2.98:1, because every channel gets rounded and
     * a ratio sitting exactly on a WCAG bar is suddenly under it. That is not a
     * tolerance to widen in a test — it is what a reader would actually see — so
     * the requirement is asserted against the colour that renders.
     *
     * The second is siblings. Two substances resting on the same surface need
     * `MIN_SIBLING_RATIO` between them, and the obvious way to do that (aim each
     * one past its neighbour) is wrong: it shoves a perfectly well-separated
     * object across its neighbour to reach a number nobody asked for. Measuring
     * the actual ratio and only then stepping outward is both simpler and correct.
     *
     * `violated` means the range ran out before the bars were met — a fact about
     * the palette, reported rather than hidden.
     */
    const key = `${parent ?? '(ground)'}|${lighter ? 'lighter' : 'darker'}`
    const neighbours = slots.get(key) ?? []
    let violated = t === null
    if (t === null) t = lighter ? 1 : 0

    for (let i = 0; i < 256; i += 1) {
      const own = colourAt(t)
      const parentClear = contrastRatio(own, parentColour) >= needed
      const siblingClear = neighbours.every(
        (neighbourTone) => contrastRatio(own, colourAt(neighbourTone)) >= MIN_SIBLING_RATIO,
      )
      if (parentClear && siblingClear) break
      const next = Math.min(1, Math.max(0, up ? t + step : t - step))
      if (next === t) {
        violated = true
        break
      }
      t = next
    }

    const own = colourAt(t)
    const ratioToParent = contrastRatio(own, parentColour)

    let ratioToSibling = Infinity
    for (const neighbourTone of neighbours) {
      ratioToSibling = Math.min(ratioToSibling, contrastRatio(own, colourAt(neighbourTone)))
    }

    placed[role] = {
      role,
      tone: Math.min(1, Math.max(0, t)),
      ratioToParent,
      ratioToSibling: Number.isFinite(ratioToSibling) ? ratioToSibling : 1,
      violated,
    }
    neighbours.push(t)
    slots.set(key, neighbours)
  }

  return placed
}

/** A cache in front of `computeTones`, keyed on the palette's own bytes. */
let toneCache: { key: string; tones: Record<ObjectRole, PlacedTone> } | null = null

function tonesFor(palette: SystemPalette): Record<ObjectRole, PlacedTone> {
  const key = JSON.stringify(resolvePalette(palette))
  if (toneCache?.key === key) return toneCache.tones
  const tones = computeTones(palette)
  toneCache = { key, tones }
  return tones
}

/**
 * Every placement whose required separation could not be honoured.
 *
 * Exported for CI. A scene is allowed to have violations on a genuinely cramped
 * palette — that is a fact about the palette, not a defect — but the *set* of
 * them is asserted, so adding a substance that overflows the ramp shows up as a
 * failing test instead of as two objects that look the same.
 */
export function legibilityViolations(palette: SystemPalette): ObjectRole[] {
  const tones = tonesFor(palette)
  return (Object.keys(SURFACE_GRAPH) as ObjectRole[]).filter(
    (role) => tones[role]?.violated || (tones[role].ratioToParent < SURFACE_GRAPH[role].minRatio - 1e-6),
  )
}

/** What a scene may set on a material in forced-colours mode. */
export interface FlatSurface {
  /** `#rrggbb`, always a tone of the system pair. */
  color: string
  /** `#rrggbb` or `null`. Only `flame` is emissive. */
  emissive: string | null
  emissiveIntensity: number
  roughness: number
  metalness: number
  /**
   * Load-bearing and asserted per surface: no albedo, normal or roughness map
   * may be bound while forced colours are active.
   */
  mapsBound: false
  /** The solved blend parameter, exposed so a test can assert the ramp. */
  tone: number
  /** Contrast achieved against the surface this one rests on. */
  contrastAgainstParent: number
  /** Whether the placement had to be compromised for this palette. */
  violated: boolean
}

/**
 * How much material character survives forced colours.
 *
 * Roughness and metalness are not colour, and they are what stops brass reading
 * as a flat cut-out once the one light hits it, so they are kept — narrowed
 * deliberately toward the middle. Real brass at 0.18 roughness against a palette
 * with no specular colour reads as a hole rather than as metal.
 */
const MATERIAL_CHARACTER: Record<ObjectRole, { roughness: number; metalness: number }> = {
  ola: { roughness: 0.72, metalness: 0 },
  wax: { roughness: 0.46, metalness: 0 },
  cord: { roughness: 0.86, metalness: 0 },
  brass: { roughness: 0.32, metalness: 0.72 },
  copper: { roughness: 0.38, metalness: 0.68 },
  teak: { roughness: 0.68, metalness: 0 },
  stone: { roughness: 0.94, metalness: 0 },
  clay: { roughness: 0.8, metalness: 0 },
  cloth: { roughness: 0.96, metalness: 0 },
  water: { roughness: 0.08, metalness: 0.1 },
  flame: { roughness: 1, metalness: 0 },
  ash: { roughness: 1, metalness: 0 },
  sand: { roughness: 0.92, metalness: 0 },
  paper: { roughness: 0.78, metalness: 0 },
  ink: { roughness: 0.5, metalness: 0 },
}

/**
 * The flat surface for one substance, given a palette.
 *
 * Pure and total: no `three`, no DOM, no `window`. A scene asks for a role and
 * gets numbers it may copy into a material and nothing else — in particular it
 * cannot get a map, because there is no field here to put one in.
 */
export function flatSurface(role: ObjectRole, palette: SystemPalette): FlatSurface {
  const resolved = resolvePalette(palette)
  const placed = tonesFor(palette)[role]
  const character = MATERIAL_CHARACTER[role]

  // The one role that is not a tone: the platform's own "this matters" colour,
  // so a lamp reads as lit rather than as a pale disc.
  const isFlame = role === 'flame'
  const color = isFlame ? resolved.accent! : mix(resolved.canvas, resolved.text, placed.tone)

  return {
    color: toHex(color),
    emissive: isFlame ? toHex(resolved.accent!) : null,
    emissiveIntensity: isFlame ? 1.35 : 0,
    roughness: character.roughness,
    metalness: character.metalness,
    mapsBound: false,
    tone: placed.tone,
    contrastAgainstParent: placed.ratioToParent,
    violated: placed.violated,
  }
}

/* -------------------------------------------------------------------------- */
/* the DOM half — read once per change, never cached across one                */
/* -------------------------------------------------------------------------- */

/**
 * Read the system palette by asking the platform to paint it for us.
 *
 * There is no API that hands back the forced-colours values. The accepted way to
 * get them is the one a browser cannot refuse: set a CSS system colour on a real
 * element and read it back from the computed style. That returns the *resolved*
 * value the OS is enforcing, which is exactly what a canvas needs and exactly
 * what a hard-coded palette would get wrong.
 */
export function readSystemPalette(): SystemPalette {
  if (typeof document === 'undefined' || !document.body) return {}
  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.position = 'absolute'
  probe.style.pointerEvents = 'none'
  probe.style.opacity = '0'
  probe.style.height = '0'
  probe.style.width = '0'

  const result: SystemPalette = {}
  try {
    document.body.appendChild(probe)
    for (const [role, systemColor] of Object.entries(SYSTEM_COLOR_FOR_ROLE)) {
      probe.style.color = systemColor
      const parsed = parseColor(getComputedStyle(probe).color)
      // A role the platform does not resolve is left absent, not guessed:
      // `resolvePalette` derives it from the two roles that always resolve.
      if (parsed) result[role as SystemRole] = parsed
    }
  } catch {
    return result
  } finally {
    probe.remove()
  }
  return result
}

/** Is the platform currently forcing colours? */
export function isForcedColoursActive(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(forced-colors: active)').matches
}

/**
 * Watch the setting instead of reading it once at mount.
 *
 * Forced colours is live: a reader can turn it on with the app open.
 * `quality.ts` deliberately probes capabilities once because probing creates a
 * WebGL context, so this is the single capability that has to be re-read, and the
 * reason the tier is recomputed reactively in `useMaterials`.
 */
export function subscribeForcedColours(onChange: (active: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const query = window.matchMedia('(forced-colors: active)')
  const handler = (event: MediaQueryListEvent) => onChange(event.matches)
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }
  // Safari < 14 only had the deprecated pair. Same contract, older shape.
  query.addListener(handler)
  return () => query.removeListener(handler)
}
