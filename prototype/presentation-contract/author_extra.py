"""PROTOTYPE Priest-heal and Hunter-arrow stills + frames — wipe me when #4 closes.

#20 validated slash/impact (melee) and bolt/impact (projectile) and flagged that
Priest and Hunter were untested: "a heal is an upward, sustained, friendly-target
effect with no analogue here", possibly needing a THIRD anchor kind.

The hypothesis this script tests: it does not. A heal's upward travel can be
baked into a TALL canvas and revealed by a new deterministic transform --
`band(lo, hi)`, the linear analogue of #20's angular `sweep` -- leaving the
anchor kind as plain `strike_target`. If that reads, the anchor vocabulary stays
at two kinds and the effect vocabulary grows by one cheap transform instead.

Same rules as #20: ONE authored still per effect, every frame derived from it by
deterministic offline transform, requantized to `moonberry-glow`, no dithering.
"""
import hashlib
import json
import pathlib
import sys

from PIL import Image

HERE = pathlib.Path(__file__).parent
EFFECTS = HERE.parent / "comfyui-fit" / "effects"
sys.path.insert(0, str(EFFECTS))
import derive  # noqa: E402  -- reuse #20's transforms unchanged

SRC = HERE / "source"
OUT = HERE / "frames"
G = {c["name"]: tuple(c["rgb"]) for c in derive.PALETTE["colors"]}


def band(im, lo, hi):
    """Keep only rows in [lo, hi]. The linear analogue of #20's angular sweep.

    This is the whole heal experiment: a sustained upward rise is a moving
    horizontal window over a tall static still, exactly as a swing is a moving
    angular window over a static arc. Same trap avoided -- the shape cannot
    change between frames because it is the same pixels.
    """
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    for y in range(max(0, lo), min(im.height, hi + 1)):
        for x in range(im.width):
            p = im.getpixel((x, y))
            if p[3]:
                out.putpixel((x, y), p)
    return out


def author_heal():
    """Tall column of rising leaf motes over the friendly target. 20x34."""
    w, h = 20, 34
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # motes laid up the column, alternating side, brightening toward the top
    motes = [(10, 32, "glow-mint-deep"), (7, 28, "glow-mint"), (13, 25, "glow-mint"),
             (9, 21, "glow-mint-bright"), (12, 18, "glow-mint-bright"),
             (8, 14, "glow-cream"), (11, 11, "glow-cream"), (10, 8, "glow-core"),
             (13, 6, "glow-mint-bright"), (7, 5, "glow-mint-bright")]
    for cx, cy, name in motes:
        c = G[name]
        # a 3px leaf: centre plus two spokes, discrete not radial (Moonberry rule)
        for dx, dy in [(0, 0), (0, -1), (-1, 0), (1, 0)]:
            x, y = cx + dx, cy + dy
            if 0 <= x < w and 0 <= y < h:
                im.putpixel((x, y), (*c, 255))
    # a grounded cradle so the heal reads as landing ON someone
    for x in range(6, 15):
        im.putpixel((x, 33), (*G["glow-mint-deep"], 255))
    return im


def author_arrow():
    """Horizontal bolt with a fletched tail, right-facing. 13x7."""
    w, h = 13, 7
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for x in range(2, 11):                       # shaft
        im.putpixel((x, 3), (*G["glow-cream"], 255))
    for x, y in [(11, 3), (10, 2), (10, 4)]:     # head
        im.putpixel((x, y), (*G["glow-core"], 255))
    for x, y in [(2, 2), (2, 4), (1, 1), (1, 5)]:  # fletching
        im.putpixel((x, y), (*G["glow-mint"], 255))
    return im


SEQUENCES = {
    # Sustained upward reveal over ~400ms, then a dimmed hold. anchor stays
    # strike_target -- the RISE is inside the asset, not in the anchor.
    "priest_heal": {
        "anchor": "strike_target", "anchor_dx": 0,
        "align_to": "impact_expected", "cue_frame": 0,
        "frames": [(lambda s: band(s, 24, 34), 90),
                   (lambda s: band(s, 14, 34), 90),
                   (lambda s: band(s, 4, 34), 110),
                   (lambda s: derive.fade(band(s, 4, 34), 1), 110),
                   (lambda s: derive.fade(band(s, 4, 34), 3), 100)],
    },
    # Identical treatment to #20's wizard_bolt: the asset shimmers, compose.py
    # translates it down the lane. If this needs nothing new, lane_travel is
    # confirmed as Class-agnostic rather than a Wizard special case.
    "hunter_arrow": {
        "anchor": "lane_travel", "anchor_dx": 0,
        "align_to": "release_projectile", "cue_frame": 0,
        "frames": [(lambda s: s, 60),
                   (lambda s: derive.fade(s, 1), 60)],
    },
}


def sha(im):
    return hashlib.sha256(im.tobytes()).hexdigest()


def main():
    SRC.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in [("priest_heal", author_heal), ("hunter_arrow", author_arrow)]:
        derive.requantize(fn()).save(SRC / f"{name}.png")

    manifests = {}
    for name, spec in SEQUENCES.items():
        src = Image.open(SRC / f"{name}.png").convert("RGBA")
        frames, total = [], 0
        for i, (op, dur) in enumerate(spec["frames"]):
            im = derive.requantize(op(src))
            im.save(OUT / f"{name}_{i}.png")
            frames.append({"file": f"{name}_{i}.png", "duration_ms": dur,
                           "sha256": sha(im),
                           "opaque_px": sum(1 for p in im.getdata() if p[3])})
            total += dur
        manifests[name] = {
            "frame_size": [src.width, src.height],
            "palette": f'{derive.PALETTE["name"]}@{derive.PALETTE["version"]}',
            "anchor": spec["anchor"], "anchor_dx": spec["anchor_dx"],
            "strike_dy": derive.STRIKE_DY, "align_to": spec["align_to"],
            "cues_ms": {spec["align_to"]:
                        sum(f["duration_ms"] for f in frames[: spec["cue_frame"]])},
            "total_ms": total, "frames": frames,
            "source": {"still": f"{name}.png", "sha256": sha(src),
                       "authored_by": "presentation-contract/author_extra.py",
                       "generator": None},
        }
    (OUT / "manifest.json").write_text(json.dumps(manifests, indent=2) + "\n")
    for n, m in manifests.items():
        print(f"{n}: {len(m['frames'])} frames / {m['total_ms']}ms, "
              f"anchor={m['anchor']}, canvas={m['frame_size']}")


if __name__ == "__main__":
    main()
