"""PROTOTYPE gate metrics — wipe me when trial #19 closes.

#19 names its failure modes (foot-slide, camera drift, duplicate-frame stall,
morph). Eyeballing a filmstrip does not settle them, so measure them from the
frames. All measurements are offline from the archived PNGs; no model involved.

Per frame, chroma-key the controlled background to a foreground mask, then track:
  bottom  — the foot baseline. Its spread across the clip IS foot-slide/float.
  cx      — foreground centroid x. Its spread IS lateral drift.
  height  — foreground height. Its trend IS camera zoom / scale creep.
  dmean   — mean abs RGB delta vs the previous frame, foreground only.
            ~0 for a stalled duplicate frame; spikes on a morph blowout.

Reported against the 32x48 target: a drift of D source px becomes D * 48/height
target px. Sub-pixel at 32x48 is what "holds" means here, so the target-space
number is the one that decides the gate, not the source-space one.
"""
import sys, pathlib, statistics
from PIL import Image

TH = 48  # target frame height


def mask_and_stats(im, tol2=60 * 60):
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    cs = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    bg = tuple(sorted(c[i] for c in cs)[1] for i in range(3))
    xs, ys, n, sx = [], [], 0, 0
    mask = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if (r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2 > tol2:
                mask[y * w + x] = 1
                n += 1
                sx += x
                xs.append(x); ys.append(y)
    if not n:
        return None
    return {"w": w, "h": h, "mask": mask, "px": px,
            "top": min(ys), "bottom": max(ys), "cx": sx / n,
            "height": max(ys) - min(ys) + 1, "n": n}


def analyse(frame_dir):
    fs = sorted(pathlib.Path(frame_dir).glob("f*.png"))
    rows, prev = [], None
    for p in fs:
        s = mask_and_stats(Image.open(p))
        if s is None:
            continue
        dmean = 0.0
        if prev is not None and prev["w"] == s["w"]:
            w, h = s["w"], s["h"]
            tot, cnt = 0, 0
            for y in range(0, h, 2):          # stride 2: plenty for a trend
                for x in range(0, w, 2):
                    if s["mask"][y * w + x] or prev["mask"][y * w + x]:
                        a, b = s["px"][x, y], prev["px"][x, y]
                        tot += abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])
                        cnt += 1
            dmean = tot / (3 * cnt) if cnt else 0.0
        rows.append({"f": p.stem, "bottom": s["bottom"], "cx": s["cx"],
                     "height": s["height"], "dmean": dmean})
        prev = s
    return rows


def report(name, rows):
    if not rows:
        print(f"{name}: no frames"); return
    hs = [r["height"] for r in rows]
    scale = TH / statistics.mean(hs)          # source px -> target px
    bs = [r["bottom"] for r in rows]
    cs = [r["cx"] for r in rows]
    ds = [r["dmean"] for r in rows[1:]]
    span = lambda v: max(v) - min(v)
    print(f"\n=== {name}  ({len(rows)} frames) ===")
    print(f"  baseline (bottom)  span {span(bs):7.1f} src px  -> {span(bs)*scale:6.2f} target px")
    print(f"  lateral  (cx)      span {span(cs):7.1f} src px  -> {span(cs)*scale:6.2f} target px")
    print(f"  scale    (height)  span {span(hs):7.1f} src px  -> {span(hs)*scale:6.2f} target px"
          f"   ({span(hs)/statistics.mean(hs)*100:.1f}% of height)")
    if ds:
        print(f"  frame delta        mean {statistics.mean(ds):6.2f}  min {min(ds):6.2f}  max {max(ds):6.2f}")
        stalls = [rows[i+1]['f'] for i, d in enumerate(ds) if d < 1.0]
        if stalls:
            print(f"  STALL frames (delta<1.0): {len(stalls)}  {stalls[:8]}")
        hot = [(rows[i+1]['f'], d) for i, d in enumerate(ds) if d > statistics.mean(ds) * 2.5]
        if hot:
            print(f"  MORPH spikes (delta>2.5x mean): {[(f, round(d,1)) for f, d in hot[:8]]}")


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        d = pathlib.Path(arg)
        report(d.name, analyse(d))
