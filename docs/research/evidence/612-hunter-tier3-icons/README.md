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
| Validator | `npm run assets:build` then `npm run assets:verify` (CI `assets` job is full-catalog authority) |

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
| `trailhardened` | layered leaf-armour bracer, plum strap | **r3** | **30×26**; far 9.1% |
| `death-rain` | downward volley of three parallel arrows | **r4** | **22×27**; far 0.3% |
| `killshot` | arrow through berry target reticle | **r3** | **23×23**; far 0.3% |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| master-fletcher-r1 | icon | pass | none | advance (weaker pitch) | superseded | accept r2 |
| master-fletcher-r2 | icon | pass | none | 20×20; far 1.4% | advance | accept |
| trailhardened-r1 | icon | pass | none | advance | superseded | accept r2 then r3 |
| trailhardened-r2 | icon | pass | none | 22×19; far 14.3% | advance | superseded (identity) |
| trailhardened-r3 | icon | pass | none | 30×26; far 9.1% | advance | accept (bracer rework) |
| trailhardened-r4 | icon | pass | none | far 23.5% | off-ramp | reject |
| death-rain-r1 | icon | pass | none | far 52.5% | off-ramp | retry |
| death-rain-r2 | icon | fail | top/bottom/left | — | clip-fail | clearance |
| death-rain-r3 | icon | fail | bottom/left/right | — | clip-fail | clearance |
| death-rain-r4 | icon | pass | none | 22×27; far 0.3% | advance | accept |
| death-rain-r6 | icon | fail | bottom/left | — | clip-fail | reject |
| death-rain-r7 | icon | pass | none | far 44.9% | off-ramp | reject |
| killshot-r1 | icon | pass | none | 24×21; far 14.2% | advance | superseded by r3 |
| killshot-r2 | icon | pass | none | far 37.2% | off-ramp | retry |
| killshot-r3 | icon | pass | none | 23×23; far 0.3% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| death-rain-r1 | off-ramp | far 52.5% (yellow/gold tips) |
| death-rain-r2 | clip-fail | clipped top/bottom/left |
| death-rain-r3 | clip-fail | clipped bottom/left/right |
| death-rain-r6 | clip-fail | clipped bottom/left |
| death-rain-r7 | off-ramp | far 44.9% |
| killshot-r2 | off-ramp | far 37.2% |
| trailhardened-r4 | off-ramp | far 23.5% |

Rejected provider raws were pruned; durable record is the table above.
Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`hunter-tier3-sheet@8x.png`](./hunter-tier3-sheet@8x.png)
(left→right: master-fletcher | trailhardened | death-rain | killshot).

Subagent verdict: **accept** (initial cohort). Trailhardened identity rework
reviewed on [`trailhardened-rework-sheet@8x.png`](./trailhardened-rework-sheet@8x.png):
**accept** — hollow cuff with overlapping mint leaf plates and plum buckled strap;
reads as wearable leaf-armour bracer, not a scroll/roll.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Review sheet: [`hunter-tier3-sheet@8x.png`](./hunter-tier3-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Text sources: `src/assets/icon-sources/{master-fletcher,trailhardened,death-rain,killshot}/`
- Runtime + contact sheet: `src/assets/icons/` (built by `npm run assets:build`)

## Out-of-manifest companions (justified)

- `src/data/effects.ts` / `effects.test.ts` — Class Kit abilities require
  `effectRecipes` coverage (`arrow-bolt` for `death-rain` / `killshot`), same
  companion as Knight/Wizard/Priest Tier-3 slices.
- Count updates in sibling class tests / `icons.test.ts` /
  `talents-surface.test.ts` — keep suite expectations aligned with four classes
  at three Talent Tiers.
