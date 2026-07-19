#!/usr/bin/env python3
"""PROTOTYPE — one-command build for the #125 Equipment icon workflow probe.

  python3 prototype/equipment-icons-34/build.py

Writes:
  sources/<family>.png          committed-style compact sources
  out/<iconKey>.png             34×34 runtime icons (moonberry-16 + derived outline)
  out/preview/<iconKey>@8x.png  Stage-2 preview (approval target)
  out/family-sheet@8x.png       both families side-by-side for review
  out/rebuild-evidence.json     byte-stable rebuild proof
  public/prototype/...          browser-served copies for Armory review
"""

from __future__ import annotations

import json
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from paint import (  # noqa: E402
    CANVAS,
    paint_source_icon,
    png_bytes,
    scale_nearest,
    sha256_bytes,
    write_compact_source,
)
from sources import FAMILIES  # noqa: E402

from PIL import Image

OUT = ROOT / "out"
PREVIEW = OUT / "preview"
SOURCES = ROOT / "sources"
PUBLIC = ROOT.parents[1] / "public" / "prototype" / "equipment-icons-34"


def build_once() -> dict[str, str]:
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    SOURCES.mkdir(parents=True, exist_ok=True)

    hashes: dict[str, str] = {}
    runtimes: dict[str, Image.Image] = {}

    for family in FAMILIES:
        cells = family["grid"]()
        source_path = SOURCES / f"{family['source_key']}.png"
        write_compact_source(cells, source_path)
        hashes[f"source:{family['source_key']}"] = sha256_bytes(source_path.read_bytes())

        for variant in family["variants"]:
            icon = paint_source_icon(cells, recolor=variant["recolor"])
            key = variant["icon_key"]
            raw = png_bytes(icon)
            (OUT / f"{key}.png").write_bytes(raw)
            scale_nearest(icon, 8).save(PREVIEW / f"{key}@8x.png")
            hashes[f"runtime:{key}"] = sha256_bytes(raw)
            runtimes[key] = icon
            print(f"  {key}: {icon.size[0]}×{icon.size[1]}  sha256={hashes[f'runtime:{key}'][:12]}…")

    # Family contact sheet: Tier I | Tier II for each family, native then @8 for eyes.
    order = [
        "dewlight-focus",
        "starfruit-prism",
        "bramblesong-bow",
        "nightvine-longbow",
    ]
    gap = 4
    sheet_w = CANVAS * 4 + gap * 3
    sheet = Image.new("RGBA", (sheet_w, CANVAS), (255, 0, 255, 255))
    for i, key in enumerate(order):
        sheet.paste(runtimes[key], (i * (CANVAS + gap), 0), runtimes[key])
    sheet.save(OUT / "family-sheet.png")
    scale_nearest(sheet, 8).save(OUT / "family-sheet@8x.png")
    hashes["runtime:family-sheet"] = sha256_bytes(png_bytes(sheet))
    return hashes


def sync_public() -> None:
    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    shutil.copytree(OUT, PUBLIC)


def main() -> int:
    print("prototype/equipment-icons-34 — Stage-2 build")
    first = build_once()
    second = build_once()
    mismatched = sorted(k for k in first if first[k] != second[k])
    evidence = {
        "canvas": CANVAS,
        "palette": "moonberry-16",
        "outline": "contour-plum-deepest (derived)",
        "families": [
            {
                "source": f["source_key"],
                "variants": [v["icon_key"] for v in f["variants"]],
            }
            for f in FAMILIES
        ],
        "pass_1": first,
        "pass_2": second,
        "byte_stable": len(mismatched) == 0,
        "mismatched": mismatched,
    }
    (OUT / "rebuild-evidence.json").write_text(json.dumps(evidence, indent=2) + "\n")
    sync_public()
    print(f"byte_stable={evidence['byte_stable']}  public -> {PUBLIC}")
    if mismatched:
        print("REBUILD DRIFT:", mismatched)
        return 1
    print("OK — review out/family-sheet@8x.png and Armory with ?prototype=equipment-icons-34")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
