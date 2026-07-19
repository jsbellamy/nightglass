"""PROTOTYPE effect frame derivation — wipe me when trial #20 closes.

Turns ONE source still per effect into a frame sequence by deterministic
transform. No generator, no model, no network — the same offline property the
acquisition contract (#21) verified byte-identical for Character frames.

This is the whole point of the trial: cross-frame coherence is the failure that
killed #19 and #26. Here it is not a generation problem at all. Every frame is
the same authored shape under an arithmetic operation, so the arc cannot change
curvature between frames and the bolt cannot change silhouette mid-flight.

Transforms, all nearest-neighbour, all re-quantized to moonberry-glow with no
dithering, so output is a pure function of the source still:

  sweep(lo, hi)  reveal only the angular window [lo,hi] about the pivot
  scale(f)       nearest-neighbour resize about the centre
  fade(n)        push every pixel n steps down its ramp; pixels that fall off
                 the dim end become transparent (binary alpha, no soft matte)
  spin(n)        rotate the halo ring by n steps (bolt shimmer only)
"""
import hashlib
import json
import math
import pathlib

from PIL import Image

HERE = pathlib.Path(__file__).parent
SRC = HERE / "source"
OUT = HERE / "frames"
PALETTE = json.loads((HERE / "palette_glow.json").read_text())
COLORS = [(c["name"], tuple(c["rgb"])) for c in PALETTE["colors"]]
FAMILIES = PALETTE["families"]

# Strike point: where an effect meets a Character, as an offset from the 32x48
# bottom-center foot anchor. Mid-torso, not head or feet -- this is the number
# the animation contract (#4) needs in order to place any effect at all.
STRIKE_DY = -26


def quantize(rgb):
    return min(COLORS, key=lambda c: sum((a - b) ** 2 for a, b in zip(c[1], rgb)))


def ramp_index(name):
    """Position of a colour within whichever family it belongs to, or None."""
    for fam in FAMILIES.values():
        if name in fam:
            return fam, fam.index(name)
    return None, None


def fade(im, steps):
    """Push each pixel `steps` down its ramp; off the end -> transparent."""
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    by_name = {n: v for n, v in COLORS}
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if not a:
                continue
            name, _ = quantize((r, g, b))
            fam, idx = ramp_index(name)
            if fam is None:
                out.putpixel((x, y), (r, g, b, 255))
                continue
            j = idx + steps
            if j >= len(fam):
                continue                       # burned out
            out.putpixel((x, y), (*by_name[fam[j]], 255))
    return out


def sweep(im, pivot, lo, hi):
    """Keep only pixels whose angle about `pivot` lies in [lo, hi] degrees."""
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    px, py = pivot
    for y in range(im.height):
        for x in range(im.width):
            p = im.getpixel((x, y))
            if not p[3]:
                continue
            ang = math.degrees(math.atan2(y - py, x - px))
            if lo <= ang <= hi:
                out.putpixel((x, y), p)
    return out


def scale(im, f):
    """Nearest-neighbour scale about the centre, canvas size preserved."""
    w, h = max(1, int(round(im.width * f))), max(1, int(round(im.height * f)))
    s = im.resize((w, h), Image.NEAREST)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(s, ((im.width - w) // 2, (im.height - h) // 2))
    return requantize(out)


def spin(im, steps):
    """Rotate about centre by steps*45deg, nearest-neighbour, then requantize."""
    return requantize(im.rotate(steps * 45.0, resample=Image.NEAREST))


def requantize(im):
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if a < 128:                        # binarize: no soft matte survives
                continue
            out.putpixel((x, y), (*quantize((r, g, b))[1], 255))
    return out


# --- the sequences -----------------------------------------------------------
# Each entry: (list of (op, duration_ms), anchor kind, cue the body manifest
# must expose for this effect to be placed in time).

SEQUENCES = {
    # A travelling angular window, then a dimmed full-arc afterimage. The swing
    # reads as motion while the arc geometry is byte-identical throughout.
    # Anchored at the TARGET, not the attacker. The first stress render placed
    # it at the Knight's own strike point, ~200px from the opponent rank, where
    # it read as an unrelated flash. In a static-Formation idle game the melee
    # attacker never closes distance, so `strike_self` is not a usable anchor
    # kind at all -- the blow must be drawn where it lands. anchor_dx sets the
    # pivot left of the target so the crescent wraps its near face.
    "knight_slash": {
        "anchor": "strike_target",
        "anchor_dx": -15,
        "align_to": "impact_expected",
        "cue_frame": 2,
        "frames": [
            (lambda s: sweep(s, (7, 15), -62, -12), 60),
            (lambda s: sweep(s, (7, 15), -34, 20), 60),
            (lambda s: sweep(s, (7, 15), -8, 62), 60),
            (lambda s: fade(s, 2), 70),
        ],
    },
    "knight_impact": {
        "anchor": "strike_target",
        "align_to": "impact_expected",
        "cue_frame": 0,
        "frames": [
            (lambda s: scale(s, 0.55), 50),
            (lambda s: s, 70),
            (lambda s: fade(scale(s, 1.25), 2), 60),
        ],
    },
    # The bolt does not animate its own travel -- compose.py translates it along
    # the lane. Its two frames are a halo shimmer so it does not read as a dead
    # sticker sliding across the tile.
    "wizard_bolt": {
        "anchor": "lane_travel",
        "align_to": "release_projectile",
        "cue_frame": 0,
        "frames": [
            (lambda s: s, 50),
            (lambda s: spin(s, 1), 50),
        ],
    },
    "wizard_impact": {
        "anchor": "strike_target",
        "align_to": "impact_expected",
        "cue_frame": 0,
        "frames": [
            (lambda s: scale(s, 0.5), 50),
            (lambda s: scale(s, 0.8), 60),
            (lambda s: s, 60),
            (lambda s: fade(scale(s, 1.2), 2), 50),
        ],
    },
}


def sha(im):
    return hashlib.sha256(im.tobytes()).hexdigest()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifests = {}
    for name, spec in SEQUENCES.items():
        src = Image.open(SRC / f"{name}.png").convert("RGBA")
        src_sha = sha(src)
        frames, total = [], 0
        for i, (op, dur) in enumerate(spec["frames"]):
            im = requantize(op(src))
            path = OUT / f"{name}_{i}.png"
            im.save(path)
            frames.append({"file": path.name, "duration_ms": dur, "sha256": sha(im),
                           "opaque_px": sum(1 for p in im.getdata() if p[3])})
            total += dur
        cue_ms = sum(f["duration_ms"] for f in frames[: spec["cue_frame"]])
        manifests[name] = {
            "frame_size": [src.width, src.height],
            "palette": f'{PALETTE["name"]}@{PALETTE["version"]}',
            "anchor": spec["anchor"],
            "anchor_dx": spec.get("anchor_dx", 0),
            "strike_dy": STRIKE_DY,
            "align_to": spec["align_to"],
            "cues_ms": {spec["align_to"]: cue_ms},
            "total_ms": total,
            "frames": frames,
            "source": {"still": f"{name}.png", "sha256": src_sha,
                       "authored_by": "effects/author.py", "generator": None},
        }
        print(f'{name:14s} {len(frames)} frames  {total:4d}ms  '
              f'anchor={spec["anchor"]:13s} cue={spec["align_to"]}@{cue_ms}ms')
    (OUT / "manifest.json").write_text(json.dumps(manifests, indent=2))
    print("wrote", OUT / "manifest.json")


if __name__ == "__main__":
    main()
