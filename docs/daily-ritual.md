# The daily ritual · நாள்தோறும்

**Status:** shipped (this branch) · **Feature flag:** none — on by default, off in one tap
**Code:** `src/lib/dayKey.ts`, `src/lib/ritual.ts`, `src/lib/reminder.ts`,
`src/components/today/{DailyRitual,SealedLeaf,SitTimer}.tsx`
**Tests:** `npm run test:ritual` (85 checks) + 12 new render/a11y checks — both wired into `npm test`

---

## 1. The idea

The reader already had a reason to visit (today's couplet) and reasons to stay
(save, share, ask). What it did not have was a reason to **come back tomorrow**.

The ritual is that reason. Today's couplet arrives sealed behind a rolled palm
leaf. Opening it is one deliberate act, once a day; below it sits a minute of
quiet. Everything about it is designed to be *pulled*, never pushed:

| The app may… | The app may never… |
|---|---|
| greet you with a sealed leaf | hide the couplet behind a paywall of attention |
| remind you at an hour you chose | nag, re-notify, or count a broken streak |
| offer a minute of quiet | score you, rank you, or tell you that you missed a day |
| re-seal the leaf if you ask | re-seal it on its own |

---

## 2. What the reader sees

**Sealed.** A rolled ola leaf, drawn in CSS and SVG, with a wax seal carrying
the kural number in Tamil numerals (`௧௫௧`). Two ways in: the leaf itself, and
*“Open without the ceremony”* beneath it.

**Opened.** The couplet unrolls (or appears instantly, with reduced motion or
via *“without the ceremony”*). Focus moves to the revealed couplet so a keyboard
or screen-reader reader is not dropped at the top of the page.

**The quiet minute.** A one-, two- or three-minute timer under the couplet.
Finishing it records *sitting* — a different act from *reading*, which is
recorded on arrival.

**Re-seal.** In Reading settings, while today's leaf is already open:
*“Seal today's leaf again.”* For the reader who opened it on the train and wants
to arrive at it properly in the evening.

---

## 3. Storage

```
localStorage  tamil-stoic-ritual-v1
{
  seal: boolean,                 // the ceremony on/off
  unrolled: { "2026-10-04": true },   // days opened
  sat:      { "2026-10-04": true },   // days sat with
  reminder: { enabled: boolean, hour: 0-23, minute: 0-59 }
}
```

A separate key from the reading journey (`tamil-stoic-journey-v1`) and saved
kurals (IndexedDB `tamil-stoic-reader`), so the ritual can never corrupt either.
Reads are defensive: unknown keys are dropped, out-of-range hours are clamped,
corrupt JSON falls back to a fresh state, and a denied `localStorage` (private
browsing) leaves the app fully working with in-memory state only.

### Day boundaries are local — this was a bug

Day keys were previously derived from `toISOString()`, which is **UTC**. For a
reader in Chennai (UTC+5:30) that is the wrong day for five and a half hours of
every day: at 00:30 on 4 October the old code said `2026-10-03`.

It barely mattered when day keys only fed a streak counter. It matters now that
they decide whether the leaf is sealed — with a UTC key the seal can lift a day
early or refuse to lift at all.

`src/lib/dayKey.ts` is now the single source of truth for “today”, built from
the date's own calendar fields. `localDayKey()`, `shiftDayKey()`,
`daysBetweenKeys()` and `minutesIntoDay()` are all local, all pure, and the
reading journey's `last` key was migrated to the same helper.

> **One-time effect:** a reader who last opened the app between midnight and
> 05:30 IST may see their streak shift by one, once, when they first load this
> version. The days themselves were never wrong — only the label on them.

---

## 4. The reminder: what a local-only app can honestly promise

There is no server, no push subscription and no account. Nothing about a
reader's habits leaves the device. That is a deliberate constraint, and it sets
a ceiling on scheduling, so the app is precise about what will actually happen.

**Three paths, in order of reliability:**

1. **OS-level alarm** — the [Notification Triggers][triggers] API
   (`showTrigger: TimestampTrigger`), where the browser supports it. Survives the
   app being closed. This is the real thing a reader wants.
2. **In-session timer** — a `setTimeout` that fires while the app is open or
   backgrounded. Does **not** survive the tab being killed.
3. **The quiet greeting** — no permission, no notification, no API. The sealed
   leaf is simply waiting on the home screen, and if the reader enabled a
   reminder hour and is past it, the leaf says so in one plain sentence.

Path 3 is the one that works everywhere — on iOS, wherever notifications are
denied, wherever the Triggers API is absent — so it is the one the UI leans on.
Paths 1 and 2 are upgrades layered on top, never requirements.

Permission is requested **only** from *“Allow notifications on this device”* in
Reading settings. Never on load, never as a side effect of turning the reminder
on. A denial is a valid answer that changes nothing else.

The reminder body says the leaf is waiting. It **never quotes the couplet** —
that would undo the one thing the seal is for.

[triggers]: https://developer.chrome.com/docs/capabilities/web-apis/notification-triggers

---

## 5. Accessibility

- The sealed leaf is one `<button>` with `aria-expanded` and `aria-controls`
  pointing at the revealed couplet; a `sr-only` sentence describes the action.
- Opening moves focus to the revealed region (`tabIndex={-1}`), because the
  button that opened it no longer exists.
- Whole-day targets clear 44 px; the “without the ceremony” link is a full
  44 px-high button, not a bare text node.
- Every animation is gated on `useReducedMotion()` (OS preference **or** the
  in-app toggle). With reduced motion the leaf simply appears.
- The timer's ring uses `stroke-dashoffset` and never pulses; its remaining time
  is exposed as an image label, and completion is announced through a polite
  live region.
- The wax seal's numeral uses `var(--on-accent)` on `var(--accent)` — one of the
  pairs `test-tokens.mjs` measures in CI.
- Full Tamil interface via `src/i18n/ta.ts`; English strings stay at the call
  sites, per the repo's convention.

---

## 6. Tests

`npm run test:ritual` runs on Node's type stripping against the exact modules
the app ships — no fixtures, no build step. 85 checks:

- **Day keys** — local vs UTC (the regression is asserted directly when the
  machine is east of UTC; `TZ=Asia/Kolkata npm run test:ritual` proves it),
  month/year/leap boundaries, malformed input.
- **Storage** — defaults, clamping, corrupt JSON, wrong types, denied
  `localStorage`, and a headless import with no `window` at all.
- **State machine** — sealed → opened → re-sealed, idempotence, per-day
  isolation, streak counting back to the last gap, and a bounded walk so a
  two-year history cannot hang the app.
- **Reminder arithmetic** — today vs tomorrow, the exact-hour boundary, and that
  every offered hour schedules a genuinely future moment.

`test:render.mjs` adds twelve checks that drive the real thing in jsdom: the
sealed leaf is present on a fresh device, the couplet is absent while sealed,
the ceremony can be skipped, opening renders the couplet on two Tamil lines, the
leaf is gone afterwards, **focus lands on the revealed couplet**, and the quiet
minute is offered beneath it.

### Two bugs this work surfaced

1. **UTC day keys** (§3) — the seal could lift a day early east of Greenwich.
2. **The onboarding dialog never closed.** It rendered `<Dialog.Root open>`
   unconditionally and returned `null` once onboarding completed, so an *open*
   Radix dialog was yanked out of the tree without running its cleanup. It is
   now properly controlled (`open={!onboarded}`). The render suite had been
   masking this by never dismissing the tour; axe now scans the real page behind
   it on every route.

---

## 7. Deliberately not built

- **Streaks that break.** `satStreak` only counts. Nothing in the UI reports a
  broken chain, because a missed day is a day, not a failure.
- **A nudge to enable notifications.** The offer appears once in settings, where
  a reader goes looking for it, and nowhere else.
- **Any record of *when* in the day you opened the leaf.** Only the day is
  stored. The app does not need to know you read at 3am.
- **Server-side scheduling.** The storage adapter was built so sync *could* be
  added later; doing so would cost the “nothing leaves this device” promise that
  is currently the app's best feature.

## 8. Next, if this earns it

Most likely to matter, in order: the **ten-day paths** (பத்து நாள் பயணம் —
making this a practice rather than a reader), **spaced recall of saved kurals**
(the saved list is currently a place things go, not a place they return from),
and **Ask remembers** (turning the most-used feature into a conversation). See
the brainstorm this came from in the PR description.
