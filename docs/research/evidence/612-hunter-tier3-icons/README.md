# Evidence: #612 Hunter Tier-3 talent icons

Acquire, ingest, build, and register four Hunter Tier-3 Talent / Ability Talent
icons on `moonberry-16`, with matching `hunterTier3` / `hunterTier3Abilities`
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
| Review context | [`hunter-tier3-sheet@8x.png`](./hunter-tier3-sheet@8x.png) and `src/assets/icons/preview/<iconKey>@8x.png` |
| Validator | `npm run assets:build` then `npm run assets:verify` |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/draw-weight.png` | style cohort (Hunter talent) |
| `src/assets/icons/fletchers-eye.png` | style cohort (Hunter talent) |
| `src/assets/icons/piercing-rain.png` | style cohort (Hunter talent) |

## Identity choices

| iconKey | Subject (C6) | Accepted | Recovered |
| --- | --- | --- | --- |
| `master-fletcher` | crossed fletched arrows with mint vanes | **r2** | **20×20**; far 1.4% |
| `trailhardened` | layered leaf-armour bracer, plum strap | **r2** | **22×19**; far 14.3% |
| `death-rain` | downward volley of three parallel arrows | **r4** | **22×27**; far 0.3% |
| `killshot` | arrow through berry target reticle | **r3** | **23×23**; far 0.3% |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| master-fletcher-r1 | icon | pass | none | far high / weaker pitch | superseded | accept r2 |
| master-fletcher-r2 | icon | pass | none | 20×20; far 1.4% | advance | accept |
| trailhardened-r1 | icon | pass | none | far ~17% | superseded | accept r2 |
| trailhardened-r2 | icon | pass | none | 22×19; far 14.3% | advance | accept |
| death-rain-r1 | icon | pass | none | far 52.5% | off-ramp | on-palette berry tips |
| death-rain-r2 | icon | pass | none | far 26.3% | off-ramp | berry tips + piercing-rain ref |
| death-rain-r3 | icon | pass | none | far 23.2% | off-ramp | berry-magenta tips lock |
| death-rain-r4 | icon | pass | none | 22×27; far 0.3% | advance | accept |
| killshot-r1 | icon | pass | none | 24×21; far 14.2% | advance | superseded by r3 |
| killshot-r2 | icon | pass | none | far 37.2% | off-ramp | retry |
| killshot-r3 | icon | pass | none | 23×23; far 0.3% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| death-rain-r1 | off-ramp | far 52.5% (yellow/gold tips) |
| death-rain-r2 | off-ramp | far 26.3% (yellow tips persist) |
| death-rain-r3 | off-ramp | far 23.2% (yellow tips persist) |
| killshot-r2 | off-ramp | far 37.2% |

Rejected provider raws were pruned from `scratch/` after the durable table above
was recorded. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`hunter-tier3-sheet@8x.png`](./hunter-tier3-sheet@8x.png)
(left→right: master-fletcher | trailhardened | death-rain | killshot).

Subagent verdict: **accept**. All four match C6 identity reads, align with the
night-garden chunky-pixel Hunter talent family, and remain distinguishable.
No fit/scale clarity loss. Minor non-blocking note: master-fletcher vanes read
cream-with-mint accents rather than mint-first.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Review sheet: [`hunter-tier3-sheet@8x.png`](./hunter-tier3-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Text sources: `src/assets/icon-sources/{master-fletcher,trailhardened,death-rain,killshot}/`
- Runtime + contact sheet: `src/assets/icons/` (built by `npm run assets:build`)
