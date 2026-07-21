# Asset pipeline

Production home for the Battlefield body normalizer and related offline tooling.
Authoritative body rules:
[`docs/body-sprite-contract.md`](../docs/body-sprite-contract.md). Follow the
acquisition loop in
[`docs/agents/asset-generation.md`](../docs/agents/asset-generation.md) when
adding or changing raster assets.

Retired tier contracts (`docs/acquisition-contract*.md`) are historical pointers
only.

## Layout

- `assets-raw/grid_raw/` — Archived Raw Bundle (`*.png` + `*.source.json`)
- `assets-raw/backdrops/` — Stage backdrop Archived Raw Bundle (see `docs/backdrop-contract.md`)
- `pipeline/acquire.py` — offline normalizer, validator, and manifest writer
- `pipeline/icons/` — Equipment icon ingest, Stage-2 build, and contract tests
- `pipeline/effects/` — Ability effect author, derive, and verify (`author.py`, `derive.py`, `verify.py`)
- `pipeline/backdrops.py` — Stage backdrop nearest reduce + byte-identity verify
- `pipeline/palette.json` — `moonberry-16` palette definition
- `src/assets/sprites/layout.json` — role opaque ceilings and Battlefield anchor X positions
- `src/assets/sprites/` — committed runtime PNGs and `manifest.json`
- `src/assets/backdrops/` — committed 480×86 Stage backdrop runtimes
- `src/assets/icon-sources/` — generated text-grid icon sources (see `docs/icon-contract.md`)
- `src/assets/icons/` — committed 34×34 Equipment icon runtimes and manifest
- `src/assets/effects/` — committed Ability effect frames and manifests

## Commands

```bash
npm run assets:build   # rebuild runtime sprites + icons + backdrops from committed sources
npm run assets:effects # author and derive Ability effect frames (when sources change)
npm run assets:verify  # CI/full-catalog contract and byte-identity proof
```

Measure provider candidates immediately; this command is read-only and does not
require provenance sidecars:

```bash
python3 pipeline/acquire.py measure --tag hunter --report path/to/report.json path/to/candidate.png
```

The JSON result records raw gates, clipped sides, opaque bounds against the
identity role ceiling, `cursor_stamp_removed`, one primary failure, and the next
action. A candidate with `"status": "retry"` stays outside the Archived Raw
Bundle. Add `--report` to save the same JSON as durable evidence; no image or
sidecar is written by measurement.

After deterministic and visual review both pass, promote the chosen candidate:

```bash
python3 pipeline/acquire.py promote \
  --tag boss-1 \
  --raw path/to/boss-1-c.png \
  --provider "Cursor GenerateImage" \
  --acquisition-tool GenerateImage \
  --prompt-file path/to/boss-1-c.prompt.txt \
  --reference identity=assets-raw/grid_raw/boss.png \
  --report docs/research/evidence/212-boss-stills-large/promotion-report.json
```

`promote` remeasures the candidate, returns JSON on success or failure, refuses
a retry result or a prompt with missing/contradictory canonical facing, copies
the accepted provider bytes into `assets-raw/grid_raw/`, generates the complete
provenance sidecar, normalizes and validates the runtime PNG, and updates
`manifest.json` with per-asset `frame_size`, `visual_bounds`, and `foot_anchor`.
Known tags derive Nightglass asset class, role, facing, and runtime destination;
`boss-1` retains the historical archived raw tag `boss`.

`assets:verify` runs with no provider, model, GPU, or network. CI runs this
authoritative full-catalog job offline after `pip install pillow`. Do not run it
inside a candidate generation or retry loop. Ordinary asset tasks use `measure`
and `promote` locally, push the completed asset batch, and read the CI `assets`
job. Run the full command locally only when changing pipeline code, acquisition
contracts, the palette, manifest schemas, or shared derivation logic.

## Adding a new asset

1. Declare the asset contract (see `docs/agents/asset-generation.md`).
2. Run `acquire.py measure` with the asset `--tag` and follow its retry/advance result.
3. After visual review passes, run `acquire.py promote` with the exact prompt and
   direct references.
4. Commit the raw, sidecar, promoted runtime PNG, and updated `manifest.json`.
5. Push the completed batch; the CI `assets` job performs the full-catalog
   rebuild and byte-identity proof once.
