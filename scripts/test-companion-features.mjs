/**
 * jsdom integration checks for the installable, private Kural Companion.
 *
 * Run after installing the test-only dependency:
 *   npm install --no-save jsdom
 *   node scripts/test-companion-features.mjs
 *
 * Covers the browser-facing experience:
 *  - PWA metadata, icons, deployment inputs, and service-worker registration
 *  - install prompt behaviour (including the iOS Add to Home Screen explanation)
 *  - private saved Kurals and reflections
 *  - native share, copy-link fallback, and downloadable bilingual share card
 *  - saved collection dialog and reading/accessibility preferences
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log("  ✓", message);
  } else {
    console.error("  ✗ FAIL:", message);
    failed += 1;
  }
}

const wait = (window, ms = 0) => new Promise((resolve) => window.setTimeout(resolve, ms));

function installBrowserMocks(window, { ios = false, waiting = false, fileShare = false } = {}) {
  const shares = [];
  const copies = [];
  const downloads = [];
  const drawnText = [];
  const updateMessages = [];
  let registeredUrl = null;
  const waitingWorker = waiting ? {
    postMessage(message) { updateMessages.push(message); },
  } : null;

  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: ios
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (X11; Linux x86_64) Chrome/123 Safari/537.36",
  });

  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };

  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      controller: waiting ? {} : null,
      register(url) {
        registeredUrl = url;
        return Promise.resolve({
          waiting: waitingWorker,
          installing: null,
          addEventListener() {},
        });
      },
      addEventListener() {},
    },
  });
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText(value) {
        copies.push(value);
        return Promise.resolve();
      },
    },
  });
  Object.defineProperty(window.navigator, "share", {
    configurable: true,
    value(payload) {
      shares.push(payload);
      return Promise.resolve();
    },
  });
  if (fileShare) {
    Object.defineProperty(window.navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
  }

  // jsdom does not implement dialog or canvas drawing. These shims model the
  // browser APIs the app uses, without changing production behaviour.
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new window.Event("close"));
  };
  window.HTMLCanvasElement.prototype.getContext = function () {
    return {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      textAlign: "left",
      textBaseline: "alphabetic",
      fillRect() {},
      strokeRect() {},
      beginPath() {},
      arc() {},
      fill() {},
      stroke() {},
      moveTo() {},
      lineTo() {},
      fillText(text) { drawnText.push(String(text)); },
      measureText(text) { return { width: String(text).length * 16 }; },
      createLinearGradient() { return { addColorStop() {} }; },
    };
  };
  window.HTMLCanvasElement.prototype.toBlob = function (callback) {
    callback(new window.Blob(["share-card"], { type: "image/png" }));
  };
  Object.defineProperty(window.URL, "createObjectURL", {
    configurable: true,
    value: () => "blob:share-card",
  });
  Object.defineProperty(window.URL, "revokeObjectURL", {
    configurable: true,
    value: () => {},
  });
  window.HTMLAnchorElement.prototype.click = function () {
    downloads.push({ href: this.href, download: this.download });
  };

  return {
    shares,
    copies,
    downloads,
    drawnText,
    updateMessages,
    get registeredUrl() { return registeredUrl; },
  };
}

async function boot(options = {}) {
  const html = read("index.html");
  const dom = new JSDOM(html, {
    url: "http://localhost:8000/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const mocks = installBrowserMocks(window, options);
  for (const rel of ["data/kurals.js", "js/storage.js", "js/app.js", "js/companion.js"]) {
    const script = window.document.createElement("script");
    script.textContent = read(rel);
    window.document.body.appendChild(script);
  }
  await window.TamilStoicApp.whenReady();
  await wait(window);
  return { window, document: window.document, mocks, dom };
}

console.log("static PWA contract:");
const html = read("index.html");
const workflow = read(".github/workflows/deploy.yml");
assert(html.includes('rel="manifest"') && html.includes("manifest.webmanifest"), "HTML links the web app manifest");
assert(html.includes("apple-touch-icon"), "HTML provides an Apple touch icon");
assert(html.includes('id="install-card"'), "HTML has an install guidance card");
assert(html.includes('id="saved-dialog"'), "HTML has a saved-Kurals dialog");
assert(html.includes('id="reader-settings-dialog"'), "HTML has a reading settings dialog");
assert(html.includes("js/storage.js") && html.includes("js/companion.js"), "HTML loads private storage and companion modules");
// The published PWA is the React build: Vite emits manifest.webmanifest, sw.js and
// the icons into app/dist, and the workflow ships that directory. The old static
// files stay in the repo as the parity reference, so they are still checked above.
assert(
  workflow.includes("npm run build") && workflow.includes("cp -r app/dist/."),
  "Pages workflow builds and publishes the React PWA bundle",
);
assert(!workflow.includes('"arena/**"') && workflow.includes("github.ref == 'refs/heads/main'"), "Pages workflow avoids protected-environment failures on feature branches");

assert(exists("manifest.webmanifest"), "manifest exists");
assert(exists("sw.js"), "service worker exists");
assert(exists("assets/icon-192.png") && exists("assets/icon-512.png") && exists("assets/apple-touch-icon.png"), "required PNG icons exist");
if (exists("manifest.webmanifest")) {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert(manifest.display === "standalone", "manifest requests standalone display");
  assert(manifest.start_url === "./" && manifest.scope === "./", "manifest uses relative Pages-safe start URL and scope");
  assert(manifest.icons.some((icon) => icon.sizes === "192x192"), "manifest includes a 192px install icon");
  assert(manifest.icons.some((icon) => icon.sizes === "512x512" && String(icon.purpose).includes("maskable")), "manifest includes a maskable 512px icon");
  assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 2, "manifest includes useful home-screen shortcuts");
}

console.log("\ncompanion interactions:");
const app = await boot();
const { window, document, mocks } = app;
assert(mocks.registeredUrl === "sw.js", "companion registers the relative service worker");
assert(document.querySelectorAll(".companion-actions").length >= 2, "daily and browse Kurals receive calm action controls");
assert(document.querySelector('#kural-1 [data-kural-action="save"]'), "each browse Kural has a Save action");
assert(document.querySelector('#kural-1 [data-kural-action="share"]'), "each browse Kural has native share action");
assert(document.querySelector('#kural-1 [data-kural-action="copy-link"]'), "each browse Kural has copy-link action");
assert(document.querySelector('#kural-1 [data-kural-action="share-card"]'), "each browse Kural has share-card action");

// Save privately and show it in the collection.
const save = document.querySelector('#kural-1 [data-kural-action="save"]');
save.click();
await wait(window);
await wait(window);
let saved = await window.TamilStoicApp.getSavedRecords();
assert(saved.length === 1 && saved[0].n === 1, "Save stores Kural 1 locally");
assert(save.getAttribute("aria-pressed") === "true", "Save control announces its selected state");
assert(document.getElementById("saved-count").textContent.trim() === "1", "saved counter updates after saving");

document.getElementById("saved-open").click();
assert(document.getElementById("saved-dialog").hasAttribute("open"), "Saved collection opens as a dialog");
assert(document.getElementById("saved-list").textContent.includes("கடவுள் வாழ்த்து"), "saved collection identifies the saved Kural");

// A reflection is private, text-based, and attached to the saved Kural.
document.querySelector('#kural-1 [data-kural-action="reflect"]').click();
assert(document.getElementById("reflection-dialog").hasAttribute("open"), "reflection editor opens as a dialog");
const reflection = document.getElementById("reflection-input");
reflection.value = "A quiet reminder for today.";
document.getElementById("reflection-form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
await wait(window);
await wait(window);
saved = await window.TamilStoicApp.getSavedRecords();
assert(saved[0].note === "A quiet reminder for today.", "reflection is saved with the private record");
assert(document.getElementById("saved-list").textContent.includes("A quiet reminder for today."), "saved collection renders the private reflection");

// Sharing pathways always include a deep link to the exact Kural.
document.querySelector('#kural-1 [data-kural-action="share"]').click();
await wait(window);
assert(mocks.shares.length === 1 && mocks.shares[0].url.endsWith("/#kural-1"), "native share payload deep-links to the Kural");
assert(mocks.shares[0].text.includes("அகர முதல") && mocks.shares[0].text.includes("Simple meaning:"), "native share text carries the bilingual Kural context");
document.querySelector('#kural-1 [data-kural-action="copy-link"]').click();
await wait(window);
assert(mocks.copies.length === 1 && mocks.copies[0].endsWith("/#kural-1"), "Copy link puts the Kural deep link on the clipboard");
document.querySelector('#kural-1 [data-kural-action="share-card"]').click();
await wait(window);
await wait(window);
assert(mocks.downloads.some((item) => item.download === "thirukkural-001.png"), "share-card action downloads a bilingual PNG when file sharing is unavailable");
assert(mocks.drawnText.some((text) => text.includes("அகர முதல")), "share card draws the Tamil couplet");
assert(mocks.drawnText.join(" ").includes(window.KURALS[0].s), "share card draws the current complete simple-English meaning");

// Dynamic daily rendering should retain actions after its existing shuffle control rerenders it.
document.getElementById("daily-shuffle").click();
await wait(window);
assert(document.querySelector('#daily-card [data-kural-action="share-card"]'), "daily shuffle keeps companion actions on the newly rendered Kural");

// Preferences are keyboard/screen-reader friendly controls and apply immediately.
document.getElementById("reader-settings-open").click();
assert(document.getElementById("reader-settings-dialog").hasAttribute("open"), "reading settings opens as a dialog");
document.querySelector('[data-preference="color-scheme"][data-value="dark"]').click();
assert(document.body.dataset.colorScheme === "dark", "dark reading preference is applied");
document.querySelector('[data-preference="font-size"][data-value="large"]').click();
assert(document.body.dataset.fontSize === "large", "larger text preference is applied");
document.querySelector('[data-preference="line-spacing"][data-value="relaxed"]').click();
assert(document.body.dataset.lineSpacing === "relaxed", "relaxed line-spacing preference is applied");
const transliterationToggle = document.getElementById("pref-show-transliteration");
transliterationToggle.checked = false;
transliterationToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
assert(document.body.dataset.showTransliteration === "false", "transliteration visibility preference is applied");
const tamilToggle = document.getElementById("pref-show-tamil");
tamilToggle.checked = false;
tamilToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
const translationToggle = document.getElementById("pref-show-translation");
translationToggle.checked = false;
translationToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
assert(document.body.dataset.showTamil === "false" && document.body.dataset.showTranslation === "false", "reader layers can be individually hidden");
const simpleToggle = document.getElementById("pref-show-simple");
simpleToggle.checked = false;
simpleToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
assert(document.body.dataset.showSimple === "true", "reader prevents every reading layer from being hidden");
const motionToggle = document.getElementById("pref-reduce-motion");
motionToggle.checked = true;
motionToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
assert(document.body.dataset.reduceMotion === "true", "reduced-motion preference is applied");
assert(document.querySelector("#kural-1 .kural-translit"), "existing reader content remains available for the visibility setting");

// The fallback storage adapter persists the private record across a new adapter instance.
const freshStorageScript = document.createElement("script");
freshStorageScript.textContent = read("js/storage.js");
document.body.appendChild(freshStorageScript);
const persisted = await window.TamilStoicStore.getAll();
assert(persisted.some((record) => record.n === 1 && record.note === "A quiet reminder for today."), "private reflection survives a fresh local storage adapter");
document.querySelector('[data-saved-action="remove"][data-kural="1"]').click();
await wait(window);
await wait(window);
assert((await window.TamilStoicApp.getSavedRecords()).length === 0 && document.getElementById("saved-count").textContent.trim() === "0", "saved collection can remove a private Kural cleanly");

// Chromium-style install prompt is deferred until a reader chooses it.
const installEvent = new window.Event("beforeinstallprompt", { cancelable: true });
let promptCalls = 0;
Object.defineProperty(installEvent, "prompt", { value: () => { promptCalls += 1; return Promise.resolve(); } });
Object.defineProperty(installEvent, "userChoice", { value: Promise.resolve({ outcome: "accepted" }) });
window.dispatchEvent(installEvent);
assert(!document.getElementById("install-card").hidden, "supported browsers receive a non-intrusive install card");
document.getElementById("install-action").click();
await wait(window);
assert(promptCalls === 1, "install button invokes the browser-owned prompt once");

console.log("\nupdate hand-off:");
const updateApp = await boot({ waiting: true });
await wait(updateApp.window);
assert(!updateApp.document.getElementById("update-banner").hidden, "an already-waiting update is explained instead of applied silently");
updateApp.document.getElementById("update-reload").click();
assert(updateApp.mocks.updateMessages.some((message) => message.type === "SKIP_WAITING"), "Update now requests worker activation only after the reader chooses it");

console.log("\nfile-sharing hand-off:");
const fileShareApp = await boot({ fileShare: true });
fileShareApp.document.querySelector('#kural-1 [data-kural-action="share-card"]').click();
await wait(fileShareApp.window);
await wait(fileShareApp.window);
assert(fileShareApp.mocks.shares.some((payload) => payload.files && payload.files.length === 1), "file-capable devices receive the PNG through the native share sheet");
assert(fileShareApp.mocks.downloads.length === 0, "file-capable share-card flow avoids an unnecessary download");

console.log("\niOS install guidance:");
const iosApp = await boot({ ios: true });
assert(!iosApp.document.getElementById("install-card").hidden, "iPhone/iPad readers see install guidance outside standalone mode");
assert(iosApp.document.getElementById("install-card").textContent.includes("Add to Home Screen"), "iOS guidance explains Add to Home Screen");

if (failed) {
  console.error(`\n${failed} companion check(s) failed`);
  process.exit(1);
}
console.log("\nall companion checks passed ✓");
