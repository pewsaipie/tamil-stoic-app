/**
 * Dev-only visual check for the vāsal kolam geometry.
 *
 * Renders the React kolam components to SVG and rasterises them over the
 * red-oxide floor so the line-work can be inspected without a browser.
 * Rasteriser preference: @resvg/resvg-js (set NODE_PATH if it lives outside
 * the repo) → ImageMagick with an SVG delegate.
 *
 *   NODE_PATH=/path/to/raster/node_modules node scripts/preview-kolam.mjs [outdir]
 */
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const outdir = process.argv[2] ?? '/tmp/kolam'
execSync(`mkdir -p ${outdir}`)

// Bundle the entry (TSX + react-dom/server) into a temp module and run it.
const bundle = path.join(outdir, 'entry.cjs')
execSync(
  `npx esbuild scripts/kolam-preview-entry.tsx --bundle --format=cjs --platform=node --jsx=automatic --outfile=${bundle}`,
  { stdio: 'inherit' },
)
const { frame, ring, motif } = JSON.parse(execSync(`node ${bundle}`, { maxBuffer: 1024 * 1024 * 32 }).toString())

const FLOOR = '#8A2E1B'
// The browser resolves currentColor from CSS; the rasteriser needs it literal.
const FLOUR = '#F7F1E6'
const withNs = (svg) =>
  svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('currentColor', FLOUR)
const onFloor = (svg) => withNs(svg).replace('>', `><rect x="-40" y="-40" width="2000" height="2000" fill="${FLOOR}"/>`)
const placed = (svg, x, y, w, h) => withNs(svg).replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `)

const require = createRequire(import.meta.url)
let Resvg = null
try {
  Resvg = require('@resvg/resvg-js').Resvg
} catch {
  Resvg = null
}

if (Resvg) {
  const raster = (svg, file, width) => {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng()
    writeFileSync(file, png)
  }
  raster(onFloor(frame), path.join(outdir, 'frame.png'), 760)
  raster(onFloor(ring), path.join(outdir, 'ring.png'), 220)
  raster(onFloor(motif), path.join(outdir, 'motif.png'), 240)
  const sheet =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="780" viewBox="0 0 1060 780">` +
    `<rect width="1060" height="780" fill="${FLOOR}"/>` +
    placed(frame, 20, 30, 720, 720) +
    placed(ring, 810, 120, 200, 200) +
    placed(motif, 800, 560, 220, 145) +
    `</svg>`
  raster(sheet, path.join(outdir, 'sheet.png'), 1060)
} else {
  // Fallback: ImageMagick with a working SVG delegate (rsvg).
  const sized = (svg, w, h) => svg.replace('<svg ', `<svg width="${w}" height="${h}" `)
  writeFileSync(path.join(outdir, 'frame.svg'), sized(frame, 720, 720))
  const run = (cmd) => execSync(cmd, { stdio: 'inherit' })
  run(`convert -size 760x760 xc:${FLOOR} -background none ${outdir}/frame.svg -gravity center -composite ${outdir}/frame.png`)
}
console.log('wrote', path.join(outdir, 'sheet.png'))
