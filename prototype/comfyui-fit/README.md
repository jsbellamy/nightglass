> **Superseded.** Production acquisition lives under [`pipeline/`](../../pipeline/)
> (`pipeline/acquire.py`, `pipeline/test_contract.py`) with Archived Raw Bundles in
> [`assets-raw/grid_raw/`](../../assets-raw/grid_raw/). This directory is historical
> evidence for #15, #19–#22, and #29 only.

# Acquisition-contract evidence (historical)

This directory preserves the prototypes behind the 32×48 Character acquisition
contract. The older ComfyUI material remains reference-only evidence; do not
treat paths here as the shipped pipeline.

- **Active contract:** [`../../docs/acquisition-contract.md`](../../docs/acquisition-contract.md)
- **Production toolchain:** [`../../pipeline/README.md`](../../pipeline/README.md)
- **Archived provider raws and provenance (prototype copy):** [`grid_raw/`](grid_raw/)
- **Historical offline implementation:** [`acquire.py`](acquire.py)
- **Historical contract tests:** [`test_contract.py`](test_contract.py)
- **Historical ComfyUI verdict:** [`NOTES.md`](NOTES.md)

## Historical offline rebuild (prototype copy)

Only Python and Pillow are required. No provider, model, GPU, or network is
used. Prefer `python3 ../../pipeline/acquire.py` and
`python3 ../../pipeline/test_contract.py` for the production path.

```bash
python3 acquire.py
python3 test_contract.py
```

The first command rebuilds prototype `runtime/knight.png` and `runtime/wizard.png`
from the byte-locked raws in this tree. The second exercises the historical copy
of the contract tests. Committed game assets are rebuilt from `assets-raw/grid_raw/`
via `npm run assets:build` and proved by `npm run assets:verify`.
