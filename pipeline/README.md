# Asset pipeline

Production home for the logical-grid acquisition toolchain frozen in
[`docs/acquisition-contract.md`](../docs/acquisition-contract.md). Follow the
acquisition loop in
[`docs/agents/asset-generation.md`](../docs/agents/asset-generation.md) when
adding or changing raster assets.

## Layout

- `assets-raw/grid_raw/` — Archived Raw Bundle (`*.png` + `*.source.json`)
- `pipeline/acquire.py` — offline normalizer, validator, and manifest writer
- `pipeline/icons/` — Equipment icon ingest, Stage-2 build, and contract tests
- `pipeline/palette.json` — `moonberry-16` palette definition
- `src/assets/sprites/` — committed runtime PNGs and `manifest.json`
- `src/assets/icon-sources/` — generated text-grid icon sources (see `docs/icon-contract.md`)
- `src/assets/icons/` — committed 34×34 Equipment icon runtimes and manifest

## Commands

```bash
npm run assets:build   # rebuild runtime sprites + icons from committed sources
npm run assets:verify  # contract tests + byte-identity rebuild proof
```

`assets:verify` runs with no provider, model, GPU, or network. CI runs the same
job offline after `pip install pillow`.

## Adding a new asset

1. Declare the asset contract (see `docs/agents/asset-generation.md`).
2. Archive the provider PNG byte-for-byte under `assets-raw/grid_raw/` with a
   provenance sidecar whose `raw_sha256` matches the file.
3. Run `npm run assets:build` and confirm `npm run assets:verify` is green.
4. Commit the raw, sidecar, rebuilt runtime PNG, and updated `manifest.json`.
