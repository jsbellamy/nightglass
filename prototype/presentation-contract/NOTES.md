# Presentation layer — prototype verdict

Answers [#4 — Define the animation asset contract](https://github.com/jsbellamy/nightglass/issues/4).
Throwaway prototype; the settled result lives in
[`docs/animation-contract.md`](../../docs/animation-contract.md). Wipe the rest.

## Verdict: the actor pool is the attribution channel, in both arms

#20 handed this ticket one unsolved problem: with the blow drawn at the target,
nothing identified the actor. The answer is **not** the anticipation transform
#24 anticipated and #20 promoted to required — or rather, not *only* that.

## What the review passes actually found

**Pass 1 — the lunge did not read, and the flash was why (partly).** At
`out_px 2` the Knight's displacement was invisible at 1×, while the hurt flash —
a full-silhouette cream whiteout — was the loudest event in the tile and pulled
the eye to the victim. Meanwhile the reduced-motion *fallback*, a 1 px actor bar,
attributed better than the motion channel it was meant to stand in for.

**Pass 2 — the real defect was the missing hold, not the amplitude.** Sweeping
`out_px` 1→4 barely helped. The `dx` samples exposed why: a linear ramp that
snaps at the cue puts full extension in a single instant, and at 30 fps the
sampler can skip it entirely. Adding a 66 ms hold gives **two drawn frames at
full extension at any phase** and the lunge became legible at `out_px 3`.
Damping the flash to `0.6` gave back the attention it was stealing.

**Pass 3 — the bar's only objection was styling, so restyle it.** The bar lost
to "#16 said diorama, not HUD". But that objects to *chrome*, not to the
channel. A feet-glow **pool** is the same motion-free signal styled as light
inside the scene. It won on the merits:
[`review/CHANNEL_1x.png`](review/CHANNEL_1x.png).

The decisive argument for the pool is not legibility, where it merely ties the
tuned lunge. It is that **the same channel works in both arms** — so reduced
motion subtracts only flavour, and there is one channel to tune rather than two,
with the accessibility arm no longer getting the untested one.

## Two clean wins, no new anchor kind

- **Priest heal needs no third anchor kind.** Bake the upward rise into a tall
  still and reveal it with `band(lo, hi)` — the linear analogue of #20's angular
  `sweep`. `strike_target` still works. The vocabulary grows by one cheap
  transform instead of an anchor kind, and `band` generalizes to any directional
  reveal.
- **Hunter arrow needed nothing at all**, confirming `lane_travel` is
  Class-agnostic rather than a Wizard special case.

## The one thing that was rejected outright

**A whole-sprite idle bob is illegal.** The anchor-stable gate caught it, and the
rejection is structural: a vertical offset translates the foot anchor, which is
exactly the "Character slides vertically" failure the acquisition contract's
unstable-baseline rule exists to catch. No tuning makes it legal. Idle must be
hand-authored with the feet planted — which independently confirms #24's
instinct — and the presentation vocabulary has **no idle member**.

## Gates

`verify.py`, all seven passing.

| Gate | Result |
| --- | --- |
| body-free | PASS — 8 sprites unchanged across 87 composites; canonical file on disk unchanged |
| on-palette | PASS — `flash` at 1.0/0.6/0.35 and `downed` introduce 0 off-palette colours |
| disjoint | PASS — pool and bar are `moonberry-glow` members, touch no `moonberry-16` colour |
| deterministic | PASS — 17 tile renders byte-identical, Pillow only, no generator |
| anchor-stable | PASS — every transform returns to (0,0); no whole-sprite vertical transform exists |
| cue-aligned | PASS — lunge holds to 120 ms; `knight_slash impact_expected` = 120 ms |
| 30fps-legible | PASS — 2 frames at full extension at the worst sampling phase (was 0–1) |

## Caveats

- **Opponents and the Priest are stand-ins** (flipped/darkened party sprites).
  No opponent art and no Priest reference exist.
- **Three concurrent actors, not five.** Whether five simultaneous pools stay
  legible, or need to dim with concurrency, is untested.
- **No authored idle micro-loop exists** — the contract specifies its shape and
  phase offsets, but nothing has been authored against them.
- **`downed` judged in isolation**, not against a tile with several Party
  Members down at once.
- **Filmstrips are biased against motion cues.** That bias is what made pass 1
  read as "the lunge fails"; the GIFs exist to correct it. Judge motion in
  `ARM_*.gif`, not in the strips.

## Run

```
python3 author_extra.py   # heal + arrow stills and frames
python3 compose.py        # review sheets -> review/
python3 -c "import compose; compose.gifs()"   # 30fps arms
python3 verify.py         # the seven gates
```

## Review assets

| File | Shows |
| --- | --- |
| `review/CHANNEL_1x.png` | **the decision** — lunge vs bar vs pool at 1× |
| `review/ARM_full.gif` / `ARM_reduced.gif` / `ARM_none.gif` | the three arms at 30 fps |
| `review/RETUNE_FLASH_1x.png` | flash strength sweep 1.0 → 0.2 |
| `review/RETUNE_LUNGE_1x.png` | lunge amplitude sweep with the flash damped |
| `review/HEAL_6x.png` | the `band`-revealed heal on `strike_target` |
| `review/ATTRIBUTION_1x.png` / `REDUCED_1x.png` / `CONTROL_1x.png` | arms as filmstrips |
