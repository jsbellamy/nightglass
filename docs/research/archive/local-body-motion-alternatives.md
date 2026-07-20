# Local body-motion alternatives after the #19 no-go

Research snapshot: 2026-07-18

## Question

With FLUX.1-schnell img2img keyframes and Wan2.2 TI2V-5B image-to-video both
rejected for Character body motion
([#19](https://github.com/jsbellamy/nightglass/issues/19)), what other
locally-hostable generation routes could plausibly produce body-only `idle` /
`basic_attack` / `cast` / `hurt` / `knockout` motion for 32×48-at-1× chibi
pixel-art sprites on a single RTX 5090 (32 GB), and which if any merit one
bounded trial?

Every candidate is assessed against four hard gates:

1. **Commercial license as published** on the artifact's own hosting page —
   base weights and every control/adapter/auxiliary weight.
2. **Local offline execution** on one RTX 5090, behind the frozen acquisition
   pipeline; no API/cloud dependency.
3. **A conditioning story that structurally beats the #19 failure mechanism**
   (prompt-only pose control ignored-then-identity-collapse on the keyframe
   route; repaint-then-stall with no requested action on the video route).
   Another plain T2V/I2V model is not interesting.
4. **Execution surface**: core ComfyUI 0.28.0 (custom node packs are a
   security gate per #14), or a standalone script/diffusers pipeline
   (acceptable), or custom-nodes-required (flagged).

## Recommendation

**Three candidates clear all four gates. One bounded RTX 5090 trial is
justified, and it should start with Qwen-Image-Edit-2511.**

Ranked shortlist:

1. **Qwen-Image-Edit-2511 pose-edit keyframes** (Apache-2.0, 20B, core
   ComfyUI). Instruction-driven editing of the frozen anchor — "same character,
   arm raised in a sword wind-up" — with identity preservation *trained into
   the model* rather than negotiated through denoise strength. This attacks the
   exact Path A failure: pose change and identity hold were never
   simultaneously available in schnell img2img; an edit model's whole objective
   is to change what the instruction says and preserve everything else. The
   2511 release notes explicitly claim improved character consistency and
   reduced image drift, and 2509 explicitly lists "pose transformations" with
   identity preservation and native keypoint-map conditioning (hand-drawn chibi
   skeletons, no pose estimator needed).
2. **Wan2.2-Fun-A14B-Control** (Apache-2.0, core ComfyUI native). Reference
   image + a *control video* (pose skeleton, canny, depth, or trajectory)
   authored at chibi proportions. This attacks the Path B failure by taking
   motion authorship away from the model: frame-to-frame change is dictated by
   the control track, so repaint-then-stall and "requested action never
   produced" are both structurally addressed. Canny/depth control tracks avoid
   the chibi pose-estimator problem entirely because they are drawn, not
   estimated.
3. **Deterministic inbetweening between hand-authored keys — RIFE (MIT) or
   FILM (Apache-2.0)**, standalone scripts. Not a full route on its own (keys
   are still authored), but a zero-license-risk generative assist that turns
   "hand-author 5 actions × N frames" into "hand-author 2–3 keys per action".
   It also pairs with route 1: if Qwen-Image-Edit produces clean keyframes,
   RIFE/FILM (or Wan2.1-FLF2V-14B, also Apache-2.0 and core-ComfyUI) finishes
   the clip.

**The one bounded trial**: run Qwen-Image-Edit-2511 (fp8, core ComfyUI
workflow) on the frozen knight anchor with the same four `basic_attack` pose
clauses that produced zero pose response in #19, plus `hurt` and `knockout`
single-pose edits. Gate it exactly as #19 was gated: does a requested pose
appear *at all*, and does the shield emblem / palette / helmet survive
reduction to 32×48? That is a few dozen image generations — hours, not days.
Only if keyframes pass does interpolation (shortlist 3, or Fun-Control /
FLF2V) get spent on. If the Qwen trial fails the pose-response gate the way
schnell did, no surveyed local route is left with a distinct mechanism for the
keyframe attack, and the route decision can proceed on AutoSprite-vs-fallback
with RIFE/FILM retained as an assist for the hand-authored fallback.

## Shortlisted candidates

### 1. Qwen-Image-Edit-2511 (image edit route → keyframes)

- **Link**: <https://huggingface.co/Qwen/Qwen-Image-Edit-2511> (current
  version, Dec 2025); prior <https://huggingface.co/Qwen/Qwen-Image-Edit-2509>
- **License**: `apache-2.0` tag on both model cards, verified 2026-07-18.
- **Hardware fit**: 20B DiT + Qwen2.5-VL-7B text encoder. The official ComfyUI
  workflow ships fp8 checkpoints (`qwen_image_edit_fp8_e4m3fn.safetensors`,
  `qwen_2.5_vl_7b_fp8_scaled.safetensors`) which fit a 32 GB 5090 with ComfyUI
  offloading; a 4-step Lightning LoRA is optional
  (<https://docs.comfy.org/tutorials/image/qwen/qwen-image-edit>).
- **Conditioning story vs #19**: Path A failed because a *generation* model
  conditioned on the anchor latent suppresses the pose clause until the latent
  is destroyed. An *edit* model is trained on (image, instruction, edited
  image) triples — identity preservation and instructed change are the
  training objective, not a denoise-strength trade-off. 2509's card explicitly
  lists person "pose transformations" with identity preservation and native
  ControlNet-style conditioning on "depth maps, edge maps, keypoint maps"
  (hand-drawable at chibi proportions); 2511 adds "mitigate image drift,
  improved character consistency"
  (<https://huggingface.co/Qwen/Qwen-Image-Edit-2509>,
  <https://huggingface.co/Qwen/Qwen-Image-Edit-2511>).
- **Execution surface**: core ComfyUI, no custom nodes
  (<https://docs.comfy.org/tutorials/image/qwen/qwen-image-edit>); diffusers
  pipeline also available.
- **Verdict**: **Shortlist, rank 1.** Cheapest trial, directly attacks the
  decisive failure, cleanest license, cleanest surface.

### 2. Wan2.2-Fun-A14B-Control (controlled video route)

- **Link**: <https://huggingface.co/alibaba-pai/Wan2.2-Fun-A14B-Control>
- **License**: `apache-2.0` tag on the model card, verified 2026-07-18. The
  control capability is *in* these weights — no separate ControlNet artifact
  with its own license, which is what killed the FLUX route.
- **Hardware fit**: A14B two-expert layout, ~64 GB bf16 on disk; the card's own
  memory-saving guidance (CPU offload + float8) lists verified runs on 24 GB
  RTX 3090, so a 32 GB 5090 is comfortable with offload/fp8.
- **Conditioning story vs #19**: reference image for identity plus a
  frame-by-frame control video (Canny / Depth / OpenPose / MLSD / trajectory).
  #19's repaint-then-stall happened because the model authored the motion; here
  the motion is authored by us and the model only renders it. A hand-drawn
  canny or skeleton track at chibi proportions sidesteps the pose-estimator
  problem the #19 constraint check flagged. Start–end frame prediction is also
  supported.
- **Execution surface**: Wan Fun Control is natively supported in core ComfyUI
  (<https://docs.comfy.org/tutorials/video/wan/fun-control>); standalone
  VideoX-Fun scripts exist as fallback.
- **Verdict**: **Shortlist, rank 2.** Heavier trial than rank 1 (control
  tracks must be authored first); run only if the keyframe route fails or
  produces keys that interpolation can't bridge.

### 3. RIFE / FILM deterministic inbetweening (generative assist)

- **Links**: RIFE <https://github.com/hzwer/ECCV2022-RIFE> (MIT); FILM
  <https://github.com/google-research/frame-interpolation> (Apache-2.0,
  weights distributed by the project under the same repo).
- **Hardware fit**: trivial — RIFE runs 30+ FPS at 720p on a 2080 Ti.
- **Conditioning story vs #19**: no generation at all — optical-flow
  interpolation between hand-authored (or Qwen-edited) keys. Identity cannot
  drift because nothing is repainted; motion cannot stall because timing is
  chosen. The open risk is the opposite one: flow interpolators built for
  photographic footage may smear flat-color pixel art, so interpolate at 4×
  scale-up and re-quantize on reduction.
- **Execution surface**: standalone scripts (acceptable per gate 4); not
  ComfyUI at all.
- **Verdict**: **Shortlist, rank 3 / companion.** Not a standalone answer to
  "generated body motion", but it upgrades both the hand-authored fallback and
  a successful keyframe route.

Adjacent, clean, but dominated: **Wan2.1-FLF2V-14B**
(<https://huggingface.co/Wan-AI/Wan2.1-FLF2V-14B-720P>, `apache-2.0`, core
ComfyUI via `WanFirstLastFrameToVideo`,
<https://docs.comfy.org/tutorials/video/wan/wan-flf>) interpolates between two
authored endpoint frames. Conditioning on both endpoints is structurally
different from the rejected I2V (the model cannot stall — it must reach the
last frame), but the in-between content still comes from the same Wan temporal
prior that churned 69–90% of body pixels, and its card warns it is trained at
720×1280 with poor behaviour at small sizes. Keep as a variant to try inside
the rank-2/3 budget, not a separate trial.

## Excluded candidates

### License hard-excludes (gate 1)

| Candidate | Published license (verified) | Note |
| --- | --- | --- |
| All known FLUX pose ControlNets (Shakker-Labs Union-Pro-2.0, InstantX Union, XLabs) | `flux-1-dev-non-commercial-license` on each publisher's own card | Settled in [#19](https://github.com/jsbellamy/nightglass/issues/19); unchanged. |
| [thibaud/controlnet-openpose-sdxl-1.0](https://huggingface.co/thibaud/controlnet-openpose-sdxl-1.0) | tag `other` — "License: refers to the OpenPose's one" | CMU OpenPose terms are non-commercial → the SDXL openpose route inherits a hard exclude. |
| [MusePose](https://github.com/TMElyralab/MusePose) | code MIT; **trained models "non-commercial research purposes only"** per its own disclaimer | Also DWPose-driven (chibi-hostile). |
| [MimicMotion](https://huggingface.co/tencent/MimicMotion) | tag `other`, custom LICENSE/NOTICE; fine-tuned from Stable Video Diffusion (Stability community terms, not on the permissive list) | Also DWPose-driven. |
| [StableAnimator](https://github.com/Francis-Rings/StableAnimator) | repo MIT, but built on SVD weights (Stability community license) | SVD taint + DWPose skeletons. |
| [Framer](https://github.com/aim-uofa/Framer) | 2-clause BSD *for academic use*; "contact ... for commercial purposes" | Classic contact-us exclude; SVD-based besides. |
| [LTX-Video](https://huggingface.co/Lightricks/LTX-Video) | custom "LTX-Video-Open-Weights-License" (0.9.6+), earlier versions proprietary | Custom, version-varying commercial terms — not on the permissive list. |
| [HunyuanVideo](https://huggingface.co/tencent/HunyuanVideo) | tag `tencent-hunyuan-community` (custom community license) | Custom license with territory/scale carve-outs; also no permissive control story. |
| [CogVideoX-5b](https://huggingface.co/zai-org/CogVideoX-5b) | tag `other`, custom "CogVideoX LICENSE" | The Apache-2.0 CogVideoX-2b is a plain T2V — fails gate 3 anyway. |

### Mechanism / fit excludes (gates 3–4)

- **[Wan2.2-Animate-14B](https://huggingface.co/Wan-AI/Wan2.2-Animate-14B)** —
  Apache-2.0 (LICENSE.txt verified), the one AnimateAnyone-class model that
  passes the license gate. Excluded on fit: it animates a character from a
  **driving video of a real human** via skeleton retargeting, and the official
  ComfyUI path preprocesses that video with the DWPose Estimator from
  `comfyui_controlnet_aux` — a custom node pack (#14 gate); the core-only
  workflow is documented as "incomplete; you need to preprocess the image by
  yourself" (<https://docs.comfy.org/tutorials/video/wan/wan2-2-animate>).
  Human-proportioned skeleton retargeting onto a 32×48 oversized-head chibi is
  exactly the estimator mismatch #19 flagged. Revisit only if a hand-built
  chibi skeleton track is proven feedable.
- **[ToonCrafter](https://github.com/Doubiiu/ToonCrafter)** — Apache-2.0 on
  both the [HF weights](https://huggingface.co/Doubiiu/ToonCrafter) and repo,
  so it *passes* the license gate, and cartoon inbetweening is on-mechanism.
  Excluded as dominated: fixed 512×320 / 16-frame output, self-described
  "open-source research exploration", SD-era backbone, and no core-ComfyUI
  path (custom wrapper nodes or standalone). Everything it offers, FLF2V or
  RIFE/FILM offers with a better surface.
- **[Wan-Move](https://github.com/ali-vilab/Wan-Move)** — Apache-2.0 per the
  project; weights hosted at
  <https://huggingface.co/Ruihang/Wan-Move-14B-480P> (personal namespace —
  provenance would need pinning). Point-trajectory control moves *elements
  along paths*; it does not articulate limbs into a sword swing, so it attacks
  drift, not the "requested action never produced" failure. Standalone Wan2.1
  codebase, no core-ComfyUI support. Dominated by Fun-Control, which includes
  trajectory among its modes.
- **SD1.5 + openpose ControlNet + pixel-art checkpoint** —
  [sd-legacy/stable-diffusion-v1-5](https://huggingface.co/sd-legacy/stable-diffusion-v1-5)
  is `creativeml-openrail-m` (royalty-free commercial use with use-based
  restrictions) and
  [lllyasviel/control_v11p_sd15_openpose](https://huggingface.co/lllyasviel/control_v11p_sd15_openpose)
  is `openrail`, so a commercially usable pose-controlled stack *does* exist
  here — the only one in the survey with a dedicated pose ControlNet. Excluded
  anyway: identity for a specific original character requires per-character
  LoRA training or IP-Adapter-class reference conditioning (reference
  conditioning in ComfyUI means custom node packs; community pixel-art
  checkpoints/LoRAs each need their own license audit), and 2022-era SD1.5
  fidelity at chibi scale is a step down from the FLUX/Qwen quality already
  proven statically in #15. High-effort, low-ceiling; reconsider only if both
  shortlist routes fail and per-character LoRA training is on the table.
- **Any further plain T2V/I2V model** (Mochi, Allegro, HunyuanVideo 1.5,
  etc.) — same shape as the rejected Path B with no reference/pose/keyframe
  conditioning story; fails gate 3 regardless of license.

## Trial protocol for the rank-1 candidate

Bounded to one day of GPU time, reusing the #19 harness
(`prototype/comfyui-fit/motion/`, `metrics.py`, `normalize_seq.py`):

1. Load the core-ComfyUI Qwen-Image-Edit workflow with
   `qwen_image_edit_fp8_e4m3fn` + fp8 text encoder (2511 weights if the fp8
   repack is in the frozen mirror, else 2509).
2. Inputs: the frozen knight anchor. Instructions: the four `basic_attack`
   pose clauses from #19 rephrased as edits ("same character, wind up the
   sword behind the shoulder", …), plus one `hurt` recoil and one `knockout`
   prone edit. Fixed seed, 3 seeds per instruction.
3. Gates, in order: (a) **pose response** — does the requested pose appear at
   all (the schnell route scored zero here); (b) **identity hold** — shield
   emblem shape, palette, helmet, scale, facing unchanged, judged after
   reduction to 32×48; (c) **cross-frame coherence** — do the four attack
   keys read as one character in one motion after `normalize_seq.py`
   anchoring.
4. Pass → spend the remaining budget interpolating the keys (RIFE and FILM at
   4× scale, and one FLF2V/Fun-Control run for comparison) and re-run the #19
   churn metrics on the reduced clip. Fail at (a) → record that
   instruction-based editing joins prompt-only img2img as a dead keyframe
   mechanism, and hand the decision to
   [#24](https://github.com/jsbellamy/nightglass/issues/24) as
   AutoSprite-vs-fallback, with RIFE/FILM noted as a fallback assist.

## Sources

- Issue #19 findings and resolution: <https://github.com/jsbellamy/nightglass/issues/19>
- Qwen-Image-Edit-2509 / 2511 cards: <https://huggingface.co/Qwen/Qwen-Image-Edit-2509>, <https://huggingface.co/Qwen/Qwen-Image-Edit-2511>
- ComfyUI native Qwen-Image-Edit workflow: <https://docs.comfy.org/tutorials/image/qwen/qwen-image-edit>
- Wan2.2-Fun-A14B-Control card: <https://huggingface.co/alibaba-pai/Wan2.2-Fun-A14B-Control>
- ComfyUI native Wan Fun Control workflow: <https://docs.comfy.org/tutorials/video/wan/fun-control>
- Wan2.1-FLF2V-14B-720P card: <https://huggingface.co/Wan-AI/Wan2.1-FLF2V-14B-720P>
- ComfyUI native FLF workflow: <https://docs.comfy.org/tutorials/video/wan/wan-flf>
- Wan2.1-VACE-14B card (Apache-2.0, reference+control editing; not shortlisted but clean): <https://huggingface.co/Wan-AI/Wan2.1-VACE-14B>
- Wan2.2-Animate-14B card and ComfyUI tutorial: <https://huggingface.co/Wan-AI/Wan2.2-Animate-14B>, <https://docs.comfy.org/tutorials/video/wan/wan2-2-animate>
- RIFE: <https://github.com/hzwer/ECCV2022-RIFE> · FILM: <https://github.com/google-research/frame-interpolation>
- ToonCrafter: <https://github.com/Doubiiu/ToonCrafter>, <https://huggingface.co/Doubiiu/ToonCrafter>
- MimicMotion: <https://huggingface.co/tencent/MimicMotion> · MusePose: <https://github.com/TMElyralab/MusePose> · StableAnimator: <https://github.com/Francis-Rings/StableAnimator> · Framer: <https://github.com/aim-uofa/Framer>
- LTX-Video: <https://huggingface.co/Lightricks/LTX-Video> · HunyuanVideo: <https://huggingface.co/tencent/HunyuanVideo> · CogVideoX-5b: <https://huggingface.co/zai-org/CogVideoX-5b>
- Wan-Move: <https://github.com/ali-vilab/Wan-Move>, <https://huggingface.co/Ruihang/Wan-Move-14B-480P>
- SD1.5 / openpose ControlNet: <https://huggingface.co/sd-legacy/stable-diffusion-v1-5>, <https://huggingface.co/lllyasviel/control_v11p_sd15_openpose> · thibaud SDXL openpose: <https://huggingface.co/thibaud/controlnet-openpose-sdxl-1.0>
