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

`assets:verify` runs with no provider, model, GPU, or network. CI runs the same
job offline after `pip install pillow`.

## Adding a new asset

1. Declare the asset contract (see `docs/agents/asset-generation.md`).
2. Archive the provider PNG byte-for-byte under `assets-raw/grid_raw/` with a
   provenance sidecar whose `raw_sha256` matches the file.
3. Run `npm run assets:build` and confirm `npm run assets:verify` is green.
4. Commit the raw, sidecar, rebuilt runtime PNG, and updated `manifest.json`.
