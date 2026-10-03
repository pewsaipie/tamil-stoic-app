/**
 * Render + accessibility smoke test for the React reader.
 *
 *   npm run sync          # produces public/data/kurals.json
 *   npm run test:render
 *
 * The real entry point (`src/main.tsx`) is bundled with esbuild — the same
 * bundler Vite uses — and mounted in jsdom with a stubbed corpus fetch, so this
 * exercises the actual component tree: Today's card, the chapters browser, the
 * search field, the chapter map and the two-line couplet contract.
 *
 * axe-core then scans the mounted page and every route, so a regression in
 * headings, labels, listbox wiring or contrast-adjacent markup fails CI.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'
import axe from 'axe-core'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const corpusPath = path.join(root, 'public', 'data', 'kurals.json')

if (!fs.existsSync(corpusPath)) {
  console.error('✗ public/data/kurals.json is missing — run `npm run sync` first.')
  process.exit(1)
}
const corpusJson = fs.readFileSync(corpusPath, 'utf8')

let failed = 0
function check(condition, message) {
  if (condition) console.log('  ✓', message)
  else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

/* ---------- bundle the app for a DOM runtime ---------- */

const bundle = await build({
  entryPoints: [path.join(root, 'src', 'main.tsx')],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  loader: {
    '.woff2': 'empty',
    '.jpg': 'empty',
    '.png': 'empty',
    '.svg': 'text',
    // The app's CSS is not needed to exercise the component tree (and Tailwind
    // is a Vite plugin, not an esbuild one) — axe's contrast rule is disabled
    // because jsdom does not lay out or paint.
    '.css': 'empty',
  },
  plugins: [
    {
      name: 'stub-pwa-register',
      setup(build) {
        build.onResolve({ filter: /^virtual:pwa-register$/ }, () => ({
          path: 'pwa-register',
          namespace: 'stub',
        }))
        build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: 'export function registerSW() { return function updateSW() {} }',
          loader: 'js',
        }))
      },
    },
  ],
  define: {
    'import.meta.env.BASE_URL': '"/"',
    'import.meta.env.MODE': '"test"',
    'import.meta.env.DEV': 'true',
    'import.meta.env.PROD': 'false',
  },
  logLevel: 'error',
})
const code = bundle.outputFiles[0].text

/* ---------- a DOM with the browser APIs React + the app expect ---------- */

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const dom = new JSDOM(html, {
  url: 'http://localhost:5173/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
})
const { window } = dom

window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
})
window.IntersectionObserver = class {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
window.fetch = async (url) => {
  if (String(url).includes('kurals.json')) {
    return { ok: true, status: 200, json: async () => JSON.parse(corpusJson) }
  }
  return { ok: false, status: 404, json: async () => ({}) }
}
window.navigator.serviceWorker = undefined
window.scrollTo = () => {}

const errors = []
window.addEventListener('error', (event) => errors.push(String(event.message)))
window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)))

const script = window.document.createElement('script')
script.textContent = code
window.document.body.appendChild(script)
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }))

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

/** Poll until the DOM satisfies a predicate — route transitions and the corpus
 *  fetch are asynchronous, so fixed sleeps would be flaky. */
async function waitFor(predicate, timeout = 4000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (predicate()) return true
    await wait(50)
  }
  return false
}

const navigate = async (hash, predicate) => {
  window.location.hash = hash
  await waitFor(predicate)
}
await wait(250)

const { document } = window
const text = () => document.body.textContent ?? ''

console.log('today route:')
check(document.querySelector('#root') !== null, 'the app mounts into #root')
check(text().includes('திருக்குறள்'), 'the Tamil title renders')
const todayVerse = document.querySelectorAll('[data-verse-line]')
check(todayVerse.length >= 2, "today's couplet renders two Tamil lines")
check(text().includes('மூன்று பால்கள்'), 'the three books section renders')
check(text().includes('சூழ்நிலை'), 'the situation doors render')

/* ---------- navigate to the chapters route ---------- */
await navigate('#/chapters', () => document.querySelector('input[type="search"]') !== null)

console.log('chapters route:')
check(
  document.querySelector('h1')?.textContent?.includes('அத்தியாயங்கள்') === true,
  'the chapters heading renders',
)
const searchInput = document.querySelector('input[type="search"]')
check(searchInput !== null, 'the search field renders')
const labelled =
  searchInput !== null &&
  (searchInput.getAttribute('aria-label') !== null ||
    (searchInput.id !== '' &&
      document.querySelector(`label[for="${searchInput.id}"]`) !== null))
check(labelled, 'the search field has an accessible name')
const cardVerseLines = document.querySelectorAll('article[aria-label^="Kural "] [data-verse-line]')
check(cardVerseLines.length >= 2, 'result cards render two-line couplets')
const versePairs = [...document.querySelectorAll('article[aria-label^="Kural "]')].map((card) => ({
  one: card.querySelector('[data-verse-line="1"]')?.textContent?.trim() ?? '',
  two: card.querySelector('[data-verse-line="2"]')?.textContent?.trim() ?? '',
}))
check(
  versePairs.length > 0 && versePairs.every((pair) => pair.one !== '' && pair.two !== ''),
  'every rendered couplet has both lines non-empty',
)

// The word-slicer regression: kural 10 must not be cut at its fourth space.
await navigate(
  '#/chapters?q=151',
  () => document.querySelectorAll('article[aria-label^="Kural "]').length === 1,
)
const numericResults = [...document.querySelectorAll('article[aria-label^="Kural "]')]
check(
  numericResults.length === 1 && numericResults[0]?.getAttribute('aria-label') === 'Kural 151',
  'a numeric search renders exactly that kural',
)

await navigate('#/chapters?chapter=16', () => text().includes('பொறையுடைமை'))
check(text().includes('பொறையுடைமை'), 'selecting chapter 16 shows its intro card')

await navigate('#/chapters?theme=anger', () => text().includes('சினம்'))
check(text().includes('சினம்'), 'a theme filter names the theme it applied')

/* ---------- axe ---------- */
console.log('accessibility:')
async function scan(label) {
  const results = await window.eval(axe.source + ';axe.run(document, { rules: { "color-contrast": { enabled: false } } })')
  const violations = results.violations.filter((violation) => violation.impact !== 'minor')
  check(
    violations.length === 0,
    violations.length === 0
      ? `${label}: no axe violations`
      : `${label}: ${violations.map((v) => v.id).join(', ')}`,
  )
}

await scan('/chapters')
await navigate('#/', () => text().includes('மூன்று பால்கள்'))
await scan('/')

/* ---------- runtime errors ---------- */
console.log('runtime:')
check(errors.length === 0, errors.length === 0 ? 'no uncaught errors' : errors.join(' | '))

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nRender + accessibility smoke test passed.')
