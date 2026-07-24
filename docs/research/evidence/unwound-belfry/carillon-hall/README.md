# Carillon Hall backdrop (#577)

Unwound Belfry Stage 8 battlefield backdrop (`carillon-hall`) — interior bell
chamber of hanging tarnished bells. Create-only discovery; UI `BACKDROP_URLS`
wiring is a separate slice.

## Contract declaration

See [`contract.md`](./contract.md). Owning contracts: `docs/backdrop-contract.md`,
`docs/unwound-belfry-theme.md` (`carillon-hall`, Environment lighting).

## Visual reference set

| Role | Path |
| --- | --- |
| Identity | Issue #577 C1 prompt / `docs/unwound-belfry-theme.md` §`carillon-hall` |
| Style cohort | `src/assets/backdrops/harvest-yard.png`, `crooked-cornfield.png`, `last-stop-diner.png` |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| carillon-hall-candidate-a | backdrop | pass (PNG 1536×1024; 0 magenta; hash matches sidecar) | n/a (scenery resize path) | reduce → 480×86; mean luma ~11; p90 ~26; sparse peaks | advance | visual review → **accept** → promote |

No rejected candidates.

## Artifacts

| Artifact | Path |
| --- | --- |
| Archived raw | `assets-raw/backdrops/carillon-hall.png` |
| Provenance sidecar | `assets-raw/backdrops/carillon-hall.source.json` |
| Runtime 480×86 | `src/assets/backdrops/carillon-hall.png` |
| Measure report | [`measure-report.json`](./measure-report.json) |
| Native tile review (Step 6) | [`tile-review-carillon-hall.png`](./tile-review-carillon-hall.png) |
| 4× tile review | [`tile-review-carillon-hall@4x.png`](./tile-review-carillon-hall@4x.png) |
| Bare runtime 1× / 4× | [`runtime-1x.png`](./runtime-1x.png), [`runtime@4x.png`](./runtime@4x.png) |
| Visual verdict | [`visual-review.md`](./visual-review.md) |

## Validator

```bash
python3 pipeline/backdrops.py build
python3 pipeline/backdrops.py verify
```

Local targeted verify: `carillon-hall` raw_sha256 PASS, byte-identical rebuild
(90635 bytes), sidecar PASS, runtime 480×86 PASS.

Authoritative full-catalog proof: CI `assets` job after push (ordinary asset
issue; did not run repository-wide `npm run assets:verify` locally).
