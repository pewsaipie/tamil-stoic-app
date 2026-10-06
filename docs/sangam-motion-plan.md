# Sangam Motion Plan — every surface alive, sourced to the Sangam record

*Status: **confirmed and in build** (2026-10-06). §10 records the answers, in
the reader's words. The first build — Home, in full, against this document — is
in the tree, together with the shared runtime (`app/src/motion/`) that makes the
same depth replicable on the other five routes; `docs/motion-playbook.md` is the
how-to. Rows marked **●** below are built, **◐** partially, **○** not yet.*

---

## 1. What was asked

> *"I want the application to be animated based on Sangam Period References. I
> want the animations placed in every aspects of the UI to have some motion
> into it. Like if we have a clay pot, it should have some movement."*

Three sentences, and each rules something out:

| The ask | What it rules out |
|---|---|
| **Animated on Sangam Period references** | Decorative motion with no source. Every animation in this plan cites a poem, a landscape, a dance, an instrument or an excavated object. |
| **Motion in every aspect of the UI** | A "hero animation". The unit of work is the *surface* — all six routes, the chrome, the dialogs, the loaders and the empty states. |
| **The clay pot has movement** | SVG illustration. The objects in this app become *things that behave like their material* — a pot turns, holds water, pours. |

### 1.1 Why the intention has felt un-understood

Worth stating plainly, because it explains the last three PRs.

1. **The design doctrine was written but never built.** `docs/reality-first-ui.md`
   §4 maps 24 features to a physical room — pot, wax, cord, clay, lamp, beads,
   sand, kolam, brass. Of that map, exactly **one** object exists: the wax seal
   (PR #20) and the engine under it (PR #21). The other ~23 surfaces are still
   flat DOM. So the reader sees the *palette* of the doctrine everywhere and the
   *behaviour* of it almost nowhere — which reads as vagueness.
2. **What ships as "motion" today is four decorator loops.** `ambient.css` has
   four keyframes (`sky-drift`, `glint`, `breathe`, `twinkle`), used in five
   places, plus a 2D particle canvas. All of it is *ambient wallpaper*: none of
   it responds to the reader, nothing is made of anything, and `breathe` is
   declared but never used anywhere. That is the whole motion vocabulary of a
   2,577-line component tree.
3. **The ornaments are pattern, not objects.** Zari edge, billa plaques and the
   medallion are beautiful, but they are vector decoration laid *on* glass
   panels. A plaque that glints is not the same as a plaque that is *gold*.

So this plan does not add a fourth decorative loop. It changes the unit of
design from *styling a panel* to **giving every surface one living thing, made
of a material, moving for a reason found in the Sangam record.**

Two things have since been settled that the reader asked for directly, and they
shaped the first build:

- **Density is louder than doctrine as first written.** "One living thing per
  surface" is still the discipline, but a *screen* is expected to have several
  things alive at once — the sky, the water, the flame, a door's weather — hence
  L1 below, rewritten. The budget (L3, §8) is what keeps "louder" from meaning
  "hotter": the loop ceiling and the particle ceiling are enforced in code, not
  in review.
- **The seal ceremony is withdrawn.** It was beautiful and it was a toll gate in
  front of the day's verse: a reader who came to read had to perform something
  first. The verse is now simply there, the lamp below it is the ritual, and the
  wax, the cord and the fracture geometry are gone from the app (they remain in
  git history). The ola leaf survives as an object — it is the material the app
  is about — but it no longer has to be unrolled to be read.

---

## 2. What moves today (the honest baseline)

| Surface | What moved then | What moves now | Responds to the reader? |
|---|---|---|---|
| Global | `Atmosphere` canvas: petals by day, fireflies at night | Same, but run by the runtime: 30 fps, one registry slot, and the in-app Reduce-motion switch finally reaches it | No — weather |
| Home hero | Aged-leaf shader + cloud band + star twinkle | Same, plus mist on the far hills; the register is `kurinji` | Pointer parallax moves the light |
| Home table | — | **The pot** (thrown on the wheel while the corpus loads, water level = kurals read, a ring per kural read), **the brass lamp** (the minute burning down), **the ola leaf**, dust in the beam | **Yes** — loading, reading, the minute |
| Home doors | — | Twelve doors, each with its own landscape's weather in pure CSS: petals, first rain, pond ripples, tide, heat shimmer | Hover, focus, selection |
| Home books | — | Three bundles on the table; hover lifts one and its contact shadow separates | Hover, press |
| Daily ritual | The seal: 7 beats, one clock, 3.85 s | The lamp: one minute, light is the animation | **Yes** |
| Toasts / banners | Framer Motion enter/exit | Same | No |
| Skeletons | none | The pot forming on the wheel (Home); other routes still todo | Loading |
| Everything else | **Static** | **Still static** — Chapters, Search, Kural view, Ask, Saved, Credits are the work the playbook now sequences | — |

Home is built to depth. The other five routes are the replication job, and they
have a documented recipe rather than a promise: `docs/motion-playbook.md`.

---

## 3. The research base

Four independent strands, each of which gives the plan something different: the
**landscapes** give the moods, the **music** gives the timing, the **dance**
gives the movement kinds, and the **archaeology** gives the objects.

### 3.1 The thinai frame — five landscapes, five moods

The Sangam poets did not describe scenery; they codified *emotion as ecology*.
Every poem belongs to one of five thinai (திணை), and each carries a fixed set of
signifiers — god, hour, season, flower, fauna, water, soil, occupation:

| | **குறிஞ்சி** Kurinji | **முல்லை** Mullai | **மருதம்** Marutham | **நெய்தல்** Neithal | **பாலை** Palai |
|---|---|---|---|---|---|
| Landscape | mountains, hills | forest, pasture | cropland, river plain | seashore | parched wasteland |
| Love-state | **union** (punartal) | **patient waiting** (iruttal) | **quarrel** (utal) | **pining** (irangal) | **separation** (pirital) |
| Hour | midnight | evening | before sunrise | sunset | noon |
| Season | cold, dew | first rains | late spring | early summer | drought |
| Flower | kurinji (blooms by gregarious mass-flowering) | jasmine, konrai | marutam, lotus, lily | water lily (neithal), punnai | palai, pathiri |
| Fauna | peacock, elephant, monkey, bee | deer, waterfowl | buffalo, heron, freshwater fish | shark, crab, sea crow | emaciated elephant, vulture, hawk |
| Water | waterfall, spring | jungle river | pond, tank | sea, well | dry well |
| Soil | red & black, stone | red | alluvial | sand, saline | salt-affected |
| Work | hunting, honey-gathering (kuravar, vetar) | cattle-keeping (idaiyar) | plough agriculture (ulavar) | fishing, salt, sea trade (paratavar, umnar) | journeying, banditry (kallar) |
| God | Seyon / Murugan | Mayon / Vishnu | Indra / Vendan | Kadalon / Varuna | Kotravai |

Sources: *Sangam landscape* (Wikipedia); *Landscape in Sangam Literature*
(tamilliterature.in); *Sangam landscape* (Grokipedia); thinai slide-deck
(occupations, drums, tunes).

Two consequences for the UI, and both are load-bearing:

- **The five states of a reader's mind map onto the five landscapes.** An app
  that is read has moments of union (meeting the verse), of waiting (loading,
  thinking), of friction (browsing, filtering), of sending-away (sharing,
  reciting) and of absence (empty, offline, error). Those *are* the five thinai.
  §5 turns this into the motion grammar.
- **Landscape is not backdrop; it is the character.** Sangam poetry animates the
  world to carry the feeling — "chattering monkeys, drunken elephants in mirth
  and gushing waterfalls" when the lovers meet (New Indian Express). Ambient
  motion is therefore *sanctioned by the source*, not a modern flourish.

### 3.2 Music — pann and parai give each landscape a tempo

Ancient Tamil music is organised by the same five landscapes: each thinai had
its own melodic mode (*pann*) and rhythmic character, and the *pann* system is
described as the ancestor of the later raga systems. The root instrument is the
**parai** (frame drum) — Tolkappiyam uses *parai* to define rhythm itself — with
the *yazh* (harp), *kuzhal* (flute), *muzhavu* (drum) and *sangu* (conch)
completing the ensemble. The tradition also records a specific drum for each
landscape (Veriyattupparai, Thontakapparai, Erukot parai, Nellari parai,
Navaipparai, Valipparipparai — spellings vary by source).

**Use:** the plan never invents a duration. Each register in §5 is a tempo and an
easing, and the tempo comes from the landscape's hour and its drum; the sound
layer (Phase D, opt-in) uses the same mapping.

### 3.3 Dance — two kinds of movement, both old

Tolkappiyam-era performance gives the plan its two *modes of motion*:

- **குரவை (kuravai)** — the circle dance of hill and forest women, hands joined,
  described as rhythmic, communal, and for the valorous variant "a fast, rhythmic
  and noisy roaring dance". → **Repetition, circulation, community.** Used for
  looping motion: strands, rings, rims, the pot on the wheel, the kolam.
- **வெறியாட்டம் (veriyattam)** — the possession dance of the Murugan cult in the
  hill country, frenzied footwork, trance leaps, driven by drums (Kuruntokai 40).
  → **Sudden, springy, upward, involuntary.** Used for moments of arrival:
  today's verse revealed, an answer sliding out of the niche, a kural landing.

Archaeology closes the loop: the earliest Tamil terracotta figurines found at
Kodumanal (c. 200 BCE) show humanoid figures **in dynamic poses, interpreted as
dancers**. The oldest figures in this culture are caught mid-movement.

### 3.4 The objects — what excavation actually gives us

Every object the UI will use is attested material, most of it from Tamil Nadu's
own Early Historic sites:

| Object | Site / date | Use in this plan |
|---|---|---|
| **Black-and-red ware pot** — wheel-thrown, carbon-black interior, hematite red slip, kiln ~1100 °C | Keeladi, 3rd c. BCE; Korkai; Adichanallur | The pot: loading (forming on the wheel), journey (water level), empty state |
| Miniature measuring pots; storage jars, twin pots, lidded vessels, perforated bowls, ring stands | Keeladi, Porunthal, Kodumanal | Vessel vocabulary for cards, bowls, plate-shaped grounds |
| **Carnelian bead, 0.5 cm, engraved with a wild boar**; pearl micro-beads; glass & semi-precious beads | Keeladi, Kodumanal | The journey strand — tiny, countable, engraved detail at close range |
| **Shell and glass bangles** (23 pieces in one Keeladi trench) | Keeladi | Ring/arc motifs; the jingle of a circle |
| **Terracotta spindle whorls** (weaving) | Keeladi, Karivalamvanthanallur | The streak *thread*; spinning motion |
| Iron stylus, arrowheads, antimony rod; copper lamps and rings | Adichanallur, Porunthal | The writing tool and the small lamp |
| Peacock-painted red-slipped burial pot | Karivalamvanthanallur | Peacock ornament that is *painted on clay*, not floating |
| Tamil-Brahmi potsherds, graffiti marks | Keeladi, Arikamedu | The Credits wall: text as inscription on a sherd |
| Rouletted ware, amphorae | Arikamedu, Alagankulam | The "from elsewhere" slips (share, export) |

### 3.5 What is *not* Sangam (kept, but not mislabelled)

The app already carries later-period ornament. It stays, but this plan does not
cite it as Sangam:

| Element | Period | Standing |
|---|---|---|
| Jada billai, surya/chandra medallion, zari edge | Chola-and-later bridal jewellery; the PR #22 cover reading | Kept as the **Kurinji ceremony** layer (already shipped) |
| Nataraja / Chola bronzes | 9th–13th c. CE | Allowed as *later Tamil* metalwork; never called Sangam |
| Karagattam (pot-balancing dance) | medieval folk | Not used; the pot moves as a **craft object**, not as a dance prop |
| Agal vilakku kolam of lamps | continuous practice; classical references later than Sangam | Used for the chapter map, labelled "Tamil lamp tradition" |
| Rice-flour kolam | medieval–modern | Chapter-map floor only |

Honesty here is the point: the plan is an *argument about the past*, and a claim
that cannot be sourced does not get to move.

---

## 4. The doctrine — five laws

**L1 · Every surface has one living thing — and a screen has several.**
Not "every element wiggles", and no longer "exactly one thing per screen". The
reader asked for the louder reading, so the rule is by *rank* rather than by
count: each route has **one hero object** (the thing the reader actually handles,
§6.1), each surface gets **one living thing**, and everything else is
**weather** — smaller, slower, and never competing. Three ranks, one screen:
the hero is WebGL and responds to the reader; the surface's own thing is CSS or
Canvas-2D and answers touch; the weather is shared, ambient and ignorable. Two
heroes on one screen is still a defect; four small lives is the intent.

**L2 · Motion belongs to the material, not to the UI event.**
Wax fractures in ~120 ms; water ripples for seconds; clay turns heavy and slow;
gold answers light in a flash; fibre settles with a whisper; a bead clicks once.
Buttons do not "animate" — *the thing they are made of* responds.

**L3 · Idle motion is weather, not noise.**
Period ≥ 6 s, translate ≤ 8 px, scale ≤ 2 %, opacity deltas ≤ 0.3; particle caps
of 60 per route (`PARTICLE_BUDGET`); **at most four animation frames** alive at
once, one of them the WebGL scene (`LOOP_BUDGET`, enforced by `LoopRegistry`,
which refuses the fifth and names it); paused when `document.hidden`, when
off-screen, and while a dialog is open; **never across the reading column**.
Weather is what makes the room inhabited — it is never what makes the reader
look up.

**L4 · Interaction is choreography, and the end state is the point.**
≤ 4 beats, one clock (`INTERACTION_MAX_MS` 400 ms for anything that answers a
touch), and the final pose *persists*: the water stays where the reading left it,
the pot stays thrown, the lamp stays lit, the knot stays tied. Motion that resets
is a cartoon; motion that leaves a mark is a room.

The two things longer than an interaction are **state transitions, not
responses**, and they are named in `MATERIAL_EXCEPTION_MS`: the pot is thrown in
2.6 s and set down in 0.9 s, and the day's measure of water takes 2.4 s to pour.
A pot is not a button; `test-motion.mjs` checks the declared ceiling against the
scene's own constants, so the two cannot drift apart.

**L5 · Every motion has a still end state.**
Reduced motion, high contrast, forced colours, save-data, the `plain` tier and
print each get **the final pose, never a missing feature** (the house rule from
`reality-first-ui.md` §5). A burned-down lamp still shows a full bowl.

---

## 5. The thinai motion registers — the grammar

Five registers, derived from §3.1–3.3 and applied by *state*, not by screen:

| Register | Owns these app states | Tempo & easing | Amplitude | Particle | Drum / pann | Sound (opt-in, Phase D) |
|---|---|---|---|---|---|---|
| **குறிஞ்சி** | today's verse arriving; the lamp catching; onboarding | quick attack, springy settle (`--ease-spring`), upward | medium | kantal petal, mist wisp, waterfall thread | Veriyattupparai · kurinji pann | bee-hum, peacock far off, water on stone |
| **முல்லை** | loading, model thinking, scheduled reminder, "waiting for an answer" | slow, even, **held** — long beat, no acceleration | very low | jasmine opening, first rain on leaf, deer | Thontakapparai · mullai pann | kuzhal (flute) breath, light rain |
| **மருதம்** | browse, chapter grid, filters, search, lists | regular alternation, back-and-forth, gently argumentative | low | paddy sway, heron lift, pond ripple, buffalo | Erukot parai · cevvali | water slap, kulavai chatter (women's trill) |
| **நெய்தல்** | recitation, share/export, anything sent away | long tidal breathe (≈7 s in, 7 s out), never decisive | medium, receding | wave, foam, boat, drowning water-lily, crab scuttle | Nellari parai · neithal pann | wave wash, sangu (conch) |
| **பாலை** | empty, offline, error, no results | irregular, dry, **abrupt stops**; heat shimmer, no rhythm | low but harsh | dust devil, heat shimmer, vulture on a thermal | Valipparipparai · palai pann | dry wind, parai rim |

The table above is the argument; **`app/src/motion/registers.ts` is the
implementation**, and it is the only place a tempo may be written. Each register
carries its beat in seconds, its easing token, its amplitude as a fraction of the
object's own size, and the drum and pann the beat came from. A module-load guard
refuses a register whose beat is under the six-second weather floor or whose
amplitude is over 2 %, so the grammar cannot silently outgrow the budget —
and `scripts/test-motion.mjs` asserts the same numbers a second time.

Register is applied **by state, not only by screen**: each route has a base
landscape, and `loading`, `thinking`, `arrived`, `browsing`, `sharing`, `empty`,
`offline` and `error` override it. A kural read offline is `palai`, not
`kurinji`, on the same route.

Worked examples of the grammar:

- **Ask Valluvar** is a two-landscape sentence: the question is **முல்லை**
  (patient waiting — the lamp dims, the leaf screen stirs, the rain has not come)
  and the answer's arrival is **குறிஞ்சி** (union — the leaf slides out, quick and
  springy, one beat).
- **Listen** is **நெய்தல்**: the recitation travels away from the reader across
  water; rings widen and decay rather than stopping.
- **No results / offline** is **பாலை**: heat shimmer over a dry well, no guilt,
  and the reassurance stays still and plain.
- **Chapters** is **மருதம்**: the field is sorted; the kolam lamps answer in
  alternation as you move through it.

---

## 6. The surface map — every aspect, with its movement

### 6.1 The living thing per route

| Route | Status | The living thing (hero) | What makes it alive | Still end state |
|---|---|---|---|---|
| `/` Home | **● built** | **the pot**, with **the lamp** beside it | pot is thrown on the wheel while the corpus loads, then holds the water of the reading — level = kurals read, one ring per kural; the lamp burns the minute | pot settled and full; lamp steady |
| `/chapters` | ○ | **the kolam of 133 lamps** | lit lamps flicker independently; flour dust settles when the map draws | all lamps in their final lit/unlit state |
| `/kural/:n` | ○ | **the single leaf under the lamp** | fibre breathes; the lamp's light pools and sways | leaf flat, lamp lit |
| `/ask` | ○ | **the niche lamp + the hanging leaf screen** | leaves stir in an unfelt draft; lamp dims on thought | lamp steady, screen still |
| `/saved` | ○ | **the tied bundle** | cord slackens, leaves settle, edges curl | bundle open, leaves at rest |
| `/credits` | ○ | **the inscription** | dust in raking light, a chisel grain that catches | inscription static, readable |

### 6.2 Home

| # | Surface | The movement | Sangam anchor | Still end state |
|---|---|---|---|---|
| 1 | Hero sky | **●** cloud band drifts (day) / stars twinkle (night), mist on the far hills | kurinji mist, midnight | sky is a fixed gradient |
| 2 | Hero leaf canvas | **●** fibre breathe (`uTime`); **○** pointer/tilt parallax moving the *light* rather than the picture is not built yet | ola leaf under a lamp | frozen frame, no parallax |
| 3 | Hero title திருக்குறள் | **●** **no motion** — the word is the anchor | — | — |
| 4 | ThemeSwitcher | **◐** turning the wick: gold warms/cools across 600 ms, shadows swing rather than cross-fade | "themes = the light in the room" (§4.16) | instant swap |
| 5 | TopBar | ○ brass edge catches a sheen as you scroll under it | brass | static bar |
| 6 | ~~SealedLeaf~~ | **withdrawn** — the ceremony is gone; the lamp below the verse is the ritual now | — | — |
| 7 | Today's couplet | **◐** the card's medallion carries a slow gold glint (5.5 s, opacity-only, a written fast-loop exception) — it loops rather than firing once on arrival, which is the louder reading of the register; the *scored ink* lives on the table's leaf, as `uInk` | ola leaf, scored script | flat ink |
| 8 | KuralVerse | **●** **the two-line couplet never moves** (PR #18 contract, asserted by `test-motion.mjs`) | — | — |
| 9 | Listen | ○ the **yazh string** vibrates per line, the **sangu** rings and decays; the spoken line is lit as if a lamp moved along it (neytal) | yazh, kuzhal, sangu | bowl/string at rest, verse readable |
| 10 | Save / reflect | ○ **tying a knot** (save): cord draws tight with a stop; **iron stylus on wet clay** (reflect): burr rises under the stroke, gloss dries matte over minutes, thumb impression on save | fibre cord; iron stylus; wet clay | knot tied; clay dry and matte |
| 11 | Journey | **●** **water in the pot**: level = 1,330 units; one ring per kural read; the streak is the thread of the pour | black-and-red ware pot; spindle thread | pot at its final level, surface flat |
| 12 | Sit with it | **●** **brass oil lamp**: the flame catches, breathes and drops the oil line as the minute burns; the light *is* the animation | lamp; measured minute | lamp snuffed, bowl shows the burned minute |
| 13 | Book tiles (அறம் · பொருள் · காமம்) | **◐** three **bundles** on the table; hover lifts one and its **real contact shadow** separates | palm-leaf bundles; Purananuru gift culture | bundles at rest |
| 14 | Situation doors (12) | **●** each door is a **weather** — the tile that matches your mood is the one whose landscape is moving on it | five landscapes as moods | static tiles |
| 15 | Skeleton / loading | **●** **the pot forms on the wheel** (see §6.6) — replaces the missing shimmer | potter's wheel; black-and-red ware | pot set down, contents visible |

### 6.3 Chapters, Search, Kural view

| # | Surface | The movement | Sangam anchor | Still end state |
|---|---|---|---|---|
| 16 | Search tray | writing displaces **sand**; clearing wipes it smooth; matches **rise out of the leaf stack** | river sand (marutham); stacks | sand smooth, results listed |
| 17 | Recents | faint earlier impressions in the sand, settling as new strokes land | — | impressions static |
| 18 | Chapter map | **133 kolam lamps**; a visited chapter is a lit lamp whose flame flickers; selecting brings one to the centre | Tamil lamp tradition (labelled as such) | every lamp in its final state |
| 19 | Chapter list | rows are **leaves in a stack**; the list settles after a filter with a paper-over-paper sound | leaf stacks | list at rest |
| 20 | Infinite sentinel | the next stack **slides in** with friction and a stop | — | items present |
| 21 | Kural view | prev/next **slides the neighbouring leaf over** with a slight rotation (direction is the book's order) | leaf stack | the open leaf, still |
| 22 | Action row | each action is a **tool on the table** (stylus, cord, bowl); pressing sinks it a millimetre and returns | iron stylus, cord | tools at rest |

### 6.4 Ask, Saved, Credits

| # | Surface | The movement | Sangam anchor | Still end state |
|---|---|---|---|---|
| 23 | Ask transcript | each turn is a **leaf note pushed through the gap**; the session becomes a growing bundle | ola leaves; the niche | bundle on the table |
| 24 | Model thinking (முல்லை) | lamp dims, hanging leaves stir, held beat — no spinner | patient waiting | lamp steady |
| 25 | The answer arrives (குறிஞ்சி) | a new leaf slides out, one springy beat, pressed with the sage's mark | veriyattam's sudden arrival | leaf lying flat |
| 26 | **Support/crisis slip** | **deliberately still.** Plain, bold, unmissable, motionless | — (sober by design) | still |
| 27 | Saved bundle | cords slacken, leaves fall open into the list; removing one visibly **thins the bundle** | tied leaf bundles | bundle open at its final size |
| 28 | Reflection notes | clay tablets with **drying state**: today's gloss, last month's matte | wet/dry clay | dried tablet |
| 29 | Credits wall | engraved stone with **raking light**: dust drifts through the beam; a chisel grain catches as you scroll | Tamil-Brahmi sherds, donor plaques | inscription static |

### 6.5 Chrome, dialogs, states

| # | Surface | The movement | Sangam anchor | Still end state |
|---|---|---|---|---|
| 30 | Bottom nav | four **objects** instead of glyphs: leaf, kolam lamp, niche screen, clay tablet; route change is a **threshold transition** (the light shifts as you step into another part of the room) | §4.22 | the new room, lit |
| 31 | Command palette (⌘K) | **teak drawer** slides out on runners with rail physics and a stop; entries are brass plates that sink on press | Valluvar's chest (§4.14) | drawer open, plates at rest |
| 32 | Settings | brass **dimmer knob** with a detent per step; **slips** lifted for verse layers; a **lamp** for day/night | §4.15 | controls in their positions |
| 33 | Reminders | the chosen hour sits on a **sundial arc**; the lamp is "set" at that hour; at the hour it lights | sun-path, lamp | lamp set at its hour |
| 34 | Toasts | a **brass bell (ghanta) swings** on its pivot and its ring decays; the message is an engraved plaque | temple bell | bell at rest, plaque gone |
| 35 | Offline | a **folded letter** is left on the table ("the kurals are already in the chest") — folded, not sealed; there is no ceremony left to perform | neytal letter | letter lying still |
| 36 | Update available | a **new leaf is placed on the pile**; the reader chooses to take it | leaf stack | leaf accepted or declined, at rest |
| 37 | Empty state | an empty pot and one clean leaf; the pot's interior is the **black** of unfired-ware — the unread | black-and-red ware | still |
| 38 | Error state | **a snuffed lamp and a torn leaf**, in the palai register (dry, abrupt, no guilt) | — | still, with the way to relight shown |
| 39 | Onboarding | three cards as **three leaves dealt onto the table**, each settling with a soft stop (kurinji) | leaf dealing | three leaves at rest |
| 40 | Share card | the offscreen render becomes a **photograph of the actual object**; the card leaves like a **boat** (neytal) | export as sending-away | card rendered, still |

### 6.6 The clay pot, in full — the reader's example, answered

Three movements, three surfaces, one object. Black-and-red ware is the model:
**wheel-thrown, red slip outside, black inside, kiln-fired at ~1100 °C.**

1. **Forming — the loader.** While the corpus or a route is preparing, the pot
   turns on a **potter's wheel**: the wall rises from a disc, the belly swells,
   the neck closes, the rim is wiped. The black interior appears as the mouth
   opens; the red slip reddens as the wall thins under the light. When loading
   ends the pot is **lifted off the wheel and set down** (a settle, not a fade).
   This replaces the skeleton shimmer — *loading becomes craft*, in the marutham
   register (regular, circular, unhurried, the kuravai's circling motion).
2. **Holding — the journey.** The pot holds the **water of the reading**: level =
   kurals read of 1,330; a ring spreads when today's kural is marked read; the
   surface answers a pointer or a device tilt with a ripple that settles in ~3 s.
   At midnight (kurinji) a wisp of mist sits on the water; when the pot is empty
   (nothing read, or offline) the interior shows the dry **palai** bottom — never
   a scolding.
3. **Pouring — the first kural of a day.** The pot tilts and a **measure of water
   falls** into the bowl below; the ripple takes 3 s to settle and the **streak is
   the thread of the pour** — unbroken across days, and a missed day is a *knot
   in the thread*, never a broken strand (no guilt mechanic, per §4.5).

A flat SVG pot already exists at `assets/img/sangam-pot.svg` (a silhouette with
gradients). It is retired for motion duty: a painted pot cannot turn on a wheel
or hold water. It stays as the no-WebGL fallback image.

---

## 7. Where motion stops (the still points)

The app's own floor is legibility and calm. These are the places motion is
*forbidden*, and they are part of the confirmation, not an afterthought:

1. **The couplet glyphs never move.** The two-line 4/3 block from PR #18 is
   frozen text; no transform, no reflow, no per-word animation. Verse is the one
   thing that must be still enough to read.
2. **The support / crisis slip in Ask is deliberately still** — plain, bold,
   unmissable. This is the one place the world stays sober.
3. **Information is never carried by motion alone.** Every animated object has a
   DOM label, an `aria-live` text node where relevant, and a state that reads
   without animation.
4. **Reduced motion, high contrast, forced colours, save-data, `plain` tier and
   print** each receive the end state (§4 L5).
5. **Motion never crosses the reading column** and never appears behind text at
   greater than 0.3 alpha.

---

## 8. Budgets, engine and tests

| Concern | Rule |
|---|---|
| Engine order | CSS/SVG → Canvas 2D → WebGL. WebGL only where **the object is the interaction** (pot, lamp, kolam, sand, bowl, yazh). |
| Canvas count | **one WebGL scene per route, never two**; the global weather layer is Canvas 2D. |
| Frames | Four animation frames per route: one WebGL scene and three idle loops (`LOOP_BUDGET`). Every idle loop runs through `useMotionLoop`, which is the only module in `src/` that calls `requestAnimationFrame` — asserted by `test-motion.mjs`, because a ceiling with a second door in it is not a ceiling. |
| Particles | ≤ 24 per surface, ≤ 60 on screen; text-free zones; hard cap constant named in code. |
| Pause | `document.hidden`, `IntersectionObserver` off-screen, and any open Radix dialog pauses the route's living thing. |
| Pixel budget | dpr capped at 2 (already the case); scenes on `powerPreference: 'low-power'`; degrade `full → still → css3d → plain` through the existing `materials/quality.ts` tiers. |
| Dependencies | **none added.** No GIFs, no video, no third-party artwork; everything procedural. |
| Bundle | one shared motion-runtime module; budget ≤ 25 KB gz added across the whole plan. |
| Offline | PWA stays offline-complete; geometry, plates and maps are baked at build time by `build-materials.mjs`. |
| Tests | `app/scripts/test-motion.mjs`: every animated class is gated by both reduced-motion paths, every door resolves to a landscape that exists, the particle and loop arithmetic holds, the registers are sourced and inside the floor/ceiling, the kill matrix is total, `data-motion` has exactly one writer, `requestAnimationFrame` has exactly one starter, and the couplet block has no transform, no transition and no keyframe. All existing suites stay green. |

### 8.1 The runtime — `app/src/motion/`

The plan's grammar lives in code, not in this document. Seven files, no
dependencies, and every one of them either pure or a thin reading of something
pure:

| Module | What it owns |
|---|---|
| `budget.ts` | `PARTICLE_BUDGET` (60/16/36), `LOOP_BUDGET` (1 WebGL + 3 idle = 4), `IDLE_PERIOD_SECONDS_MIN` 6, `INTERACTION_MAX_MS` 400, `MATERIAL_EXCEPTION_MS`, the named `FAST_LOOPS` exceptions. The only place these numbers are written. |
| `registers.ts` | The five landscapes as tempo, easing, amplitude, drum and pann; `ROUTE_REGISTER`, `REGISTER_BY_STATE`, and `registerFor(path, state)` — state over a route, route over a default. Guarded at module load. |
| `conditions.ts` | `motionVerdict(conditions)` — the kill matrix as one pure function, and the two different answers it can give: *still* (draw the end state) versus *paused* (hold the frame for later). |
| `loops.ts` | `LoopRegistry` — the route's frame ceiling, which refuses the fourth loop **by name** so a leak is visible instead of silent. |
| `useMotion.ts` | `useMotionVerdict`, `useMotionRegister`, `useMotionLoop` (verdict first, registry second, throttled, delta-clamped, throw-safe), `useInFrame`, `useMotionSuspended`, `useMedia`, `usePageHidden`. |
| `MotionProvider.tsx` | Puts `data-motion` and `data-register` on `<html>` and counts open dialogs. One writer for the stylesheet's kill switch, which previously had **none** — the in-app Reduce-motion toggle silenced the canvas and left every CSS loop running. |
| `index.ts` | The public surface, so six routes import one path. |

The distinction the runtime is built around, and the reason it is a module rather
than a habit: **still** and **paused** are different promises. Reduced motion,
high contrast, forced colours, save-data and the flat reader get the *end state*
— the pot full, the lamp lit, the leaf flat. A hidden tab and an open dialog get
a *held frame* — the surface stays exactly as it was and resumes, because
repainting it into an end state would be a jump. Conflating them is how "reduced
motion" turns into "missing feature", which the house rule forbids.

---

## 9. Phasing

| Phase | Ships | Touches | Status |
|---|---|---|---|
| **A — the world breathes** | weather on all six routes + one living thing per route in CSS/Canvas 2D + the pot forming on the wheel + the `motion/` runtime | all views, `Atmosphere`, the new runtime | **Home done**; the runtime is done and is what makes the rest a recipe rather than a rewrite. Five routes remain. |
| **B — the five objects** | pot (water/journey), lamp (sit & reminder), kolam (chapters), sand (search), yazh/sangu (listen) | journey, today, chapters, search, listen | **pot and lamp done** (Home); the other three are the next build |
| **C — touch** | material responses on every interactive element: gold sheen, knot, thumbprint, bead clack, drawer rails, knob detents, bell swing | chrome, dialogs, cards, nav | not started; `INTERACTION_MAX_MS` and the register easings are already in the runtime for it |
| **D — transitions, sound, haptics** | threshold route transitions; opt-in procedural sound per register; haptics per material | router, toasts, banner, settings | not started — the reader's answer was "later phase, off by default" |

Each phase is independently shippable and each is verifiable against this file.
`docs/motion-playbook.md` carries the per-route worksheet for the five routes
still to do, in the order they were sequenced.

---

## 10. Confirmed — the reader's answers (2026-10-06)

1. **Density: louder.** Several living things per screen (L1 rewritten above).
   The budget is what makes "louder" safe, and it is enforced in code.
2. **Depth: hybrid.** Real 3D only where the object *is* the interaction — the
   pot, the lamp, the kolam, the sand, the yazh. Everything else is
   material-skinned CSS, SVG or Canvas 2D, which is how motion reaches *every*
   surface instead of six screens.
3. **The thinai is the grammar** (state → landscape → tempo → easing →
   amplitude), not five colour themes and not a motif library. The colour modes
   stay as the reader knows them: Kurinji Day and Night.
4. **The still points of §7 are confirmed as written.** The couplet's glyphs
   never move; the crisis slip in Ask is motionless; motion never carries
   information alone; and reduced motion, high contrast, forced colours and
   print each receive an end state rather than a missing feature.
5. **Sound: Phase D, opt-in, off by default, procedural only** — no files, no
   third-party recordings.
6. Two further decisions taken in the same round, both of which changed the app:
   **the seal break is removed** (see §1.1), and **the first build is Home,
   deep**, with a written playbook for replicating it across the other five
   routes rather than five shallow passes at once.

---

## 11. References

- *Sangam landscape* — the thinai table, moods, flora/fauna, occupations:
  <https://en.wikipedia.org/wiki/Sangam_landscape>
- *Landscape in Sangam Literature*, Dr P. Aruna Devi —
  <https://tamilliterature.in/landscape-sangam-literature-dr-p-aruna-devi/>
- *Sangam landscape*, Grokipedia (attributes table, akam/puram) —
  <https://grokipedia.com/page/Sangam_landscape>
- Thinai attributes, drums, tunes, occupations (slide deck) —
  <https://www.slideshare.net/slideshow/1390939634701454999165594/66338605>
- *Sangam poetry and a journey to Kurinji land*, New Indian Express —
  <https://www.newindianexpress.com/opinions/2021/dec/09/sangam-poetry-and-a-journey-to-kurinji-land-2393338.html>
- *Music of Tamil Nadu*, Grokipedia (pann, parai, yazh, kuzhal, muzhavu, sangu) —
  <https://grokipedia.com/page/Music_of_Tamil_Nadu>
- *Pann*, Grokipedia (modes per thinai) — <https://grokipedia.com/page/Pann>
- *Kuravai / Kuṟavai* (Tolkappiyam; munter- and pinter-kuravai) —
  <https://www.wisdomlib.org/definition/kuravai>
- *Dance forms of Tamil Nadu*, Grokipedia (veriyattam; Kuruntokai 40; Kodumanal
  figurines) — <https://grokipedia.com/page/Dance_forms_of_Tamil_Nadu>
- *Keeladi* excavation, The Hindu (black-and-red ware at 1100 °C, carnelian boar
  bead, shell bangles, spindle whorls) —
  <https://www.thehindu.com/news/national/tamil-nadu/unearthing-an-ancient-civilisation/article61624500.ece>
- Sangam-period site inventory (Adichanallur, Korkai, Porunthal, Kodumanal,
  Alagankulam) — <https://www.nativeplanet.com/travel-guide/archaeological-remnants-belonging-to-sangam-period-recovered-from-ancient-tamil-nadu-here-is-the-li-006903.html>
- Tenkasi excavation, Indian Express (peacock-painted burial pot, spindle whorls) —
  <https://indianexpress.com/article/cities/chennai/stone-age-tools-to-sangam-era-workshops-what-a-tamil-nadu-excavation-has-revealed-10792991/>
- House doctrine: `docs/reality-first-ui.md`, `docs/ui-ux-proposal.md`,
  `docs/kurinji-ui-plan.md`
- The how-to built from this plan: `docs/motion-playbook.md`
- The runtime built from this plan: `app/src/motion/` (budget, registers,
  conditions, loops, hooks, provider) and `app/scripts/test-motion.mjs`
