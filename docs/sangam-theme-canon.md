# Sangam Theme Canon — one researched landscape per route

Status: **direction confirmed and six-route production canon implemented (2026-10-23).**
The six concept frames in `design/canon-concepts/` are the chosen references (the
reader picked between two renders of each). PR #29 implemented Home; the remaining
five route directions now use the same researched, layered production pipeline.
This file is the evidence and design record, alongside the laws in
`docs/sangam-motion-plan.md` and the budget in `app/src/motion/budget.ts`.

Where this sits against earlier directions: it does **not** replace the Sangam
room on Home or the thinai motion grammar — it dresses them. The earlier
garland concept frames (`home-thoranam-day.png`, `home-thoranam-ember.png`) are
kept as the *finish* reference — lush, dimensional, photoreal-CGI — but the
garland itself was the reader's example of finish, not a chosen ornament.

---

## 1. The intention, restated

The app is decorated — its edges and corners dressed, its content surfaces left
untouched and calm — with graphics of CGI-movie richness ("Avatar-grade,"
in the reader's words, softly luminous at night, natural by day), and every
decorated thing must be *verifiably from the Sangam record*. Corpus and
archaeology only. Anything later than the Sanga akam (roughly 3rd c. BCE –
3rd c. CE) is out of the canon unless it is explicitly continuous tradition.

Two working examples of what "exact and precise research" forbids:

- **Marigolds and roses** — the default "Indian wedding" flora — are both
  post-16th-century imports. Out.
- **Bronze standing lamps (kūttu viḷākku), gopuram silhouettes** — medieval.
  Out. The period lamp is the shallow clay **agal viḷākku**; the period
  monument is the granite **naṭukal** (hero-stone), and the period writing is
  Tamil-Brahmi (Māṅgulam, Jambai).

## 2. The six route themes

Each route is dressed in one landscape (*tiṇai*) or object-set, matched to what
the route is *for*, and to the hour *Tolkāppiyam* assigns it
(Porulatikāram: vaikarai–kurinji, vidiyal–marutham, erpaadu–mullai,
nanpagal–pālai; neytal takes no hour). This reuses the same five-register
vocabulary the motion grammar and the twelve doors already speak
(`app/src/motion/registers.ts`, `app/src/lib/thinai.ts`).

| Route | Theme | Tiṇai · hour | Dressed with | Sources |
|---|---|---|---|---|
| `/` Home | **Kurinji Vaikarai** — dawn on the hill country | kurinji · dawn | bamboo culms, kurinji blooms (the 12-year blue), wild honeycomb dripping, a hill parakeet, drifting mist | Tolkāppiyam (kurinji flora/fauna, vaikarai); Kuṟiñjippāṭṭu (hill honey-gathering) |
| `/chapters` | **Marutham Vidiyal** — the watered plain at first light | marutham · pre-dawn | pink lotus pond (thāmaraī), an egret, tender paddy tufts along the edges, a bund path; the chapter map reads as paddy checks | Tolkāppiyam (marutham); Akam field-and-tank landscapes |
| `/kural/:n` | **Olai under the Agal** — the reading leaf | interior, lamplit | one clay agal with a live flame, an inscribed ola strip + iron stylus (eluthāṇi) + cord, palm-fibre gutters, a wisp of smoke | Ola-manuscript culture; Nedunalvāṭai's lamplit chamber; clay agal form (archaeology) |
| `/ask` | **Mullai Erpaadu** — the teacher's veranda at dusk | mullai · dusk | hanging ola-strip screen stirring, banyan bough + aerial roots, a wall-niche lamp kept low, a jasmine spray (mullai's own flower) | Tolkāppiyam (mullai, erpaadu; *iruttal* — patient waiting — is mullai's uripporuḷ) |
| `/saved` | **Palai Nanpagal** — the wayfarer's tied bundle | pālai · noon glare | a knotted cloth bundle (muṭiccu) with palm-leaf strips, sparse pālai leaves throwing patterned shade, a kalli (native Euphorbia) branch | Tolkāppiyam (pālai flora, nanpagal); wayfarer imagery of the Akam |
| `/credits` | **Naṭukal** — the hero-stone in raking light | puram, no hour | rough granite stele top across the bottom edge, chisel strokes (never real script), dust in the light shaft, a dry vāgai pod, carnelian beads | Naṭukal tradition (Puram); Tamil-Brahmi stones (Māṅgulam, Jambai); Kodumānal bead archaeology |

The two interior/puram themes (`/kural/:n`, `/credits`) deliberately take no
tiṇai: the Kural is famously akam/puram-neutral, and forcing a landscape onto
every verse would be the kind of false precision this document exists to prevent.

## 3. The selected concept frames

All in `design/canon-concepts/`. The two earlier garland frames are finish
references only.

| Frame | Pick | What it establishes |
|---|---|---|
| `route-home-kurinji-vaikarai.png` | option 2 | Mist-weight, honey drip, parakeet, violet bloom density, lilac-gold dawn sky |
| `route-chapters-marutham-vidiyal.png` | option 2 | Silver-green light level, plot-check pattern, egret + lotus placement |
| `route-kural-olai-agal.png` | option 1 | Lamp pool radius, smoke wisp, fibre gutters, card warmth — the quietest frame, as the verse demands |
| `route-ask-mullai-erpaadu.png` | option 1 | Blue-hour depth, screen-strip rhythm, niche-lamp calm, jasmine scale |
| `route-saved-palai-nanpagal.png` | option 2 | Noon bleach level, dappled-shade pattern, bundle knot + strip ends |
| `route-credits-natukal.png` | option 1 | Shaft angle and dust, stone pitting detail, pod + carnelian scatter |

## 4. Production rules (binds any implementation)

1. **Text-free assets.** The home frame's title and the blurred pseudo-script
   on cards are render accidents, accepted for the concept only. Production
   layers ship with zero lettering.
2. **Edges and corners only.** Content surfaces (couplet card, chat card,
   chapter grid, saved list) stay calm and unobstructed. Swags, drips and
   shade patterns never cross tappable chrome or the TopBar's zone.
3. **The verse surface is sacred.** Motion-plan law: `.verse__line` is never
   animated; dressing around the verse may shimmer, the verse never does.
4. **One dressed canvas per route**, sharing the existing 1-WebGL-per-route
   ceiling (`LOOP_BUDGET.webgl`). CSS/Canvas-2D only where the tier demands it.
5. **Canon discipline is load-bearing.** New ornament candidates get a
   source-cited entry in this file's canon tables before they enter a sprite.
6. **Tiers stay honest.** Reduced motion → static dressed frame; `css3d`/`plain`
   tiers → flat composited image; forced colours → contrast pass. Silence is a
   tier, never a failure (per `TableStage`'s contract).
7. **Weight.** Each route's dressing ≤ ~4 alpha layers, ≤ ~250 KB WebP per
   layer; the whole six-route canon targets ≤ ~4 MB total.

## 5. Canon register — started (every addition needs a source)

| Element | Verdict | Ground |
|---|---|---|
| Jasmine (mullai), lotus (thāmaraī), kuvalaī, kurinji, kāntaḷ, thumpai, shenbagam (champak), vāgai | ✅ canon | Tolkāppiyam Porulatikāram + Akam corpus |
| Mango-leaf thoranam, bamboo, banyan, pālai (Wrightia), kalli (Euphorbia) | ✅ canon | Tolkāppiyam flora lists |
| Pearls, coral, carnelian beads, gold leaf accents | ✅ canon | Pandyan pearl fishery (Korkai), Gulf of Mannar coral, Kodumānal/Keezhadi archaeology |
| Clay agal lamp, ola strips, iron stylus, cloth bundle, ola screen blind | ✅ canon | Material culture / manuscript tradition |
| Honeycomb, hill parakeet, egret, mist, lotus pond, paddy tufts | ✅ canon | Corpus landscape imagery |
| Marigold, rose garlands, agave, garden cacti | ❌ excluded | Post-16th-c. imports (New World) |
| Bronze kūttu viḷākku, gopurams, Chola bronzes, legible invented script | ❌ excluded | Medieval or later; anachronistic |

Known audit item, flagged for separate work: `assets/img/hero-temple.svg` is a
gopuram silhouette — medieval, outside this canon. Not touched by this document.

---

## 6. Evidence standard — what a source can and cannot establish

The production images are **AI-assisted or procedural artistic reconstructions**.
They are not photographs, scans, or newly discovered artefacts, and their visual
plausibility is not itself evidence. The evidence record is kept separately here.
Every motif has one of four statuses:

- **Archaeology:** a department records the relevant material or object class.
- **Literary ecology:** a Sangam text supplies the landscape, plant, animal or
  poetic convention; this does not claim an excavated example survives.
- **Continuous tradition:** a later, documented material practice is used with
  that later history disclosed rather than back-dated.
- **Artistic reconstruction:** composition, lighting, exact shape and placement
  are invented for the interface within those boundaries.

### Official sources consulted

Sources below were reviewed on 2026-10-23. A source supports only the point named
in its row; it does not authenticate the finished render as an exact replica.

| Source | Evidence used here | Boundary observed in production |
|---|---|---|
| Tamil Nadu State Department of Archaeology, [Keeladi](https://www.tnarch.gov.in/keeladi) | Sangam-age settlement material: Black-and-Red ware and other ceramics, copper and iron objects, terracotta objects, agate/carnelian/crystal and other beads. | Grounds the restrained clay, earth, metal and bead material palette. It does not reconstruct a Keeladi house or street on any route. |
| Tamil Nadu State Department of Archaeology, [Tirunelveli / Teriruveli](https://www.tnarch.gov.in/tirunelveli-0) | The department lists terracotta lamps, shell bangles and carnelian beads among finds belonging to the Sangam period. | Supports a **clay**, not bronze, lamp. The generated lamp's exact profile and flame are artistic reconstruction. |
| Tamil Nadu State Department of Archaeology, [Kodumanal](https://www.tnarch.gov.in/kodumanal) | Early-historic ceramics and an urn yielding 782 carnelian beads. | Supports carnelian as the Credits accent and the cord-and-bead UI divider. It does not claim the rendered scatter or divider reproduces an excavated arrangement. |
| Tamil Nadu State Department of Archaeology, [Memorial Stones](http://www.tnarch.gov.in/epi/ins11.htm) | Connects the development of the hero cult and naṭukal rituals to Sangam literature and grammatical works; also states that surviving hero-stone specimens are available from the sixth century CE onward. | Credits uses an **uninscribed, literature-informed stone treatment**, not a supposedly Sangam-dated replica of a later carved hero-stone. This qualification is load-bearing. |
| Tamil Nadu State Department of Archaeology, [Thamizhi / Tamil-Brahmi inscriptions](https://www.tnarch.gov.in/epigraphy/inscriptions-thamizhi-tamil-brahmi-script) | Early and late Tamil-Brahmi are dated by the department across approximately the third century BCE to third century CE. | Real inscriptions are evidence, but generated pseudo-lettering is not. All production leaves and stones are blank or bear only non-linguistic tool texture. |
| Government Oriental Manuscripts Library and Research Centre, [department collection](https://www.tnarch.gov.in/goverment-oriental-manuscripts-library-and-research-centre) | Documents the preservation and form of palm-leaf manuscript collections. | Olai strips, cord and screens are labelled **continuous manuscript tradition**, not excavated Sangam artefacts. Their exact arrangement is a modern visual reconstruction. |

### Literary evidence is kept in its own lane

Tolkāppiyam's Porulatikāram and the Akam/Puram corpus guide tiṇai, hour,
flora, fauna and poetic mood. Kuṟiñjippāṭṭu supports Home's hill-country
honey imagery; Nedunalvāṭai informs the lamplit interior; wayfarer imagery
informs Palai. These references do **not** turn a generated paddy field, cloth
bundle, banyan veranda or stone into an archaeological reconstruction of a
particular excavated site. Exact lighting, crop, depth and composition remain
artistic decisions.

## 7. Route-by-route production and evidence register

| Route | Production treatment | Evidence status |
|---|---|---|
| `/` | Three alpha layers: bamboo/parakeet, honeycomb and kuṟinji blooms, with mist, dawn/night grade, pointer depth and slow sway. | Literary ecology plus artistic reconstruction; PR #29's approved Home is unchanged. |
| `/chapters` | Three new alpha layers: paddy-check miniature, dewed paddy bund, and lotus/egret wetland vignette. The chapter grid remains unobstructed; a bead divider replaces the later zari divider. | Paddy, wetland and marutham mood are literary ecology. The field-check geometry, exact plants and animal pose are artistic reconstruction, not an excavated field. |
| `/kural/:n` | Three new alpha layers: shallow clay agal with flame/smoke, blank olai bundle with iron stylus, and palm-fibre cord. A quiet lamp pool replaces faster decorative movement; the verse never moves. | Clay-lamp class has archaeological support; olai/cord form is continuous manuscript tradition; exact objects and arrangement are reconstruction. No pseudo-script. |
| `/ask` | Three new alpha layers: banyan bough/aerial roots, blank hanging olai screen, and jasmine beside a low clay lamp in a niche. Slow hanging/root sway and dusk/lamp washes stay behind the conversation and composer. | Mullai/jasmine/waiting are literary ecology; lamp class is archaeological; screen is continuous tradition; veranda composition is reconstruction. |
| `/saved` | Three layers: palai branch, a botanically restrained procedural kalli illustration, and a detailed cloth-bundle crop from the approved concept, with dappled noon shade. | Palai/kalli and wayfarer imagery are literary/botanical references. The bundle is artistic reconstruction; no claim is made that a Sangam textile survived. |
| `/credits` | Two text-free crops from the approved concept: raking light/dust and the uninscribed upper granite edge carrying a dry vāgai pod and carnelian beads. The source cards sit above the quiet central field. | Naṭukal is literary evidence with the department's later-survival caveat; carnelian has archaeological support; pod placement, stone profile and lighting are reconstruction. |

### Feature surfaces

The canon sits behind search, filters, chapter map, result cards, reader actions,
Ask replies and composer, saved/reflection cards, credits, dialogs and navigation.
Route-specific cord-and-bead dividers replace the non-Home zari dividers. Colour
washes and border highlights inherit the active route without changing measured
text tokens. Home's PR #29 card, medallion and zari treatment is intentionally
outside this replacement pass.

## 8. Production asset manifest and performance

`app/scripts/build-ornaments.mjs` is deterministic. It chroma-keys and de-spills
painted masters, or crops/feathers only the text-free portions of the two approved
concept frames, then writes alpha WebP. `--check` fails on drift, an overweight
layer/route, a missing canon, or a total over 4 MB.

| Canon | Layers | Approximate route payload |
|---|---:|---:|
| Kurinji Vaikarai | 3 | 461 KB |
| Marutham Vidiyal | 3 | 320 KB |
| Olai under the Agal | 3 | 146 KB |
| Mullai Erpaadu | 3 | 361 KB |
| Palai Nanpagal | 3 | 204 KB |
| Naṭukal | 2 | 49 KB |
| **Total** | **17** | **1,541 KB** |

Only the active route mounts its CSS background layers. `SangamCanon` owns route
identity and fixed viewport-edge stages; Home keeps its hero-local PR #29 stage.
There is no additional WebGL canvas. Pointer parallax is input-driven and starts
no `requestAnimationFrame`; ambient movement is CSS and is stopped by both motion
kill-switches. Flat reader and contrast tiers do not mount the artwork; forced
colours and print remove it. All 17 built assets are included in the PWA precache
and checked there by `test-pwa.mjs`.
