// Compare every Tamil couplet with the pinned Project Madurai-derived witness.
// Fetch the external file described in docs/content-review.md; do not vendor it.
// Usage: node scripts/audit-tamil-reference.mjs /path/to/thirukkural.txt
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
if (!process.argv[2]) throw new Error('Provide the external thirukkural.txt reference path');
const reference = fs.readFileSync(process.argv[2], 'utf8').trim().split(/\r?\n/);
assert.equal(reference.length, 1330, 'Reference must have exactly 1,330 records');
assert(reference.every(line => line.split('$').length === 2), 'Reference must have two lines separated by $');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../data/kurals.js', import.meta.url), 'utf8'), sandbox);
const normal = text => text.normalize('NFC').replace(/[^\u0B80-\u0BFF]/gu, '');
const differences = [];
for (const k of sandbox.window.KURALS) {
  if (normal(k.ta.join('')) !== normal(reference[k.n - 1])) differences.push(k.n);
}
console.log(JSON.stringify({
  scope: 'Tamil character comparison only; not a spelling verdict or literary certification',
  compared: reference.length,
  matchingIgnoringSpacingAndPunctuation: reference.length - differences.length,
  differentKuralNumbers: differences
}, null, 2));
