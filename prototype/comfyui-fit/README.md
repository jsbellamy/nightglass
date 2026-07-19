# Acquisition-contract evidence

This directory preserves the prototypes behind the 32×48 Character acquisition
contract. The active provider-neutral path is the #29 grid-recovery amendment;
the older ComfyUI material remains historical/reference-only evidence for #15,
#19–#22.

- **Active contract:** [`../../docs/acquisition-contract.md`](../../docs/acquisition-contract.md)
- **Archived provider raws and provenance:** [`grid_raw/`](grid_raw/)
- **Offline implementation:** [`acquire.py`](acquire.py)
- **Contract tests:** [`test_contract.py`](test_contract.py)
- **Historical ComfyUI verdict:** [`NOTES.md`](NOTES.md)
- **Historical ComfyUI anchors:** [`canonical/`](canonical/)

## Run the active path

Only Python and Pillow are required. No provider, model, GPU, or network is
used.

```bash
python3 acquire.py
python3 test_contract.py
```

The first command rebuilds `runtime/knight.png` and `runtime/wizard.png` from the
byte-locked raws. The second exercises raw acquisition gates, pitch recovery,
all surviving validator/manifest rules, and byte-identical offline rebuilds.
