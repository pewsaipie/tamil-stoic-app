#!/usr/bin/env node
/**
 * Validate a reviewed quote export before it is added to the Netlify function.
 * Usage: node scripts/validate-corpus.mjs path/to/quotes.json
 */
import fs from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/validate-corpus.mjs path/to/quotes.json');
const quotes = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(quotes)) throw new Error('Corpus must be a JSON array.');
const ids = new Set();
const errors = [];
for (const [index, q] of quotes.entries()) {
  const required = ['id', 'tamil', 'english', 'work', 'themes', 'provenance', 'review'];
  for (const key of required) if (!q[key]) errors.push(`${index}: missing ${key}`);
  if (ids.has(q.id)) errors.push(`${index}: duplicate id ${q.id}`);
  ids.add(q.id);
  if (!q.tamil?.text?.trim()) errors.push(`${index}: missing Tamil text`);
  if (!q.english?.text?.trim()) errors.push(`${index}: missing English translation`);
  if (!q.provenance?.url || !q.provenance?.locator) errors.push(`${index}: missing provenance URL or locator`);
  if (q.review?.status !== 'published') errors.push(`${index}: only published quotes may be shipped`);
  if (!Array.isArray(q.themes) || !q.themes.length) errors.push(`${index}: at least one theme is required`);
}
if (quotes.length < 1500 || quotes.length > 2000) errors.push(`corpus contains ${quotes.length} quotes; expected 1,500–2,000`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Valid reviewed corpus: ${quotes.length} quotes.`);
