"""Provider-neutral acquisition toolchain — grid recovery, validator, manifest.

Reference implementation of the contract settled in #21 and amended by #29.

PROVIDER-NEUTRAL BY CONSTRUCTION. This module imports no generator, opens no
socket, and loads no model. Its only input is the archived raw bundle
(`assets-raw/grid_raw/*.png` plus provenance sidecars). Running it with the
provider absent and the network down reproduces byte-identical runtime frames.

    normalize  raw PNG  -> key magenta -> recover logical grid -> tier runtime frame
    validate   frame(s)  -> [] or a list of rejection reasons
    manifest   frames    -> integer-ms animation manifest

Determinism guarantees:
  * alpha is BINARIZED at 128 -- a runtime frame's alpha is exactly 0 or 255
  * colour is quantized nearest-in-RGB to palette.json with NO dithering,
    stochastic or ordered -- identical input always yields identical output
  * the source logical grid is sampled 1:1; the raw render is never resized
"""
from __future__ import annotations

import hashlib
import json
import math
import pathlib
import struct
import zlib
from dataclasses import dataclass
from typing import Iterable

from PIL import Image

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
RAW_DIR = ROOT / "assets-raw" / "grid_raw"
OUT_DIR = ROOT / "src" / "assets" / "sprites"
ALPHA_CUT = 128
MAGENTA = (255, 0, 255)
KEY_TOLERANCE = 40
MIN_GRID_SCORE = 0.04


@dataclass(frozen=True)
class Frame:
    """Acquisition geometry for one monster size tier."""

    w: int
    h: int
    min_logical_height: int


FRAMES = {
    "small": Frame(w=24, h=32, min_logical_height=26),
    "medium": Frame(w=32, h=48, min_logical_height=40),
    "large": Frame(w=48, h=72, min_logical_height=60),
}

MEDIUM = FRAMES["medium"]

OUTPUT_NAMES = {
    "knight": "knight",
    "wizard": "wizard",
    "priest": "priest",
    "hunter": "hunter",
    "pipcap": "pipcap",
    "boss": "boss-1",
    # Stage 2/3 Boss stills (#57): raw tags match runtime names (unlike boss→boss-1).
    "boss-2": "boss-2",
    "boss-3": "boss-3",
}
DEFAULT_TAGS = (
    "knight", "wizard", "priest", "hunter", "pipcap", "boss", "boss-2", "boss-3",
)

PALETTE = [tuple(c["rgb"]) for c in
           json.loads((HERE / "palette.json").read_text())["colors"]]
PALETTE_SET = set(PALETTE)

# Minimal PNG writer (filter-none rows + zlib level 9). Pillow's adaptive
# row filters differ across OS/libpng builds for some frames, so we avoid it
# for committed runtime bytes that CI must rebuild byte-identically.
RUNTIME_PNG_ZLIB_LEVEL = 9


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    checksum = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", checksum)


def runtime_png_bytes(frame: Image.Image) -> bytes:
    """Encode a runtime frame to PNG with platform-independent settings."""
    if frame.mode != "RGBA":
        frame = frame.convert("RGBA")
    w, h = frame.size
    row_bytes = w * 4
    pixels = frame.tobytes()
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # PNG filter type None -- fixed for cross-platform bytes
        start = y * row_bytes
        raw.extend(pixels[start:start + row_bytes])
    compressed = zlib.compress(bytes(raw), level=RUNTIME_PNG_ZLIB_LEVEL)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", compressed)
        + _png_chunk(b"IEND", b"")
    )


def save_runtime_png(frame: Image.Image, path: pathlib.Path) -> None:
    path.write_bytes(runtime_png_bytes(frame))


# --------------------------------------------------------------- normalizer

def _nearest(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    return min(PALETTE, key=lambda p: sum((rgb[i] - p[i]) ** 2 for i in range(3)))


def _within_magenta(pixel: tuple[int, int, int, int]) -> bool:
    return all(abs(pixel[i] - MAGENTA[i]) <= KEY_TOLERANCE for i in range(3))


def _within_key(pixel: tuple[int, int, int, int]) -> bool:
    return pixel[3] < ALPHA_CUT or _within_magenta(pixel)


def _key(raw_path: pathlib.Path) -> tuple[Image.Image, list[bool], tuple[int, int, int, int]]:
    src = Image.open(raw_path).convert("RGBA")
    w, h = src.size
    pixels = [src.getpixel((x, y)) for y in range(h) for x in range(w)]
    fg = [not _within_key(pixel) for pixel in pixels]
    points = [(i % w, i // w) for i, opaque in enumerate(fg) if opaque]
    if not points:
        raise ValueError(f"{raw_path.name}: magenta key removed the entire image")
    xs, ys = zip(*points)
    return src, fg, (min(xs), min(ys), max(xs), max(ys))


def raw_gates(raw_path: pathlib.Path) -> list[str]:
    """Validate the acquisition-only gates before deterministic ingest."""
    errs: list[str] = []
    with Image.open(raw_path) as opened:
        if opened.format != "PNG":
            errs.append(f"{raw_path.name}: raw must be a PNG, got {opened.format!r}")
        src = opened.convert("RGBA")
    w, h = src.size
    px = src.load()
    border = [px[x, y] for y in range(h) for x in range(w)
              if x < 2 or x >= w - 2 or y < 2 or y >= h - 2]
    keyed = sum(pixel[3] >= ALPHA_CUT and _within_magenta(pixel) for pixel in border)
    if not border or keyed / len(border) < 0.95:
        errs.append(f"{raw_path.name}: border is not a flat {MAGENTA!r} chroma key "
                    f"({keyed}/{len(border)} pixels within tolerance {KEY_TOLERANCE})")

    sidecar = raw_path.with_suffix(".source.json")
    if not sidecar.exists():
        errs.append(f"{raw_path.name}: missing provenance sidecar {sidecar.name}")
    else:
        try:
            record = json.loads(sidecar.read_text())
        except (OSError, json.JSONDecodeError) as error:
            errs.append(f"{raw_path.name}: invalid provenance sidecar: {error}")
        else:
            actual = hashlib.sha256(raw_path.read_bytes()).hexdigest()
            if record.get("raw_sha256") != actual:
                errs.append(f"{raw_path.name}: raw bytes differ from archived provider output")
    return errs


def _axis_extent(fg: list[bool], w: int, h: int, axis: str) -> tuple[int, int]:
    occupied = []
    for y in range(h):
        for x in range(w):
            if fg[y * w + x]:
                occupied.append(x if axis == "x" else y)
    return min(occupied), max(occupied)


def _edge_profile(src: Image.Image, fg: list[bool], axis: str) -> list[float]:
    w, h = src.size
    px = src.load()
    length = w if axis == "x" else h
    other = h if axis == "x" else w
    profile = [0.0] * length
    for a in range(1, length):
        energy = 0
        for b in range(other):
            x, y = (a, b) if axis == "x" else (b, a)
            x0, y0 = (a - 1, b) if axis == "x" else (b, a - 1)
            if not fg[y * w + x] or not fg[y0 * w + x0]:
                continue
            p1, p0 = px[x, y], px[x0, y0]
            energy += sum(abs(p1[i] - p0[i]) for i in range(3))
        profile[a] = energy
    return profile


def detect_pitch(src: Image.Image, fg: list[bool], axis: str,
                 minimum: float, maximum: float,
                 pitch_step: float = .05, phase_step: float = .5) -> dict:
    """Port of SideScape's comb-fit pitch detector, including fractional pitch."""
    w, h = src.size
    length = w if axis == "x" else h
    lo, hi = _axis_extent(fg, w, h, axis)
    profile = _edge_profile(src, fg, axis)
    total = sum(profile[lo:hi + 1])
    max_energy = max(profile[lo:hi + 1], default=0)
    epsilon = max_energy * .15
    best = {"pitch": minimum, "phase": 0.0, "score": -1.0}
    if total <= 0:
        return best
    p = minimum
    while p <= maximum + 1e-9:
        phase = 0.0
        while phase < p:
            kmin = math.ceil((lo - phase) / p)
            kmax = math.floor((hi - phase) / p)
            teeth = hits = 0
            covered_energy = 0.0
            covered: set[int] = set()
            for k in range(kmin, kmax + 1):
                pos = phase + k * p
                if pos <= lo + .5 or pos >= hi - .5:
                    continue
                teeth += 1
                energy = 0.0
                column = -1
                for delta in (-1, 0, 1):
                    candidate = round(pos) + delta
                    if 0 <= candidate < length and profile[candidate] > energy:
                        energy = profile[candidate]
                        column = candidate
                if energy > epsilon:
                    hits += 1
                if column >= 0 and column not in covered:
                    covered.add(column)
                    covered_energy += profile[column]
            if teeth:
                score = (covered_energy / total) * (hits / teeth)
                if score > best["score"]:
                    best = {"pitch": p, "phase": phase, "score": score}
            phase += phase_step
        p += pitch_step
    return best


def _cell_indices(lo: int, hi: int, pitch: float, phase: float) -> list[int]:
    kmin = math.ceil((lo - phase) / pitch - .5)
    kmax = math.floor((hi - phase) / pitch - .5)
    return list(range(kmin, kmax + 1))


def sample_cells(src: Image.Image, fg: list[bool], bbox: tuple[int, int, int, int],
                 pitch_x: dict, pitch_y: dict) -> list[list[tuple[int, int, int] | None]]:
    """Port of SideScape's central-60% per-cell majority vote."""
    w, h = src.size
    px = src.load()
    x0, y0, x1, y1 = bbox
    xs = _cell_indices(x0, x1, pitch_x["pitch"], pitch_x["phase"])
    ys = _cell_indices(y0, y1, pitch_y["pitch"], pitch_y["phase"])
    half_x, half_y = .3 * pitch_x["pitch"], .3 * pitch_y["pitch"]
    grid = []
    for ky in ys:
        cy = pitch_y["phase"] + (ky + .5) * pitch_y["pitch"]
        row = []
        for kx in xs:
            cx = pitch_x["phase"] + (kx + .5) * pitch_x["pitch"]
            colors = []
            total = 0
            for y in range(round(cy - half_y), round(cy + half_y) + 1):
                for x in range(round(cx - half_x), round(cx + half_x) + 1):
                    if not (0 <= x < w and 0 <= y < h):
                        continue
                    total += 1
                    if fg[y * w + x]:
                        colors.append(px[x, y][:3])
            if not total or len(colors) / total < .5:
                row.append(None)
            else:
                row.append(tuple(sorted(channel)[(len(channel) - 1) // 2]
                                 for channel in zip(*colors)))
        grid.append(row)
    return grid


def recover_grid(
    raw_path: pathlib.Path,
    frame: Frame = MEDIUM,
) -> tuple[list[list[tuple[int, int, int] | None]], dict]:
    gate_errs = raw_gates(raw_path)
    if gate_errs:
        raise ValueError("; ".join(gate_errs))
    src, fg, bbox = _key(raw_path)
    x0, y0, x1, y1 = bbox
    long_side = max(x1 - x0 + 1, y1 - y0 + 1)
    minimum, maximum = long_side / frame.h, long_side / frame.min_logical_height
    pitch_x = detect_pitch(src, fg, "x", minimum, maximum)
    pitch_y = detect_pitch(src, fg, "y", minimum, maximum)
    if pitch_x["score"] < MIN_GRID_SCORE or pitch_y["score"] < MIN_GRID_SCORE:
        raise ValueError(f"{raw_path.name}: no recoverable logical grid "
                         f"(scores x={pitch_x['score']:.3f}, y={pitch_y['score']:.3f})")
    cells = sample_cells(src, fg, bbox, pitch_x, pitch_y)
    grid_h = len(cells)
    grid_w = len(cells[0]) if cells else 0
    if not grid_w or not grid_h or any(len(row) != grid_w for row in cells):
        raise ValueError(f"{raw_path.name}: recovered an empty or irregular grid")
    if (grid_w > frame.w or grid_h > frame.h
            or grid_h < frame.min_logical_height):
        raise ValueError(f"{raw_path.name}: recovered grid {grid_w}x{grid_h} does not fit "
                         f"the {frame.w}x{frame.h} contract")
    return cells, {"bbox": bbox, "pitch_x": pitch_x, "pitch_y": pitch_y,
                   "grid": [grid_w, grid_h]}


def normalize(raw_path: pathlib.Path, frame: Frame = MEDIUM) -> Image.Image:
    """Archived raw PNG -> deterministic tier runtime frame, with no resize."""
    cells, _ = recover_grid(raw_path, frame=frame)
    grid_h, grid_w = len(cells), len(cells[0])

    # 4. bottom-center foot-anchor; recovered logical cells are placed 1:1.
    canvas = Image.new("RGBA", (frame.w, frame.h), (0, 0, 0, 0))
    offset_x, offset_y = (frame.w - grid_w) // 2, frame.h - grid_h
    px = canvas.load()
    for y, row in enumerate(cells):
        for x, rgb in enumerate(row):
            if rgb is not None:
                px[offset_x + x, offset_y + y] = (*_nearest(rgb), 255)
    return canvas


def baseline(image: Image.Image, frame: Frame = MEDIUM) -> int | None:
    """Lowest opaque row -- the foot baseline. None if the frame is empty."""
    a = image.getchannel("A").load()
    for y in range(frame.h - 1, -1, -1):
        if any(a[x, y] for x in range(frame.w)):
            return y
    return None


# --------------------------------------------------------------- validator

def validate(image: Image.Image, name: str = "frame",
             frame: Frame = MEDIUM) -> list[str]:
    """Per-frame rejection rules. Empty list == accepted."""
    errs: list[str] = []

    if image.size != (frame.w, frame.h):
        errs.append(f"{name}: wrong dimensions {image.size}, expected "
                    f"{(frame.w, frame.h)}")
        return errs  # every later rule assumes the canvas size
    if image.mode != "RGBA":
        errs.append(f"{name}: non-RGBA mode {image.mode!r}")
        return errs

    px = image.load()
    alphas = {px[x, y][3] for y in range(frame.h) for x in range(frame.w)}

    # unapproved alpha -- anything between fully clear and fully opaque
    stray = sorted(a for a in alphas if a not in (0, 255))
    if stray:
        errs.append(f"{name}: unapproved alpha values {stray[:6]} "
                    f"({len(stray)} distinct); runtime alpha must be 0 or 255")

    opaque = [(x, y) for y in range(frame.h) for x in range(frame.w)
              if px[x, y][3] == 255]
    if not opaque:
        errs.append(f"{name}: empty frame, no opaque pixels")
        return errs

    # NOTE: clipping is deliberately NOT checked here. normalize() scales to
    # fit, so the subject touching the canvas edge is the expected result, not
    # damage. Real clipping happens upstream -- the generator cutting the
    # character off at the raw canvas edge -- so raw_clipping() catches it
    # against the archived raw, before the reduction discards the evidence.

    # embedded effects -- an Ability effect baked into a Character frame.
    # Effects are authored as separate assets, so a Character frame may only
    # contain approved palette colours; a glow/spark lands off-palette.
    off = {px[x, y][:3] for x, y in opaque} - PALETTE_SET
    if off:
        errs.append(f"{name}: embedded effects or unapproved colour "
                    f"{sorted(off)[:4]} ({len(off)} off-palette)")

    return errs


def raw_clipping(raw_path: pathlib.Path) -> list[str]:
    """Reject a raw whose subject the generator cut off at the canvas edge.

    Run against the archived raw, not the recovered frame: once the grid is
    sampled, a provider-clipped character is indistinguishable from a whole one.
    """
    try:
        src, _, (x0, y0, x1, y1) = _key(raw_path)
    except ValueError as error:
        return [str(error)]
    w, h = src.size
    touching = [side for side, hit in
                (("top", y0 == 0), ("bottom", y1 == h),
                 ("left", x0 == 0), ("right", x1 == w))
                if hit]
    if touching:
        return [f"{raw_path.name}: subject clipped by generator at "
                f"{'/'.join(touching)} of the {w}x{h} raw canvas"]
    return []


def validate_sequence(frames: list[tuple[str, Image.Image]],
                      frame: Frame = MEDIUM) -> list[str]:
    """Whole-animation rules layered on top of the per-frame ones."""
    errs: list[str] = []
    for name, f in frames:
        errs += validate(f, name, frame=frame)

    # unstable baseline -- feet must not bob between frames of one animation,
    # or the Character appears to slide vertically in the Battle Tile.
    bases = {name: baseline(f, frame=frame) for name, f in frames}
    distinct = set(bases.values())
    if len(distinct) > 1:
        errs.append(f"unstable baseline across sequence: {bases}")
    return errs


# --------------------------------------------------------------- manifest

def manifest(action: str, frames: list[tuple[str, Image.Image]],
             durations_ms: list[int], cues_ms: dict[str, int] | None = None,
             source: dict | None = None,
             frame: Frame = MEDIUM) -> dict:
    """Build the runtime animation manifest. All timings are integer ms."""
    if len(durations_ms) != len(frames):
        raise ValueError(f"{action}: {len(durations_ms)} durations for "
                         f"{len(frames)} frames")
    for d in durations_ms:
        if not isinstance(d, int) or isinstance(d, bool) or d <= 0:
            raise ValueError(f"{action}: duration {d!r} must be a positive int ms")
    cues = cues_ms or {}
    total = sum(durations_ms)
    for label, t in cues.items():
        if not isinstance(t, int) or isinstance(t, bool) or not 0 <= t <= total:
            raise ValueError(f"{action}: cue {label!r}={t!r} must be an int ms "
                             f"within 0..{total}")

    base = baseline(frames[0][1], frame=frame)
    return {
        "action": action,
        "frame_size": [frame.w, frame.h],
        "palette": "moonberry-16",
        "baseline_row": base,
        "total_ms": total,
        "frames": [
            {"name": n, "duration_ms": d,
             "sha256": hashlib.sha256(f.tobytes()).hexdigest()}
            for (n, f), d in zip(frames, durations_ms)
        ],
        "cues_ms": dict(sorted(cues.items())),
        "source": source or {},
    }


# --------------------------------------------------------------- cli

def _build(tags: Iterable[str]):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    built = []
    manifests: dict[str, dict] = {}
    for tag in tags:
        raw = RAW_DIR / f"{tag}.png"
        frame = normalize(raw)
        out_name = OUTPUT_NAMES.get(tag, tag)
        save_runtime_png(frame, OUT_DIR / f"{out_name}.png")
        built.append((tag, out_name, frame, raw_clipping(raw)))
        sidecar = json.loads(raw.with_suffix(".source.json").read_text())
        manifests[out_name] = manifest(
            "still",
            [(out_name, frame)],
            [1],
            source={
                "provider": sidecar.get("provider"),
                "raw_sha256": sidecar.get("raw_sha256"),
            },
        )
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifests, indent=2) + "\n")
    return built, OUT_DIR


if __name__ == "__main__":
    import sys

    tags = sys.argv[1:] or list(DEFAULT_TAGS)
    built, out = _build(tags)
    ok = True
    for tag, out_name, frame, raw_errs in built:
        errs = raw_errs + validate(frame, out_name)
        digest = hashlib.sha256(frame.tobytes()).hexdigest()[:16]
        print(f"{out_name:<18} baseline={baseline(frame):<3} sha={digest} "
              f"{'ACCEPT' if not errs else 'REJECT'}")
        for e in errs:
            ok = False
            print(f"   - {e}")
    print(f"\nruntime frames -> {out}")
    sys.exit(0 if ok else 1)
