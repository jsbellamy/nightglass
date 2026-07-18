"""PROTOTYPE clip strip — wipe me when trial #19 closes.

Renders a path-B clip as a wrapped filmstrip (every frame, indexed) so drift,
stall, and camera movement are visible across the whole clip at once.
"""
import sys, pathlib
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).parent
REVIEW = HERE / "review"; REVIEW.mkdir(exist_ok=True)


def strip(frame_dir, out, per_row=9, th=150, title=""):
    fs = sorted(pathlib.Path(frame_dir).glob("f*.png"))
    ims = []
    for p in fs:
        im = Image.open(p).convert("RGB")
        s = th / im.height
        ims.append((p.stem, im.resize((round(im.width * s), th), Image.LANCZOS)))
    tw = max(i.width for _, i in ims)
    rows = (len(ims) + per_row - 1) // per_row
    head = 24 if title else 0
    W = per_row * (tw + 4) + 4
    H = head + rows * (th + 4) + 4
    sheet = Image.new("RGB", (W, H), (24, 22, 30))
    d = ImageDraw.Draw(sheet)
    if title:
        d.text((5, 6), title, fill=(240, 235, 245))
    for i, (name, im) in enumerate(ims):
        r, c = divmod(i, per_row)
        x, y = 4 + c * (tw + 4), head + 4 + r * (th + 4)
        sheet.paste(im, (x, y))
        d.text((x + 3, y + 3), name[1:], fill=(255, 240, 120))
    sheet.save(out)
    print(f"{out}  {sheet.size}  ({len(ims)} frames)")


if __name__ == "__main__":
    src = HERE / sys.argv[1]
    strip(src, REVIEW / f"strip_{src.name}.png", title=f"{src.name} — path B full clip")
