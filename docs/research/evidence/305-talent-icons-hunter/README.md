# Evidence: #311 Hunter Talent icons

Fourth Class batch of authored Talent / Ability Talent skill icons for the
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
| Review context | `hunter-talent-sheet@8x.png` and `src/assets/icons/preview/<iconKey>@8x.png` |
| Validator | targeted ingest + `python3 pipeline/icons/build.py`; CI `assets` job for full-catalog byte-identity |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `docs/research/evidence/305-talent-icons-knight/knight-talent-sheet@8x.png` | style cohort (Knight talent batch) |
| `docs/research/evidence/305-talent-icons-wizard/wizard-talent-sheet@8x.png` | style cohort (Wizard talent batch) |
| `docs/research/evidence/305-talent-icons-priest/priest-talent-sheet@8x.png` | style cohort (Priest talent batch) |
| `src/assets/icons/bramblesong-bow.png` | style cohort (Hunter Equipment peer) |
| `src/assets/icons/nightvine-longbow.png` | style cohort (Hunter Equipment peer) |
| `src/assets/icons/fortitude.png` | style cohort |
| `src/assets/icons/devotion.png` | style cohort |
| `src/assets/sprites/hunter.png` | style reference |
| `src/assets/sprites/knight.png` | style reference |
| `src/assets/sprites/wizard.png` | style reference |
| `src/assets/sprites/priest.png` | style reference |

## Original sample + style cohort + identity choices

| iconKey | Original sample (SUBJECT) | Style cohort | Identity / style choice |
| --- | --- | --- | --- |
| `draw-weight` | mint-sage stave bow at full pull with taut cream string — bow only | Knight/Wizard/Priest talent sheets + bramblesong/nightvine | Compact drawn bow, no archer. Accepted **r4** after overshoot→underfill→preference. Recovered **14×20**. |
| `fieldcraft` | berry-and-cream snare knot / trail-mark glyph | same | Bold berry-cream snare knot. Accepted **r3** after preference underfill on r1/r2. Recovered **28×30**. |
| `heartseeker` | mint-shaft arrow piercing a small berry heart-mark | same | Arrow through berry heart. Accepted **r1**. Recovered **26×26**. |
| `moonwire-trap` | coiled cream-mint wire snare with a single cream moon bead | same | Simple cream-mint wire loop + moon bead. Accepted **r4** after three overshoots then gate-pass. Recovered **20×15**. |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| draw-weight-r1 | icon | fail | none | 27×33 | overshoot | shrink |
| draw-weight-r2 | icon | fail | none | long axis 19 | underfill | enlarge |
| draw-weight-r3 | icon | pass | none | 12×23 | preference underfill | enlarge |
| draw-weight-r4 | icon | pass | none | 14×20; far 2.0% | advance | accept |
| fieldcraft-r1 | icon | pass | none | 21×21 | preference underfill | enlarge |
| fieldcraft-r2 | icon | pass | none | 20×22 | preference underfill | enlarge |
| fieldcraft-r3 | icon | pass | none | 28×30; far 0.7% | advance | accept |
| heartseeker-r1 | icon | pass | none | 26×26; far 0.4% | advance | accept |
| moonwire-trap-r1 | icon | fail | none | 31×32 | overshoot | shrink |
| moonwire-trap-r2 | icon | fail | none | 34×32 | overshoot | shrink |
| moonwire-trap-r3 | icon | fail | none | 31×22 | overshoot | simplify |
| moonwire-trap-r4 | icon | pass | none | 20×15; far 0.6% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| draw-weight-r1 | overshoot | 27×33 |
| draw-weight-r2 | underfill | long axis 19 |
| draw-weight-r3 | preference underfill (gate-pass) | 12×23; superseded by r4 |
| fieldcraft-r1 | preference underfill (gate-pass) | 21×21; superseded by r3 |
| fieldcraft-r2 | preference underfill (gate-pass) | 20×22; superseded by r3 |
| moonwire-trap-r1 | overshoot | 31×32 |
| moonwire-trap-r2 | overshoot | 34×32 |
| moonwire-trap-r3 | overshoot | 31×22 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`hunter-talent-sheet@8x.png`](./hunter-talent-sheet@8x.png)
(left→right: draw-weight | fieldcraft | heartseeker | moonwire-trap).

Subagent verdict: **accept**. All four match identity, read as skill glyphs
(not Equipment Bases), are distinguishable at a glance (bow vs snare knot vs
arrow/heart vs wire loop). No blocking defects. Notes: heartseeker reads more
as “heart on shaft” than literal pierce-through; moonwire is a single oval loop
rather than a multi-coil nest — both still readable as the intended glyphs.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Hunter-only review sheet: [`hunter-talent-sheet@8x.png`](./hunter-talent-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Runtime + full family contact sheet: `src/assets/icons/` (built by `python3 pipeline/icons/build.py`)
