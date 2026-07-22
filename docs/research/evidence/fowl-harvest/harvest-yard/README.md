# Harvest Yard backdrop (#322)

Production-ready but not-yet-playable Fowl Harvest battlefield backdrop
(`harvest-yard`). No Stage, Boss definition, Content record, or UI mapping.

## Artifacts

| Artifact | Path |
| --- | --- |
| Archived raw | `assets-raw/backdrops/harvest-yard.png` |
| Provenance sidecar | `assets-raw/backdrops/harvest-yard.source.json` |
| Runtime 480×86 | `src/assets/backdrops/harvest-yard.png` |
| Contract declaration | [`contract.md`](./contract.md) |
| Measure / reduce report | [`measure-report.json`](./measure-report.json) |
| Style cohort | [`STYLE-COHORT.md`](./STYLE-COHORT.md) |
| Native tile review | [`tile-review-harvest-yard.png`](./tile-review-harvest-yard.png) |
| 4× review sheet | [`tile-review-harvest-yard@4x.png`](./tile-review-harvest-yard@4x.png) |
| Visual verdict | [`visual-review.md`](./visual-review.md) |
| Prior candidate C (direct input for D) | [`scratch/harvest-yard-candidate-c.png`](./scratch/harvest-yard-candidate-c.png) |

## Validator

```bash
python3 pipeline/backdrops.py build
python3 pipeline/backdrops.py verify
```

Discovery via complete-bundle stems under `assets-raw/backdrops/` (#319). Full
catalog byte-identity is the CI `assets` job after push — do not loop
`npm run assets:verify` during acquisition.
