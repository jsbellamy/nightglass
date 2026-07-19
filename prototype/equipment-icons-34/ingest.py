#!/usr/bin/env python3
"""PROTOTYPE — AI raw → compact source ingest for Equipment icons (#125).

Reuses pipeline/acquire.py chroma-key + pitch detection, but with icon-sized
pitch bounds (no Character MIN_LOGICAL_HEIGHT=40). Writes:

  inbox/<name>.png + .source.json   archived raw + provenance
  ai-sources/<name>.png             compact 1px/cell source
  out/ai/<name>.png                 Stage-2 34×34 runtime
  out/ai/preview/<name>@8x.png      approval preview
  out/ai/ingest-report.json         recovered grid + gates + off-ramp stats
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(REPO / "pipeline"))

import acquire  # noqa: E402
from paint import (  # noqa: E402
    PALETTE,
    Swatch,
    nearest,
    paint_source_icon,
    scale_nearest,
    sha256_bytes,
    write_compact_source,
)
from sources import BOW_TO_LONGBOW, FOCUS_TO_PRISM  # noqa: E402

INBOX = ROOT / "inbox"
AI_SOURCES = ROOT / "ai-sources"
OUT = ROOT / "out" / "ai"
PREVIEW = OUT / "preview"
PUBLIC = REPO / "public" / "prototype" / "equipment-icons-34"

# Icon drawable body must leave room for a derived 1px outline inside 32×32.
MAX_BODY = 30
MIN_LONG_AXIS = 22  # SideScape uses 26 of 32; slightly looser for first trials
OFF_RAMP_REJECT = 0.15  # SideScape's 15% subject-cells-off-ramp gate


PROMPTS = {
    "dewlight-focus": (
        "TRUE chunky pixel art inventory icon ONLY. Drawn on an exact 32 by 32 "
        "logical pixel grid rendered large; every logical pixel is one clean flat "
        "square block with no smaller detail, smooth gradient, anti-aliasing, blur, "
        "or dithering. A single centered storybook night-garden fantasy item in "
        "three-quarter display angle: a round crystal dewdrop orb on a short leafy "
        "sprig stand, orb about 12 to 14 logical pixels across with cream and mint "
        "facet planes separated by value, stem and leaves at least 3 logical pixels "
        "thick. Subject long side spans about 26 to 30 logical pixels. Flat solid "
        "magenta #ff00ff background, nothing else in frame. Selective one-logical-"
        "pixel dark-plum outline, mint berry cream flat Moonberry colours, 8 to 12 "
        "colors max. No shadow, glow, sparkle, particles, text, watermark, or "
        "transparency."
    ),
    "bramblesong-bow": (
        "TRUE chunky pixel art inventory icon ONLY. Drawn on an exact 32 by 32 "
        "logical pixel grid rendered large; every logical pixel is one clean flat "
        "square block with no smaller detail, smooth gradient, anti-aliasing, blur, "
        "or dithering. A single centered storybook night-garden fantasy item in "
        "three-quarter display angle: a wooden recurve hunting bow wrapped with "
        "bramble vines, vertical limbs on the left, thin cream bowstring on the "
        "right, clear open window between bow and string, limbs at least 3 logical "
        "pixels thick. Subject long side spans about 26 to 30 logical pixels. Flat "
        "solid magenta #ff00ff background, nothing else in frame. Selective one-"
        "logical-pixel dark-plum outline, mint berry cream flat Moonberry colours, "
        "8 to 12 colors max. No shadow, glow, sparkle, particles, text, watermark, "
        "or transparency."
    ),
}

STYLE_REFS = [
    "src/assets/sprites/knight.png",
    "src/assets/sprites/wizard.png",
    "src/assets/sprites/priest.png",
]

FAMILY_RECOLOR = {
    "dewlight-focus": {"icon_key": "starfruit-prism", "recolor": FOCUS_TO_PRISM},
    "bramblesong-bow": {"icon_key": "nightvine-longbow", "recolor": BOW_TO_LONGBOW},
}


def write_provenance(raw_path: pathlib.Path, name: str) -> dict:
    raw_bytes = raw_path.read_bytes()
    refs = []
    for rel in STYLE_REFS:
        path = REPO / rel
        refs.append(
            {
                "path": rel,
                "sha256": sha256_bytes(path.read_bytes()),
                "role": "style_reference",
            }
        )
    record = {
        "provider": "Cursor GenerateImage",
        "acquisition_tool": "GenerateImage",
        "raw_sha256": sha256_bytes(raw_bytes),
        "asset_class": "interface",
        "runtime_destination": f"src/assets/icons/{name}.png",
        "style_references": refs,
        "prompt": PROMPTS[name],
        "note": "PROTOTYPE #125 — AI ingest trial for Equipment Base icons at 32×32 logical.",
    }
    sidecar = raw_path.with_suffix(".source.json")
    sidecar.write_text(json.dumps(record, indent=2) + "\n")
    return record


def recover_icon_grid(raw_path: pathlib.Path) -> tuple[list[list[tuple[int, int, int] | None]], dict]:
    """Like acquire.recover_grid, but sized for ~32×32 icons (no MIN_LOGICAL_HEIGHT=40)."""
    gate_errs = acquire.raw_gates(raw_path)
    # Sidecar is written just before recover; strip missing-sidecar noise if any.
    gate_errs = [e for e in gate_errs if "missing provenance" not in e]
    if gate_errs:
        raise ValueError("; ".join(gate_errs))

    clip = acquire.raw_clipping(raw_path)
    if clip:
        raise ValueError("; ".join(clip))

    src, fg, bbox = acquire._key(raw_path)
    x0, y0, x1, y1 = bbox
    long_side = max(x1 - x0 + 1, y1 - y0 + 1)
    # Expect roughly 24–34 logical cells across the subject bbox.
    minimum, maximum = long_side / 36.0, long_side / 18.0
    pitch_x = acquire.detect_pitch(src, fg, "x", minimum, maximum)
    pitch_y = acquire.detect_pitch(src, fg, "y", minimum, maximum)
    if pitch_x["score"] < acquire.MIN_GRID_SCORE or pitch_y["score"] < acquire.MIN_GRID_SCORE:
        raise ValueError(
            f"{raw_path.name}: pitch-fail "
            f"(scores x={pitch_x['score']:.3f}, y={pitch_y['score']:.3f})"
        )
    cells = acquire.sample_cells(src, fg, bbox, pitch_x, pitch_y)
    grid_h = len(cells)
    grid_w = len(cells[0]) if cells else 0
    meta = {
        "bbox": bbox,
        "pitch_x": {"pitch": pitch_x["pitch"], "score": pitch_x["score"]},
        "pitch_y": {"pitch": pitch_y["pitch"], "score": pitch_y["score"]},
        "grid": [grid_w, grid_h],
    }
    if grid_w > MAX_BODY or grid_h > MAX_BODY:
        raise ValueError(
            f"{raw_path.name}: overshoot recovered {grid_w}×{grid_h} "
            f"(max body {MAX_BODY}×{MAX_BODY} before outline ring)"
        )
    long_axis = max(grid_w, grid_h)
    if long_axis < MIN_LONG_AXIS:
        raise ValueError(
            f"{raw_path.name}: underfill recovered long axis {long_axis} "
            f"(need ≥{MIN_LONG_AXIS})"
        )
    return cells, meta


def cells_to_swatches(
    cells: list[list[tuple[int, int, int] | None]],
) -> tuple[list[list[Swatch | None]], dict]:
    """Quantize recovered RGB cells; report off-ramp distance stats."""
    opaque = 0
    far = 0
    distance_hist: dict[str, int] = {}
    out: list[list[Swatch | None]] = []
    for row in cells:
        out_row: list[Swatch | None] = []
        for rgb in row:
            if rgb is None:
                out_row.append(None)
                continue
            opaque += 1
            sw = nearest(rgb)
            d = sum((a - b) ** 2 for a, b in zip(rgb, sw.rgb)) ** 0.5
            # "Far" = more than ~40 RGB units from nearest moonberry swatch.
            if d > 40:
                far += 1
            distance_hist[sw.name] = distance_hist.get(sw.name, 0) + 1
            out_row.append(sw)
        out.append(out_row)
    frac = (far / opaque) if opaque else 0.0
    stats = {
        "opaque_cells": opaque,
        "far_cells": far,
        "far_fraction": round(frac, 4),
        "off_ramp_reject": frac > OFF_RAMP_REJECT,
        "quantize_histogram": distance_hist,
    }
    return out, stats


def ingest_one(name: str) -> dict:
    raw_path = INBOX / f"{name}.png"
    if not raw_path.exists():
        raise FileNotFoundError(raw_path)

    write_provenance(raw_path, name)
    rgb_cells, meta = recover_icon_grid(raw_path)
    swatches, ramp_stats = cells_to_swatches(rgb_cells)
    write_compact_source(swatches, AI_SOURCES / f"{name}.png")

    runtime = paint_source_icon(swatches, recolor={})
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    runtime.save(OUT / f"{name}.png")
    scale_nearest(runtime, 8).save(PREVIEW / f"{name}@8x.png")

    # Also paint the Tier II recolor sibling from the same ingested source.
    sibling = FAMILY_RECOLOR[name]
    sib = paint_source_icon(swatches, recolor=sibling["recolor"])
    sib_key = sibling["icon_key"]
    sib.save(OUT / f"{sib_key}.png")
    scale_nearest(sib, 8).save(PREVIEW / f"{sib_key}@8x.png")

    report = {
        "name": name,
        "raw_sha256": sha256_bytes(raw_path.read_bytes()),
        "recovered": meta,
        "ramp": ramp_stats,
        "runtime": f"out/ai/{name}.png",
        "tier2": sib_key,
        "status": "rejected-off-ramp" if ramp_stats["off_ramp_reject"] else "accepted-for-review",
    }
    print(
        f"  {name}: recovered {meta['grid'][0]}×{meta['grid'][1]}  "
        f"pitch≈{meta['pitch_x']['pitch']:.1f}/{meta['pitch_y']['pitch']:.1f}  "
        f"far={ramp_stats['far_fraction']:.1%}  → {report['status']}"
    )
    return report


def main() -> int:
    print("prototype/equipment-icons-34 — AI ingest")
    AI_SOURCES.mkdir(parents=True, exist_ok=True)
    reports = []
    for name in ("dewlight-focus", "bramblesong-bow"):
        try:
            reports.append(ingest_one(name))
        except Exception as exc:  # noqa: BLE001 — prototype: surface named failures
            reports.append({"name": name, "status": "rejected", "error": str(exc)})
            print(f"  {name}: REJECTED — {exc}")

    (OUT / "ingest-report.json").write_text(json.dumps(reports, indent=2) + "\n")

    # Sync AI runtimes into the public Armory path (overwrites hand-authored for review).
    for report in reports:
        if report.get("status") not in {"accepted-for-review", "rejected-off-ramp"}:
            continue
        name = report["name"]
        for key in (name, report.get("tier2")):
            if not key:
                continue
            src = OUT / f"{key}.png"
            if src.exists() and PUBLIC.exists():
                (PUBLIC / f"{key}.png").write_bytes(src.read_bytes())

    print(f"report → {OUT / 'ingest-report.json'}")
    return 0 if all(r.get("status") != "rejected" for r in reports) else 1


if __name__ == "__main__":
    raise SystemExit(main())
