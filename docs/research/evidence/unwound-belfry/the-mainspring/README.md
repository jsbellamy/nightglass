# The Mainspring backdrop (#578)

Unwound Belfry battlefield backdrop acquisition for `the-mainspring` (Stage 9 —
great gearworks clock-heart). Create-only discovery; UI `BACKDROP_URLS` wiring
is a separate slice.

## Contract declaration

See [`contract.md`](./contract.md).

## Artifacts

| Artifact | Path |
| --- | --- |
| Archived raw | `assets-raw/backdrops/the-mainspring.png` |
| Provenance sidecar | `assets-raw/backdrops/the-mainspring.source.json` |
| Runtime 480×86 | `src/assets/backdrops/the-mainspring.png` |
| Candidate measure | [`c1-measure.json`](./c1-measure.json) |
| Native tile review | [`tile-review-the-mainspring.png`](./tile-review-the-mainspring.png) |
| 4× review sheet | [`tile-review-the-mainspring@4x.png`](./tile-review-the-mainspring@4x.png) |
| Runtime 4× band | [`runtime@4x.png`](./runtime@4x.png) |
| Visual verdict | [`visual-review.md`](./visual-review.md) |

## Candidate log

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| c1 | backdrop | pass (PNG opaque, 0 magenta, reduce 1536×1024→480×86) | n/a (scenery) | whole mean luma 16.8; bottom-fifth mean 16.3; opp midband 16.6 | accept | promote + ship |

## Targeted verify

```text
python3 pipeline/backdrops.py build
python3 pipeline/backdrops.py verify
# the-mainspring: raw_sha256 PASS, byte-identical PASS, sidecar PASS, 480×86 PASS
```

CI `assets` job is the authoritative full-catalog byte-identity proof after push.

## Review discipline

Judge at native 1× first (`tile-review-the-mainspring.png`); use
`tile-review-the-mainspring@4x.png` and `runtime@4x.png` only to inspect
ground-band flatness and feedback pop. `runtime@4x.png` is an optional
nearest-neighbour band inspect sheet beyond the issue Touches list, kept for
ground-band evidence only.

Style cohort refs (`harvest-yard`, `crooked-cornfield`, `last-stop-diner`) guided
strip composition and soft pixel-paint treatment, not Fowl Harvest palette match.
Unwound Belfry lighting follows `docs/unwound-belfry-theme.md` §Environment lighting.
