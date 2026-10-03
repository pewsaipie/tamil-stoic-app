/**
 * The Ask Valluvar intent classifier — runtime (c10).
 *
 * Two classical stages, in this order:
 *
 *   1. **Lexicon** (`lexicon.ts`): exact keyword match, then character-bigram
 *      fuzzy match for inflections, transliteration spellings and typos.
 *   2. **Naive Bayes** (`intentFeatures.ts` features): a multinomial model over
 *      hashed word, bigram, prefix and character-4-gram features, whose weights
 *      ship as sparse int8 pairs in `public/data/intents.json`.
 *
 * This module also owns the model *format* — `encodeModel` is used by the training
 * script and `decodeModel` by the app, so the artifact cannot drift from its
 * reader. Nothing here touches the DOM or the network: the model is one small JSON
 * file, precached by the service worker, so Ask Valluvar works offline.
 *
 * Naming the two stages matters for honesty: `source` on every classification says
 * which one answered, and the evaluation in `scripts/train-intent.mjs` measures
 * both stages together, under two different leakage rules.
 */
import { featurise, HASH_BITS } from './intentFeatures.ts'
import { SUPPORT_INTENTS } from './intents.ts'
import { buildLexicon, matchLexicon, type Lexicon } from './lexicon.ts'

export interface QuantisedClass {
  label: string
  /** Value one int8 step stands for, for this class. */
  scale: number
  prior: number
  /** base64 of a little-endian Uint16Array of feature buckets. */
  buckets: string
  /** base64 of an Int8Array of quantised weights, parallel to `buckets`. */
  weights: string
}

export interface IntentModel {
  version: number
  hashBits: number
  buckets: number
  topK: number
  trainedOn: number
  intents: string[]
  classes: QuantisedClass[]
}

/** ASCII-safe base64 of raw bytes — works in the browser and in Node. */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  // `atob`/`btoa` are global in the browser and in Node 16+, so this module needs
  // no Node types and no Buffer polyfill in the bundle.
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export interface TrainingOutput {
  labels: string[]
  priors: number[]
  /** Per class: bucket → real-valued weight, magnitude-ordered selection happens here. */
  weights: Map<number, number>[]
  topK: number
  trainedOn: number
}

/**
 * Quantise trained weights and pack them into the shipped artifact: for each
 * class, the `topK` largest-magnitude weights become (bucket, int8) pairs with a
 * per-class scale. This is what keeps a 37-class model inside the size budget.
 */
export function encodeModel(output: TrainingOutput): IntentModel {
  const classes: QuantisedClass[] = output.labels.map((label, index) => {
    const sorted = [...(output.weights[index] ?? new Map<number, number>()).entries()]
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, output.topK)
    const peak = sorted.reduce((max, [, value]) => Math.max(max, Math.abs(value)), 0) || 1
    const scale = peak / 127
    const buckets = new Uint16Array(sorted.length)
    const values = new Int8Array(sorted.length)
    sorted.forEach(([bucket, value], position) => {
      buckets[position] = bucket
      values[position] = Math.max(-127, Math.min(127, Math.round(value / scale)))
    })
    return {
      label,
      scale,
      prior: output.priors[index] ?? 0,
      buckets: toBase64(new Uint8Array(buckets.buffer, buckets.byteOffset, buckets.byteLength)),
      weights: toBase64(new Uint8Array(values.buffer, values.byteOffset, values.byteLength)),
    }
  })
  return {
    version: 1,
    hashBits: HASH_BITS,
    buckets: 1 << HASH_BITS,
    topK: output.topK,
    trainedOn: output.trainedOn,
    intents: [...output.labels],
    classes,
  }
}

/** Minimum number of recognised features before the model is allowed an opinion. */
export const MIN_EVIDENCE = 2

export interface Classification {
  intent: string
  /** 0–1. Lexicon hits report their match score; the model reports its margin. */
  confidence: number
  /** The taxonomy keyword behind the decision, when the lexicon found one. */
  keyword?: string
  /** The reader's own word that matched. */
  matched?: string
  source: 'lexicon' | 'model' | 'none'
  /** Runner-up intent and its score, for "did you mean" nudges in tests. */
  runnerUp?: { intent: string; score: number }
}

export interface Classifier {
  model: IntentModel
  lexicon: Lexicon
  classify(text: string): Classification
  /** Raw model scores, highest first — used by tests and diagnostics. */
  scores(text: string): { intent: string; score: number }[]
}

export function decodeModel(raw: IntentModel): IntentModel {
  return raw
}

interface RuntimeClass {
  label: string
  scale: number
  prior: number
  buckets: Uint16Array
  weights: Int8Array
}

function buildRuntimeClasses(model: IntentModel): RuntimeClass[] {
  return model.classes.map((entry) => {
    const bucketBytes = fromBase64(entry.buckets)
    const weightBytes = fromBase64(entry.weights)
    return {
      label: entry.label,
      scale: entry.scale,
      prior: entry.prior,
      // `.slice()` copies out of any shared pool: reading `.buffer` directly on a
      // pooled Buffer would make every class alias the same memory.
      buckets: new Uint16Array(bucketBytes.buffer.slice(bucketBytes.byteOffset, bucketBytes.byteOffset + bucketBytes.byteLength)),
      weights: new Int8Array(weightBytes.buffer.slice(weightBytes.byteOffset, weightBytes.byteOffset + weightBytes.byteLength)),
    }
  })
}

export function createClassifier(model: IntentModel, lexicon: Lexicon = buildLexicon()): Classifier {
  const classes = buildRuntimeClasses(model)
  const labels = classes.map((entry) => entry.label)

  // Inverted index: bucket → (class, weight) pairs that have a weight there. A
  // query touches only the buckets it actually produced, which is why scoring
  // stays in the microsecond range on a phone.
  const index = new Map<number, [string, number][]>()
  for (const entry of classes) {
    for (let i = 0; i < entry.buckets.length; i += 1) {
      const bucket = entry.buckets[i]
      if (bucket === undefined) continue
      const list = index.get(bucket) ?? []
      list.push([entry.label, (entry.weights[i] ?? 0) * entry.scale])
      index.set(bucket, list)
    }
  }

  function scoreWithEvidence(text: string): { ranked: { intent: string; score: number }[]; evidence: number } {
    const totals = new Map<string, number>(labels.map((label) => [label, 0]))
    for (const entry of classes) totals.set(entry.label, entry.prior)
    let evidence = 0
    for (const [bucket, value] of featurise(text)) {
      const list = index.get(bucket)
      if (!list) continue
      // How much of this query the model has ever seen. Input made of characters
      // and words it was never trained on lands in buckets that exist only by hash
      // collision, and one lucky collision must not produce a confident answer.
      evidence += 1
      for (const [label, weight] of list) totals.set(label, (totals.get(label) ?? 0) + weight * value)
    }
    const ranked = [...totals.entries()]
      .map(([intent, score]) => ({ intent, score }))
      .sort((a, b) => b.score - a.score)
    return { ranked, evidence }
  }

  function scores(text: string): { intent: string; score: number }[] {
    return scoreWithEvidence(text).ranked
  }

  function classify(text: string): Classification {
    // Safety first, and by rule rather than by margin: if the words contain a
    // support phrase, the answer is the support card — never a couplet alone.
    const support = matchLexicon(text, lexicon, { only: SUPPORT_INTENTS, floor: 0.7 })
    if (support) {
      return {
        intent: support.intent,
        confidence: support.exact ? 1 : Math.min(0.9, support.score),
        keyword: support.keyword,
        matched: support.matched,
        source: 'lexicon',
      }
    }

    const match = matchLexicon(text, lexicon)
    if (match) {
      return {
        intent: match.intent,
        confidence: match.exact ? 1 : Math.min(0.95, 0.5 + match.score / 2),
        keyword: match.keyword,
        matched: match.matched,
        source: 'lexicon',
      }
    }
    const { ranked, evidence } = scoreWithEvidence(text)
    const [best, runnerUp] = ranked
    if (!best) return { intent: 'unknown', confidence: 0, source: 'none' }
    // Two independent features is the minimum for a sentence to mean anything; a
    // single stray bucket is noise, so the caller gets the fallback path.
    if (evidence < MIN_EVIDENCE) return { intent: 'unknown', confidence: 0, source: 'none' }
    // Confidence is the softmax gap between the top two classes, not a hand-scaled
    // score difference: with input the model has no evidence for, every class sits
    // near its prior and the gap collapses toward 1/37, which is exactly what the
    // fallback path needs to detect.
    const peak = best.score
    let total = 0
    for (const entry of ranked) total += Math.exp(entry.score - peak)
    const topProbability = 1 / (total || 1)
    const runnerProbability = runnerUp ? Math.exp(runnerUp.score - peak) / (total || 1) : 0
    const confidence = Math.max(0, Math.min(1, topProbability - runnerProbability))
    return {
      intent: best.intent,
      confidence,
      source: 'model',
      runnerUp: runnerUp ? { intent: runnerUp.intent, score: runnerUp.score } : undefined,
    }
  }

  return { model, lexicon, classify, scores }
}
