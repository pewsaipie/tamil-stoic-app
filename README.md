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

The included quote catalogue is a small working seed for deployment validation. Before a public launch, replace it with the reviewed 1,500–2,000 passage dataset and complete the per-translation rights review described in the product plan. The plan intentionally separates Project Madurai source rights from English translation rights and requires provenance, attribution, human review, and versioning for every published passage.
