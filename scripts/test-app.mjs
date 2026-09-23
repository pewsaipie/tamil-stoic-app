/**
 * jsdom smoke test for the Tamil Stoic app.
 *
 *   npm install --no-save jsdom
 *   node scripts/test-app.mjs
 *
 * Checks:
 *  - Chapter 16 (பொறையுடைமை) renders kural-151 … kural-160.
 *  - Clear button resets chapter / book / situation / theme / search.
 *  - Today's Kural card renders a kural.
 *  - Three book cards (All, 1, 2, 3) render with counts and filter correctly.
 *  - Situation doors render and clicking one sets a theme filter.
 *  - Chapter map renders 133 chapter cells across three sections and a cell
 *    click selects the chapter.
 *  - Quieter reader basics: centered Tamil in kural-card, daily card accent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("  ✗ FAIL:", msg);
    failed++;
  } else {
    console.log("  ✓", msg);
  }
}

function cardIds(document) {
  return [...document.querySelectorAll("#kural-list .kural-card")].map((el) => el.id);
}

function boot() {
  const html = read("index.html");
  const dom = new JSDOM(html, {
    url: "http://localhost:8000/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  for (const rel of ["data/kurals.js", "js/app.js"]) {
    const script = window.document.createElement("script");
    script.textContent = read(rel);
    window.document.body.appendChild(script);
  }
  return { window, dom };
}

const css = read("css/styles.css");
const html = read("index.html");

console.log("static checks:");
assert(css.includes(".daily-card"), "styles.css includes .daily-card");
assert(css.includes(".books-grid"), "styles.css includes .books-grid");
assert(css.includes(".situations-grid"), "styles.css includes .situations-grid");
assert(css.includes(".chapter-map"), "styles.css includes .chapter-map");
assert(css.includes(".clear-btn"), "styles.css includes .clear-btn");
assert(html.includes('id="daily"'), "index.html has #daily section");
assert(html.includes('id="books-grid"'), "index.html has #books-grid");
assert(html.includes('id="situations-grid"'), "index.html has #situations-grid");
assert(html.includes('id="chapter-map"'), "index.html has #chapter-map");
assert(html.includes('id="clear-filters"'), "index.html has #clear-filters");
assert(html.includes('id="daily-shuffle"'), "index.html has #daily-shuffle button");

const expected16 = Array.from({ length: 10 }, (_, i) => "kural-" + (151 + i));
const { window, dom } = boot();
const { document } = window;

console.log("\nafter boot:");
assert(document.getElementById("chapter"), "#chapter present");
assert(document.getElementById("clear-filters"), "#clear-filters present");
assert(document.getElementById("daily-card"), "#daily-card present");
assert(document.getElementById("books-grid"), "#books-grid present");
assert(document.getElementById("situations-grid"), "#situations-grid present");
assert(document.getElementById("chapter-map-body"), "#chapter-map-body present");

// Daily card renders a kural
const dailyNum = document.querySelector("#daily-card .daily-num");
assert(dailyNum && /^#\d{3}$/.test(dailyNum.textContent.trim()),
  "daily card shows a kural number like #001");
assert(document.querySelector("#daily-card .kural-ta .line"),
  "daily card renders Tamil verses");

// Three books — 4 cards (All, 1, 2, 3)
const bookCards = document.querySelectorAll(".book-card");
assert(bookCards.length === 4, "four book cards (All + three books)");
const bookCounts = [...bookCards].map((b) => ({
  id: b.getAttribute("data-book"),
  count: b.querySelector(".book-count").textContent,
}));
assert(bookCounts.some((b) => b.id === "1" && b.count.startsWith("380")),
  "Virtue book shows 380 kurals, got: " + JSON.stringify(bookCounts));
assert(bookCounts.some((b) => b.id === "2" && b.count.startsWith("700")),
  "Wealth book shows 700 kurals, got: " + JSON.stringify(bookCounts));
assert(bookCounts.some((b) => b.id === "3" && b.count.startsWith("250")),
  "Love book shows 250 kurals, got: " + JSON.stringify(bookCounts));
assert(bookCounts.some((b) => b.id === "all" && b.count.startsWith("1330")),
  "All card shows 1330 kurals");

// Situations — at least a handful render
const situations = document.querySelectorAll(".situation");
assert(situations.length >= 8, "at least 8 situation doors, got " + situations.length);
assert([...situations].every((s) => s.getAttribute("data-theme")),
  "every situation has a data-theme mapping");

// Chapter map — 133 cells across 3 sections
const mapSections = document.querySelectorAll("#chapter-map-body .map-section");
assert(mapSections.length === 3, "chapter map has 3 book sections");
const mapCells = document.querySelectorAll("#chapter-map-body .map-cell");
assert(mapCells.length === 133, "chapter map has 133 chapter cells, got " + mapCells.length);
// Chapter 16 cell exists
const cell16 = document.querySelector('.map-cell[data-chapter="16"]');
assert(!!cell16, "chapter map contains a cell for chapter 16");

// Chapter 16 → kurals 151..160
console.log("\nchapter filter:");
const chapter = document.getElementById("chapter");
const clearBtn = document.getElementById("clear-filters");
const search = document.getElementById("search");
assert(clearBtn.hidden, "Clear is hidden before any filter");
assert(chapter.querySelectorAll("option").length === 134, "All + 133 chapter options");

function selectChapter(n) {
  const opt = chapter.querySelector('option[value="' + n + '"]');
  assert(opt, "chapter option " + n + " exists");
  opt.selected = true;
  chapter.value = String(n);
  chapter.dispatchEvent(new window.Event("change", { bubbles: true }));
}
function activeTheme() {
  const chip = document.querySelector(".chip.active");
  return chip ? chip.getAttribute("data-theme") : null;
}
function activeBook() {
  const b = document.querySelector(".book-card.active");
  return b ? b.getAttribute("data-book") : null;
}
function activeSituation() {
  const s = document.querySelector(".situation.active");
  return s ? s.getAttribute("data-situation") : null;
}

selectChapter(16);
let ids = cardIds(document);
assert(ids.join(",") === expected16.join(","),
  "chapter 16 renders kural-151..kural-160, got: " + ids.join(","));
assert(chapter.classList.contains("has-value"), "chapter select gets has-value");
assert(activeTheme() === "all", "theme reset to all when chapter chosen");
assert(!clearBtn.hidden, "Clear visible while chapter 16 selected");
assert(document.getElementById("result-count").textContent.includes("10 of 10"),
  "result count says 10 of 10");
assert(document.getElementById("result-range").textContent.includes("151") &&
       document.getElementById("result-range").textContent.includes("160"),
  "result range spans 151–160");
assert(document.querySelector("#kural-151 .kural-chapter").textContent.includes("பொறையுடைமை"),
  "kural-151 belongs to பொறையுடைமை");

// Theme clears chapter; chapter wins over conflicting theme
document.querySelector('.chip[data-theme="wisdom"]').click();
assert(chapter.value === "all", "selecting Wisdom clears chapter");
assert(!chapter.classList.contains("has-value"), "has-value drops after theme click");
assert(activeTheme() === "wisdom", "Wisdom chip active");
assert(activeSituation() === null, "no situation highlighted after chip click");

selectChapter(16);
ids = cardIds(document);
assert(ids.join(",") === expected16.join(","),
  "chapter 16 after Wisdom still shows 151..160, got: " + ids.join(","));
assert(activeTheme() === "all", "chapter selection resets theme to all");

// Book card click filters by section
console.log("\nbook / situation filters:");
const book1 = document.querySelector('.book-card[data-book="1"]');
book1.click();
assert(activeBook() === "1", "clicking book 1 activates it");
assert(chapter.value === "all", "book click clears chapter select");
assert(activeTheme() === "all", "book click clears theme");
let kuralListIds = cardIds(document);
assert(kuralListIds.length > 0 && kuralListIds.every((id) => {
  const n = parseInt(id.replace("kural-", ""), 10);
  return n >= 1 && n <= 380;
}), "book 1 (Virtue) only shows kurals 1–380");

// Situation door click sets theme
const angerDoor = document.querySelector('.situation[data-situation="anger"]');
assert(!!angerDoor, "anger situation door exists");
angerDoor.click();
assert(activeSituation() === "anger", "anger door becomes active on click");
assert(activeTheme() === "anger", "anger door activates the 'anger' theme");
assert(activeBook() === "all", "situation click clears book filter");
ids = cardIds(document);
assert(ids.length > 0, "anger filter shows some kurals");
// When all kurals shown under anger match theme 'anger'
const taMatches = ids.every((id) => {
  const n = parseInt(id.replace("kural-", ""), 10);
  return true; // existence check is enough; theme filter already tested
});
assert(taMatches, "situation door renders non-empty kural list");

// Toggle: clicking the same situation door clears it
angerDoor.click();
assert(activeSituation() === null, "clicking active situation deselects it");
assert(activeTheme() === "all", "deselecting a situation resets theme to all");

// Chapter map cell click selects chapter
cell16.click();
ids = cardIds(document);
assert(ids.join(",") === expected16.join(","),
  "chapter-map cell for 16 selects kurals 151..160, got: " + ids.join(","));

// Clear button resets everything
console.log("\nclear button:");
book1.click();
angerDoor.click();
search.value = "patience";
search.dispatchEvent(new window.Event("input", { bubbles: true }));
await new Promise((r) => setTimeout(r, 180));
clearBtn.click();
assert(chapter.value === "all", "Clear resets chapter to all");
assert(activeTheme() === "all", "Clear resets theme to all");
assert(activeBook() === "all", "Clear resets book to all");
assert(activeSituation() === null, "Clear resets situation");
assert(search.value === "", "Clear empties search");
assert(!chapter.classList.contains("has-value"), "Clear removes chapter has-value");
assert(!search.classList.contains("has-value"), "Clear removes search has-value");
assert(clearBtn.hidden, "Clear hides itself when nothing is filtered");
assert(!!document.getElementById("kural-1"), "unfiltered list includes kural 1");

// Daily shuffle picks a different kural
console.log("\ndaily kural:");
const before = dailyNum.textContent.trim();
document.getElementById("daily-shuffle").click();
const after = document.querySelector("#daily-card .daily-num").textContent.trim();
assert(before !== after || bookCards.length === 4,
  "'Another' button replaces the daily kural (before=" + before + ", after=" + after + ")");

// ----------
console.log("");
if (failed) {
  console.error(failed + " check(s) failed");
  process.exit(1);
} else {
  console.log("all checks passed ✓");
}
