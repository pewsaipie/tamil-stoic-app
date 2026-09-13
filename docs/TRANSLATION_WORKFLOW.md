# Tamil Stoic translation workflow

## Approved v1 scope

The first corpus target is **1,730 quote records**, created by selecting bounded passages from Project Madurai:

- 1,330 Thirukkural couplets
- 400 Naladiyar verses

The Tamil source is selected from Project Madurai. Existing English text found on Project Madurai pages is **not automatically reused**. Tamil Stoic translations are a separate editorial layer.

See `data/corpus-manifest.json` for the source URLs, locators, count, and status.

## Passage → quote → translation

The content pipeline is explicitly:

```text
Project Madurai Tamil passage
→ bounded quote (couplet/verse with stable locator)
→ Tamil quote record with source attribution
→ AI-assisted English draft
→ human Tamil review
→ human English review
→ production approval
```

A passage is not automatically a quote. Editors must choose a complete, meaningful unit and preserve its original line breaks. Each quote receives its own stable ID and source locator so that the English draft can always be checked against the exact Tamil text.

## Draft status

Draft translations may be created with AI assistance, but every draft must remain visibly marked:

```text
translation_status: draft
human_tamil_reviewed: false
human_english_reviewed: false
production_approved: false
```

A draft is not a production quote. It must not be presented as an approved translation or used in marketing.

## Required record format

```json
{
  "id": "pm-tk-0001",
  "tamil": {"text": "...", "script": "Tamil"},
  "english": {"text": "...", "type": "literary", "translator": "Tamil Stoic editorial team"},
  "work": {"title": "Thirukkural", "author": "Thiruvalluvar"},
  "source_locator": "Kural 1",
  "source_url": "https://www.projectmadurai.org/...",
  "translation_review": {
    "status": "draft",
    "ai_assisted": true,
    "human_tamil_reviewer": null,
    "human_english_reviewer": null,
    "reviewed_at": null,
    "production_approved": false
  }
}
```

## Private 500-draft batch

The repository includes `scripts/translate-drafts.mjs` for a private batch run. It requires a source JSON file with at least 500 bounded quote records containing `id` and `tamil_text`, plus an OpenAI-compatible API key. It writes to the ignored `data/drafts/` directory and never changes the public API:

```bash
OPENAI_API_KEY=... OPENAI_MODEL=gpt-4o-mini \
  npm run translate:drafts -- source-passages.json data/drafts/quotes-draft-500.json
```

The output is explicitly marked `status: draft`, `ai_assisted: true`, and `production_approved: false`. API keys must be supplied through the environment and must never be committed. The script does not download or copy third-party English translations; it translates the supplied Tamil source passage itself. A verified Project Madurai source export must be supplied before running it.

## Human review gate

1. A Tamil reviewer checks segmentation, spelling, grammar, cultural meaning, ambiguity, and omissions against the source.
2. An English reviewer checks accuracy, readability, tone, and whether the draft accidentally copies another translator's wording.
3. An editor checks the citation, attribution, category, context note, and rights record.
4. Only after all three gates may `translation_review.status` become `approved` and `production_approved` become `true`.

Until the 1,730 records have passed these gates, the API must continue to identify the corpus as a draft and should not claim that the full production corpus is available.
