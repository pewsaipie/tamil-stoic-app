/**
 * Vāsal kolam line-work — the rice-flour geometry of the approved concept
 * (docs/DESIGN-LANGUAGE-VASAL.md), drawn as real vector math.
 *
 * Every primitive here is *kolam grammar*: straight weave lattices over dot
 * grids, diamond knots, loop rings and whisker curls. Nothing is a traced
 * bitmap — the lines stay crisp at any density and inherit `currentColor`,
 * so the CSS theme (day floor / night floor) recolours them for free.
 *
 * The components are pure and deterministic; `scripts/preview-kolam.mjs`
 * renders them to a PNG so the geometry can be inspected without a browser.
 */

type Pt = readonly [number, number]

interface Lattice {
  lines: readonly (readonly [number, number, number, number])[]
  dots: readonly Pt[]
}

/** Axis-aligned square lattice centred on (cx, cy): `cells`×`cells` grid. */
function latticeSquare(cx: number, cy: number, size: number, cells: number): Lattice {
  const half = size / 2
  const step = size / cells
  const lines: [number, number, number, number][] = []
  const dots: Pt[] = []
  for (let i = 0; i <= cells; i++) {
    const o = -half + i * step
    lines.push([cx - half, cy + o, cx + half, cy + o])
    lines.push([cx + o, cy - half, cx + o, cy + half])
  }
  for (let i = 0; i <= cells; i++) {
    for (let j = 0; j <= cells; j++) {
      dots.push([cx - half + i * step, cy - half + j * step])
    }
  }
  return { lines, dots }
}

/** Diamond (45°-rotated) lattice centred on (cx, cy), half-diagonal `r`. */
function latticeDiamond(cx: number, cy: number, r: number, rings: number): Lattice {
  const lines: [number, number, number, number][] = []
  const dots: Pt[] = []
  // Nested diamond outlines shrinking toward the centre.
  for (let k = 0; k <= rings; k++) {
    const rr = (r * k) / rings
    if (rr === 0) continue
    lines.push([cx, cy - rr, cx + rr, cy])
    lines.push([cx + rr, cy, cx, cy + rr])
    lines.push([cx, cy + rr, cx - rr, cy])
    lines.push([cx - rr, cy, cx, cy - rr])
  }
  // Cross-weave: lines parallel to the two diagonals.
  for (let k = 1; k < rings; k++) {
    const o = (r * k) / rings
    // parallel to top-right edge
    lines.push([cx - r + o, cy, cx, cy - r + o])
    lines.push([cx + r - o, cy, cx, cy + r - o])
    // parallel to top-left edge
    lines.push([cx, cy - r + o, cx + r - o, cy])
    lines.push([cx - r + o, cy, cx, cy + r - o])
  }
  // Dots at the weave crossings on the axes and diagonals.
  for (let k = 0; k <= rings; k++) {
    const rr = (r * k) / rings
    dots.push([cx, cy - rr], [cx + rr, cy], [cx, cy + rr], [cx - rr, cy])
  }
  return { lines, dots }
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

const S = 240 // square half-size
const R = 302 // diamond half-diagonal
const C = 360 // centre

const SQUARE_CORNERS: readonly Pt[] = [
  [C - S, C - S],
  [C + S, C - S],
  [C + S, C + S],
  [C - S, C + S],
]

const DIAMOND_POINTS: readonly Pt[] = [
  [C, C - R],
  [C + R, C],
  [C, C + R],
  [C - R, C],
]

/** Where the diamond's edges cross the square's — the octagon's 8 vertices. */
const OCTAGON: readonly Pt[] = [
  [C - 62, C - S],
  [C + 62, C - S],
  [C + S, C - 62],
  [C + S, C + 62],
  [C + 62, C + S],
  [C - 62, C + S],
  [C - S, C + 62],
  [C - S, C - 62],
]

/** A whisker-curl pair drawn at the origin, pointing "up" (−y). */
function Whiskers({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d="M 0 0 Q -6 -20 -24 -24" />
      <circle cx={-28} cy={-25} r={3.8} />
      <path d="M 0 0 Q 6 -20 24 -24" />
      <circle cx={28} cy={-25} r={3.8} />
    </g>
  )
}

/**
 * KolamFrame — the octagon-in-square frame that holds the day's couplet.
 * Square + diamond overlap, corner weaves, diamond knots at the four points,
 * whisker curls at the crossings and a quiet dot ring inside.
 */
export function KolamFrame({ className }: { className?: string }) {
  const corners = SQUARE_CORNERS.map(([x, y]) => latticeSquare(x, y, 92, 4))
  const knots = DIAMOND_POINTS.map(([x, y]) => latticeDiamond(x, y, 52, 4))
  const tips: readonly (readonly [number, number, number])[] = [
    [C, C - R - 64, 0],
    [C + R + 64, C, 90],
    [C, C + R + 64, 180],
    [C - R - 64, C, 270],
  ]
  const whiskers: readonly (readonly [number, number, number])[] = [
    [OCTAGON[0]![0], C - S, 0],
    [OCTAGON[1]![0], C - S, 0],
    [C + S, OCTAGON[2]![1], 90],
    [C + S, OCTAGON[3]![1], 90],
    [OCTAGON[4]![0], C + S, 180],
    [OCTAGON[5]![0], C + S, 180],
    [C - S, OCTAGON[6]![1], 270],
    [C - S, OCTAGON[7]![1], 270],
  ]
  // Inner dot ring: three dots per octagon edge, inset toward the centre.
  const ringDots: Pt[] = []
  for (let i = 0; i < OCTAGON.length; i++) {
    const a = OCTAGON[i]!
    const b = OCTAGON[(i + 1) % OCTAGON.length]!
    for (const t of [0.3, 0.5, 0.7] as const) {
      const p = lerp(a, b, t)
      ringDots.push(lerp(p, [C, C], 0.09))
    }
  }

  return (
    <svg
      viewBox="0 0 720 720"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x={C - S} y={C - S} width={S * 2} height={S * 2} />
      <path d={`M ${C} ${C - R} L ${C + R} ${C} L ${C} ${C + R} L ${C - R} ${C} Z`} />
      {corners.map((lat, i) => (
        <g key={`c${i}`}>
          {lat.lines.map(([x1, y1, x2, y2], j) => (
            <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2.2} />
          ))}
          {lat.dots.map(([x, y], j) => (
            <circle key={`d${j}`} cx={x} cy={y} r={2.6} fill="currentColor" stroke="none" />
          ))}
        </g>
      ))}
      {knots.map((lat, i) => (
        <g key={`k${i}`}>
          {lat.lines.map(([x1, y1, x2, y2], j) => (
            <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2.2} />
          ))}
          {lat.dots.map(([x, y], j) => (
            <circle key={`d${j}`} cx={x} cy={y} r={2.6} fill="currentColor" stroke="none" />
          ))}
        </g>
      ))}
      {tips.map(([, , rot], i) => (
        <g key={`t${i}`} transform={`rotate(${rot} ${C} ${C})`}>
          <circle cx={C} cy={C - R - 62} r={7} />
          <circle cx={C} cy={C - R - 62} r={2.4} fill="currentColor" stroke="none" />
        </g>
      ))}
      {whiskers.map(([x, y, rot], i) => (
        <Whiskers key={`w${i}`} x={x} y={y} rotate={rot} />
      ))}
      {ringDots.map(([x, y], i) => (
        <circle key={`r${i}`} cx={x} cy={y} r={3} fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}

/**
 * KolamRing — the looped ring around a destination circle: twelve beads,
 * offset dots and four tip drops, like the rings in the approved concept.
 */
export function KolamRing({ className }: { className?: string }) {
  const beads = Array.from({ length: 12 }, (_, i) => (i * 360) / 12)
  const offsets = beads.map((a) => a + 15)
  const tips = [0, 90, 180, 270]
  const rad = (a: number) => (a * Math.PI) / 180
  return (
    <svg
      viewBox="0 0 176 176"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
    >
      <circle cx={88} cy={88} r={46} />
      {beads.map((a) => (
        <circle key={`b${a}`} cx={88 + 60 * Math.cos(rad(a))} cy={88 + 60 * Math.sin(rad(a))} r={7} />
      ))}
      {offsets.map((a) => (
        <circle
          key={`o${a}`}
          cx={88 + 71 * Math.cos(rad(a))}
          cy={88 + 71 * Math.sin(rad(a))}
          r={2.2}
          fill="currentColor"
          stroke="none"
        />
      ))}
      {tips.map((a) => (
        <g key={`t${a}`}>
          <circle cx={88 + 74 * Math.cos(rad(a))} cy={88 + 74 * Math.sin(rad(a))} r={4.6} />
        </g>
      ))}
    </svg>
  )
}

/** KolamMotif — the small diamond knot anchoring the bottom edge. */
export function KolamMotif({ className }: { className?: string }) {
  const lat = latticeDiamond(100, 66, 46, 4)
  return (
    <svg
      viewBox="0 0 200 132"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {lat.lines.map(([x1, y1, x2, y2], j) => (
        <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2.2} />
      ))}
      {lat.dots.map(([x, y], j) => (
        <circle key={`d${j}`} cx={x} cy={y} r={2.4} fill="currentColor" stroke="none" />
      ))}
      <circle cx={100} cy={10} r={6} />
      <circle cx={100} cy={10} r={2.2} fill="currentColor" stroke="none" />
    </svg>
  )
}
