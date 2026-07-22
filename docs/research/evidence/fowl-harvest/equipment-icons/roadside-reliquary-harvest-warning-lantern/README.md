# Evidence: #396 Roadside Reliquary and Harvest Warning Lantern

Behavior-neutral interim acquisition of two Priest relic Equipment icons as
isolated, unregistered `fowl-harvest-24` text-grid families. No runtime PNG,
registry entry, manifest entry, EquipmentBaseDef, Armory mapping, or UI change
in this slice. Activation is deferred to the shared Equipment integration
slice (#412).

## Contract declaration

See [`contract.md`](./contract.md).

## Style cohort

| Path | Role |
| --- | --- |
| `src/assets/icons/preview/verify-fowl-canary@8x.png` | Fowl named-palette icon cohort |
| `src/assets/icon-sources/verify-fowl-canary/source.grid` | Fowl text-grid identity |
| `src/assets/icons/preview/moonpetal-relic@8x.png` | Priest relic Equipment silhouette language |
| `docs/icon-contract.md` | 34×34 named-palette icon contract |

## Original sample + identity choices

| iconKey | Subject | Accepted | Recovered |
| --- | --- | --- | --- |
| `roadside-reliquary` | dented roadside shrine canister; diner-cream faceplate, teal trim, red reflector | **r2** after off-ramp on r1 | **18×22**; far 8.95% |
| `harvest-warning-lantern` | rugged hanging grain-yard lantern; red beacon, storm-slate cage, rust-orange handle | **r3** after off-ramp on r1/r2 | **16×25**; far 3.17% |

Issue exact prompts were submitted as each family's **r1**. Accepted provenance
records the prompt that produced the accepted raw; `issue_prompt` preserves the
verbatim issue text. Tier IV is an independent silhouette, never a recolor of
Tier III.

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| roadside-reliquary-r1 | icon | pass | none | 15×22; far 37.3% | off-ramp | exact hex materials |
| roadside-reliquary-r2 | icon | pass | none | 18×22; far 8.95% | advance | accept |
| harvest-warning-lantern-r1 | icon | pass | none | 17×24; far 27.7% | off-ramp | exact hex materials |
| harvest-warning-lantern-r2 | icon | pass | none | 12×23; far 27.8% | off-ramp | exact slate + enlarge |
| harvest-warning-lantern-r3 | icon | pass | none | 16×25; far 3.17% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| roadside-reliquary-r1 | off-ramp | 15×22; far 37.3% (soft cream / off-hex fills) |
| harvest-warning-lantern-r1 | off-ramp | 17×24; far 27.7% (blue-gray cage, hot red) |
| harvest-warning-lantern-r2 | off-ramp | 12×23; far 27.8% (storm-slate still off-hex) |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above plus [`candidate-reports/`](./candidate-reports/). Provider raws are
evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`priest-fowl-equipment-sheet@8x.png`](./priest-fowl-equipment-sheet@8x.png)
(left→right: roadside-reliquary | harvest-warning-lantern).

Subagent verdict: **accept**. Distinct Tier III canister vs Tier IV lantern
silhouettes; cream faceplate / teal trim / red reflector vs storm-slate cage /
red beacon / rust-orange handle; chunk Fowl Harvest inventory-icon language; no
Character / duck / scene / UI-frame read. Blocking defects: none.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Review sheet: [`priest-fowl-equipment-sheet@8x.png`](./priest-fowl-equipment-sheet@8x.png)
- Per-icon @8× copies (evidence only): [`previews/`](./previews/)
- Unregistered sources: `src/assets/icon-sources/{roadside-reliquary,harvest-warning-lantern}/`
