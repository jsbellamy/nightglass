from __future__ import annotations

import json
import pathlib
import re
from dataclasses import dataclass

ROOT = pathlib.Path(__file__).resolve().parents[2]

PALETTE_PATHS = {
    "moonberry-16": ROOT / "pipeline" / "palette.json",
    "fowl-harvest-24": ROOT / "pipeline" / "palettes" / "fowl-harvest-24.json",
}

DEFAULT_SOURCE_PALETTE_ID = "moonberry-16"

NAMED_PALETTE_COLOR_MODE = "named-palette"
SOURCE_LOCAL_COLOR_MODE = "source-local"
# Common charcoal-plum outline for Ability (Loadout) icons — contour-plum-deepest read.
SOURCE_LOCAL_OUTLINE_RGB: tuple[int, int, int] = (58, 6, 20)

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

_RGB_TOKEN = re.compile(r"^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$")


def parse_opaque_rgb(token: str, *, context: str) -> tuple[int, int, int]:
    match = _RGB_TOKEN.fullmatch(token)
    if not match:
        raise ValueError(f"{context}: malformed rgb {token!r} (expected r,g,b)")
    parts = tuple(int(match.group(i)) for i in range(1, 4))
    if any(channel < 0 or channel > 255 for channel in parts):
        raise ValueError(f"{context}: rgb out of range {token!r}")
    return parts  # type: ignore[return-value]


def format_opaque_rgb(rgb: tuple[int, int, int]) -> str:
    return f"{rgb[0]},{rgb[1]},{rgb[2]}"


def validate_source_local_outline(rgb: tuple[int, int, int]) -> None:
    if rgb != SOURCE_LOCAL_OUTLINE_RGB:
        raise ValueError(
            f"outline rgb {rgb!r} must match common Ability outline "
            f"{SOURCE_LOCAL_OUTLINE_RGB!r}"
        )


def swatch_for_local_rgb(rgb: tuple[int, int, int]) -> Swatch:
    return Swatch(format_opaque_rgb(rgb), rgb)
