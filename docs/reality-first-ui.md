# Reality-first UI — the intent, restated, feature by feature

> **Status:** proposal for confirmation. Nothing in this document is built yet.
> It exists to confirm one thing before any code moves: that we agree on what
> "real, not 2D" means for **every** surface in the app.

---

## 1. The core intention, in one paragraph

The app today is *illustrated*. A wax seal is twelve SVG circles and a `<text>`.
A rolled leaf is a `repeating-linear-gradient`. A book is a glass tile with a
count in it. It is tasteful, it is accessible, and it is unmistakably a web page:
every object is a **drawing of a thing**, sitting flat on a plane.

The rework is to stop drawing the things and start **making them**. Every surface
becomes a **physical object with a material, a dimension, a light and a
consequence**, and every interaction becomes the **real action performed on that
object** rather than a click that triggers a state change. The reader does not
"open today's couplet" — they **break a wax seal and unroll a palm leaf**.

So the test I will apply to every single feature before it ships:

| Question | If the answer is no, it is not done |
|---|---|
| **Material** — is it made of something with a real surface (fibre, wax, brass, stone, water) rather than a gradient standing in for a surface? | |
| **Dimension** — does it have thickness, and does it cast/receive light and shadow onto its neighbours? | |
| **Action** — is the interaction the physical verb (break, unroll, pour, strike, tie, press, light) rather than a toggle? | |
| **Consequence** — does the object remember what happened to it (a broken seal stays broken, ash accumulates, a knot stays tied)? | |
| **Senses** — do motion timing, touch and (optionally) sound all belong to that material? Wax does not move like water; stone does not sound like brass. | |

That is the whole brief. Everything below is that brief applied 27 times.

---

## 2. The world the app lives in

"Real" needs one coherent place, or we get a photoreal leaf next to a flat icon
and the illusion collapses on contact. So:

> **A palm-leaf scriptorium (ஓலைச்சுவடிக் கூடம்) in a Tamil temple, at dusk.**
> The reader sits at a teak table on a stone floor. One brass oil lamp burns.
> On the table: bundles of ola leaves bound with fibre cord, wax seals, a scribe's
> iron stylus (எழுத்தாணி), a copper water vessel, a bronze bell, a small chest,
> a kolam drawn in rice flour, jasmine and sandalwood paste.

Every UI element becomes an object from that table. **This is not decoration —
it is the navigation system.** Today's couplet is *the sealed leaf*. Chapters are
*the 133 lamps of the kolam*. Saved kurals are *your tied bundle*. Settings are
*the brass fittings on the chest*. A bell rings when something is worth noticing.

Light is the unifying material: **one warm, flickering lamp** in night mode,
daylight through the door in day mode. Because light is animated, everything is
already alive without animating anything individually.

### What the world does *not* change

Content, structure, routes, the corpus, the on-device intent model, and the
accessibility contract stay exactly as they are. This is a **rendering and
interaction rework, not a product rework** — no feature is removed, no Kural
changes, nothing new is sent anywhere.

---

## 3. The architecture that makes this safe

The single most important decision, because it protects everything the repo
already tests (axe, contrast, couplet contract, PWA, corpus):

```
        ┌──────────────────────────────────────────────────────────┐
        │  MATERIAL LAYER  —  WebGL2 / Three.js / R3F              │
        │  objects, PBR surfaces, light, physics, post-processing  │
        │  aria-hidden="true"  ·  pointer-events: none (by default)│
        └──────────────────────────────────────────────────────────┘
                              ▲ mirrors state
                              │ (not the source of truth)
        ┌──────────────────────────────────────────────────────────┐
        │  CONTRACT LAYER  —  the DOM we already have              │
        │  real <button>, real text, real focus, real aria         │
        │  every existing component, styled to sit on the object  │
        └──────────────────────────────────────────────────────────┘
```

**Law 1 — The DOM is the source of truth.** State lives in `appStore`, not in a
mesh. The GPU reads state and renders matter; it never owns a decision.
**Law 2 — Text is never baked into a texture.** The couplet stays selectable,
searchable, screen-readable DOM. It is *styled* to look inked into the leaf
(relief, bleed, paper tooth under it) rather than rendered as pixels.
**Law 3 — Every material interaction has a semantic twin.** Breaking the seal is
a `<button>`; the fracture is the visual layer's response to the click. A screen
reader hears "Today's couplet is sealed. Activate to unroll it." — unchanged.

### The renderer degrades in three steps, and all three are designed

| Tier | When | What the reader gets |
|---|---|---|
| **Full** | WebGL2 + enough GPU + motion allowed | Live materials, physics, light, depth, sound |
| **Still** | No WebGL, weak GPU, `prefers-reduced-motion`, low-power mode | **Pre-rendered photographs of the same objects** (baked from the real scene at build time), with CSS parallax layers and instant state swaps. Still three-dimensional and real-looking; just not live. |
| **Plain** | Forced colors, reader preference, print | Today's flat, AA-verified typographic UI — kept forever as a first-class mode, not a broken fallback |

Tier choice is a **stored preference** (`materials: full | still | none`), defaults
to `full` when capable, and can be changed at any time. `prefers-reduced-motion`
drops to *Still* automatically.

---

## 4. Every feature, mapped

Legend — **Today** is what is in the repo now; **Real** is what it becomes.

### 4.1 Home: the hero

| | |
|---|---|
| **Today** | `HeroCanvas` → `HeroScene` → `agedLeaf.ts`: a full-screen `planeGeometry` with a fragment shader (fibres, grain, veins, vignette) over a CSS radial-gradient fallback. It is a *picture* of a leaf. |
| **Real** | A **real ola leaf on the table**, seen in perspective. Ribbed fibre you can see in raking light, edge curl, insect-worn holes that let light through, ink that sits in scored grooves and catches a highlight. The lamp flickers, so shadows move across the table. Dust drifts in the light. |
| **Action** | Pointer and device-tilt **parallax** — the camera is a head, not a page. Scrolling moves the light, not the picture. |
| **Tech** | R3F `<Canvas>` with a real camera; procedurally generated albedo/normal/roughness/AO maps (no downloads); animated point light for the lamp; instanced dust with a soft additive material; depth-of-field + film grain post pass. |

### 4.2 The seal — the reference example, fully specified

| | |
|---|---|
| **Today** | `SealedLeaf.tsx`: a `<button>` with `WaxSeal` (12 scallop circles, a disc, a ring, the Kural number in a `<text>`), two gradient overlays for "rolled shading" and "fibre", and a text hint. `onOpen()` flips a Zustand flag; `DailyRitual` cross-fades an `AnimatePresence` swap to the opened card. |
| **Real** | Seven physical beats, in this order: ① the **thumb presses the wax** and leaves an impression (pointer-down); ② the wax **fractures** — cracks propagate from the thumb, the disc splits into shards; ③ **crumbs and fragments fall** and land on the table, where they **stay**; ④ the **fibre cord goes slack and unwinds**; ⑤ the leaf **unrolls along its length** — the strip feeds off the coil at a steady rate while the coil spins faster as it empties, and the last curl relaxes into flat; ⑥ the **edges flutter and come to rest**, ink revealed in the wake of the unroll; ⑦ the **broken seal remains** — for the rest of the day the reader sees what they did. |
| **Consequence** | `unrolled[day]` in the store already records the state; now the scene *renders* it: tomorrow the wax is whole again, today it is shattered. |
| **Senses** | A short wax crack (filtered noise burst, Web Audio — no audio files), a low paper rumble during the unroll; `navigator.vibrate` tuned to the crack, not the current `[6,40,10]`. |
| **Accessibility** | Identical semantics to today: one button, same label, `aria-expanded`, and **"Open without the ceremony"** still jumps straight to the opened state with no animation. Reduced motion = fracture and unroll are instant, the *end state* is still shown. |
| **Tech** | Leaf as a curved surface deformed in a **vertex shader** (`uUnroll: 0→1`); wax as pre-fractured Voronoi shards with a lightweight rigid-body pass (custom, ~40 lines — no physics engine needed for 12 shards); instanced crumbs with a settle-and-sleep rule. The shader already in the repo (`agedLeaf.ts`) becomes the *surface input* to this geometry rather than a full-screen plane. |

Two things were learned building this, and both are load-bearing enough to write down.

**One clock, not seven.** The seven beats are not seven animations; they are one
sequence, so the scene keeps a single monotonic `t` and asks `phaseAt(t)` what
that means. The first version gave each phase its own `elapsed` clock, which
looked tidier and does not survive contact: the cord's fall begins during the
fracture and ends during the unroll, so its clock had to be re-based twice, and
each re-base is a jump. With one clock, `0.68` is `0.68` for everything —
`SEAL_TIMELINE_SECONDS = 3.85`, and the phases `pressing | breaking | unrolling |
open` are a reading of `t`, never a container for it.

**A coil keeps its diameter.** The leaf's unroll is not an animation parameter
swept from 1 to 0; it is a *split*. Some of the strip is still wound, the rest
has come off and is lying on the table, and the thing the animation moves is
where that boundary is. The first version instead wrapped the entire strip into
a spiral at every moment, choosing the radius to keep the arc length right
(`r = L/φ`) — the endpoints were correct and the middle was nonsense: as φ fell,
`L/φ` grew, so a half-unrolled leaf was one enormous 110 mm loop with all 341 mm
of itself still inside it. It did not unroll, it *breathed*, and then snapped
flat in the last tenth of the animation. Now the coil's radius follows only its
remaining layers, the strip feeds off the outside at a constant rate — and the
coil's angular speed rises as it empties, five turns at first and the last turn
whipping off. That last detail is not decoration: it is the thing that makes the
leaf look like it is obeying something rather than interpolating.

### 4.3 Today's couplet — the opened leaf

| | |
|---|---|
| **Today** | `TodayKuralCard` + `KuralVerse`: a glass panel with the Tamil couplet, transliteration, Pope's verse and the simple meaning stacked with borders. |
| **Real** | The **opened leaf**, with the couplet scored into it in Tamil script. The transliteration is a **faint pencil note** in the margin. Pope's English is a **separate paper slip** laid on the table beside the leaf, with its own curl and shadow. The simple meaning is a **modern printed card** tucked under the slip. |
| **Action** | Layer toggles in Reading settings become **slips being placed or lifted off the table** — with the paper lifting, casting a moving shadow and settling. The couplet's own two-line structure is untouched (the 4/3-word contract still governs it). |
| **Tech** | DOM text over the 3D leaf; a `mix-blend-mode: multiply` + SVG displacement filter for the ink-in-fibre look; paper slips as thin curved geometry with contact shadows. |

### 4.4 Sit with it — the quiet minute

| | |
|---|---|
| **Today** | `SitTimer`: an SVG ring with `strokeDasharray` progress, a `clock()` readout, Play/Pause/Reset buttons and 1′/2′/3′ chips. |
| **Real** | **A brass oil lamp.** The reader lights it; the flame catches, steadies, and **breathes**. The measured minute is the **oil burning down** — visible as the flame lowering and the oil line dropping in the bowl. A thread of **smoke curls upward**, disturbed by the reader's pointer. At the end the flame settles and dims on its own — the minute is over, and nothing scolds anyone for it. |
| **Action** | Play = strike the match and light it. Pause = cup your hand over it (flame shrinks, does not die). Reset = snuff it. Length = a bigger or smaller bowl. |
| **Senses** | A struck match, a soft low flame hum, the extinguish puff. Warm light spilling across the table and onto the leaf beside it. |
| **Tech** | Flame via a small raymarched/particle shader with a noise-driven sway + one real `PointLight` whose intensity tracks it; smoke as a GPU particle ribbon; wick and oil level as animated geometry. |
| **Accessibility** | The countdown stays a real `aria-live="polite"` text node and the buttons stay buttons — the lamp *is* the visualiser for a normal timer. |

### 4.5 Reading journey — progress

| | |
|---|---|
| **Today** | `JourneyCard`: an SVG progress ring plus a `<dl>` of Read / Chapters visited / Streak. |
| **Real** | A **mala (prayer strand) of 1,330 beads** in a shallow brass bowl, plus a **second strand of 133 larger beads** for chapters. Each kural read **adds a bead to the strand** — they arrive with a small clack and settle against their neighbours. The **streak is the thread**: an unbroken thread is a run of days; a break is a visible knot, never a broken strand (no guilt mechanic survives the translation, by design). |
| **Action** | Drag to rotate the strand; the beads you have read catch the lamp, the rest stay matte. |
| **Tech** | Instanced meshes (one draw call for 1,330), a curve-following layout, a cheap contact-shadow or a single baked AO strip; the `<dl>` stats remain in the DOM for screen readers and tests. |

### 4.6 The three books — அறம் · பொருள் · காமம்

| | |
|---|---|
| **Today** | `BookTiles`: three `glass-panel` links with `{chapters} chapters · {kurals} kurals`. |
| **Real** | Three **bundles of palm-leaf manuscripts** on the table, each bound differently and each carrying its own seal and its own object: **அறம்** a stone inscription slab, **பொருள்** a bronze trade weight and a small coin vessel, **காமம்** a jasmine garland. Hover lifts a bundle slightly; its **real cast shadow** separates it from the table. |
| **Action** | Opening a book **slides it off the table** and lays its leaves out — the transition into the chapter browser. |
| **Tech** | PBR-ish materials with procedurally generated roughness/normal; contact shadows; instanced cord strands and jasmine petals. |

### 4.7 Chapter map — the 133 அதிகாரங்கள்

| | |
|---|---|
| **Today** | `ChapterMap`: a 44 px-button grid per book, with a small accent dot for visited chapters. |
| **Real** | A **kolam of 133 small oil lamps (agal vilakku)** drawn in rice flour on the floor, arranged in the three-book pattern. **A chapter you have visited is a lamp you have lit** — it burns, warm, and shows in the flame's light on the floor. Selecting a chapter brings its lamp to the centre and brightens it. |
| **Action** | Pan across the kolam; the lamps you have lit make a visible constellation of your reading. Lighting a lamp (opening a chapter) *adds* to the picture rather than ticking a box. |
| **Tech** | One instanced lamp mesh (133), one instanced flame sprite, **one real light for the active lamp only** (perf: never 133 real lights); rice-flour kolam as a textured decal with a soft edge. |
| **Accessibility** | The existing buttons stay — same 44 px targets, same `aria-pressed`, same `sr-only` chapter text — laid over their lamps. |

### 4.8 Search

| | |
|---|---|
| **Today** | `SearchBar`: a text field with an as-you-type `listbox`, recent searches and a suggestion dropdown. |
| **Real** | A **tray of sand** on the table for the query (you write in it with a stylus, the grain displacing under the stroke), and **matching leaves rising out of the stack** as you write — the results physically come up from the pile. Recents are **faint earlier impressions** in the sand. |
| **Action** | Writing a letter displaces sand; clearing the tray wipes it smooth. A found kural **lifts out of the stack** toward the reader. |
| **Tech** | A height-field displacement shader driven by pointer strokes for the sand; result cards as thin leaf geometry with a rise animation; the real `<input>` remains for typing, IME, dictation and tests. |
| **Accessibility** | Standard field, standard combobox semantics — the sand is `aria-hidden` decoration drawn *behind* the real field. |

### 4.9 Ask Valluvar — வள்ளுவரைக் கேள்

| | |
|---|---|
| **Today** | `AskValluvar.tsx`: a chat transcript — a column of turns, thought of as a conversation UI. |
| **Real** | Not a chat. A **niche in the wall** lit by a lamp, where the sage's presence is a seated silhouette behind a **screen of hanging leaves**. You write your question on a **small leaf note and push it through the gap**; while the on-device model works, **the lamp dims and the leaves stir**; then a **new leaf slides out** bearing the couplet, sealed with the sage's mark. The session becomes a **growing bundle of answered leaves** on the table that you can leaf through and take from. |
| **Action** | Push a question through; pull an answer out. "Another" = asking again, and a second leaf slides out. Support-phrase routing (Tele-MANAS 14416, KIRAN, findahelpline.com) still comes *first* and is presented as a **bold, plain, unmissable slip** — the one place in this world where the material stays deliberately sober. |
| **Tech** | Layered parallax depth, volumetric light shaft, drifting smoke; leaf slide with friction and a stop; the silhouette as a soft-edged depth-sorted card. |
| **Accessibility** | Fully preserved: the live region, the prompts, the prompt buttons, the model-error message, and focus management all stay exactly as they are. |

### 4.10 Listen — recitation

| | |
|---|---|
| **Today** | `ListenButton` drives the browser's speech engine; there is no visual for the speech at all. |
| **Real** | A **bronze singing bowl struck with a mallet**, or a **veena string** — pick one per theme. While reciting, the bowl **rings** with visible concentric ripples and the string **vibrates**, both driven by the live audio (an `AnalyserNode` on the speech output where the platform allows it, otherwise a synthetic envelope). The line being spoken is **lit as if a lamp moved along the verse**. |
| **Action** | Tap the bowl to begin; tap again to still it — and the ring **decays** instead of cutting off. |
| **Consequence** | The repo already has a hardened TTS layer (stale callbacks, iOS gesture timing, dead engines). None of that logic changes; it now drives a visual. |
| **Senses** | The bowl's own tone under the recitation (procedural, and off by default); a soft strike transient. |

### 4.11 Save and reflection

| | |
|---|---|
| **Today** | `KuralCard`/`KuralView` bookmark buttons; `ReflectionDialog` is a Radix modal with a 500-char `textarea`. |
| **Real** | **Saving is tying a knot.** A fibre cord is tied around the leaf with a real knot you watch being made — the saved bundle on the table grows. **Reflection is writing with an iron stylus on wet clay**: the stroke **raises a burr** in the clay (height derived from the ink you type), the surface is glossy while wet and **dries to matte over the following minutes**, and the reader's **thumb impression** — a real, familiar Indian mark of authorship — is pressed beside it on save. |
| **Action** | Tie / untie. Write / smooth over (erase). Press your thumb to seal a note. |
| **Consequence** | Clay that has dried looks dried. Notes written weeks ago look older than today's. |
| **Tech** | Clay = procedural normal + a scorched-height pass from the text; the `textarea` stays real and stays keyboard-accessible; typing drives the relief. |
| **Privacy** | Unchanged and re-stated in the world's own language: *"this clay stays on your table — nothing is carried out of the room."* IndexedDB/localStorage adapter untouched. |

### 4.12 Saved — your bundle

| | |
|---|---|
| **Today** | `Saved.tsx`: a vertical list of `GlassCard`s with verse, meaning, note, and buttons. |
| **Real** | A **tied bundle of leaves on a shelf**, plus the **clay tablets** of your reflections. Open the bundle and the leaves fall open into the list you already have; each leaf bears its knot. |
| **Action** | Untie one leaf to take it out (remove). The bundle visibly thins. |

### 4.13 Sharing, and the share card

| | |
|---|---|
| **Today** | `lib/shareCard.ts` draws a 1080×1920 PNG in **Canvas 2D** — ola ground, gold frame, rosettes, a drawn wax seal, a Tamil-numeral watermark, the couplet, the meaning. |
| **Real** | **The exported image is a photograph of the actual object.** The same 3D scene is rendered offscreen at 1080×1920 — the real leaf with real fibre, the real wax seal, real raking light — and handed to the share sheet. |
| **Fallback** | The existing Canvas 2D card stays as the guaranteed path (no WebGL, export failure, or reader preference) — so sharing never breaks, it just gets less photographic. |
| **Tech** | Offscreen `WebGLRenderer` → `toBlob`; the current 2D drawing code is retained and unit-tested as the fallback. |

### 4.14 Command palette — ⌘K

| | |
|---|---|
| **Today** | `CommandPalette`: a Radix dialog with a filterable list. |
| **Real** | **Valluvar's chest of verses** — a teak drawer with brass fittings slides out of the table edge on runners, and each entry is an **engraved brass plate** that sinks a millimetre when pressed. |
| **Tech** | Wood grain and brass as procedural materials; drawer motion with rail physics and a stop; the list semantics, roving focus and filtering logic stay exactly as they are. |

### 4.15 Settings, shortcuts, onboarding

| | |
|---|---|
| **Today** | `SettingsSheet` (Radix), `ShortcutsDialog`, `OnboardingDialog` — glass panels. |
| **Real** | A **hand-bound book opening**, or a **chest drawer** holding: a **brass dimmer knob** for text size (turns with a detent per step), a **stack of slips** for verse layers, a **lamp** for day/night, and a **clay tablet** for language. |
| **Action** | Turning a knob, lifting a slip, trimming a wick. |
| **Accessibility** | Every one keeps its native semantics — the knob *is* a slider with a label, the slips *are* switches. Radix behaviour (focus trap, escape, restore) is untouched. |

### 4.16 Themes

| | |
|---|---|
| **Today** | `ThemeSwitcher` + `[data-theme]` CSS-variable swap between Palm-Leaf Day and Sangam Night. |
| **Real** | Not themes — **the light in the room**. Switching moves the **sun** and **trims the lamp**: colour temperature shifts, shadows lengthen and swing, the metal in the room changes as it catches a different light, and the leaf's subsurface glow changes. |
| **Action** | Turning the wick down, or opening the door. |
| **Tech** | One lighting rig driven by a `timeOfDay` uniform; token colours continue to drive the DOM text so contrast stays verified. |

### 4.17 Reminders

| | |
|---|---|
| **Today** | `ReminderSettings`: a time input and a switch; `lib/reminder.ts` schedules the notification. |
| **Real** | **Setting a lamp to be lit at that hour.** The chosen time is where the lamp sits on a **sundial / arc of the day**; the notification itself is unchanged (and still never quotes the couplet). |
| **Tech** | A dial with a sun-path; drag to set the hour (a real time input remains underneath). |

### 4.18 Toasts, offline and update banners

| | |
|---|---|
| **Today** | `Toasts`, `OfflineBanner`, `UpdateBanner` — text pills and bars. |
| **Real** | A **brass bell (ghanta)** swings and rings when something is worth noticing; the message appears as an **engraved plaque** that stays a few seconds and then goes quiet. Offline is a **sealed letter** left on the table ("the kurals are already in the chest"). An update is a **new leaf placed on the pile**, which the reader chooses to take. |
| **Tech** | Rigid-body swing on a pivot; procedural bell strike; the DOM toast text unchanged for `role="status"` announcements. |

### 4.19 Loading, empty and error states

| | |
|---|---|
| **Today** | `SkeletonKuralCard` shimmer; a plain error panel; empty-state paragraphs. |
| **Real** | **Loading is the leaf being prepared** — ink still wet, or the lamp being lit; the "shimmer" becomes light travelling across a real surface, in the same direction as the room's lamp. **Empty** is an empty table with a single clean leaf waiting. **Error** is a **snuffed lamp and a torn leaf**, with the same plain-language explanation and the same way to relight it. |

### 4.20 Credits

| | |
|---|---|
| **Today** | `Credits.tsx`: a list of attributions. |
| **Real** | A **temple wall inscription** — donor-plaque stone with engraved lettering, cut deep enough to hold shadow. Attribution text is unchanged and still links out. |

### 4.21 Kural detail — the focus reader

| | |
|---|---|
| **Today** | `KuralView`: one card, prev/next, action row, keyboard j/k/s/l. |
| **Real** | **One leaf alone on the table** under the lamp, with the room dimmed around it — reading as a physical act of attention. Prev/next **slides the neighbouring leaf over** with paper friction; the leaves are stacked in order, so moving through the book has a direction. |
| **Tech** | Leaf stack with a slide + slight rotation; existing keyboard handling and routes unchanged. |

### 4.22 Navigation — top bar and bottom nav

| | |
|---|---|
| **Today** | `TopBar` and `BottomNav` with `lucide-react` line icons (Today · Chapters · Ask · Saved). |
| **Real** | A **carved teak frame** holding four **objects**: the **leaf** (Today), the **kolam lamp** (Chapters), the **niche screen** (Ask), the **clay tablet** (Saved). Icons stop being pictograms and become the things themselves, lit by the room — so you navigate by recognising objects, not by decoding glyphs. Route changes are **threshold transitions** (light shifting as you step into another part of the room), not slides. |

### 4.23 The four environments (routes)

| Route | Today | Real |
|---|---|---|
| `/` | Hero + ritual + journey + tiles | **The table** — the reader's place, the leaf waiting |
| `/chapters` | Filters + map + list | **The floor / library wall** — 133 lamps, the sand tray, the stacks |
| `/kural/:n` | Single card | **Under the lamp** — one leaf, attention held |
| `/ask` | Chat column | **The niche** — the sage behind the leaves |
| `/saved` | List | **The shelf** — your bundle and your clay |
| `/credits` | List | **The wall** — the inscription |

### 4.24 The systems that carry all of it

| System | Today | Real |
|---|---|---|
| **Materials** | Gradients, `backdrop-filter` glass, two JPEG textures, flat SVG | A procedural material library: **ola leaf, wax, fibre cord, brass, copper, teak, stone, clay, cloth, water, flame, ash, sand, paper** — each with roughness/normal/AO, each with its own sound and its own motion timing |
| **Light** | Fixed per theme, no shadows | One physically-motivated rig: a lamp (animated), daylight (time-based), contact shadows, ambient occlusion; **the light is the animation** |
| **Sound** | None | Optional, procedural (Web Audio, zero audio files): wax crack, leaf rustle, bead clack, bell, match strike, water. Off by default, remembered, and always cancellable |
| **Touch** | `navigator.vibrate` on two events | A haptic vocabulary per material — sharp for wax, dull for stone, long for a bell |
| **Motion** | Framer Motion on DOM elements | Material-timed motion: wax shatters fast, leaf unrolls slow with over-shoot, water ripples, paper settles; every one has a reduced-motion *end state*, never a disabled feature |
| **Post-processing** | none | Bloom (lamp, flame), subtle vignette, film grain, depth of field, and chromatic aberration only at the frame edges — tuned low; the floor of this app is legibility, not spectacle |

---

## 5. Delivery, guardrails and budgets

### Phased, and each phase ships something whole

| Phase | Content | Why here |
|---|---|---|
| **0. Foundation** | `materials` preference + tiers; `MaterialCanvas` (context manager, capability probe, budget guard); procedural texture/material library + a material preview harness; the DOM/GPU contract written down and enforced by a test | Everything else stands on this; it must exist before one scene is built |
| **1. The seal** | The reference interaction end-to-end: wax, fracture, cord, unroll, consequence, sound, haptics — in all three tiers | It is the user's stated example, and it proves the whole architecture on one screen |
| **2. The table** | Hero, opened leaf, paper slips, the lamp (`SitTimer`), the bell (toasts) | Home is the daily surface; this is where the world becomes convincing |
| **3. The library** | Chapter lamps, sand search, book objects, leaf stacks | The navigation surfaces, and the biggest scene |
| **4. The niche and the shelf** | Ask Valluvar, saved bundle, clay reflections, stylus writing | The most intimate interactions |
| **5. The room** | Light rig + time of day, sound design, chest/palette, inscription, transitions, share-photo export | The polish pass that makes it one place |

### Guardrails (non-negotiable, and each one already gated in this repo)

- **Accessibility** — axe-clean on every screen and dialog (`test-render.mjs`), WCAG-AA measured tokens (`test-tokens.mjs`), 44 px targets, keyboard-complete, forced-colors → Plain tier, `sr-only` twins for every material interaction.
- **Content** — the couplet stays two lines; `test-couplet.mjs` and `docs/couplet-line-contract.md` are untouched. Nothing about the corpus, intents or glosses changes.
- **Offline** — no CDN, no runtime fetch of textures or models. Every material is **generated procedurally at runtime** or is a **self-hosted asset in the precache**. The PWA contract test must stay green.
- **Performance** — one WebGL context app-wide; DPR capped at 2; a **texture/geometry memory budget per scene** (target ≤ 48 MB total); scenes lazy-loaded per route and *destroyed* on leave; **60 fps desktop / 30 fps mid-range mobile** targets with an automatic drop to lower quality (fewer particles, no post) before ever dropping to *Still*; textured generation off the main thread via `OffscreenCanvas` in a worker.
- **Battery & data** — an explicit low-power mode; pause all rendering on `visibilitychange`; `frameloop="demand"` everywhere the scene is static.
- **Privacy** — unchanged: on-device classifier, on-device storage, no analytics, no accounts.
- **Fallback** — as in §3: *Full → Still → Plain*. A reader who wants the flat app keeps the flat app.

---

## 6. What I want confirmed before writing code

1. **Is §1 the intent?** Physically-simulated objects and real interactions, not photographic imagery and not merely richer 2D.
2. **Is §2 the right world?** The temple scriptorium and its objects — or a different setting.
3. **Is the fallback stance right?** Material-reality as the default experience, with the current flat UI kept as a real, supported *Plain* mode and pre-rendered *Still* tier.
4. **Where to start?** The seal (Phase 1) first, as the reference that proves the architecture — or a different screen.
