# Crooked Cornfield backdrop (#324)

## Contract declaration

See [`contract.md`](./contract.md). Owning contracts: `docs/backdrop-contract.md`, `docs/fowl-harvest-theme.md` (`crooked-cornfield`).

## Visual reference set

| Role | Path |
| --- | --- |
| Identity | Issue #324 prompt + `docs/fowl-harvest-theme.md` crooked-cornfield section |
| Style cohort | `src/assets/backdrops/backdrop-1.png`, `backdrop-2.png`, `backdrop-3.png` |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| candidate-1 | backdrop | pass (PNG 1536×1024; no magenta; hash matches sidecar) | n/a (scenery resize path) | reduce → 480×86; mean mid lum ~24; max mid ~158 | advance | visual review → **accept** → promote |

No rejected candidates.

## Artifacts

| Artifact | Path |
| --- | --- |
| Archived raw | `assets-raw/backdrops/crooked-cornfield.png` |
| Provenance sidecar | `assets-raw/backdrops/crooked-cornfield.source.json` |
| Runtime | `src/assets/backdrops/crooked-cornfield.png` |
| Build / measure report | [`build-report.json`](./build-report.json) |
| Native tile review | [`tile-review-crooked-cornfield.png`](./tile-review-crooked-cornfield.png) |
| 4× tile review | [`tile-review-crooked-cornfield@4x.png`](./tile-review-crooked-cornfield@4x.png) |
| Bare runtime 1× / 4× | [`runtime-1x.png`](./runtime-1x.png), [`runtime@4x.png`](./runtime@4x.png) |
| Visual review | [`visual-review.md`](./visual-review.md) |

## Validator

Local targeted: `python3 pipeline/backdrops.py verify` — all complete bundles PASS including `crooked-cornfield` byte-identical rebuild (100659 bytes).

Authoritative full-catalog proof: CI `assets` job after push (ordinary asset issue; did not run repository-wide `npm run assets:verify` locally).
