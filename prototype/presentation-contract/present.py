"""PROTOTYPE presentation transform vocabulary — wipe me when #4 closes.

#20 left one thing unsolved: with a melee blow drawn at the TARGET, nothing at
the attacker says which Party Member acted. In the five-opponent stress case the
player cannot attribute the action. This module is the candidate answer —
the **deterministic presentation transform**: a runtime operation on an
unmodified Character frame, keyed to the effect manifest's cue.

Two hard properties, both asserted in verify.py:

1. **Never mutates Character pixels.** A transform returns a blit offset or a
   NEW image; the canonical 32x48 frame on disk and in memory is untouched.
   This is the same property #20 held, extended to the body layer.
2. **Stays on `moonberry-16`.** Recolour transforms (flash, downed) map each
   opaque pixel to a palette member by construction, so a transformed body
   still passes the acquisition contract's embedded-effects validator. A
   transform can never introduce an off-palette pixel, which means the
   `moonberry-16`/`moonberry-glow` disjointness #20 made load-bearing survives
   the presentation layer.

Everything here is integer-pixel and integer-millisecond. No easing curves, no
subpixel offsets — at 32x48 in a 480x112 tile there is no subpixel to have.
"""
import json
import pathlib

from PIL import Image

HERE = pathlib.Path(__file__).parent
PALETTE = json.loads((HERE.parent / "comfyui-fit" / "palette.json").read_text())
BODY_COLORS = [tuple(c["rgb"]) for c in PALETTE["colors"]]
BY_NAME = {c["name"]: tuple(c["rgb"]) for c in PALETTE["colors"]}


def nearest(rgb):
    return min(BODY_COLORS, key=lambda c: sum((a - b) ** 2 for a, b in zip(c, rgb)))


# --- attribution: lunge / recoil ---------------------------------------------
# The load-bearing one. Peak extension lands ON the effect manifest's
# `impact_expected` cue, so the body's commitment and the blow's arrival are the
# same instant -- that coincidence is what ties actor to effect.

LUNGE = {
    "ramp_ms": 54,      # rest -> full extension
    "hold_ms": 66,      # HOLD at full extension, ending exactly on the cue
    "out_px": 3,        # extension toward the target, in pixels
    "back_px": -1,      # overshoot behind rest on release
    "settle_ms": 140,   # recoil -> rest
}
# ramp_ms + hold_ms == the effect's `impact_expected` cue (120ms for knight_slash).
#
# The HOLD is the fix for the second review pass. The first spec ramped straight
# into the snap, so the readable extreme -- the whole attribution signal -- existed
# for a single instant. At #16's 30fps budget the sampler lands on 0/33/66/99/132ms
# and can miss it outright. A 66ms hold guarantees at least TWO drawn frames at
# full extension regardless of phase, which is what makes the pose legible rather
# than the amplitude.


def lunge_offset(t_ms, facing=1, spec=LUNGE):
    """Blit offset of an ACTING Character, t_ms into its action.

    Wind-up is a linear integer ramp out; the release is a single-frame SNAP to
    the overshoot, not a ramp. The snap is deliberate: a symmetric ease out and
    back reads as a hover, while snap-back reads as a strike that connected.
    """
    cue = spec["ramp_ms"] + spec["hold_ms"]
    if t_ms < 0 or t_ms >= cue + spec["settle_ms"]:
        return (0, 0)
    if t_ms < spec["ramp_ms"]:
        # round, not floor: floor never reaches out_px, which silently flattened
        # the whole transform to +-1px on the first render pass.
        return (int(round(t_ms * spec["out_px"] / spec["ramp_ms"])) * facing, 0)
    if t_ms < cue:
        return (spec["out_px"] * facing, 0)          # the hold
    frac = (t_ms - cue) / spec["settle_ms"]
    return (int(round(spec["back_px"] * (1 - frac) * facing)), 0)


# --- hurt: recoil + flash ----------------------------------------------------
# #24 specified hurt as deterministic recoil/flash rather than a repainted
# Character. Recoil is a blit offset AWAY from the attacker; flash is a
# whole-silhouette palette swap to `cream` for a single short beat.

HURT = {"recoil_px": 2, "recoil_ms": 90, "flash_ms": 60, "flash_strength": 0.6}


def hurt_offset(t_ms, facing=1, spec=HURT):
    """Struck Character is knocked back `recoil_px` then walks home."""
    if t_ms < 0 or t_ms >= spec["recoil_ms"]:
        return (0, 0)
    frac = 1 - (t_ms / spec["recoil_ms"])
    return (int(round(spec["recoil_px"] * frac)) * -facing, 0)


def flash(im, strength=None):
    """Push every opaque pixel toward `cream` by `strength`, then re-snap to the
    palette. On-palette by construction, binary alpha preserved.

    `strength=1.0` is a full-silhouette whiteout. The first review pass showed
    that is far too loud: it is the single most salient event in the tile, so it
    drags the eye to the VICTIM at exactly the instant the player is supposed to
    be reading the ACTOR. Lower strengths keep the hit legible while leaving
    attention budget for the attribution channel.
    """
    s = HURT["flash_strength"] if strength is None else strength
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    cr, cg, cb = BY_NAME["cream"]
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if not a:
                continue
            mixed = (r + (cr - r) * s, g + (cg - g) * s, b + (cb - b) * s)
            out.putpixel((x, y), (*nearest(tuple(int(v) for v in mixed)), 255))
    return out


# --- knockout: downed treatment ----------------------------------------------
# #24 allowed either one hand-authored downed pose OR a deterministic
# darken/tilt/fade. This is the deterministic arm, so the slice can ship four
# Classes without four authored downed poses.

DOWNED = {"darken": 0.5, "drop_px": 3}


def downed(im, spec=DOWNED):
    """Darken every opaque pixel, re-snapped to the palette. Stays on-palette."""
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if not a:
                continue
            dark = tuple(int(v * spec["darken"]) for v in (r, g, b))
            out.putpixel((x, y), (*nearest(dark), 255))
    return out


# --- idle micro-loop: NOT a transform ----------------------------------------
# This started as a zero-asset fallback -- a 1px whole-sprite vertical bob, so
# the slice could have an idle without authoring four micro-loops. The
# anchor-stable gate rejected it, and the rejection is structural rather than a
# tuning miss:
#
#   a whole-sprite vertical offset translates the FOOT ANCHOR.
#
# That is exactly the "Character slides vertically in the Battle Tile" failure
# the acquisition contract's unstable-baseline rule exists to catch. No
# amplitude or period makes it legal, because the illegal thing is moving the
# baseline at all. An idle micro-loop must keep the feet planted and move only
# the body above them, which cannot be expressed as a blit offset -- it needs
# different pixels.
#
# So: idle is HAND-AUTHORED or absent, exactly as #24 specified, and there is no
# transform substitute. The presentation vocabulary has no idle member.
#
# The one thing the runtime owes an authored micro-loop is PHASE: identical
# loops started in lockstep across three Party Members read as a marching chorus
# line. Each Character gets a fixed per-slot phase offset so the Formation
# breathes out of step.

IDLE_PHASE_BY_SLOT_MS = {"front": 0, "middle": 533, "back": 1066}


# --- reduced motion ----------------------------------------------------------
# #16's accessibility floor requires a reduced-motion alternative. Under reduced
# motion EVERY positional transform above is suppressed -- which deletes the
# attribution channel entirely. So reduced motion is not "the same thing, less"
# it needs its own attribution channel that carries no motion at all:
#
#   a static 1px ACTOR BAR under the acting Character, on for the whole action.
#
# Drawn in `glow-cream` (moonberry-glow), so it is an effect-layer mark and the
# palette disjointness still holds. Flash is ALSO suppressed -- a brightness
# flicker is exactly what a reduced-motion/photosensitivity setting is asking to
# be spared -- and is replaced by the same bar under the struck Character.

ACTOR_BAR = {"rgb": (255, 233, 168), "height_px": 1, "inset_px": 6}


def actor_bar_rect(foot, sprite_w, spec=ACTOR_BAR):
    x0 = foot[0] - sprite_w // 2 + spec["inset_px"]
    x1 = foot[0] + sprite_w // 2 - spec["inset_px"]
    return [x0, foot[1] + 1, x1, foot[1] + spec["height_px"]]


# A diorama-styled alternative to the actor bar. #16 chose "diorama, not HUD",
# and a 1px underline reads as UI chrome. A soft glow POOL at the feet reads as
# lighting inside the scene instead -- the same motion-free attribution channel,
# styled as part of the world. Drawn in moonberry-glow, effect layer, so the
# palette disjointness still holds.
ACTOR_POOL = {"rgb": (111, 227, 173), "rx": 11, "ry": 3, "dy": 1}


def actor_pool_ellipse(foot, spec=ACTOR_POOL):
    return [foot[0] - spec["rx"], foot[1] + spec["dy"] - spec["ry"],
            foot[0] + spec["rx"], foot[1] + spec["dy"] + spec["ry"]]
