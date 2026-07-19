# Qwen-Image-Edit-2511 pose-edit trial (#26)

Throwaway extension of the motion harness answering
[#26 — Trial Qwen-Image-Edit pose keyframes for Character body motion](https://github.com/jsbellamy/nightglass/issues/26).

Reuses the #19 Knight anchor (`knight_seed103.png`), action script, and review
tools. Core ComfyUI only: `qwen_image_edit_2511_fp8mixed` +
`qwen_2.5_vl_7b_fp8_scaled` + `qwen_image_vae` (Comfy-Org packs; 2511 has no
`fp8_e4m3fn` repack, so fp8mixed is the protocol-allowed substitute).

Harness: [`gen_qwen.py`](gen_qwen.py) · review sheet:
[`review/qwen_pose_edits.png`](review/qwen_pose_edits.png)

## Verdict: **NO-GO — instruction-based pose editing is a dead keyframe mechanism**

Stopped after the four `basic_attack` keys (3 seeds × a0–a2 complete; a3
partial). Did **not** spend remaining budget on hurt/knockout cells or on
RIFE/FILM/FLF2V/Fun-Control interpolation — the attack arc already fails the
ordered gates hard enough that further GPU time cannot reverse the mechanism.

## Gates (in order)

### (a) Pose response — *weak pass, then irrelevant*

Unlike #19 path A (schnell img2img scored **zero** pose response until identity
collapsed), Qwen *does* change limbs and sword position when instructed. That is
the only positive finding.

### (b) Identity hold — **FAIL** (visible at raw, before 32×48)

Across seeds on the same instruction:

- Shield: front kite ↔ round on the back; emblem 4-point star ↔ cross ↔ absent
- Sword: straight blade ↔ curved scimitar
- Handedness flips (a1 s105 swings left-handed)
- Palette/helmet roughly hold, but the shield emblem and weapon identity — the
  exact markers #15/#19 treat as decisive — do not

Reduction to 32×48 is unnecessary to call this; the raw frames already fail.

### (c) Cross-frame coherence — **FAIL**

The four `basic_attack` keys do **not** read as one character in one
wind-up → peak → extension → recover swing:

| Key | Intent | Observed |
| --- | --- | --- |
| a0 | wind-up, sword behind shoulder | crouch / walk / two-handed behind head depending on seed; s104 loses the forward shield entirely |
| a1 | overhead peak | overhead-ish but weapon shape and handedness jump between seeds |
| a2 | full extension forward | blade replaced by baked-in **motion-blur smear** (effects — forbidden by the map Notes); garbled hilt/hands |

Same character, same motion: no.

## Mechanism takeaway

Instruction editing moves the figure, but pose entropy and identity drift are
not a denoise trade-off this time — they arrive together. That joins prompt-only
img2img (#19 path A) as a **dead keyframe mechanism**. No surveyed local route
retains a distinct keyframe attack.

## Map consequences

- [Settle the Character body-motion production route](https://github.com/jsbellamy/nightglass/issues/24) proceeds on **AutoSprite-vs-fallback**, with RIFE/FILM retained only as an assist for a hand-authored fallback — not as a rescue for generated keys.
- Do not spend further local GPU budget on Qwen pose-edit keyframes, Wan Fun-Control, or FLF2V for Character body motion unless the route decision in #24 explicitly reopens them.
- Static ComfyUI (#15) and `normalize_seq.py` remain valid and untouched.
