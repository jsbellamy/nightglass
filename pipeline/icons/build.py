"""Offline rebuild: text sources → runtime icons + manifest."""

from __future__ import annotations

import json
import pathlib
import sys

from PIL import Image

if __name__ == "__main__" and __package__ is None:
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
    __package__ = "icons"

from .constants import CANVAS
from .palette import (
    NAMED_PALETTE_COLOR_MODE,
    SOURCE_LOCAL_COLOR_MODE,
    outline_swatch_name,
    swatch_for_local_rgb,
)
from .paint import (
    paint_source_icon,
    paint_source_local_icon,
    runtime_png_bytes,
    scale_nearest,
    sha256_bytes,
)
from .registry import ALL_BUILD_FAMILIES, FAMILIES, validate_registry
from .text_source import cells_from_source, parse_text

ROOT = pathlib.Path(__file__).resolve().parents[2]
ICON_SOURCES = ROOT / "src" / "assets" / "icon-sources"
OUT_DIR = ROOT / "src" / "assets" / "icons"
PREVIEW_DIR = OUT_DIR / "preview"

# Human identification review is on the twelve Equipment Bases only — exclude
# the synthetic verify-canary bars from the contact sheet (#131).
_CONTACT_SHEET_KEYS = frozenset(
    variant.icon_key for family in FAMILIES for variant in family.variants
)


def source_path_for(family_source_rel: str) -> pathlib.Path:
    return ICON_SOURCES / family_source_rel


def build_contact_sheet(runtimes: dict[str, Image.Image]) -> None:
    equipment = {k: v for k, v in runtimes.items() if k in _CONTACT_SHEET_KEYS}
    if not equipment:
        return
    keys = sorted(equipment.keys())
    gap = 4
    sheet_w = CANVAS * len(keys) + gap * (len(keys) - 1)
    sheet = Image.new("RGBA", (sheet_w, CANVAS), (255, 0, 255, 255))
    for i, key in enumerate(keys):
        sheet.paste(equipment[key], (i * (CANVAS + gap), 0), equipment[key])
    sheet.save(OUT_DIR / "family-sheet.png")
    scale_nearest(sheet, 8).save(OUT_DIR / "family-sheet@8x.png")


def build_all() -> dict[str, str]:
    validate_registry()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict = {}
    runtimes: dict[str, Image.Image] = {}
    hashes: dict[str, str] = {}

    for family in ALL_BUILD_FAMILIES:
        path = source_path_for(family.source_rel)
        if not path.exists():
            continue
        hashes[f"source:{family.source_key}"] = sha256_bytes(path.read_bytes())
        source = parse_text(path)
        if source.source_key != family.source_key:
            raise ValueError(f"{path}: source_key mismatch")
        if source.color_mode != family.color_mode:
            raise ValueError(
                f"{path}: color_mode {source.color_mode!r} does not match family "
                f"{family.color_mode!r}"
            )
        cells = cells_from_source(source)
        if family.color_mode == SOURCE_LOCAL_COLOR_MODE:
            if source.outline_rgb is None:
                raise ValueError(f"{path}: source-local source missing outline")
            outline = swatch_for_local_rgb(source.outline_rgb)
            for variant in family.variants:
                icon = paint_source_local_icon(cells, outline=outline)
                raw = runtime_png_bytes(icon)
                key = variant.icon_key
                (OUT_DIR / f"{key}.png").write_bytes(raw)
                scale_nearest(icon, 8).save(PREVIEW_DIR / f"{key}@8x.png")
                hashes[f"runtime:{key}"] = sha256_bytes(raw)
                manifest[key] = {
                    "canvas": [CANVAS, CANVAS],
                    "color_mode": SOURCE_LOCAL_COLOR_MODE,
                    "outline": list(source.outline_rgb),
                    "source_family": family.source_key,
                    "sha256": hashes[f"runtime:{key}"],
                }
                runtimes[key] = icon
            continue
        if source.palette_id != family.palette_id:
            raise ValueError(
                f"{path}: palette {source.palette_id!r} does not match family "
                f"{family.palette_id!r}"
            )
        subset = frozenset(family.palette_subset)
        outline_name = outline_swatch_name(family.palette_id)
        for variant in family.variants:
            icon = paint_source_icon(
                cells,
                palette_id=family.palette_id,
                palette_subset=subset,
                recolor=variant.recolor,
            )
            raw = runtime_png_bytes(icon)
            key = variant.icon_key
            (OUT_DIR / f"{key}.png").write_bytes(raw)
            scale_nearest(icon, 8).save(PREVIEW_DIR / f"{key}@8x.png")
            hashes[f"runtime:{key}"] = sha256_bytes(raw)
            manifest[key] = {
                "canvas": [CANVAS, CANVAS],
                "palette": family.palette_id,
                "outline": outline_name,
                "source_family": family.source_key,
                "sha256": hashes[f"runtime:{key}"],
            }
            runtimes[key] = icon

    build_contact_sheet(runtimes)
    if (OUT_DIR / "family-sheet.png").exists():
        hashes["runtime:family-sheet"] = sha256_bytes(
            (OUT_DIR / "family-sheet.png").read_bytes()
        )

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return hashes


def main() -> int:
    first = build_all()
    second = build_all()
    mismatched = sorted(k for k in first if first.get(k) != second.get(k))
    if mismatched:
        print("icon rebuild drift:", mismatched)
        return 1
    print(f"icons -> {OUT_DIR} ({len(first)} digests stable)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
