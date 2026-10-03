/**
 * Features for the Ask Valluvar intent classifier — shared by the training
 * script and the runtime, so what is trained is exactly what is scored.
 *
 * Feature space (classical, and small enough to ship):
 *
 *   w:<stem>        word unigrams, after Tamil suffix stripping and roman folding
 *   b:<a>_<b>       word bigrams — "kovam varudhu" is not "kovam" alone
 *   c:<ngram>       character 4-grams of each stem, which recover the morphology
 *                   the stemmer over-strips (கோபத்த/கோபம்/கோபமாக)
 *
 * Features are **hashed** into a fixed bucket space with FNV-1a. Hashing keeps the
 * model a flat array of integers instead of a dictionary of Tamil strings: the
 * quantised artifact ships as sparse (bucket, int8 weight) pairs and stays well
 * under the size budget, with no vocabulary file to load.
 */
import { charNgrams, tokenise } from './tamilText.ts'

/** Bucket space: 2^13 = 8,192. Chosen so 37 classes × top-512 weights fit in the budget. */
export const HASH_BITS = 13
export const HASH_BUCKETS = 1 << HASH_BITS

/** FNV-1a, 32-bit — fast, allocation-free, good enough for feature hashing. */
export function hashFeature(feature: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < feature.length; i += 1) {
    hash ^= feature.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) & (HASH_BUCKETS - 1)
}

/** The raw feature strings of one query, before hashing. */
export function featureStrings(text: string): string[] {
  const tokens = tokenise(text)
  const features: string[] = []
  for (const token of tokens) {
    features.push(`w:${token}`)
    for (const gram of charNgrams([token], [4])) features.push(`c:${gram}`)
    if (token.length >= 3) features.push(`p:${token.slice(0, 3)}`)
  }
  for (let i = 0; i + 1 < tokens.length; i += 1) features.push(`b:${tokens[i]}_${tokens[i + 1]}`)
  return features
}

/**
 * The hashed feature vector of one query: bucket → sublinear term frequency.
 * Sublinear (1 + log tf) is the standard guard against a repeated word dominating
 * a short sentence.
 */
export function featurise(text: string): Map<number, number> {
  const counts = new Map<number, number>()
  for (const feature of featureStrings(text)) {
    const bucket = hashFeature(feature)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }
  const vector = new Map<number, number>()
  for (const [bucket, count] of counts) vector.set(bucket, 1 + Math.log(count))
  return vector
}

/** Bucket ids of a query, in order, for the runtime's inverted index. */
export function featureBuckets(text: string): number[] {
  return [...featurise(text).keys()]
}
