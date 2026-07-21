# ADR-0004: Flexible native body sprites

**Status:** Accepted  
**Date:** 2026-07-21

## Context

Nightglass Battlefield bodies must render at native **1×** with per-asset
geometry (`frame_size`, `visual_bounds`, `foot_anchor`) so the Battle Tile can
place combatants by foot anchor instead of shared size tiers (#250, #252).

Cursor **GenerateImage** raws are high-resolution opaque RGB on `#ff00ff`, not
logical-grid sheets. Prompting for exact block counts or safe-box dimensions was
unreliable: candidates clipped, overshot recovery gates, or failed pitch
confidence despite acceptable silhouettes.

The retired tier pipeline (`small` / `medium` / `large`) encoded a single
runtime canvas per tier and rejected proportional reduction. That model cannot
absorb variable provider scale while honoring role-specific opaque ceilings
(Party 40×68, ordinary Opponent 30×68, Boss 160×72).

## Decision

1. **Runtime is native and per-asset.** Each shipped body PNG is its own canvas
   size; manifest geometry is authoritative. No encounter-time rescaling.

2. **New acquisitions use a flexible normalizer** keyed by asset identity
   (`BodyProfile` from `layout.json`): chroma-key at tolerance 40 (ignoring only
   the Cursor stamp at `(0, height - 1)` during measurement), crop, proportional
   downscale to the role ceiling without enlargement or aspect distortion,
   quantize to `moonberry-16` without dithering, binarize alpha, bottom-centre,
   emit geometry.

3. **Archived tier raws rebuild through an internal `legacy-grid-v1` adapter**
   until a later asset wave reacquires them on the flexible path. That adapter
   reproduces committed runtime bytes byte-for-byte and backfills manifest
   geometry; it is not a public acquisition mode.

4. **Generated sources may be proportionally reduced** even when the provider
   image is much larger than the runtime ceiling. Exact logical-grid recovery is
   abandoned for new work; fit is validated on opaque `visual_bounds` against the
   role maxima in `src/assets/sprites/layout.json`.

## Consequences

- `pipeline/acquire.py` `measure` / `promote` are identity-driven (`--tag`);
  callers cannot override role ceilings.
- `npm run assets:verify` proves legacy byte identity and manifest geometry for
  every committed body.
- UI slices (#252+) consume manifest + layout anchors; legacy 32×48 runtimes
  remain valid interim geometry until reacquisition.
- Reacquiring an asset on the flexible path may change runtime dimensions and
  pixels; that is expected and requires a deliberate asset batch, not silent
  tier migration.
