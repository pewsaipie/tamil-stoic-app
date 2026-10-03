/**
 * Couplet line contract suite — c9.
 *
 *   npm run test:couplet
 *
 * Asserts the shipped corpus, `src/lib/couplet.ts`, `src/styles/global.css` and
 * `docs/couplet-line-contract.md` all agree: every one of the 1,330 couplets has
 * exactly two lines in the standard 4 சீர் / 3 சீர் order, every couplet has at most
 * 4 words on top and at most 3 words below, 1,324 of them land on four words over
 * three, the 6 compound-சீர் exceptions match the contract document, and the CSS
 * prevents a couplet line from wrapping into a paragraph (`white-space: nowrap`).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coupletLines,
  coupletText,
  isStandardWordSplit,
  isWithinMaxWordSplit,
  lineWordCounts,
} from '../src/lib/couplet.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const repo = path.join(root, '..')

let failed = 0
function check(condition, message) {
  if (condition) console.log('  ✓', message)
  else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

const words = (text) => (String(text).trim() ? String(text).trim().split(/\s+/).length : 0)
const tidy = (text) => String(text).replace(/\s+/g, ' ').trim()

/* ---------- corpus ---------- */

const corpusPath = path.join(root, 'public', 'data', 'kurals.json')
if (!fs.existsSync(corpusPath)) {
  console.error('✗ public/data/kurals.json is missing — run `npm run sync` first.')
  process.exit(1)
}
const parsed = JSON.parse(fs.readFileSync(corpusPath, 'utf8'))
const kurals = Array.isArray(parsed) ? parsed : parsed.kurals
assert.ok(Array.isArray(kurals) && kurals.length, 'corpus has kurals')

/* ---------- the contract document ---------- */

const docPath = path.join(repo, 'docs', 'couplet-line-contract.md')
assert.ok(fs.existsSync(docPath), 'the contract document exists')
const doc = fs.readFileSync(docPath, 'utf8')

/** Rows of the §3 exception table: | 42 | 3 / 3 | … | `top`<br>`bottom` | */
const docRows = new Map()
for (const line of doc.split('\n')) {
  const match = /^\|\s*(\d+)\s*\|\s*(\d+)\s*\/\s*(\d+)\s*\|/.exec(line)
  if (match) docRows.set(Number(match[1]), { top: Number(match[2]), bottom: Number(match[3]) })
}

/* ---------- measured facts ---------- */

const measured = []
for (const kural of kurals) {
  assert.ok(Array.isArray(kural.ta) && kural.ta.length === 2, `kural ${kural.n} has two lines`)
  const lines = coupletLines(kural)
  assert.ok(lines[0].length > 0 && lines[1].length > 0, `kural ${kural.n} has no empty line`)
  assert.equal(
    lines.join(' '),
    tidy(kural.ta.join(' ')),
    `kural ${kural.n}: the split only re-spaces, never moves or drops a word`,
  )
  measured.push({
    n: kural.n,
    top: words(lines[0]),
    bottom: words(lines[1]),
    standard: isStandardWordSplit(kural),
    withinMax: isWithinMaxWordSplit(kural),
  })
}

const fourThree = measured.filter((row) => row.standard)
const exceptions = measured.filter((row) => !row.standard)

/* ---------- the assertions ---------- */

console.log('\ncouplet corpus')
check(kurals.length === 1330, `corpus holds all 1,330 couplets (found ${kurals.length})`)
check(
  measured.every((row) => row.top > 0 && row.bottom > 0),
  'every couplet renders as two non-empty lines',
)
check(
  measured.every((row) => row.withinMax && row.top <= 4 && row.bottom <= 3),
  'every one of the 1,330 couplets has at most 4 words on top and at most 3 words below',
)

console.log('\nstandard 4 / 3 split')
check(fourThree.length === 1324, `1,324 couplets read four words over three (found ${fourThree.length})`)
check(
  fourThree.every((row) => row.top === 4 && row.bottom === 3),
  'each of the 1,324 is exactly four words over three',
)
{
  const counts = new Map()
  for (const row of measured) counts.set(`${row.top}/${row.bottom}`, (counts.get(`${row.top}/${row.bottom}`) ?? 0) + 1)
  const summary = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => `${key} ×${n}`).join(', ')
  console.log('    distribution:', summary)
}

console.log('\ndocumented compound-சீர் exceptions')
check(exceptions.length === 6, `exactly 6 couplets are compound-சீர் exceptions (found ${exceptions.length})`)
check(docRows.size === 6, `the contract document lists 6 exceptions (found ${docRows.size})`)
check(
  exceptions.every((row) => docRows.get(row.n)?.top === row.top && docRows.get(row.n)?.bottom === row.bottom),
  'every measured exception matches the document’s number and word counts',
)
check(
  [...docRows.keys()].every((n) => exceptions.some((row) => row.n === n)),
  'the document lists no exception the corpus does not have',
)
check(
  exceptions.every((row) => row.top + row.bottom !== 7),
  'no exception is a clean seven-token couplet split the wrong way — each is a compound-சீர் word',
)

console.log('\nlibrary contract')
const sample = kurals[0]
check(coupletText(sample) === `${coupletLines(sample)[0]} ${coupletLines(sample)[1]}`, 'coupletText joins the two lines')
check(
  lineWordCounts(sample).join('/') === '4/3',
  `the first couplet reads four over three (${lineWordCounts(sample).join('/')})`,
)
const kural82 = kurals.find((k) => k.n === 82)
check(kural82 !== undefined && isStandardWordSplit(kural82), 'kural 82 reads 4 over 3 after intra-word space repair')
const kural42 = kurals.find((k) => k.n === 42)
check(kural42 !== undefined && !isStandardWordSplit(kural42) && isWithinMaxWordSplit(kural42), 'kural 42 is a documented 3/3 compound-சீர் exception')

console.log('\nrenderer & non-wrapping visual contract')
const verse = fs.readFileSync(path.join(root, 'src', 'components', 'kural', 'KuralVerse.tsx'), 'utf8')
const globalCss = fs.readFileSync(path.join(root, 'src', 'styles', 'global.css'), 'utf8')
check(verse.includes("from '../../lib/couplet'"), 'KuralVerse renders through lib/couplet.ts')
check(verse.includes('coupletLines(kural)'), 'KuralVerse derives both lines from coupletLines()')
check(verse.includes('data-verse-line="1"') && verse.includes('data-verse-line="2"'), 'both data-verse-line hooks are present')
check(!verse.includes('kural.ta[0]') && !verse.includes('kural.ta[1]'), 'KuralVerse no longer indexes the corpus lines directly')
check(
  /\.verse__line\s*\{[^}]*white-space:\s*nowrap/s.test(globalCss),
  '.verse__line enforces white-space: nowrap so a couplet line never wraps into a paragraph',
)

/* ---------- report ---------- */

if (failed > 0) {
  console.error(`\n✗ couplet contract: ${failed} failure(s)`)
  process.exit(1)
}
console.log('\n✓ couplet contract: 1,330 couplets (1,324 at 4/3, 6 at 3/3 or 4/2; 100% ≤ 4 over ≤ 3, non-wrapping)\n')
