# Stopped-Clock Court backdrop (#576)

Unwound Belfry Stage 7 battlefield backdrop (`stopped-clock-court`): moonless
plaza of dead street clocks at the tower's foot. Create-only discovery; UI
`BACKDROP_URLS` wiring is a separate slice.

## Contract declaration

See [`contract.md`](./contract.md).

## Artifacts

| Artifact | Path |
| --- | --- |
| Archived raw | `assets-raw/backdrops/stopped-clock-court.png` |
| Provenance sidecar | `assets-raw/backdrops/stopped-clock-court.source.json` |
| Runtime 480×86 | `src/assets/backdrops/stopped-clock-court.png` |
| Contract declaration | [`contract.md`](./contract.md) |
| Measure report | [`measure-report.json`](./measure-report.json) |
| Native tile review | [`tile-review-stopped-clock-court.png`](./tile-review-stopped-clock-court.png) |
| 4× tile review | [`tile-review-stopped-clock-court@4x.png`](./tile-review-stopped-clock-court@4x.png) |
| Visual verdict | [`visual-review.md`](./visual-review.md) |

## Candidate log

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| c1 | backdrop | pass (PNG, 0 magenta, reduce 1536×1024→480×86) | n/a (scenery) | mean luma 14.66; bottom-fifth 12.28; magenta 0; sparse dial peak ~225 | accept (step-6 tile composite) | promote + ship |

## Style cohort (generation inputs)

Battlefield 480×86 strips used as style references (chunky low-contrast
pixel-art strip treatment; Belfry identity from C1 prompt, not Fowl Harvest
palette):

- `src/assets/backdrops/harvest-yard.png`
- `src/assets/backdrops/crooked-cornfield.png`
- `src/assets/backdrops/last-stop-diner.png`

Identity anchor: issue #576 C1 / `docs/unwound-belfry-theme.md` §`stopped-clock-court`
(first Belfry backdrop raster in the cohort).

## Targeted verify

```text
python3 pipeline/backdrops.py build
python3 pipeline/backdrops.py verify
# stopped-clock-court: raw_sha256 PASS, byte-identical PASS, sidecar PASS, 480×86 PASS
```

CI `assets` job is the authoritative full-catalog byte-identity proof after push.
Do not loop `npm run assets:verify` during acquisition.

## Review discipline

Judge the native tile composite first
([`tile-review-stopped-clock-court.png`](./tile-review-stopped-clock-court.png));
use the @4× sheet only to inspect ground-band flatness and feedback pop.
Issue Proof C2 also authorizes the bare 480×86 runtime strip; both seams
recorded an **accept** verdict in [`visual-review.md`](./visual-review.md).
