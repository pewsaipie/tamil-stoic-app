# Tamil Stoic — product and delivery plan

**Status:** planning baseline · **Owner:** Tamil Stoic team · **Target corpus:** 1,500–2,000 quote-sized passages

## 1. Product promise

Tamil Stoic is a calm, bilingual reading companion: a person receives one meaningful Tamil passage, a trustworthy English translation, context, and one small reflection prompt that can be applied today. It is not a quote-scraping site and it must not present modern paraphrases as the author's words.

The first release should curate passages from Project Madurai works rather than claim to translate its entire catalogue. “Translate every piece” is a separate, multi-year scholarly programme: the source corpus is much larger than the initial 1,500–2,000 passages, and rights differ by edition and translation. Each passage is therefore independently sourced, translated, reviewed, licensed, and versioned.

### Success measures (first 90 days)

- 1,500–2,000 published passages, each with Tamil source, English translation, source locator, rights record, translator/reviewer credits, and confidence status.
- ≥95% of published passages pass two-person review (Tamil and English); 100% have automated validation and a visible provenance trail.
- ≥35% week-4 reader retention among opted-in users; ≥60% of sessions reach a reflection or save action.
- <1% broken-source/report rate and all takedown requests acknowledged within 2 business days.
- WCAG 2.2 AA target, including Tamil script, keyboard access, reduced motion, and screen-reader labels.

## 2. Content model and editorial guardrails

### What counts as a quote

A quote is a bounded, faithful excerpt (usually 1–8 lines or a complete couplet/stanza) with a stable work/chapter/verse locator. Editors may add a short **editorial summary**, but it is never displayed in quotation marks or attributed to the historical author. No “inspirational” text is generated into the source field.

### Translation policy

1. Preserve the Tamil source exactly as published, including verse/line breaks; store Unicode-normalized text without destroying the original.
2. Produce a readable English translation that states whether it is literal, literary, or explanatory.
3. Record translator, date, method, AI assistance (if any), and reviewer. AI may propose a draft, never approve or silently publish one.
4. Retain ambiguity, culturally specific terms, gender/register, religious context, and alternate readings in notes rather than flattening them into generic Stoicism.
5. Compare against an existing authorized/public-domain translation when available; otherwise commission a new translation with an explicit license.
6. Avoid false equivalence: label a passage “Tamil source” and “Stoic reflection,” not “Tamil Stoic philosophy,” unless the source itself warrants that claim.

### Required passage fields

`id`, `slug`, `tamil_text`, `tamil_script` (Unicode), `transliteration` (optional), `english_text`, `translation_type`, `editorial_summary`, `reflection_prompt`, `work_id`, `author`, `era`, `genre`, `source_locator`, `source_url`, `source_snapshot_sha256`, `source_license`, `translation_license`, `translator`, `reviewers`, `review_status`, `confidence`, `themes`, `content_warnings`, `created_at`, `updated_at`, and `version`.

### Minimum source record

Store the Project Madurai etext/PDF URL, retrieval date, edition/header attribution, exact locator, checksum of the snapshot, and whether distribution of this derivative is allowed. Keep a separate rights register; a public-domain ancient work does **not** automatically make a modern English translation public domain. A rights change must be able to unpublish only the affected translation while preserving the source audit trail.

## 3. Initial taxonomy (18+ categories)

Use multi-label themes (one primary plus up to four secondary tags), not a single forced category. Proposed v1 categories:

1. Impermanence and change
2. Attention and presence
3. Self-knowledge
4. Discipline and restraint
5. Courage and fear
6. Patience and endurance
7. Compassion and kindness
8. Justice and responsibility
9. Truth and integrity
10. Desire and non-attachment
11. Anger and forgiveness
12. Grief, loss, and mortality
13. Friendship and community
14. Leadership and service
15. Work, craft, and duty
16. Learning and wisdom
17. Nature and interdependence
18. Simplicity and contentment
19. Love and longing
20. Spiritual practice and devotion
21. Exile, belonging, and identity
22. Joy, gratitude, and celebration

Categories are editorial discovery tools, not claims that the source belongs to Greek/Roman Stoicism. Add `tradition` and `genre` facets (Sangam, ethical, devotional, epic, bhakti, siddhar, modern, etc.) to preserve context.

## 4. Experience and modern UX direction

### Core surfaces

- **Today:** one hero passage with Tamil-first typography, tap-to-reveal English, source badge, audio controls, save/share, and “Try this today.” Never use an infinite feed by default.
- **For you:** a transparent, user-controlled mix of chosen themes, language preference, reading time, novelty, and previously completed reflections.
- **Explore:** theme wheel, author/work/era/genre filters, full-text Tamil/English search, transliteration toggle, and a map/timeline only when historically defensible.
- **Passage detail:** side-by-side or stacked Tamil/English, line alignment, pronunciation/transliteration, context, glossary, source link, translator notes, related passages, and report/correction.
- **Reflection:** one-tap mood/energy check-in, private prompt, optional habit reminder, and weekly review. No public leaderboard for vulnerability or “streak shame.”
- **Library:** saves, collections, notes, downloaded offline packs, and export/delete controls.

### “Off-the-world” but humane interaction ideas

- A quiet **dawn / dusk reading ritual** with adaptive ambient gradient, not autoplay audio; respect reduced-motion and data saver settings.
- **Meaning lens:** compare Tamil lines with the translation and tap a word for morphology/glossary; keep the poetic line intact.
- **Constellation of ideas:** a navigable graph of themes and works with a clear list alternative and no dark-pattern endless scroll.
- **Two-minute practice cards:** convert a passage into a tiny action (pause, write, thank, release) and let the user choose or dismiss it.
- **Serendipity dial:** intentional ↔ surprising, with “why am I seeing this?” explanations.
- **Read aloud:** Tamil and English TTS with playback speed, line highlighting, and downloadable audio where licensing permits.
- **Low-stimulation mode:** paper-like background, no badges, no counts, and one passage per visit.
- **Community annotation, later:** moderated, source-linked notes; never let popular votes rewrite the canonical translation.

## 5. Personalization that benefits the reader

Onboarding asks only language, reading time, themes, and whether the user wants reflection reminders. The recommender should combine:

- explicit interests and skips (highest weight);
- freshness and diversity across works, eras, genres, and categories;
- completion, saves, reflection usefulness, and “not for me” feedback;
- a small exploration quota so the profile does not become a filter bubble;
- editorial safety/quality gates and content-warning preferences.

Explain every recommendation (“Because you saved patience and selected 5-minute mornings”). Give controls to reset or download a personal profile. Do not infer religion, caste, health, politics, or emotional diagnosis from reading behavior. Store an event with consent, minimize retention, and provide export/delete.

A simple v1 ranker is enough: quality gate → eligibility → weighted theme affinity + freshness + diversity penalty + exploration bonus. Evaluate offline with holdout saves/reads and online with retention plus “helpful” feedback; do not optimize only for time-on-app.

## 6. API plan — Project Madurai quote service

Expose a versioned, read-optimized API owned by Tamil Stoic. It should request **curated, rights-cleared records** from our normalized catalogue, not scrape Project Madurai on every user request. An ingestion worker periodically fetches allowed source files, verifies checksums, parses/segments them, and sends records through editorial review.

Base URL: `https://api.tamilstoic.app/v1`

### Public endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/quotes` | Paginated discovery; filters `category`, `work`, `author`, `era`, `language`, `q`, `cursor`, `limit`, `seed` |
| `GET` | `/quotes/{id}` | Tamil, translation, context, provenance, credits, related items |
| `GET` | `/quotes/{id}/versions` | Translation/editorial history where permitted |
| `GET` | `/works` | Work and author catalogue with source links |
| `GET` | `/categories` | Taxonomy and counts |
| `GET` | `/feed` | Personalised feed using a short-lived signed preference token; never expose raw profile data |
| `GET` | `/health` | Liveness/readiness; no corpus data |

Example request:

```http
GET /v1/quotes?category=patience-and-endurance&language=ta,en&limit=20&cursor=eyJvZmZzZXQiOjIwLCJ2IjoyfQ
Accept: application/json
```

Example response shape:

```json
{
  "data": [{
    "id": "pm-000184",
    "tamil": {"text": "...", "script": "Tamil", "transliteration": null},
    "english": {"text": "...", "type": "literary", "translator": "..."},
    "work": {"title": "...", "author": "...", "era": "..."},
    "themes": ["patience-and-endurance", "discipline-and-restraint"],
    "provenance": {"provider": "Project Madurai", "locator": "...", "url": "...", "license": "..."},
    "review": {"status": "published", "confidence": "high", "version": 3}
  }],
  "page": {"next_cursor": "...", "has_more": true},
  "meta": {"api_version": "1.0", "generated_at": "2026-09-13T00:00:00Z"}
}
```

### API requirements

- Cursor pagination, stable ordering, ETags/`If-None-Match`, gzip/Brotli, and cache headers.
- OpenAPI 3.1 contract committed before implementation; generated clients and contract tests in CI.
- Rate limits by API key, `429` with `Retry-After`, request IDs, structured errors, and abuse protection.
- CORS allowlist for production web origins; no wildcard credentials. OAuth/session auth for private feed, scoped service keys for ingestion/admin.
- Never return unpublished drafts, private notes, emails, or internal moderation data.
- `source_url`, rights fields, attribution, and `last_verified_at` are mandatory in published responses.
- Observability: latency, cache hit rate, error rate, per-source freshness, and content report counts without logging user text unnecessarily.

Suggested stack: PostgreSQL for canonical records and pgvector only if semantic discovery proves useful; object storage for immutable source snapshots; a queue for ingestion/review; Redis/CDN cache for reads. Start as a modular monolith to keep editorial correctness ahead of distributed complexity.

## 7. Editorial and ingestion workflow

1. **Inventory:** select works and passages; record Project Madurai URL, edition, locator, and rights.
2. **Acquire:** fetch only permitted files; preserve headers; checksum and virus-scan; retain source snapshot.
3. **Normalize:** Unicode/NFC, line boundaries, OCR correction with diff; never overwrite raw text.
4. **Segment:** propose quote boundaries and metadata; deduplicate by source locator and normalized fingerprint.
5. **Translate:** human-led draft; optional AI assist clearly logged; translation license captured.
6. **Review:** Tamil specialist verifies source/transliteration; English editor verifies meaning/style; sensitivity reviewer checks context.
7. **Curate:** apply categories, summary, practice, warnings, and related links; audit “Stoic” framing.
8. **Publish:** immutable version, provenance card, search index, cache purge, and changelog.
9. **Maintain:** community reports enter a queue; corrections create a new version; takedowns are reversible and logged.

Quality gates: no orphan quote, no missing citation, no unsupported author attribution, no translation published with `draft` status, no duplicate fingerprint, and no unreviewed machine translation.

## 8. Privacy, safety, accessibility, and trust

- Anonymous browsing by default; optional account; encrypted transport and encrypted sensitive data at rest.
- Consent-based analytics, short retention, self-serve export/delete, and a plain-language privacy page.
- Content notes for violence, grief, caste/religious context, and archaic language; never silently modernize sensitive passages.
- Report buttons for mistranslation, attribution, rights, harmful framing, and broken source.
- Semantic HTML, keyboard-first flows, visible focus, 4.5:1 text contrast, RTL-safe future design, Tamil font fallback, captions/transcripts, 44px touch targets, and WCAG 2.2 AA testing.

## 9. Delivery roadmap

### Phase 0 — 2 weeks: foundation

Confirm Project Madurai permission/attribution terms in writing, choose 8–12 representative works, rights matrix, editorial handbook, schemas, OpenAPI skeleton, design tokens, and a 30-passage gold set.

### Phase 1 — 4–6 weeks: vertical slice

Ship 100 reviewed passages, Today/detail/library, bilingual search, source cards, feedback/reporting, admin review queue, API v1, accessibility baseline, analytics consent, and automated provenance tests.

### Phase 2 — 6–10 weeks: corpus and personalization

Grow to 500 then 1,500–2,000 reviewed passages, 18+ taxonomy, recommendation explanations, reflections, offline cache, TTS evaluation, and editorial dashboards.

### Phase 3 — after validation

Add community annotations, semantic search, audio packs, scholar API keys, native installable PWA, and new licensed translations. Do not launch gamification or social features until the quiet reading experience and moderation are proven.

## 10. Open decisions before build

- Which specific Project Madurai works and passages are in the first 1,500–2,000, and who owns each translation right?
- Are translations commissioned, public-domain, or reused under documented permission?
- Which Tamil scholars, English editors, and community reviewers will sign off?
- Is Tamil-first, English-first, or user-selected onboarding the default for the first market?
- What jurisdictions and retention limits govern user data?
- Which TTS provider permits commercial caching and derivative audio?

## References and source-of-truth links

1. [Project Madurai official site](https://www.projectmadurai.org/) — project history, Unicode/ebook availability, distribution and attribution guidance.
2. [Project Madurai mobile/about page](https://projectmadurai.org/mobile/about.html) — mission and electronic-text context.
3. [Project Madurai catalogue/search](https://www.projectmadurai.org/pmworks.html) — work-level inventory to use during ingestion planning.
4. [Tamil Electronic Library paper on Project Madurai](https://tamilelibrary.org/teli/pmintr.html) — volunteer workflow, etext preparation, and translation context.
5. [Example Project Madurai English translation with acknowledgements](https://www.projectmadurai.org/pm_etexts/pdf/pm0440.pdf) — demonstrates why translation permission and credit must be recorded separately.
6. [Tamil Virtual Academy, Government of Tamil Nadu](https://it.tn.gov.in/en/node/47) — complementary institutional digital-library resource; verify terms per item.
7. [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/) — accessibility target.

**Legal note:** this plan is not legal advice. Before ingestion or publication, obtain a rights review for each source and translation, preserve required Project Madurai headers/credits, and honor takedown requests.
