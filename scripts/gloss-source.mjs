/*
 * gloss-source.mjs — prints compact `#n|explanation` lines for a kural range
 * (inclusive), skipping the 29 hand-curated entries. Used while authoring
 * scripts/glosses/*.json batches.
 *
 * Run: node scripts/gloss-source.mjs <start> <end>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATASETS = process.env.DATASETS_DIR || path.resolve(here, "..", "..", "datasets");
const SRC = path.join(DATASETS, "tk120404_thirukkural", "thirukkural.json");

const start = parseInt(process.argv[2] || "1", 10);
const end = parseInt(process.argv[3] || "1330", 10);
const curated = JSON.parse(fs.readFileSync(path.join(here, "curated-overrides.json"), "utf8"));

const couplets = JSON.parse(fs.readFileSync(SRC, "utf8")).kural;
const byNumber = new Map(couplets.map((k) => [k.Number, k]));

const cap = (s) => {
  s = String(s).replace(/\s+/g, " ").trim();
  return s.length > 300 ? s.slice(0, 297) + "..." : s;
};

for (let n = start; n <= end; n++) {
  if (curated[String(n)]) continue;
  const k = byNumber.get(n);
  if (!k) continue;
  console.log(`#${n}|${cap(k.explanation)}`);
}
