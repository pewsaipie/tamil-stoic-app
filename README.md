# Tamil Stoic

Tamil Stoic is a planned bilingual reading companion for carefully sourced Tamil literary passages and English translations, beginning with a curated 1,500–2,000 passage corpus from Project Madurai.

## Planning deliverables

- [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md) — product strategy, editorial/translation policy, 22-category taxonomy, personalization, UX, privacy/accessibility, roadmap, references, and the API plan.
- [`docs/openapi.yaml`](docs/openapi.yaml) — initial OpenAPI 3.1 contract for the read-only quote catalogue.

## Netlify deployment

This is a zero-build Netlify site with a serverless quote API. `netlify.toml` publishes the repository root and enables the functions in `netlify/functions`.

1. Push this repository to GitHub.
2. In Netlify, choose **Add new site → Import an existing project**, select the repository, and use the detected settings (`publish directory: .`, functions: `netlify/functions`). No build command is required.
3. Deploy. The frontend will hydrate its Today card from the API at `https://YOUR-SITE.netlify.app/api/quotes`.

Available endpoints:

- `GET /api/health`
- `GET /api/quotes?limit=20`
- `GET /api/quotes?q=patience`
- `GET /api/quotes?category=courage-and-fear`
- `GET /api/quotes/pm-000629`

For local Netlify parity, install the Netlify CLI and run `npm run dev`; the local API is available at `http://localhost:8888/api/quotes`. `npm run serve` is a static-only preview and intentionally does not provide serverless functions.

The current application is intentionally focused on the original core: a personalised quote feed backed by the API. Readers choose themes, mood, and language preference; the browser ranks API passages, accepts useful/not-for-me feedback, saves passages locally, searches the source library, and exports saved translations. The API now includes `data/quotes-1330.json`: all 1,330 Thirukkural couplets with Tamil text, source-published English translations, translator attribution, source locators, and citations. They remain marked as draft/pending human and rights review. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the machine-readable source and licence. Before public launch, keep only records whose source-file rights and attribution have been verified. The plan intentionally separates Project Madurai source rights from English translation rights and requires provenance, attribution, human review, and versioning for every published passage.
