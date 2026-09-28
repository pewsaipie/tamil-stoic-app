/**
 * Colour-contrast regression test for css/styles.css.
 *
 *   node scripts/test-contrast.mjs
 *
 * Parses the real token blocks out of the stylesheet and recomputes WCAG 2.1
 * contrast ratios for every pair a reader actually sees, in both colour
 * schemes, including composited focus rings. Fails the build if any pair
 * drops below its threshold (4.5:1 for body text, 3:1 for large text and
 * non-text UI boundaries).
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const css = fs.readFileSync(new URL("css/styles.css", root), "utf8");

let failed = 0;
function assert(condition, message) {
  if (condition) console.log("  ✓", message);
  else { console.error("  ✗ FAIL:", message); failed += 1; }
}

function tokenBlock(pattern) {
  const match = css.match(pattern);
  if (!match) return {};
  const tokens = {};
  for (const part of match[1].split(";")) {
    const m = part.match(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|var\(\s*--[\w-]+\s*\))/);
    if (m) tokens["--" + m[1]] = m[2];
  }
  return tokens;
}

// Resolve one level of var() indirection against the given token set.
function resolve(tokens, name) {
  let value = tokens[name];
  if (!value) return null;
  const varMatch = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (varMatch) value = tokens[varMatch[1]] || null;
  return value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : null;
}

const light = tokenBlock(/:root\s*\{([\s\S]*?)\}/);
const darkOverrides = tokenBlock(/body\[data-color-scheme="dark"\]\s*\{([\s\S]*?)\}/);
const dark = { ...light, ...darkOverrides };

function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function composite(fg, alpha, bg) {
  const parse = (hex) => {
    const h = hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const f = parse(fg);
  const b = parse(bg);
  const out = f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Pairs the reader actually sees: [foreground token, background token, label]
const TEXT_PAIRS = [
  ["--ink", "--bg", "body text on page"],
  ["--ink", "--card", "verse text on cards"],
  ["--ink-soft", "--bg", "secondary text on page"],
  ["--ink-soft", "--card", "secondary text on cards"],
  ["--ink-faint", "--card", "transliteration / labels on cards (C1)"],
  ["--ink-faint", "--bg", "transliteration / labels on page (C1)"],
  ["--count-ink", "--card", "theme chip counts (C2)"],
  ["--terracotta", "--card", "accent numerals on cards"],
  ["--green", "--bg", "eyebrow green on page"],
  ["--green-ink", "--green-soft", "active chip / saved badge text"],
  ["--gold-text", "--card", "small gold text on cards (C4)"],
  ["--btn-primary-ink", "--btn-primary-bg", "primary filled buttons (C3)"],
  ["--btn-accent-ink", "--btn-accent-bg", "accent filled buttons / seals (C3)"],
  ["--ink", "--gold-soft", "onboarding card text"],
];

for (const [schemeName, tokens] of [["light", light], ["dark", dark]]) {
  console.log(`\n${schemeName} scheme:`);
  for (const [fgName, bgName, label] of TEXT_PAIRS) {
    const fg = resolve(tokens, fgName);
    const bg = resolve(tokens, bgName);
    if (!fg || !bg) {
      assert(false, `${label}: missing token ${!fg ? fgName : bgName}`);
      continue;
    }
    const value = ratio(fg, bg);
    assert(value >= 4.5, `${label}: ${fgName} on ${bgName} = ${value.toFixed(2)}:1`);
  }
}

// Non-text boundaries: focus ring vs page and vs cards (3:1 requirement).
console.log("\nfocus indicators:");
for (const [schemeName, tokens] of [["light", light], ["dark", dark]]) {
  const ring = resolve(tokens, "--green");
  const onPage = ratio(ring, resolve(tokens, "--bg"));
  const onCard = ratio(ring, resolve(tokens, "--card"));
  assert(onPage >= 3, `${schemeName} focus ring vs page = ${onPage.toFixed(2)}:1`);
  assert(onCard >= 3, `${schemeName} focus ring vs cards = ${onCard.toFixed(2)}:1`);
}

// Static guards against the regressions this suite was written for.
console.log("\nstatic guards:");
assert(!css.includes("--ink-faint: #8f8375"), "old failing ink-faint token is gone");
assert(/\.chip \.count\s*\{[^}]*opacity/.test(css) === false, "chip counts no longer rely on opacity");
assert(/:focus-visible\s*\{[^}]*var\(--green\)/.test(css), "focus ring uses the solid green token");
assert(css.includes('--ink-faint: #75695a'), "accessible ink-faint token present");
assert(css.includes("--btn-primary-bg") && css.includes("--btn-accent-bg"), "filled buttons use dedicated token pairs");

if (failed) {
  console.error(`\n${failed} contrast check(s) failed`);
  process.exit(1);
}
console.log("\nall contrast checks passed ✓");
