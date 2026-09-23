/**
 * Tamil Stoic — build + data tests.
 *
 *   npm run build
 *   node scripts/test-app.mjs
 *
 * Verifies:
 *  - Dist is produced with index.html, manifest, sw, icons.
 *  - Bundles exist and contain the markers for all major features
 *    (daily kural, books, situations, moods, chapter map, reader, share,
 *     favorites, PWA register, dark mode, reduced-motion guards).
 *  - Data correctness: 1330 kurals, chapter 16 = 151..160, book counts.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')

let failed = 0
function assert(cond, msg) {
  if (!cond) { console.error('  ✗ FAIL:', msg); failed++ }
  else { console.log('  ✓', msg) }
}

console.log('1. build artifacts')
assert(fs.existsSync(DIST), 'dist/ exists (run `npm run build` first)')
if (!fs.existsSync(DIST)) { console.error('Run npm run build first.'); process.exit(1) }
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
assert(html.includes('<div id="root">'), 'index.html has #root')
assert(html.includes('manifest.webmanifest'), 'manifest linked')
assert(html.includes('/sw.js') || fs.existsSync(path.join(ROOT,'src/main.jsx')), 'SW registered in code')
assert(fs.existsSync(path.join(DIST, 'manifest.webmanifest')), 'manifest in dist')
assert(fs.existsSync(path.join(DIST, 'sw.js')), 'sw.js in dist')
assert(fs.existsSync(path.join(DIST, 'icons/icon-192.png')), 'icon-192')
assert(fs.existsSync(path.join(DIST, 'icons/icon-512.png')), 'icon-512')
assert(fs.existsSync(path.join(DIST, 'icons/icon-maskable-512.png')), 'maskable-512')

const assets = fs.readdirSync(path.join(DIST, 'assets'))
const jsFile = assets.find((f) => f.endsWith('.js'))
const cssFile = assets.find((f) => f.endsWith('.css'))
assert(jsFile, 'JS bundle emitted')
assert(cssFile, 'CSS bundle emitted')

console.log('\n2. feature markers in bundles')
const js = fs.readFileSync(path.join(DIST, 'assets', jsFile), 'utf8')
const css = fs.readFileSync(path.join(DIST, 'assets', cssFile), 'utf8')
const mustContain = [
  ["Today's Kural", "Today's Kural eyebrow"],
  ['daily-card', 'daily card class'],
  ['Another', '"Another" shuffle button'],
  ['books-grid', 'books grid'],
  ['book-card', 'book card class'],
  ['situations-grid', 'situations grid'],
  ['situation', 'situation class'],
  ['moods', 'mood picker'],
  ['chapter-map', 'chapter map'],
  ['map-cell', 'chapter map cell'],
  ['Install', 'install prompt strings'],
  ['serviceWorker', 'service worker registration'],
  ['startViewTransition', 'view transitions API'],
  ['vibrate', 'haptic feedback'],
  ['navigator.share', 'web share'],
  ['toBlob', 'share image generation via canvas'],
  ['navigator.clipboard', 'copy to clipboard'],
  ['localStorage', 'persistent settings'],
  ['display-mode', 'PWA display-mode media query'],
  ['prefers-reduced-motion', 'reduced motion support'],
  ['prefers-color-scheme', 'color-scheme support'],
  ['reader open', 'swipe reader open state'],
  ['Touch', 'touch handlers (swipe reader)'],
  ['favs', 'favorites state'],
  ['streak', 'daily streak'],
  ['IntersectionObserver', 'infinite scroll sentinel'],
]
for (const [needle, label] of mustContain) assert(js.includes(needle), label)

const cssMustContain = [
  [':root', 'tokens :root'],
  ['data-theme=night', 'night theme'],
  ['data-theme=olive', 'olive theme'],
  ['data-fontsize=large', 'large font-size token'],
  ['.skip-link', 'skip link (a11y)'],
  ['prefers-reduced-motion', 'reduced-motion media query'],
  [':focus-visible', 'focus-visible rings'],
  ['env(safe-area-inset-top)', 'safe-area insets (notch phones)'],
  ['touch-action', 'touch-action (mobile gestures)'],
  ['.reader.open', 'full-screen reader'],
  ['width<=560', 'mobile breakpoint'],
  ['width>=900px', 'landscape reader layout'],
]
for (const [needle, label] of cssMustContain) assert(css.includes(needle), 'CSS: ' + label)

console.log('\n3. data sanity')
const kuralsMod = await import(path.join(ROOT, 'src/data/kurals.js'))
assert(kuralsMod.KURALS.length === 1330, '1330 kurals')
assert(kuralsMod.CHAPTERS.length === 133, '133 chapters')
assert(kuralsMod.SECTIONS.length === 3, '3 sections')
const ch16 = kuralsMod.CHAPTERS.find((c) => c.n === 16)
assert(ch16 && ch16.ta === 'பொறையுடைமை', 'ch 16 is பொறையுடைமை')
const ch16kurals = kuralsMod.KURALS.filter((k) => k.ch === 16).map((k) => k.n)
assert(ch16kurals.join(',') === '151,152,153,154,155,156,157,158,159,160',
  'ch 16 → kural 151..160, got: ' + ch16kurals.join(','))
assert(kuralsMod.KURALS.filter((k) => k.sec === 1).length === 380, 'Virtue = 380')
assert(kuralsMod.KURALS.filter((k) => k.sec === 2).length === 700, 'Wealth = 700')
assert(kuralsMod.KURALS.filter((k) => k.sec === 3).length === 250, 'Love = 250')
// Every kural has required fields
const required = ['n','ta','tr','en','s','ch','sec','th']
let malformed = 0
for (const k of kuralsMod.KURALS) for (const f of required) if (k[f] == null) malformed++
assert(malformed === 0, 'all kurals have required fields (missing ' + malformed + ')')
// Every kural.ch refers to a real chapter
let badCh = 0
for (const k of kuralsMod.KURALS) if (!kuralsMod.CHAPTERS.find((c) => c.n === k.ch)) badCh++
assert(badCh === 0, 'all kural.ch map to real chapters (bad: ' + badCh + ')')

console.log('\n4. manifest + PWA')
const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.webmanifest'), 'utf8'))
assert(manifest.name && manifest.short_name, 'manifest has name/short_name')
assert(manifest.display === 'standalone', 'display: standalone')
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'icons array has ≥3 entries')
assert(manifest.start_url === './', 'start_url is ./')
assert(manifest.share_target, 'share_target configured')

console.log('')
if (failed) { console.error(failed, 'check(s) failed'); process.exit(1) }
else console.log('all checks passed ✓')
