/**
 * jsdom check for the chapter filter.
 *
 *   npm install --no-save jsdom
 *   node scripts/test-chapter-filter.mjs
 *
 * Chapter 16 (பொறையுடைமை) must render kural-151 … kural-160, including when a
 * conflicting theme chip was active (theme and chapter are mutually exclusive).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const expected = Array.from({ length: 10 }, (_, i) => "kural-" + (151 + i));

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

function cardIds(document) {
  return [...document.querySelectorAll(".kural-card")].map((el) => el.id);
}

function boot() {
  const html = read("index.html");
  const dom = new JSDOM(html, {
    url: "http://localhost:8000/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  // Insert as classic scripts so `window` / `document` bind like the browser.
  for (const rel of ["data/kurals.js", "js/app.js"]) {
    const script = window.document.createElement("script");
    script.textContent = read(rel);
    window.document.body.appendChild(script);
  }
  return window;
}

function selectChapter(window, n) {
  const chapter = window.document.getElementById("chapter");
  const opt = chapter.querySelector('option[value="' + n + '"]');
  assert(opt, "chapter option " + n + " missing");
  opt.selected = true;
  chapter.value = String(n);
  chapter.dispatchEvent(new window.Event("change", { bubbles: true }));
  return chapter;
}

function activeTheme(document) {
  const chip = document.querySelector(".chip.active");
  return chip ? chip.getAttribute("data-theme") : null;
}

const css = read("css/styles.css");
const html = read("index.html");
assert(css.includes(".chapter-select.has-value"), "styles.css missing .chapter-select.has-value");
assert(css.includes(".clear-btn"), "styles.css missing .clear-btn");
assert(html.includes('id="clear-filters"'), "index.html missing #clear-filters");

const window = boot();
const { document } = window;
const chapter = document.getElementById("chapter");
const clearBtn = document.getElementById("clear-filters");
const search = document.getElementById("search");

assert(chapter, "#chapter missing after boot");
assert(clearBtn, "#clear-filters missing after boot");
assert(clearBtn.hidden, "Clear should be hidden before any filter");
assert(!chapter.classList.contains("has-value"), "chapter should not have has-value initially");
assert(chapter.querySelectorAll("option").length === 134, "expected All + 133 chapter options");

// --- chapter 16 shows kural-151..160 ---
selectChapter(window, 16);
let ids = cardIds(document);
assert(
  ids.join(",") === expected.join(","),
  "chapter 16 should show kural-151..160, got: " + ids.join(",")
);
assert(chapter.classList.contains("has-value"), "chapter select missing has-value after chapter 16");
assert(chapter.value === "16", "chapter value should be 16, got " + chapter.value);
assert(activeTheme(document) === "all", "theme should reset to all when a chapter is chosen");
assert(!clearBtn.hidden, "Clear should be visible while chapter 16 is selected");
assert(
  document.getElementById("result-count").textContent.includes("10 of 10"),
  "result count should report 10 of 10, got: " + document.getElementById("result-count").textContent
);
assert(
  document.getElementById("result-range").textContent.includes("151") &&
    document.getElementById("result-range").textContent.includes("160"),
  "result range should span 151–160, got: " + document.getElementById("result-range").textContent
);
assert(
  document.querySelector("#kural-151 .kural-chapter").textContent.includes("பொறையுடைமை"),
  "kural 151 should belong to பொறையுடைமை"
);

// --- theme clears chapter; chapter still wins over a conflicting theme ---
document.querySelector('.chip[data-theme="wisdom"]').click();
assert(chapter.value === "all", "selecting Wisdom should clear the chapter");
assert(!chapter.classList.contains("has-value"), "has-value should drop when chapter is cleared");
assert(activeTheme(document) === "wisdom", "Wisdom chip should be active");
assert(!cardIds(document).includes("kural-151"), "Wisdom filter must not include kural 151");
assert(!clearBtn.hidden, "Clear should stay visible while a theme is active");

selectChapter(window, 16);
ids = cardIds(document);
assert(
  ids.join(",") === expected.join(","),
  "chapter 16 after Wisdom should still show kural-151..160, got: " + ids.join(",")
);
assert(activeTheme(document) === "all", "selecting a chapter should clear the theme chip");
assert(chapter.classList.contains("has-value"), "has-value missing after re-selecting chapter 16");

// --- Clear resets chapter, theme, search, and has-value ---
search.value = "patience";
search.dispatchEvent(new window.Event("input", { bubbles: true }));
await new Promise((r) => setTimeout(r, 180));
assert(search.classList.contains("has-value"), "search should get has-value while a query is set");
assert(cardIds(document).join(",") === expected.join(","), "search within chapter 16 should keep 151–160");

clearBtn.click();
assert(chapter.value === "all", "Clear should reset chapter to all");
assert(activeTheme(document) === "all", "Clear should reset theme to all");
assert(search.value === "", "Clear should empty the search box");
assert(!chapter.classList.contains("has-value"), "Clear should remove chapter has-value");
assert(!search.classList.contains("has-value"), "Clear should remove search has-value");
assert(clearBtn.hidden, "Clear should hide itself when nothing is filtered");
assert(document.getElementById("kural-1"), "unfiltered list should include kural 1");
assert(!document.getElementById("kural-151") || cardIds(document).length > 10, "Clear should leave the chapter-16-only view");

console.log("ok: chapter 16 shows kural-151..160");
console.log("ok: theme/chapter mutually exclusive, clear button, has-value styling");
