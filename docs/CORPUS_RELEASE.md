# 1,500–2,000 quote corpus release gate

The deployed API currently contains a six-record seed corpus. It is intentionally not labelled as the requested 1,500–2,000 corpus. The Tamil source layer will come from Project Madurai's free electronic texts, with the required Project Madurai attribution/header and coordinator confirmation for bulk online distribution. The English layer is a separate Tamil Stoic editorial work: it will not be presented as a Project Madurai translation, and it must have its own copyright/licence record. Shipping fabricated translations or copying modern translations without permission would make the app unreliable and could violate translation rights.

A production corpus must be assembled as a reviewed JSON export with one record per passage. Every record needs:

- exact Tamil source text and stable Project Madurai work/verse locator;
- English translation, translator, translation type, and separate translation licence;
- translation workflow: AI-assisted draft if used, named human Tamil reviewer, named English reviewer, review date, and approval status;
- Project Madurai source URL, retrieval date, attribution/header, and checksum;
- themes, context, review status, and at least one human Tamil/English review;
- a correction/version history.

Run the release check with:

```bash
npm run validate:corpus -- path/to/reviewed-quotes.json
```

The validator rejects anything outside 1,500–2,000 records, missing Tamil or English text, duplicate IDs, missing provenance, missing themes, or records not marked `published`. After rights review, the resulting file should replace the seed records in `netlify/functions/quotes.js` (or be loaded from an object store/database for a larger deployment).

This is the remaining content prerequisite for claiming that the API has the full corpus. Project Madurai provides electronic Tamil texts and some authorised English translations, but it does not automatically grant rights to every English translation found elsewhere. Translation permissions must be recorded per work before publication.
