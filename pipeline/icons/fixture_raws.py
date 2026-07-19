"""Synthetic provider raws for fixture-gated ingest tests."""

from __future__ import annotations

import pathlib
import random

from PIL import Image

import acquire

from .ingest import write_provenance_sidecar

MAGENTA = acquire.MAGENTA


def _save_raw(im: Image.Image, path: pathlib.Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    write_provenance_sidecar(path)


def _logical_block_raw(
    logical_w: int,
    logical_h: int,
    *,
    pitch: int = 32,
    fill_rgb: tuple[int, int, int] = (113, 174, 146),
    alt_rgb: tuple[int, int, int] = (98, 165, 140),
    off_palette_fraction: float = 0.0,
    rng: random.Random | None = None,
) -> Image.Image:
    """Render a flat-block subject on magenta for grid recovery."""
    pad = pitch * 2
    w = logical_w * pitch + pad * 2
    h = logical_h * pitch + pad * 2
    im = Image.new("RGBA", (w, h), (*MAGENTA, 255))
    px = im.load()
    rng = rng or random.Random(0)
    for gy in range(logical_h):
        for gx in range(logical_w):
            rgb = alt_rgb if (gx + gy) % 2 else fill_rgb
            if off_palette_fraction > 0 and rng.random() < off_palette_fraction:
                rgb = (255, 128, 0)
            x0 = pad + gx * pitch
            y0 = pad + gy * pitch
            for y in range(y0, y0 + pitch):
                for x in range(x0, x0 + pitch):
                    px[x, y] = (*rgb, 255)
    return im


def write_gate_fixtures(fixtures_dir: pathlib.Path) -> None:
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    # MIN_LONG_AXIS: pass at 20, fail at 19
    _save_raw(_logical_block_raw(20, 8), fixtures_dir / "long-axis-pass.png")
    _save_raw(_logical_block_raw(19, 8), fixtures_dir / "long-axis-fail.png")

    # Off-ramp 20% (#131 retune): pass ~0%, fail ~25% off-palette cells
    _save_raw(
        _logical_block_raw(22, 10, off_palette_fraction=0.0),
        fixtures_dir / "off-ramp-pass.png",
    )
    _save_raw(
        _logical_block_raw(
            22,
            10,
            off_palette_fraction=0.25,
            rng=random.Random(42),
        ),
        fixtures_dir / "off-ramp-fail.png",
    )

    # Grid recovery: clean blocks pass; smooth gradient fails pitch confidence
    _save_raw(
        _logical_block_raw(22, 12, pitch=32),
        fixtures_dir / "grid-recovery-pass.png",
    )
    grad = Image.new("RGBA", (640, 640), (*MAGENTA, 255))
    gpx = grad.load()
    for y in range(80, 560):
        for x in range(80, 560):
            t = (x - 80) / 480
            gpx[x, y] = (
                int(113 + 40 * t),
                int(174 - 30 * t),
                int(146 + 10 * t),
                255,
            )
    _save_raw(grad, fixtures_dir / "grid-recovery-fail.png")
