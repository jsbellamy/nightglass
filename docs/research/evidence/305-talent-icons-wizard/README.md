# Evidence: #309 Wizard Talent icons

Second Class batch of authored Talent / Ability Talent skill icons for the
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
| Review context | `wizard-talent-sheet@8x.png` and `src/assets/icons/preview/<iconKey>@8x.png` |
| Validator | targeted ingest + `python3 pipeline/icons/build.py`; CI `assets` job for full-catalog byte-identity |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `docs/research/evidence/305-talent-icons-knight/knight-talent-sheet@8x.png` | style cohort (Knight talent batch) |
| `src/assets/icons/fortitude.png` | style cohort |
| `src/assets/icons/swordcraft.png` | style cohort |
| `src/assets/icons/starfruit-prism.png` | style cohort (Equipment peer) |
| `src/assets/icons/dewlight-focus.png` | style cohort (Equipment peer) |
| `src/assets/sprites/wizard.png` | style reference |
| `src/assets/sprites/knight.png` | style reference |
| `src/assets/sprites/priest.png` | style reference |

## Original sample + style cohort + identity choices

| iconKey | Original sample (SUBJECT) | Style cohort | Identity / style choice |
| --- | --- | --- | --- |
| `elemental-practice` | twin glyph sparks — one berry flame mote and one mint-frost mote — paired without a caster body | Knight talent sheet + fortitude/swordcraft + Equipment peers | Paired berry + mint motes, no caster. Accepted **r1**. Recovered **28×30**. |
| `warding-lore` | open cream ward-hex tablet / prism bookmark with mint and berry edge marks | same + gate-passing elemental-practice raw | Tall cream tablet with hex window; mint/berry edge marks. Accepted **r3** after preference underfill on r1/r2. Recovered **17×27**. |
| `starfall` | cluster of falling cream-gold star motes with short berry trails | same + falling-star runtime/raw | Compact falling cream-gold stars with solid berry trail blocks. Accepted **r2** after r1 overshoot (21×34). Recovered **19×22**. |
| `prismatic-shelter` | small faceted mint-cream prism dome / canopy glyph | same + starfruit-prism / dewlight-focus | Faceted mint-cream dome. Accepted **r2** after r1 underfill (long axis 19). Recovered **22×27**. |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| elemental-practice-r1 | icon | pass | none | 28×30; far 4.2% | advance | accept |
| warding-lore-r1 | icon | pass | none | 12×21 | advance (preference thin) | enlarge |
| warding-lore-r2 | icon | pass | none | 13×20 | advance (preference thin) | enlarge |
| warding-lore-r3 | icon | pass | none | 17×27; far 1.2% | advance | accept |
| starfall-r1 | icon | fail | none | 21×34 | overshoot | shrink + clearance |
| starfall-r2 | icon | pass | none | 19×22; far 0% | advance | accept |
| prismatic-shelter-r1 | icon | fail | none | long axis 19 | underfill | enlarge |
| prismatic-shelter-r2 | icon | pass | none | 22×27; far 8.5% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| warding-lore-r1 | preference underfill (gate-pass) | 12×21; superseded by r3 |
| warding-lore-r2 | preference underfill (gate-pass) | 13×20; superseded by r3 |
| starfall-r1 | overshoot | 21×34 |
| prismatic-shelter-r1 | underfill | long axis 19 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`wizard-talent-sheet@8x.png`](./wizard-talent-sheet@8x.png)
(left→right: elemental-practice | warding-lore | starfall | prismatic-shelter).

Subagent verdict: **accept**. All four match identity, read as skill glyphs
(not Equipment Bases), are distinguishable at a glance (paired motes vs hex
tablet vs falling stars vs faceted dome). No blocking defects. Note: warding-lore
is the most object-like of the set but matches the intended ward-hex glyph.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Wizard-only review sheet: [`wizard-talent-sheet@8x.png`](./wizard-talent-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Runtime + full family contact sheet: `src/assets/icons/` (built by `python3 pipeline/icons/build.py`)
