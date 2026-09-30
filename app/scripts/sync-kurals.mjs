#!/usr/bin/env node
/**
 * Derive the app's JSON corpus from the repository's canonical dataset.
 *
 * `data/kurals.js` (1,330 kurals + chapters + sections + themes) is the
 * committed source of truth, gated by `scripts/test-content.mjs` and the
 * editorial correction ledger. This script only *reads* it — through a `window`
 * shim, since the file is written for the browser — validates the shape, and
 * emits the JSON the React app fetches at runtime.
 *
 * The output is generated (git-ignored), so the corpus is never duplicated in
 * version control and can never drift from the validated source.
 *
 *   node scripts/sync-kurals.mjs           # write public/data/kurals.json
 *   node scripts/sync-kurals.mjs --check   # verify on-disk output is current
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const repoRoot = resolve(appRoot, '..')

const SOURCE = join(repoRoot, 'data', 'kurals.js')
const TARGET = join(appRoot, 'public', 'data', 'kurals.json')
const check = process.argv.includes('--check')

const EXPECTED_KURALS = 1330
const EXPECTED_CHAPTERS = 133
const EXPECTED_SECTIONS = 3

/** Evaluate the browser-targeted dataset file with a minimal `window` shim. */
async function loadDataset() {
  const code = await readFile(SOURCE, 'utf8')
  const context = { window: {} }
  vm.createContext(context)
  new vm.Script(code, { filename: SOURCE }).runInContext(context)

  const dataset = context.window
  assert(Array.isArray(dataset.KURALS), 'window.KURALS missing from data/kurals.js')
  assert(Array.isArray(dataset.CHAPTERS), 'window.CHAPTERS missing from data/kurals.js')
  assert(Array.isArray(dataset.SECTIONS), 'window.SECTIONS missing from data/kurals.js')
  assert(Array.isArray(dataset.THEMES), 'window.THEMES missing from data/kurals.js')
  return dataset
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`)
    process.exit(1)
  }
}

/** Fail loudly rather than shipping a corpus the reader cannot trust. */
function validate(kurals, chapters, sections, themes) {
  assert(
    kurals.length === EXPECTED_KURALS,
    `expected ${EXPECTED_KURALS} kurals, found ${kurals.length}`,
  )
  assert(
    chapters.length === EXPECTED_CHAPTERS,
    `expected ${EXPECTED_CHAPTERS} chapters, found ${chapters.length}`,
  )
  assert(
    sections.length === EXPECTED_SECTIONS,
    `expected ${EXPECTED_SECTIONS} sections, found ${sections.length}`,
  )

  kurals.forEach((kural, index) => {
    const position = index + 1
    assert(kural.n === position, `kural at index ${index} numbered ${kural.n}, expected ${position}`)
    assert(
      Array.isArray(kural.ta) && kural.ta.length === 2,
      `kural ${kural.n} must carry two Tamil lines`,
    )
    assert(typeof kural.s === 'string' && kural.s.length > 0, `kural ${kural.n} missing meaning`)
    assert(
      kural.ch >= 1 && kural.ch <= EXPECTED_CHAPTERS,
      `kural ${kural.n} references chapter ${kural.ch}`,
    )
    assert(kural.sec >= 1 && kural.sec <= EXPECTED_SECTIONS, `kural ${kural.n} bad section`)
  })

  const themeIds = new Set(themes.map((theme) => theme.id))
  for (const kural of kurals) {
    const theme = kural.th
    assert(typeof theme === 'string' && themeIds.has(theme), `kural ${kural.n} unknown theme ${theme}`)
  }
}

async function main() {
  const { KURALS, CHAPTERS, SECTIONS, THEMES } = await loadDataset()
  validate(KURALS, CHAPTERS, SECTIONS, THEMES)

  const payload = {
    generatedFrom: 'data/kurals.js',
    counts: {
      kurals: KURALS.length,
      chapters: CHAPTERS.length,
      sections: SECTIONS.length,
      themes: THEMES.length,
    },
    kurals: KURALS,
    chapters: CHAPTERS,
    sections: SECTIONS,
    themes: THEMES,
  }

  const json = `${JSON.stringify(payload)}\n`
  const fingerprint = createHash('sha256').update(json).digest('hex').slice(0, 12)

  if (check) {
    if (!existsSync(TARGET)) {
      console.error('✗ public/data/kurals.json is missing — run `npm run sync-data`')
      process.exit(1)
    }
    const current = await readFile(TARGET, 'utf8')
    if (current !== json) {
      console.error('✗ public/data/kurals.json is stale — run `npm run sync-data`')
      process.exit(1)
    }
    console.log(`✓ kurals corpus current (${KURALS.length} kurals, sha ${fingerprint})`)
    return
  }

  await mkdir(dirname(TARGET), { recursive: true })
  await writeFile(TARGET, json, 'utf8')
  console.log(
    `✓ wrote public/data/kurals.json — ${KURALS.length} kurals, ` +
      `${CHAPTERS.length} chapters, ${THEMES.length} themes (sha ${fingerprint})`,
  )
}

await main()
