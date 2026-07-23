"""Stage-2 paint: text-grid cells → 34×34 runtime PNG."""

from __future__ import annotations

from PIL import Image

import acquire

from .constants import CANVAS, DRAWABLE, MAX_BODY
from .palette import (
    RuntimePalette,
    Swatch,
    ink_swatch_names,
    load_runtime_palette,
    outline_swatch_name,
)


def nearest(
    rgb: tuple[int, int, int],
    allowed: dict[str, Swatch],
) -> Swatch:
    best = next(iter(allowed.values()))
    best_d = 10**18
    for swatch in allowed.values():
        d = sum((a - b) ** 2 for a, b in zip(rgb, swatch.rgb))
        if d < best_d:
            best_d = d
            best = swatch
    return best


def strip_exterior_ink(
    cells: list[list[Swatch | None]],
    ink_names: frozenset[str],
) -> list[list[Swatch | None]]:
    h = len(cells)
    w = len(cells[0]) if h else 0

    def transparent(x: int, y: int) -> bool:
        return x < 0 or y < 0 or x >= w or y >= h or cells[y][x] is None

    out: list[list[Swatch | None]] = []
    for y, row in enumerate(cells):
        out_row: list[Swatch | None] = []
        for x, cell in enumerate(row):
            if cell is None or cell.name not in ink_names:
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


def validate_recolor_map(
    recolor: dict[str, str],
    palette_subset: frozenset[str],
    palette: RuntimePalette,
) -> None:
    for source_name, target_name in recolor.items():
        if target_name in palette_subset:
            raise ValueError(
                f"recolor map target {target_name!r} already appears in the "
                f"source palette_subset — would flatten distinct cells"
            )
        if source_name not in palette_subset:
            raise ValueError(
                f"recolor source {source_name!r} not in palette_subset"
            )
        if source_name not in palette.names:
            raise ValueError(
                f"recolor source {source_name!r} not in palette "
                f"{palette.palette_id!r}"
            )
        if target_name not in palette.names:
            raise ValueError(
                f"recolor target {target_name!r} not in palette "
                f"{palette.palette_id!r}"
            )


def apply_recolor(
    cells: list[list[Swatch | None]],
    recolor: dict[str, str],
    swatches: dict[str, Swatch],
) -> list[list[Swatch | None]]:
    if not recolor:
        return cells
    return [
        [
            None
            if cell is None
            else swatches[recolor[cell.name]]
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
    if w > MAX_BODY or h > MAX_BODY:
        raise ValueError(
            f"body {w}×{h} exceeds structural MAX_BODY {MAX_BODY} before outline ring"
        )
    if w + 2 > DRAWABLE or h + 2 > DRAWABLE:
        raise ValueError(
            f"body {w}×{h} plus outline ring exceeds {DRAWABLE}×{DRAWABLE} drawable area"
        )

    ox = 1 + (DRAWABLE - 2 - w) // 2
    oy = 1 + (DRAWABLE - 2 - h) // 2

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    mask = [[False] * CANVAS for _ in range(CANVAS)]
    for y, row in enumerate(body):
        for x, cell in enumerate(row):
            if cell is None:
                continue
            mask[oy + y][ox + x] = True

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
    palette_id: str,
    palette_subset: frozenset[str],
    recolor: dict[str, str] | None = None,
) -> Image.Image:
    runtime = load_runtime_palette(palette_id)
    allowed = {name: runtime.swatches[name] for name in palette_subset}
    validate_recolor_map(recolor or {}, palette_subset, runtime)
    quantized = [
        [None if cell is None else nearest(cell.rgb, allowed) for cell in row]
        for row in cells
    ]
    peeled = strip_exterior_ink(quantized, ink_swatch_names(palette_id))
    recolored = apply_recolor(peeled, recolor or {}, runtime.swatches)
    outline = runtime.swatches[outline_swatch_name(palette_id)]
    return derive_outline_and_paint(recolored, outline)


def paint_source_local_icon(
    cells: list[list[Swatch | None]],
    *,
    outline: Swatch,
) -> Image.Image:
    return derive_outline_and_paint(cells, outline)


def scale_nearest(im: Image.Image, factor: int) -> Image.Image:
    w, h = im.size
    return im.resize((w * factor, h * factor), Image.NEAREST)


def runtime_png_bytes(im: Image.Image) -> bytes:
    return acquire.runtime_png_bytes(im)


def sha256_bytes(data: bytes) -> str:
    import hashlib

    return hashlib.sha256(data).hexdigest()
