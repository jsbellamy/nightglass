# Evidence: #394 Fryerplate Cleaver and Threshertooth Blade

Acquire, ingest, and visually approve two distinct Knight weapon Equipment icons
as isolated, unregistered `fowl-harvest-24` source families. Tier IV is an
independent silhouette, never a recolor of Tier III. Behavior-neutral interim:
no runtime PNG, registry/manifest entry, EquipmentBaseDef, or Armory mapping.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Equipment Base icon) |
| Status | candidate for shipping (source-only interim; activation is #412) |
| Runtime destination | deferred — `src/assets/icons/<iconKey>.png` after activation |
| Runtime shape | 34×34 RGBA; derived `oil-ink` outline (when activated) |
| Visual vocabulary | `fowl-harvest-24`; per-family `palette_subset` in each `source.json` |
| Geometry | Fowl icon grid shell (`docs/icon-contract.md`); long-side preference 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `knight-weapon-sheet@8x.png` and evidence `previews/<iconKey>@8x.png` |
| Validator | Fowl-qualified ingest → `source.grid`; targeted `python3 pipeline/icons/verify.py`; CI `assets` job for full-catalog |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/preview/verify-fowl-canary@8x.png` | Fowl palette / flat-block style |
| `src/assets/icon-sources/verify-fowl-canary/source.grid` | Fowl text-grid shell reference |
| `src/assets/icons/preview/thornquill-blade@8x.png` | weapon silhouette scale (cleaver r5 only) |

## Identity choices

| iconKey | Subject (issue prompt) | Accepted candidate | Recovered |
| --- | --- | --- | --- |
| `fryerplate-cleaver` | squared diner-chrome cleaver, fryer-basket perforations, warning-red wrap | **r5** | **21×20**; far 10.4% |
| `threshertooth-blade` | industrial toothed thresher blade, rust-orange teeth, husk-green binding | **r4** | **19×23**; far 7.3% |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| fryerplate-cleaver-r1 | icon | fail | none | 18×24; far 61.3% | off-ramp | exact hex materials |
| fryerplate-cleaver-r2 | icon | fail | none | 20×26; far 55.8% | off-ramp | exact hex + shrink chrome |
| fryerplate-cleaver-r3 | icon | fail | none | 20×36 | overshoot | shrink |
| fryerplate-cleaver-r4 | icon | fail | none | 35×22 | overshoot | shrink further |
| fryerplate-cleaver-r5 | icon | pass | none | 21×20; far 10.4% | advance | accept |
| threshertooth-blade-r1 | icon | fail | bottom/left | — | clip-fail | more magenta clearance |
| threshertooth-blade-r2 | icon | pass | none | 11×23; far 6.3% | preference underfill | enlarge / widen |
| threshertooth-blade-r3 | icon | pass | none | 10×21; far 15.6% | preference underfill | widen |
| threshertooth-blade-r4 | icon | pass | none | 19×23; far 7.3% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| fryerplate-cleaver-r1 | off-ramp | far 61.3% (chrome greys) |
| fryerplate-cleaver-r2 | off-ramp | far 55.8% |
| fryerplate-cleaver-r3 | overshoot | 20×36 |
| fryerplate-cleaver-r4 | overshoot | 35×22 |
| threshertooth-blade-r1 | clip-fail | bottom/left edge |
| threshertooth-blade-r2 | preference underfill (superseded) | 11×23 |
| threshertooth-blade-r3 | preference underfill (superseded) | 10×21 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above plus `candidate-reports/*.json`. Provider raws are evidence only —
**nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`knight-weapon-sheet@8x.png`](./knight-weapon-sheet@8x.png)
(left→right: fryerplate-cleaver | threshertooth-blade).

Subagent verdict: **accept**. See [`visual-review.md`](./visual-review.md).

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Issue exact prompts: [`issue-exact-prompts.json`](./issue-exact-prompts.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Review sheet: [`knight-weapon-sheet@8x.png`](./knight-weapon-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{fryerplate-cleaver,threshertooth-blade}/`
