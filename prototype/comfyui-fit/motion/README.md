# motion — PROTOTYPE (throwaway)

Phase-2 body-motion slice of [#19 — Trial ComfyUI body-motion for the Knight and
Wizard actions](https://github.com/jsbellamy/nightglass/issues/19). Wipe when the
trial closes; fold only the verdict and `normalize_seq.py`'s design forward.

- **Verdict:** [NOTES.md](NOTES.md) — **NO-GO for generated body motion, both paths**
- **Action script (frozen identity, varying pose):** [actions.py](actions.py)
- **Path A** (schnell img2img keyframes): [gen_a.py](gen_a.py)
- **Path B** (Wan2.2 5B image-to-video): [gen_b.py](gen_b.py)
- **Gate measurement:** [metrics.py](metrics.py) (source) · `postred.py` (after reduction)
- **Sequence normalizer — the keeper:** [normalize_seq.py](normalize_seq.py)

## Run (needs local ComfyUI 0.28.0 on 127.0.0.1:8188, per setup #18)

```
PY=/c/ComfyUI/venv/Scripts/python.exe

# path A: denoise sweep for one action
$PY gen_a.py knight basic_attack 0.40,0.55,0.70,0.85,0.95,1.00 8
$PY sheet.py rawA knight_basic_attack sweep_knight_attack

# path B: one clip per action, then measure and reduce
$PY gen_b.py knight,wizard idle 25 20 5.0 8.0 448x672
$PY strip.py rawB/knight_idle
$PY metrics.py rawB/knight_idle
$PY normalize_seq.py rawB/knight_idle 4,6,8
$PY postred.py frames/knight_idle_k8
```
