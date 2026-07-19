# The animation asset contract

Frozen by [#4](https://github.com/jsbellamy/nightglass/issues/4). Sits on top of
[the 32×48 acquisition contract](acquisition-contract.md) (#21, amended by #29), which owns
anchors, timings, validation, provenance, and deterministic build outputs — this
document does not restate or re-decide any of that.

Prototype and gates:
[`prototype/presentation-contract/`](../prototype/presentation-contract/)
(`verify.py`, seven gates, all passing).

## What this contract adds

#21 froze everything that did not depend on motion. #24 removed generated
Character body-motion. #20 settled effect derivation and composition. What was
left, and is settled here:

1. the **presentation vocabulary** — runtime transforms over frozen Characters
2. the **effect composition rules** — how effects anchor against a Character
3. the **source format** — how all of it is laid out and addressed

## The layer model

```
  effect layer      Ability effects, moonberry-glow, own canvas   <- #20
  ---------------------------------------------------------------
  body layer        frozen 32x48 Character, moonberry-16          <- #21
  ---------------------------------------------------------------
  mark layer        actor pool, moonberry-glow                    <- this doc
  ---------------------------------------------------------------
  Battle Tile       480x112 night-garden backdrop                 <- #1
```

The mark layer sits **under** the body so it reads as cast light rather than an
overlay. All three content layers composite over unmodified pixels; nothing in
this contract ever writes to a Character frame.

## Presentation vocabulary

A **presentation transform** is a deterministic runtime operation on an
unmodified Character frame, keyed to an effect manifest cue. Two invariants,
both gated:

- **Body-free.** A transform yields a blit offset or a new image. The canonical
  frame — on disk and in memory — is never mutated.
- **On-palette.** Recolour transforms map every opaque pixel to a `moonberry-16`
  member *by construction*, so a transformed body still passes the acquisition
  contract's embedded-effects validator. A transform cannot introduce an
  off-palette pixel, so #20's load-bearing palette disjointness survives here.

Everything is integer-pixel and integer-millisecond. At 32×48 inside a 480×112
tile there is no subpixel to have.

| Transform | Applies to | Parameters |
| --- | --- | --- |
| `lunge` | the acting Character | `ramp_ms 54`, `hold_ms 66`, `out_px 3`, `back_px -1`, `settle_ms 140` |
| `hurt` | the struck Character | `recoil_px 2`, `recoil_ms 90`, `flash_ms 60`, `flash_strength 0.6` |
| `downed` | a Knocked Out Character | `darken 0.5`, `drop_px 3` |

### `lunge` — and why it holds

`ramp_ms + hold_ms` **must equal** the effect's `impact_expected` cue (120 ms for
`knight_slash`), so the body's commitment and the blow's arrival are the same
instant. That coincidence is what ties actor to effect.

The **hold is load-bearing, and amplitude is not.** The first spec ramped
straight into the snap, putting the readable extreme in a single instant; at
#16's 30 fps budget the sampler lands on 0/33/66/99/132 ms and can miss it
outright. Sweeping `out_px` across 1–4 did not fix it because amplitude was
never the problem. A 66 ms hold guarantees **at least two drawn frames at full
extension regardless of phase**, which is what makes the pose legible.

The release is a single-frame **snap** to `back_px`, not a ramp: a symmetric ease
out and back reads as a hover, while snap-back reads as a strike that connected.

### `hurt` — flash strength is a budget, not a look

A full-silhouette whiteout (`flash_strength 1.0`) is the single most salient
event in the tile, so it drags the eye to the **victim** at exactly the instant
the player is supposed to be reading the **actor**. At `0.6` the hit stays
legible and the silhouette survives. Treat flash strength as attention budget
spent against attribution.

### Idle is hand-authored, and there is no transform for it

A whole-sprite vertical bob is **illegal**, and structurally so: it translates
the foot anchor, which is precisely the "Character slides vertically in the
Battle Tile" failure the acquisition contract's unstable-baseline rule exists to
catch. No amplitude or period makes it legal, because the illegal thing is
moving the baseline at all.

An idle micro-loop must keep the feet planted and move only the body above them.
That cannot be expressed as a blit offset — it needs different pixels. So idle is
**hand-authored (2–4 frames, returning exactly to the canonical anchor) or
absent**, exactly as #24 required. The presentation vocabulary has no idle
member.

The runtime owes an authored micro-loop one thing: **phase**. Identical loops
started in lockstep read as a chorus line, so each Formation slot carries a fixed
offset — front `0`, middle `533`, back `1066` ms.

### `downed`

The deterministic arm of #24's choice: darken every opaque pixel and re-snap to
the palette, plus a `drop_px` settle. This lets the slice ship four Classes
without four authored downed poses. A hand-authored downed pose remains
permitted and overrides the transform where one exists.

## Attribution

**The actor pool is the attribution channel.** With a melee blow drawn at the
target (#20), nothing on the attacker identified the actor; in the five-opponent
stress case the player could not attribute the action.

The pool is a soft ellipse at the acting Character's feet (`rx 11`, `ry 3`,
`dy 1`, `glow-mint`), drawn on the mark layer for the duration of the action.

Three candidates were rendered against each other at 1× with three concurrent
actors ([`review/CHANNEL_1x.png`](../prototype/presentation-contract/review/CHANNEL_1x.png)):

| Candidate | Verdict |
| --- | --- |
| lunge alone | Subtlest of the three; a pure motion cue, so it dies entirely under reduced motion. |
| 1 px actor bar | Legible, but reads as HUD chrome against #16's "diorama, not HUD". |
| **actor pool** | **Selected.** Equally legible, motion-free, and reads as lighting inside the scene. |

**The pool is required in both the motion and reduced-motion arms.** This is the
decisive property: reduced motion then subtracts only flavour, never
information, and there is one attribution channel to tune and test rather than
two. `lunge` and `hurt`'s flash ride on top in the motion arm as body
commitment — #24's "the fight feels alive" — not as the carrier of the fact.

## Reduced motion

Under #16's reduced-motion setting:

- **suppressed** — `lunge`, `hurt` recoil, `hurt` flash, and any authored idle
  micro-loop. The flash is suppressed as a *brightness flicker*, which is
  specifically what a reduced-motion/photosensitivity preference asks to be
  spared.
- **retained** — the actor pool, all effect assets, and `downed`.

Effect assets are retained because they are the game's information, not its
motion; a player who suppresses motion still needs to see what an Ability did.

## Effect composition rules

Carried forward unchanged from #20 — **do not re-derive**:

- One authored/generated **still** per effect; every frame derived by
  deterministic offline transform (`sweep`, `scale`, `fade`, `spin`). No effect
  is generated as a sequence.
- **Strike point** is `(0, −26)` from the 32×48 bottom-center foot anchor.
- Effects use **`moonberry-glow`**, disjoint from `moonberry-16`. Preserve the
  disjointness: it is what makes the embedded-effects validator catch a baked-in
  effect.
- Effects own a canvas independent of 32×48 and composite as separate layers.

### Anchor kinds — still exactly two

`strike_target` and `lane_travel`. `strike_self` remains unusable (#20).

#20 flagged that the Priest heal — upward, sustained, friendly-target — might
need a third kind. **It does not.** The rise is baked into a tall still and
revealed by **`band(lo, hi)`**, the linear analogue of #20's angular `sweep`. The
same trap is avoided for the same reason: the shape cannot change between frames
because it is the same pixels under a moving window.

So the vocabulary grows by **one cheap transform instead of an anchor kind** —
and `band` is the general answer for any directional reveal, not a heal special
case. The Hunter arrow needed nothing new at all, confirming `lane_travel` is
Class-agnostic rather than a Wizard special case.

**Friendly versus hostile targeting is a combat-layer concern, not an anchor
kind.** An anchor kind describes geometry; who is standing at that geometry is
decided upstream.

### The `band` transform

Keep only rows in `[lo, hi]`; nearest-neighbour, requantized, undithered, like
every other #20 transform. Measured: 2 source stills → 7 frames for the heal and
arrow pair.

## Source format

```
assets/
  characters/<class>/
    <class>.png                 canonical frozen 32x48 pose, moonberry-16
    idle_0.png .. idle_3.png    OPTIONAL hand-authored micro-loop
    downed.png                  OPTIONAL hand-authored pose; else use `downed`
    manifest.json               baseline_row, per-frame duration_ms + sha256
  effects/<ability>/
    source/<name>.png           the ONE authored/generated still
    <name>_0.png ..             derived frames, moonberry-glow
    manifest.json               frame_size, anchor, anchor_dx, strike_dy,
                                align_to, cues_ms, total_ms, frames[], source{}
  palettes/
    moonberry-16.json
    moonberry-glow.json
```

- **Addressing** is by directory identity — `characters/knight`,
  `effects/knight_slash` — never by filename pattern matching.
- **Presentation transform parameters are runtime configuration, not assets.**
  They describe how the renderer treats any Character, so they live with the
  renderer and are versioned with it. Only the `align_to` cue name crosses the
  boundary, and it is already carried in the effect manifest.
- **Raw bundles** (`grid_raw/*.png`, `*.source.json`) stay archived per #29 and
  are never shipped.
- Manifest timing format, provenance block, and validation gates are #21's
  unchanged.

## Known limits

- **Opponents are stand-ins** — flipped, darkened party sprites. The stress case
  answers "does this read against five bodies", not "against final opponent
  art". No opponent art exists.
- **Two of four Classes have real references.** Priest and Hunter were validated
  as *effect shapes* only; their Character references do not exist yet, so the
  Priest in every render is a stand-in.
- **The pool's cost in a crowded tile is untested at the limit.** Three
  concurrent actors read cleanly. Whether five simultaneous pools stay legible —
  or whether the pool needs to dim with concurrency — is not answered.
- **No authored idle micro-loop exists.** The contract specifies its shape and
  its phase offsets, but nothing has been authored against them, so "returns
  exactly to the canonical anchor" is a rule that has not yet been exercised.
- **`downed` is validated as a transform, not as a look.** Darkening reads as
  Knocked Out in isolation; it has not been judged against a tile where several
  Party Members are down at once.
