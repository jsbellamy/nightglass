from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass

ROOT = pathlib.Path(__file__).resolve().parents[2]

PALETTE_PATHS = {
    "moonberry-16": ROOT / "pipeline" / "palette.json",
    "fowl-harvest-24": ROOT / "pipeline" / "palettes" / "fowl-harvest-24.json",
}

DEFAULT_SOURCE_PALETTE_ID = "moonberry-16"

OUTLINE_SWATCH_BY_PALETTE: dict[str, str] = {
    "moonberry-16": "contour-plum-deepest",
    "fowl-harvest-24": "oil-ink",
}

INK_SWATCHES_BY_PALETTE: dict[str, frozenset[str]] = {
    "moonberry-16": frozenset(
        {
            "contour-plum-deepest",
            "contour-plum-deep",
            "contour-plum",
        }
    ),
    "fowl-harvest-24": frozenset(
        {
            "oil-ink",
            "crow-black",
            "bruise-plum",
        }
    ),
}

# Legacy single-path alias (Moonberry file location).
PALETTE_PATH = PALETTE_PATHS[DEFAULT_SOURCE_PALETTE_ID]


def outline_swatch_name(palette_id: str) -> str:
    try:
        return OUTLINE_SWATCH_BY_PALETTE[palette_id]
    except KeyError as exc:
        raise ValueError(f"unknown palette id {palette_id!r}") from exc


def ink_swatch_names(palette_id: str) -> frozenset[str]:
    try:
        return INK_SWATCHES_BY_PALETTE[palette_id]
    except KeyError as exc:
        raise ValueError(f"unknown palette id {palette_id!r}") from exc

_RUNTIME_CACHE: dict[str, RuntimePalette] = {}


@dataclass(frozen=True)
class Swatch:
    name: str
    rgb: tuple[int, int, int]

    @property
    def rgba(self) -> tuple[int, int, int, int]:
        return (*self.rgb, 255)


@dataclass(frozen=True)
class RuntimePalette:
    palette_id: str
    version: int
    swatches: dict[str, Swatch]
    names: frozenset[str]


def load_runtime_palette(palette_id: str) -> RuntimePalette:
    if palette_id not in PALETTE_PATHS:
        raise ValueError(f"unknown palette id {palette_id!r}")
    cached = _RUNTIME_CACHE.get(palette_id)
    if cached is not None:
        return cached
    path = PALETTE_PATHS[palette_id]
    data = json.loads(path.read_text())
    swatches = {
        entry["name"]: Swatch(entry["name"], tuple(entry["rgb"]))
        for entry in data["colors"]
    }
    loaded = RuntimePalette(
        palette_id=palette_id,
        version=int(data["version"]),
        swatches=swatches,
        names=frozenset(swatches.keys()),
    )
    _RUNTIME_CACHE[palette_id] = loaded
    return loaded


def load_palette() -> dict[str, Swatch]:
    return dict(load_runtime_palette(DEFAULT_SOURCE_PALETTE_ID).swatches)


PALETTE = load_palette()
PALETTE_NAMES = frozenset(PALETTE.keys())
