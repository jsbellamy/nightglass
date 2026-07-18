"""Frozen acquisition toolchain — normalizer, validator, manifest.

Reference implementation of the contract settled in
[#21](https://github.com/jsbellamy/nightglass/issues/21).

PROVIDER-NEUTRAL BY CONSTRUCTION. This module imports no generator, opens no
socket, and loads no model. Its only input is the archived raw bundle
(`raw_rgba/*.png` — RGBA references, alpha already baked at acquisition time by
whichever provider produced them). Running it with ComfyUI uninstalled and the
network down reproduces byte-identical runtime frames.

    normalize  raw RGBA  -> deterministic 32x48 runtime frame
    validate   frame(s)  -> [] or a list of rejection reasons
    manifest   frames    -> integer-ms animation manifest

Determinism guarantees:
  * alpha is BINARIZED at 128 -- a runtime frame's alpha is exactly 0 or 255
  * colour is quantized nearest-in-RGB to palette.json with NO dithering,
    stochastic or ordered -- identical input always yields identical output
  * reduction is nearest-neighbor; no resampling filter, no gamma correction
"""
from __future__ import annotations

import collections
import hashlib
import json
import pathlib
from typing import Iterable

from PIL import Image

HERE = pathlib.Path(__file__).parent
FRAME_W, FRAME_H = 32, 48
ALPHA_CUT = 128

PALETTE = [tuple(c["rgb"]) for c in
           json.loads((HERE / "palette.json").read_text())["colors"]]
PALETTE_SET = set(PALETTE)


# --------------------------------------------------------------- normalizer

def _nearest(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    return min(PALETTE, key=lambda p: sum((rgb[i] - p[i]) ** 2 for i in range(3)))


def normalize(raw_path: pathlib.Path) -> Image.Image:
    """Archived raw RGBA -> deterministic 32x48 runtime frame.

    Binarize alpha, crop to the subject, scale to fit preserving aspect,
    then bottom-center foot-anchor onto the canvas and quantize.
    """
    src = Image.open(raw_path).convert("RGBA")

    # 1. binarize alpha -- kills any soft matte before it can survive reduction
    a = src.getchannel("A").point(lambda v: 255 if v >= ALPHA_CUT else 0)
    src.putalpha(a)

    # 2. crop to subject
    box = a.getbbox()
    if box is None:
        raise ValueError(f"{raw_path.name}: fully transparent raw")
    crop = src.crop(box)

    # 3. nearest-neighbor reduce, aspect preserved
    cw, ch = crop.size
    scale = min(FRAME_W / cw, FRAME_H / ch)
    nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
    small = crop.resize((nw, nh), Image.NEAREST)

    # 4. bottom-center foot-anchor
    frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    frame.paste(small, ((FRAME_W - nw) // 2, FRAME_H - nh), small)

    # 5. re-binarize (paste can blend) then quantize opaque pixels, no dithering
    fa = frame.getchannel("A").point(lambda v: 255 if v >= ALPHA_CUT else 0)
    frame.putalpha(fa)
    px = frame.load()
    for y in range(FRAME_H):
        for x in range(FRAME_W):
            r, g, b, av = px[x, y]
            px[x, y] = (0, 0, 0, 0) if av == 0 else (*_nearest((r, g, b)), 255)
    return frame


def baseline(frame: Image.Image) -> int | None:
    """Lowest opaque row -- the foot baseline. None if the frame is empty."""
    a = frame.getchannel("A").load()
    for y in range(FRAME_H - 1, -1, -1):
        if any(a[x, y] for x in range(FRAME_W)):
            return y
    return None


# --------------------------------------------------------------- validator

def validate(frame: Image.Image, name: str = "frame") -> list[str]:
    """Per-frame rejection rules. Empty list == accepted."""
    errs: list[str] = []

    if frame.size != (FRAME_W, FRAME_H):
        errs.append(f"{name}: wrong dimensions {frame.size}, expected "
                    f"{(FRAME_W, FRAME_H)}")
        return errs  # every later rule assumes the canvas size
    if frame.mode != "RGBA":
        errs.append(f"{name}: non-RGBA mode {frame.mode!r}")
        return errs

    px = frame.load()
    alphas = {px[x, y][3] for y in range(FRAME_H) for x in range(FRAME_W)}

    # unapproved alpha -- anything between fully clear and fully opaque
    stray = sorted(a for a in alphas if a not in (0, 255))
    if stray:
        errs.append(f"{name}: unapproved alpha values {stray[:6]} "
                    f"({len(stray)} distinct); runtime alpha must be 0 or 255")

    opaque = [(x, y) for y in range(FRAME_H) for x in range(FRAME_W)
              if px[x, y][3] == 255]
    if not opaque:
        errs.append(f"{name}: empty frame, no opaque pixels")
        return errs

    # NOTE: clipping is deliberately NOT checked here. normalize() scales to
    # fit, so the subject touching the canvas edge is the expected result, not
    # damage. Real clipping happens upstream -- the generator cutting the
    # character off at the raw canvas edge -- so raw_clipping() catches it
    # against the archived raw, before the reduction discards the evidence.

    # embedded effects -- an Ability effect baked into a Character frame.
    # Effects are authored as separate assets, so a Character frame may only
    # contain approved palette colours; a glow/spark lands off-palette.
    off = {px[x, y][:3] for x, y in opaque} - PALETTE_SET
    if off:
        errs.append(f"{name}: embedded effects or unapproved colour "
                    f"{sorted(off)[:4]} ({len(off)} off-palette)")

    return errs


def raw_clipping(raw_path: pathlib.Path) -> list[str]:
    """Reject a raw whose subject the generator cut off at the canvas edge.

    Run against the archived raw, not the runtime frame: once normalize() has
    scaled to fit, a cut-off character is indistinguishable from a whole one.
    """
    src = Image.open(raw_path).convert("RGBA")
    w, h = src.size
    a = src.getchannel("A").point(lambda v: 255 if v >= ALPHA_CUT else 0)
    box = a.getbbox()
    if box is None:
        return [f"{raw_path.name}: fully transparent raw"]
    x0, y0, x1, y1 = box
    touching = [side for side, hit in
                (("top", y0 == 0), ("bottom", y1 == h),
                 ("left", x0 == 0), ("right", x1 == w))
                if hit]
    if touching:
        return [f"{raw_path.name}: subject clipped by generator at "
                f"{'/'.join(touching)} of the {w}x{h} raw canvas"]
    return []


def validate_sequence(frames: list[tuple[str, Image.Image]]) -> list[str]:
    """Whole-animation rules layered on top of the per-frame ones."""
    errs: list[str] = []
    for name, f in frames:
        errs += validate(f, name)

    # unstable baseline -- feet must not bob between frames of one animation,
    # or the Character appears to slide vertically in the Battle Tile.
    bases = {name: baseline(f) for name, f in frames}
    distinct = set(bases.values())
    if len(distinct) > 1:
        errs.append(f"unstable baseline across sequence: {bases}")
    return errs


# --------------------------------------------------------------- manifest

def manifest(action: str, frames: list[tuple[str, Image.Image]],
             durations_ms: list[int], cues_ms: dict[str, int] | None = None,
             source: dict | None = None) -> dict:
    """Build the runtime animation manifest. All timings are integer ms."""
    if len(durations_ms) != len(frames):
        raise ValueError(f"{action}: {len(durations_ms)} durations for "
                         f"{len(frames)} frames")
    for d in durations_ms:
        if not isinstance(d, int) or isinstance(d, bool) or d <= 0:
            raise ValueError(f"{action}: duration {d!r} must be a positive int ms")
    cues = cues_ms or {}
    total = sum(durations_ms)
    for label, t in cues.items():
        if not isinstance(t, int) or isinstance(t, bool) or not 0 <= t <= total:
            raise ValueError(f"{action}: cue {label!r}={t!r} must be an int ms "
                             f"within 0..{total}")

    base = baseline(frames[0][1])
    return {
        "action": action,
        "frame_size": [FRAME_W, FRAME_H],
        "palette": "moonberry-16",
        "baseline_row": base,
        "total_ms": total,
        "frames": [
            {"name": n, "duration_ms": d,
             "sha256": hashlib.sha256(f.tobytes()).hexdigest()}
            for (n, f), d in zip(frames, durations_ms)
        ],
        "cues_ms": dict(sorted(cues.items())),
        "source": source or {},
    }


# --------------------------------------------------------------- cli

def _build(tags: Iterable[str]):
    out = HERE / "runtime"
    out.mkdir(exist_ok=True)
    built = []
    for tag in tags:
        raw = HERE / "raw_rgba" / f"{tag}.png"
        frame = normalize(raw)
        frame.save(out / f"{tag}.png")
        built.append((tag, frame, raw_clipping(raw)))
    return built, out


if __name__ == "__main__":
    import sys

    tags = sys.argv[1:] or ["knight_seed103", "wizard_seed201"]
    built, out = _build(tags)
    ok = True
    for tag, frame, raw_errs in built:
        errs = raw_errs + validate(frame, tag)
        digest = hashlib.sha256(frame.tobytes()).hexdigest()[:16]
        print(f"{tag:<18} baseline={baseline(frame):<3} sha={digest} "
              f"{'ACCEPT' if not errs else 'REJECT'}")
        for e in errs:
            ok = False
            print(f"   - {e}")
    print(f"\nruntime frames -> {out}")
    sys.exit(0 if ok else 1)
