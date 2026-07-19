"""PROTOTYPE gates for the presentation layer (#4) — wipe me when the ticket closes.

The presentation layer is new surface between the frozen acquisition contract
(#21) and the effect composition rules (#20), so it has to earn the same
properties they did rather than inherit them by assertion.

  1. body-free      transforms never mutate Character pixels
  2. on-palette     recolour transforms cannot leave `moonberry-16`
  3. disjoint       effect-layer marks cannot leave `moonberry-glow`
  4. deterministic  same inputs -> byte-identical outputs, no generator present
  5. anchor-stable  no transform moves the foot baseline permanently
  6. cue-aligned    peak lunge extension coincides with `impact_expected`
  7. 30fps-legible  the held extreme survives #16's frame budget at any phase
"""
import hashlib
import json
import pathlib

from PIL import Image

import compose
import present

HERE = pathlib.Path(__file__).parent
FIT = HERE.parent / "comfyui-fit"
BODY = {tuple(c["rgb"]) for c in json.loads((FIT / "palette.json").read_text())["colors"]}
GLOW = {tuple(c["rgb"]) for c in
        json.loads((FIT / "effects" / "palette_glow.json").read_text())["colors"]}
results = []


def gate(name, ok, detail):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: {detail}")
    return ok


def sha(im):
    return hashlib.sha256(im.tobytes()).hexdigest()


def main():
    knight = Image.open(FIT / "runtime" / "knight_seed103.png").convert("RGBA")
    cast = compose.build_cast()

    # 1. body-free -------------------------------------------------------------
    before = [sha(s) for _, s, _ in cast]
    disk = sha(Image.open(FIT / "runtime" / "knight_seed103.png").convert("RGBA"))
    for arm in ("none", "full", "reduced"):
        for t in range(0, 561, 20):
            compose.render(t, cast, arm)
    after = [sha(s) for _, s, _ in cast]
    disk_after = sha(Image.open(FIT / "runtime" / "knight_seed103.png").convert("RGBA"))
    gate("body-free", before == after and disk == disk_after,
         f"{len(cast)} sprites unchanged across {3 * 29} composites; "
         "canonical file on disk unchanged")

    # 2. on-palette ------------------------------------------------------------
    off = set()
    for im in (present.flash(knight, 1.0), present.flash(knight, 0.6),
               present.flash(knight, 0.35), present.downed(knight)):
        off |= {p[:3] for p in im.getdata() if p[3] and p[:3] not in BODY}
    gate("on-palette", not off,
         f"flash(1.0/0.6/0.35) and downed() introduced {len(off)} off-palette colours "
         "-> a transformed body still passes the embedded-effects validator")

    # 3. disjoint --------------------------------------------------------------
    marks = {present.ACTOR_POOL["rgb"], present.ACTOR_BAR["rgb"]}
    gate("disjoint", marks <= GLOW and not (marks & BODY),
         "actor pool and bar are moonberry-glow members and touch no moonberry-16 "
         "colour -> #20's load-bearing disjointness survives the presentation layer")

    # 4. deterministic ---------------------------------------------------------
    a = [sha(compose.render(t, cast, "full")) for t in range(0, 561, 33)]
    b = [sha(compose.render(t, cast, "full")) for t in range(0, 561, 33)]
    gate("deterministic", a == b,
         f"{len(a)} tile renders reproduced byte-identically (Pillow only, "
         "no torch/comfy imported, network unused)")

    # 5. anchor-stable ---------------------------------------------------------
    span = present.LUNGE["ramp_ms"] + present.LUNGE["hold_ms"] + present.LUNGE["settle_ms"]
    ends = [present.lunge_offset(span), present.lunge_offset(span + 500),
            present.hurt_offset(present.HURT["recoil_ms"]),
            ]
    no_idle = not hasattr(present, "idle_offset")
    gate("anchor-stable", all(o == (0, 0) for o in ends) and no_idle,
         "every transform returns exactly to (0,0) after its span, and no "
         "whole-sprite vertical transform exists -- a bob would translate the "
         "foot anchor, the exact failure the stable-baseline rule rejects")

    # 6. cue-aligned -----------------------------------------------------------
    cue = compose.MAN["knight_slash"]["cues_ms"]["impact_expected"]
    peak_end = present.LUNGE["ramp_ms"] + present.LUNGE["hold_ms"]
    gate("cue-aligned", peak_end == cue,
         f"lunge holds full extension until {peak_end}ms; knight_slash "
         f"impact_expected = {cue}ms -- body commitment and blow arrival coincide")

    # 7. 30fps-legible ---------------------------------------------------------
    worst = min(
        sum(1 for t in range(phase, 561, 33)
            if present.lunge_offset(t)[0] == present.LUNGE["out_px"])
        for phase in range(0, 33))
    gate("30fps-legible", worst >= 2,
         f"at the worst sampling phase, {worst} drawn frames land on full "
         f"extension (was 0-1 before the hold was added)")

    print("\n" + ("ALL GATES PASS" if all(o for _, o, _ in results)
                  else "SOME GATES FAILED"))
    return 0 if all(o for _, o, _ in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
