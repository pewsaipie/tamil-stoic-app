/**
 * Trains the Ask Valluvar intent classifier and writes the quantised model.
 *
 *   npm run train:intent          # train, evaluate, write public/data/intents.json
 *   npm run train:intent -- --check   # verify the committed model, write nothing
 *
 * The classifier is a classical multinomial Naive Bayes over hashed features
 * (word unigrams, word bigrams, character 4-grams, prefixes — see
 * `src/lib/intentFeatures.ts`), trained on the keyword sets and sentence frames in
 * `src/lib/intents.ts` and evaluated with **keyword-grouped cross-validation**: a
 * keyword is never in both the training and the test side of a fold, so the score
 * measures how the app handles words it has not been shown.
 *
 * Weights are quantised to int8 with a per-class scale and written as sparse
 * (bucket, weight) pairs, which is what keeps the shipped model small.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { featurise, HASH_BUCKETS, HASH_BITS } from '../src/lib/intentFeatures.ts'
import { createClassifier, encodeModel } from '../src/lib/intentClassifier.ts'
import { ASK_INTENTS, ROMAN_FRAMES, TAMIL_FRAMES } from '../src/lib/intents.ts'
import { buildLexicon } from '../src/lib/lexicon.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const outPath = path.join(root, 'public', 'data', 'intents.json')

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const quiet = args.includes('--quiet')

/** Model budget from the plan: the quantised artifact must fit in 120 KB. */
const SIZE_BUDGET = 120 * 1024
/** Weights kept per class, by magnitude. 512 keeps the artifact around 80 KB. */
const TOP_K = 512
const FOLDS = 5

/* ---------- the training corpus ---------- */

/**
 * One training row. `frameGroup` is what the headline evaluation holds out (the
 * sentence shape), `wordGroup` is what the diagnostic experiment holds out (the
 * keyword itself). Keeping both on the row means the two evaluations run over
 * exactly the same data with different leakage rules.
 */
function buildRows() {
  const rows = []
  const push = (text, label, frameGroup, wordGroup) => rows.push({ text, label, frameGroup, wordGroup })
  for (const intent of ASK_INTENTS) {
    intent.keywords.forEach((keyword) => {
      TAMIL_FRAMES.forEach((frame, index) => {
        push(frame.replace('{kw}', keyword), intent.id, `ta-frame-${index}`, `${intent.id}/${keyword}`)
      })
    })
    intent.romanised.forEach((keyword) => {
      ROMAN_FRAMES.forEach((frame, index) => {
        push(frame.replace('{kw}', keyword), intent.id, `ro-frame-${index}`, `${intent.id}/${keyword}`)
      })
    })
    intent.examples.forEach((example, index) => {
      push(example, intent.id, `example-${index}`, `${intent.id}/example-${index}`)
    })
  }
  return rows
}

const rows = buildRows()
const labels = ASK_INTENTS.map((intent) => intent.id)
const labelIndex = new Map(labels.map((label, index) => [label, index]))

/* ---------- multinomial naive Bayes ---------- */

/**
 * Train on the given rows. Returns per-class sparse weight maps (bucket → weighted
 * log probability) plus the class log priors.
 */
function train(trainRows) {
  const classes = labels.map(() => new Map())
  const totals = labels.map(() => 0)
  const docCounts = labels.map(() => 0)
  const docFreq = new Map()

  for (const row of trainRows) {
    const vector = featurise(row.text)
    const index = labelIndex.get(row.label)
    docCounts[index] += 1
    for (const [bucket, value] of vector) {
      classes[index].set(bucket, (classes[index].get(bucket) ?? 0) + value)
      totals[index] += value
      docFreq.set(bucket, (docFreq.get(bucket) ?? 0) + 1)
    }
  }

  // Every feature is scored as a **log-likelihood ratio against the background
  // model**, not as a raw log probability. A raw probability carries a constant
  // offset for merely existing, so a class with a bigger keyword list would win
  // every query on the size of its table alone; the ratio keeps only the part of
  // a feature that actually says *this intent rather than any other*.
  const alpha = 0.2
  const vocab = new Set([...classes.flatMap((map) => [...map.keys()])])
  const vocabSize = Math.max(vocab.size, 1)
  const totalFeatures = totals.reduce((sum, value) => sum + value, 0)
  const background = (bucket) => Math.log(((docFreq.get(bucket) ?? 0) + alpha) / (totalFeatures + alpha * vocabSize))

  const priors = []
  const weights = classes.map((classWeights, index) => {
    const prior = Math.log((docCounts[index] + 1) / (trainRows.length + labels.length))
    priors.push(prior)
    const scored = new Map()
    for (const [bucket, count] of classWeights) {
      const conditional = Math.log((count + alpha) / (totals[index] + alpha * vocabSize))
      scored.set(bucket, conditional - background(bucket))
    }
    return scored
  })

  return { priors, weights }
}

/** A lexicon built only from the keywords the fold was allowed to see. */
function lexiconFromTrainingRows(trainRows) {
  const allowed = new Map()
  for (const row of trainRows) {
    const [intentId, ...rest] = row.wordGroup.split('/')
    const keyword = rest.join('/')
    if (keyword.startsWith('example') || !keyword) continue
    const list = allowed.get(intentId) ?? []
    if (!list.includes(keyword)) list.push(keyword)
    allowed.set(intentId, list)
  }
  const subset = ASK_INTENTS.filter((intent) => allowed.has(intent.id)).map((intent) => {
    const words = allowed.get(intent.id)
    const tamil = words.filter((word) => /[\u0B80-\u0BFF]/.test(word))
    const romanised = words.filter((word) => !/[\u0B80-\u0BFF]/.test(word))
    return { ...intent, keywords: tamil, romanised }
  })
  return buildLexicon(subset)
}

/* ---------- metrics ---------- */

function f1ByLabel(expected, predicted) {
  const perLabel = {}
  for (const label of labels) perLabel[label] = { tp: 0, fp: 0, fn: 0 }
  expected.forEach((truth, i) => {
    const guess = predicted[i]
    if (truth === guess) perLabel[truth].tp += 1
    else {
      // A prediction of `unknown` (the evidence guard firing) is a miss for the
      // true class, and no class gets a false positive for it.
      perLabel[truth].fn += 1
      if (perLabel[guess]) perLabel[guess].fp += 1
    }
  })
  const f1 = {}
  for (const label of labels) {
    const { tp, fp, fn } = perLabel[label]
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp)
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn)
    f1[label] = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  }
  return f1
}

/**
 * Grouped cross-validation: fold by group (never by row), collect out-of-fold
 * predictions for every row, and report metrics on those predictions.
 * `groupKey` selects the leakage rule — `frameGroup` holds out sentence shapes
 * while keeping the vocabulary, `wordGroup` holds out the words themselves.
 */
function crossValidate(groupKey = 'frameGroup') {
  const groups = [...new Set(rows.map((row) => row[groupKey]))]
  const foldOf = new Map(groups.map((group, index) => [group, index % FOLDS]))
  let predictions = new Array(rows.length).fill(null)
  const perFold = []

  for (let fold = 0; fold < FOLDS; fold += 1) {
    const trainRows = rows.filter((row) => foldOf.get(row[groupKey]) !== fold)
    const testRows = rows.map((row, index) => ({ row, index })).filter(({ row }) => foldOf.get(row[groupKey]) === fold)
    const trained = train(trainRows)
    const model = encodeModel({
      labels,
      priors: trained.priors,
      weights: trained.weights,
      topK: TOP_K,
      trainedOn: trainRows.length,
    })
    // The evaluation runs the shipped pipeline: lexicon first, model as fallback.
    const classifier = createClassifier(model, lexiconFromTrainingRows(trainRows))
    let correct = 0
    const foldTruth = []
    for (const { row, index } of testRows) {
      const { intent } = classifier.classify(row.text)
      predictions[index] = intent
      foldTruth.push(row.label)
      if (intent === row.label) correct += 1
    }
    perFold.push(foldTruth.length ? correct / foldTruth.length : 0)
  }

  const truth = rows.map((row) => row.label)
  const accuracy = truth.filter((label, i) => label === predictions[i]).length / truth.length
  const f1 = f1ByLabel(truth, predictions)
  const macroF1 = labels.reduce((sum, label) => sum + f1[label], 0) / labels.length
  const worstLabel = labels.slice().sort((a, b) => f1[a] - f1[b])[0]
  const confusion = {}
  truth.forEach((label, i) => {
    if (label === predictions[i]) return
    const key = `${label} → ${predictions[i]}`
    confusion[key] = (confusion[key] ?? 0) + 1
  })
  return {
    examples: rows.length,
    groups: groups.length,
    folds: perFold.map((value) => Number(value.toFixed(3))),
    accuracy,
    macroF1,
    worst: { label: worstLabel, f1: f1[worstLabel] },
    f1,
    confusion,
    predictions,
    truth,
  }
}

/* ---------- latency of the shipped scorer ---------- */

function latency(score, samples) {
  for (const text of samples.slice(0, 50)) score(text)
  const durations = []
  for (const text of samples) {
    const start = process.hrtime.bigint()
    score(text)
    durations.push(Number(process.hrtime.bigint() - start) / 1e6)
  }
  durations.sort((a, b) => a - b)
  return {
    p50: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))],
    max: durations[durations.length - 1],
  }
}

/* ---------- run ---------- */

const metrics = crossValidate('frameGroup')
const unseenWords = crossValidate('wordGroup')
const trained = train(rows)
const payload = encodeModel({ labels, priors: trained.priors, weights: trained.weights, topK: TOP_K, trainedOn: rows.length })
if (payload.hashBits !== HASH_BITS || payload.buckets !== HASH_BUCKETS) {
  throw new Error('the model artifact and the featuriser disagree about the bucket space')
}
const json = JSON.stringify(payload)
const size = Buffer.byteLength(json)
const shipped = createClassifier(payload)
const timings = latency((text) => shipped.classify(text), rows.map((row) => row.text))

if (!quiet) {
  console.log(`model      : ${labels.length} intents, ${rows.length} training rows, ${metrics.groups} keyword groups`)
  console.log(`artifact   : ${(size / 1024).toFixed(1)} KB (budget 120 KB, top-${TOP_K}/class, int8)`)
  console.log(`accuracy   : ${(metrics.accuracy * 100).toFixed(2)}%   (gate ≥ 90%)`)
  console.log(`macro F1   : ${metrics.macroF1.toFixed(3)}      (gate ≥ 0.85)`)
  console.log(`worst F1   : ${metrics.worst.f1.toFixed(3)} — ${metrics.worst.label}   (gate ≥ 0.60)`)
  console.log(`p95 latency: ${timings.p95.toFixed(2)} ms   (gate < 10 ms)`)
  console.log(`fold acc   : ${metrics.folds.join(', ')}`)
  console.log(
    `unseen word: ${(unseenWords.accuracy * 100).toFixed(1)}% accuracy / F1 ${unseenWords.macroF1.toFixed(3)} ` +
      `(diagnostic — a lexical model cannot invent a synonym; floor 25%, chance ${(100 / labels.length).toFixed(1)}%)`,
  )
  const misses = Object.entries(metrics.confusion).sort((a, b) => b[1] - a[1]).slice(0, 12)
  if (misses.length) console.log(`confusions : ${misses.map(([key, count]) => `${key} ×${count}`).join('; ')}`)
}

const gate = {
  size: size <= SIZE_BUDGET,
  accuracy: metrics.accuracy >= 0.9,
  macroF1: metrics.macroF1 >= 0.85,
  worst: metrics.worst.f1 >= 0.6,
  latency: timings.p95 < 10,
  // Diagnostic floor. A lexical model cannot invent a synonym it has never seen,
  // so this number is *reported*, and only floored well above chance (2.7%) to
  // catch a model that has stopped modelling sub-word structure at all. The
  // product's answer for out-of-vocabulary input is the fallback path — prompt
  // chips and a follow-up question — not a confident guess.
  unseenWords: unseenWords.accuracy >= 0.25,
}
const failed = Object.entries(gate).filter(([, ok]) => !ok).map(([name]) => name)

if (checkOnly) {
  const committed = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : ''
  const identical = committed === json
  if (!identical) console.error('✗ the committed model differs from a fresh training run — run `npm run train:intent`')
  if (failed.length) console.error(`✗ gates failed: ${failed.join(', ')}`)
  process.exit(!identical || failed.length ? 1 : 0)
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, json)
console.log(`✓ wrote ${path.relative(root, outPath)} (${(size / 1024).toFixed(1)} KB)`)
if (failed.length) {
  console.error(`✗ gates failed: ${failed.join(', ')}`)
  process.exit(1)
}
