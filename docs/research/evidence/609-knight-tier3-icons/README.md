# Evidence: #609 Knight Tier-3 talent icons

Acquire, ingest, build, and register four Knight Tier-3 Talent / Ability Talent
icons on `moonberry-16`, with matching `knightTier3` / `knightTier3Abilities`
content wired into Class Kit Content.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Talent / Ability Talent skill glyph) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/icons/<iconKey>.png` |
| Runtime shape | 34×34 RGBA; derived `contour-plum-deepest` outline |
| Visual vocabulary | `moonberry-16`; per-family `palette_subset` in `pipeline/icons/registry.py` |
| Geometry | Icon grid shell (`docs/icon-contract.md`); gates in `pipeline/icons/constants.py` |
| Review context | [`knight-tier3-sheet@8x.png`](./knight-tier3-sheet@8x.png) and `src/assets/icons/preview/<iconKey>@8x.png` |
| Validator | `npm run assets:build` then `npm run assets:verify` |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/fortitude.png` | style cohort (Knight talent) |
| `src/assets/icons/iron-discipline.png` | style cohort (Knight talent) |
| `src/assets/icons/vanguard.png` | style cohort (Knight talent) |

## Identity choices

| iconKey | Subject (C6) | Accepted | Recovered |
| --- | --- | --- | --- |
| `bulwark` | stout defensive tower shield with a plum boss | **r3** | **19×28**; far 6.5% |
| `warblade` | two crossed knight longswords with mint edge-glint | **r1** | **29×28**; far 3.7% |
| `aegis-wall` | curved wall of overlapping interlocked shields | **r1** | **27×17**; far 4.0% |
| `titans-cleave` | enormous two-handed greatsword mid downward cleave | **r1** | **25×26**; far 13.0% |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| bulwark-r1 | icon | fail | none | pitch y=0.039 &lt; floor | pitch-fail | retry with style ref + grid shell |
| bulwark-r2 | icon | fail | bottom/left | clipped | clip-fail | more magenta clearance |
| bulwark-r3 | icon | pass | none | 19×28; far 6.5% | advance | accept |
| warblade-r1 | icon | pass | none | 29×28; far 3.7% | advance | accept |
| aegis-wall-r1 | icon | pass | none | 27×17; far 4.0% | advance | accept |
| titans-cleave-r1 | icon | pass | none | 25×26; far 13.0% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| bulwark-r1 | pitch-fail | scores x=0.074, y=0.039 (floor 0.04) |
| bulwark-r2 | clip-fail | clipped bottom/left of raw canvas |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`knight-tier3-sheet@8x.png`](./knight-tier3-sheet@8x.png)
(left→right: bulwark | warblade | aegis-wall | titans-cleave).

Subagent verdict: **accept**. All four match C6 identity reads, align with the
night-garden chunky-pixel Knight talent family, and remain distinguishable.
Size recovery for bulwark (19×28) and aegis-wall (27×17) supports rather than
undermines intent; no retry.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Review sheet: [`knight-tier3-sheet@8x.png`](./knight-tier3-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Text sources: `src/assets/icon-sources/{aegis-wall,bulwark,titans-cleave,warblade}/`
- Runtime + contact sheet: `src/assets/icons/` (built by `npm run assets:build`)
