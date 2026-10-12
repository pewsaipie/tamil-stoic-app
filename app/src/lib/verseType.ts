/**
 * Verse type metrics — how wide a couplet line runs, measured in ems.
 *
 * A couplet is two `white-space: nowrap` lines that must fit their column at
 * every text size and on every surface. The stylesheet does that with one
 * formula — `font-size: min(--verse-size, 98cqi / --verse-em)` — so this module
 * has exactly one job: supply `--verse-em`, the advance width of the longer
 * line in ems.
 *
 * The flicker-free contract this module exists to keep:
 *
 *   1. First paint uses `estimateVerseEm` — a static, conservative estimate
 *      that needs no measurement and cannot thrash layout.
 *   2. `measureVerseEm` replaces it with the true width **only** when the Tamil
 *      face is actually usable (`document.fonts.check`), never with fallback
 *      metrics. `verseFaceReady` resolves at the moment that face becomes
 *      usable, which — under `font-display: block` in `fonts.css` — is before
 *      the verse is ever visible. The size is therefore right at first visible
 *      paint and never changes afterwards.
 *
 * Nothing here reads the DOM layout of the verse, observes resizes, or reflows
 * text after paint: the verse holds still on every page.
 */

/** The face couplets are set in — must mirror `.verse` in `styles/global.css`. */
const VERSE_WEIGHT = 600
const VERSE_FAMILY = '"Noto Serif Tamil"'

/** `document.fonts` specs: CSS keywords first, family last. */
const FACE_SPEC = `${VERSE_WEIGHT} 1em ${VERSE_FAMILY}`

/** `.verse { letter-spacing }` in em — folded into the probe's own style. */
const LETTER_SPACING_EM = 0.01

/** The probe is set at a large size and scaled down, for precision. */
const MEASURE_PX = 100

function fontSet(): FontFaceSet | null {
  try {
    if (typeof document === 'undefined') return null
    const fonts: unknown = (document as Partial<Document>).fonts
    return fonts ? (fonts as FontFaceSet) : null
  } catch {
    return null
  }
}

/** Wide Tamil base consonants/vowels in Noto Serif Tamil SemiBold. */
const WIDE_TAMIL_LETTERS = new Set([
  0x0b94, // ஔ
  0x0b99, // ங
  0x0b9e, // ஞ
  0x0ba3, // ண
  0x0bb3, // ள
  0x0bb4, // ழ
  0x0bb1, // ற
  0x0ba9, // ன
])

function estimateLineEm(line: string): number {
  let em = 0
  for (const ch of line) {
    const code = ch.charCodeAt(0)
    if (ch === ' ') {
      em += 0.36
    } else if (code === 0x0bca || code === 0x0bcb || code === 0x0bcc) {
      // Two-part dependent vowel signs (ொ, ோ, ௌ) render two spacing glyphs
      em += 1.32
    } else if (code === 0x0bbe || code === 0x0bc6 || code === 0x0bc7 || code === 0x0bc8) {
      // Spacing dependent vowel signs (ா, ெ, ே, ை)
      em += 0.72
    } else if (code === 0x0bbf || code === 0x0bc0 || code === 0x0bc1 || code === 0x0bc2) {
      // Dependent vowel signs that widen the base consonant (ி, ீ, ு, ூ)
      em += 0.18
    } else if (code === 0x0bcd) {
      // Pulli (்)
      em += 0.05
    } else if (WIDE_TAMIL_LETTERS.has(code)) {
      em += 1.02
    } else if (code >= 0x0b80 && code <= 0x0bff) {
      // Standard Tamil vowel/consonant/sign
      em += 0.88
    } else {
      em += 0.55
    }
  }
  return em * 1.04
}

/**
 * A conservative first-paint width for a couplet, in ems.
 *
 * Accounts for Tamil two-part vowel signs (`ொ`, `ோ`, `ௌ`), spacing vowel signs
 * (`ா`, `ெ`, `ே`, `ை`), and wide SemiBold consonants so first paint never
 * underestimates the 4-word top line. It is replaced by the measured width as
 * soon as the face is usable.
 */
export function estimateVerseEm(top: string, bottom: string): number {
  const raw = Math.ceil(Math.max(estimateLineEm(top), estimateLineEm(bottom)))
  return Math.min(32, Math.max(18, raw))
}

/** True when the Tamil verse face can render `sample` right now. */
export function isVerseFaceReady(sample: string): boolean {
  const fonts = fontSet()
  if (!fonts || typeof fonts.check !== 'function') return false
  try {
    return fonts.check(FACE_SPEC, sample)
  } catch {
    return false
  }
}

/**
 * Resolves when the Tamil verse face can render `sample`.
 *
 * Asking `document.fonts.load` for the exact face (and the exact text, so the
 * right unicode-range subset is fetched) is also what starts that download
 * early — the verse face is requested with the component tree, not after it.
 * Never rejects: without the Font Loading API the estimator simply stands.
 */
export function verseFaceReady(sample: string): Promise<void> {
  const fonts = fontSet()
  if (!fonts) return Promise.resolve()
  const settle = (): void => undefined
  try {
    if (typeof fonts.load === 'function') {
      return Promise.resolve(fonts.load(FACE_SPEC, sample)).then(settle, settle)
    }
    if (fonts.ready) return Promise.resolve(fonts.ready).then(settle, settle)
  } catch {
    /* no usable font loading API — the estimator stands */
  }
  return Promise.resolve()
}

/**
 * One hidden, off-screen span, styled exactly like the verse face at 100px.
 * It is the only measuring device here: laid out like real text (kerning,
 * letter-spacing and shaping included), never painted, never observed.
 */
let probe: HTMLSpanElement | null | undefined

function measureProbe(): HTMLSpanElement | null {
  if (probe !== undefined) return probe
  probe = null
  try {
    const el = document.createElement('span')
    el.lang = 'ta'
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = [
      'position: absolute',
      'left: -9999px',
      'top: 0',
      'visibility: hidden',
      'white-space: nowrap',
      `font-family: ${VERSE_FAMILY}`,
      `font-weight: ${VERSE_WEIGHT}`,
      `font-size: ${MEASURE_PX}px`,
      `letter-spacing: ${LETTER_SPACING_EM}em`,
    ].join(';')
    document.body.appendChild(el)
    probe = el
  } catch {
    probe = null
  }
  return probe
}

/**
 * The true width of the longer line in ems — or `null` when it cannot be
 * trusted yet (face still loading, no layout, no Font Loading API).
 *
 * A `null` means: keep the estimate, ask again when `verseFaceReady` resolves.
 */
export function measureVerseEm(top: string, bottom: string): number | null {
  if (!isVerseFaceReady(top + bottom)) return null
  const el = measureProbe()
  if (!el) return null
  try {
    const emOf = (line: string): number => {
      el.textContent = line
      return el.offsetWidth / MEASURE_PX
    }
    const width = Math.max(emOf(top), emOf(bottom))
    return Number.isFinite(width) && width > 0 ? width : null
  } catch {
    return null
  }
}
