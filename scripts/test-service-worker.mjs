/**
 * Unit checks for sw.js without a browser.
 *
 *   node scripts/test-service-worker.mjs
 *
 * Confirms that the installable app precaches its shell, keeps offline copies,
 * cleans up old caches, and only activates an update after the reader requests it.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "sw.js"), "utf8");
let failed = 0;
function assert(condition, message) {
  if (condition) console.log("  ✓", message);
  else { console.error("  ✗ FAIL:", message); failed += 1; }
}

const listeners = new Map();
let skipWaitingCalls = 0;
let claimCalls = 0;
let fetchMode = "online";
const stores = new Map();
function cacheFor(name) {
  if (!stores.has(name)) {
    const entries = new Map();
    stores.set(name, {
      entries,
      addAll: async (urls) => urls.forEach((url) => entries.set(new URL(url, "https://example.test/app/").href, new Response("cached " + url))),
      put: async (request, response) => entries.set(typeof request === "string" ? new URL(request, "https://example.test/app/").href : request.url, response.clone()),
      match: async (request) => entries.get(typeof request === "string" ? new URL(request, "https://example.test/app/").href : request.url),
    });
  }
  return stores.get(name);
}
const caches = {
  open: async (name) => cacheFor(name),
  keys: async () => [...stores.keys()],
  delete: async (name) => stores.delete(name),
  match: async (request) => {
    for (const store of stores.values()) {
      const found = await store.match(request);
      if (found) return found;
    }
    return undefined;
  },
};
const self = {
  location: new URL("https://example.test/app/sw.js"),
  addEventListener(type, callback) { listeners.set(type, callback); },
  skipWaiting() { skipWaitingCalls += 1; return Promise.resolve(); },
  clients: { claim() { claimCalls += 1; return Promise.resolve(); } },
};
const context = vm.createContext({
  self,
  caches,
  URL,
  Request,
  Response,
  fetch: async (request) => {
    if (fetchMode === "offline") throw new Error("offline");
    return new Response("network " + request.url, { status: 200 });
  },
  console,
});
vm.runInContext(source, context, { filename: "sw.js" });

assert(listeners.has("install") && listeners.has("activate") && listeners.has("fetch") && listeners.has("message"), "service worker registers lifecycle and message handlers");

async function dispatchWait(type) {
  let pending;
  listeners.get(type)({ waitUntil(promise) { pending = promise; } });
  await pending;
}
await dispatchWait("install");
assert([...stores.values()].some((store) => [...store.entries.keys()].some((key) => key.endsWith("data/kurals.js"))), "install precaches the Kural dataset for offline reading");
assert([...stores.values()].some((store) => [...store.entries.keys()].some((key) => key.endsWith("index.html"))), "install precaches the app shell");

stores.set("tamil-stoic-old-version", cacheFor("tamil-stoic-old-version"));
await dispatchWait("activate");
assert(!stores.has("tamil-stoic-old-version"), "activate removes obsolete Tamil Stoic caches");
assert(claimCalls === 1, "activate claims existing pages");

listeners.get("message")({ data: { type: "SKIP_WAITING" } });
assert(skipWaitingCalls === 1, "update only calls skipWaiting after explicit app message");

let responsePromise;
listeners.get("fetch")({
  request: new Request("https://example.test/app/js/app.js"),
  respondWith(promise) { responsePromise = promise; },
});
let response = await responsePromise;
assert((await response.text()).startsWith("network"), "online app assets prefer a fresh network response");

fetchMode = "offline";
responsePromise = undefined;
listeners.get("fetch")({
  request: new Request("https://example.test/app/js/app.js"),
  respondWith(promise) { responsePromise = promise; },
});
response = await responsePromise;
assert((await response.text()).startsWith("network"), "offline app assets fall back to the previously cached response");

responsePromise = undefined;
listeners.get("fetch")({
  request: { method: "GET", url: "https://example.test/app/saved", mode: "navigate" },
  respondWith(promise) { responsePromise = promise; },
});
response = await responsePromise;
assert((await response.text()).includes("cached ./index.html"), "offline navigation falls back to the cached app shell");

// Version-consistency contract: every versioned script URL that index.html
// requests must be precached by the service worker, and the cache name must
// be bumped in lockstep. This is what guarantees a deployed fix (e.g. the
// Listen repair) actually reaches browsers instead of a stale cached app.js.
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scriptSrcs = [...indexHtml.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
assert(scriptSrcs.length >= 4, "index.html references its scripts");
assert(
  scriptSrcs.every((src) => /[?&]v=/.test(src)),
  "every script URL in index.html is version-busted (" + scriptSrcs.join(", ") + ")"
);
for (const src of scriptSrcs) {
  const rel = "./" + src;
  assert(
    source.includes('"' + rel + '"'),
    "sw.js precaches the versioned asset " + rel
  );
}
assert(
  source.includes("CACHE_PREFIX + \"v5-listen-hardened\"") || /CACHE_NAME\s*=\s*CACHE_PREFIX \+ "v5-/.test(source),
  "cache name bumped for the hardened-listen release"
);

if (failed) {
  console.error(`\n${failed} service-worker check(s) failed`);
  process.exit(1);
}
console.log("\nall service-worker checks passed ✓");
