# தமிழ் ஸ்டோயிக் · Tamil Stoic

A calm, mobile-first [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) for reading **Thirukkural** (திருக்குறள்) — the 1,330 Tamil couplets by Thiruvalluvar.

- **One couplet a day**, stable per calendar day (IST), with a reading-streak counter
- **Three-book walk** (அறம் · பொருள் · காமம்) and a clickable map of all 133 chapters
- **"Open the right door"** — pick the situation you're in (anger, grief, love, work, patience, …) and the app filters verses by a matching theme
- **Full-screen reader** with swipe gestures (mobile) + arrow keys (desktop) + three quick reactions (🙏 🔥 💭)
- **Favorites, search, share-as-image** (offline canvas), copy-text, installable to the home screen, service-worker cached for offline reading
- Tamil verse + transliteration + Pope's 1886 English verse + a plain-English meaning, plus a short reflection prompt
- Three themes (light / night / olive) and three font-size steps, persisted in `localStorage`

## Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) (no extra UI framework — plain CSS with CSS custom properties)
- Vanilla service worker + manifest for PWA; no runtime network required after first load
- No external fonts — falls back to system Tamil/Latin stacks so it works completely offline
- Static build -> GitHub Pages via `.github/workflows/deploy.yml` (published at `/tamil-stoic-app/`)

## Scripts

```bash
npm install
npm run dev        # start dev server at http://localhost:5173/tamil-stoic-app/
npm run build      # production build to dist/
npm run preview    # preview the production build locally
npm run test       # static build + feature-marker + data-integrity test suite
npm run icons      # regenerate PWA icons from public/icons/icon.svg (pure Node PNG encoder)
```

## Data

- Tamil text and transliteration are bundled from [`scripts/build-kurals.mjs`](scripts/build-kurals.mjs), which reads the public-domain Parimelalagar recension from [`github.com/tk120404/thirukkural`](https://github.com/tk120404/thirukkural) (Apache-2.0).
- English verse translations are from **G. U. Pope** (with W. H. Drew, John Lazarus & F. W. Ellis, 1886), public domain.
- Simple-English meanings are original to this app, paraphrased from Pope's prose explanations.

Files written to `dist/` are deployed as-is by the Pages workflow. All user data (favorites, reactions, theme, streak) stays in `localStorage` on the device — nothing is uploaded.

## License

MIT for the app code. Thirukkural text is in the public domain; the Tamil JSON source carries its own Apache-2.0 notice (see `scripts/build-kurals.mjs`).
