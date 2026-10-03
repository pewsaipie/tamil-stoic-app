# Plan — Standard couplet layout + **Ask Valluvar** (வள்ளுவரைக் கேள்)

## 0. Status — what shipped

Both features and the React migration are implemented on
`arena/01a0ffe1-tamil-stoic-app` (M1–M6 parity + live flip, then the features).

| item | where it landed | evidence |
| --- | --- | --- |
| Standard couplet layout, all 1,330 couplets | `app/src/lib/couplet.ts`, `app/src/components/kural/KuralVerse.tsx` | `docs/couplet-line-contract.md`, `app/scripts/test-couplet.mjs`, `test-render.mjs` |
| Ask Valluvar (on-device traditional NLP) | `app/src/lib/{intents,lexicon,intentFeatures,intentClassifier,askValluvar}.ts`, `app/src/views/AskValluvar.tsx` | `docs/ask-valluvar.md`, `app/scripts/test-intent.mjs` |
| React app is the deployed reader | `.github/workflows/deploy.yml` publishes `app/dist` | `app/scripts/test-pwa.mjs` |

Two numbers differ from this plan's estimates, and both were decided during
implementation:

1. **Exceptions are 29, not ~15.** §D1 assumed the ~11–13 spacing defects would be
   corrected (A3). Rewriting corpus text — even a space inside a word — was
   rejected instead: the app presents Thirukkural, it does not edit it. So
   **1,301** couplets read four words over three, and **29** keep the standard
   4 சீர்/3 சீர் split with a documented reason and sources. The full table is in
   `docs/couplet-line-contract.md` §3.
2. **Intents are 38, not 40.** The appendix's 40-intent catalogue merged into 37
   subject/support intents plus the out-of-scope `smalltalk` class added during
   evaluation (an open-set classifier answers greetings with scripture without it).
   See `docs/ask-valluvar.md` §2.

**Status:** revised after your answers · **Target:** `arena/01a0ffe1-tamil-stoic-app` → PR → merge → live
**Two features, one direction:** everything ships in the **React app** (`app/`), and the
**live site becomes the React build**.

| # | Your wish | How this plan satisfies it |
| --- | --- | --- |
| **A** | "First four words on top, other three below — the standard. For all 1,330. Default mode; must not change with accessibility settings." | The Tamil couplet is a **fixed two-line block**: line 1 (முதல் அடி, 4 சீர்) on top, line 2 (ஈற்றடி, 3 சீர்) below — 4 words / 3 words for 1,313+ kurals, spacing defects cleaned, the remaining ~15 keep the standard அடி split, documented (D1). Frozen across text size, contrast, layers, motion, print, focus mode, share cards. |
| **B** | "**Ask Valluvar** — a chatbot: user's situation or mood → random Thirukkural from the core keyword; random prompts to open." | A **classical NLP intent classifier** (TF-IDF + char n-grams → Naive Bayes / Logistic Regression / linear SVM), trained in-repo, running **on-device in the browser** for desktop and PWA. Intent → topic → seeded random Kural from real chapters, with random opening prompts. No LLM, no network, no key. |

## 1. Decisions taken (from your answers)

| Question | Your answer | Consequence in this plan |
| --- | --- | --- |
| Which app? | **React, and the entire app must go React and go live** | §6 migration program: the React app reaches parity, `deploy.yml` publishes `app/dist`, the vanilla reader is retained only as a rollback until the flip is verified, then retired. |
| Couplet rule | **4 on top / 3 below for all 1,330, default, accessibility-independent**; "adjust any spacing in the UI" | §4: display split is **data**, not computed; spacing defects are corrected through the reviewed corrections ledger; the layout is frozen under every accessibility setting. D1 locks the rule: standard அடி split, no word is ever cut; the ~15 kurals that cannot be 4/3 are documented with sources. |
| Brain | **Traditional NLP intent classifiers, desktop + PWA** | §5: labeled utterance corpus → preprocessing (Tamil morphology, transliteration normalisation) → TF-IDF/hashed n-grams → Multinomial NB + softmax regression + linear SVM, best model exported as a compact JSON artifact, inference client-side, CI gates on macro-F1/latency/size. |
| Second item? | Just these two | No third feature; the migration is the only additional workstream. |

## 2. Where the code stands today (verified in this checkout)

**Live app (root, vanilla, deployed by `deploy.yml`)**

- Splits Tamil verse **by counting spaces** — `tamilCoupletLines()` at `js/app.js:754`
  (`words.slice(0, 4)`). Correct for 1,301 of 1,330 kurals; **wrong for 29**: kural 10
  currently renders `பிறவிப் பெருங் கடல் நீந்துவர்` / `நீந்தார் இறைவன் அடி சேராதார்` instead of
  `பிறவிப் பெருங் கடல் நீந்துவர் நீந்தார்` / `இறைவன் அடி சேராதார்`. Kural 42 renders as
  `…இறந்தார்க்கும் இல்வாழ்வான்` / `என்பான் துணை`.
- Rich feature set (browse, search, chapter map, saved + reflections, settings, palette, TTS,
  share cards, journey, onboarding, credits, offline SW) with 9 CI suites.

**React app (`app/`, Vite + TS + Tailwind v4 + Radix + Zustand)**

- Already: design tokens (18 contrast pairs gated), fonts, Today's Kural card, minimal
  `/kural/:n` view, theme switcher, toasts, offline banner, library/preferences parity with
  the live app's storage keys, corpus pipeline (`sync-kurals.mjs`), PWA plugin (prompt
  update), hero canvas.
- **Not yet built (parity gap):** browse list + lazy scroll, search + suggestions, chapter
  navigation + 133-chapter map + chapter intro cards, situation doors + three books, saved
  collection + reflection editor, settings (type size, spacing, theme, layers, Tamil UI,
  motion, contrast), focus reader, TTS Listen, sharing (native + PNG share card), reading
  journey (read marks, visited chapters, streak), command palette + shortcuts + help,
  onboarding tour, credits section, print styles, deep links (`#saved`, `#theme-*`, `#kural-n`),
  Tamil i18n dictionary, and the accessibility/content/SW test suites.

**Couplet facts (evidence trail in `docs/couplet-audit.md`, to be written)**

- 1,301 kurals: standard text = 4 + 3 space-separated words (the rule you want, literally).
- 29 kurals: the standard printed text does not divide 4/3. Verified sources:
  #42 is 3+3 in Parimelalagar's edition ([Wikisource](https://ta.wikisource.org/wiki/%E0%AE%A4%E0%AE%BF%E0%AE%B0%E0%AF%81%E0%AE%95%E0%AF%8D%E0%AE%95%E0%AF%81%E0%AE%B1%E0%AE%B3%E0%AF%8D_%E0%AE%AA%E0%AE%B0%E0%AE%BF%E0%AE%AE%E0%AF%87%E0%AE%B2%E0%AE%B4%E0%AE%95%E0%AE%B0%E0%AF%8D_%E0%AE%89%E0%AE%B0%E0%AF%88/%E0%AE%85%E0%AE%B1%E0%AE%A4%E0%AF%8D%E0%AE%A4%E0%AF%81%E0%AE%AA%E0%AF%8D%E0%AE%AA%E0%AE%BE%E0%AE%B2%E0%AF%8D/9.%E0%AE%B5%E0%AE%BF%E0%AE%B0%E0%AF%81%E0%AE%A8%E0%AF%8D%E0%AE%A4%E0%AF%8B%E0%AE%AE%E0%AF%8D%E0%AE%AA%E0%AE%B2%E0%AE%AF%E0%AF%8D)); #331 is 4+2 ([Dinamalar](https://www.dinamalar.com/thirukural/34/331)); #82 keeps a சீர் boundary inside a word — `வேண்டற்பாற் றன்று` ([valaitamil](https://www.valaitamil.com/virundhu-puraththadhaath-thaanuntal-saavaa-marundheninum-ventarpaar-randru-kural-82.html)).
- Of the 29, **~11–13 are pure spacing defects** (`பெருங் கடல்` → `பெருங்கடல்`, `தவர் க்கு` →
  `தவர்க்கு`, `இவ் வூர்` → `இவ்வூர்`, `என் னெஞ்சு` → `என்னெஞ்சு`, …) that end up exactly 4/3
  once the spacing is corrected; the rest keep the standard அடி split (D1 — words are never cut).

---

## 3. Feature A — the couplet layout (React-first)

### A.0 Acceptance criteria (the guarantee you asked for)

1. **Default, everywhere, always two lines:** line 1 = முதல் அடி on top, line 2 = ஈற்றடி
   below; never one line, never three, never re-cut at render time.
2. **1,313+ of 1,330 are literally 4 words + 3 words**; the remaining ~15 keep the standard
   அடி split (D1) — no word is ever cut — and are documented per kural with sources.
3. **Frozen under accessibility settings.** Text size (S/M/L/XL), line spacing, contrast,
   reduced motion, high contrast/forced colours, layer toggles (Tamil/transliteration/English/
   simple), print, focus mode, share cards and the chat all render the same pair of lines —
   only the *type* changes, never the split. A test asserts the invariant at every setting.
4. **Byte-exact text:** the two lines concatenate to the corpus text (nothing lost, nothing
   glued); spacing corrections flow through the reviewed ledger with sources.
5. On-device only; no new dependency.

### A.1 Data & content steps

| Step | Work | Deliverable |
| --- | --- | --- |
| **A1** | `scripts/build-couplet-lines.mjs` → `data/couplet-lines.json`: for every kural, the canonical display pair, the unit counts, the classification (`4-3`, `standard-other`, `spacing-fixed`) and a note. Generated, `--check` mode for CI. | manifest |
| **A2** | Audit all 29 against ≥2 standard editions (Wikisource Parimelalagar, kural.page, valaitamil, Dinamalar, Project Madurai): decide, per kural, the exact words and where the அடி break falls; capture the source URL. | `docs/couplet-audit.md` |
| **A3** | Apply spacing corrections through `scripts/content-corrections.json` (existing reviewed ledger: before/after + reason + https sources + upstream-drift guard). **Only spacing inside/around words — no recension change.** | ledger entries |
| **A4** | Extend `scripts/content-quality.mjs` + `scripts/test-content.mjs`: two Tamil lines; no leading/trailing space; the pair matches `couplet-lines.json`; fixtures #10/#42/#82/#331 can never be produced by a word-slice. | content gate |
| **A5** | Regenerate `data/kurals.js`; `app/scripts/sync-kurals.mjs` mirrors it to `app/public/data/kurals.json` (already `--check` gated). | dataset |

### A.2 Renderer steps (React is the only renderer that matters; the vanilla one dies with the flip)

| Step | Work | Files |
| --- | --- | --- |
| **A6** | `KuralVerse` — one component renders the canonical pair (block-level lines, `data-verse-line="1\|2"`, `lang="ta"`, optional `size` variant for chat/share/print). No component may touch `ta` differently. | `app/src/components/kural/KuralVerse.tsx` |
| **A7** | Use it in `TodayKuralCard`, `KuralView`, browse cards, focus reader, Ask Valluvar messages, share-card canvas text, clipboard text, TTS utterance, print stylesheet. | `app/src/**` |
| **A8** | Typography: the two-line block is the anchor of the card; safe wrapping without breaking the அடி sense; `word-break: keep-all` where appropriate; sizes from tokens so accessibility scales the type — never the structure. | `app/src/styles/*.css` |
| **A9** | Remove the legacy slicer in the vanilla app for the transition period (one-line change: `ta[0]` / `ta[1]`) so the still-live site is not broken while the migration lands. | `js/app.js` (temporary) |
| **A10** | Tests: `app/scripts/test-couplets.mjs` (all 1,330 + fixtures), a component test that asserts the pair at every accessibility setting, and the corpus-wide `scripts/test-couplets.mjs` for the build pipeline. | tests |

---

## 4. Feature B — **Ask Valluvar** (traditional NLP intent classifier)

### B.0 Product definition

> The reader types (or taps) a **situation or mood** — Tamil, English, or transliterated
> Tamil. An on-device **intent classifier** maps it to a topic; the topic expands to the real
> chapters that discuss it; a seeded random draw picks **one Kural** from that pool and shows
> it in the frozen 4/3 layout with transliteration, Pope's English and the simple meaning,
> plus "another", save, listen, share, open-in-reader. It opens with a greeting and **random
> prompts**, and never sends anything off the device.

Guardrails (unchanged from the project's promises): real Kural text only, never invented
verse; framing lines are clearly the app's; no medical/legal/financial advice; a crisis path
hands over to human help; fully offline; no accounts; no analytics.

### B.1 The NLP pipeline (classical, trainable, on-device)

```
label corpus (in-repo, reviewed)
  data/ask/utterances.jsonl        ~40 intents × 30–60 utterances, ta + en + tanglish
        │
        ├─ scripts/train-ask-model.mjs       (Node, pure JS, no deps)
        │     preprocess → features → train NB / softmax-regression / linear SVM
        │     stratified 5-fold CV + held-out split → pick best by macro-F1
        │     export int8 weights + vocab → data/ask-model.json  (≤120 KB raw)
        │     write docs/ask-model-report.md (accuracy, macro-F1, per-intent F1,
        │     confusion matrix, top features, latency, size)
        │
        ├─ scripts/test-ask-model.mjs        CI gate: macro-F1 ≥ 0.85, accuracy ≥ 0.90,
        │     worst-intent F1 ≥ 0.60, p95 inference < 10 ms, size budget, no network API,
        │     60 unseen golden phrasings must resolve to the expected intent
        │
        ├─ app/src/lib/ask/nlp.ts            inference in the browser (desktop + PWA)
        │     parity test against a fixture emitted by the trainer (same scores ±1e-6)
        └─ app/src/lib/ask/{engine,catalog,seed,conversation}.ts
```

**Preprocessing (Tamil-aware, no third-party library)**

- Unicode NFC; strip ZWJ/ZWNJ noise, punctuation, digits (digits are handled as "kural number").
- Light Tamil suffix stripping (`ஐ, ஆல், ஆன், இல், இன், உக்கு, ஓடு, உடன், ஆக, அது, க்கு, கள்` …)
  with a protected-stem list so `கோபம்` never degrades.
- **Transliteration normaliser**: Tamil → deterministic Latin (ISO-15919-ish) so `கோபம்`
  matches `kobam`; plus a small spelling-alias map for common Tanglish variants
  (`kovam/kobham/koபம்` → `கோபம்`).
- English: lowercase + Porter-lite stemmer; stop-word list per language.
- Features: word unigrams + bigrams, **character 3–5-grams** (handles Tamil agglutination and
  typos), hashed into 2^15 buckets, sublinear TF, L2-normalised.

**Models (all pure JS, all compared in the trainer)**

1. **Multinomial Naive Bayes** — the fast, small baseline (log-prob weights).
2. **Softmax (multinomial logistic) regression** — SGD with L2 + early stopping.
3. **Linear SVM (hinge loss, one-vs-rest)** — strong on short utterances.
Best model by held-out macro-F1 wins; the artifact records which. Expected size with hashing
and int8 quantisation: **40–120 KB**, lazy-loaded on first Ask open (no first-paint cost).

**Hybrid backstop (never a silent guess)**

- `confidence ≥ τ` → answer with that intent.
- `τ_low ≤ confidence < τ` → answer **and** show "நான் புரிந்தது: X · did you mean…" chips.
- `< τ_low` → clarifying turn with the top-3 intents as chips, plus a lexical (TF-IDF
  cosine) fallback over the corpus so a well-known keyword ("பொறுமை", "patience") still lands.
- Explicit **crisis** path runs *before* classification (rule layer over a dedicated trained
  crisis class) — see §4.4.

**Randomness** — mulberry32 seeded per session ⊕ turn; the draw is uniform over the intent's
Kural pool, skipping kurals already shown in the session; "another" advances the seed. Tests
inject a fixed seed and assert determinism + no repeats.

### B.2 Intent catalog (the mapping layer)

~40 intents — anger, patience, grief & loss, fear & anxiety, worry about the future, failure,
study & exams, learning, perseverance, procrastination, poverty, money & debt, work & career,
leadership, duty, friendship, betrayal, bad company, family, parents, children, marriage,
love & longing, separation, envy, ego & pride, humility, gossip & backbiting, truth & lying,
speech control, kindness & charity, hospitality, gratitude, forgiveness, doubt & decisions,
self-discipline, impermanence, loneliness, hope, courage, moderation, shame — each with:

```jsonc
{
  "id": "anger",
  "label": { "ta": "கோபம்", "en": "Anger" },
  "mood": "hot",
  "chapters": [31, 32, 33],           // chapters that genuinely discuss it
  "themes": ["anger"],
  "anchorKurals": [301, 305],         // optional strong examples
  "voice": { "ta": "…", "en": "…" },  // app-original one-liner, never Kural text
  "prompts": ["சிறு விஷயத்திற்கே கோபம் வருகிறது", "I lose my temper too fast", …]
}
```

Validated by `scripts/test-ask-content.mjs`: chapter ids exist and relate to the intent
(name/theme stem match or reviewed allow-list), prompt ids resolve, voice lines ≤ 120 chars,
no HTML, Tamil-script checks for Tamil fields, no duplicate prompt strings, ≥ 6 prompts per
intent overall (across all languages, ≥ 26 prompts in the opening pool).

### B.3 Opening prompts (your "random prompts at the beginning")

- Pool of 26–30 reviewed prompts (Tamil, English, Tanglish), each bound to an intent.
- On open: **4 sampled at random**, no repetition across the session, reshuffled each open,
  plus 🎲 "எதையாவது சொல் / Surprise me" (random intent, labelled as random) and 6 mood chips.
- Prompts may not name a chapter or Kural number, so they can never promise content the
  corpus lacks.

### B.4 Safety

- **Crisis layer first**: தற்கொலை, சாக வேண்டும், kill myself, suicide, self-harm, abuse … →
  a calm one-liner ("இந்த வலிக்கு ஒரு மனிதர் தேவை — நான் ஒரு பழைய பாடல் மட்டுமே அறிவேன்."),
  a compassion Kural, and real help: **Tele-MANAS 14416** (India, 24×7), **KIRAN
  1800-599-0019**, `findahelpline.com` (other countries). Numbers re-verified at build time
  against official sources and stored in one editable block.
- **No advice**: medical/legal/financial phrasings deflect politely + a Kural on effort/patience.
- Input cap 500 chars; rendered with `textContent`; static test asserts the engine files
  contain no `fetch(`/`XMLHttpRequest`/`WebSocket`/`eval`.

### B.5 UI steps (React)

| Step | Work |
| --- | --- |
| **B1** | `/#/ask` view (`AskView.tsx`) + entry points: Home hero action, top bar, palette command, PWA shortcut `./#ask`, deep link `#ask`. |
| **B2** | `components/ask/{ChatMessage,PromptChips,TypingDots,AskComposer,TopicEcho}.tsx` — reuse `GlassCard`, `Button`, `KuralVerse`, store (save), toasts; user bubble right / Valluvar bubble left with rosette avatar; typing dots gated on reduced motion; "another / save / listen / share / open / not-quite" action row. Listen appears when the speech port lands in the rewrite (feature list of the migration, not faked). |
| **B3** | Conversation state: last intent, shown kurals, history (`tamil-stoic-ask-v1`, last 20 turns, device-only), "clear conversation", restore on reopen; keyword extraction echo ("நான் புரிந்தது: …"). |
| **B4** | i18n: `ask.*` strings in the Tamil dictionary; replies follow UI language; the Kural is always Tamil + meaning. |
| **B5** | Accessibility: `role="log"` + `aria-live="polite"` announcing only "Kural #n · topic"; labelled composer; Enter sends / Shift+Enter newline; focus returns to the trigger; 44 px targets; axe-clean (added to the a11y suite). |
| **B6** | Shared entry point for the vanilla app during the transition: minimal `#ask` dialog wired to the same model artifact (so the live site is not behind while the flip lands). |

---

## 5. Migration program (React → live)

The React app must reach parity before the live switch; the two features ride in the same
train. Six phases, each with a checklist gate:

| Phase | Content | Gate |
| --- | --- | --- |
| **M1 — Reader core** | Browse list with lazy scroll, search + suggestions + recent searches, theme/situation filters, three books, chapter navigation, 133-chapter map, chapter intro cards, deep links (`#kural-n`, `#theme-*`, `#q=`) | React feature tests + a11y |
| **M2 — Reader comfort** | Saved collection + reflection editor, settings (size, spacing, theme, layers, language, motion, contrast), focus reader, TTS Listen, sharing (native, copy link, PNG share card), print styles | parity checklist vs the live app |
| **M3 — Discovery & trust** | Reading journey (read marks, visited chapters, gentle streak), onboarding tour, command palette + shortcuts + help, credits & licenses, Tamil UI dictionary | parity checklist |
| **M4 — PWA & offline** | Workbox precache of corpus/fonts/textures, prompt-update flow, offline banner, install prompt, `share_target` (`?q=`), manifest shortcuts | SW/offline test |
| **M5 — Test parity** | Port the suites: a11y (axe), contrast (already in `app/`), content integrity, service worker, credits/notices; add component tests (jsdom) for the chat and the couplet invariant | all suites green in CI |
| **M6 — Live flip** | `deploy.yml`: `cd app && npm ci && npm run build` → publish `app/dist` (base `/tamil-stoic-app/` already configured); smoke test the Pages URL; keep the vanilla files in-repo as rollback for one release, then retire them in a final commit (with their suites) | live smoke + rollback rehearsal |

**No phase ships live until M6**; until then the deployed vanilla site keeps working, and the
only vanilla change is the couplet fix (A9) so users never see broken verses.

---

## 6. Sequencing (commit plan for the PR — parity first, per D2)

**Phase 1 — React parity (M1–M6) → live.** Nothing in Phase 1 ships the two features; it ends
with the React build on GitHub Pages.

| # | Commit | Gate |
| --- | --- | --- |
| 1 | `docs: plan + locked decisions` (this document) | — |
| 2 | `feat(reader-core): browse, search, books, chapters, map, deep links` (M1) | React feature tests + a11y |
| 3 | `feat(reader-comfort): saved, settings, focus reader, TTS, sharing, print` (M2) | parity checklist vs live app |
| 4 | `feat(discovery): journey, onboarding, palette, shortcuts, credits, Tamil UI` (M3) | parity checklist |
| 5 | `feat(pwa): offline precache, update flow, share_target, shortcuts` (M4) | offline test |
| 6 | `test(parity): port a11y/content/SW/credits suites + component tests` (M5) | all suites green in CI |
| 7 | `chore(deploy): publish the React build` (M6) | live smoke + rollback rehearsal |

**Phase 2 — couplet contract (A).**

| # | Commit | Gate |
| --- | --- | --- |
| 8 | `content: canonical couplet pairs + spacing audit` (A1–A5) | content + couplet tests |
| 9 | `feat(reader): KuralVerse — frozen 4/3 couplet pair` (A6–A10) | couplet invariant at every accessibility setting |

**Phase 3 — Ask Valluvar (B).**

| # | Commit | Gate |
| --- | --- | --- |
| 10 | `feat(nlp): utterance corpus, trainer, model, evaluation report` (B.1) | macro-F1 / latency / size gates |
| 11 | `feat(ask): catalog, engine, safety, conversation` (B.2–B.4) | engine + content tests |
| 12 | `feat(ask): Ask Valluvar UI` (B.5) | a11y + component tests |

**Phase 4 — close-out.**

| # | Commit | Gate |
| --- | --- | --- |
| 13 | `docs: README, credits, status + PR notes` | full CI + live smoke |

Every commit is independently revertible; the vanilla reader is untouched throughout except a
one-line couplet stopgap until commit 7.

## 7. File map

**New (React)**

```
app/src/components/kural/KuralVerse.tsx
app/src/components/ask/{ChatMessage,PromptChips,TypingDots,AskComposer,TopicEcho}.tsx
app/src/views/AskView.tsx (+ browse/search/saved/settings/focus/chapters views for M1–M3)
app/src/lib/ask/{nlp,engine,catalog,seed,conversation,types}.ts
app/src/lib/ask/model.json                (mirrored from data/ask-model.json)
app/src/i18n/{ta,en}.ts                   interface dictionary
app/scripts/{train-parity,test-couplets,test-ask,test-a11y,test-sw}.mjs
```

**New (pipeline, shared)**

```
data/ask/utterances.jsonl                 labeled utterances (intents × ta/en/tanglish)
data/ask/catalog.json                     intents, chapters, prompts, voice lines, safety block
data/ask-model.json                       trained, quantised classifier artifact (generated)
data/couplet-lines.json                   canonical display pairs (generated)
scripts/train-ask-model.mjs               trainer + evaluation
scripts/test-ask-model.mjs                CI gates (accuracy, macro-F1, latency, size)
scripts/test-ask-content.mjs              catalog validation
scripts/test-couplets.mjs                 corpus-wide couplet contract
scripts/build-couplet-lines.mjs           manifest generator (--check)
docs/couplet-audit.md · docs/ask-model-report.md · docs/ask-valluvar-content.md
```

**Modified** — `app/{vite.config.ts,package.json,index.html}`, `app/src/**` call sites,
`data/kurals.js` (regenerated), `scripts/{content-quality,test-content}.mjs`,
`.github/workflows/{content-check,deploy}.yml`, `README.md`, `THIRD_PARTY_NOTICES.md`,
`manifest.webmanifest`, and (stopgap only) `js/app.js`.

## 8. Test & CI matrix

| Suite | Assertions |
| --- | --- |
| `test-content.mjs` | 1,330 kurals intact; 2 Tamil lines; pair matches the manifest; corrections ledger drift |
| `test-couplets.mjs` (new) | all 1,330 pairs; #10/#42/#82/#331 fixtures; **no renderer re-cuts** (guard against `slice(0, 4)`); the 29 carry sources |
| `test-ask-content.mjs` (new) | catalog schema, chapter/theme validity, prompts, voice lines, safety block, no HTML |
| `test-ask-model.mjs` (new) | macro-F1 ≥ 0.85, accuracy ≥ 0.90, worst-intent F1 ≥ 0.60, 60 golden phrasings, p95 < 10 ms, size ≤ 120 KB, no network APIs |
| `app/scripts/test-ask.mjs` (new) | trainer↔browser score parity; determinism with a fixed seed; no repeats; unknown → clarifying chips; crisis → helpline path; 500-char cap; XSS-safe rendering |
| `app/scripts/test-couplets.mjs` (new) | the pair is identical at every accessibility setting (size/spacing/contrast/motion/layers), in print and in chat |
| `test-a11y.mjs` (ported) | axe-clean: shell, every dialog, the Ask thread in both states |
| `test-sw.mjs` (ported) | corpus/fonts/textures/model precached; offline boot; update prompt |
| `test-tokens.mjs` (existing) | contrast pairs unchanged; new chat surfaces reuse tokens |
| Deploy job | build the React app, publish `app/dist`, smoke-check the Pages URL |

## 9. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Forcing 4/3 would break a word in ~15 kurals | D1: never cut a word; the standard அடி split holds for those, recorded as data + sources and verified by test |
| Migration is large; quality could dip | Phased M1–M6 with parity checklists; nothing flips live until M6; vanilla stays as rollback for one release |
| Classifier accuracy on short/mixed-script input | Character n-grams + transliteration normalisation + hybrid fallback + explicit CI thresholds and per-intent F1 floor |
| Model bloat / first-paint cost | Hashed features + int8 weights, lazy load on first open, size gate in CI |
| Tamil content edits are sensitive | Only spacing; reviewed ledger with sources; upstream drift breaks the build |
| Accessibility regressions during a rewrite | Ported axe/contrast/target suites become gates before the flip |

## 10. Out of scope

- No LLM, no API keys, no backend, no accounts (per your NLP answer).
- No new translation of the Kural; English stays Pope + existing glosses.
- No change to the recension, chapter structure, or corpus sources.
- No analytics, no tracking, no push notifications.

## 11. Definition of done

- [ ] React app at parity (M1–M5 checklists) and **live** on Pages (M6), vanilla retired or parked as documented rollback.
- [ ] Every Tamil couplet renders the frozen two-line pair on every surface and at every accessibility setting; 1,313+ literally 4/3; the remaining ~15 keep the standard அடி split (D1), documented with sources.
- [ ] Ask Valluvar answers from a trained on-device intent classifier; random prompts on open; "another" re-rolls without repeats; every answer is a real Kural in the frozen layout.
- [ ] Crisis path, no-advice rule, 500-char cap, local-only history, no network call — all tested.
- [ ] Model report published; CI gates green (accuracy/F1/latency/size, a11y, contrast, offline, content).
- [ ] README, credits, license notices, privacy note updated; PR opened from `arena/01a0ffe1-tamil-stoic-app`.

---

## 12. Decisions (locked)

**D1 — couplet fidelity: option (a), "never cut a word".**
The layout is the standard two அடிகள்: first அடி (4 சீர்) on top, second அடி (3 சீர்) below.
- 4 words + 3 words literally for the 1,301 kurals whose standard text divides that way, plus
  the ~11–13 whose spacing defects are corrected in A3 — i.e. **1,313+ of 1,330**.
- The remaining ~15 (e.g. #42's 3-word முதல் அடி, #331's 4+2, #82's சீர் boundary inside
  `வேண்டற்பாற்றன்று`) keep the **standard அடி split**; **no word is ever cut**, and each is
  documented with its sources in `docs/couplet-audit.md` and listed in `data/couplet-lines.json`.
- Rejected: forcing 4/3 by inserting சீர்-boundary spaces inside words (it would show
  `துவ்வாத வர்க்கும்` on screen) — the option stays documented in the audit as a considered
  alternative, not implemented.

**D2 — migration and live flip: option (b), parity first.**
The full React migration (M1–M6, including the deploy flip to `app/dist`) lands **before** the
two features, and all of it lives in this PR.

**D3 — brain: traditional NLP intent classifier** (see §4.1), trained in-repo, running
on-device on desktop and PWA. No LLM, no network, no key.

**D4 — just the two features** plus the migration; nothing else is folded in.

## 13. Appendix — intent list and sample dialogue

Intents (40): anger · patience · grief & loss · fear & anxiety · worry about the future ·
failure · study & exams · learning · perseverance · procrastination · poverty · money & debt ·
work & career · leadership · duty · friendship · betrayal · bad company · family · parents ·
children · marriage · love & longing · separation · envy · ego & pride · humility · gossip &
backbiting · truth & lying · speech control · kindness & charity · hospitality · gratitude ·
forgiveness · doubt & decisions · self-discipline · impermanence · loneliness · hope ·
courage · moderation · shame.

```
வள்ளுவர்   வணக்கம். இன்று உங்கள் நெஞ்சில் என்ன இருக்கிறது? ஒரு வார்த்தையில் சொல்லுங்கள்.
           [ சிறு விஷயத்திற்கே கோபம் வருகிறது ] [ பயமாக இருக்கிறது ]
           [ My friend let me down ]            [ பணம் நினைப்பே கவலையாகிறது ]
           [ 🎲 எதையாவது சொல் ]                  (உங்கள் உரை இந்தச் சாதனத்தை விட்டு வெளியேறாது)

நீங்கள்    என் நண்பன் என்னை ஏமாற்றிவிட்டான்
வள்ளுவர்   நான் புரிந்தது: நட்பு · Friendship   (conf 0.91)
           ── குறள் #… (real corpus text) ──
           ⟨முதல் அடி — 4 சீர்⟩
           ⟨ஈற்றடி — 3 சீர்⟩
           ⟨ஒலிபெயர்ப்பு⟩ · ⟨Pope (1886)⟩ · ⟨எளிய பொருள்⟩
           [ மற்றொன்று ] [ சேமி ] [ கேள் ] [ பகிர் ] [ முழுதும் படி ] [ பொருந்தவில்லை ]
```

*(No verse is quoted in this plan document on purpose — the app always renders real corpus
text through `KuralVerse`.)*
