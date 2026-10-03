/**
 * Reader-core tests for the React app — search, suggestions and the couplet
 * line contract.
 *
 *   npm run sync            # produces public/data/kurals.json
 *   npm run test:reader
 *
 * Runs on Node 22's type stripping, so the exact modules the app ships are the
 * ones under test — no build step, no duplicate fixtures.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildIndex,
  matchesQuery,
  searchIndex,
  suggest,
  themeById,
} from '../src/lib/search.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const corpusPath = path.join(here, '..', 'public', 'data', 'kurals.json')

if (!fs.existsSync(corpusPath)) {
  console.error('✗ public/data/kurals.json is missing — run `npm run sync` first.')
  process.exit(1)
}

/** @type {import('../src/lib/types.ts').Corpus} */
const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'))
const index = buildIndex(corpus)

let failed = 0
function check(condition, message) {
  if (condition) {
    console.log('  ✓', message)
  } else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

console.log('couplet line contract:')
check(corpus.kurals.length === 1330, 'the corpus holds all 1,330 kurals')
check(corpus.chapters.length === 133, 'the corpus holds all 133 chapters')

let twoLines = 0
for (const kural of corpus.kurals) {
  if (kural.ta.length === 2 && kural.ta[0].trim() !== '' && kural.ta[1].trim() !== '') twoLines += 1
}
check(twoLines === 1330, 'every kural has exactly two non-empty Tamil lines')

// Regressions for the word-count slicer the React app replaces: cutting a
// couplet at its fourth *space* splits these verses in the wrong place.
const fixtures = [
  [10, 'பிறவிப் பெருங்கடல் நீந்துவர் நீந்தார்', 'இறைவன் அடி சேராதார்'],
  [42, 'துறந்தார்க்கும் துவ்வாதவர்க்கும் இறந்தார்க்கும்', 'இல்வாழ்வான் என்பான் துணை'],
  [331, 'நில்லாத வற்றை நிலையின என்றுணரும்', 'புல்லறிவாண்மை கடை'],
]
for (const [n, line1, line2] of fixtures) {
  const kural = corpus.kurals.find((item) => item.n === n)
  check(
    kural !== undefined && kural.ta[0] === line1 && kural.ta[1] === line2,
    `kural ${n} keeps its standard two-line split`,
  )
}

console.log('search:')
check(index.length === 1330, 'the index covers every kural')

const byNumber = searchIndex(index, '151')
check(byNumber.length === 1 && byNumber[0]?.n === 151, 'a number searches that kural only')

const tamil = searchIndex(index, 'பொறுத்தல்')
check(tamil.length > 0, 'a Tamil word finds kurals')

const english = searchIndex(index, 'patience')
check(english.length > 0, 'an English word finds kurals')

const translit = searchIndex(index, 'porai')
check(translit.length > 0, 'a transliterated fragment finds kurals')

const angerOnly = searchIndex(index, 'anger')
const multiToken = searchIndex(index, 'சினம் anger')
check(multiToken.length > 0, 'a Tamil + English query still matches')
check(
  multiToken.length <= angerOnly.length,
  'adding a token can only narrow the results',
)

const unknown = searchIndex(index, 'zzzznotaword')
check(unknown.length === 0, 'an unknown query returns nothing rather than everything')

check(searchIndex(index, '').length === 1330, 'an empty query returns the whole corpus')

const anger = corpus.kurals.find((kural) => kural.n === 305)
check(
  anger !== undefined && matchesQuery(index[304], '305'),
  'matching is stable at index boundaries',
)

console.log('suggestions:')
const chapterSuggestions = suggest(corpus, index, 'பொறை')
check(
  chapterSuggestions.some((suggestion) => suggestion.kind === 'chapter'),
  'a Tamil fragment suggests the matching chapter',
)
const numerical = suggest(corpus, index, '151')
check(
  numerical.some((suggestion) => suggestion.kind === 'kural' && suggestion.value === '151'),
  'a number suggests that kural',
)
const themeSuggestions = suggest(corpus, index, 'anger')
check(
  themeSuggestions.some((suggestion) => suggestion.kind === 'theme'),
  'an English word suggests the matching theme',
)
check(suggest(corpus, index, '').length === 0, 'an empty query suggests nothing')

console.log('themes:')
check(themeById(corpus.themes, 'anger')?.en === 'Anger', 'theme ids resolve to labels')
check(themeById(corpus.themes, 'nope') === undefined, 'unknown theme ids resolve to nothing')

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll reader-core checks passed.')
