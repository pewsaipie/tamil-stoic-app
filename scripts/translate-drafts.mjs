#!/usr/bin/env node
/**
 * Create private, clearly-labelled translation drafts from a source JSON file.
 * No output is published by this script. It requires an OpenAI-compatible API:
 *   OPENAI_API_KEY=... OPENAI_MODEL=... node scripts/translate-drafts.mjs source.json output.json
 */
import fs from 'node:fs/promises';

const [, , inputPath, outputPath = 'data/drafts/quotes-draft-500.json'] = process.argv;
if (!inputPath) throw new Error('Usage: OPENAI_API_KEY=... node scripts/translate-drafts.mjs source.json [output.json]');
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required. The key is never written to the output.');
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const source = JSON.parse(await fs.readFile(inputPath, 'utf8'));
if (!Array.isArray(source) || source.length < 500) throw new Error(`Input must contain at least 500 Tamil passages; received ${source?.length ?? 0}.`);
const passages = source.slice(0, 500);
const output = [];

async function translate(item, attempt = 0) {
  const prompt = `Translate this Tamil literary passage into clear, faithful English. This is a private draft for human review, not a final translation. Preserve ambiguity and imagery; do not add commentary. Return JSON with only an english_text string and a short translator_note string.\n\nTamil source:\n${item.tamil_text}`;
  const res = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'You are a careful Tamil-to-English literary translation assistant. Never claim human approval.' }, { role: 'user', content: prompt }] }) });
  if (!res.ok) { if (attempt < 3) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); return translate(item, attempt + 1); } throw new Error(`Translation request failed for ${item.id}: ${res.status} ${await res.text()}`); }
  const body = await res.json();
  const parsed = JSON.parse(body.choices?.[0]?.message?.content || '{}');
  if (!parsed.english_text) throw new Error(`Empty translation for ${item.id}`);
  return { ...item, english: { text: parsed.english_text, type: 'draft-literary', translator: 'Tamil Stoic AI-assisted draft' }, translation_review: { status: 'draft', ai_assisted: true, model, translator_note: parsed.translator_note || '', human_tamil_reviewer: null, human_english_reviewer: null, production_approved: false } };
}

for (let i = 0; i < passages.length; i++) {
  output.push(await translate(passages[i]));
  if ((i + 1) % 10 === 0) { await fs.mkdir(new URL('.', `file://${process.cwd()}/${outputPath}`).pathname, { recursive: true }).catch(() => {}); await fs.writeFile(outputPath, JSON.stringify(output, null, 2)); console.log(`Translated ${i + 1}/${passages.length} drafts`); }
}
await fs.mkdir(new URL('.', `file://${process.cwd()}/${outputPath}`).pathname, { recursive: true }).catch(() => {});
await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${output.length} private draft translations to ${outputPath}`);
