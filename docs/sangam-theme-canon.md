# Sangam Theme Canon — one researched landscape per route

Status: **direction confirmed by the reader (2026-10-23).** The six concept frames
in `design/canon-concepts/` are the chosen references (the reader picked between
two renders of each). No build work has started; this file is the design record
that any implementation must answer to, alongside the laws in
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
