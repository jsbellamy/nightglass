"""PROTOTYPE effect source authoring — wipe me when trial #20 closes.

Writes ONE source still per Ability effect into effects/source/. Frames are not
authored here; derive.py produces them by deterministic transform (see NOTES).

Authored procedurally rather than painted so the source stills are themselves
reproducible byte-for-byte, matching the determinism the acquisition contract
(#21) already requires below the raw-bundle boundary. A ComfyUI-generated still
can be dropped into source/ under the same filename to run the generate arm
through the identical downstream pipeline.
"""
import json
import math
import pathlib

from PIL import Image

HERE = pathlib.Path(__file__).parent
SRC = HERE / "source"
PALETTE = json.loads((HERE / "palette_glow.json").read_text())
GLOW = {c["name"]: tuple(c["rgb"]) for c in PALETTE["colors"]}


def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def put(im, x, y, rgb):
    """Binary-alpha plot, bounds-checked. Effects never carry a soft matte."""
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), (*rgb, 255))


def ramp_pick(names, t):
    """Pick a ramp entry by normalized depth t in [0,1]; 0 = hottest core."""
    i = min(len(names) - 1, max(0, int(t * len(names))))
    return GLOW[names[i]]


# --- knight_slash: a crescent arc, right-facing -----------------------------
# One static crescent. derive.py sweeps a mask across it to make the swing read
# as travelling, so the arc's shape is identical in every frame by construction.

def knight_slash():
    W = H = 30
    cx, cy = 7.0, H / 2.0          # pivot sits behind the arc, at the wielder
    im = canvas(W, H)
    # Thickened from 4.5px to 6px after the first stress render: a 4.5px band
    # lost its cool edges to quantization and read as a broken dotted line at 1x.
    r_out, r_in = 20.0, 14.0
    ramp = PALETTE["families"]["arc"]
    for y in range(H):
        for x in range(W):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            if not (r_in <= r <= r_out):
                continue
            ang = math.degrees(math.atan2(dy, dx))
            if abs(ang) > 62:                      # crescent spans +/-62 deg
                continue
            # hottest along the arc's centre-line, cooling toward both edges
            edge = abs(r - (r_in + r_out) / 2) / ((r_out - r_in) / 2)
            tip = abs(ang) / 62.0                  # and cooling toward the tips
            put(im, x, y, ramp_pick(ramp, min(1.0, 0.55 * edge + 0.75 * tip)))
    return im


# --- knight_impact / wizard_impact: petal bursts -----------------------------
# One burst still; derive.py scales and fades it. Petals are the Moonberry
# language cue (#3) — discrete leaf-shaped spokes, not a generic radial flash.

def petal_burst(size, ramp_name, petals, seed_ang):
    W = H = size
    c = (size - 1) / 2.0
    im = canvas(W, H)
    ramp = PALETTE["families"][ramp_name]
    r_max = c - 0.5
    for k in range(petals):
        a = math.radians(seed_ang + k * (360.0 / petals))
        ca, sa = math.cos(a), math.sin(a)
        for step in range(int(r_max * 2)):
            r = step / 2.0
            if r > r_max:
                break
            t = r / r_max
            # petal: widest at mid-length, tapering to a point at the tip
            half = max(0.0, 1.6 * math.sin(math.pi * t) - 0.15)
            n = int(half)
            for off in range(-n, n + 1):
                x = int(round(c + ca * r - sa * off))
                y = int(round(c + sa * r + ca * off))
                put(im, x, y, ramp_pick(ramp, min(1.0, 0.85 * t + 0.3 * abs(off))))
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        put(im, int(c) + dx, int(c) + dy, GLOW["glow-core"])   # hot core
    return im


# --- wizard_bolt: a travelling mote with a halo ------------------------------
# derive.py translates this along the Formation lane; the halo is what makes it
# read at 1x, since a bare mote is 2px and vanishes against the tile gradient.

def wizard_bolt():
    W = H = 11
    c = (W - 1) / 2.0
    im = canvas(W, H)
    ramp = PALETTE["families"]["bloom"]
    for y in range(H):
        for x in range(W):
            r = math.hypot(x - c, y - c)
            if r > c:
                continue
            if r <= 1.2:
                put(im, x, y, GLOW["glow-core"])
            elif r <= 2.4:
                put(im, x, y, GLOW["glow-berry-bright"])
            elif abs(r - 4.0) < 0.9 and (x + y) % 2 == 0:
                # sparse dithered halo ring: reads as light without soft alpha
                put(im, x, y, ramp_pick(ramp, 0.75))
    # short motion tail trailing left, behind the head
    for i, t in enumerate((0.5, 0.7, 0.9)):
        put(im, int(c) - 3 - i, int(c), ramp_pick(ramp, t))
    return im


SOURCES = {
    "knight_slash":  knight_slash,
    # Burst sizes raised from 17/21 after the first stress render: at 1x in the
    # crowded lane they read as "a flash happened" but not as "a blow landed".
    "knight_impact": lambda: petal_burst(23, "arc", 6, 0),
    "wizard_bolt":   wizard_bolt,
    "wizard_impact": lambda: petal_burst(27, "bloom", 8, 22.5),
}


def main():
    SRC.mkdir(parents=True, exist_ok=True)
    for name, fn in SOURCES.items():
        im = fn()
        im.save(SRC / f"{name}.png")
        opaque = sum(1 for p in im.getdata() if p[3])
        print(f"{name:14s} {im.width}x{im.height}  {opaque} opaque px")


if __name__ == "__main__":
    main()
