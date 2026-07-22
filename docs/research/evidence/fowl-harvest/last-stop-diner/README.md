# Last Stop Diner backdrop (#323)

Fowl Harvest battlefield backdrop acquisition for `last-stop-diner`.

## Artifacts

| Artifact | Path |
| --- | --- |
| Archived raw | `assets-raw/backdrops/last-stop-diner.png` |
| Provenance sidecar | `assets-raw/backdrops/last-stop-diner.source.json` |
| Runtime 480×86 | `src/assets/backdrops/last-stop-diner.png` |
| Candidate measure | `c1-measure.json` |
| Native tile review | `tile-review-last-stop-diner.png` |
| 4× review sheet | `tile-review-last-stop-diner@4x.png` |
| Runtime 4× band | `runtime@4x.png` |
| Visual verdict | `visual-review.md` |

## Candidate log

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| c1 | backdrop | pass (PNG opaque, 0 magenta, reduce 1536×1024→480×86) | n/a (scenery) | bottom-fifth mean luma 25.1; midband teal/green/brown present; mint~0 | accept | promote + ship |

## Targeted verify

```text
python3 pipeline/backdrops.py build
python3 pipeline/backdrops.py verify
# last-stop-diner: raw_sha256 PASS, byte-identical PASS, sidecar PASS, 480×86 PASS
```

CI `assets` job is the authoritative full-catalog byte-identity proof after push.

## Review discipline

Judge at native 1× first (`tile-review-last-stop-diner.png`); use
`tile-review-last-stop-diner@4x.png` and `runtime@4x.png` only to inspect
ground-band flatness and feedback pop. `runtime@4x.png` is an extra
nearest-neighbour band inspect sheet (out-of-manifest vs the issue's single
4× tile sheet) kept for ground-band evidence only.

Fowl Harvest toxic-dusk materials are intentional divergence from the Moonberry
`backdrop-1`…`backdrop-3` night-garden cohort; cohort refs guided strip
composition and soft pixel-paint treatment, not plum/mint palette match.
