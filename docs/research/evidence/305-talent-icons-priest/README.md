# Evidence: #310 Priest Talent icons

Third Class batch of authored Talent / Ability Talent skill icons for the
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
| Review context | `priest-talent-sheet@8x.png` and `src/assets/icons/preview/<iconKey>@8x.png` |
| Validator | targeted ingest + `python3 pipeline/icons/build.py`; CI `assets` job for full-catalog byte-identity |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `docs/research/evidence/305-talent-icons-knight/knight-talent-sheet@8x.png` | style cohort (Knight talent batch) |
| `docs/research/evidence/305-talent-icons-wizard/wizard-talent-sheet@8x.png` | style cohort (Wizard talent batch) |
| `src/assets/icons/moonpetal-relic.png` | style cohort (Priest-adjacent Equipment) |
| `src/assets/icons/halcyon-lantern.png` | style cohort (Priest-adjacent Equipment) |
| `src/assets/icons/fortitude.png` | style cohort |
| `src/assets/icons/elemental-practice.png` | style cohort |
| `src/assets/sprites/priest.png` | style reference |
| `src/assets/sprites/knight.png` | style reference |
| `src/assets/sprites/wizard.png` | style reference |

## Original sample + style cohort + identity choices

| iconKey | Original sample (SUBJECT) | Style cohort | Identity / style choice |
| --- | --- | --- | --- |
| `devotion` | cream prayer-crest glyph of folded hands / paired palms with berry accent, no body | Knight + Wizard talent sheets + moonpetal/halcyon | Folded cream-mint palms with berry accent, no body. Accepted **r1**. Recovered **26×29**. |
| `radiant-study` | open cream sun-script tablet with mint and berry radiance marks | same + gate-passing devotion raw | Tall cream tablet with mint/berry script marks. Accepted **r3** after preference underfill on r1/r2. Recovered **25×26**. |
| `moonwell` | small crescent mint-cream light well / pool glyph with berry rim | same | Crescent mint-cream pool with berry rim. Accepted **r2** after preference underfill on r1. Recovered **25×25**. |
| `sunlance` | vertical cream-gold sun spear glyph with berry flare at the tip | same | Vertical cream-gold spear with berry tip flare. Accepted **r2** after underfill on r1. Recovered **14×28**. |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| devotion-r1 | icon | pass | none | 26×29; far 1.5% | advance | accept |
| radiant-study-r1 | icon | pass | none | 20×19 | advance (preference thin) | enlarge |
| radiant-study-r2 | icon | pass | none | 20×24 | advance (preference thin) | enlarge |
| radiant-study-r3 | icon | pass | none | 25×26; far 0.5% | advance | accept |
| moonwell-r1 | icon | pass | none | 22×20 | advance (preference thin) | enlarge |
| moonwell-r2 | icon | pass | none | 25×25; far 1.4% | advance | accept |
| sunlance-r1 | icon | fail | none | long axis 19 | underfill | enlarge |
| sunlance-r2 | icon | pass | none | 14×28; far 10.7% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| radiant-study-r1 | preference underfill (gate-pass) | 20×19; superseded by r3 |
| radiant-study-r2 | preference underfill (gate-pass) | 20×24; superseded by r3 |
| moonwell-r1 | preference underfill (gate-pass) | 22×20; superseded by r2 |
| sunlance-r1 | underfill | long axis 19 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`priest-talent-sheet@8x.png`](./priest-talent-sheet@8x.png)
(left→right: devotion | radiant-study | moonwell | sunlance).

Subagent verdict: **accept**. All four match identity, read as skill glyphs
(not Equipment Bases), are distinguishable at a glance (folded palms vs cream
tablet vs crescent pool vs vertical spear). No blocking defects. Note: sunlance
is the most object-like of the set but the tip flare keeps it in glyph territory.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Priest-only review sheet: [`priest-talent-sheet@8x.png`](./priest-talent-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Runtime + full family contact sheet: `src/assets/icons/` (built by `python3 pipeline/icons/build.py`)
