# Design language — "Vāsal" (வாசல்) · the dawn kolam threshold

Status: **approved direction** (chosen from concept images on 2026-10-07).
Reference image: `design/home-concept-kolam.jpg` (full-res PNG kept locally, git-ignored).
Supersedes, for new work, the earlier Sangam-clay / Kurinji cover looks wherever they conflict.

## The one-line intent
The app should feel like stepping up to a Tamil home's threshold at dawn:
a freshly drawn white kolam on a red-oxide floor, first light just arriving.
Domestic and living — never museum, never parchment.

## Hard rules (what made this direction right)
1. **The canvas is red-oxide earth (மண்ணீடு / manai red).** Never brown, tan,
   parchment, black, or paper-white backgrounds.
2. **Kolam line-work is structure, not decoration.** Frames, rings, dividers and
   tile borders are drawn as white rice-flour kolam geometry (looping lines on
   dot grids). If a kolam element does not hold or frame content, remove it.
3. **One light source: dawn.** A soft marigold glow from the top edge is the only
   warm accent. No lamp props, no bronze, no gold leaf, no flames.
4. **Tamil script is the hero ornament.** The couplet / heading sets large in a
   Tamil serif (Noto Serif Tamil, already self-hosted), in rice-white, centred
   inside its kolam frame. English/Inter stays small and quiet, meta-only.
5. **Calm density.** Generous breathing room; at most one framed hero + one row
   of kolam-ringed circular destinations per screen.

## Tokens (sampled from the approved concept)
| Token | Value | Use |
|---|---|---|
| `--vasal-floor-mid` | `#8A2E1B` | base red-oxide background |
| `--vasal-floor-deep` | `#832A1A` | shadowed edges / vignette |
| `--vasal-floor-lit` | `#BB4E33` | light-struck areas, raised panels |
| `--vasal-floor-low` | `#99331F` | mid shading, gradients |
| `--vasal-dawn` | `#D8903B` | single dawn glow accent (top edge only) |
| `--vasal-flour` | `#F7F1E6` | kolam line-work, primary text |
| `--vasal-flour-dim` | `rgba(247,241,230,0.72)` | secondary text, quiet labels |

Typography: Noto Serif Tamil for all Tamil; Inter only for small Latin meta.
Line texture: faint horizontal earth grain + a single raking diagonal light
band from the top-left, exactly like the concept.

## Home screen recipe (as approved)
1. Full-bleed red-oxide field, diagonal dawn light, top-centre glow.
2. One central octagon-in-square kolam frame holding "இன்றைய குறள்" label,
   then the couplet in large rice-white Tamil serif.
3. Three kolam-ringed circular destinations (முகப்பு / தேடல் / அமைப்பு style),
   white loop ornament rings, Tamil labels beneath.
4. A small kolam motif anchoring the bottom edge.

## Extending to other screens
Derive, don't re-invent: same floor, same flour, same one-glow rule.
Kural detail = the couplet's kolam frame grows, gloss and tools sit in smaller
kolam tiles below. Chapters/browsing = a grid of kolam-ringed doors (as the
Situation doors already are conceptually), never cards with drop shadows.
Dark variant, if ever needed = the same red floor under night shadow
(deeper `#5E1E12`), flour unchanged — never switch to black.
