/**
 * axe-core accessibility smoke test for the Tamil Stoic app.
 *
 *   npm install --no-save jsdom axe-core
 *   node scripts/test-a11y.mjs
 *
 * Boots the real page (all four scripts), opens every dialog, and asserts
 * axe reports zero violations with the rules that need a real layout engine
 * disabled (colour contrast is covered by scripts/test-contrast.mjs, which
 * recomputes the actual token pairs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import axe from "axe-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let failed = 0;
function assert(condition, message) {
  if (condition) console.log("  ✓", message);
  else { console.error("  ✗ FAIL:", message); failed += 1; }
}

const wait = (window, ms = 0) => new Promise((resolve) => window.setTimeout(resolve, ms));

const dom = new JSDOM(read("index.html"), {
  url: "http://localhost:8000/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
});
const { window } = dom;
const { document } = window;

// Minimal shims for APIs jsdom lacks; production code paths are unchanged.
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
window.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
window.HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
  this.dispatchEvent(new window.Event("close"));
};

for (const rel of ["data/kurals.js", "js/storage.js", "js/app.js", "js/companion.js"]) {
  const script = document.createElement("script");
  script.textContent = read(rel);
  document.body.appendChild(script);
}
await window.TamilStoicApp.whenReady();
await wait(window);

// Inject axe into the page context.
const axeScript = document.createElement("script");
axeScript.textContent = axe.source;
document.body.appendChild(axeScript);
assert(typeof window.axe === "object" && typeof window.axe.run === "function", "axe-core injected into the page");

const AXE_OPTIONS = {
  rules: {
    // Needs a real layout engine; covered by test-contrast.mjs instead.
    "color-contrast": { enabled: false },
    // jsdom has no CSS layout, so media-query reflow rules can't be evaluated.
    "target-size": { enabled: false },
  },
  resultTypes: ["violations"],
};

async function runAxe(label) {
  const results = await window.axe.run(document, AXE_OPTIONS);
  const violations = results.violations || [];
  if (violations.length) {
    console.error(`  ✗ FAIL: ${label}: ${violations.length} violation(s)`);
    for (const v of violations) {
      console.error(`      [${v.impact}] ${v.id}: ${v.help}`);
      v.nodes.slice(0, 4).forEach((n) => console.error("        - " + n.target.join(" ")));
    }
    failed += violations.length;
  } else {
    assert(true, `${label}: no axe violations`);
  }
  return violations;
}

// Sanity check: axe must be able to fail, or the green run means nothing.
const decoy = document.createElement("img");
decoy.src = "about:blank";
document.querySelector(".site-header").appendChild(decoy);
const decoyResults = await window.axe.run(document, AXE_OPTIONS);
assert(
  (decoyResults.violations || []).some((v) => v.id === "image-alt"),
  "axe detects a planted image-alt violation (suite is not vacuous)"
);
decoy.remove();

console.log("page shell:");
await runAxe("base page");

console.log("\ndialogs open:");
const dialogs = [
  ["saved-dialog", () => document.getElementById("saved-open").click()],
  ["reflection-dialog", () => document.querySelector('#kural-1 [data-kural-action="reflect"]').click()],
  ["reader-settings-dialog", () => document.getElementById("reader-settings-open").click()],
  ["palette-dialog", () => document.getElementById("palette-open").click()],
  ["shortcuts-dialog", () => document.getElementById("palette-open") && null],
  ["onboarding-dialog", () => document.getElementById("onboarding-start").click()],
  ["focus-dialog", () => document.querySelector('#kural-1 [data-app-action="focus"]').click()],
];

// Shortcuts dialog opens through the app helper; use its own open path.
for (const [id, open] of dialogs) {
  if (id === "shortcuts-dialog") {
    const event = new window.KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true });
    document.dispatchEvent(event);
  } else {
    open();
  }
  await wait(window, 10);
  const dialog = document.getElementById(id);
  assert(dialog && dialog.hasAttribute("open"), `${id} is open for inspection`);
  await runAxe(id);
  if (dialog && dialog.hasAttribute("open")) {
    dialog.removeAttribute("open");
    if (typeof dialog.close === "function") { try { dialog.close(); } catch (e) { /* shim */ } }
  }
  await wait(window, 5);
}

console.log("\nfiltered state:");
document.querySelector('.chip[data-theme="wisdom"]').click();
document.getElementById("chapter-intro");
await runAxe("theme filter active");

if (failed) {
  console.error(`\n${failed} accessibility check(s) failed`);
  process.exit(1);
}
console.log("\nall accessibility checks passed ✓");
