# Evidence: #611 Priest Tier-3 talent icons

Acquire, ingest, build, and register four Priest Tier-3 Talent / Ability Talent
icons on `moonberry-16`, with matching `priestTier3` / `priestTier3Abilities`
content wired into Class Kit Content.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Talent / Ability Talent skill glyph) |
| Status | shipping (accepted) |
| Runtime destination | `src/assets/icons/<iconKey>.png` |
| Runtime shape | 34×34 RGBA; derived `contour-plum-deepest` outline |
| Visual vocabulary | `moonberry-16`; per-family `palette_subset` in `pipeline/icons/registry.py` |
| Geometry | Icon grid shell (`docs/icon-contract.md`); gates in `pipeline/icons/constants.py` |
| Review context | [`priest-tier3-sheet@8x.png`](./priest-tier3-sheet@8x.png) and `src/assets/icons/preview/<iconKey>@8x.png` |
| Validator | `npm run assets:build` then `npm run assets:verify` |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/devotion.png` | style cohort (Priest talent) |
| `src/assets/icons/battle-liturgy.png` | style cohort (Priest talent) |
| `src/assets/icons/benediction.png` | style cohort (Priest talent) |

## Identity choices

| iconKey | Subject (C6) | Accepted | Recovered |
| --- | --- | --- | --- |
| `zealous-faith` | cream heart-sun with mint rays | **r2** | **18×30**; far 4.0% |
| `solar-study` | open tome with sun glyph | **r1** | **29×28**; far 14.7% |
| `radiant-bulwark` | cream dome over berry sprout | **r2** | **23×29**; far 3.1% |
| `solar-verdict` | descending cream-gold light spear | **r1** | **18×27**; far 14.6% |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| zealous-faith-r1 | icon | pass | none | far 39.6% | off-ramp | on-palette cream/mint names |
| zealous-faith-r2 | icon | pass | none | 18×30; far 4.0% | advance | accept |
| solar-study-r1 | icon | pass | none | 29×28; far 14.7% | advance | accept |
| radiant-bulwark-r1 | icon | pass | none | far 32.2% | off-ramp | on-palette cream/mint names |
| radiant-bulwark-r2 | icon | pass | none | 23×29; far 3.1% | advance | accept |
| solar-verdict-r1 | icon | pass | none | 18×27; far 14.6% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| zealous-faith-r1 | off-ramp | far 39.6% (yellow/gold off cream-gold) |
| radiant-bulwark-r1 | off-ramp | far 32.2% (yellow/gold off cream-gold) |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`priest-tier3-sheet@8x.png`](./priest-tier3-sheet@8x.png)
(left→right: zealous-faith | solar-study | radiant-bulwark | solar-verdict).

Subagent verdict: **accept**. All four match C6 identity reads, align with the
night-garden chunky-pixel Priest talent family, and remain distinguishable.
Narrow recovered grids on zealous-faith and solar-verdict do not undermine
intent. Minor non-blocking note: solar-study’s page sun reads slightly
berry-accented vs fully cream-gold.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Review sheet: [`priest-tier3-sheet@8x.png`](./priest-tier3-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Text sources: `src/assets/icon-sources/{zealous-faith,solar-study,radiant-bulwark,solar-verdict}/`
- Runtime + contact sheet: `src/assets/icons/` (built by `npm run assets:build`)
