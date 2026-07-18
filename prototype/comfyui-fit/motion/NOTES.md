# ComfyUI Battle Tile proof-of-fit — Phase 2 (body motion)

Throwaway prototype answering
[#19 — Trial ComfyUI body-motion for the Knight and Wizard actions](https://github.com/jsbellamy/nightglass/issues/19).

Phase 1 ([#15](https://github.com/jsbellamy/nightglass/issues/15)) established the
canonical Knight (seed 103) and Wizard (seed 201) anchors and passed the **static**
gates. This phase asks whether those anchors drive readable **body-only** motion at
32×48 / 1× in the 480×112 Battle Tile.

## Verdict: **NO-GO for generated body motion — both paths.**

Neither path produced a usable action. The static GO from #15 stands and is
untouched; what fails is *motion*, not the generator.

## Path A — reference-conditioned keyframes

The ticket's original wording ("pose-conditioned key frames") assumed an OpenPose
ControlNet. Per the [constraint check on #19](https://github.com/jsbellamy/nightglass/issues/19#issuecomment-5013305972),
**every published FLUX pose ControlNet ships under `flux-1-dev-non-commercial-license`**
— a hard exclude under the commercial original-IP gate. Confirmed locally: this
install has **zero** ControlNet models. (Also confirmed: ComfyUI 0.28.0 core already
ships `SDPoseKeypointExtractor` / `SDPoseDrawKeypoints` / `SDPoseFaceBBoxes`, so the
`comfyui_controlnet_aux` custom-node gate would *not* have been reopened — good news
that does not rescue the path, since there is no commercially-licensed pose
ControlNet to apply.)

So path A was run the only clean way available: **img2img from the frozen anchor**,
fixed seed, varying only the pose clause ([`gen_a.py`](gen_a.py),
[`actions.py`](actions.py)). Denoise swept 0.40 → 1.00 on `knight/basic_attack`.

**Result: there is no usable operating point.** ([`review/sweep_knight_attack_hi.png`](review/sweep_knight_attack_hi.png))

| Denoise | Identity | Pose response |
| --- | --- | --- |
| 0.40 – 0.85 | perfect hold | **none** — all four pose clauses yield the same standing figure |
| 0.95 – 1.00 | **collapses** — shield emblem changes shape every frame (4-point star → cross → rosette), armour colours shift, helmet redesigns, scale and facing jump | varies, but *not* to the requested poses — no wind-up → swing → extension → recover arc, just unrelated standing variants |

The anchor's latent structure dominates until it is destroyed; identity and pose
range are never both available. Prompt-only pose control does not work at chibi
scale on this model.

## Path B — Wan2.2 TI2V-5B image-to-video

Apache-2.0, no license problem. Clip-level motion prompt from the same anchor,
resampled to 4/6/8 keyframes ([`gen_b.py`](gen_b.py)).

**Identity holds far better than path A** — across a full 25-frame idle the palette,
shield emblem, plume and armour stay coherent. That is the one genuine positive
result here. Everything else fails.

### Measured at source ([`metrics.py`](metrics.py), spans converted to 32×48 target px)

| Clip | baseline | lateral | scale creep | morph spikes | stalls |
| --- | --- | --- | --- | --- | --- |
| `knight_idle` | 0.48 | **2.12** | 0.24 (0.5%) | f005 60.8, f009 42.1, f013 31.2 (mean 11.6) | 3 |
| `wizard_idle` | 0.33 | 0.09 | 0.25 (0.5%) | none | none |
| `knight_basic_attack` | 0.39 | **3.00** | **3.78 (7.9%)** | 5 spikes, peak 81.7 (mean 18.1) | 2 |
| `knight_basic_attack` @native 704×1280 | 0.00 | 2.03 | 2.71 (5.7%) | 4 spikes, peak 51.7 | none |

Lateral drift of 2–3 px on a **32 px-wide** frame is 6–9% of frame width — plainly
visible sliding. Scale creep of 7.9% is the forbidden camera drift.

Running at the model's native 1280×704 **made identity worse, not better**: the
shield dissolves into a red pole by f009 and the Knight morphs into a bulkier
bare-torso creature ([`review/strip_knight_basic_attack_native.png`](review/strip_knight_basic_attack_native.png)) —
textbook weapon/limb morph. The off-distribution-resolution hypothesis is **refuted**.

`wizard_idle` is the only metrically clean clip — but its mean frame delta of 10.3
with no visible body motion is per-pixel **shimmer**, and visually it is a near-still
image (duplicate-frame stall). Clean because nothing happens.

### Measured after reduction to 32×48 (`postred.py`, the gate that actually decides)

Percentage of body pixels changing between consecutive reduced keyframes:

| Clip | per-frame body-pixel churn |
| --- | --- |
| `knight_idle_k8` | 20.3 → **69.4** → 48.5 → 33.6 → 7.1 → **1.6** → **1.7** |
| `knight_idle_k4` | **70.0** → 42.5 → 5.3 |
| `knight_basic_attack_k8` | 1.1 → **90.1** → **85.7** → 79.2 → 9.4 → **1.7** → 4.7 |

A breathing idle should move shoulders and chest — order 5–15%. **69–90% means the
character is being repainted frame to frame**, then falling to 1.6–1.7%, which is a
duplicate-frame stall. The signature is *blowout then freeze*, and both halves of it
are explicitly disqualified by #19. This churn **survives reduction**; it is not an
artefact the downscale removes.

No requested action was ever produced. The attack clip contains no sword wind-up or
swing at any resolution.

## What did work, and is worth keeping

[`normalize_seq.py`](normalize_seq.py) — a **sequence-aware** normalizer. Phase 1's
`normalize.py` autocrops and rescales each frame independently, which is correct for
one static reference and actively wrong for a sequence: it *manufactures* foot-slide
and size jitter by re-fitting every frame to its own bbox. The motion version derives
one scale (union bbox), one baseline (median bottom edge) and one x anchor (median
centroid) for the whole clip.

It works: after clip-wide anchoring, residual geometry is **left-edge span 2 px,
width span 0–3 px, top span 0–4 px**. The normalizer removes its own contribution to
drift cleanly, so what remains is the generator's. This design should carry forward
to whatever ultimately produces motion, and feeds
[#21](https://github.com/jsbellamy/nightglass/issues/21).

## Reading

- Path A sweep: [`review/sweep_knight_attack_hi.png`](review/sweep_knight_attack_hi.png)
- Path B clips: [`review/strip_knight_idle.png`](review/strip_knight_idle.png) ·
  [`review/strip_knight_basic_attack.png`](review/strip_knight_basic_attack.png) ·
  [`review/strip_knight_basic_attack_native.png`](review/strip_knight_basic_attack_native.png) ·
  [`review/strip_wizard_idle.png`](review/strip_wizard_idle.png)
- Reduced to contract: [`review/keys_knight_idle_k8.png`](review/keys_knight_idle_k8.png) ·
  [`review/tile_knight_idle_k8@2x.png`](review/tile_knight_idle_k8@2x.png) ·
  animated `review/anim_*.webp`

## Environment

ComfyUI 0.28.0, core nodes only, RTX 5090, per [#18](https://github.com/jsbellamy/nightglass/issues/18).
`flux1-schnell-fp8` (Apache-2.0) and `wan2.2_ti2v_5B_fp16` + `wan2.2_vae` +
`umt5_xxl_fp8_e4m3fn_scaled` (Apache-2.0). Every generation archives its exact
submitted workflow JSON beside the raw export. Path A ~2 s/frame; path B ~8–20 s per
25-frame clip.
