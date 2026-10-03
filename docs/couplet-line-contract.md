# Couplet line contract — 4 words on top, 3 below

**Status:** locked, implemented, enforced by `app/scripts/test-couplet.mjs`.
**Decision (D1):** the reader shows every one of the 1,330 couplets as a fixed
two-line block — **the first four words on top, the remaining three below** — as the
default presentation, in every surface, and **no accessibility setting changes the
split**. Where a couplet's wording does not allow a four-word/three-word split, the
standard அடி split is kept and the couplet is listed as a documented exception
below; **a word is never cut** to force the look.

## 1. Why four over three is the standard

A குறள் is one **குறள் வெண்பா** stanza built from exactly **seven சீர்**. The split is
fixed by the metre and is not a typographic choice:

| | சீர் | line |
| --- | --- | --- |
| முதல் அடி (top line) | 4 | first |
| ஈற்றடி (bottom line) | 3 | second |

- Tamil Wikipedia, [திருக்குறள்](https://ta.wikipedia.org/wiki/திருக்குறள்): every
  குறள் has *"முதல் வரியில் நான்கு சீர்களும் இரண்டாவது வரியில் மூன்று சீர்களும்"*
  (four சீர் in the first line, three in the second), and — the sentence that
  explains this document — *"ஒரு சீர் என்பது ஒன்று அல்லது ஒன்றுக்கு மேற்பட்ட தமிழ்ச்
  சொற்களின் கூட்டுச்சொல்"* (a சீர் is **one or more Tamil words together**).
- English Wikipedia, [Couplet § In Tamil poetry](https://en.wikipedia.org/wiki/Couplet):
  "Each Kural couplet is made of exactly 7 words—4 in the first line and 3 in the
  second." That is the same rule stated in words, and it is the reading this app
  implements.
- English Wikipedia, [Venpa](https://en.wikipedia.org/wiki/Venpa): the metre family
  (குறள் வெண்பா is its shortest member).

The second of those citations is also the reason this document exists: because a
**சீர் may group several written words** (and, in a few recensions, a written word
may carry two சீர்), the word count and the சீர் count only usually coincide — see §3.

## 2. How the app implements it

- `app/src/lib/couplet.ts` is the **only** place a couplet is turned into lines.
  `coupletLines(kural)` returns the two standard lines and never moves, merges,
  re-cuts or truncates anything.
- `app/src/components/kural/KuralVerse.tsx` (the single verse renderer, used by the
  focus reader, Today's card, chapter lists and saved cards) renders them as
  `<span data-verse-line="1">` and `<span data-verse-line="2">`, so the split is
  fixed in the DOM and asserted by the render suite.
- The corpus itself carries the standard split: `ta[0]` is the முதல் அடி and `ta[1]`
  is the ஈற்றடி. No text is invented, reworded or re-spaced — only the reader's own
  presentation is ours.
- **Accessibility never touches it.** Text size, line spacing, colour mode, reduced
  motion, higher contrast and the layer toggles are CSS variables applied to the
  verse; they change the type, never the line structure.
  `app/scripts/test-render.mjs` asserts that the two lines are byte-identical at
  `data-font-size="large"`, `"x-large"` and `data-line-spacing="relaxed"`, and the
  couplet suite asserts the split for all 1,330 couplets.
- On a narrow screen a line may wrap (four long Tamil words do not always fit a
  phone), but it wraps *within itself*: `.verse__line` uses `text-wrap: balance`
  so the top line's first four words always stay above the bottom line's three.
  Spacing is a presentation concern; the contract is which words are on which line.

## 3. The 1,301 + 29 result

Measured over the shipped corpus (`app/public/data/kurals.json`, all 1,330 couplets):

| word counts (top / bottom) | couplets |
| --- | --- |
| **4 / 3** — the standard reading | **1,301** |
| any other count (documented below) | 29 |

The 29 exceptions are couplets where the standard 4 சீர் / 3 சீர் split does not land
on four written words over three, because a சீர் groups more than one written token,
or a written word carries two சீர். They keep the standard split, and one of them
(#42) is the very couplet whose modern presentation (*துறந்தார்க்கும் துவ்வாதவர்க்கும்
இறந்தார்க்கும்* / *இல்வாழ்வான் என்பான் துணை*, three words over three) shows the
grouping directly.

Each exception below states **which line differs from the four/three word reading**
and how, then quotes the couplet exactly as the app shows it. Nothing here is
normalised: the text is the shipped corpus text, warts and all.

| குறள் | words top / bottom | where the word count departs from 4 / 3 | couplet as shown |
| --- | --- | --- | --- |
| 10 | 5 / 3 | முதல் அடி: more tokens than சீர் | `பிறவிப் பெருங் கடல் நீந்துவர் நீந்தார்`<br>`இறைவன் அடி சேராதார்` |
| 33 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `ஒல்லும் வகையான் அறவினை ஓவாதே`<br>`செல்லும் வாய் எல்லாஞ் செயல்` |
| 42 | 3 / 3 | முதல் அடி: fewer tokens than சீர் | `துறந்தார்க்கும் துவ்வாதவர்க்கும் இறந்தார்க்கும்`<br>`இல்வாழ்வான் என்பான் துணை` |
| 60 | 5 / 3 | முதல் அடி: more tokens than சீர் | `மங்கலம் என்ப மனைமாட்சி மற்று அதன்`<br>`நன்கலம் நன்மக்கட் பேறு` |
| 70 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `மகன்தந்தைக்கு ஆற்றும் உதவி இவன்தந்தை`<br>`என்நோற்றான் கொல் எனும் சொல்` |
| 74 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `அன்புஈனும் ஆர்வம் உடைமை அதுஈனும்`<br>`நண்பு என்னும் நாடாச் சிறப்பு` |
| 82 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `விருந்து புறத்ததாத் தானுண்டல் சாவா`<br>`மருந்தெனினும் வேண் டற்பாற் றன்று` |
| 143 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `விளிந்தாரின் வேறல்லர் மன்ற தெளிந்தாரில்`<br>`தீமை புரிந்து ஒழுகு வார்` |
| 211 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `கைம்மாறு வேண்டா கடப்பாடு மாரிமாட்டு`<br>`என் ஆற்றுங் கொல்லோ உலகு` |
| 331 | 4 / 2 | ஈற்றடி: fewer tokens than சீர் | `நில்லாத வற்றை நிலையின என்றுணரும்`<br>`புல்லறிவாண்மை கடை` |
| 347 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `பற்றி விடாஅ இடும்பைகள் பற்றினைப்`<br>`பற்றி விடாஅ தவர் க்கு` |
| 379 | 4 / 2 | ஈற்றடி: fewer tokens than சீர் | `நன்றாங்கால் நல்லவாக் காண்பவர் அன்றாங்கால்`<br>`அல்லற் படுவதெவன்` |
| 408 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `நல்லார்கண் பட்ட வறுமையின் இன்னாதே`<br>`கல்லார்கண் பட் ட திரு` |
| 530 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `உழைப்பிரிந்து காரணத்தின் வந்தானை வேந்தன்`<br>`இழைத் திருந்து எண்ணிக் கொளல்` |
| 532 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `பொச்சாப்புக் கொல்லும் புகழை அறிவினை`<br>`நிச்ச நிரப்புக் கொன் றாங்கு` |
| 542 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `வானோக்கி வாழும் உலகெல்லாம் மன்னவன்`<br>`கோல் நோக்கி வாழுங் குடி` |
| 619 | 3 / 3 | முதல் அடி: fewer tokens than சீர் | `தெய்வத்தான் ஆகாதெனினும் முயற்சிதன்`<br>`மெய்வருத்தக் கூலி தரும்` |
| 689 | 4 / 2 | ஈற்றடி: fewer tokens than சீர் | `விடுமாற்றம் வேந்தர்க்கு உரைப்பான் வடுமாற்றம்`<br>`வாய்சேரா வன்கணவன்` |
| 908 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `நட்டார் குறைமுடியார் நன்றாற்றார் நன்னுதலாள்`<br>`பெட் டாங்கு ஒழுகு பவர்` |
| 950 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `உற்றவன் தீர்ப்பான் மருந்துழைச் செல்வானென்று`<br>`அப்பால் நாற் கூற்றே மருந்து` |
| 956 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `சலம்பற்றிச் சால்பில செய்யார்மா சற்ற`<br>`குலம்பற்றி வாழ்தும் என் பார்` |
| 972 | 4 / 2 | ஈற்றடி: fewer tokens than சீர் | `பிறப்பொக்கும் எல்லா உயிர்க்கும் சிறப்பொவ்வா`<br>`செய்தொழில் வேற்றுமையான்` |
| 976 | 4 / 5 | ஈற்றடி: more tokens than சீர் | `சிறியார் உணர்ச்சியுள் இல்லை பெரியாரைப்`<br>`பேணிக் கொள் வேம் என்னும் நோக்கு` |
| 988 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `இன்மை ஒருவற்கு இளிவன்று சால்பென்னும்`<br>`திண்மை உண் டாகப் பெறின்` |
| 1081 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `அணங்குகொல் ஆய்மயில் கொல்லோ கனங்குழை`<br>`மாதர்கொல் மாலும் என் நெஞ்சு` |
| 1129 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `இமைப்பின் கரப்பாக்கு அறிவல் அனைத்திற்கே`<br>`ஏதிலர் என்னும் இவ் வூர்` |
| 1130 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `உவந்துறைவர் உள்ளத்துள் என்றும் இகந்துறைவர்`<br>`ஏதிலர் என்னும் இவ் வூர்` |
| 1284 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `ஊடற்கண் சென்றேன்மன் தோழி அதுமறந்து`<br>`கூடற்கண் சென்றது என் னெஞ்சு` |
| 1307 | 4 / 4 | ஈற்றடி: more tokens than சீர் | `ஊடலின் உண்டாங்கோர் துன்பம் புணர்வது`<br>`நீடுவ தன்று கொல் என்று` |

### Notes on individual exceptions, with sources

These are the cases checked against outside editions while this contract was
written. They are quoted here as *citations* — the app keeps the corpus text.

- **#42** — modern editions print `துறந்தார்க்கும் துவ்வாதவர்க்கும் இறந்தார்க்கும்`
  as the முதல் அடி: three words for four சீர், because *துவ்வாதவர்க்கும்* carries two
  சீர். Source: [kural.page #42](https://kural.page/tamil/thirukkural-42-ilvaazhkkai).
- **#82** — the standard edition prints the ஈற்றடி as
  `மருந்தெனினும் வேண்டற்பாற் றன்று`, with the சீர் boundary falling **inside** the word
  *வேண்டற்பாற்றன்று*; Parimelalagar's உரை follows the same split. Sources:
  [valaitamil #82](https://www.valaitamil.com/virundhu-puraththadhaath-thaanuntal-saavaa-marundheninum-ventarpaar-randru-kural-82.html),
  [ta.wikisource — Parimelalagar உரை, அறத்துப்பால் 9. விருந்தோம்பல்](https://ta.wikisource.org/wiki/%E0%AE%A4%E0%AE%BF%E0%AE%B0%E0%AF%81%E0%AE%95%E0%AF%8D%E0%AE%95%E0%AF%81%E0%AE%B1%E0%AE%B3%E0%AF%8D).
  Our corpus writes that boundary as a space (`வேண் டற்பாற் றன்று`), which is why the
  line counts four tokens instead of three.
- **#331** — the standard text `நில்லாத வற்றை நிலையின என்றுணரும் / புல்லறிவாண்மை கடை`
  puts four words over two, since *புல்லறிவாண்மை* carries two சீர். Source:
  [Dinamalar — திருக்குறள் 331](https://www.dinamalar.com/thirukural/34/331).
- The remaining exceptions follow the same two mechanisms: either a சீர் is written
  as two tokens by the source dataset (visible where the standard edition prints a
  single word — `என் னெஞ்சு` for *என்னெஞ்சு* at #1284, `நாற் கூற்றே` for *நாற்கூற்றே* at
  #950, `இவ் வூர்` for *இவ்வூர்* at #1129/#1130) or a single word carries two சீர்
  (as in #379, #689 and #972, whose ஈற்றடிகள் hold two words across three சீர்).
  The suite checks the counts and the mechanism direction for all 29, so a future
  corpus update that changes one fails CI instead of silently changing the layout.

## 4. What the suite enforces

`app/scripts/test-couplet.mjs` (part of `npm test`) fails if:

1. any couplet is missing a line, or has more or fewer than two lines;
2. any couplet's lines, rejoined, do not reproduce the corpus couplet (no word
   moved or dropped);
3. `coupletLines()` / `coupletText()` / `lineWordCounts()` disagree with the corpus;
4. the number of 4/3 couplets is not 1,301;
5. the exception set — numbers, counts and direction — is not **exactly** this
   document's table;
6. `KuralVerse` stops rendering through `coupletLines()` or drops `data-verse-line`.

`app/scripts/test-render.mjs` adds the DOM half: both lines present in order on every
surface, plus the accessibility-independence assertion above.

## 5. Changing this contract

If a future corpus revision changes one of these couplets, update the table here and
the suite's expectation **together** — the numbers are the contract. Do not "fix" a
couplet by re-spacing or re-splitting its words: the app does not rewrite
Thirukkural text, it presents it.
