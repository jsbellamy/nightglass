"""AI raw → text-grid source ingest for Equipment icons."""

from __future__ import annotations

import hashlib
import json
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
PIPELINE = ROOT / "pipeline"
sys.path.insert(0, str(PIPELINE))

import acquire  # noqa: E402
from acquire import detect_pitch, recover_grid, sample_cells  # noqa: E402

from .constants import (  # noqa: E402
    MAX_BODY,
    MIN_GRID_SCORE,
    MIN_LONG_AXIS,
    OFF_RAMP_FAR_RGB,
    OFF_RAMP_REJECT,
    PITCH_MAX_DIVISOR,
    PITCH_MIN_DIVISOR,
)
from .palette import PALETTE, Swatch  # noqa: E402
from .paint import nearest  # noqa: E402
from .text_source import TextSource, cells_to_source, write_text  # noqa: E402

# Character stills use recover_grid end-to-end; icons share the same primitives
# with icon pitch bounds in recover_icon_grid below.
_ICON_SHARED_RECOVER = recover_grid


def recover_icon_grid(
    raw_path: pathlib.Path,
) -> tuple[list[list[tuple[int, int, int] | None]], dict]:
    """Recover logical cells from a provider raw using shared acquire primitives."""
    gate_errs = acquire.raw_gates(raw_path)
    gate_errs = [e for e in gate_errs if "missing provenance" not in e]
    if gate_errs:
        raise ValueError("; ".join(gate_errs))

    clip = acquire.raw_clipping(raw_path)
    if clip:
        raise ValueError("; ".join(clip))

    src, fg, bbox = acquire._key(raw_path)
    x0, y0, x1, y1 = bbox
    long_side = max(x1 - x0 + 1, y1 - y0 + 1)
    minimum, maximum = long_side / PITCH_MIN_DIVISOR, long_side / PITCH_MAX_DIVISOR
    pitch_x = detect_pitch(src, fg, "x", minimum, maximum)
    pitch_y = detect_pitch(src, fg, "y", minimum, maximum)
    if pitch_x["score"] < MIN_GRID_SCORE or pitch_y["score"] < MIN_GRID_SCORE:
        raise ValueError(
            f"{raw_path.name}: pitch-fail "
            f"(scores x={pitch_x['score']:.3f}, y={pitch_y['score']:.3f}, "
            f"floor={MIN_GRID_SCORE})"
        )
    cells = sample_cells(src, fg, bbox, pitch_x, pitch_y)
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
    palette_subset: tuple[str, ...],
) -> tuple[list[list[Swatch | None]], dict]:
    allowed = {name: PALETTE[name] for name in palette_subset}
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
            sw = nearest(rgb, allowed)
            d = sum((a - b) ** 2 for a, b in zip(rgb, sw.rgb)) ** 0.5
            if d > OFF_RAMP_FAR_RGB:
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


def ingest_raw_to_text_source(
    raw_path: pathlib.Path,
    *,
    source_key: str,
    palette_subset: tuple[str, ...],
    out_path: pathlib.Path,
) -> dict:
    rgb_cells, meta = recover_icon_grid(raw_path)
    swatches, ramp_stats = cells_to_swatches(rgb_cells, palette_subset)
    if ramp_stats["off_ramp_reject"]:
        raise ValueError(
            f"{raw_path.name}: off-ramp reject "
            f"({ramp_stats['far_fraction']:.1%} > {OFF_RAMP_REJECT:.0%})"
        )
    source = cells_to_source(source_key, palette_subset, swatches)
    write_text(out_path, source)
    return {"recovered": meta, "ramp": ramp_stats}


def write_provenance_sidecar(raw_path: pathlib.Path, *, provider: str = "synthetic-fixture") -> None:
    raw_bytes = raw_path.read_bytes()
    record = {
        "provider": provider,
        "raw_sha256": hashlib.sha256(raw_bytes).hexdigest(),
        "asset_class": "interface",
        "note": "Equipment icon ingest fixture or evidence raw",
    }
    raw_path.with_suffix(".source.json").write_text(json.dumps(record, indent=2) + "\n")
