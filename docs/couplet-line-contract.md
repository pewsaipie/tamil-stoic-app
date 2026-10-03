# Couplet line contract — 4 words on top, 3 below (never a paragraph)

**Status:** locked, implemented, enforced by `app/scripts/test-couplet.mjs` and `app/scripts/test-render.mjs`.
**Decision (D1):** the reader shows every one of the 1,330 couplets as a fixed
two-line block — **at most four words on the top line, and at most three words on
the bottom line** (**1,324** couplets at `4 / 3`, and **6** compound-சீர் couplets at
`3 / 3` or `4 / 2`) — as the default presentation in every surface. Each of the two
lines renders on a **single horizontal visual line (`white-space: nowrap`)** that
automatically scales to fit its container so a couplet **never wraps into a
multi-line paragraph**, and **no accessibility setting changes the two-line split**.

## 1. Why four over three is the standard

A குறள் is one **குறள் வெண்பா** stanza built from exactly **seven சீர்**. The split is
fixed by the metre and is not a typographic choice:

| | சீர் | line |
| --- | --- | --- |
| முதல் அடி (top line) | 4 | first |
| ஈற்றடி (bottom line) | 3 | second |

- Tamil Wikipedia, [திருக்குறள்](https://ta.wikipedia.org/wiki/திருக்குறள்): every
  குறள் has *"முதல் வரியில் நான்கு சீர்களும் இரண்டாவது வரியில் மூன்று சீர்களும்"*
  (four சீர் in the first line, three in the second), and *"ஒரு சீர் என்பது ஒன்று
  அல்லது ஒன்றுக்கு மேற்பட்ட தமிழ்ச் சொற்களின் கூட்டுச்சொல்"* (a சீர் is one or more
  Tamil words together).
- English Wikipedia, [Couplet § In Tamil poetry](https://en.wikipedia.org/wiki/Couplet):
  "Each Kural couplet is made of exactly 7 words—4 in the first line and 3 in the
  second."
- English Wikipedia, [Venpa](https://en.wikipedia.org/wiki/Venpa): the metre family
  (குறள் வெண்பா is its shortest member).

## 2. How the app implements it

- `app/src/lib/couplet.ts` is the **only** place a couplet is turned into lines.
  `coupletLines(kural)` returns the two standard lines and never moves, merges,
  re-cuts or truncates anything.
- `app/src/components/kural/KuralVerse.tsx` (the single verse renderer, used by the
  focus reader, Today's card, chapter lists, saved cards, reflection dialog and Ask
  Valluvar) renders them as `<span class="verse__line" data-verse-line="1">` and
  `<span class="verse__line" data-verse-line="2">`.
- **Never a paragraph on screen:** `.verse__line` enforces `display: block;
  white-space: nowrap;` so neither the 4-word top line nor the 3-word bottom line
  ever wraps into a 3- or 4-line paragraph. `.verse` uses CSS container-query
  sizing (`cqi`) plus a `ResizeObserver` / `useLayoutEffect` measurement in
  `KuralVerse.tsx` so the font size adapts cleanly to fit any screen width or
  accessibility setting without horizontal clipping.
- **Accessibility never breaks the two-line couplet.** Text size (`standard`,
  `large`, `x-large`), line spacing (`comfortable`, `relaxed`), colour mode, reduced
  motion, higher contrast and the layer toggles scale the typography while keeping
  the exact two-line couplet structure intact.

## 3. The 1,324 + 6 result (100% within ≤ 4 over ≤ 3)

After repairing the 23 upstream intra-word/intra-சீர் spacing defects in
`scripts/content-corrections.json` (such as `பட் ட` → `பட்ட`, `தவர் க்கு` → `தவர்க்கு`,
`இவ் வூர்` → `இவ்வூர்`, `என் னெஞ்சு` → `என்னெஞ்சு`, `வேண் டற்பாற்` → `வேண்டற்பாற்`),
measured over the shipped corpus (`app/public/data/kurals.json`, all 1,330 couplets):

| word counts (top / bottom) | couplets |
| --- | --- |
| **4 / 3** — four words on top, three below | **1,324** |
| **3 / 3** or **4 / 2** — compound word carrying two சீர் (documented below) | **6** |
| **> 4 on top or > 3 below** | **0** |

In the 6 couplets below, a single written Tamil word carries two சீர், so the
standard 4 சீர் / 3 சீர் split yields `3 / 3` or `4 / 2` without cutting a word:

| குறள் | words top / bottom | where the word count departs from 4 / 3 | couplet as shown |
| --- | --- | --- | --- |
| 42 | 3 / 3 | முதல் அடி: fewer tokens than சீர் | `துறந்தார்க்கும் துவ்வாதவர்க்கும் இறந்தார்க்கும்`<br>`இல்வாழ்வான் என்பான் துணை` |
| 331 | 4 / 2 | ஈற்றடி: fewer tokens than சீர் | `நில்லாத வற்றை நிலையின என்றுணரும்`<br>`புல்லறிவாண்மை கடை` |
| 379 | 4 / 2 | ஈற்றடி: fewer tokens than சீர் | `நன்றாங்கால் நல்லவாக் காண்பவர் அன்றாங்கால்`<br>`அல்லற் படுவதெவன்` |
| 619 | 3 / 3 | முதல் அடி: fewer tokens than சீர் | `தெய்வத்தான் ஆகாதெனினும் முயற்சிதன்`<br>`மெய்வருத்தக் கூலி தரும்` |
| 689 | 4 / 2 | ஈற்றடி: fewer tokens than சீர் | `விடுமாற்றம் வேந்தர்க்கு உரைப்பான் வடுமாற்றம்`<br>`வாய்சேரா வன்கணவன்` |
| 972 | 4 / 2 | ஈற்றடி: fewer tokens than சீர் | `பிறப்பொக்கும் எல்லா உயிர்க்கும் சிறப்பொவ்வா`<br>`செய்தொழில் வேற்றுமையான்` |

### Notes on the 6 compound-சீர் couplets, with sources

- **#42** — modern editions print `துறந்தார்க்கும் துவ்வாதவர்க்கும் இறந்தார்க்கும்`
  as the முதல் அடி: three words for four சீர், because *துவ்வாதவர்க்கும்* carries two
  சீர். Source: [kural.page #42](https://kural.page/tamil/thirukkural-42-ilvaazhkkai).
- **#331** — the standard text `நில்லாத வற்றை நிலையின என்றுணரும் / புல்லறிவாண்மை கடை`
  puts four words over two, since *புல்லறிவாண்மை* carries two சீர். Source:
  [Dinamalar — திருக்குறள் 331](https://www.dinamalar.com/thirukural/34/331).
- **#379, #619, #689, #972** — likewise keep a two-சீர் compound intact (*படுவதெவன்*,
  *ஆகாதெனினும்*, *வன்கணவன்*, *வேற்றுமையான்*) rather than cutting inside a word.
  Source: [Project Madurai PM0001](https://www.projectmadurai.org/pm_etexts/utf8/pmuni0001.html).

## 4. What the suite enforces

`app/scripts/test-couplet.mjs` (part of `npm test`) fails if:

1. any couplet is missing a line, or has more or fewer than two lines;
2. any couplet has more than 4 words on the top line or more than 3 words on the bottom line;
3. any couplet's lines, rejoined, do not reproduce the corpus couplet;
4. `coupletLines()` / `coupletText()` / `lineWordCounts()` disagree with the corpus;
5. the number of 4/3 couplets is not 1,324;
6. the exception set — numbers and counts — is not **exactly** this document's 6-row table;
7. `KuralVerse` stops rendering through `coupletLines()`, drops `data-verse-line`, or `.verse__line` drops `white-space: nowrap`.
