# ComfyUI Battle Tile proof-of-fit — Phase 1 (static gates)

Throwaway prototype answering part of
[#15 — Prototype ComfyUI at the Battle Tile contract](https://github.com/jsbellamy/nightglass/issues/15).

## Question this phase answers

Before committing to the full weapon-user/caster motion trial, does a frozen,
core-only local ComfyUI produce **static** Moonberry Character references that
survive reduction to a deterministic **32×48 RGBA** frame and read at 1× in the
480×112 Battle Tile — passing the identity, readability, alpha, license,
provenance, and headless-ingest gates? These are the gates that, per the
[production-fit research](../../docs/research/archive/comfyui-production-fit.md) decision
tree, can kill the whole approach on their own.

Scope deliberately excludes body motion (idle/attack/cast/hurt/knockout),
separate effects, repeatability across a stack change, and the ≤30-min
cleanup-per-action budget — those are the follow-up motion tickets.

## What was run

- **Generator:** local ComfyUI 0.28.0, `FLUX.1-schnell` fp8 (Apache-2.0), core
  nodes only, 512×768 (2:3, aspect-matched to 32×48), 4-step euler/simple,
  fixed seeds. Harness: [`gen.py`](gen.py) → `/prompt` → poll `/history` → copy
  `/view` output. 10 candidates (5 Knight, 5 Wizard) generated ~1.5 s each,
  fully headless.
- **Normalizer (project-owned, no ComfyUI):** [`normalize.py`](normalize.py) —
  per-image chroma-key of the controlled background → autocrop → bottom-center
  foot-anchor → pad to 32×48 → **nearest-neighbor** reduce. Deterministic from
  the archived raw PNG.
- **Review at contract scale:** [`tile.py`](tile.py) composites the normalized
  frames into the real 480×112 tile at 1× plus 6× checkerboard zooms →
  `normalized/REVIEW.png`. Contact sheet of all candidates →
  `normalized/CONTACT.png`.

## Canonical references chosen (HITL)

| Character | Seed | Raw anchor | 32×48 | Why |
| --- | --- | --- | --- | --- |
| Knight (weapon user) | 103 | `canonical/knight-canonical.png` | `canonical/knight-32x48.png` | Cleanest true right-facing profile; unambiguous sword-in-front-hand + berry shield handedness. |
| Wizard (caster) | 201 | `canonical/wizard-canonical.png` | `canonical/wizard-32x48.png` | Fullest mint/berry/cream balance; clear single-wand cast silhouette. |

These are **identity anchors** for reference-conditioned generation, not final
shipped art; they may still be refined before lock.

## Static-gate verdict

| Gate | Result | Evidence / caveat |
| --- | --- | --- |
| **Identity / art direction** | **PASS** | All candidates read unmistakably as Moonberry storybook chibi — plum contours, mint/berry/cream, leaf & stitched motifs. No Ragnarok resemblance observed. |
| **Readability @ 32×48 / 1×** | **CONDITIONAL PASS** | Bold silhouettes (helmet, plume, round shield, pointed hat, robe, wand-flame) read immediately in the tile. Thin features — the sword *blade*, facial detail — degrade; they need deliberate thickening/authoring, not runtime scaling. Satisfies the Sunsteel bold-contour legibility guardrail. |
| **Alpha** | **CONDITIONAL PASS** | Clean cutout achievable, but a *fixed* chroma constant failed: the controlled bg drifts per seed (corners (56,187,195)→(112,205,204)) and soft drop-shadow ellipses leave halo pixels. Fixed by **per-image** bg sampling + wider tolerance. Concrete answer to research open-question #6: naive fixed-key is too fragile; either per-image keying, prompt "no shadow", or BiRefNet is required. BiRefNet comparison deferred (weights not yet downloaded). |
| **License** | **PASS** | FLUX.1-schnell Apache-2.0 (commercial permitted, per setup #18 record); core GPL ComfyUI runs offline, never at build/runtime. |
| **Provenance** | **PASS** | Every generation archives its exact submitted workflow JSON (`raw/*.workflow.json`) + output SHA; model/version/seed pinned. Byte-identical normalization from the archived raw is reproducible without ComfyUI. |
| **Headless ingest** | **PASS** | 10/10 completed through queue/history/output endpoints with no UI, ~1.5 s each. |
| **Facing consistency** | **RISK NOTED** | Candidates skew 3/4; only disciplined seeds land strict right profile. Confirms the research's reference + **pose ControlNet** step is needed for per-action facing — feeds the motion phase, not a static blocker. |

## Decision

**Static fit is a GO** — the kill-gates (identity, readability, license,
provenance, headless ingest) pass; alpha is a solved-in-principle caveat. This
clears the approach to proceed into the motion trial. It does **not** yet earn
"primary local source" — that verdict needs the body-motion, effect-separation,
repeatability, and cleanup-budget gates, now spun out as follow-up tickets.
