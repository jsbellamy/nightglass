"""PROTOTYPE review sheet — wipe me when trial #19 closes.

Lays raw keyframes out as one row per variant so a sequence reads left-to-right
and variants stack for comparison. Row label is burned in so the sheet is
self-describing when pasted into the issue.
"""
import sys, pathlib, re
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).parent
REVIEW = HERE / "review"; REVIEW.mkdir(exist_ok=True)
THUMB_H = 220
PAD = 6
LABEL_W = 190


def build(paths_by_row, out, title=""):
    rows = list(paths_by_row.items())
    ncol = max(len(v) for _, v in rows)
    thumbs = {}
    tw = 0
    for _, ps in rows:
        for p in ps:
            im = Image.open(p).convert("RGB")
            s = THUMB_H / im.height
            im = im.resize((round(im.width * s), THUMB_H), Image.LANCZOS)
            thumbs[p] = im
            tw = max(tw, im.width)
    W = LABEL_W + ncol * (tw + PAD) + PAD
    head = 26 if title else 0
    H = head + len(rows) * (THUMB_H + PAD) + PAD
    sheet = Image.new("RGB", (W, H), (24, 22, 30))
    d = ImageDraw.Draw(sheet)
    if title:
        d.text((PAD, 7), title, fill=(240, 235, 245))
    for r, (label, ps) in enumerate(rows):
        y = head + PAD + r * (THUMB_H + PAD)
        d.text((PAD, y + THUMB_H // 2 - 4), label, fill=(200, 195, 210))
        for c, p in enumerate(ps):
            x = LABEL_W + c * (tw + PAD)
            sheet.paste(thumbs[p], (x, y))
            d.text((x + 3, y + 3), pathlib.Path(p).stem.split("_")[-2], fill=(255, 240, 120))
    sheet.save(out)
    print(f"{out}  {sheet.size}")
    return sheet


if __name__ == "__main__":
    # usage: sheet.py <rawdir> <glob-prefix> <out-name>  e.g. sheet.py rawA knight_basic_attack sweep
    src = HERE / sys.argv[1]
    prefix = sys.argv[2]
    out = REVIEW / f"{sys.argv[3]}.png"
    files = sorted(src.glob(f"{prefix}*.png"))
    rows = {}
    for f in files:
        m = re.search(r"_(d\d+)$", f.stem)
        key = m.group(1) if m else "seq"
        rows.setdefault(f"{prefix} {key}", []).append(f)
    for k in rows:
        rows[k].sort(key=lambda p: p.stem)
    build(rows, out, title=f"{prefix} — path A denoise sweep (raw 512x768)")
