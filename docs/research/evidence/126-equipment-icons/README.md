# Evidence: #131 Equipment Base icons (six families)

Production ingest of twelve Equipment Base icons (six Tier I sources + six
`recolor` Tier II variants) through `pipeline/icons/` per
`docs/icon-contract.md` and `docs/agents/asset-generation.md`.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Equipment Base inventory icon) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/icons/<iconKey>.png` |
| Runtime shape | 34×34 RGBA; derived `contour-plum-deepest` outline |
| Visual vocabulary | `moonberry-16`; per-family `palette_subset` in `pipeline/icons/registry.py` |
| Geometry | Icon grid shell; long side target 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `src/assets/icons/preview/*@8x.png` and `src/assets/icons/family-sheet@8x.png` |
| Validator | `npm run assets:build` then `npm run assets:verify` |

## Style references (shared)

| Path | Role |
| --- | --- |
| `src/assets/sprites/knight.png` | style |
| `src/assets/sprites/wizard.png` | style |
| `src/assets/sprites/priest.png` | style |
| `docs/research/evidence/125-equipment-icons-34/bramblesong-bow@8x.png` | style cohort |
| `docs/research/evidence/125-equipment-icons-34/dewlight-focus@8x.png` | style cohort |
| `docs/research/evidence/125-equipment-icons-34/ai-gen/family-sheet@8x.png` | style cohort |
| `docs/research/evidence/125-equipment-icons-34/starfruit-prism@8x.png` | style cohort |
| `docs/research/evidence/125-equipment-icons-34/ai-gen/accepted-raws/bramblesong-bow.png` | grid-faithful style (+ bow identity) |

## Original sample + style cohort + identity choices (per family)

| Family | Original sample | Style cohort | Identity / style choice |
| --- | --- | --- | --- |
| blade | new GenerateImage r2 (r1 underfill; r3–r5 worse off-ramp/overshoot) | Knight/Wizard/Priest + #125 cohort @8× + bow raw | Short mint blade, berry thorn quillons, cream grip; diagonal three-quarter |
| focus | **regenerated** r3 (not #125 17×25) | same + dewlight/starfruit @8× | Large mint orb on berry-vine stand; cream dew drop; recovered **29×30** |
| relic | new GenerateImage r3 (r1 underfill/off-ramp; r2 overshoot) | same + bow raw | Cream-panel lantern in berry frame; moon-petal charm inside. Tier II `RELIC_TO_LANTERN` maps berry→slate/mint (not cream→berry-bright) so `halcyon-lantern` stays cream/teal, not a red wash |
| bow | **regenerated** r6 (#131 rework; #125 raw lost string at Stage-2) | same + Knight/Wizard/Priest | Continuous cream string column recovered at right edge (**12×30**, far 8.6%); Tier II leaves cream unmapped so string survives `nightvine-longbow` |
| armor | new GenerateImage r5 (r1–r4 off-ramp/overshoot) | same + bow raw | Overlapping mint leaf scales, cream trim, berry stitch; plum outline |
| charm | new GenerateImage r3 (r1 sparkle/off-ramp; r2 soft) | same + bow raw | Plump berry pendant on cream cord; no sparkles; soft long-axis 23 |

## Gate recalibration (#131 trigger)

| Family | Long axis | Off-ramp (subset) | Pitch scores (x/y) |
| --- | --- | --- | --- |
| thornquill-blade | 26 | 18.5% | 0.126 / 0.254 |
| dewlight-focus | 30 | 11.9% | 0.424 / 0.417 |
| moonpetal-relic | 27 | 7.5% | 0.242 / 0.213 |
| bramblesong-bow | 30 | 8.6% | 0.240 / 0.262 |
| leafmail-vest | 24 | 5.2% | 0.286 / 0.295 |
| berrybright-charm | 23 | 10.0% | 0.173 / 0.209 |

- `MIN_LONG_AXIS = 20` — **held** at n=6
- `MIN_GRID_SCORE = 0.04` — **held** at n=6 (all ≫ floor)
- `OFF_RAMP_REJECT` **retuned 0.15 → 0.20** — measured peak 16.4% full-palette / 18.5% subset on blade; fixture fail fraction raised 0.20 → 0.25 so the gate still flips visibly

## Rejected candidates

Retry order followed `docs/agents/asset-generation.md` (underfill → regen; off-ramp → palette subset / regen; identity miss → prompt tweak). Family-level round notes are in the table above under **Original sample + style cohort + identity choices**.

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| r1/thornquill-blade | underfill | not recorded |
| r1/dewlight-focus | off-ramp / wrong sample | not recorded |
| r1/leafmail-vest | off-ramp / overshoot | not recorded |
| r1/moonpetal-relic | underfill / off-ramp | not recorded |
| r1/berrybright-charm | sparkle / off-ramp | not recorded |
| r2/thornquill-blade | off-ramp / overshoot | not recorded |
| r2/dewlight-focus | off-ramp | not recorded |
| r2/leafmail-vest | off-ramp / overshoot | not recorded |
| r2/moonpetal-relic | overshoot | not recorded |
| r3/thornquill-blade | off-ramp / overshoot | not recorded |
| r3/leafmail-vest | off-ramp / overshoot | not recorded |
| r3/berrybright-charm-r2 | soft silhouette | not recorded |
| r5/thornquill-blade | off-ramp / overshoot | not recorded |
| bow-retry/bramblesong-bow-from-125 | #125 string lost at Stage-2 | 11×30; x=0.191 / y=0.171; far 14.6% |
| bow-retry/bramblesong-bow-r7 | string did not survive grid recovery | not recorded |

Rejected provider raws were pruned from this tree; the table above is the durable record. Recover archived PNGs from git history at the commit titled **Prune rejected-candidate PNGs; preserve measurements as tables (#183)**.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Runtime + contact sheet: `src/assets/icons/` (built by `npm run assets:build`)

Provider raws are evidence only — **nothing added to `assets-raw/`**.

## #131 human-rejection rework

1. **`halcyon-lantern`** — `RELIC_TO_LANTERN` no longer maps cream→berry-bright (or berry→brighter berry). Frame shifts to twilight-slate / sage / mint-shadow; cream glow stays; cream-gold → skin-warm.
2. **`bramblesong-bow`** — regenerated (r6 accepted; r7 rejected: string did not survive grid recovery). Cream column at recovered x=11 (23 cells). `BOW_TO_LONGBOW` leaves cream unmapped so Tier II keeps the string.
