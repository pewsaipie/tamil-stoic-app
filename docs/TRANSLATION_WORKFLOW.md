# Tamil Stoic translation workflow

## Approved v1 scope

The first corpus target is **1,730 quote records**, created by selecting bounded passages from Project Madurai:

- 1,330 Thirukkural couplets
- 400 Naladiyar verses

The Tamil source and English translation must come from the same Project Madurai bilingual etext. Tamil Stoic does not create or alter the translation in this mode; it presents the cited source with the original translator credit.

See `data/corpus-manifest.json` for the source URLs, locators, count, and status.

## Passage → quote → translation

The content pipeline is explicitly:

```text
Project Madurai Tamil passage
→ bounded quote (couplet/verse with stable locator)
→ Tamil quote record with source attribution
→ cited Project Madurai English translation
→ human rights/context review
→ production approval
```

A passage is not automatically a quote. Editors must choose a complete, meaningful unit and preserve its original line breaks. Each quote receives its own stable ID and source locator so that the English draft can always be checked against the exact Tamil text.

## Source review status

The imported bilingual records are not presented as Tamil Stoic translations. Until rights and attribution are checked, each record remains marked:

```text
translation_status: source-published-pending-rights-review
translation_source: Project Madurai bilingual etext
production_approved: false
```

The original English wording and translator credit must remain intact. Tamil Stoic may add themes or editorial context only as clearly labelled metadata.

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

## Project Madurai bilingual source policy

Tamil Stoic will use only quotes where the Tamil text and English translation are already present in the same Project Madurai bilingual etext. The English text will be displayed with the translator named in that etext and a direct citation to the exact page or PDF. No AI-generated translation is used in this mode.

Each imported record must preserve:

- Project Madurai source URL and header attribution;
- the exact Tamil quote and stable locator;
- the exact English translation as published;
- credited translator and translation copyright notice;
- a `translation_status` of `source-published-pending-rights-review` until reuse terms are checked.

The API must not label these translations as Tamil Stoic translations or Project Madurai-owned translations. It should identify Tamil Stoic as the application presenting a cited bilingual source.

## Human review gate

1. A Tamil reviewer checks segmentation, spelling, grammar, cultural meaning, ambiguity, and omissions against the source.
2. An English reviewer checks accuracy, readability, tone, and whether the draft accidentally copies another translator's wording.
3. An editor checks the citation, attribution, category, context note, and rights record.
4. Only after all three gates may `translation_review.status` become `approved` and `production_approved` become `true`.

Until the 1,730 records have passed these gates, the API must continue to identify the corpus as a draft and should not claim that the full production corpus is available.
