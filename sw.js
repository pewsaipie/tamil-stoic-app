/* Tamil Stoic offline service worker.
 *
 * The app is intentionally static and privacy-first. The cache holds only the
 * public reading experience; saved Kurals and reflections stay in IndexedDB on
 * the reader's device and are never sent through this worker.
 */
const CACHE_PREFIX = "tamil-stoic-";
const CACHE_NAME = CACHE_PREFIX + "v7-sangam-clay";

const APP_ASSETS = [
  "./",
  "./index.html",
  "./LICENSE",
  "./THIRD_PARTY_NOTICES.md",
  "./assets/licenses/MIT.txt",
  "./assets/licenses/Apache-2.0.txt",
  "./assets/licenses/OFL-1.1.txt",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./css/styles.css?v=7",
  "./css/fonts.css",
  "./data/kurals.js",
  "./js/storage.js",
  "./js/app.js",
  "./js/companion.js",
  // The exact versioned URLs index.html requests (?v=7). Precaching both
  // shapes means the shell works offline whether it was loaded fresh or
  // from an older cached copy.
  "./data/kurals.js?v=7",
  "./js/storage.js?v=7",
  "./js/app.js?v=7",
  "./js/companion.js?v=7",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./assets/img/rosette.svg",
  "./assets/img/kolam-strip.svg",
  "./assets/img/hero-temple.svg",
  "./assets/img/sangam-pot.svg",
  "./assets/img/ola-texture.jpg",
  "./assets/img/granite-texture.jpg",
  "./assets/fonts/inter-latin-400-normal.woff2",
  "./assets/fonts/inter-latin-500-normal.woff2",
  "./assets/fonts/inter-latin-600-normal.woff2",
  "./assets/fonts/inter-latin-700-normal.woff2",
  "./assets/fonts/inter-latin-ext-400-normal.woff2",
  "./assets/fonts/inter-latin-ext-500-normal.woff2",
  "./assets/fonts/inter-latin-ext-600-normal.woff2",
  "./assets/fonts/inter-latin-ext-700-normal.woff2",
  "./assets/fonts/eb-garamond-latin-400-normal.woff2",
  "./assets/fonts/eb-garamond-latin-500-normal.woff2",
  "./assets/fonts/eb-garamond-latin-400-italic.woff2",
  "./assets/fonts/eb-garamond-latin-500-italic.woff2",
  "./assets/fonts/noto-serif-tamil-tamil-400-normal.woff2",
  "./assets/fonts/noto-serif-tamil-tamil-600-normal.woff2",
  "./assets/fonts/noto-serif-tamil-tamil-700-normal.woff2",
  "./assets/fonts/noto-serif-tamil-latin-400-normal.woff2",
  "./assets/fonts/noto-serif-tamil-latin-600-normal.woff2",
  "./assets/fonts/noto-serif-tamil-latin-700-normal.woff2",
  "./assets/fonts/noto-sans-tamil-tamil-400-normal.woff2",
  "./assets/fonts/noto-sans-tamil-tamil-600-normal.woff2",
  "./assets/fonts/noto-sans-tamil-tamil-700-normal.woff2"
];

self.addEventListener("install", (event) => {
  // Do not call skipWaiting here. A reader gets an explicit in-app update
  // choice rather than having a new version interrupt an open reflection.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isAppGetRequest(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request) || await caches.match(request);
    if (cached) return cached;

    // A navigation request gets the cached shell when the reader is offline.
    if (request.mode === "navigate") {
      return (await cache.match("./index.html")) || (await cache.match("./"));
    }

    return new Response("This part of Tamil Stoic is not available offline yet.", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

self.addEventListener("fetch", (event) => {
  if (!isAppGetRequest(event.request)) return;
  event.respondWith(networkFirst(event.request));
});
