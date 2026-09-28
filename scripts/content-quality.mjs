import assert from 'node:assert/strict';

const layers = ['ta', 'tr', 'en', 's'];

// Corrections are deliberately applied AFTER curated entries and glosses.
// A changed upstream reading must be reviewed, not silently overwritten.
export function applyCorrections(kurals, ledger) {
  assert.equal(ledger.version, 1, 'Unsupported corrections format');
  const seen = new Set();
  for (const correction of ledger.corrections) {
    const { n, before, after, notes } = correction;
    assert(Number.isInteger(n) && n >= 1 && n <= 1330, `Invalid correction number: ${n}`);
    assert(!seen.has(n), `Duplicate correction: ${n}`);
    seen.add(n);
    const kural = kurals[n - 1];
    assert.equal(kural?.n, n, `Missing correction target: ${n}`);
    assert.deepEqual(Object.keys(before).sort(), Object.keys(after).sort(), `#${n}: before/after fields differ`);
    assert(Object.keys(after).length > 0, `#${n}: empty correction`);
    for (const [field, value] of Object.entries(after)) {
      assert(layers.includes(field), `#${n}: unsupported field ${field}`);
      assert(notes.some(note => note.field === field && note.reason?.trim() && note.sources?.length && note.sources.every(url => /^https:\/\//.test(url))), `#${n}/${field}: missing evidence`);
      assert.deepEqual(kural[field], before[field], `#${n}/${field}: upstream text changed; review correction`);
      assert.notDeepEqual(value, before[field], `#${n}/${field}: correction changes nothing`);
      kural[field] = structuredClone(value);
    }
  }
  return kurals;
}

export function validateContent(kurals) {
  assert.equal(kurals.length, 1330, 'Expected all 1,330 Kurals');
  for (const [index, kural] of kurals.entries()) {
    const label = `Kural ${index + 1}`;
    assert.equal(kural.n, index + 1, `${label}: numbering`);
    assert.equal(kural.ch, Math.ceil(kural.n / 10), `${label}: chapter`);
    assert.equal(kural.sec, kural.n <= 380 ? 1 : kural.n <= 1080 ? 2 : 3, `${label}: book`);
    for (const field of layers) {
      const values = field === 's' ? [kural[field]] : kural[field];
      assert(Array.isArray(values) && values.length === (field === 's' ? 1 : 2), `${label}/${field}: incorrect line count`);
      for (const text of values) {
        assert(typeof text === 'string' && text.trim().length > 0, `${label}/${field}: empty text`);
        assert.equal(text, text.trim(), `${label}/${field}: outside whitespace`);
        assert(!/[\uFFFD\u0000-\u001F\u007F]/u.test(text), `${label}/${field}: corrupt/control character`);
        assert(!/\p{Cn}/u.test(text), `${label}/${field}: unassigned Unicode code point`);
        assert(!/<\/?[a-z][^>]*>/i.test(text), `${label}/${field}: HTML instead of text`);
        if (field === 'ta') assert(/^[\p{Script=Tamil}\s.,;:?!‘’“”'"—–-]+$/u.test(text), `${label}: non-Tamil character in verse`);
      }
    }
  }
}
