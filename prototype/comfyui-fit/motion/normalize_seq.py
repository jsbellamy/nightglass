"""PROTOTYPE sequence normalizer — wipe me when trial #19 closes.

Phase 1's normalize.py autocrops and rescales EACH frame independently. That is
correct for one static reference and actively wrong for a sequence: it manufactures
foot-slide and size jitter by re-fitting every frame to its own bbox. A motion
normalizer must therefore derive ONE scale and ONE baseline for the whole clip:

  - scale   from the union bbox of all frames, so limbs never clip and the
            character never changes size between frames
  - baseline from the median bottom edge, so the feet sit on a fixed floor
  - x anchor from the median centroid, so the body does not slide laterally

This deliberately does NOT stabilize away real drift — it removes the normalizer's
own contribution so what remains in the output is the generator's drift, which is
what #19 is actually asking about.

Emits frames/<clip>/{n000.png..} plus a 6x zoom strip and a 1x Battle Tile row.
"""
import sys, pathlib, statistics
from PIL import Image

HERE = pathlib.Path(__file__).parent
OUT = HERE / "frames"; OUT.mkdir(exist_ok=True)
REVIEW = HERE / "review"; REVIEW.mkdir(exist_ok=True)
TW, TH = 32, 48
KEY_TOL2 = 60 * 60
TILE_W, TILE_H = 480, 112


def key(im):
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    cs = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    bg = tuple(sorted(c[i] for c in cs)[1] for i in range(3))
    out = Image.new("RGBA", (w, h)); op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = (r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2
            op[x, y] = (r, g, b, 0) if d <= KEY_TOL2 else (r, g, b, 255)
    return out


def sample(seq, n):
    """Even resample to n keyframes, endpoints included."""
    if n >= len(seq):
        return list(seq)
    return [seq[round(i * (len(seq) - 1) / (n - 1))] for i in range(n)]


def normalize_clip(clip_dir, n_keys):
    fs = sorted(pathlib.Path(clip_dir).glob("f*.png"))
    keyed = [key(Image.open(p)) for p in fs]
    keyed = sample(keyed, n_keys)
    boxes = [k.getchannel("A").getbbox() for k in keyed]
    # ---- one scale, one baseline, one x anchor for the WHOLE clip ----
    uw = max(b[2] - b[0] for b in boxes)
    uh = max(b[3] - b[1] for b in boxes)
    scale = min(TW / uw, TH / uh)
    base = statistics.median(b[3] for b in boxes)          # foot floor, source px
    cxs = statistics.median((b[0] + b[2]) / 2 for b in boxes)
    name = pathlib.Path(clip_dir).name
    dst = OUT / f"{name}_k{n_keys}"; dst.mkdir(exist_ok=True)
    frames = []
    for i, k in enumerate(keyed):
        sw, sh = k.size
        small = k.resize((max(1, round(sw * scale)), max(1, round(sh * scale))), Image.NEAREST)
        canvas = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
        # place so the clip-wide baseline lands on the canvas floor and the
        # clip-wide centre lands on the canvas centre
        ox = round(TW / 2 - cxs * scale)
        oy = round(TH - base * scale)
        canvas.paste(small, (ox, oy), small)
        canvas.save(dst / f"n{i:03d}.png")
        frames.append(canvas)
    return name, frames


def review(name, frames, n):
    z = 6
    pad = 4
    W = pad + len(frames) * (TW * z + pad)
    strip = Image.new("RGBA", (W, TH * z + 2 * pad), (30, 28, 36, 255))
    for i, f in enumerate(frames):
        strip.paste(f.resize((TW * z, TH * z), Image.NEAREST),
                    (pad + i * (TW * z + pad), pad), f.resize((TW * z, TH * z), Image.NEAREST))
    strip.convert("RGB").save(REVIEW / f"keys_{name}_k{n}.png")
    # 1x in the real Battle Tile, laid along the row as the game would show them
    tile = Image.new("RGBA", (TILE_W, TILE_H), (18, 16, 28, 255))
    for i, f in enumerate(frames):
        tile.paste(f, (16 + i * (TW + 8), TILE_H - TH - 8), f)
    tile.convert("RGB").save(REVIEW / f"tile_{name}_k{n}.png")
    tile.resize((TILE_W * 2, TILE_H * 2), Image.NEAREST).convert("RGB").save(
        REVIEW / f"tile_{name}_k{n}@2x.png")
    # animated preview at the authored hold
    frames[0].convert("RGB").save(REVIEW / f"anim_{name}_k{n}.webp", save_all=True,
                                  append_images=[f.convert("RGB") for f in frames[1:]],
                                  duration=160, loop=0, lossless=True)


if __name__ == "__main__":
    clip = sys.argv[1]
    for n in [int(x) for x in (sys.argv[2].split(",") if len(sys.argv) > 2 else ["4", "6", "8"])]:
        name, frames = normalize_clip(HERE / clip, n)
        review(name, frames, n)
        print(f"{name} k={n}: {len(frames)} frames -> frames/{name}_k{n}, review/keys_{name}_k{n}.png")
