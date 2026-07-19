"""PROTOTYPE Qwen review sheet — wipe me when trial #26 closes.

Lays rawQ keyframes as one row per (action, frame) with seeds left-to-right,
so pose response and seed variance are readable at a glance.
"""
import pathlib
import re
import sys

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).parent
REVIEW = HERE / "review"
REVIEW.mkdir(exist_ok=True)
THUMB_H = 220
PAD = 6
LABEL_W = 220


def build(paths_by_row, out, title=""):
    rows = list(paths_by_row.items())
    ncol = max((len(v) for _, v in rows), default=0)
    if not rows or ncol == 0:
        raise SystemExit("no images")
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
            m = re.search(r"_s(\d+)$", p.stem)
            tag = f"s{m.group(1)}" if m else p.stem[-6:]
            d.text((x + 3, y + 3), tag, fill=(255, 240, 120))
    sheet.save(out)
    print(f"{out}  {sheet.size}")
    return sheet


if __name__ == "__main__":
    # usage: sheet_qwen.py [glob-prefix] [out-name]
    src = HERE / "rawQ"
    prefix = sys.argv[1] if len(sys.argv) > 1 else "knight_"
    out = REVIEW / f"{sys.argv[2] if len(sys.argv) > 2 else 'qwen_pose_edits'}.png"
    files = sorted(src.glob(f"{prefix}*.png"))
    rows = {}
    for f in files:
        # knight_basic_attack_a0_s103 -> basic_attack a0
        m = re.match(r"knight_([^_]+(?:_[^_]+)?)_(a\d+)_s\d+$", f.stem)
        if not m:
            key = f.stem
        else:
            key = f"{m.group(1)} {m.group(2)}"
        rows.setdefault(key, []).append(f)
    for k in rows:
        rows[k].sort(key=lambda p: p.stem)
    # Stable row order matching the protocol matrix.
    order = [
        "basic_attack a0",
        "basic_attack a1",
        "basic_attack a2",
        "basic_attack a3",
        "hurt a0",
        "knockout a2",
    ]
    ordered = {k: rows[k] for k in order if k in rows}
    for k, v in rows.items():
        if k not in ordered:
            ordered[k] = v
    build(ordered, out, title="Qwen-Image-Edit-2511 pose edits — knight_seed103 (raw)")
