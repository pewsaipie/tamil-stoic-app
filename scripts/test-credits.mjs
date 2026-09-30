import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const app = read("js/app.js");
const worker = read("sw.js");
const workflow = read(".github/workflows/deploy.yml");
const notices = read("THIRD_PARTY_NOTICES.md");

assert.match(html, /<section class="credits-section" id="credits"/, "credits are a visible application section");
for (const phrase of [
  "tk120404/thirukkural",
  "G. U. Pope",
  "W. H. Drew",
  "John Lazarus",
  "F. W. Ellis",
  "Inter",
  "EB Garamond",
  "Noto Serif Tamil",
  "Fontsource",
  "MIT License",
  "Apache-2.0.txt",
  "OFL-1.1.txt",
  "THIRD_PARTY_NOTICES.md",
]) {
  assert.ok(html.includes(phrase), `in-app credits mention ${phrase}`);
}
for (const key of ["credits.title", "credits.intro", "credits.kural.body", "credits.fonts.body", "footer.credits"]) {
  assert.ok(app.includes(`"${key}"`), `Tamil UI translation exists for ${key}`);
}
for (const file of ["assets/licenses/MIT.txt", "assets/licenses/Apache-2.0.txt", "assets/licenses/OFL-1.1.txt"]) {
  const text = read(file);
  assert.ok(text.length > 1000, `${file} contains a full license text`);
  assert.ok(worker.includes(`./${file}`), `${file} is precached for offline access`);
}
assert.match(notices, /tk120404\/thirukkural[\s\S]*Apache License, Version 2\.0/);
assert.match(notices, /G\. U\. Pope[\s\S]*public domain/);
assert.match(notices, /SIL Open Font License/);
assert.match(workflow, /cp index\.html manifest\.webmanifest sw\.js LICENSE THIRD_PARTY_NOTICES\.md _site/);
console.log("open-source credits and license checks passed ✓");
