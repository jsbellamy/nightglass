# Contract declaration — #396 Priest Fowl Equipment icons

| Field | Value |
| --- | --- |
| Asset class | interface (Equipment Base inventory icon) |
| Status | candidate for shipping (unregistered until Equipment activation slice) |
| Runtime destination | deferred — `src/assets/icons/<iconKey>.png` at activation (#412) |
| Runtime shape | 34×34 RGBA geometry via icon contract (source only here) |
| Visual vocabulary | `fowl-harvest-24`; per-family `palette_subset` in `source.json` / `source.grid` |
| Geometry | Icon grid shell; long side target 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `priest-fowl-equipment-sheet@8x.png` (evidence composite) |
| Validator | targeted Fowl-qualified ingest + `python3 -m icons.verify` fixture/rebuild gates; CI `assets` for full catalog |

## Style cohort

| Path | Role |
| --- | --- |
| `src/assets/icons/preview/verify-fowl-canary@8x.png` | Fowl named-palette icon cohort |
| `src/assets/icon-sources/verify-fowl-canary/source.grid` | Fowl text-grid identity |
| `src/assets/icons/preview/moonpetal-relic@8x.png` | Priest relic Equipment silhouette language |
| `docs/icon-contract.md` | 34×34 named-palette icon contract |

## Families

| Family | Subject | Tier role |
| --- | --- | --- |
| `roadside-reliquary` | dented roadside shrine canister, diner-cream faceplate, teal trim, red reflector | Tier III (independent silhouette) |
| `harvest-warning-lantern` | rugged hanging grain-yard lantern, red beacon core, storm-slate cage, rust-orange handle | Tier IV (independent silhouette, never a recolor of Tier III) |
