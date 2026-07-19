# Separate Moonberry Ability effects — trial verdict

Answers [#20 — Trial separate Moonberry Ability effects](https://github.com/jsbellamy/nightglass/issues/20).
Throwaway prototype; fold the verdict and the composition rules forward into
[#4](https://github.com/jsbellamy/nightglass/issues/4), wipe the rest.

## Verdict: GO — effect-led combat feedback reads at 1×

The Knight slash/impact pair and the Wizard projectile/impact pair composite
over unmodified frozen Characters in the real 480×112 Battle Tile, read against
the five-opponent stress case, and pass determinism, separation, and body-free
gates. [#24](https://github.com/jsbellamy/nightglass/issues/24)'s effect-led
route is viable.

## The reframe that made it work

The ticket asked whether ComfyUI can produce effect *sequences*. It shouldn't be
asked to. Generating N frames of one effect reintroduces exactly the cross-frame
coherence failure that killed [#19](https://github.com/jsbellamy/nightglass/issues/19)
and [#26](https://github.com/jsbellamy/nightglass/issues/26) — three independently
generated crescents differ in curvature and thickness, and stitch into flicker.

Effects escape that trap in a way Characters never could, because **an effect has
no identity to preserve across frames — only a shape**. So:

> **One authored/generated still per effect; every frame derived from it by
> deterministic offline transform.**

Cross-frame coherence stops being a generation problem and becomes arithmetic —
the arc *cannot* change shape between frames, because it is the same pixels under
a mask sweep. Measured ratio this trial: **4 source stills → 13 frames (1:3.25)**.

That also means the generator is only ever asked for a single static still — the
one thing [#15](https://github.com/jsbellamy/nightglass/issues/15) already proved
core ComfyUI does well.

## Transforms (all nearest-neighbour, all requantized, no dithering)

| op | use |
| --- | --- |
| `sweep(lo,hi)` | reveal an angular window about a pivot — makes a swing travel |
| `scale(f)` | burst expansion |
| `fade(n)` | push each pixel `n` steps down its ramp; off the dim end → transparent |
| `spin(n)` | halo shimmer on the travelling bolt |

`fade` is the notable one: with binary alpha there is no opacity to animate, so
dimming is a *palette walk*, not an alpha ramp. It stays deterministic and stays
inside the approved ramp.

## `moonberry-glow` — a second palette, and why it must be second

Effects use [`palette_glow.json`](palette_glow.json), deliberately **disjoint**
from `moonberry-16`. Two reasons, one aesthetic and one structural:

- **Aesthetic:** `moonberry-16` is Character *pigment*. Effects drawn in it read
  as flying character debris, not light. The glow ramp reads as luminous against
  the night-garden gradient without needing soft alpha.
- **Structural — the important one:** the acquisition contract's embedded-effects
  validator rejects any Character frame containing a colour off `moonberry-16`.
  Because the glow ramp is disjoint, **that existing rule automatically catches
  an effect baked into a Character frame.** No new rule needed. Verified: all
  13 effect frames, composited onto the canonical Knight, are rejected — while
  the clean Knight frame still passes.

This closes the "known limit" recorded in `docs/acquisition-contract.md`, which
warned the palette check "would not catch an effect drawn entirely in approved
colours." Keeping the ramps disjoint is what makes that limit moot — it is now a
**constraint the effect palette must preserve**, not an accepted weakness.

## Composition rules (for #4)

- **Strike point** = the anchor every effect places against: `(0, −26)` from the
  Character's 32×48 bottom-center foot anchor. Mid-torso, not head or feet.
- **Two anchor kinds are sufficient:**
  - `strike_target` — slash, and both impacts
  - `lane_travel` — projectile, position lerped caster→target; the asset's own
    frames are a halo shimmer, not the travel
- **`strike_self` is not a usable anchor kind.** The first render placed the
  slash at the Knight's own strike point — ~200 px from the opponent rank, where
  it read as an unrelated flash. In a static-Formation idle game the melee
  attacker never closes distance, so **a melee blow must be drawn where it
  lands.** `anchor_dx` offsets the pivot so the crescent wraps the target's near
  face.
- Effects own a canvas independent of 32×48 (11×11 to 30×30 here) and are
  composited as separate layers over unmodified Character pixels.
- Manifests carry integer-ms `duration_ms` and a `cues_ms` entry keyed to the
  body manifest cue (`impact_expected`, `release_projectile`), matching the
  contract's timing format.

## Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| **Reads at 1× / five-opponent stress** | **PASS** | `review/STRESS_1x.png` — 8-step timeline, both actions concurrent, tile crowded. Slash arc, bolt flight, and both bursts all legible. |
| **Moonberry petal/halo language** | **PASS** | `review/IMPACT_6x.png` — discrete leaf-shaped spokes, mint/cream for weapon arcs, violet/berry for spell blooms. Not a generic radial flash. |
| **Body-free** | **PASS** | Character sprites re-hashed across 23 composites, unchanged; canonical files on disk unchanged. |
| **Separation enforced** | **PASS** | 13/13 effects baked into the Knight frame rejected by the existing validator; clean frame passes (control). |
| **Determinism** | **PASS** | 17 files rebuilt byte-identically from scratch, Pillow only, no generator. |
| **Cue alignment** | **PASS** | `impact_expected` @120 ms on the slash (frame 2); `release_projectile` @0 ms on the bolt. |

Reproduce: `verify.py`.

## Caveats and what this does NOT settle

- **Attribution is unsolved.** With the slash drawn at the target, *nothing at
  the Knight indicates he is the one attacking* — in a five-opponent tile the
  player cannot tell which Party Member acted. This makes #24's "optional
  one-pixel anticipation/recoil transform" **load-bearing rather than optional**.
  #4 must specify it. This is the single biggest open item.
- **Opponents are stand-ins** — flipped, darkened party sprites. No opponent art
  exists. The stress gate answers "does it read against five bodies", not "does
  it read against final opponent art".
- **Two of four Classes.** Priest (heal) and Hunter (arrow) are untested; a heal
  is an *upward, sustained, friendly-target* effect with no analogue here.
- **Reduced-motion alternative not prototyped** — required by
  [#16](https://github.com/jsbellamy/nightglass/issues/16)'s accessibility floor.
- **The ComfyUI arm was not run.** The GPU service was down, and the reframe
  reduced its role to producing single static stills — already proven in #15.
  Drop a generated still into `source/<name>.png` and the identical downstream
  pipeline runs. This is evidence *for* #22 but not a full generate-arm result.
- **Source stills here are procedurally authored**, which is hand-authoring with
  reproducibility, not painting. A pixel artist would likely beat them; the gate
  was readability, not final art.

## Run

```
/c/ComfyUI/venv/Scripts/python.exe author.py    # source stills -> source/
/c/ComfyUI/venv/Scripts/python.exe derive.py    # frames + manifest -> frames/
/c/ComfyUI/venv/Scripts/python.exe compose.py   # tile review -> review/
/c/ComfyUI/venv/Scripts/python.exe verify.py    # the three gates
```

## Incidental finding

`canonical/knight-32x48.png` and `canonical/wizard-32x48.png` are **stale phase-1
outputs that predate the frozen contract and fail its validator** (718 and 673
off-palette pixels — they were never quantized to `moonberry-16`). The
contract-valid frames are `runtime/knight_seed103.png` and
`runtime/wizard_seed201.png`. The stale pair is a live trap for the next session
and should be regenerated or deleted.
