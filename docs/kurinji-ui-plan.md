# UI Theme Plan — **Kurinji**: reading the *Tamil Kalyanam Hits* cover through Sangam research

*Supersedes `docs/kalyanam-ui-plan.md` (deleted). Reference: the Apple Music cover at
<https://music.apple.com/sg/playlist/tamil-kalyanam-hits/pl.5e89c02ba15242b5a78e9cde996e9de4>
(consulted as direction only — **no Apple artwork is copied into this repo**).*

---

## 1. Analysis of the cover

### 1.1 Composition
- **Square editorial frame.** Title top-left in a quiet grotesque; Apple Music mark
  top-right. Typography stays silent; the image does the speaking.
- **One figure, seen from behind**, cropped mid-back. We are *witnesses* to a
  ceremony, never confronted by it — dignity through distance.
- **A strong vertical gold axis**: the braid (*jada*) dressed in *jada billai* —
  stacked gold plaques descending from a round **surya/chandra medallion** at the
  crown. This column is the cover’s spine; everything else hangs off it.
- **~50 % of the frame is open cerulean sky** with soft cloud. The cover *breathes*;
  festivity is carried by a few objects, not by density.
- **Red petals drift diagonally** through the air — the only motion cue, gentle,
  blessing-like.

### 1.2 Palette (sampled impressions)
| Role | Approx. | Feeling |
|---|---|---|
| Sky cerulean | `#5fb2dc → #a8d8ef` | auspicious daylight, openness |
| Cloud white | `#f2f9fd` | breathing room |
| Kanjeevaram / petal red | `#a41e22 / #c0392b` | celebration, the wedding itself |
| Temple gold | `#c9971c → #e6b93f` | jewellery as the protagonist |
| Hair black | `#17110c` | the darkest anchor |

### 1.3 Ornament grammar
- **Jada billai cascade** — one plaque shape, repeated vertically, rhythm without
  clutter. Rooted in **Chola-era temple tradition**; the crown medallion is the
  **surya-pirai / chandra-pirai** (sun and moon) pair of Tamil bridal head-dress
  ([Jewellery of Tamil Nadu](https://grokipedia.com/page/Jewellery_of_Tamil_Nadu)).
- **Zari border** — geometric gold woven on red silk; a *patterned edge*, not a line.
- **Garland halo** — red bloom ring around the head; circular celebration.

### 1.4 Mood
Ceremonial but **calm**. Bright, not lamp-lit. Festive objects on a quiet field.
This is exactly the register this app already works in — quiet reader, loud
heritage — which is why the cover translates so well.

---

## 2. The core intention, and its Sangam anchor

The intention is **not** “wedding photo as UI”. It is: bring the cover’s
*ceremonial vividness* — open sky, red celebration, a vertical gold ornament spine,
drifting petals, dignified quiet — into a theme whose authority comes from
**Sangam-era research**, consistent with this repo’s existing Sangam work
(Sangam-clay theme, palm-leaf materials).

The Sangam *thinai* system gives us the exact anchor
([Sangam landscape, Wikipedia](https://en.wikipedia.org/wiki/Sangam_landscape)):

> **Kuṟiñci (குறிஞ்சி)** — the mountain landscape — is *the* thinai of **union**,
> i.e. of marriage itself. Its signifiers: the red **kantal/kurinji flower**,
> **Seyon-Murugan** who rides the **peacock** and wears the red flower,
> **waterfalls**, honey-gold, bamboo, and **red-and-black mountain soil**.

A Tamil *kalyanam* rendered in Sangam terms **is kurinji**. So the new theme is
named **Kurinji**, and every cover element is re-derived from kurinji signifiers
rather than from the photograph:

| Cover element | Sangam signifier | UI translation |
|---|---|---|
| Open cerulean sky (half the frame) | kurinji sky over the hills; generous negative space | **Kurinji is a bright, sky-grounded theme** — a third theme beside Palm-Leaf Day / Sangam Night; hero stage = sky gradient + far hill silhouette |
| Braid + jada billai vertical axis | Chola-rooted bridal gold; plaque rhythm | **“Billa spine”**: a vertical SVG ornament axis on the Today card / Journey progress (one plaque per milestone) |
| Surya/chandra crown medallion | sun-moon pirai | the kural-number seal becomes a gold **sun-moon medallion** in this theme |
| Kanjeevaram red + zari edge | kantal red; red-black hill soil; woven gold | red = celebration accent (marks, saved state); **zari pattern border** (2–3 px SVG) on cards |
| Drifting red petals | flower-strewn union in akam poetry | **petal drift** in the hero + on “another kural” swap (particle cap ≤ 40; killed by reduced motion / high contrast) |
| Figure from behind | akam’s witnessed, never-confronted heroine | no faces, no figurative art; ornament and landscape carry the festivity; the reader stays a quiet witness |
| Silent editorial type | — | typography unchanged; ornament is the subject, verse stays loudest |

---

## 3. Kurinji theme tokens (draft — CI-verified before ship)

Kurinji is deliberately **bright**, distinct from parchment (palm) and near-black
(night): a sky theme. Every pair re-checked by `app/scripts/test-tokens.mjs`.

```css
[data-theme="kurinji"] {
  --bg-base:      #edf6fb;  /* cloud-sky            */
  --bg-surface:   #dceef7;  /* deeper sky           */
  --bg-elevated:  rgba(255,255,255,.78);
  --ink-primary:  #0f1c26;  /* ≈15:1 on base        */
  --ink-secondary:#35505f;  /* ≈7.4:1 on base       */
  --accent:       #c9971c;  /* temple gold — lines/fills/ornament ONLY */
  --accent-text:  #7a5a10;  /* dark ochre gold, text-safe ≈6:1         */
  --kantal:       #9c2024;  /* text-safe celebration red ≈7:1          */
  --kantal-fill:  #b3242a;  /* fills, petals, saved state              */
  --peacock:      #1f6f74;  /* secondary accent, links (≈5.5:1)        */
  --hero-tint-a:  #a8d8ef;  /* sky      */
  --hero-tint-b:  #5fb2dc;  /* cerulean */
  --hero-tint-c:  #27506b;  /* far hill */
  --stage-room:   linear-gradient(180deg,#8ecdea 0%,#cfeaf7 62%,#eef7fc 100%);
}
```

Gold never carries small text (the cover teaches this: gold is *object*, sky is
*field*). High-contrast / forced-colours overrides keep working — they address
roles, not values.

## 4. Ornament kit (original SVG, ≤ 8 KB gz total)

1. **Billa plaque** — one shield-shaped plaque, repeated as the vertical spine and
   as horizontal section dividers (the cover’s rhythm).
2. **Surya-chandra medallion** — round seal with sun-ray + moon-crescent halves;
   hosts the kural number in the Today card.
3. **Zari border pattern** — 3 px gold-on-red geometric strip for card top edges.
4. **Hill-and-sky hero scene** — retints the existing shader stage: sky gradient,
   one far silhouette, soft light; the sealed leaf now sits *under open sky*.
5. **Petal particles** — crimson 6–10 px shapes, canvas layer, honouring
   `data-motion="reduced"` and `prefers-reduced-motion`.

## 5. Confirmed decisions (2026-10-06, with the reader)

1. **Two modes only.** Kurinji Day + Kurinji Night *replace* Palm-Leaf Day /
   Sangam Night; “Follow system” auto-picks between the two.
2. **The “gif effect” everywhere.** The cover’s animation is rebuilt natively
   (petals by day, fireflies at midnight, cloud drift, star twinkle, gold glint)
   across every view — never literal GIF files — silenced by the OS and in-app
   reduce-motion toggles, removed under high contrast / forced colours.
3. **Night = Midnight Kurinji.** The Sangam-canonical midnight of union: indigo
   starlit sky, dewy cool blues, glowing gold ornament.

## 6. Phasing (PR-sized, matching repo history)

1. **Phase 1 — tokens**: `[data-theme="kurinji"]` + ThemeSwitcher entry + CI
   contrast coverage. Zero component changes.
2. **Phase 2 — ornament kit**: billa spine on Today/Journey, zari edges, medallion.
3. **Phase 3 — sky stage + petals**: hero shader retint + drift micro-interaction.
4. **Phase 4 — share card**: a “kurinji union” share variant — sky ground, zari
   frame, medallion seal (canvas, fonts already local).

Default theme remains unchanged; Kurinji is opt-in like night.

## 7. Guardrails (unchanged from house rules)

- WCAG 2.2 AA pairs enforced in CI; gold is never small text.
- Reduced motion / high contrast / forced colours neutralise petals, shimmer, sky
  parallax.
- **No copied artwork** — the cover is consulted, never reproduced; ornaments are
  original vectors (as in `docs/ui-ux-proposal.md` §2.1).
- No new runtime dependencies; PWA stays fully offline.
- Verse content untouched; content-check CI still green.

## 8. Implementation status — shipped in this branch

All four phases implemented at once, per the confirmed decisions:

| Item | Where |
|---|---|
| Kurinji Day / Night tokens (WCAG-verified) | `app/src/styles/tokens.css`, gate in `app/scripts/test-tokens.mjs` |
| Two-mode switcher + system follow | `ThemeSwitcher`, `SettingsSheet`, `CommandPalette`, `lib/preferences.ts` |
| Atmosphere canvas (petals / fireflies) | `app/src/components/ambient/Atmosphere.tsx`, mounted in `App.tsx` |
| Ornament kit (zari, billa, surya/chandra) | `app/src/components/ambient/ornaments.tsx` |
| Motion grammar + kill-switches | `app/src/styles/ambient.css` |
| Sky / star life in the hero, zari edge | `views/Home.tsx` |
| Medallion + zari on the Today card | `components/today/TodayKuralCard.tsx` |
| Billa spine progress on the journey | `components/journey/JourneyCard.tsx` |
| Dividers on every view | `Chapters`, `Saved`, `AskValluvar`, `Credits`, `KuralView` |
| Kurinji share card (day/night aware) | `lib/shareCard.ts` |

Verification: `npm test` fully green (tokens, content, a11y/render, materials,
build, PWA contract). Live preview served from `app/` on port 5173.

## 9. References

- Cover (direction only): Apple Music, *Tamil Kalyanam Hits*.
- Thinai system & kurinji = union: [Sangam landscape](https://en.wikipedia.org/wiki/Sangam_landscape).
- Jada billai / surya-chandra pirai, Chola temple roots:
  [Jewellery of Tamil Nadu](https://grokipedia.com/page/Jewellery_of_Tamil_Nadu).
- House design doctrine: `docs/ui-ux-proposal.md`, `docs/reality-first-ui.md`.
