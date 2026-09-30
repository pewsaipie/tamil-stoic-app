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
- **Chapter browser** — every one of the 133 அதிகாரங்கள், grouped by பால் (section), with a
  data-derived intro card (range + themes) whenever a chapter is selected
- **Theme filters** with counts: Wisdom, Learning, Gratitude, Patience, Anger, Truth,
  Calm, Impermanence, Compassion, Fate & Effort, Equality, Family, Friendship,
  Governance, Wealth, Love — deep-linkable as `#theme-anger`
- **Search** by kural number (`151`), Tamil (`பொறுத்தல்`), transliteration, or English
  (`patience`) — across couplets, translations, meanings and chapter names, with an
  as-you-type suggestion dropdown and recent searches
- **Ancient-theme visual system** — palm-leaf (ola) daily card, wax-seal kural numbers,
  lotus-rosette rules, gopuram-niche book tiles, kolam borders, granite footer band,
  paper grain, and a temple-silhouette hero (see [docs/ui-ux-proposal.md](docs/ui-ux-proposal.md))
- **Reading journey** — device-local read marks, visited-chapter marks on the 133-chapter
  map, a progress ring, and a gentle daily streak (never guilt-based)
- **Focus reader** — read a single couplet full-screen with prev/next, plus per-card
  next/previous navigation within the current results
- **Command palette (⌘K / Ctrl+K)** and keyboard shortcuts (`/` `j` `k` `s` `l` `?`)
- **Device TTS recitation** — a "Listen" button per couplet using the browser's offline
  speech engine (no network, no recording). Hardened against real-engine quirks: stale
  cancel callbacks, utterance garbage-collection, Chrome's dropped cancel→speak race,
  iOS user-gesture timing, and dead engines. On devices without a Tamil voice installed
  (most Windows PCs, iPhones without the optional Tamil TTS voice) it reads the
  transliterated couplet instead of staying silent, and says so once in a toast; the
  original Tamil is used automatically as soon as a `ta` voice appears.
- **Tamil interface** — full தமிழ் UI mode via Reading settings (verse layers independent)
- Deep-linkable cards (`#kural-151`), mobile-friendly, no build step, no runtime dependencies
- **Installable PWA** — add it to a phone home screen and read the full library offline
  after the first visit, fonts and textures included (self-hosted, no CDN)
- **Private saved Kurals and reflections** — stored only on the reader's device, with no
  account or tracking; a clear warning appears if even local storage is unavailable
- **Bilingual sharing** — native share sheet, copyable deep links, downloadable Tamil +
  simple-English share cards (framed with rosettes, a wax seal and a Tamil-numeral
  watermark), a one-tap "share today's Kural", and Open Graph/Twitter preview metadata
- **Reading settings** — text size, line spacing, palm-leaf day / temple night / follow-system
  colour, layer visibility, interface language, and reduced motion
- **Accessible by measurement** — WCAG-AA-verified colour tokens, axe-core-clean markup,
  skip links, 44 px touch targets on coarse pointers, `lang` attributes on mixed-language
  content, and forced-colors support (gated in CI by `test-contrast` + `test-a11y`)

### Run it

Static site — open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Checks

```bash
npm install --no-save jsdom axe-core
node scripts/test-contrast.mjs          # WCAG contrast over the real CSS tokens (no deps)
node scripts/test-service-worker.mjs    # offline/update contract (no deps)
node scripts/test-app.mjs
node scripts/test-chapter-filter.mjs
node scripts/test-companion-features.mjs
node scripts/test-speech.mjs               # Listen (device TTS) regression suite:
                                           #   engine personas (Chrome drop, iOS
                                           #   gesture, voiceless devices, dead engine)
node scripts/test-a11y.mjs              # axe-core scan of page + every dialog
node scripts/test-content.mjs           # 1,330-kural content integrity (runs in CI)
node scripts/test-credits.mjs           # attribution, local licenses, offline/deploy contract
```

Confirms chapter 16 (பொறையுடைமை) renders `#kural-151` … `#kural-160`, that theme and
chapter filters clear each other, and that Clear removes the `has-value` state.

The companion test covers install guidance, private saved Kurals and reflections, sharing,
share-card fallback, and reading preferences. The service-worker test covers caching, offline
fallback, update activation, and cache cleanup. `test-contrast.mjs` recomputes every
light/dark text pair (including filled buttons and the composited focus ring) against the
4.5:1 / 3:1 WCAG thresholds; `test-a11y.mjs` boots the real page in jsdom, opens each
dialog, and fails on any axe violation (with a planted-violation sanity check so a green
run can't be vacuous). All of the above run in CI on every push (`.github/workflows/content-check.yml`).

### Structure

```
index.html                     # the Thirukkural page and accessible companion dialogs
manifest.webmanifest           # install metadata, share_target, icons, home-screen shortcuts
sw.js                          # offline cache (shell, dataset, fonts, textures) + update flow
assets/                        # PWA / Apple home-screen icons
assets/img/                    # ancient-theme graphics (hero, rosette, kolam, textures)
assets/fonts/                  # self-hosted woff2 subsets (Inter, EB Garamond, Noto Serif Tamil, Noto Sans Tamil)
assets/licenses/               # app and bundled third-party license texts
THIRD_PARTY_NOTICES.md         # full attribution and source inventory
css/styles.css                 # styling (palm-leaf + temple-stone system, layer 2 components)
css/fonts.css                  # @font-face declarations for the self-hosted fonts
js/app.js                      # rendering, search, suggestions, journey, palette, focus, TTS, i18n
js/storage.js                  # local-first saved Kural / reflection storage adapter
js/companion.js                # PWA install, sharing, saved collection, reading controls, tour
data/kurals.js                 # ALL 1,330 kurals + chapters + themes (generated)
scripts/test-contrast.mjs      # WCAG contrast regression over the stylesheet's tokens
scripts/test-a11y.mjs          # axe-core scan (page shell, dialogs, filtered states)
docs/ui-ux-proposal.md         # UI/UX audit: ancient theme, accessibility, roadmap
docs/images/                   # visual direction references for the proposal
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
  written from Pope's prose, with the original 29 hand-written entries in
  `scripts/curated-overrides.json` as the starting text
- **Reviewed corrections**: `scripts/content-corrections.json` applies last, including to
  curated entries. Each change records the old/new text, rationale, and sources; upstream
  drift stops the build. See [content review status and remaining work](docs/content-review.md).
  This is a correction pass, not a claim of complete literary proofreading.
- **Integrity checks**: `node scripts/test-content.mjs` checks all 1,330 published Kurals and
  correction regressions without downloading datasets. It runs in CI and before deployment.
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

## License and credits

The application code and project-original writing are MIT — see [LICENSE](LICENSE).
The generated Kural dataset includes upstream material from
[tk120404/thirukkural](https://github.com/tk120404/thirukkural), licensed under Apache
License 2.0. The bundled Inter, EB Garamond, Noto Serif Tamil, and Noto Sans Tamil font files are licensed
under SIL Open Font License 1.1. Full attribution, copyright notices, and copies of
third-party licenses are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[`assets/licenses/`](assets/licenses/). The app also presents these credits in its
**Credits & open source** section.
