"""PROTOTYPE — Stage-2 compact-source → 34×34 runtime painter.

Nightglass-owned adaptation of SideScape's paintSourceIcon shape:
quantize → strip exterior ink → optional recolor → derive outline ring → center on 34×34.

Throwaway for wayfinder ticket #125. Do not promote unchanged into pipeline/.
"""

from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
PALETTE_PATH = ROOT / "pipeline" / "palette.json"

CANVAS = 34
DRAWABLE = 32  # body + derived outline must fit inside 1..32 of the 34 canvas
OUTLINE_NAME = "contour-plum-deepest"
INK_NAMES = frozenset(
    {
        "contour-plum-deepest",
        "contour-plum-deep",
        "contour-plum",
    }
)


@dataclass(frozen=True)
class Swatch:
    name: str
    rgb: tuple[int, int, int]

    @property
    def rgba(self) -> tuple[int, int, int, int]:
        return (*self.rgb, 255)


def load_palette() -> dict[str, Swatch]:
    data = json.loads(PALETTE_PATH.read_text())
    return {
        entry["name"]: Swatch(entry["name"], tuple(entry["rgb"]))
        for entry in data["colors"]
    }


PALETTE = load_palette()


def nearest(rgb: tuple[int, int, int], allowed: dict[str, Swatch] | None = None) -> Swatch:
    pool = allowed or PALETTE
    best = next(iter(pool.values()))
    best_d = 10**18
    for swatch in pool.values():
        d = sum((a - b) ** 2 for a, b in zip(rgb, swatch.rgb))
        if d < best_d:
            best_d = d
            best = swatch
    return best


def grid_from_png(path: pathlib.Path) -> list[list[Swatch | None]]:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    cells: list[list[Swatch | None]] = []
    for y in range(h):
        row: list[Swatch | None] = []
        for x in range(w):
            r, g, b, a = im.getpixel((x, y))
            if a < 128:
                row.append(None)
            else:
                row.append(nearest((r, g, b)))
        cells.append(row)
    return cells


def grid_from_rows(rows: list[str], legend: dict[str, str]) -> list[list[Swatch | None]]:
    width = len(rows[0])
    cells: list[list[Swatch | None]] = []
    for row in rows:
        if len(row) != width:
            raise ValueError(f"ragged row length {len(row)} != {width}")
        out_row: list[Swatch | None] = []
        for ch in row:
            if ch == ".":
                out_row.append(None)
                continue
            name = legend[ch]
            out_row.append(PALETTE[name])
        cells.append(out_row)
    return cells


def write_compact_source(cells: list[list[Swatch | None]], path: pathlib.Path) -> None:
    h = len(cells)
    w = len(cells[0]) if h else 0
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, row in enumerate(cells):
        for x, cell in enumerate(row):
            if cell is not None:
                im.putpixel((x, y), cell.rgba)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)


def strip_exterior_ink(cells: list[list[Swatch | None]]) -> list[list[Swatch | None]]:
    h = len(cells)
    w = len(cells[0]) if h else 0

    def transparent(x: int, y: int) -> bool:
        return x < 0 or y < 0 or x >= w or y >= h or cells[y][x] is None

    out: list[list[Swatch | None]] = []
    for y, row in enumerate(cells):
        out_row: list[Swatch | None] = []
        for x, cell in enumerate(row):
            if cell is None or cell.name not in INK_NAMES:
                out_row.append(cell)
                continue
            exterior = (
                transparent(x - 1, y)
                or transparent(x + 1, y)
                or transparent(x, y - 1)
                or transparent(x, y + 1)
            )
            out_row.append(None if exterior else cell)
        out.append(out_row)
    return out


def apply_recolor(
    cells: list[list[Swatch | None]],
    recolor: dict[str, str],
) -> list[list[Swatch | None]]:
    if not recolor:
        return cells
    return [
        [
            None
            if cell is None
            else PALETTE[recolor[cell.name]]
            if cell.name in recolor
            else cell
            for cell in row
        ]
        for row in cells
    ]


def opaque_bbox(cells: list[list[Swatch | None]]) -> tuple[int, int, int, int]:
    ys = [y for y, row in enumerate(cells) for cell in row if cell is not None]
    xs = [x for row in cells for x, cell in enumerate(row) if cell is not None]
    if not xs:
        return 0, 0, 0, 0
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def crop_to_opaque(cells: list[list[Swatch | None]]) -> list[list[Swatch | None]]:
    x0, y0, x1, y1 = opaque_bbox(cells)
    if x1 <= x0:
        return [[]]
    return [row[x0:x1] for row in cells[y0:y1]]


def derive_outline_and_paint(
    body: list[list[Swatch | None]],
    outline: Swatch,
) -> Image.Image:
    body = crop_to_opaque(body)
    h = len(body)
    w = len(body[0]) if h else 0
    if w + 2 > DRAWABLE or h + 2 > DRAWABLE:
        raise ValueError(
            f"body {w}×{h} plus outline ring exceeds {DRAWABLE}×{DRAWABLE} drawable area"
        )

    # Place body so outline ring stays inside the 1..32 drawable band of the 34 canvas.
    ox = 1 + (DRAWABLE - 2 - w) // 2
    oy = 1 + (DRAWABLE - 2 - h) // 2

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    mask = [[False] * CANVAS for _ in range(CANVAS)]
    for y, row in enumerate(body):
        for x, cell in enumerate(row):
            if cell is None:
                continue
            mask[oy + y][ox + x] = True

    # Exterior 4-neighbour ring.
    for y in range(CANVAS):
        for x in range(CANVAS):
            if mask[y][x]:
                continue
            if (
                (x > 0 and mask[y][x - 1])
                or (x + 1 < CANVAS and mask[y][x + 1])
                or (y > 0 and mask[y - 1][x])
                or (y + 1 < CANVAS and mask[y + 1][x])
            ):
                canvas.putpixel((x, y), outline.rgba)

    for y, row in enumerate(body):
        for x, cell in enumerate(row):
            if cell is not None:
                canvas.putpixel((ox + x, oy + y), cell.rgba)
    return canvas


def paint_source_icon(
    cells: list[list[Swatch | None]],
    *,
    recolor: dict[str, str] | None = None,
) -> Image.Image:
    # Sources may already be on-palette (hand-authored). Quantize anyway so AI ingest
    # and direct authoring share one Stage-2 path.
    quantized = [
        [None if cell is None else nearest(cell.rgb) for cell in row] for row in cells
    ]
    peeled = strip_exterior_ink(quantized)
    recolored = apply_recolor(peeled, recolor or {})
    return derive_outline_and_paint(recolored, PALETTE[OUTLINE_NAME])


def scale_nearest(im: Image.Image, factor: int) -> Image.Image:
    w, h = im.size
    return im.resize((w * factor, h * factor), Image.NEAREST)


def sha256_bytes(data: bytes) -> str:
    import hashlib

    return hashlib.sha256(data).hexdigest()


def png_bytes(im: Image.Image) -> bytes:
    import io

    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()
