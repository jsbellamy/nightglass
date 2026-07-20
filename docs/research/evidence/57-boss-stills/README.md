# #57 Boss stills — Gloomcap Matron + Thornmother Vane

## Accepted

| Runtime | Candidate | Recovered grid | Baseline | Notes |
| --- | --- | --- | --- | --- |
| `boss-2.png` (Gloomcap Matron) | `boss-2-g` | 29×43 | 47 | Wide mushroom matriarch; Pipcap kinship |
| `boss-3.png` (Thornmother Vane) | `boss-3-c` | 21×40 | 47 | Tall sharp vertical thorn-queen; under target width 26 but distinct vs Matron/Bramblehorn |

Archived raws: `assets-raw/grid_raw/boss-2.png`, `boss-3.png` + sidecars.
Issue prompts stored verbatim (flattened) in the sidecars.

## 1× review

- `LINEUP_3x_boss_1x.png` — three Bosses on a 480×112 tile band at native 1×
- `LINEUP_strip_1x.png` — tight 1× contact strip

**Agent accept (silhouette):** Bramblehorn (crouched vine beast) ≠ Matron (wide heavy mushroom) ≠ Vane (tall thin vertical). Style matches cohort `moonberry-16` chunky blocks.

## Rejected candidates

| Candidate | Primary failure |
| --- | --- |
| boss-2-a | clip-fail (left) + overshoot 33×45 |
| boss-2-b | clip-fail (left); near-magenta pigment punched feet (baseline 35) |
| boss-2-c | clip-fail (stray corner) + pitch-fail |
| boss-2-d | clip-fail (single bottom-left near-magenta corner pixel) |
| boss-2-e | ACCEPT alternate (29×44); superseded by clearer Matron read in g |
| boss-2-f | clip-fail (stray corner) + pitch-fail |
| boss-3-a | ACCEPT alternate (25×48); softer gown identity vs thorn-queen target |
| boss-3-b | clip-fail (top/left stray) |
| boss-3-d | clip-fail (stray corner); recovered 26×42 before reject |
| boss-3-e | clip-fail (stray corner); recovered 27×45 before reject |
| boss-3-f | ACCEPT alternate (20×40); more underfilled than c |

Recurring clip-fail pattern: a single bottom-left corner pixel near `#ff00ff` outside key tolerance 40, not true subject overshoot.
