# Evidence: #608 Tier-5 Unwound Belfry equipment icons

Acquire, ingest, build, and register six Tier-5 Equipment Base icons on
`unwound-belfry-24`, with matching `EquipmentBaseDef`s and `tier5` affix bands.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Equipment Base inventory icon) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/icons/<iconKey>.png` |
| Runtime shape | 34×34 RGBA; derived `belfry-void` outline |
| Visual vocabulary | `unwound-belfry-24`; per-family `palette_subset` in `pipeline/icons/registry.py` |
| Geometry | Icon grid shell (`docs/icon-contract.md`); gates in `pipeline/icons/constants.py` |
| Review context | [`tier5-family-sheet@8x.png`](./tier5-family-sheet@8x.png) and `src/assets/icons/preview/<iconKey>@8x.png` |
| Validator | `npm run assets:build` then `npm run assets:verify` |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/threshertooth-blade.png` | style cohort (Tier-4 weapon) |
| `src/assets/icons/combineplate-harness.png` | style cohort (Tier-4 armor) |
| `src/assets/icons/black-oil-locket.png` | style cohort (Tier-4 charm) |

## Identity choices

| iconKey | Subject (C6) | Accepted | Recovered |
| --- | --- | --- | --- |
| `escapement-greatsword` | toothed escapement-bar greatsword | **r1** | **24×30** (autofit from 28×34); far 2.6% |
| `aphelion-conduit` | orrery-topped conduit staff | **r1** | **18×24**; far 6.8% |
| `tolling-reliquary` | brass/ivory reliquary hand-bell | **r1** | **22×26**; far 2.2% |
| `mainspring-repeater` | mainspring drum crossbow | **r1** | **24×19**; far 2.8% |
| `verdigris-carapace` | overlapping verdigris plate carapace | **r1** | **27×29**; far 4.8% |
| `stopped-hour-pendulum` | stopped clock-face pendulum charm | **r1** | **15×30** (autofit from 18×34); far 12.1% |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| escapement-greatsword-r1 | icon | pass | none | 24×30; far 2.6%; autofit | overshoot-autofit | advance |
| aphelion-conduit-r1 | icon | pass | none | 18×24; far 6.8% | advance | accept |
| tolling-reliquary-r1 | icon | pass | none | 22×26; far 2.2% | advance | accept |
| mainspring-repeater-r1 | icon | pass | none | 24×19; far 2.8% | advance | accept |
| verdigris-carapace-r1 | icon | pass | none | 27×29; far 4.8% | advance | accept |
| stopped-hour-pendulum-r1 | icon | pass | none | 15×30; far 12.1%; autofit | overshoot-autofit | advance |

## Rejected candidates

None — all six r1 candidates passed deterministic gates and step-6 visual review.

## Step-6 visual review

Composite: [`tier5-family-sheet@8x.png`](./tier5-family-sheet@8x.png)
(left→right: greatsword | conduit | reliquary | repeater | carapace | pendulum).

Subagent verdict: **accept**. See [`visual-review.md`](./visual-review.md).

## Visual identity report (C6)

| Check | Result |
| --- | --- |
| Chunky pixel / Tier-4 cohort style | pass — flat blocks, three-quarter display, shared lighting |
| `unwound-belfry-24` material read | pass — brass, verdigris, candle-ivory, glass-teal, indigo shadows, restrained alarm-red |
| Subject identity at Armory scale | pass — all six named subjects readable |
| Size fidelity after autofit | pass — greatsword + pendulum clarity retained; repeater still readable at 24×19 |

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Review sheet: [`tier5-family-sheet@8x.png`](./tier5-family-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Text sources: `src/assets/icon-sources/{escapement-greatsword,aphelion-conduit,tolling-reliquary,mainspring-repeater,verdigris-carapace,stopped-hour-pendulum}/`
- Runtime + contact sheet: `src/assets/icons/` (built by `npm run assets:build`)

Provider raws are evidence only — **nothing added to `assets-raw/`**.
