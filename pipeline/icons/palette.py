from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass

ROOT = pathlib.Path(__file__).resolve().parents[2]
PALETTE_PATH = ROOT / "pipeline" / "palette.json"


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
PALETTE_NAMES = frozenset(PALETTE.keys())
