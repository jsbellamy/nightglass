# Evidence: #305 Knight Talent icons

First Class batch of authored Talent / Ability Talent skill icons for the
Management Dock Talent Tree chrome cells. Four one-variant families under the
Equipment icon pipeline geometry (CANVAS 34 / DRAWABLE 32); no Tier II recolor.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Talent / Ability Talent skill glyph) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/icons/<iconKey>.png` |
| Runtime shape | 34×34 RGBA; derived `contour-plum-deepest` outline |
| Visual vocabulary | `moonberry-16`; per-family `palette_subset` in `pipeline/icons/registry.py` |
| Geometry | Icon grid shell; long side target 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `knight-talent-sheet@8x.png` and `src/assets/icons/preview/<iconKey>@8x.png` |
| Validator | targeted ingest + `npm run assets:build`; CI `assets` job for full-catalog byte-identity |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/plumweave-aegis.png` | style cohort |
| `src/assets/icons/thornquill-blade.png` | style cohort |
| `src/assets/icons/berrybright-charm.png` | style cohort |
| `src/assets/icons/family-sheet@8x.png` | style cohort |
| `src/assets/sprites/knight.png` | style reference |
| `src/assets/sprites/wizard.png` | style reference |
| `src/assets/sprites/priest.png` | style reference |

## Original sample + style cohort + identity choices

| iconKey | Original sample (SUBJECT) | Style cohort | Identity / style choice |
| --- | --- | --- | --- |
| `fortitude` | thick upright kite shield of mint plates with a berry boss rivet and cream rim | Equipment @8× cohort + Knight/Wizard/Priest | Resting upright mint kite; cream rim; single berry boss. Accepted **r2** (r1 underfill preference at 15×23). Recovered **22×28**. |
| `swordcraft` | two crossed short mint-steel blades with cream grips and berry thorn crossguards | same | Crossed mint blades, cream grips, berry thorn guards. Accepted **r1**. Recovered **27×28**, far 0%. |
| `hold-the-line` | braced mint kite shield planted low with berry studs, reading as a shield-wall fragment | same | Planted/low braced mint kite with berry studs — distinguishable from upright `fortitude`. Accepted **r1**. Recovered **23×28**. |
| `falling-star` | descending cream-gold star-blade slash glyph with a short berry spark trail | same + `swordcraft-r1` grid-faithful style | Cream-gold star tip + solid berry trail blocks (not sparkle particles). Accepted **r5** after underfill/overshoot oscillation. Recovered **22×23**, far 0%. |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| fortitude-r1 | icon | pass | none | 15×23 | advance (preference thin) | prefer larger |
| fortitude-r2 | icon | pass | none | 22×28; far 5.7% | advance | accept |
| swordcraft-r1 | icon | pass | none | 27×28; far 0% | advance | accept |
| hold-the-line-r1 | icon | pass | none | 23×28; far 12.3% | advance | accept |
| falling-star-r1 | icon | fail | none | long axis 19 | underfill | enlarge |
| falling-star-r2 | icon | fail | none | 31×32 | overshoot | shrink + clearance |
| falling-star-r3 | icon | fail | none | 32×31 | overshoot | shrink more |
| falling-star-r4 | icon | fail | none | long axis 19 | underfill | mid-size + style ref |
| falling-star-r5 | icon | pass | none | 22×23; far 0% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| fortitude-r1 | preference underfill (gate-pass) | 15×23; superseded by r2 |
| falling-star-r1 | underfill | long axis 19 |
| falling-star-r2 | overshoot | 31×32 |
| falling-star-r3 | overshoot | 32×31 |
| falling-star-r4 | underfill | long axis 19 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`knight-talent-sheet@8x.png`](./knight-talent-sheet@8x.png)
(left→right: fortitude | swordcraft | hold-the-line | falling-star).

Subagent verdict: **accept**. All four match identity, read as skill glyphs
(not Equipment Bases), are distinguishable at a glance (upright boss shield vs
studded braced shield vs crossed blades vs diagonal star-slash). No blocking
defects. Note: fortitude mint reads slightly stronger on the rim than the
plates versus the written brief; resting-shield read remains unambiguous.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Knight-only review sheet: [`knight-talent-sheet@8x.png`](./knight-talent-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Runtime + full family contact sheet: `src/assets/icons/` (built by `npm run assets:build`)
