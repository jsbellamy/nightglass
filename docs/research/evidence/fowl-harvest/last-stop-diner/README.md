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
