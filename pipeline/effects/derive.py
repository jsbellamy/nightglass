"""Effect frame derivation for the vertical slice (#43).

Turns ONE source still per family into derived frame sequences by deterministic
transform. Output lands in src/assets/effects/<derivation>/.
"""
from __future__ import annotations

import hashlib
import json
import math
import pathlib
import struct
import zlib
from typing import Callable

from PIL import Image

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
SRC = HERE / "source"
OUT = ROOT / "src" / "assets" / "effects"
PALETTE = json.loads((HERE / "palette_glow.json").read_text())
COLORS = [(c["name"], tuple(c["rgb"])) for c in PALETTE["colors"]]
FAMILIES = PALETTE["families"]
STRIKE_DY = -26

# Element recolour maps bloom/arc names -> alternate glow ramp members (disjoint
# from moonberry-16; stays inside moonberry-glow).
ELEMENT_REMAP: dict[str, dict[str, str]] = {
    "fire": {
        "glow-berry-bright": "glow-berry-bright",
        "glow-berry": "glow-berry",
        "glow-violet": "glow-berry",
        "glow-violet-deep": "glow-berry-bright",
    },
    "frost": {
        "glow-berry-bright": "glow-mint-bright",
        "glow-berry": "glow-mint",
        "glow-violet": "glow-mint-bright",
        "glow-violet-deep": "glow-mint-deep",
    },
    "lightning": {
        "glow-berry-bright": "glow-violet",
        "glow-berry": "glow-violet",
        "glow-violet": "glow-violet",
        "glow-violet-deep": "glow-violet-deep",
    },
    "light": {
        "glow-berry-bright": "glow-cream",
        "glow-berry": "glow-cream",
        "glow-violet": "glow-core",
        "glow-violet-deep": "glow-cream",
    },
}

PNG_ZLIB_LEVEL = 9


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    checksum = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", checksum)


def runtime_png_bytes(frame: Image.Image) -> bytes:
    if frame.mode != "RGBA":
        frame = frame.convert("RGBA")
    w, h = frame.size
    row_bytes = w * 4
    pixels = frame.tobytes()
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        start = y * row_bytes
        raw.extend(pixels[start : start + row_bytes])
    compressed = zlib.compress(bytes(raw), level=PNG_ZLIB_LEVEL)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", compressed)
        + _png_chunk(b"IEND", b"")
    )


def quantize(rgb: tuple[int, int, int]) -> tuple[str, tuple[int, int, int]]:
    return min(COLORS, key=lambda c: sum((a - b) ** 2 for a, b in zip(c[1], rgb)))


def ramp_index(name: str) -> tuple[list[str] | None, int | None]:
    for fam in FAMILIES.values():
        if name in fam:
            return fam, fam.index(name)
    return None, None


def requantize(im: Image.Image) -> Image.Image:
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if a < 128:
                continue
            out.putpixel((x, y), (*quantize((r, g, b))[1], 255))
    return out


def recolour_element(im: Image.Image, element: str) -> Image.Image:
    remap = ELEMENT_REMAP[element]
    by_name = {n: v for n, v in COLORS}
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if not a:
                continue
            name, _ = quantize((r, g, b))
            target = remap.get(name, name)
            out.putpixel((x, y), (*by_name[target], 255))
    return out


def fade(im: Image.Image, steps: int) -> Image.Image:
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    by_name = {n: v for n, v in COLORS}
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if not a:
                continue
            name, _ = quantize((r, g, b))
            fam, idx = ramp_index(name)
            if fam is None:
                out.putpixel((x, y), (r, g, b, 255))
                continue
            j = idx + steps
            if j >= len(fam):
                continue
            out.putpixel((x, y), (*by_name[fam[j]], 255))
    return out


def sweep(im: Image.Image, pivot: tuple[float, float], lo: float, hi: float) -> Image.Image:
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    px, py = pivot
    for y in range(im.height):
        for x in range(im.width):
            p = im.getpixel((x, y))
            if not p[3]:
                continue
            ang = math.degrees(math.atan2(y - py, x - px))
            if lo <= ang <= hi:
                out.putpixel((x, y), p)
    return out


def scale(im: Image.Image, f: float) -> Image.Image:
    w = max(1, int(round(im.width * f)))
    h = max(1, int(round(im.height * f)))
    s = im.resize((w, h), Image.NEAREST)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(s, ((im.width - w) // 2, (im.height - h) // 2))
    return requantize(out)


def spin(im: Image.Image, steps: int) -> Image.Image:
    return requantize(im.rotate(steps * 45.0, resample=Image.NEAREST))


def band(im: Image.Image, lo: int, hi: int) -> Image.Image:
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    for y in range(im.height):
        if lo <= y <= hi:
            for x in range(im.width):
                p = im.getpixel((x, y))
                if p[3]:
                    out.putpixel((x, y), p)
    return out


FrameOp = Callable[[Image.Image], Image.Image]

# derivation ref -> spec (still_key names the source file stem)
SEQUENCES: dict[str, dict] = {
    "arc-slash": {
        "still_key": "arc-slash",
        "anchor": "strike_target",
        "anchor_dx": -15,
        "align_to": "impact_expected",
        "cue_frame": 2,
        "pivot": (7, 15),
        "frames": [
            (lambda s: sweep(s, (7, 15), -62, -12), 60),
            (lambda s: sweep(s, (7, 15), -34, 20), 60),
            (lambda s: sweep(s, (7, 15), -8, 62), 60),
            (lambda s: fade(s, 2), 70),
        ],
    },
    "arc-slash-wide": {
        "still_key": "arc-slash",
        "anchor": "strike_target",
        "anchor_dx": -15,
        "align_to": "impact_expected",
        "cue_frame": 2,
        "frames": [
            (lambda s: sweep(s, (7, 15), -70, -20), 70),
            (lambda s: sweep(s, (7, 15), -40, 30), 70),
            (lambda s: sweep(s, (7, 15), -10, 70), 70),
            (lambda s: fade(s, 2), 80),
        ],
    },
    "arc-slash-heavy": {
        "still_key": "arc-slash",
        "anchor": "strike_target",
        "anchor_dx": -15,
        "align_to": "impact_expected",
        "cue_frame": 2,
        "frames": [
            (lambda s: sweep(scale(s, 1.15), (7, 15), -62, -12), 80),
            (lambda s: sweep(scale(s, 1.15), (7, 15), -34, 20), 80),
            (lambda s: sweep(scale(s, 1.15), (7, 15), -8, 62), 80),
            (lambda s: fade(scale(s, 1.25), 2), 90),
        ],
    },
    "arc-impact": {
        "still_key": "arc-impact",
        "anchor": "strike_target",
        "anchor_dx": 0,
        "align_to": "impact_expected",
        "cue_frame": 0,
        "frames": [
            (lambda s: scale(s, 0.55), 50),
            (lambda s: s, 70),
            (lambda s: fade(scale(s, 1.25), 2), 60),
        ],
    },
    "arrow-bolt": {
        "still_key": "arrow-bolt",
        "anchor": "lane_travel",
        "anchor_dx": 0,
        "align_to": "release_projectile",
        "cue_frame": 0,
        "frames": [
            (lambda s: s, 50),
            (lambda s: spin(s, 1), 50),
        ],
    },
    "spell-bolt": {
        "still_key": "spell-bolt",
        "anchor": "lane_travel",
        "anchor_dx": 0,
        "align_to": "release_projectile",
        "cue_frame": 0,
        "frames": [
            (lambda s: s, 50),
            (lambda s: spin(s, 1), 50),
        ],
    },
    "spell-bloom": {
        "still_key": "spell-bloom",
        "anchor": "strike_target",
        "anchor_dx": 0,
        "align_to": "impact_expected",
        "cue_frame": 0,
        "frames": [
            (lambda s: scale(s, 0.5), 50),
            (lambda s: scale(s, 0.8), 60),
            (lambda s: s, 60),
            (lambda s: fade(scale(s, 1.2), 2), 50),
        ],
    },
    "spell-bloom-scaled": {
        "still_key": "spell-bloom",
        "anchor": "strike_target",
        "anchor_dx": 0,
        "align_to": "impact_expected",
        "cue_frame": 0,
        "frames": [
            (lambda s: scale(s, 0.65), 60),
            (lambda s: scale(s, 0.95), 70),
            (lambda s: scale(s, 1.1), 70),
            (lambda s: fade(scale(s, 1.35), 2), 60),
        ],
    },
    "heal-rise": {
        "still_key": "heal-rise",
        "anchor": "band",
        "anchor_dx": 0,
        "align_to": "impact_expected",
        "cue_frame": 3,
        "frames": [
            (lambda s: band(s, 32, 39), 80),
            (lambda s: band(s, 24, 39), 80),
            (lambda s: band(s, 14, 39), 80),
            (lambda s: band(s, 0, 39), 80),
            (lambda s: fade(band(s, 0, 39), 1), 70),
        ],
    },
    "revive-burst": {
        "still_key": "revive-burst",
        "anchor": "strike_target",
        "anchor_dx": 0,
        "align_to": "impact_expected",
        "cue_frame": 1,
        "frames": [
            (lambda s: scale(s, 0.45), 120),
            (lambda s: s, 140),
            (lambda s: fade(scale(s, 1.15), 2), 100),
        ],
    },
    "buff-halo": {
        "still_key": "buff-halo",
        "anchor": "strike_target",
        "anchor_dx": 0,
        "align_to": "impact_expected",
        "cue_frame": 1,
        "frames": [
            (lambda s: scale(s, 0.7), 80),
            (lambda s: s, 120),
            (lambda s: fade(s, 1), 100),
        ],
    },
}

# Element-tagged copies of bolt/bloom derivations.
for element in ELEMENT_REMAP:
    SEQUENCES[f"spell-bolt-{element}"] = {
        **SEQUENCES["spell-bolt"],
        "element": element,
        "post": lambda im, el=element: recolour_element(im, el),
    }
    SEQUENCES[f"spell-bloom-{element}"] = {
        **SEQUENCES["spell-bloom"],
        "element": element,
        "post": lambda im, el=element: recolour_element(im, el),
    }
    SEQUENCES[f"spell-bloom-scaled-{element}"] = {
        **SEQUENCES["spell-bloom-scaled"],
        "element": element,
        "post": lambda im, el=element: recolour_element(im, el),
    }


def sha(im: Image.Image) -> str:
    return hashlib.sha256(im.tobytes()).hexdigest()


def derive_one(name: str, spec: dict) -> dict:
    still_key = spec["still_key"]
    src = Image.open(SRC / f"{still_key}.png").convert("RGBA")
    src_sha = sha(src)
    post = spec.get("post")
    out_dir = OUT / name
    out_dir.mkdir(parents=True, exist_ok=True)

    frames: list[dict] = []
    total = 0
    for i, (op, dur) in enumerate(spec["frames"]):
        im = requantize(op(src))
        if post:
            im = post(im)
            im = requantize(im)
        path = out_dir / f"{name}_{i}.png"
        path.write_bytes(runtime_png_bytes(im))
        frames.append(
            {
                "file": f"{name}/{name}_{i}.png",
                "duration_ms": dur,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "opaque_px": sum(1 for p in im.getdata() if p[3]),
            }
        )
        total += dur

    cue_ms = sum(f["duration_ms"] for f in frames[: spec["cue_frame"]])
    align = spec["align_to"]
    return {
        "frame_size": [src.width, src.height],
        "palette": f'{PALETTE["name"]}@{PALETTE["version"]}',
        "anchor": spec["anchor"],
        "anchor_dx": spec.get("anchor_dx", 0),
        "strike_dy": STRIKE_DY,
        "align_to": align,
        "cues_ms": {align: cue_ms},
        "total_ms": total,
        "frames": frames,
        "source": {
            "still": f"{still_key}.png",
            "sha256": src_sha,
            "authored_by": "pipeline/effects/author.py",
            "generator": None,
        },
        **({"element": spec["element"]} if "element" in spec else {}),
    }


def main() -> None:
    if not SRC.exists():
        raise SystemExit("run author.py first")
    OUT.mkdir(parents=True, exist_ok=True)
    manifests: dict[str, dict] = {}
    for name, spec in SEQUENCES.items():
        manifests[name] = derive_one(name, spec)
        m = manifests[name]
        align = m["align_to"]
        print(
            f"{name:24s} {len(m['frames'])} frames  {m['total_ms']:4d}ms  "
            f"anchor={m['anchor']:13s} cue={align}@{m['cues_ms'][align]}ms"
        )
    (OUT / "manifest.json").write_text(json.dumps(manifests, indent=2) + "\n")
    print("wrote", OUT / "manifest.json")


if __name__ == "__main__":
    main()
