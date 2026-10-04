/**
 * The mathematics of a broken seal — deliberately free of materials, scenes and
 * React, so it can be tested on its own in Node (see `scripts/test-materials.mjs`).
 *
 * A wax seal is a disc. Breaking it is a Voronoi partition of that disc: every
 * point of the seal belongs to the nearest seed, so cells tile the disc exactly
 * with no gaps and no overlaps. Two consequences matter, and both are asserted
 * in the test suite:
 *
 *   - **The cells partition the seal.** Their areas sum to the area of the
 *     outline. If a clipping sign is ever flipped, wax appears or disappears,
 *     and the test says so.
 *   - **The cells are convex.** A Voronoi cell of a convex region is convex,
 *     which is what makes a triangle fan a valid triangulation. It is also why
 *     the shards can be extruded into prisms without any hole-filling.
 */
import * as THREE from 'three'

/** A point in the seal's own plane, in metres. */
export interface Point2 {
  x: number
  y: number
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The seal's outline: a circle with scalloped lobes, because wax squeezed under
 * a stamp bulges between the die's points. Deterministic, so a reload does not
 * reshuffle the wax.
 */
export function sealOutline(
  radius: number,
  lobes = 12,
  scallop = 0.045,
  steps = 96,
): Point2[] {
  const points: Point2[] = []
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2
    const r =
      radius *
      (1 + scallop * Math.cos(lobes * angle) + scallop * 0.35 * Math.cos(lobes * 2 * angle + 0.7))
    points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r })
  }
  return points
}

/**
 * Clip a convex polygon to the half-plane nearer `a` than `b` — the Voronoi
 * bisector. Standard Sutherland–Hodgman; the inside test is
 * `dot(p − midpoint, b − a) <= 0`.
 */
export function clipToBisector(polygon: Point2[], a: Point2, b: Point2): Point2[] {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const nx = b.x - a.x
  const ny = b.y - a.y
  const inside = (p: Point2): number => (p.x - mx) * nx + (p.y - my) * ny

  const out: Point2[] = []
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i] as Point2
    const previous = polygon[(i + polygon.length - 1) % polygon.length] as Point2
    const dCurrent = inside(current)
    const dPrevious = inside(previous)

    if (dCurrent <= 0) {
      if (dPrevious > 0) {
        const t = dPrevious / (dPrevious - dCurrent)
        out.push({
          x: previous.x + (current.x - previous.x) * t,
          y: previous.y + (current.y - previous.y) * t,
        })
      }
      out.push(current)
    } else if (dPrevious <= 0) {
      const t = dPrevious / (dPrevious - dCurrent)
      out.push({
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
      })
    }
  }
  return out
}

export function polygonArea(polygon: Point2[]): number {
  let area = 0
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i] as Point2
    const b = polygon[(i + 1) % polygon.length] as Point2
    area += a.x * b.y - b.x * a.y
  }
  return Math.abs(area) / 2
}

/** The poured top surface: a dome that flattens toward the rim. */
export function topHeight(x: number, y: number, radius: number, height: number): number {
  const r = Math.min(1, Math.hypot(x, y) / radius)
  return height * Math.cos((r * Math.PI) / 2) ** 0.65
}

/** A degenerate cell would emit a chip nothing can see or hit. */
export function isDegenerate(cell: Point2[], radius: number): boolean {
  return cell.length < 3 || polygonArea(cell) < radius * radius * 0.0016
}

/**
 * Scatter the seeds the fracture grows from.
 *
 * Clustered along a line through the centre, because a struck seal splits from
 * where it was hit rather than shattering evenly — and thinned with distance,
 * so the break reaches the rim and the *silhouette* changes.
 */
export function fractureSeeds(
  radius: number,
  count: number,
  random: () => number,
  crackAngle = 0.55,
): Point2[] {
  const along = { x: Math.cos(crackAngle), y: Math.sin(crackAngle) }
  const across = { x: -along.y, y: along.x }
  const seeds: Point2[] = []
  let guard = 0

  while (seeds.length < count && guard < count * 200) {
    guard += 1
    const u = (random() * 2 - 1) * radius
    const v = (random() * 2 - 1) * radius * 0.55
    const jitter = radius * 0.12
    const x = along.x * u + across.x * v + (random() - 0.5) * jitter
    const y = along.y * u + across.y * v + (random() - 0.5) * jitter
    if (Math.hypot(x, y) > radius * 0.94) continue
    seeds.push({ x, y })
  }
  return seeds
}

/** The Voronoi cell of one seed, clipped out of the seal. */
export function cellOf(seed: Point2, seeds: readonly Point2[], outline: Point2[]): Point2[] {
  let cell = outline
  for (const other of seeds) {
    if (other === seed) continue
    cell = clipToBisector(cell, seed, other)
    if (cell.length < 3) break
  }
  return cell
}

function pointInTriangle(p: Point2, a: Point2, b: Point2, c: Point2): boolean {
  const d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y)
  const d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y)
  const d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y)
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNegative && hasPositive)
}

/**
 * Triangulate a simple polygon by ear clipping.
 *
 * A triangle fan from the centroid is simpler — and it is what this used to
 * do — but it is only valid for a *star-shaped* polygon, and the cells are not
 * all star-shaped: the seal's scalloped rim is concave between its lobes, so
 * any cell that straddles a valley gets a fan that folds over itself and
 * overshoots the cell's area by several percent. On screen that is a nick in
 * the wax exactly where the reader has just broken it.
 *
 * Ear clipping is correct for any simple polygon, concave included. For cells
 * of a dozen vertices the cost is irrelevant, and it runs once, at build.
 *
 * Returns indices into `polygon`, in threes.
 */
export function triangulatePolygon(polygon: Point2[]): number[] {
  const n = polygon.length
  if (n < 3) return []

  const remaining = polygon.map((_, index) => index)
  // Work counter-clockwise, so a convex corner has a positive cross product.
  let signedArea = 0
  for (let i = 0; i < n; i += 1) {
    const a = polygon[i] as Point2
    const b = polygon[(i + 1) % n] as Point2
    signedArea += a.x * b.y - b.x * a.y
  }
  if (signedArea < 0) remaining.reverse()

  const triangles: number[] = []
  let guard = n * n

  while (remaining.length > 3 && guard > 0) {
    guard -= 1
    let clipped = false

    for (let k = 0; k < remaining.length; k += 1) {
      const previous = remaining[(k + remaining.length - 1) % remaining.length] as number
      const current = remaining[k] as number
      const next = remaining[(k + 1) % remaining.length] as number
      const a = polygon[previous] as Point2
      const b = polygon[current] as Point2
      const c = polygon[next] as Point2

      // A reflex corner is never an ear.
      if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) <= 0) continue

      // Nor is a corner with any other vertex inside it.
      let swallows = false
      for (const other of remaining) {
        if (other === previous || other === current || other === next) continue
        if (pointInTriangle(polygon[other] as Point2, a, b, c)) {
          swallows = true
          break
        }
      }
      if (swallows) continue

      triangles.push(previous, current, next)
      remaining.splice(k, 1)
      clipped = true
      break
    }

    // A polygon with collinear duplicates can stall; the guard ends it, and
    // the final fan below emits whatever is left so no geometry is lost.
    if (!clipped) break
  }

  for (let i = 1; i < remaining.length - 1; i += 1) {
    triangles.push(remaining[0] as number, remaining[i] as number, remaining[i + 1] as number)
  }

  return triangles
}

/**
 * Extrude a cell into a wax chip: a domed top face, a flat bottom, and side
 * walls. Closed — every edge is shared by exactly two triangles, which is what
 * `test-materials.mjs` checks, because a chip with a hole in it catches the
 * light wrong at exactly the moment the reader is looking closely.
 */
export function buildShardGeometry(
  polygon: Point2[],
  radius: number,
  height: number,
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const count = polygon.length

  const bottomStart = positions.length / 3
  for (const p of polygon) {
    positions.push(p.x, -0.0004, p.y)
    uvs.push((p.x / radius + 1) / 2, (p.y / radius + 1) / 2)
  }
  const topStart = positions.length / 3
  for (const p of polygon) {
    positions.push(p.x, topHeight(p.x, p.y, radius, height), p.y)
    uvs.push((p.x / radius + 1) / 2, (p.y / radius + 1) / 2)
  }

  // The two faces are ear-clipped rather than fanned, so a cell with a concave
  // rim valley triangulates exactly instead of folding over itself.
  const faceTriangles = triangulatePolygon(polygon)
  for (let i = 0; i < faceTriangles.length; i += 3) {
    const a = faceTriangles[i] as number
    const b = faceTriangles[i + 1] as number
    const c = faceTriangles[i + 2] as number
    // Top face, then the same triangle reversed for the underside.
    indices.push(topStart + a, topStart + b, topStart + c)
    indices.push(bottomStart + a, bottomStart + c, bottomStart + b)
  }

  // The rim: one quad per edge, and every rim edge is used exactly once here
  // and once by a face, which is what makes the shell watertight.
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count
    indices.push(bottomStart + i, bottomStart + next, topStart + next)
    indices.push(bottomStart + i, topStart + next, topStart + i)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  // Flat faces are exactly what makes a chip of wax catch the light along its
  // fracture, so the normals come from the triangles rather than being smoothed.
  geometry.computeVertexNormals()
  return geometry
}
