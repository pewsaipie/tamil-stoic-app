import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { applyCorrections, validateContent } from './content-quality.mjs';

const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(read('data/kurals.js'), sandbox);
const { KURALS, CHAPTERS, SECTIONS } = JSON.parse(JSON.stringify(sandbox.window));
const ledger = JSON.parse(read('scripts/content-corrections.json'));
validateContent(KURALS);
assert.equal(CHAPTERS.length, 133);
assert.equal(SECTIONS.length, 3);
for (const [index, chapter] of CHAPTERS.entries()) {
  assert.equal(chapter.n, index + 1);
  assert.equal(KURALS.filter(k => k.ch === chapter.n).length, 10);
  assert(chapter.ta.trim() && chapter.en.trim());
  assert(!/[\uFFFD\p{Cn}]/u.test(chapter.ta + chapter.en));
}

// Reconstruct the uncorrected inputs using the actual checked-in authoring
// files, not just the ledger's expected values, for gloss/curated entries.
const original = structuredClone(KURALS);
const curated = JSON.parse(read('scripts/curated-overrides.json'));
const glosses = Object.assign({}, ...fs.readdirSync(new URL('scripts/glosses/', root))
  .filter(f => f.endsWith('.json')).map(f => JSON.parse(read(`scripts/glosses/${f}`))));
for (const correction of ledger.corrections) {
  const { n, before, after } = correction;
  for (const field of Object.keys(after)) {
    assert.deepEqual(KURALS[n - 1][field], after[field], `#${n}/${field}: generated file is stale`);
    if (field === 's') assert.equal(curated[n]?.s ?? glosses[n], before.s, `#${n}: authoring source changed`);
    original[n - 1][field] = structuredClone(before[field]);
  }
}
assert.deepEqual(applyCorrections(structuredClone(original), ledger), KURALS);

// Ensure guards fail for the kinds of corruption this review found.
function rejected(mutate, pattern) {
  const copy = structuredClone(KURALS);
  mutate(copy);
  assert.throws(() => validateContent(copy), pattern);
}
rejected(k => k.pop(), /1,330/);
rejected(k => { k[10].n = 10; }, /numbering/);
rejected(k => { k[0].ta[0] += '\u0BA7'; }, /unassigned/);
rejected(k => { k[0].tr[0] += '\uFFFD'; }, /corrupt/);
rejected(k => { k[709].en[1] = ''; }, /empty/);
rejected(k => { k[0].s = '<script>bad</script>'; }, /HTML/);
rejected(k => { k[0].ch = 2; }, /chapter/);
rejected(k => { k[0].sec = 3; }, /book/);
const drift = structuredClone(original);
drift[ledger.corrections[0].n - 1].s = 'Unreviewed upstream change';
assert.throws(() => applyCorrections(drift, ledger), /upstream text changed/);
const duplicated = structuredClone(ledger);
duplicated.corrections.push(duplicated.corrections[0]);
assert.throws(() => applyCorrections(structuredClone(original), duplicated), /Duplicate/);
const unsupported = structuredClone(ledger);
unsupported.corrections[0].before.n = 1;
unsupported.corrections[0].after.n = 2;
assert.throws(() => applyCorrections(structuredClone(original), unsupported), /unsupported field/);

console.log(`PASS: 1,330 Kurals, 133 chapters, ${ledger.corrections.length} correction records, and corruption/ drift guards (${fileURLToPath(root)}).`);
