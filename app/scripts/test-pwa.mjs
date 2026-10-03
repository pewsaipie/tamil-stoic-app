/**
 * PWA contract — the offline/install promises the reader is given, checked
 * against the *built* artefacts rather than a description of them.
 *
 *   npm run build && npm run test:pwa
 *
 * Asserts the manifest the platform will read (icons, share_target, shortcuts),
 * the generated service worker's precache (the whole kural corpus, the fonts and
 * the app shell), and the reader-controlled update flow in the source.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const dist = path.join(root, 'dist')

let failed = 0
function check(condition, message) {
  if (condition) console.log('  ✓', message)
  else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

if (!fs.existsSync(path.join(dist, 'manifest.webmanifest'))) {
  console.error('✗ dist/ is missing — run `npm run build` first.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'))

console.log('manifest:')
check(manifest.lang === 'ta', 'the manifest declares the Tamil language')
check(manifest.display === 'standalone', 'the app installs as a standalone app')
check(manifest.start_url !== undefined && manifest.scope !== undefined, 'start_url and scope are set')
check(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'icons include 192, 512 and maskable')
check(
  manifest.icons.some((icon) => String(icon.purpose ?? '').includes('maskable')),
  'a maskable icon is present for Android',
)
check(
  manifest.share_target?.method === 'GET' && manifest.share_target?.params?.text === 'text',
  'shared text can be handed to the reader (share_target)',
)
const shortcuts = manifest.shortcuts ?? []
check(shortcuts.length >= 3, 'home-screen shortcuts are published')
check(
  shortcuts.some((shortcut) => String(shortcut.url).includes('#/saved')),
  'a shortcut opens the saved collection',
)
check(
  shortcuts.some((shortcut) => String(shortcut.url).includes('#/chapters')),
  'a shortcut opens the browse screen',
)

console.log('offline cache:')
const files = fs.readdirSync(path.join(dist, 'assets'))
const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8')
check(/kurals\.json/.test(sw), 'the built worker precaches the kural corpus')
check(/intents\.json/.test(sw), 'the built worker precaches the Ask Valluvar model (offline answers)')
check(/\.woff2/.test(sw), 'the built worker precaches the fonts (offline typography)')
check(/index\.html/.test(sw), 'the built worker precaches the app shell')
check(files.some((file) => file.endsWith('.css')), 'the built stylesheet is part of the bundle')
check(
  fs.readdirSync(path.join(dist, 'data')).includes('kurals.json'),
  'the corpus ships as data/kurals.json',
)
check(
  fs.existsSync(path.join(dist, 'data', 'intents.json')),
  'the intent model ships as data/intents.json',
)

console.log('update flow:')
// Workbox ships a SKIP_WAITING message handler; the waiting worker may only
// activate when the *page* asks, never on its own.
const skipWaitingCalls = (sw.match(/self\.skipWaiting\(\)/g) ?? []).length
const gated = /SKIP_WAITING"?\s*===\s*\w+\.data\.type\s*&&\s*self\.skipWaiting\(\)/.test(sw)
check(skipWaitingCalls <= 1 && gated, 'the waiting worker activates only when the reader asks')
check(!/clientsClaim/.test(sw) || !/self\.clientsClaim\(\)/.test(sw), 'clients are not claimed silently')
const registration = fs.readFileSync(path.join(root, 'src', 'lib', 'pwa.ts'), 'utf8')
check(registration.includes('onNeedRefresh'), 'a waiting update is surfaced to the reader')
const banner = fs.readFileSync(
  path.join(root, 'src', 'components', 'ui', 'UpdateBanner.tsx'),
  'utf8',
)
check(banner.includes('Update now') && banner.includes('Later'), 'the reader chooses when to update')
check(banner.includes('Ready to read offline'), 'the reader is told when the library is offline-ready')

console.log('install surface:')
const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
check(/manifest\.webmanifest/.test(index), 'the shell links the manifest')
check(/theme-color/.test(index), 'the shell sets the browser/PWA chrome colour')

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nPWA contract holds.')
