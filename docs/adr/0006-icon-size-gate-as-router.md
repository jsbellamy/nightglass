# ADR-0006: Icon size gate as router

**Status:** Accepted  
**Date:** 2026-07-23

## Context

`recover_icon_grid` treated overshoot (`grid > MAX_BODY`) and underfill
(`long_axis < MIN_LONG_AXIS`) as hard `ValueError` rejects, and acquisition docs
encoded a 26–30 long-side preference that drove reprompts on candidates that
already passed every other deterministic gate. Provider generation cannot
reliably hit a ~4-cell target inside a 32-cell grid with two-cell edge
clearance, so icon acquisition burned ~4 candidates per icon (tails 6–9) on
size alone — see candidate tables under
`docs/research/evidence/character-ability-icons-knight/`.

Hard rejects for raw-gate, clip, pitch, and off-ramp remain correct. Size was
the only outcome that had become a reject authority instead of a routing signal.

The standing acquisition rule “never resize a failed candidate into acceptance”
still forbids upscaling a soft generation or resizing past a hard gate. It does
not distinguish downscaling a **gate-clean** recovered logical grid so the
structural outline ring still fits `DRAWABLE`.

## Decision

Icon size judgment moves from the deterministic gate to the single step-6
visual review:

1. **Overshoot** — when the recovered compact grid exceeds `MAX_BODY` on either
   axis, nearest-neighbour **downscale-to-fit** that grid (preserving aspect
   ratio) so both axes are `<= MAX_BODY`, annotate
   `meta["fit"] = {from, to, reason: "overshoot"}`, and advance. Do not raise.
2. **Underfill / thin** — when `long_axis < MIN_LONG_AXIS`, set
   `meta["size_review"] = "thin"` and advance. `MIN_LONG_AXIS` is only a
   review-annotation threshold, never a reject.
3. **Step 6** explicitly asks whether fit/scale reduced clarity or intent of
   the intended read for fitted/thin icons, and review-driven retries re-review
   on a mini-composite of only the changed icon(s).
4. Downscale-to-fit of a gate-clean recovered grid is a permitted, explicit
   exception to “never resize a failed candidate into acceptance.” Never
   upscale a soft/underfilled generation into an accepted source.

`MAX_BODY`, `CANVAS`, `DRAWABLE`, and `RING` values are unchanged. Runtime
canvas geometry is unchanged. In-band committed sources that already recover
within `MAX_BODY` rebuild byte-identical.

## Consequences

- `pipeline/icons/ingest.py` `recover_icon_grid` is the single choke point;
  named-palette and source-local callers surface `fit` / `size_review` in
  ingest reports without signature changes.
- Acquisition docs delete the underfill-reject row and the 26–30 preference
  language; overshoot becomes auto-fit advance.
- `docs/icon-contract.md` marks `MAX_BODY` as a fit target and `MIN_LONG_AXIS`
  as a review-annotation threshold.
- Fixture coverage: overshoot-fit paints after fit; thin advances with
  annotation; pitch and off-ramp fail fixtures still reject. Raw-gate and
  clip continue to raise in `recover_icon_grid` (unchanged call sites; no
  new icon fixtures for those paths).
