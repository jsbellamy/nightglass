# The Oculus backdrop (#579)

Unwound Belfry Stage 10 battlefield backdrop acquisition for `the-oculus` —
open astronomical crown under a broken firmament. No Stage, Boss definition,
Content record, or UI `BACKDROP_URLS` wiring (that is the backdrop-wiring slice).

## Artifacts

| Artifact | Path |
| --- | --- |
| Archived raw | `assets-raw/backdrops/the-oculus.png` |
| Provenance sidecar | `assets-raw/backdrops/the-oculus.source.json` |
| Runtime 480×86 | `src/assets/backdrops/the-oculus.png` |
| Contract declaration | [`contract.md`](./contract.md) |
| Candidate c1 measure | [`c1-measure.json`](./c1-measure.json) |
| Candidate c2 measure | [`c2-measure.json`](./c2-measure.json) |
| Native tile review | [`tile-review-the-oculus.png`](./tile-review-the-oculus.png) |
| 4× review sheet | [`tile-review-the-oculus@4x.png`](./tile-review-the-oculus@4x.png) |
| Runtime 4× band | [`runtime@4x.png`](./runtime@4x.png) |
| Visual verdict | [`visual-review.md`](./visual-review.md) |
| Prior candidate c1 (identity input for c2) | [`scratch/the-oculus-c1.png`](./scratch/the-oculus-c1.png) |

## Candidate log

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| c1 | backdrop | pass (PNG opaque, 0 magenta, reduce 1536×1024→480×86) | n/a (scenery) | runtime max_lum ~198 | contrast — near-white star/glow peaks | retry |
| c2 | backdrop | pass (same reduce gates) | n/a | runtime max_lum ~180.5; mean ~9.2; 0 magenta | accept | promote + ship |

## Targeted verify

```text
python3 pipeline/backdrops.py build
python3 pipeline/backdrops.py verify
# the-oculus: raw_sha256 PASS, byte-identical PASS, sidecar PASS, 480×86 PASS
```

CI `assets` job is the authoritative full-catalog byte-identity proof after push.

## Review discipline

Judge at native 1× first (`tile-review-the-oculus.png`); use
`tile-review-the-oculus@4x.png` and `runtime@4x.png` only to inspect ground-band
flatness and feedback pop.

Unwound Belfry moonless-indigo materials are intentional divergence from the
Fowl Harvest style cohort (`harvest-yard`, `crooked-cornfield`, `last-stop-diner`)
used as strip-composition / soft pixel-paint references only.
