# tamil-stoic-app

creating a tamil content stoic app.

## திருக்குறள் · Thirukkural — complete edition

The complete Thirukkural: **all 1,330 couplets across all 133 chapters**
(அறத்துப்பால் · பொருட்பால் · காமத்துப்பால்), every one in the same three-layer format:

1. **தமிழ்** — the couplet in Tamil, with transliteration
2. **English translation** — the classic G. U. Pope translation (1886, public domain)
3. **Simple meaning** — a plain-English explanation that is easy to understand

### Features

- **All 1,330 kurals**, lazily rendered 24 at a time (smooth infinite scroll, fast searches)
- **Chapter browser** — every one of the 133 அதிகாரங்கள், grouped by பால் (section)
- **Theme filters** with counts: Wisdom, Learning, Gratitude, Patience, Anger, Truth,
  Calm, Impermanence, Compassion, Fate & Effort, Equality, Family, Friendship,
  Governance, Wealth, Love
- **Search** by kural number (`151`), Tamil (`பொறுத்தல்`), transliteration, or English
  (`patience`) — across couplets, translations, meanings and chapter names
- Deep-linkable cards (`#kural-151`), mobile-friendly, no build step, no runtime dependencies
- **Installable PWA** — add it to a phone home screen and read the full library offline after the first visit
- **Private saved Kurals and reflections** — stored only on the reader's device, with no account or tracking
- **Bilingual sharing** — native share sheet, copyable deep links, and downloadable Tamil + simple-English share cards
- **Reading settings** — text size, line spacing, light/dark reading, layer visibility, and reduced motion

### Run it

Static site — open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Checks

```bash
npm install --no-save jsdom
node scripts/test-chapter-filter.mjs
```

Confirms chapter 16 (பொறையுடைமை) renders `#kural-151` … `#kural-160`, that theme and
chapter filters clear each other, and that Clear removes the `has-value` state.

For the complete installed-companion test suite:

```bash
npm install --no-save jsdom
node scripts/test-app.mjs
node scripts/test-chapter-filter.mjs
node scripts/test-companion-features.mjs
node scripts/test-service-worker.mjs
```

The companion test covers install guidance, private saved Kurals and reflections, sharing,
share-card fallback, and reading preferences. The service-worker test covers caching, offline
fallback, update activation, and cache cleanup.

### Structure

```
index.html                     # the Thirukkural page and accessible companion dialogs
manifest.webmanifest           # install metadata, icons, and home-screen shortcuts
sw.js                          # offline cache and reader-controlled update flow
assets/                        # PWA / Apple home-screen icons
css/styles.css                 # styling (parchment + palm-leaf palette)
js/app.js                      # rendering, search, filters, lazy loading
js/storage.js                  # local-first saved Kural / reflection storage adapter
js/companion.js                # PWA install, sharing, saved collection, reading controls
data/kurals.js                 # ALL 1,330 kurals + chapters + themes (generated)
scripts/build-kurals.mjs       # regenerates data/kurals.js from source datasets
scripts/curated-overrides.json # hand-written text layers for the original 29 kurals
```

### Content pipeline

`data/kurals.js` is generated — do not edit by hand:

```bash
git clone --depth 1 https://github.com/tk120404/thirukkural.git ../datasets/tk120404_thirukkural
node scripts/build-kurals.mjs
```

- **Tamil text & transliterations**: standard (Parimelalagar-based) recension, via the
  [tk120404/thirukkural](https://github.com/tk120404/thirukkural) dataset — Apache License 2.0
- **English verse translations & prose explanations**: G. U. Pope with Drew, Lazarus & Ellis
  (1886) — public domain (via the same dataset)
- **Simple meanings**: app-original modern plain-English glosses (`scripts/glosses/*.json`),
  written from Pope's prose; the originally curated 29 kurals keep their hand-written text
  layers (`scripts/curated-overrides.json`)
- **Themes** are assigned per chapter in `scripts/build-kurals.mjs` (`CHAPTER_THEMES`)

## Privacy and offline reading

The PWA cache contains only the public application files and Kural dataset. Favorites and
private reflections are stored locally in IndexedDB (with a localStorage fallback) and are not
sent to a server. There are no accounts, analytics, public profiles, or push notifications in
this release. The storage adapter has a small asynchronous interface so optional cross-device
sync can be considered later without changing the reader experience.

## Live site

Deployed to **GitHub Pages** by `.github/workflows/deploy.yml` — it runs after each push to
`main` and publishes the app files, manifest, service worker, and icons. The configured
`github-pages` environment intentionally permits deployments from the default branch only.
After the first successful run the site is at:

**https://pewsaipie.github.io/tamil-stoic-app/**

One-time prerequisite (owner only): enable Pages with the Actions source — open
**Settings → Pages → Build and deployment → Source: GitHub Actions**, then re-run the
workflow (or push again). GitHub does not allow any token to create the Pages site
automatically, so this single click cannot be scripted. (Note: Pages from a private
repo requires GitHub Pro/Team/Enterprise — or make the repo public first.)

## License

MIT — see [LICENSE](LICENSE). Derived data comes from
[tk120404/thirukkural](https://github.com/tk120404/thirukkural), licensed under the
Apache License 2.0 — https://www.apache.org/licenses/LICENSE-2.0.
