# The Motion Playbook — how to give a surface motion

*Written 2026-10-06, after Home. It is the how-to that `docs/sangam-motion-plan.md`
argues for: the plan says what should move and why, this says how to build it so
that the other five routes reach the same depth without re-deciding anything.*

The reader's brief was *"animations placed in every aspect of the UI… like if we
have a clay pot, it should have some movement"*, and the thing that made the
previous three attempts feel vague was not the palette — it was that **one
surface in twenty-two moved**. Every rule in the plan is downstream of that: a
room feels alive when most of what is in it behaves like what it is made of.

---

## 1. Read this first: the five things you must not do

These are the ways this work has gone wrong before, and each one is now caught by
`npm run test:motion` rather than by a reviewer.

| Don't | Why | What catches it |
|---|---|---|
| Write a duration into a component | The tempo belongs to the landscape, not to the file you are editing. A second copy of "2.4 s" is a tuning session nobody can win. | `registers.ts` is the only place a beat exists; put the token in CSS or read the register |
| Write a particle count into a component | Counts are a promise to the battery. | `test-motion.mjs` asserts `PARTICLE_BUDGET` is the only source |
| Start your own `requestAnimationFrame` | A ceiling with a second door is not a ceiling. | The test asserts `src/motion/useMotion.ts` is the only starter in `src/` |
| Animate the couplet, or any text a reader reads | The verse is the one thing that must be still enough to read. | `.verse__line` may have no animation, no transition, no keyframe |
| Invent a motion with no reference | Motion in this app is an argument about the past; an unsourced loop is a modern flourish wearing a Tamil word. | The plan's §3 tables, and this file's register table |

---

## 2. The recipe — seven steps

Follow them in order. Each step is small, and every one of them has a worked
example in §6.

### Step 1 · Which register?

Ask *where am I* and *what is happening*. The route gives the base landscape, the
state overrides it, and the register answers with tempo, easing and amplitude:

```ts
import { registerFor, REGISTER_MOTION } from '../motion'

const register = registerFor(location.pathname, 'loading')  // → 'mullai'
const { beatSeconds, easing, amplitude } = REGISTER_MOTION[register]
```

| Register | Use it for | Beat | Easing token | Amplitude | Drum |
|---|---|---|---|---|---|
| **kurinji** | an arrival — the verse, a friend, an answer | 6.5 s | `--ease-spring` | 2 % | Veriyattupparai |
| **mullai** | waiting — loading, thinking, a reminder due later | 11 s | `--ease-out` | 1 % | Thontakapparai |
| **marutham** | browsing — lists, grids, filters, search | 8 s | `--ease-in-out` | 1.2 % | Erukot parai |
| **neytal** | sending away — recitation, share, an export | 14 s | `--ease-in-out` | 1.6 % | Nellari parai |
| **palai** | nothing to hold on to — empty, offline, error | 7 s | `linear` | 0.8 % | Valipparipparai |

Never choose by taste. If you cannot name the state, you have not decided what
the surface is *for* yet.

### Step 2 · Which rank is this thing?

Three ranks, and a surface gets exactly one of them:

1. **Hero** — at most one per route. It is the object the reader actually
   handles, it is WebGL, and it responds to pointer or data. (Home: the pot.
   Chapters: the kolam. Kural view: the leaf under the lamp.)
2. **Surface thing** — one per surface. CSS or Canvas 2D. It answers hover,
   focus, press or arrival. It never competes with the hero.
3. **Weather** — shared, ambient, ignorable. It is what makes the room
   inhabited, never what makes the reader look up.

### Step 3 · Which engine?

In this order, and stop at the first one that can do the job:

| Engine | Use when | Cost |
|---|---|---|
| **CSS keyframes** (`styles/ambient.css`) | loops, hovers, arrivals — anything with no state to keep | free, compositor-driven, and it is already gated by the kill switch |
| **SVG + CSS** | shapes that must stay crisp and themeable | free |
| **Canvas 2D** (`useMotionLoop`) | many particles, or a path that must be drawn per frame | one registry slot |
| **WebGL** (`materials/`) | only when *the object is the interaction*: it must hold liquid, turn, pour, or be lit | one scene per route, one tier gate |

Prefer CSS. It is the only engine that is free when it is off, and the only one
whose still state needs no code.

### Step 4 · Write the motion with a name and a source

CSS in `styles/ambient.css`, in the register's language, added to the file's
existing tables:

```css
/* Kurinji: the lamp catching. One beat, springy, upward — the veriyattam leap. */
@keyframes lamp-catch {
  from { transform: scale(0.86) translateY(2%); opacity: 0.4; }
  to   { transform: scale(1) translateY(0);     opacity: 1; }
}
.anim-lamp-catch { animation: lamp-catch 6.5s var(--ease-spring) both; }
```

Then register the loop if it is genuinely a loop: add it to `FAST_LOOPS` **only**
if it is faster than six seconds, and say why. A loop that translates or scales
under six seconds is a defect unless it is a written exception.

JavaScript loops go through the runtime — never a raw frame chain:

```ts
const { ref, inFrame } = useInFrame<HTMLCanvasElement>()
useMotionLoop('chapters-kolam', (time, delta) => { /* draw */ }, {
  enabled: verdict.moving && inFrame,
  fps: 30,
})
```

### Step 5 · Draw the still state

Every animated surface needs its end pose *written down as code*, not as a hope:

- **Reduced motion, high contrast, forced colours, save-data, flat reader** →
  the end state. The pot full, the lamp lit, the leaf flat, the list laid out.
- **A hidden tab and an open dialog** → the held frame; the runtime pauses the
  loop and nothing is repainted.
- **Print** → the end state, and no canvas at all.

The runtime's verdict tells you which of the two you are in — `still` versus
`paused` — and the test asserts the difference. Do not conflate them: pausing a
surface into its end state is a visible jump.

### Step 6 · Wire it to the reader

A moving thing that ignores the reader is wallpaper. Before you call a surface
done, answer: what does it do when the reader **hovers, focuses, presses, types,
scrolls past or returns**? The answer should be material — water ripples, cord
tightens, brass warms, clay sinks a millimetre — and it must finish inside
`INTERACTION_MAX_MS` (400 ms). The only things allowed to run longer are *state
transitions*: a pot being thrown, water being poured. Those are named in
`MATERIAL_EXCEPTION_MS` and checked against the scene's real constants by the
test, so the exception list cannot become folklore.

### Step 7 · Prove it

```bash
npx tsc --noEmit
npm run test:motion     # the contract for everything above
npm test                # the whole chain, including build and PWA
```

If your surface added a route, a door, a keyframe, a fast loop or a second
`data-motion` writer, the test will tell you. That is the point of it.

---

## 3. Where the pieces live

```
app/src/motion/          the runtime — the only home for motion policy
  budget.ts              particles, loops, floors, exceptions
  registers.ts           the five landscapes: tempo, easing, amplitude, drum, pann
  conditions.ts          the kill matrix, as one pure function
  loops.ts               the route's frame ceiling, refusing by name
  useMotion.ts           the hooks: verdict, register, loop, in-frame, suspend
  MotionProvider.tsx     puts data-motion / data-register on <html>
app/src/styles/ambient.css   every keyframe and every kill-switch block
app/src/lib/thinai.ts        feeling → landscape (doors), shared with the registers
app/src/materials/           the WebGL half: library, objects, scenes, tiers
app/scripts/test-motion.mjs  the contract
```

Two rules about imports: **views import `../motion`**, never a file inside it;
and **nothing under `materials/` reads a store** — the scene is handed its
numbers (`progress`, `ripple`, `forming`, `frozen`) and decides nothing about
policy.

---

## 4. The still points (non-negotiable)

1. The couplet's two lines never move. No transform, no reflow, no per-word
   animation, ever.
2. The support / crisis slip in Ask is deliberately motionless.
3. Motion never carries information alone — every animated object keeps its DOM
   label and its readable state.
4. Motion never crosses the reading column, and never sits behind text above
   0.3 alpha.
5. Every animation has an end state that a reader can reach without it.

---

## 5. The budget, in one table

| Concern | Number | Where |
|---|---|---|
| Particles per route | 60 | `PARTICLE_BUDGET.perRoute` |
| Global weather layer | 16 | `PARTICLE_BUDGET.atmosphere` |
| Dust in the lamp's beam | 36 | `PARTICLE_BUDGET.dust` |
| Frames per route | 4 = 1 WebGL + 3 idle | `LOOP_BUDGET`, enforced by `LoopRegistry` |
| Idle movement floor | 6 s | `IDLE_PERIOD_SECONDS_MIN` |
| Interaction ceiling | 400 ms | `INTERACTION_MAX_MS` |
| Material exceptions — state transitions, not responses | pot throw 3,500 ms · pour 2,400 ms | `MATERIAL_EXCEPTION_MS`, checked against `TableScene.tsx`'s own constants |
| Canvas dpr | ≤ 2 | already the case in every canvas |

When a surface needs more than its share, the answer is **not** to raise the
number: it is to make the surface cheaper, or to take the slot from something
quieter.

---

## 6. Worked example — Home, surface by surface

Home is the reference implementation. Every surface below is in the tree; read
the file, not a description of it.

| Surface | Rank | Engine | Register | What it does | Still state |
|---|---|---|---|---|---|
| Hero sky (cloud, mist, stars) | weather | CSS (`anim-sky`, `anim-mist`, `anim-twinkle`) | kurinji | drifts, twinkles | fixed gradient |
| Hero leaf canvas | surface | WebGL shader (`HeroScene`) | kurinji | fibres breathe (`uTime`) | frozen frame |
| Title திருக்குறள் | — | — | — | **never moves** | — |
| Table: the pot | hero | WebGL (`TableScene`) | marutham → kurinji | thrown while loading; water level = kurals read; one ring per kural | settled, full, flat |
| Table: the lamp | hero's companion | WebGL | mullai | the flame breathes and the oil line drops with the minute | steady flame, bowl shows the burn |
| Table: dust in the beam | weather | WebGL points | marutham | 36 motes, slow | still |
| Today's couplet | — | — | — | **never moves** | — |
| Sit with it (lamp timer) | surface | DOM + `lampBus` | mullai | start, cup, resume, snuff; the light is the state | lit or snuffed, legible |
| Journey card | surface | SVG + CSS | marutham | water level and streak, read from the same numbers as the pot | drawn at its level |
| Book tiles (3) | surface | CSS | marutham | hover lifts a bundle; its contact shadow separates | at rest |
| Situation doors (12) | surface ×12 | CSS `.door-weather[data-register]` | state's own | each door's landscape weather: petals, first rain, ripples, tide, shimmer | static tile |
| Toast / banners | surface | Framer Motion | by state | enter and exit | present |

---

## 7. The worksheet — the five remaining routes

In build order. Each row is a whole route, not a feature: the hero, the surfaces,
the weather, and the acceptance.

### 7.1 `/chapters` + search — register **marutham** (browse)

| Surface | Rank | What to build | Reference |
|---|---|---|---|
| Chapter map (133 lamps) | **hero** | A kolam of lamps; a visited chapter is a lit lamp whose flame flickers independently; selecting brings one to the centre | Tamil lamp tradition and the kolam floor; labelled as later-period in the plan §3.5 |
| Search tray | surface | Typing displaces river sand; clearing wipes it smooth; results rise out of the leaf stack | marutham's river sand |
| Recents | weather | Earlier impressions settle under the new strokes | — |
| Chapter list | surface | Rows are leaves in a stack; the list settles after a filter with paper-over-paper | leaf stacks |
| Infinite sentinel | surface | The next stack slides in with friction and a stop | — |
| Empty search | weather | `palai` — heat shimmer over a dry well, and the plain line that says nothing was found | palai |
| Acceptance | | All 133 lamps in their final lit/unlit state under reduced motion; one WebGL scene; sand and kolam each inside the particle budget; the list is still a list to a screen reader | |

### 7.2 `/kural/:number` — register **kurinji** (meeting the verse)

| Surface | Rank | What to build | Reference |
|---|---|---|---|
| The leaf under the lamp | **hero** | The single ola leaf, lit from above, fibre breathing; the lamp's light pools and sways | ola leaf; the measured minute |
| Prev / next | surface | The neighbouring leaf slides over with a slight rotation — direction is the book's order | leaf stack |
| Action row | surface | Each action is a tool on the table (stylus, cord, bowl); pressing sinks it a millimetre and it returns | iron stylus, cord |
| Listen | surface | The yazh string vibrates per line and the sangu rings and decays; the spoken line is lit as a lamp moves along it | yazh, kuzhal, sangu (neytal within a kurinji screen) |
| Acceptance | | The couplet stays frozen; the leaf's motion stops before it can distract from reading; the lamp's still state is a steady flame | |

### 7.3 `/ask` — register **mullai** (waiting), kurinji on arrival

| Surface | Rank | What to build | Reference |
|---|---|---|---|
| Niche lamp + hanging leaf screen | **hero** | Leaves stir in an unfelt draft; on `thinking` the lamp dims and the beat is held — no spinner anywhere | mullai, patient waiting |
| An answer arriving | surface | One springy beat, the new leaf slides out and lies flat | kurinji; veriyattam's arrival |
| Transcript turns | surface | Each turn is a leaf note pushed through the gap; the session becomes a growing bundle | ola leaves, the niche |
| The support / crisis slip | — | **Motionless.** Plain, bold, unmissable | the still points, §4 |
| Acceptance | | `thinking` is mullai and the arrival is kurinji, resolved through `registerFor`; the crisis slip has no animation of any kind and the test can see that it does not | |

### 7.4 `/saved` — register **marutham** (your keeping)

| Surface | Rank | What to build | Reference |
|---|---|---|---|
| The tied bundle | **hero** | Cords slacken, leaves fall open into the list; removing one visibly thins the bundle | tied leaf bundles |
| Empty shelf | weather | `palai` — an empty pot, its interior the black of unfired ware | black-and-red ware |
| Reflection notes | surface | Clay tablets with a drying state: today's gloss, last month's matte | wet and dry clay |
| Acceptance | | The bundle's end state is the open, correct-size bundle; no guilt mechanic anywhere near a missed day | |

### 7.5 `/credits` — register **mullai** (a record, held)

| Surface | Rank | What to build | Reference |
|---|---|---|---|
| The inscription | **hero** | Engraved stone under raking light; a chisel grain catches as you scroll | Tamil-Brahmi sherds, donor plaques |
| Dust in the beam | weather | Slow motes through the shaft of light — mullai's held, even beat | — |
| Share card | surface | The offscreen render is a photograph of the real object; the card leaves like a boat (`neytal`) | export as sending-away |
| Acceptance | | Names are readable at rest and in forced colours; the inscription's still state is a clean, still page | |

### 7.6 Chrome, in the same pass

Bottom nav (four objects instead of glyphs, a threshold transition between
rooms), command palette (a teak drawer on runners, brass plates that sink),
settings (a brass dimmer with detents, slips for verse layers), reminders (the
hour on a sundial arc; the lamp is set at that hour), toasts (a brass bell that
swings and whose ring decays), offline, update, empty and error states.
`INTERACTION_MAX_MS` governs all of them; Phase C of the plan is this list.

---

## 8. The review checklist

Before a motion change is done, every line must be yes, and most are mechanical:

- [ ] The register was chosen by state, not by taste, and is read from the runtime.
- [ ] The surface has exactly one rank, and the route still has one hero.
- [ ] No duration, particle count or frame rate is written outside `budget.ts`/`registers.ts`.
- [ ] Any loop goes through `useMotionLoop` and names itself.
- [ ] Any loop faster than six seconds is a written exception in `FAST_LOOPS`.
- [ ] The still state exists as code, and the reader can reach it (toggle, system setting, tier, print).
- [ ] `still` and `paused` are not conflated — a dialog holds the frame, it does not repaint it.
- [ ] The couplet is untouched, and nothing moves across the reading column.
- [ ] There is a DOM label and a readable state for every animated object.
- [ ] `npx tsc --noEmit`, `npm run test:motion` and `npm test` are green.

---

## 9. Why this is a playbook and not five PRs

Because the failure this document exists to prevent is *drift*: six routes each
inventing their own timings, their own particle counts and their own idea of what
"reduced motion" means, until the app has six motion languages and no grammar.
Home was built first and deep so that the grammar is demonstrated rather than
described — and so that every route after it is a matter of choosing a register,
picking a rank and writing the still state, with `npm run test:motion` holding
the line.
