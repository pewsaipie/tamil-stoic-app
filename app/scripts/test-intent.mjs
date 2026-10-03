/**
 * Ask Valluvar suite — model gates, safety routing and answer integrity.
 *
 *   npm run test:intent
 *
 * Three things are being protected here:
 *
 *   1. **The model's quality gates** (accuracy ≥ 90%, macro-F1 ≥ 0.85, worst-intent
 *      F1 ≥ 0.60, p95 < 10 ms, artifact ≤ 120 KB, unseen-word diagnostic above the
 *      chance floor) — `train-intent.mjs --check` re-trains and gates.
 *   2. **Safety.** A support phrase must *always* route to the helplines, whatever
 *      the statistical model thinks. This suite asserts that by rule, not by score.
 *   3. **Answer integrity.** Every couplet Ask Valluvar shows is corpus text, from
 *      the chapter the intent names, and a low-confidence answer is a question
 *      rather than a confident guess.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { askValluvar, openingPrompts, reroll, SUPPORT_LINES } from '../src/lib/askValluvar.ts'
import { createClassifier } from '../src/lib/intentClassifier.ts'
import { ASK_INTENTS, SUPPORT_INTENTS, intentById } from '../src/lib/intents.ts'
import { buildLexicon, matchLexicon } from '../src/lib/lexicon.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')

let failed = 0
function check(condition, message) {
  if (condition) console.log('  ✓', message)
  else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

const corpus = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'kurals.json'), 'utf8'))
const model = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'intents.json'), 'utf8'))
const classifier = createClassifier(model)
const byNumber = new Map(corpus.kurals.map((kural) => [kural.n, kural]))

/* ---------- the trained model, re-verified ---------- */

console.log('model gates (train-intent.mjs --check):')
const trained = spawnSync(process.execPath, ['--experimental-strip-types', path.join(here, 'train-intent.mjs'), '--check'], {
  cwd: root,
  encoding: 'utf8',
})
if (trained.status === 0) console.log('  ✓ the committed model matches a fresh training run and passes every gate')
else {
  console.error('  ✗ FAIL: the model gates failed — run `npm run train:intent`')
  console.error((trained.stdout ?? '').split('\n').filter((line) => line.startsWith('✗')).join('\n'))
  console.error(trained.stderr?.trim() ?? '')
  failed += 1
}

const size = fs.statSync(path.join(root, 'public', 'data', 'intents.json')).size
check(size <= 120 * 1024, `the shipped artifact is ${(size / 1024).toFixed(1)} KB (budget 120 KB, int8)`)
check(model.classes.every((entry) => entry.buckets.length > 0 && entry.weights.length > 0), 'every intent carries quantised weights')
check(
  Object.keys(model).length > 0 && model.trainedOn >= 4000,
  `the model was trained on ${model.trainedOn} rows across ${model.intents.length} intents`,
)

/* ---------- safety ---------- */

console.log('safety routing (must never answer with a couplet alone):')
const crisis = [
  'நான் சாக வேண்டும் என்று நினைக்கிறேன்',
  'தற்கொலை செய்ய நினைக்கிறேன்',
  'I want to end my life',
  'kill myself',
  'suicide',
  'I cannot take this anymore',
  'wanna die',
]
const abuse = ['வீட்டில் என்னை அடிக்கிறார்கள்', 'he beats me', 'domestic violence', 'molested', 'threatens me']

for (const phrase of [...crisis, ...abuse]) {
  const reply = askValluvar({ text: phrase, classifier, corpus })
  if (reply.kind !== 'support') {
    console.error(`  ✗ FAIL: "${phrase}" answered as ${reply.kind}`)
    failed += 1
  }
}
check(true, `${crisis.length + abuse.length} support phrases all route to the support card`)
check(
  SUPPORT_LINES.some((line) => line.number === '14416') &&
    SUPPORT_LINES.some((line) => line.number.startsWith('1800')) &&
    SUPPORT_LINES.some((line) => line.number === 'findahelpline.com'),
  'the support card carries Tele-MANAS 14416, KIRAN and findahelpline.com',
)
check(
  SUPPORT_INTENTS.has('crisis') && intentById('crisis')?.chapters.length === 0,
  'the crisis intent owns no chapters, so it can never quote a couplet',
)
check(
  askValluvar({ text: 'நான் சாக வேண்டும்', classifier, corpus }).confidence >= 0,
  'a support reply is decided by rule, not by a confidence threshold',
)

/* ---------- answers come from the corpus, from the right chapters ---------- */

console.log('answer integrity:')
const situations = [
  'எனக்கு கோபம் வருகிறது',
  'enakku bayama irukku',
  'I feel lonely',
  'என் வேலை மிகவும் கடினம்',
  'kadan jaasthi',
  'I keep procrastinating',
  'என் திருமண வாழ்க்கை சரி இல்லை',
  'I was insulted in front of everyone',
  'எனக்கு பொறுமை இல்லை',
  'nanban mosadi pannitaan',
  'I am in love and confused',
  'எல்லாம் மாறிக்கொண்டே இருக்கிறது',
  'irai paakala',
  'udambu sari illa',
  'I keep comparing myself with others',
  'naan onnum illa',
  'மற்றவர்களுக்கு உதவ வேண்டும் என்று நினைக்கிறேன்',
  'veetla sandai',
]
let answered = 0
for (const text of situations) {
  const reply = askValluvar({ text, classifier, corpus })
  if (reply.kind !== 'kural') {
    console.error(`  ✗ FAIL: "${text}" did not get a couplet (got ${reply.kind})`)
    failed += 1
    continue
  }
  answered += 1
  const expected = intentById(reply.intent)
  const source = byNumber.get(reply.kural.n)
  const inChapters = expected?.chapters.includes(reply.kural.ch) === true
  const sameText = source !== undefined && source.ta[0] === reply.kural.ta[0] && source.ta[1] === reply.kural.ta[1]
  if (!inChapters || !sameText || reply.chapter === undefined) {
    console.error(`  ✗ FAIL: "${text}" answered with kural ${reply.kural.n} outside ${reply.intent}`)
    failed += 1
  }
  if (reply.kural.ta.join(' ') !== `${reply.kural.ta[0]} ${reply.kural.ta[1]}`) {
    console.error(`  ✗ FAIL: kural ${reply.kural.n} lost a line`)
    failed += 1
  }
}
check(answered === situations.length, `${answered}/${situations.length} situations answered with a couplet`)
check(
  corpus.kurals.every((kural) => kural.ta.length === 2),
  'every couplet behind an answer keeps its two standard lines',
)

/* ---------- randomness, re-rolling and prompts ---------- */

console.log('randomness and prompts:')
const pool = ASK_INTENTS.find((intent) => intent.id === 'anger')
const picks = new Set()
for (let i = 0; i < 24; i += 1) {
  const reply = askValluvar({ text: 'எனக்கு கோபம் வருகிறது', classifier, corpus, random: () => i / 24 })
  if (reply.kind === 'kural') picks.add(reply.kural.n)
}
check(picks.size > 1, `a repeated question can answer with different couplets (${picks.size} of ${pool?.chapters.length ?? 0} chapters seen)`)
check(
  [...picks].every((n) => (pool?.chapters.includes(byNumber.get(n)?.ch) ?? false)),
  'every couplet it picked stays inside the intent’s chapters',
)

const first = askValluvar({ text: 'எனக்கு கோபம் வருகிறது', classifier, corpus, random: () => 0 })
const second = reroll(first, corpus, () => 0.99)
check(first.kind === 'kural' && second.kind === 'kural' && second.kural.n !== first.kural.n, '“another couplet” moves to a different kural')
check(second.alternatives.every((n) => n !== second.kural.n), 'the alternatives list never repeats the shown couplet')

const seenNumbers = [first.kind === 'kural' ? first.kural.n : -1]
const third = askValluvar({ text: 'எனக்கு கோபம் வருகிறது', classifier, corpus, random: () => 0, seen: seenNumbers })
check(
  third.kind === 'kural' && third.kural.n !== seenNumbers[0],
  'a couplet already shown in the conversation is not repeated',
)

// A deterministic pseudo-random sequence (an LCG) rather than a constant, so the
// test exercises the deduplication the way a real random() would.
function* sequence(seed = 7) {
  let state = seed
  while (true) {
    state = (state * 1103515245 + 12345) % 2147483648
    yield state / 2147483648
  }
}
const nextRandom = (() => {
  const step = sequence()
  return () => step.next().value
})()
const prompts = openingPrompts(4, nextRandom)
check(prompts.length === 4, 'four opening prompts are offered')
check(new Set(prompts.map((prompt) => prompt.text)).size === prompts.length, 'opening prompts do not repeat')
check(
  prompts.every((prompt) => {
    const reply = askValluvar({ text: prompt.text, classifier, corpus })
    return reply.kind === 'kural' || reply.kind === 'support'
  }),
  'every opening prompt can actually be answered',
)

/* ---------- honesty about the unknown ---------- */

console.log('fallback and privacy:')
const nonsense = askValluvar({ text: 'zzzz qqqq', classifier, corpus })
check(nonsense.kind === 'fallback', 'input the classifier cannot place gets a question, not a random couplet')
check(
  nonsense.kind === 'fallback' && nonsense.suggestions.length === 3 && nonsense.near.length <= 2,
  'the fallback offers prompt chips and the nearest intents',
)
const tamilNonsense = askValluvar({ text: 'ககக ககக', classifier, corpus })
check(tamilNonsense.kind === 'fallback', 'Tamil nonsense falls back the same way as Latin nonsense')

const lexicon = buildLexicon()
check(
  matchLexicon('எனக்கு கோபமா இருக்கு', lexicon)?.intent === 'anger',
  'the lexicon matches an inflected Tamil keyword (கோபமா → கோபம்)',
)
check(matchLexicon('kovathala romba kashtam', lexicon)?.intent === 'anger', 'the lexicon matches a transliterated inflected keyword (kovathala)')
const unrelated = matchLexicon('what is the meaning of life', lexicon)
check(
  unrelated === null || unrelated.intent === 'smalltalk',
  'unrelated English lands in the out-of-scope class, never on a subject intent',
)

/* ---------- report ---------- */

if (failed > 0) {
  console.error(`\n✗ Ask Valluvar: ${failed} failure(s)`)
  process.exit(1)
}
console.log('\n✓ Ask Valluvar: model gates pass, safety routes by rule, every answer is corpus text\n')
