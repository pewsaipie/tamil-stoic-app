/** Regression for the dependency-free desktop reader (not the Vite/PWA build). */
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const html = read('index.html')
const css = read('css/styles.css')
const sw = read('sw.js')
const dom = new JSDOM(html, { url: 'http://localhost:8000/', runScripts: 'dangerously' })
const { window } = dom
window.matchMedia = (query) => ({ matches: query === '(pointer: fine)' })
window.performance.now = () => 1000
// The real static reader starts companion.js after the document is parsed.
window.document.body.appendChild(Object.assign(window.document.createElement('script'), {
  textContent: read('js/companion.js'),
}))
const stage = window.document.querySelector('.site-header.view-home > .ornament-stage')
assert.ok(stage, 'desktop Home mounts the canonical dressing')
assert.equal(stage.getAttribute('aria-hidden'), 'true')
assert.equal(stage.querySelectorAll('.ornament-layer').length, 3)
assert.match(css, /\.site-header > \.ornament-stage\s*\{[^}]*pointer-events: none;/)
for (const name of ['bamboo-left', 'honeycomb', 'bloom-corner']) {
  const file = `assets/img/ornaments/kurinji-vaikarai/${name}.webp`
  assert.ok(statSync(new URL('../' + file, import.meta.url)).size > 0)
  assert.ok(css.includes(`../${file}`), `${name} is painted on desktop`)
  assert.ok(sw.includes(`./${file}`), `${name} is available offline`)
}
assert.match(css, /\.site-header > \.ornament-stage\s*\{[^}]*position: absolute;[^}]*z-index: 0;/)
assert.match(css, /body\[data-color-scheme="dark"\] \.ornament-layer/)
assert.match(css, /body\[data-reduce-motion="true"\] \.ornament-layer/)
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
assert.match(css, /@media \(forced-colors: active\), print/)
assert.match(css, /pointer-events: none/)
assert.ok(!html.includes('js/ornament.js'), 'no extra unprecached script is needed')
// jsdom doesn't lay out; stub a realistic hero box to exercise the listener.
stage.getBoundingClientRect = () => ({ left: 100, top: 0, width: 800, height: 400 })
stage.parentElement.dispatchEvent(new window.MouseEvent('pointermove', { clientX: 700, clientY: 300, bubbles: true }))
assert.equal(stage.style.getPropertyValue('--ornament-par-x'), '0.250')
window.document.body.dataset.reduceMotion = 'true'
stage.parentElement.dispatchEvent(new window.MouseEvent('pointermove', { clientX: 200, clientY: 100, bubbles: true }))
assert.equal(stage.style.getPropertyValue('--ornament-par-x'), '0.250', 'in-app motion toggle stops parallax')
stage.parentElement.dispatchEvent(new window.MouseEvent('pointerleave'))
assert.equal(stage.style.getPropertyValue('--ornament-par-x'), '', 'pointer exit settles the art')
console.log('✓ Desktop reader has Kurinji dressing, safe layers, offline art and gated pointer response')
dom.window.close()
