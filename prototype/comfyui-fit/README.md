# comfyui-fit — PROTOTYPE (throwaway)

Phase-1 static-gate slice of [#15 — Prototype ComfyUI at the Battle Tile
contract](https://github.com/jsbellamy/nightglass/issues/15). Wipe when the
trial closes; fold only the verdict + canonical anchors forward.

- **Verdict:** [NOTES.md](NOTES.md)
- **Canonical anchors + provenance:** [canonical/](canonical/) · [MANIFEST](canonical/MANIFEST.md)
- **Review at contract scale:** `normalized/REVIEW.png` (32×48 in the 480×112 tile) · `normalized/CONTACT.png` (all candidates)

## Run (needs local ComfyUI 0.28.0 on 127.0.0.1:8188, per setup #18)

```
# generate raw candidates from a job spec
/c/ComfyUI/venv/Scripts/python.exe gen.py jobs.json
# normalize chosen raws to 32x48 RGBA
/c/ComfyUI/venv/Scripts/python.exe normalize.py knight_seed103 wizard_seed201
# composite into the Battle Tile for review
/c/ComfyUI/venv/Scripts/python.exe tile.py knight_seed103 wizard_seed201
```
