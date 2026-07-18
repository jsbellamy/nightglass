"""PROTOTYPE alpha A/B — wipe me when trial #21 closes.

Scores the two candidate alpha paths against the four failure modes #21 names,
measured on the final 32x48 frame (where they actually matter), not on the
512x768 raw:

  bg_rect  background rectangle  -- opaque pixels touching the frame border
  halo     material halo         -- partially transparent pixels (0 < a < 255)
  debris   detached debris       -- opaque connected components beyond the largest
  holes    missing interior      -- transparent components fully enclosed by subject

Arm A "chroma": per-image corner-sampled chroma key over the RGB raw (the #15
phase-1 path). Arm B "birefnet": consume the RGBA already baked by BiRefNet at
acquisition time (raw_rgba/), no keying at all.

Both arms share one reduction: autocrop -> bottom-center foot-anchor -> pad to
32x48 -> nearest-neighbor. Only the alpha source differs.
"""
import collections, pathlib, sys
from PIL import Image

HERE = pathlib.Path(__file__).parent
TW, TH = 32, 48
KEY_TOL = 60
ALPHA_CUT = 128  # binarization threshold for the runtime frame


# ---------- arm A: chroma key ----------

def _dist2(a, b):
    return sum((a[i] - b[i]) ** 2 for i in range(3))


def chroma_rgba(tag):
    im = Image.open(HERE / "raw" / f"{tag}.png").convert("RGB")
    w, h = im.size
    px = im.load()
    corners = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))
    out = Image.new("RGBA", (w, h))
    op = out.load()
    tol2 = KEY_TOL * KEY_TOL
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            op[x, y] = (r, g, b, 0) if _dist2((r, g, b), bg) <= tol2 else (r, g, b, 255)
    return out


# ---------- arm B: BiRefNet ----------

def birefnet_rgba(tag):
    return Image.open(HERE / "raw_rgba" / f"{tag}.png").convert("RGBA")


# ---------- shared reduction ----------

def reduce_to_frame(rgba):
    box = rgba.getchannel("A").getbbox()
    crop = rgba.crop(box)
    cw, ch = crop.size
    scale = min(TW / cw, TH / ch)
    nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
    small = crop.resize((nw, nh), Image.NEAREST)
    canvas = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
    canvas.paste(small, ((TW - nw) // 2, TH - nh), small)
    return canvas


# ---------- scoring ----------

def _components(mask, w, h):
    """4-connected components over a set of (x,y)."""
    seen, comps = set(), []
    for start in mask:
        if start in seen:
            continue
        q, comp = collections.deque([start]), []
        seen.add(start)
        while q:
            x, y = q.popleft()
            comp.append((x, y))
            for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                if (nx, ny) in mask and (nx, ny) not in seen:
                    seen.add((nx, ny))
                    q.append((nx, ny))
        comps.append(comp)
    return sorted(comps, key=len, reverse=True)


def score(frame):
    w, h = frame.size
    a = frame.getchannel("A").load()
    opaque = {(x, y) for y in range(h) for x in range(w) if a[x, y] >= ALPHA_CUT}
    clear = {(x, y) for y in range(h) for x in range(w) if a[x, y] < ALPHA_CUT}
    # true halo is the genuinely intermediate band; 254-vs-255 matte noise is not
    partial = sum(1 for y in range(h) for x in range(w) if 16 <= a[x, y] < 240)

    # a real "background rectangle" shows as opaque frame CORNERS -- a character
    # touching the bottom/side edge is expected foot-anchoring, not a rectangle.
    border = sum(1 for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))
                 if p in opaque)
    comps = _components(opaque, w, h)
    debris = sum(len(c) for c in comps[1:])

    # transparent components that never touch the frame border == enclosed holes
    holes = 0
    for c in _components(clear, w, h):
        if not any(x in (0, w - 1) or y in (0, h - 1) for (x, y) in c):
            holes += len(c)

    return {"coverage": len(opaque), "bg_rect": border, "halo": partial,
            "debris": debris, "holes": holes}


TAGS = ["knight_seed101", "knight_seed102", "knight_seed103", "knight_seed104",
        "knight_seed105", "wizard_seed201", "wizard_seed202", "wizard_seed203",
        "wizard_seed204", "wizard_seed205"]
ARMS = {"chroma": chroma_rgba, "birefnet": birefnet_rgba}


def sheet(rows, path):
    """Side-by-side 8x zoom on a checkerboard, chroma above birefnet."""
    z, pad, labelh = 8, 6, 0
    cw, ch = TW * z + pad, TH * z + pad
    out = Image.new("RGB", (cw * len(rows), ch * 2 + pad), (24, 24, 32))
    for col, (tag, frames) in enumerate(rows):
        for row, arm in enumerate(("chroma", "birefnet")):
            big = frames[arm].resize((TW * z, TH * z), Image.NEAREST)
            checker = Image.new("RGB", big.size, (60, 60, 70))
            cp = checker.load()
            for y in range(big.size[1]):
                for x in range(big.size[0]):
                    if ((x // z) + (y // z)) % 2:
                        cp[x, y] = (90, 90, 100)
            checker.paste(big, (0, 0), big)
            out.paste(checker, (col * cw + pad, row * ch + pad))
    out.save(path)
    return path


if __name__ == "__main__":
    tags = sys.argv[1:] or TAGS
    rows, totals = [], {arm: collections.Counter() for arm in ARMS}
    hdr = f"{'frame':<18}{'arm':<10}{'cover':>6}{'bg_rect':>9}{'halo':>6}{'debris':>8}{'holes':>7}"
    print(hdr)
    print("-" * len(hdr))
    for tag in tags:
        frames = {}
        for arm, fn in ARMS.items():
            frames[arm] = f = reduce_to_frame(fn(tag))
            s = score(f)
            totals[arm].update(s)
            print(f"{tag:<18}{arm:<10}{s['coverage']:>6}{s['bg_rect']:>9}"
                  f"{s['halo']:>6}{s['debris']:>8}{s['holes']:>7}")
        rows.append((tag, frames))
    print("-" * len(hdr))
    for arm, t in totals.items():
        print(f"{'TOTAL':<18}{arm:<10}{t['coverage']:>6}{t['bg_rect']:>9}"
              f"{t['halo']:>6}{t['debris']:>8}{t['holes']:>7}")
    print("\nsheet ->", sheet(rows, HERE / "normalized" / "ALPHA_AB.png"))
