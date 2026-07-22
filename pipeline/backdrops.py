"""Deterministic Stage backdrop reduce + verify (#59).

Archived raws under assets-raw/backdrops/ are center-cropped to the 480:86
battlefield aspect, then nearest-neighbour resized to 480×86. Scenery has no
logical-pixel identity — the body pipeline's no-resize rule does not apply.
See docs/backdrop-contract.md.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "assets-raw" / "backdrops"
OUT_DIR = ROOT / "src" / "assets" / "backdrops"

RUNTIME_WIDTH = 480
RUNTIME_HEIGHT = 86
ASPECT = RUNTIME_WIDTH / RUNTIME_HEIGHT

SIDECAR_SUFFIX = ".source.json"


def sidecar_key(sidecar_path: pathlib.Path) -> str:
    """Canonical backdrop key from ``<key>.source.json``."""
    name = sidecar_path.name
    if not name.endswith(SIDECAR_SUFFIX):
        raise ValueError(f"not a backdrop sidecar: {sidecar_path}")
    return name[: -len(SIDECAR_SUFFIX)]


def discover_complete_bundle_keys() -> tuple[str, ...]:
    """Lexicographically sorted keys with both archived PNG and sidecar."""
    keys: list[str] = []
    for sidecar_path in sorted(RAW_DIR.glob(f"*{SIDECAR_SUFFIX}")):
        key = sidecar_key(sidecar_path)
        if (RAW_DIR / f"{key}.png").is_file():
            keys.append(key)
    return tuple(keys)


def discover_orphan_failures() -> list[str]:
    """Return human-readable failures for half-finished archived bundles."""
    failures: list[str] = []
    sidecar_keys = {sidecar_key(p) for p in RAW_DIR.glob(f"*{SIDECAR_SUFFIX}")}
    png_keys = {p.stem for p in RAW_DIR.glob("*.png")}
    for key in sorted(sidecar_keys - png_keys):
        failures.append(f"{key}: sidecar without matching archived PNG")
    for key in sorted(png_keys - sidecar_keys):
        failures.append(f"{key}: archived PNG without provenance sidecar")
    return failures


def sha256_file(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def runtime_png_bytes(image: Image.Image) -> bytes:
    """Encode RGBA PNG without ancillary chunks that would break byte identity."""
    import io

    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=False, compress_level=9)
    return buf.getvalue()


def crop_to_aspect(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    """Crop to the battlefield aspect (center window).

    Provider dumps are typically ~16:9; the runtime band is ~5.58:1. A centered
    horizontal window keeps Stage identity (trees / bramble / terrace) while
    still landing on near-flat midground terrain for sprites. Prefer prompting
    the provider for a panoramic strip when possible (see docs/backdrop-contract.md).
    """
    width, height = image.size
    current = width / height
    if abs(current - ASPECT) < 1e-9:
        box = (0, 0, width, height)
        return image.copy(), box
    if current > ASPECT:
        target_w = int(round(height * ASPECT))
        left = (width - target_w) // 2
        box = (left, 0, left + target_w, height)
    else:
        target_h = int(round(width / ASPECT))
        top = (height - target_h) // 2
        box = (0, top, width, top + target_h)
    return image.crop(box), box


def reduce_raw(raw_path: pathlib.Path) -> tuple[bytes, dict]:
    image = Image.open(raw_path).convert("RGBA")
    source_resolution = list(image.size)
    cropped, box = crop_to_aspect(image)
    resized = cropped.resize((RUNTIME_WIDTH, RUNTIME_HEIGHT), Image.Resampling.NEAREST)
    payload = runtime_png_bytes(resized)
    reduction = {
        "crop_box": list(box),
        "crop_size": list(cropped.size),
        "resample": "NEAREST",
        "runtime_size": [RUNTIME_WIDTH, RUNTIME_HEIGHT],
    }
    return payload, {
        "source_resolution": source_resolution,
        "reduction": reduction,
    }


def build_one(key: str) -> pathlib.Path:
    raw_path = RAW_DIR / f"{key}.png"
    sidecar_path = RAW_DIR / f"{key}.source.json"
    if not raw_path.is_file():
        raise FileNotFoundError(f"missing archived raw: {raw_path}")
    if not sidecar_path.is_file():
        raise FileNotFoundError(f"missing provenance sidecar: {sidecar_path}")

    sidecar = json.loads(sidecar_path.read_text())
    expected = sidecar.get("raw_sha256")
    actual = sha256_file(raw_path)
    if expected != actual:
        raise ValueError(f"{key}: raw_sha256 mismatch (sidecar {expected}, file {actual})")

    payload, measured = reduce_raw(raw_path)
    sidecar["source_resolution"] = measured["source_resolution"]
    sidecar["reduction"] = measured["reduction"]
    sidecar["asset_class"] = "backdrop"
    sidecar["runtime_destination"] = f"src/assets/backdrops/{key}.png"
    sidecar_path.write_text(json.dumps(sidecar, indent=2) + "\n")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{key}.png"
    out_path.write_bytes(payload)
    return out_path


def build_all() -> list[pathlib.Path]:
    orphans = discover_orphan_failures()
    if orphans:
        raise ValueError("incomplete backdrop bundles:\n  " + "\n  ".join(orphans))
    return [build_one(key) for key in discover_complete_bundle_keys()]


def verify() -> int:
    fail = 0
    print("backdrop pipeline")
    orphans = discover_orphan_failures()
    for message in orphans:
        print(f"  [FAIL] {message}")
    fail += len(orphans)

    for key in discover_complete_bundle_keys():
        raw_path = RAW_DIR / f"{key}.png"
        sidecar_path = RAW_DIR / f"{key}.source.json"
        out_path = OUT_DIR / f"{key}.png"
        label = f"{key}"

        if not raw_path.is_file() or not sidecar_path.is_file() or not out_path.is_file():
            print(f"  [FAIL] {label} — missing raw, sidecar, or runtime")
            fail += 1
            continue

        sidecar = json.loads(sidecar_path.read_text())
        raw_ok = sidecar.get("raw_sha256") == sha256_file(raw_path)
        print(f"  [{'PASS' if raw_ok else 'FAIL'}] {label} raw_sha256 matches archived PNG")
        fail += not raw_ok

        payload, measured = reduce_raw(raw_path)
        committed = out_path.read_bytes()
        identical = payload == committed
        print(
            f"  [{'PASS' if identical else 'FAIL'}] {label} byte-identical rebuild "
            f"({len(committed)} bytes)"
        )
        fail += not identical

        src_res = sidecar.get("source_resolution") == measured["source_resolution"]
        red = sidecar.get("reduction") == measured["reduction"]
        print(
            f"  [{'PASS' if src_res and red else 'FAIL'}] {label} sidecar records "
            f"source_resolution + reduction"
        )
        fail += not (src_res and red)

        runtime = Image.open(out_path)
        size_ok = runtime.size == (RUNTIME_WIDTH, RUNTIME_HEIGHT)
        print(
            f"  [{'PASS' if size_ok else 'FAIL'}] {label} runtime size "
            f"{runtime.size[0]}×{runtime.size[1]}"
        )
        fail += not size_ok

    return fail


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args or args == ["build"]:
        paths = build_all()
        for path in paths:
            print(f"wrote {path.relative_to(ROOT)}")
        return 0
    if args == ["verify"]:
        return verify()
    print("usage: backdrops.py [build|verify]", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
