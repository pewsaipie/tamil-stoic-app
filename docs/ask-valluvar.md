# Ask Valluvar — வள்ளுவரைக் கேள்

**Status:** implemented (route `#/ask`), model gates enforced by
`app/scripts/test-intent.mjs` and `npm run train:intent`.
**Decision (locked):** traditional NLP intent classification, running **on the
device** — desktop and PWA. No cloud model, no API key, no account, no network
call at answer time.

A reader describes what they are going through — `எனக்கு கோபம் வருகிறது`,
`enakku bayama irukku`, `I feel lonely` — and the app answers with a couplet from
the chapter that speaks to it, names the chapter, and can read it aloud or hand it
to the reader. The reader's words never leave the device.

---

## 1. How it works

Two classical stages, in this order. `src/lib/intentClassifier.ts` is the only
place that decides, and it reports which stage answered (`source`).

```
reader's words
   │
   ├─ 1. lexicon  (src/lib/lexicon.ts)
   │     exact keyword match, then fuzzy match:
   │       • agglutinated form     kovathala  → kovam
   │       • misspelling           lonley     → lonely
   │     single words ≥ 4 characters, exact phrase windows tried longest-first
   │
   └─ 2. Naive Bayes  (src/lib/intentFeatures.ts)
         multinomial NB over hashed features:
           w:<stem>    word unigram (Tamil suffix-stripped, romanisation folded)
           b:<a>_<b>   word bigram
           c:<ngram>   character 4-grams of each stem
           p:<prefix>  3-character prefix
         features hashed FNV-1a into 8,192 buckets; weights are
         log-likelihood ratios against a background model
```

**Why a lexicon first.** Tamil is agglutinative and most readers type either Tamil
script or Tanglish. A purely statistical model trained on a few hundred keywords
generalises poorly to a word it has never seen (measured: **34.7%**, see §4), while
a rule-based lexicon catches inflections and transliterations exactly. The
statistical model is the fallback for sentences whose words are not in the lexicon,
and both stages are evaluated together.

**Support is a rule, not a score.** `crisis` and `abuse` phrases are matched against
the support keywords *before* anything else runs, and the support intents own **no
chapters at all**, so the code path that would quote a couplet cannot be reached.

**Out-of-scope gets a question, not scripture.** A class of greetings and unrelated
sentences (`smalltalk`, `src/lib/intents.ts`) is trained alongside the subjects, and
a minimum-evidence guard rejects input the model has barely seen. Both routes return
prompt chips — "here is what you can ask me" — instead of a random kural.

## 2. The taxonomy, and why the answers are safe

37 subject/support intents, each listing **chapters of the corpus itself**
(`chapters: number[]`), never hand-picked couplets. `askValluvar()` picks randomly
among the couplets of those chapters, so:

- an answer can only ever be Thirukkural text the app already ships — nothing is
  composed, paraphrased or invented;
- the chapter named in the reply is the corpus's own Tamil and English chapter name;
- re-rolling ("Another") moves within the intent's chapters, and a couplet already
  shown in the conversation is not repeated.

| group | intents |
| --- | --- |
| Feelings | anger, fear, grief, loneliness, hope, failure, self-worth, insult, envy, forgiveness |
| Everyday life | work, study, money, family, marriage, friendship, betrayal, love, separation, health, habit, time |
| Character | truth, patience, gossip, greed, giving, compassion, equality, decision, leadership, faith, gratitude, impermanence, fate |
| Support | crisis, abuse |
| Out of scope | smalltalk |

## 3. The model

- **Training data** is generated from the taxonomy: every keyword (Tamil and
  romanised) is combined with eight sentence frames in its own script, plus the
  written examples. 38 classes, **4,726 rows**, 31 keyword groups.
- **Weighting**: multinomial NB with Laplace smoothing (α = 0.2), scored as
  **log-likelihood ratios against the background model**, so a class with a bigger
  keyword list cannot win on table size alone.
- **Quantisation**: per class, the 512 largest-magnitude weights become
  `(uint16 bucket, int8 weight)` pairs with one `float` scale, base64-encoded.
  `encodeModel()` (build) and `decodeModel()`/`createClassifier()` (runtime) live in
  the same module, so the artifact cannot drift from its reader.
- **Size**: **48.5 KB** shipped (`app/public/data/intents.json`), budget 120 KB,
  precached by the service worker so answers work offline.

## 4. Evaluation

`npm run train:intent` re-trains and prints these; `npm run test:intent` re-runs the
whole thing in `--check` mode, so CI fails if the committed artifact drifts or any
gate regresses.

**Paraphrase held out — the headline gates.** 5-fold cross-validation grouped by
*sentence frame*: a frame is never in both halves of a fold, so the model is scored
on sentence shapes it has not seen while the vocabulary stays available.

| metric | value | gate |
| --- | --- | --- |
| accuracy | **99.05%** | ≥ 90% |
| macro F1 | **0.991** | ≥ 0.85 |
| worst intent F1 | **0.952** (compassion) | ≥ 0.60 |
| p95 latency | **0.05 ms** | < 10 ms |
| artifact | **48.5 KB** | ≤ 120 KB |
| per-fold accuracy | 0.997, 0.981, 0.985, 0.988, 0.998 | — |

**Unseen word held out — reported, not gated at the headline level.** The same
5-fold run grouped by *keyword* instead: every tested sentence contains a word the
model was never shown.

| metric | value | gate |
| --- | --- | --- |
| accuracy | **34.7%** | ≥ 25% (chance 2.6%) |
| macro F1 | 0.368 | — |

This is the honest measure of the lexical boundary, and it is why the product has a
fallback path: **vocabulary outside the lexicon is answered with a question**
(prompt chips and the two nearest intents), not with a confident guess. Raising the
feature count (char 3-grams, top-1024 weights) moved this number by 0.2 points for
37% more size — it is a vocabulary limit, not a tuning problem. See §6.

**Safety is asserted, not measured.** `test:intent.mjs` checks that 12 support
phrasings — `தற்கொலை`, `I want to end my life`, `kill myself`, `he beats me`,
`domestic violence`, … — all reach the support card, that the card carries the
helplines, that `crisis` owns no chapters, and that unrelated input falls back in
both scripts.

## 5. Support, verbatim

Shown before anything else, in Tamil and English, when `crisis` or `abuse` is
detected — never a couplet on its own:

| line | who |
| --- | --- |
| **14416** | Tele-MANAS — India's national mental-health helpline, free, 24 hours |
| **1800-599-0019** | KIRAN — Ministry of Social Justice, in 13 languages |
| **findahelpline.com** | helplines by country |

## 6. Limits, stated plainly

- **Vocabulary.** The classifier knows the words in `src/lib/intents.ts` and the
  morphology they share. A synonym nobody listed is not understood; the fallback
  path asks instead of guessing. Adding a keyword is a one-line change plus
  `npm run train:intent`.
- **Script bridging.** Tamil and romanised keywords are listed separately, so
  Tamil-script input is matched by Tamil keywords and Tanglish by romanised ones.
  Automatic Tamil→Latin transliteration to bridge the two is possible future work,
  not shipped.
- **Not clinical.** Ask Valluvar offers a couplet and, when the words call for it, a
  helpline. It is not a therapist, and the app never claims otherwise.
- **No memory beyond the page.** The conversation lives in the component's state;
  nothing is stored or sent, and the shown-couplets list lasts one visit.

## 7. Working on it

```bash
cd app
npm run train:intent     # retrain, evaluate, rewrite public/data/intents.json
npm run test:intent      # gates + safety + answer integrity (runs in npm test)
npm run typecheck
```

- Add a subject: add an `AskIntent` to `src/lib/intents.ts` (Tamil and romanised
  keywords, examples, and the corpus chapter numbers it should answer from), then
  retrain.
- The taxonomy is data; the model is derived. Nothing else needs editing.
- Never map an intent to hand-picked couplet text — map it to chapters, so the
  answer is always drawn from the corpus.
