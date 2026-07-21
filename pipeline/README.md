# Asset pipeline

Production home for the logical-grid acquisition toolchain frozen in
[`docs/acquisition-contract.md`](../docs/acquisition-contract.md). Follow the
acquisition loop in
[`docs/agents/asset-generation.md`](../docs/agents/asset-generation.md) when
adding or changing raster assets.

## Layout

- `assets-raw/grid_raw/` — Archived Raw Bundle (`*.png` + `*.source.json`)
- `assets-raw/backdrops/` — Stage backdrop Archived Raw Bundle (see `docs/backdrop-contract.md`)
- `pipeline/acquire.py` — offline normalizer, validator, and manifest writer
- `pipeline/icons/` — Equipment icon ingest, Stage-2 build, and contract tests
- `pipeline/effects/` — Ability effect author, derive, and verify (`author.py`, `derive.py`, `verify.py`)
- `pipeline/backdrops.py` — Stage backdrop nearest reduce + byte-identity verify
- `pipeline/palette.json` — `moonberry-16` palette definition
- `src/assets/sprites/` — committed runtime PNGs and `manifest.json`
- `src/assets/backdrops/` — committed 480×86 Stage backdrop runtimes
- `src/assets/icon-sources/` — generated text-grid icon sources (see `docs/icon-contract.md`)
- `src/assets/icons/` — committed 34×34 Equipment icon runtimes and manifest
- `src/assets/effects/` — committed Ability effect frames and manifests

## Commands

```bash
npm run assets:build   # rebuild runtime sprites + icons + backdrops from committed sources
npm run assets:effects # author and derive Ability effect frames (when sources change)
npm run assets:verify  # contract tests + effects + icons + backdrops byte-identity proof
```

Measure provider candidates immediately; this command is read-only and does not
require provenance sidecars:

```bash
python3 pipeline/acquire.py measure --tier large path/to/boss-1-a.png path/to/boss-2-a.png
```

The JSON result records raw gates, all clipped sides, recovered grid, pitch
scores, one primary failure, and the next action. A candidate with
`"status": "retry"` stays outside the Archived Raw Bundle.

After deterministic and visual review both pass, promote the chosen candidate:

```bash
python3 pipeline/acquire.py promote \
  --tier large \
  --tag boss-1 \
  --raw path/to/boss-1-c.png \
  --provider "Cursor GenerateImage" \
  --acquisition-tool GenerateImage \
  --prompt-file path/to/boss-1-c.prompt.txt \
  --reference identity=assets-raw/grid_raw/boss.png
```

`promote` remeasures the candidate, refuses a retry result, copies the accepted
provider bytes into `assets-raw/grid_raw/`, generates the complete provenance
sidecar, normalizes and validates the runtime PNG, and updates `manifest.json`.
Known tags derive Nightglass asset class, role, facing, and runtime destination;
`boss-1` retains the historical archived raw tag `boss`. Newly promoted
sidecars record their size `tier`; the offline build treats older sidecars with
no tier as `medium` for compatibility.

`assets:verify` runs with no provider, model, GPU, or network. CI runs the same
job offline after `pip install pillow`.

## Adding a new asset

1. Declare the asset contract (see `docs/agents/asset-generation.md`).
2. Run `acquire.py measure --tier <tier>` and follow its retry/advance result.
3. After visual review passes, run `acquire.py promote` with the exact prompt and
   direct references.
4. Run `npm run assets:build` and confirm `npm run assets:verify` is green.
5. Commit the raw, sidecar, rebuilt runtime PNG, and updated `manifest.json`.
