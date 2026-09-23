/*
 * build-kurals.mjs — generates data/kurals.js (all 1,330 Thirukkural couplets)
 * in the Tamil Stoic app format:
 *   ta  : Tamil couplet (2 lines)
 *   tr  : transliteration (2 lines)
 *   en  : G. U. Pope English verse translation, 1886 — public domain (2 lines)
 *   s   : plain-English meaning
 *   ch  : chapter (adhikaram) number 1–133, resolved via CHAPTERS
 *   sec : section id (1 அறத்துப்பால், 2 பொருட்பால், 3 காமத்துப்பால்)
 *   th  : theme id
 *
 * Sources (expected at ../datasets/, i.e. OUTSIDE this repo):
 *   - tk120404/thirukkural  → thirukkural.json  (Tamil, translit, Pope couplet,
 *                                                 Pope prose explanation)
 *   - tk120404/thirukkural  → detail.json       (chapter/section structure)
 * Hand-curated text layers for the original 29 kurals are merged from
 * scripts/curated-overrides.json.
 *
 * Run:  node scripts/build-kurals.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const DATASETS = process.env.DATASETS_DIR || path.resolve(repo, "..", "datasets");
const SRC = path.join(DATASETS, "tk120404_thirukkural");

const couplets = JSON.parse(fs.readFileSync(path.join(SRC, "thirukkural.json"), "utf8")).kural;
const detail = JSON.parse(fs.readFileSync(path.join(SRC, "detail.json"), "utf8"));
const curated = JSON.parse(fs.readFileSync(path.join(here, "curated-overrides.json"), "utf8"));

/* ---------- sections & chapters ---------- */

const SECTIONS = [
  { id: 1, ta: "அறத்துப்பால்", en: "Virtue" },
  { id: 2, ta: "பொருட்பால்", en: "Wealth" },
  { id: 3, ta: "காமத்துப்பால்", en: "Love" }
];

const chapters = [];
for (const sec of detail[0].section.detail) {
  const secId = sec.number; // 1, 2, 3
  for (const iyal of sec.chapterGroup.detail) {
    for (const ch of iyal.chapters.detail) {
      chapters.push({
        n: ch.number,
        ta: ch.name.trim(),
        en: ch.translation.trim(),
        sec: secId,
        iyal: iyal.name.trim(),
        start: ch.start,
        end: ch.end
      });
    }
  }
}
chapters.sort((a, b) => a.n - b.n);
if (chapters.length !== 133) throw new Error(`expected 133 chapters, got ${chapters.length}`);

const chapterByKural = new Array(1331);
for (const ch of chapters) {
  for (let k = ch.start; k <= ch.end; k++) chapterByKural[k] = ch;
}

/* ---------- themes ---------- */

const THEMES = [
  { id: "all", ta: "அனைத்தும்", en: "All" },
  { id: "wisdom", ta: "ஞானம்", en: "Wisdom" },
  { id: "learning", ta: "கல்வி", en: "Learning" },
  { id: "gratitude", ta: "நன்றி", en: "Gratitude" },
  { id: "patience", ta: "பொறுமை", en: "Patience" },
  { id: "anger", ta: "சினம்", en: "Anger" },
  { id: "truth", ta: "மெய்", en: "Truth" },
  { id: "calm", ta: "அமைதி", en: "Calm" },
  { id: "impermanence", ta: "நிலையாமை", en: "Impermanence" },
  { id: "compassion", ta: "இரக்கம்", en: "Compassion" },
  { id: "effort", ta: "ஊழ்", en: "Fate & Effort" },
  { id: "equality", ta: "சமத்துவம்", en: "Equality" },
  { id: "family", ta: "குடும்பம்", en: "Family" },
  { id: "friendship", ta: "நட்பு", en: "Friendship" },
  { id: "governance", ta: "ஆட்சி", en: "Governance" },
  { id: "wealth", ta: "செல்வம்", en: "Wealth" },
  { id: "love", ta: "காதல்", en: "Love" }
];

// chapter number → theme id
const CHAPTER_THEMES = {
  1: "wisdom", 2: "gratitude", 3: "wisdom", 4: "effort",
  5: "family", 6: "family", 7: "family", 8: "compassion", 9: "compassion", 10: "compassion",
  11: "gratitude", 12: "calm", 13: "calm", 14: "calm", 15: "calm",
  16: "patience", 17: "calm", 18: "calm", 19: "truth", 20: "truth",
  21: "truth", 22: "compassion", 23: "compassion", 24: "wisdom",
  25: "compassion", 26: "compassion", 27: "effort", 28: "truth", 29: "truth",
  30: "truth", 31: "anger", 32: "compassion", 33: "compassion", 34: "impermanence",
  35: "calm", 36: "wisdom", 37: "calm", 38: "effort",
  39: "governance", 40: "learning", 41: "learning", 42: "learning", 43: "learning",
  44: "wisdom", 45: "governance", 46: "friendship", 47: "governance", 48: "governance",
  49: "governance", 50: "governance", 51: "governance", 52: "governance", 53: "friendship",
  54: "governance", 55: "governance", 56: "governance", 57: "governance", 58: "governance",
  59: "governance", 60: "effort", 61: "effort", 62: "effort", 63: "effort",
  64: "governance", 65: "governance", 66: "effort", 67: "governance", 68: "governance",
  69: "governance", 70: "governance", 71: "governance", 72: "governance", 73: "governance",
  74: "governance", 75: "governance", 76: "wealth",
  77: "governance", 78: "governance",
  79: "friendship", 80: "friendship", 81: "friendship", 82: "friendship", 83: "friendship",
  84: "wisdom", 85: "learning", 86: "friendship", 87: "friendship", 88: "friendship",
  89: "friendship", 90: "friendship", 91: "friendship", 92: "friendship",
  93: "calm", 94: "calm", 95: "calm",
  96: "wisdom", 97: "wisdom", 98: "equality", 99: "wisdom", 100: "compassion",
  101: "wealth", 102: "calm", 103: "family", 104: "effort", 105: "impermanence",
  106: "impermanence", 107: "impermanence", 108: "wisdom"
};
for (let c = 109; c <= 133; c++) CHAPTER_THEMES[c] = "love";

/* ---------- couplet helpers ---------- */

const clean = (s) =>
  String(s)
    .replace(/\s+/g, " ")
    .replace(/([,;:!?])-/g, "$1 ") // Pope's decorative dash after punctuation
    .replace(/([,;:.!?])(?=[A-Za-z\u2018'])/g, "$1 ") // restore lost spaces after punctuation
    .replace(/\((?=[A-Za-z])/g, " (")
    .trim()
    .replace(/^['"](?=[a-z])/, "") // stray leading quote before lowercase
    .replace(/\s+([,;:.!?])/g, "$1");
const stripTaPeriod = (s) => clean(s).replace(/\.$/, "");

// Pope couplets are stored as one string; split into the two verse lines.
// Kural lines are near-equal, so we consider every "; "/"，" boundary, score it
// by distance from the midpoint, and prefer boundaries where a new verse line
// plausibly starts (next char capitalised / preceding ";" separator).
function splitCouplet(couplet) {
  const s = clean(couplet);
  const mid = s.length / 2;
  const cands = [];
  for (const m of s.matchAll(/; |, |\? |! |: /g)) {
    const p = m.index + m[0].length;
    const nextUpper = /^[A-Z\u2018']/.test(s.slice(p));
    const score = Math.abs(p - mid) - (nextUpper ? 15 : 0) - (m[0] === "; " ? 3 : 0);
    cands.push({ p, score });
  }
  // lost newline in source: lowercase directly glued to a capital ("shed'Tis", "compareThe")
  for (const m of s.matchAll(/(?<=[a-z])'(?=[A-Z])|(?<=[a-z])(?=[A-Z])/g)) {
    cands.push({ p: m.index, score: Math.abs(m.index - mid) - 25 });
  }
  // weak candidates: a space before a capital (second verse line often starts thus)
  for (const m of s.matchAll(/ (?=[A-Z])/g)) {
    cands.push({ p: m.index + 1, score: Math.abs(m.index + 1 - mid) - 8 });
  }
  if (cands.length === 0) return [s, ""];
  cands.sort((a, b) => a.score - b.score);
  const best = cands[0].p;
  return [s.slice(0, best).trim(), s.slice(best).trim()];
}

/* ---------- build ---------- */

const byNumber = new Map(couplets.map((k) => [k.Number, k]));
const kurals = [];
let overridesApplied = 0;
let singleLine = 0;

for (let n = 1; n <= 1330; n++) {
  const k = byNumber.get(n);
  if (!k) throw new Error(`missing kural ${n}`);
  const ch = chapterByKural[n];
  if (!ch) throw new Error(`no chapter for kural ${n}`);

  const [en1, en2] = splitCouplet(k.couplet);
  if (!en2) singleLine++;

  const c = curated[String(n)];
  let simple, ta, tr, en;
  if (c) {
    // originally hand-curated entry: keep its text layers verbatim
    ta = c.ta.map(stripTaPeriod);
    tr = c.tr.map(clean);
    en = [clean(c.en[0]), clean(c.en[1])];
    simple = clean(c.s);
    overridesApplied++;
  } else {
    ta = [stripTaPeriod(k.Line1), stripTaPeriod(k.Line2)];
    tr = [clean(k.transliteration1), clean(k.transliteration2)];
    en = [en1, en2];
    simple = clean(k.explanation);
  }

  kurals.push({ n, ta, tr, en, s: simple, ch: ch.n, sec: ch.sec, th: CHAPTER_THEMES[ch.n] });
}

/* ---------- write ---------- */

const J = (o) => JSON.stringify(o);
const out = `/* Thirukkural — complete collection (1,330 couplets) for the Tamil Stoic app.
 *
 * Tamil couplets: standard (Parimelalagar-based) recension.
 * English verse translations and prose explanations: G. U. Pope with
 * Drew, Lazarus & Ellis, 1886 — public domain.
 * Some simple-English glosses are original to this app (see scripts/curated-overrides.json).
 * Generated by scripts/build-kurals.mjs — do not edit by hand.
 */
window.KURALS = [
${kurals.map((k) => "  " + J(k)).join(",\n")}
];

window.CHAPTERS = [
${chapters.map((c) => "  " + J(c)).join(",\n")}
];

window.SECTIONS = ${J(SECTIONS)};

window.THEMES = ${J(THEMES)};
`;

fs.writeFileSync(path.join(repo, "data", "kurals.js"), out);

/* ---------- report ---------- */

const themeCounts = {};
for (const k of kurals) themeCounts[k.th] = (themeCounts[k.th] || 0) + 1;
const sizeKB = (fs.statSync(path.join(repo, "data", "kurals.js")).size / 1024).toFixed(0);

console.log(`kurals written : ${kurals.length}`);
console.log(`file size      : ${sizeKB} KB`);
console.log(`overrides used : ${overridesApplied} (curated glosses)`);
console.log(`1-line couplets: ${singleLine}`);
console.log(`chapters       : ${chapters.length}`);
console.log(`theme spread   :`, themeCounts);
