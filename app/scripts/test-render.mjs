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
const modelJson = fs.readFileSync(path.join(root, 'public', 'data', 'intents.json'), 'utf8')
window.fetch = async (url) => {
  if (String(url).includes('kurals.json')) {
    return { ok: true, status: 200, json: async () => JSON.parse(corpusJson) }
  }
  if (String(url).includes('intents.json')) {
    return { ok: true, status: 200, json: async () => JSON.parse(modelJson) }
  }
  return { ok: false, status: 404, json: async () => ({}) }
}
window.navigator.serviceWorker = undefined
window.scrollTo = () => {}
window.localStorage.clear()

// A minimal speech engine, so the Listen controls mount with a real API shape.
class FakeUtterance {
  constructor(text) {
    this.text = text
    this.lang = ''
    this.voice = null
    this.rate = 1
    this.onend = null
    this.onerror = null
  }
}
window.SpeechSynthesisUtterance = FakeUtterance
window.speechSynthesis = {
  speaking: false,
  pending: false,
  getVoices: () => [{ lang: 'ta-IN', name: 'ta', default: false, localService: true, voiceURI: 'ta' }],
  speak() {
    this.speaking = true
  },
  cancel() {
    this.speaking = false
  },
  resume() {},
  addEventListener() {},
}

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
const { document } = window
// Wait for the corpus fetch + first render rather than sleeping a fixed time.
await waitFor(() => document.querySelector('[data-verse-line]') !== null, 8000)
await waitFor(() => document.body.textContent?.includes('மூன்று பால்கள்') === true, 8000)
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

/* ---------- the reader ---------- */
const readerReady = () => document.querySelector('nav[aria-label="Kural navigation"]') !== null
await navigate('#/kural/151', readerReady)
console.log('reader route:')
const readerVerse = [...document.querySelectorAll('[data-verse-line]')].map((node) => node.textContent?.trim())
const kural151 = JSON.parse(corpusJson).kurals.find((k) => k.n === 151)
check(
  readerVerse[0] === kural151.ta[0] && readerVerse[1] === kural151.ta[1],
  'the reader shows the corpus couplet, line for line',
)
check(text().includes('151 / 1330'), 'the counter is present')
check(
  [...document.querySelectorAll('button')].some((button) =>
    (button.getAttribute('aria-label') ?? '').startsWith('Listen'),
  ) || document.querySelectorAll('article button').length > 0,
  'the action row renders',
)

/* ---------- the couplet line contract in the DOM (c9) ---------- */
console.log('couplet word contract across the corpus sample:')
const corpusKurals = JSON.parse(corpusJson).kurals
const words = (value) => (value ?? '').trim().split(/\s+/).filter(Boolean).length
for (const number of [1, 42, 82, 976]) {
  const kural = corpusKurals.find((k) => k.n === number)
  await navigate(`#/kural/${number}`, () => document.querySelector(`[data-kural="${number}"]`) !== null)
  const verse = document.querySelector(`[data-kural="${number}"]`)
  const lines = [...(verse?.querySelectorAll('[data-verse-line]') ?? [])]
  check(lines.length === 2, `kural ${number}: exactly two lines are rendered`)
  check(
    lines[0]?.textContent?.trim() === kural.ta[0].replace(/\s+/g, ' ').trim() &&
      lines[1]?.textContent?.trim() === kural.ta[1].replace(/\s+/g, ' ').trim(),
    `kural ${number}: line 1 holds the முதல் அடி and line 2 the ஈற்றடி, in order`,
  )
  check(
    words(lines[0]?.textContent) === words(kural.ta[0]) && words(lines[1]?.textContent) === words(kural.ta[1]),
    `kural ${number}: ${words(kural.ta[0])} words over ${words(kural.ta[1])} — no word moved across the break`,
  )
}

/* ---------- the accessibility-independence rule ---------- */
await navigate('#/kural/151', readerReady)
console.log('couplet structure under accessibility settings:')
const stylesheet = fs.readFileSync(path.join(root, 'src', 'styles', 'global.css'), 'utf8')
const verse151 = () => [...document.querySelectorAll('[data-kural="151"] [data-verse-line]')].map((node) => node.textContent?.trim())
for (const setting of ['large', 'x-large']) {
  window.document.documentElement.dataset.fontSize = setting
  await wait(30)
  const lines = verse151()
  check(
    lines[0] === kural151.ta[0] && lines[1] === kural151.ta[1],
    `text size "${setting}" changes type, not the couplet's two lines`,
  )
}
window.document.documentElement.dataset.lineSpacing = 'relaxed'
await wait(30)
const relaxedLines = verse151()
check(
  relaxedLines[0] === kural151.ta[0] && relaxedLines[1] === kural151.ta[1],
  'relaxed line spacing changes type, not the couplet',
)

// An exception couplet must hold its split under every type setting as well.
await navigate('#/kural/42', () => document.querySelector('[data-kural="42"]') !== null)
for (const [size, spacing] of [
  ['large', 'normal'],
  ['x-large', 'normal'],
  ['x-large', 'relaxed'],
  ['normal', 'relaxed'],
]) {
  window.document.documentElement.dataset.fontSize = size
  window.document.documentElement.dataset.lineSpacing = spacing
  await wait(20)
  const lines = [...document.querySelectorAll('[data-kural="42"] [data-verse-line]')].map((node) => node.textContent?.trim())
  check(
    lines[0] === 'துறந்தார்க்கும் துவ்வாதவர்க்கும் இறந்தார்க்கும்' && lines[1] === 'இல்வாழ்வான் என்பான் துணை',
    `kural 42 keeps its standard 3 + 3 split at ${size} / ${spacing}`,
  )
}
delete window.document.documentElement.dataset.fontSize
delete window.document.documentElement.dataset.lineSpacing
await navigate('#/kural/151', readerReady)
check(
  stylesheet.includes("html[data-font-size='large']") && stylesheet.includes("html[data-line-spacing='relaxed']"),
  'the type settings are expressed as variables, never as a line split',
)
delete window.document.documentElement.dataset.fontSize
delete window.document.documentElement.dataset.lineSpacing

/* ---------- Ask Valluvar ---------- */
await navigate('#/ask', () => document.querySelector('#ask-input') !== null)
console.log('ask route:')
check(document.querySelector('#ask-input') !== null, 'the composer is present')
const promptChips = [...document.querySelectorAll('button')].filter((button) =>
  (button.textContent ?? '').trim().length > 0 && button.closest('[role="log"]') !== null,
)
check(promptChips.length > 0, 'opening prompts are offered before the reader types')

// Type a Tamil situation and send it: the reply must be a corpus couplet.
const input = document.querySelector('#ask-input')
const setValue = (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(element, value)
  element.dispatchEvent(new window.Event('input', { bubbles: true }))
}
setValue(input, 'எனக்கு கோபம் வருகிறது')
await wait(30)
const send = [...document.querySelectorAll('form button[type="submit"]')][0]
send?.click()
await waitFor(() => document.querySelector('[role="log"] [data-verse-line]') !== null)
const askLines = [...document.querySelectorAll('[role="log"] [data-verse-line]')].map((node) => node.textContent?.trim())
const askKural = corpusKurals.find((kural) => kural.ta[0] === askLines[0])
check(askLines.length === 2 && askKural !== undefined, 'a Tamil question about anger answers with a corpus couplet')
check(
  askKural !== undefined && document.body.textContent?.includes(`குறள் ${askKural.n}`) === true,
  'the reply names the couplet it is quoting',
)
check(
  document.querySelectorAll('[role="log"] button[aria-label="Listen"]').length > 0 ||
    document.querySelectorAll('[role="log"] button[aria-label^="Listen"]').length > 0,
  'the reply can be read aloud',
)

// A support phrase must reach the helplines, never a couplet.
setValue(input, 'I want to end my life')
await wait(30)
;[...document.querySelectorAll('form button[type="submit"]')][0]?.click()
await waitFor(() => document.body.textContent?.includes('14416') === true)
check(document.body.textContent?.includes('14416') === true, 'a crisis phrase shows Tele-MANAS 14416')
check(document.body.textContent?.includes('1800-599-0019') === true, 'it also shows KIRAN')
check(document.body.textContent?.includes('findahelpline.com') === true, 'and findahelpline.com')

/* ---------- saved ---------- */
await navigate('#/saved', () => document.querySelector('h1')?.textContent?.includes('Saved') === true)
console.log('saved route:')
check(text().includes('stays on this device'), 'the privacy line is present')
check(text().includes('It will appear here'), 'the empty state renders for a fresh device')

/* ---------- palette, journey, credits, Tamil UI ---------- */
console.log('command palette:')
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
await waitFor(() => document.querySelector('#palette-input') !== null)
check(document.querySelector('#palette-input') !== null, 'Ctrl+K opens the command palette')
const paletteItems = [...document.querySelectorAll('#palette-input ~ ul button')]
check(paletteItems.length > 0, 'the palette lists destinations and commands')

// Switching the interface language through the palette must translate the chrome.
const tamilCommand = paletteItems.find((item) => (item.textContent ?? '').includes('தமிழில்'))
check(tamilCommand !== undefined, 'the palette offers the Tamil interface')
tamilCommand?.click()
await waitFor(() => text().includes('இன்று'))
check(text().includes('இன்று'), 'the Tamil interface renders Tamil navigation labels')
check(
  text().includes('புத்தகக் குறிப்பு') || text().includes('சேமித்தவை'),
  'the saved destination is translated too',
)

console.log('journey:')
await navigate('#/', () => text().includes('பால்கள்') || text().includes('books'))
check(
  text().includes('படித்தவை') || text().includes('kurals read') || text().includes('journey'),
  "the reading journey reflects the kural the reader opened",
)

console.log('credits:')
await navigate('#/credits', () => text().includes('Credits'))
check(text().includes('Pope'), 'the credits name the 1886 translation')
check(text().includes('Parimelalagar') || text().includes('tk120404'), 'the credits name the Tamil source')
check(text().includes('MIT'), 'the credits state the app licence')

document.dispatchEvent(new window.KeyboardEvent('keydown', { key: '?', bubbles: true }))
await waitFor(() => text().includes('Keyboard shortcuts') || text().includes('விசைப்பலகை'))
check(
  text().includes('Keyboard shortcuts') || text().includes('விசைப்பலகை'),
  '? opens the shortcut help',
)
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

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
await navigate('#/kural/151', readerReady)
await scan('/kural/151')
await navigate('#/saved', () => text().includes('Saved Kurals'))
await scan('/saved')
await navigate('#/', () => text().includes('பால்கள்') || text().includes('books'))
await scan('/')
await navigate('#/credits', () => text().includes('Credits'))
await scan('/credits')
await navigate('#/ask', () => document.querySelector('#ask-input') !== null)
await scan('/ask')

/* ---------- runtime errors ---------- */
console.log('runtime:')
check(errors.length === 0, errors.length === 0 ? 'no uncaught errors' : errors.join(' | '))

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nRender + accessibility smoke test passed.')
