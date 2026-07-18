# Research local ComfyUI production fit

Type: research
Status: resolved
Blocked by: none

## Question

What current ComfyUI models, workflows, custom nodes, licensing constraints,
reproducibility controls, animation and consistency techniques, hardware demands,
and export capabilities make a local RTX 5090 pipeline suitable—or unsuitable—as
the primary generator behind the project's vendor-neutral offline ingest boundary
for body-only Character motion and separate Ability effects normalized to the
32×48-at-1× Battle Tile contract?

## Answer

Conditional go. ComfyUI is the preferred first local acquisition workbench and
the stronger long-term platform candidate because the available RTX 5090 has
enough VRAM for the bounded baseline, workflows and raw outputs can be archived,
and the project can own its normalization and validation boundary. It is not yet
proven as the sole source for stable Character animation at 32×48, and it is a
no-go as a runtime, build-time, or direct-to-game dependency.

Run a core-first local trial with one weapon user and one caster before paying
for AutoSprite. Compare explicit pose-conditioned keyframes with a short native
Wan2.2 5B image-to-video route; use original-IP reference art, separate body
motion from Ability effects, evaluate controlled-background masks and BiRefNet
alpha, and review every result inside the real 480×112 Battle Tile at 1×. Freeze
and archive workflow JSON, seeds, ComfyUI and custom-node commits, environment
versions, exact model hashes and licenses, prompts, raw media, and the deterministic
normalizer manifest. Prefer core nodes, admit at most one reviewed and pinned
custom node in the first trial, and treat every model and node license as an
independent shipping gate.

Adopt ComfyUI as the primary acquisition source only if the trial passes identity,
handedness, baseline, alpha, motion, cleanup-budget, provenance, licensing, and
headless-ingest checks. Otherwise retain it for static references, keyframes, or
effects and run the capped AutoSprite comparison through the same provider-neutral
normalizer.

See [ComfyUI production-fit research](../../../docs/research/comfyui-production-fit.md).
