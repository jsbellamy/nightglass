# Canonical reference provenance — Phase 1 static trial (#15)

> Historical/reference-only after #22 and #29. These ComfyUI outputs may inform
> look exploration but may not enter the shipped raw bundle. The active external-
> provider anchors and provenance are in [`../grid_raw/`](../grid_raw/).

Project-owned identity anchors for reference-conditioned generation. Raw exports
preserved; only normalized 32×48 RGBA enters the game. No generator is called at
build or runtime.

## Environment (per setup #18)

- ComfyUI 0.28.0, commit `83082a51c420a364b15ea5f40d61da74e35b2da5`
- Python 3.13.5, PyTorch 2.13.0+cu130, RTX 5090, NVIDIA driver 591.74
- Server bound `127.0.0.1:8188`; core nodes only, **no custom nodes**

## Model

| File | SHA-256 | License | Source |
| --- | --- | --- | --- |
| `flux1-schnell-fp8.safetensors` | `EAD426278B49030E9DA5DF862994F25CE94AB2EE4DF38B556DDDDB3DB093BF72` | Apache-2.0 (commercial permitted) | [Comfy-Org/flux1-schnell](https://huggingface.co/Comfy-Org/flux1-schnell) |

## Generation

- Graph: `CheckpointLoaderSimple → CLIPTextEncode(pos/neg) → EmptySD3LatentImage(512×768) → KSampler(seed, 4 steps, cfg 1.0, euler/simple, denoise 1.0) → VAEDecode → SaveImage`
- Exact per-generation workflow JSON archived beside each raw export in `../raw/*.workflow.json`.

## Anchors

| Role | Seed | Raw | SHA-256 (raw) | 32×48 | SHA-256 (32×48) |
| --- | --- | --- | --- | --- | --- |
| Knight (weapon user) | 103 | `knight-canonical.png` | `9de12c245d684f7592f9aa44220c4af78709c2f1c4b88f990cb3e5199cb95db6` | `knight-32x48.png` | `cf486b1ff107ecc61cf765ad5c424d37ee24d8dca2a4828644c233e5f6e5f27f` |
| Wizard (caster) | 201 | `wizard-canonical.png` | `fa2848450817eff32b8f584961f855c6f9e98ce2f3a8989d2b22f858d53d85a7` | `wizard-32x48.png` | `b38dc90c4dbc8f61adb5bb311d6d85c3f9d63c85fd34a90ea9c1eb4c4fff9418` |

Normalization is deterministic from the raw PNG via [`../normalize.py`](../normalize.py);
the 32×48 hashes above reproduce byte-identically with no ComfyUI present.
