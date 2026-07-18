"""PROTOTYPE normalizer — wipe me when trial #15 closes.

Provider-neutral offline reduction of a raw FLUX reference to a deterministic
32x48 RGBA frame: chroma-key the controlled background, autocrop to content,
bottom-center foot-anchor, pad to the 2:3 (32:48) canvas, nearest-neighbor
downscale. No ComfyUI, no model, no network. Deterministic from the raw PNG.

Emits:
  normalized/<tag>.png            the 32x48 RGBA runtime frame
  normalized/<tag>.preview.png    8x nearest zoom for human review
  normalized/<tag>.tile.png       the frame composited 1x into a 480x112 tile
"""
import sys, pathlib
from PIL import Image

HERE = pathlib.Path(__file__).parent
NORM = HERE / "normalized"; NORM.mkdir(exist_ok=True)
TW, TH = 32, 48                      # Party Member canvas
KEY_TOL = 60                         # color-distance threshold (covers soft shadow halo)

def dist2(a, b):
    return sum((a[i]-b[i])**2 for i in range(3))

def sample_bg(px, w, h):
    # median-ish of the four corners: the controlled bg drifts per seed, so
    # detect it per image instead of pinning one constant.
    cs = [px[2, 2], px[w-3, 2], px[2, h-3], px[w-3, h-3]]
    return tuple(sorted(c[i] for c in cs)[1] for i in range(3))

def key_alpha(im):
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    bg = sample_bg(px, w, h)
    out = Image.new("RGBA", (w, h))
    op = out.load()
    tol2 = KEY_TOL*KEY_TOL
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            op[x, y] = (r, g, b, 0) if dist2((r, g, b), bg) <= tol2 else (r, g, b, 255)
    return out

def bbox_of_alpha(im):
    return im.getchannel("A").getbbox()

def normalize(tag):
    raw = Image.open(HERE / "raw" / f"{tag}.png")
    keyed = key_alpha(raw)
    box = bbox_of_alpha(keyed)
    crop = keyed.crop(box)
    cw, ch = crop.size
    # scale so the character fits inside 32x48 preserving aspect, leave feet at bottom
    scale = min(TW / cw, TH / ch)
    nw, nh = max(1, round(cw*scale)), max(1, round(ch*scale))
    small = crop.resize((nw, nh), Image.NEAREST)
    canvas = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
    ox = (TW - nw) // 2
    oy = TH - nh                      # bottom-anchored foot baseline
    canvas.paste(small, (ox, oy), small)
    canvas.save(NORM / f"{tag}.png")
    # 8x review zoom
    canvas.resize((TW*8, TH*8), Image.NEAREST).save(NORM / f"{tag}.preview.png")
    return canvas

if __name__ == "__main__":
    tags = sys.argv[1:]
    frames = [(t, normalize(t)) for t in tags]
    for t, f in frames:
        print(f"{t}: {f.size} RGBA, alpha bbox {f.getchannel('A').getbbox()}")
