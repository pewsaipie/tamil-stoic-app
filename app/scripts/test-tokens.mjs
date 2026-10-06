#!/usr/bin/env node
/**
 * Colour-contrast gate for the design tokens.
 *
 * Recomputes WCAG 2.2 relative-luminance ratios straight from
 * `src/styles/tokens.css`, so a palette edit cannot quietly fall below
 * threshold. Dependency-free — it runs in the same CI job as the content checks.
 *
 * The pairs below are the ones the interface actually renders. Anything that
 * carries body text must reach 4.5:1; UI boundaries and focus rings must reach
 * 3:1.
 */
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const TOKENS = resolve(here, '..', 'src', 'styles', 'tokens.css')

/** Minimum ratio per usage: 4.5 for text, 3 for non-text UI boundaries. */
const PAIRS = [
  ['ink-primary', 'bg-base', 4.5, 'body text on the page'],
  ['ink-secondary', 'bg-base', 4.5, 'muted text on the page'],
  ['ink-secondary', 'bg-surface', 4.5, 'muted text on a raised surface'],
  ['accent-text', 'bg-base', 4.5, 'accent text / links on the page'],
  ['accent-text', 'bg-surface', 4.5, 'accent text / links on a raised surface'],
  ['on-accent', 'accent', 4.5, 'label on a filled accent button'],
  ['danger', 'bg-base', 4.5, 'destructive text'],
  ['success', 'bg-base', 4.5, 'confirmation text'],
  ['focus-ring', 'bg-base', 3, 'focus indicator against the page'],
]

function channel(value) {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const clean = hex.replace('#', '')
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** Pull the tokens declared inside one theme block. */
function readTheme(css, marker) {
  const start = css.indexOf(marker)
  if (start === -1) throw new Error(`tokens.css: block ${marker} not found`)
  const end = css.indexOf('\n}', start)
  const block = css.slice(start, end === -1 ? undefined : end)

  const tokens = {}
  for (const match of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[match[1]] = match[2]
  }
  return tokens
}

async function main() {
  const css = await readFile(TOKENS, 'utf8')
  const themes = {
    'Kurinji Day': readTheme(css, '[data-theme="day"]'),
    'Kurinji Night': readTheme(css, '[data-theme="night"]'),
  }

  const failures = []

  for (const [themeName, tokens] of Object.entries(themes)) {
    console.log(`\n${themeName}`)
    for (const [fg, bg, minimum, usage] of PAIRS) {
      const foreground = tokens[fg]
      const background = tokens[bg]
      if (!foreground || !background) {
        failures.push(`${themeName}: missing token for ${fg} on ${bg}`)
        continue
      }
      const value = ratio(foreground, background)
      const pass = value >= minimum
      if (!pass) failures.push(`${themeName}: ${fg} on ${bg} is ${value.toFixed(2)}:1, needs ${minimum}:1 (${usage})`)
      console.log(
        `  ${pass ? '✓' : '✗'} ${`${fg} on ${bg}`.padEnd(28)} ${value.toFixed(2)}:1  (min ${minimum}) — ${usage}`,
      )
    }
  }

  if (failures.length > 0) {
    console.error('\n✗ contrast gate failed:')
    for (const failure of failures) console.error(`   ${failure}`)
    process.exit(1)
  }

  console.log('\n✓ every token pair meets its WCAG 2.2 AA threshold')
}

await main()
