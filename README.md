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

### Run it

Static site — open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Structure

```
index.html                     # the Thirukkural page
css/styles.css                 # styling (parchment + palm-leaf palette)
js/app.js                      # rendering, search, filters, lazy loading
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

## License

MIT — see [LICENSE](LICENSE). Derived data comes from
[tk120404/thirukkural](https://github.com/tk120404/thirukkural), licensed under the
Apache License 2.0 — https://www.apache.org/licenses/LICENSE-2.0.
