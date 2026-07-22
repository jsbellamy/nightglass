"""Procedural effect source authoring for the vertical slice (#43).

Writes ONE source still per effect family into pipeline/effects/source/ and
status glyphs into src/assets/effects/status/. Frames are derived offline by
derive.py — see docs/animation-contract.md.
"""
from __future__ import annotations

import json
import math
import pathlib
import sys

from PIL import Image

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent))
import acquire  # noqa: E402
ROOT = HERE.parent.parent
SRC = HERE / "source"
STATUS_OUT = ROOT / "src" / "assets" / "effects" / "status"
PALETTE = json.loads((HERE / "palette_glow.json").read_text())
GLOW = {c["name"]: tuple(c["rgb"]) for c in PALETTE["colors"]}


def canvas(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def put(im: Image.Image, x: int, y: int, rgb: tuple[int, int, int]) -> None:
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), (*rgb, 255))


def ramp_pick(names: list[str], t: float) -> tuple[int, int, int]:
    i = min(len(names) - 1, max(0, int(t * len(names))))
    return GLOW[names[i]]


def arc_slash() -> Image.Image:
    """Crescent arc, right-facing — pivot behind the wielder."""
    w = h = 30
    cx, cy = 7.0, h / 2.0
    im = canvas(w, h)
    r_out, r_in = 20.0, 14.0
    ramp = PALETTE["families"]["arc"]
    for y in range(h):
        for x in range(w):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            if not (r_in <= r <= r_out):
                continue
            ang = math.degrees(math.atan2(dy, dx))
            if abs(ang) > 62:
                continue
            edge = abs(r - (r_in + r_out) / 2) / ((r_out - r_in) / 2)
            tip = abs(ang) / 62.0
            put(im, x, y, ramp_pick(ramp, min(1.0, 0.55 * edge + 0.75 * tip)))
    return im


def petal_burst(size: int, ramp_name: str, petals: int, seed_ang: float) -> Image.Image:
    w = h = size
    c = (size - 1) / 2.0
    im = canvas(w, h)
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
            half = max(0.0, 1.6 * math.sin(math.pi * t) - 0.15)
            n = int(half)
            for off in range(-n, n + 1):
                x = int(round(c + ca * r - sa * off))
                y = int(round(c + sa * r + ca * off))
                put(im, x, y, ramp_pick(ramp, min(1.0, 0.85 * t + 0.3 * abs(off))))
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        put(im, int(c) + dx, int(c) + dy, GLOW["glow-core"])
    return im


def arc_impact() -> Image.Image:
    return petal_burst(23, "arc", 6, 0)


def arrow_bolt() -> Image.Image:
    """Horizontal arrow with mint arc ramp — lane-travel projectile."""
    w, h = 19, 9
    im = canvas(w, h)
    ramp = PALETTE["families"]["arc"]
    cy = h // 2
    for x in range(w):
        t = x / max(1, w - 1)
        put(im, x, cy, ramp_pick(ramp, 0.35 + 0.5 * t))
        if cy > 0:
            put(im, x, cy - 1, ramp_pick(ramp, 0.55 + 0.35 * t))
        if cy + 1 < h:
            put(im, x, cy + 1, ramp_pick(ramp, 0.55 + 0.35 * t))
    tip_x = w - 1
    for dy in (-1, 0, 1):
        put(im, tip_x, cy + dy, GLOW["glow-core"])
    put(im, tip_x - 1, cy, GLOW["glow-cream"])
    for y in (cy - 2, cy + 2):
        if 0 <= y < h:
            put(im, 1, y, GLOW["glow-mint"])
            put(im, 2, y, GLOW["glow-mint-bright"])
    return im


def spell_bolt() -> Image.Image:
    w = h = 11
    c = (w - 1) / 2.0
    im = canvas(w, h)
    ramp = PALETTE["families"]["bloom"]
    for y in range(h):
        for x in range(w):
            r = math.hypot(x - c, y - c)
            if r > c:
                continue
            if r <= 1.2:
                put(im, x, y, GLOW["glow-core"])
            elif r <= 2.4:
                put(im, x, y, GLOW["glow-berry-bright"])
            elif abs(r - 4.0) < 0.9 and (x + y) % 2 == 0:
                put(im, x, y, ramp_pick(ramp, 0.75))
    for i, t in enumerate((0.5, 0.7, 0.9)):
        put(im, int(c) - 3 - i, int(c), ramp_pick(ramp, t))
    return im


def spell_bloom() -> Image.Image:
    return petal_burst(27, "bloom", 8, 22.5)


def heal_rise() -> Image.Image:
    """Tall column revealed upward via band() — Priest heals."""
    w, h = 14, 40
    im = canvas(w, h)
    ramp = PALETTE["families"]["bloom"]
    cx = w // 2
    for y in range(h):
        t = y / max(1, h - 1)
        for dx in (-1, 0, 1):
            x = cx + dx
            if 0 <= x < w:
                put(im, x, y, ramp_pick(ramp, 0.25 + 0.65 * t))
        if y % 5 == 0 and cx - 2 >= 0:
            put(im, cx - 2, y, GLOW["glow-core"])
        if y % 5 == 2 and cx + 2 < w:
            put(im, cx + 2, y, GLOW["glow-berry-bright"])
    return im


def revive_burst() -> Image.Image:
    return petal_burst(25, "bloom", 10, -15)


def buff_halo() -> Image.Image:
    w = h = 21
    c = (w - 1) / 2.0
    im = canvas(w, h)
    ramp = PALETTE["families"]["bloom"]
    for y in range(h):
        for x in range(w):
            r = math.hypot(x - c, y - c)
            if 3.8 <= r <= 8.5:
                put(im, x, y, ramp_pick(ramp, abs(r - 6.0) / 4.0))
    for a in range(0, 360, 45):
        rad = math.radians(a)
        x = int(round(c + 9.0 * math.cos(rad)))
        y = int(round(c + 9.0 * math.sin(rad)))
        put(im, x, y, GLOW["glow-core"])
    return im


SOURCES = {
    "arc-slash": arc_slash,
    "arc-impact": arc_impact,
    "arrow-bolt": arrow_bolt,
    "spell-bolt": spell_bolt,
    "spell-bloom": spell_bloom,
    "heal-rise": heal_rise,
    "revive-burst": revive_burst,
    "buff-halo": buff_halo,
}


# Status glyphs: max 7×7, shape-distinct at 1× (colour is secondary).
STATUS_GLYPHS: dict[str, list[tuple[int, int]]] = {
    # shield chevron
    "braced": [(3, 1), (2, 2), (3, 2), (4, 2), (1, 3), (2, 3), (3, 3), (4, 3), (5, 3),
               (2, 4), (3, 4), (4, 4), (3, 5)],
    # double wall
    "guarded": [(1, 2), (1, 3), (1, 4), (5, 2), (5, 3), (5, 4), (2, 1), (3, 1), (4, 1),
                (2, 5), (3, 5), (4, 5)],
    # diamond ward
    "warded": [(3, 0), (2, 1), (3, 1), (4, 1), (1, 2), (2, 2), (3, 2), (4, 2), (5, 2),
               (2, 3), (3, 3), (4, 3), (3, 4)],
    # triple spark lines (distinct from braced shield)
    "inspired": [(0, 3), (1, 2), (2, 1), (3, 0), (4, 1), (5, 2), (6, 3),
                 (1, 4), (2, 5), (3, 6), (4, 5), (5, 4)],
    # arch shelter
    "sheltered": [(1, 4), (2, 4), (3, 4), (4, 4), (5, 4), (2, 3), (3, 3), (4, 3),
                  (2, 2), (3, 2), (4, 2), (3, 1), (3, 0)],
    # broken ring gap bottom
    "exposed": [(1, 2), (2, 1), (3, 1), (4, 1), (5, 2), (5, 3), (4, 4), (2, 4), (1, 3),
                (3, 3)],
    # lightning zig
    "riven": [(1, 1), (2, 2), (3, 1), (4, 2), (5, 3), (4, 4), (3, 5), (2, 4)],
    # star burst
    "stun": [(3, 0), (3, 1), (1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (2, 3), (3, 3),
             (4, 3), (3, 4), (3, 5)],
    # rising steam/wave wisps
    "scalded": [(1, 6), (2, 5), (1, 4), (2, 3), (1, 2), (2, 1), (1, 0),
                (4, 6), (5, 5), (4, 4), (5, 3), (4, 2), (5, 1), (4, 0)],
    # broken opposing chevrons
    "shaken": [(0, 1), (1, 2), (2, 3), (1, 4), (0, 5),
               (6, 1), (5, 2), (4, 3), (5, 4), (6, 5)],
    # compact flame/char mark
    "scorched": [(3, 0), (3, 1), (2, 2), (3, 2), (4, 2), (2, 3), (3, 3), (4, 3),
                 (1, 4), (2, 4), (3, 4), (4, 4), (5, 4), (2, 5), (4, 5), (3, 6)],
    # three forward turbine bars
    "overdrive": [(0, 1), (1, 1), (2, 1), (2, 3), (3, 3), (4, 3), (4, 5), (5, 5), (6, 5)],
}


def render_status_glyph(points: list[tuple[int, int]]) -> Image.Image:
    im = canvas(7, 7)
    color = GLOW["glow-mint-bright"]
    for x, y in points:
        put(im, x, y, color)
    return im


def main() -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    for name, fn in SOURCES.items():
        im = fn()
        acquire.save_runtime_png(im, SRC / f"{name}.png")
        opaque = sum(1 for p in im.getdata() if p[3])
        print(f"{name:14s} {im.width}x{im.height}  {opaque} opaque px")

    STATUS_OUT.mkdir(parents=True, exist_ok=True)
    for name, points in STATUS_GLYPHS.items():
        im = render_status_glyph(points)
        acquire.save_runtime_png(im, STATUS_OUT / f"{name}.png")
        print(f"status/{name:10s} 7x7  {len(points)} px")


if __name__ == "__main__":
    main()
