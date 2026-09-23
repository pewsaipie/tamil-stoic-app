# tamil-stoic-app

creating a tamil content stoic app.

## திருக்குறள் · Thirukkural page

A calm, readable page of Thirukkural couplets. Every kural card shows three layers:

1. **தமிழ்** — the couplet in Tamil, with transliteration
2. **English translation** — the classic G. U. Pope translation (1886, public domain)
3. **Simple meaning** — a very easy plain-English gloss written for this app

### Features

- Search by kural number (e.g. `151`), Tamil words (e.g. `பொறுத்தல்`), transliteration,
  or English words (e.g. `patience`, `anger`)
- Theme filters: Wisdom, Learning, Gratitude, Patience, Anger, Truth, Calm,
  Impermanence, Compassion, Fate & Effort, Equality
- Sticky filter bar, mobile-friendly, no build step and no dependencies
- Deep-linkable cards (`#kural-151`)

### Run it

Static site — open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Structure

```
index.html        # the Thirukkural page
css/styles.css    # styling (parchment + palm-leaf palette)
js/app.js         # rendering, search, theme filters
data/kurals.js    # curated kurals (Tamil + Pope translation + simple gloss)
```

### Content notes

- Tamil text follows the standard Parimelalagar recension.
- English translations are by G. U. Pope with Drew, Lazarus & Ellis (1886) — public domain.
- Simple-English glosses are original to this project.
- 29 kurals are curated so far across 14 chapters (பாயிரம், வான்சிறப்பு, அறன் வலியுறுத்தல்,
  செய்ந்நன்றியறிதல், பொறையுடைமை, வாய்மை, வெகுளாமை, இன்னா செய்யாமை, நிலையாமை,
  அவா அறுத்தல், ஊழ், கல்வி, ஆள்வினையுடைமை, பெருமை). More can be added to `data/kurals.js`.

## License

MIT — see [LICENSE](LICENSE).
