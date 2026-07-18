"""PROTOTYPE review compositor — wipe me when trial #15 closes.

Drops normalized 32x48 frames into the fixed 480x112 Battle Tile at 1x (no
runtime downscaling) so identity/readability are judged where the decision (#1)
requires. Builds normalized/REVIEW.png: the live tile on top, per-frame 1x and
6x zooms below, on a checkerboard so alpha halos are obvious.
"""
import pathlib
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).parent
NORM = HERE / "normalized"
TW, TH = 480, 112

def night_garden():
    tile = Image.new("RGBA", (TW, TH))
    d = ImageDraw.Draw(tile)
    for y in range(TH):
        t = y / TH
        d.line([(0, y), (TW, y)],
               fill=(int(38+30*t), int(24+70*t), int(52+60*t), 255))  # plum -> mint dusk
    d.line([(0, 24), (TW, 24)], fill=(120, 200, 180, 90))            # status-line divider
    d.rectangle([0, TH-10, TW, TH], fill=(30, 60, 45, 255))          # orchard ground
    return tile

def checker(w, h, s=8):
    im = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(im)
    for y in range(0, h, s):
        for x in range(0, w, s):
            c = 210 if (x//s + y//s) % 2 else 170
            d.rectangle([x, y, x+s, y+s], fill=(c, c, c, 255))
    return im

def place(tile, frame, cx, feet_y):
    x = cx - TW32//2
    tile.alpha_composite(frame, (x, feet_y - 48))

TW32 = 32

def build(front, back):
    kf = Image.open(NORM / f"{front}.png").convert("RGBA")
    wf = Image.open(NORM / f"{back}.png").convert("RGBA")
    tile = night_garden()
    # left third: Front nearer bottom, Back higher/left (Formation depth)
    place(tile, wf, 78, TH-14)
    place(tile, kf, 52, TH-6)
    # opponents-absent static read; five-opponent stress is a motion-phase concern

    pad = 12
    zoom = 6
    review = Image.new("RGBA", (TW+2*pad, TH + 48*zoom + 3*pad), (245, 245, 245, 255))
    review.alpha_composite(tile, (pad, pad))
    y = TH + 2*pad
    for i, (tag, fr) in enumerate([(front, kf), (back, wf)]):
        cx = pad + i*(32*zoom + 40)
        base = checker(32*zoom, 48*zoom)
        base.alpha_composite(fr.resize((32*zoom, 48*zoom), Image.NEAREST))
        review.alpha_composite(base, (cx, y))
        one = checker(32, 48)
        one.alpha_composite(fr)
        review.alpha_composite(one, (cx + 32*zoom + 8, y))
    review.convert("RGB").save(NORM / "REVIEW.png")
    print("wrote", NORM / "REVIEW.png")

if __name__ == "__main__":
    import sys
    build(sys.argv[1], sys.argv[2])
