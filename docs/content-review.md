# Content correction review — 28 September 2026

## Status: correction pass, not complete literary sign-off

Accuracy takes precedence over interface polish. This pass fixes confirmed corruption and
selected translation problems. **It does not certify all 1,330 Tamil verses and both English
layers as fully proofread.** Automated agreement between electronic witnesses is not proof
of correctness: those witnesses share some transcription errors. A verse-by-verse semantic
review of the remaining English meanings, comparison against a reliable printed Tamil
edition, and Tamil-editor sign-off remain outstanding. UI copy and every chapter translation
have not received a literary review either.

## Coverage and changes

- All **1,330** Tamil couplets compared at the character level with a Project Madurai-derived
  witness; all 1,330 also aligned by number with the alternative JSON witness while reviewing
  discrepancies. Spaces, punctuation, and Unicode normalization differences were ignored
  for comparison, not automatically rewritten in the displayed text.
- All **1,330** records checked for completeness, numbering, book/chapter assignment,
  encoding corruption, and nonempty Tamil/transliteration/English/simple-English layers.
- **59 distinct Kurals corrected**: 25 Tamil texts, 19 transliterations, 2 English verse
  entries, and 30 simple-English meanings. These counts overlap.
- Removed all eight occurrences of unassigned Tamil-block code points in verse text and
  repaired nine transliterations containing the Unicode replacement character.
- Kural 1117's repeated `க்குப்` fragment removed. Kural 710's missing English line break
  restored. Kural 600's `excellance` corrected to `excellence`.
- Meaning corrections include desire **and aversion** (#4), good and evil deeds (#5),
  rebirth (#10), sowing rather than ploughing (#85), the palmyra tree rather than fruit (#104),
  and the learners' humility rather than the unlearned begging (#395). Added motivational
  sentences were removed from selected meanings where they were not part of the verse.
- Classical forms such as `தொழாஅர்`, `தூஉம்`, and `வெருஉம்` are intentional, not spelling errors.
  Word division and sandhi can vary by edition. The corrections do not globally modernize
  Tamil or rewrite the historical English verse into contemporary English.

The exact old/new text, layer, rationale, and reference URLs for each correction are in
[`scripts/content-corrections.json`](../scripts/content-corrections.json). The source English
prose is a comparison aid, **not an infallible authority**: some meaning corrections follow
Tamil rather than that prose. Editorial choices such as #3, #63, and #68 should receive
bilingual-editor review before any claim of complete scholarly verification.

### Remaining Tamil witness differences

After correction, **1,310/1,330** match the Project Madurai-derived witness after comparison
normalization. The 20 remaining differences are not automatically treated as app errors:

| Kurals | Disposition |
| --- | --- |
| 34, 49, 330 | Preserve existing joined/expanded forms; edition/word-boundary review still useful. |
| 27, 360 | Preserve current readings; resolve textual variants with a printed edition rather than guessing. |
| 50, 55, 79, 126, 153, 196, 254, 666, 673, 812, 994, 1000 | Do not import apparent omissions/corruption from the electronic reference. Final edition collation remains open. |
| 154, 650, 1202 | Corrected despite corrupt electronic witnesses; rationale and supporting references recorded in the ledger. |

Matching records can still contain shared errors. In particular, the English changes here
are selected corrections, **not** an exhaustive semantic review of the unchanged 1,300 simple
meanings or unchanged 1,328 historical English verse entries. Do not label them “verified”
on the strength of these tests.

## Sources and reproducibility

External datasets remain outside the repository. No complete third-party text has been
newly vendored. Consult the original headers/licences before redistributing those files.

| Witness | Revision inspected |
| --- | --- |
| [tk120404/thirukkural](https://github.com/tk120404/thirukkural), `thirukkural.json` and `detail.json` (build input; Apache-2.0) | `cf3ff6c5a73c23b4092913156830457caab65fd4` |
| [b1zantine/thirukkural-dataset](https://github.com/b1zantine/thirukkural-dataset), `thirukkural.txt` (Project Madurai-derived comparison witness) | `ae853f76e31b7e9fbe05652df98d376ce7fbcf79` |
| [vijayanandrp/Thirukkural-Tamil-Dataset](https://github.com/vijayanandrp/Thirukkural-Tamil-Dataset), `data/all_kural.json` (additional electronic witness; not assumed independent) | `f04ebce50f96c6b2a1ce7bd50d02d5971d036c98` |

Project Madurai originals: [Tamil](https://www.projectmadurai.org/pm_etexts/utf8/pmuni0001.html)
and [Pope/Drew/Lazarus/Ellis English](https://www.projectmadurai.org/pm_etexts/utf8/pmuni0153.html).
These electronic editions contain errors too; their attribution notices must be retained if
redistributing the complete files. Additional corroboration: [Kural 650](https://tamil.oneindia.com/art-culture/kural/65.html)
and [Kural 1202](https://thirukkural.io/kural/1202).

Fetch pinned build inputs using authenticated GitHub CLI if not already available:

```sh
mkdir -p ../datasets/tk120404_thirukkural
for file in thirukkural.json detail.json; do
  gh api "repos/tk120404/thirukkural/contents/$file?ref=cf3ff6c5a73c23b4092913156830457caab65fd4" \
    -H 'Accept: application/vnd.github.raw+json' > "../datasets/tk120404_thirukkural/$file"
done
node scripts/build-kurals.mjs
node scripts/test-content.mjs

gh api 'repos/b1zantine/thirukkural-dataset/contents/thirukkural.txt?ref=ae853f76e31b7e9fbe05652df98d376ce7fbcf79' \
  -H 'Accept: application/vnd.github.raw+json' > ../datasets/tamil-reference.txt
node scripts/audit-tamil-reference.mjs ../datasets/tamil-reference.txt
```

## Guardrails and delivery

Corrections run **after** both the curated entries and generated glosses. Each correction
checks its expected old text before applying: upstream changes fail the build and require
review rather than silently overwriting a different reading. The original curated entries
are no longer exempt from correction. The builder rejects incomplete output before writing.
The generated `data/kurals.js` is checked in, so Pages and offline readers receive corrections.
The service-worker cache version is bumped; existing installations still use the app's
reader-controlled update flow. Favorites/reflections and stable Kural IDs are unchanged.

`node scripts/test-content.mjs` requires no downloaded reference and no npm dependencies.
It checks the whole published corpus, correction outputs, and deliberate corruption/drift
fixtures. CI runs it on pull requests and pushes; deployment also runs it before publishing.
A passing test means **structurally sound with the recorded corrections**, not “perfectly translated.”
