"""Negative + determinism tests for the acquisition contract (#21, #29).

Every rejection rule must actually fire, and the normalizer must reproduce
byte-identical runtime frames from the archived raw bundle with no provider.
"""
import hashlib
import json
import pathlib
import sys
from unittest import mock

from PIL import Image

import acquire as A

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
RAW_DIR = ROOT / "assets-raw" / "grid_raw"
RUNTIME_DIR = ROOT / "src" / "assets" / "sprites"
FAILURES = []

RUNTIME_SPRITES = {
    "knight": "knight.png",
    "wizard": "wizard.png",
    "priest": "priest.png",
    "hunter": "hunter.png",
    "pipcap": "pipcap.png",
    "boss": "boss-1.png",
    "boss-2": "boss-2.png",
    "boss-3": "boss-3.png",
}


def check(label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    if not condition:
        FAILURES.append(label)
    print(f"  [{status}] {label}{(' -- ' + detail) if detail else ''}")


def good_frame():
    return A.normalize(RAW_DIR / "knight.png")


MONSTER_FRAMES = {
    "small": (24, 32),
    "medium": (32, 48),
    "large": (48, 72),
}


print("frame tiers")
for tier, (w, h) in MONSTER_FRAMES.items():
    spec = A.FRAMES[tier]
    check(f"FRAMES[{tier!r}] matches MONSTER_FRAMES",
          (spec.w, spec.h) == (w, h) and spec.min_logical_height > 0,
          f"w={spec.w} h={spec.h} min_h={spec.min_logical_height}")
check("MEDIUM is the default medium tier", A.MEDIUM is A.FRAMES["medium"])


def png_bytes(frame):
    return A.runtime_png_bytes(frame)


print("raw acquisition gates")
bundle = sorted(RAW_DIR.glob("*.png"))
gate_errs = [e for p in bundle for e in A.raw_gates(p)]
check("archived raws match their unmodified provider hashes", not gate_errs,
      str(gate_errs))

reports = {p.stem: A.recover_grid(p)[1] for p in bundle}
check("Knight grid is recoverable without reduction",
      reports["knight"]["grid"] == [32, 45], str(reports["knight"]))
check("Wizard grid is recoverable without reduction",
      reports["wizard"]["grid"] == [29, 45], str(reports["wizard"]))
check("Pipcap ordinary opponent grid is recoverable without reduction",
      reports["pipcap"]["grid"] == [29, 40], str(reports["pipcap"]))
check("Boss opponent grid is recoverable without reduction",
      reports["boss"]["grid"] == [32, 41], str(reports["boss"]))
check("Boss-2 Gloomcap Matron grid is recoverable without reduction",
      reports["boss-2"]["grid"] == [29, 43], str(reports["boss-2"]))
check("Boss-3 Thornmother Vane grid is recoverable without reduction",
      reports["boss-3"]["grid"] == [21, 40], str(reports["boss-3"]))
check("Priest grid is recoverable without reduction",
      reports["priest"]["grid"] == [27, 46], str(reports["priest"]))
check("Hunter grid is recoverable without reduction",
      reports["hunter"]["grid"] == [30, 44], str(reports["hunter"]))
check("both pitch fits clear the confidence gate",
      all(report[axis]["score"] >= A.MIN_GRID_SCORE
          for report in reports.values() for axis in ("pitch_x", "pitch_y")))

_stub_oversize = [[(200, 200, 200) for _ in range(22)] for _ in range(35)]
with mock.patch.object(A, "sample_cells", return_value=_stub_oversize):
    try:
        A.recover_grid(RAW_DIR / "knight.png", frame=A.FRAMES["small"])
        small_fit_err = ""
    except ValueError as error:
        small_fit_err = str(error)
check("grid too large for small tier names 24x32 contract",
      "24x32" in small_fit_err and "does not fit" in small_fit_err
      and "32x48" not in small_fit_err,
      small_fit_err)

bad_key = HERE / "_bad_key_test.png"
Image.new("RGBA", (64, 96), (0, 0, 255, 255)).save(bad_key)
errs = A.raw_gates(bad_key)
check("non-magenta background rejected", any("flat" in e and "chroma key" in e for e in errs))
bad_key.unlink()


print("rejection rules")

# wrong dimensions
errs = A.validate(Image.new("RGBA", (32, 32), (0, 0, 0, 255)), "wrongdim")
check("wrong dimensions rejected", any("wrong dimensions" in e for e in errs))

# non-RGBA
errs = A.validate(Image.new("RGB", (32, 48), (233, 226, 189)), "rgb")
check("non-RGBA rejected", any("non-RGBA" in e for e in errs))

# unapproved alpha -- a soft matte that escaped binarization
f = good_frame()
px = f.load()
px[16, 30] = (*A.PALETTE[0], 128)
errs = A.validate(f, "softalpha")
check("unapproved alpha rejected", any("unapproved alpha" in e for e in errs))

# embedded effects -- an off-palette glow baked into a Character frame
f = good_frame()
f.load()[16, 20] = (255, 255, 0, 255)
errs = A.validate(f, "glow")
check("embedded effects rejected", any("embedded effects" in e for e in errs))

# empty frame
errs = A.validate(Image.new("RGBA", (32, 48), (0, 0, 0, 0)), "empty")
check("empty frame rejected", any("empty frame" in e for e in errs))

# generator-clipped raw -- synthesize a raw whose subject runs off the edge
clipped = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
clipped.paste(Image.new("RGBA", (40, 64), (233, 226, 189, 255)), (0, 0))
tmp = HERE / "_clipped_test.png"
clipped.save(tmp)
errs = A.raw_clipping(tmp)
check("generator-clipped raw rejected", any("clipped by generator" in e for e in errs),
      errs[0] if errs else "")
tmp.unlink()

# whole raw bundle is clean
clip_errs = [e for p in bundle for e in A.raw_clipping(p)]
check("archived raw bundle has no clipped frames", not clip_errs,
      f"{len(bundle)} raws checked")

# unstable baseline across a sequence
a_frame = good_frame()
shifted = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
shifted.paste(a_frame.crop((0, 0, 32, 44)), (0, 0))
errs = A.validate_sequence([("f0", a_frame), ("f1", shifted)])
check("unstable baseline rejected", any("unstable baseline" in e for e in errs))

# a real sequence of one frame is stable
errs = A.validate_sequence([("f0", good_frame())])
check("stable sequence accepted", not errs, str(errs))

print("\nmanifest rules")
frames = [("f0", good_frame()), ("f1", good_frame())]

for bad, why in [([100], "count mismatch"), ([100, 0], "zero duration"),
                 ([100, -5], "negative duration"), ([100, 83.5], "non-integer ms")]:
    try:
        A.manifest("idle", frames, bad)
        check(f"manifest rejects {why}", False)
    except ValueError:
        check(f"manifest rejects {why}", True)

try:
    A.manifest("attack", frames, [100, 100], {"impact": 500})
    check("manifest rejects out-of-range cue", False)
except ValueError:
    check("manifest rejects out-of-range cue", True)

m = A.manifest("attack", frames, [120, 80], {"impact": 120},
               source={"provider": "openai-imagegen", "raw_sha256": "example"})
check("manifest total_ms is integer", isinstance(m["total_ms"], int) and m["total_ms"] == 200)
check("manifest records integer cues", m["cues_ms"] == {"impact": 120})
check("manifest records baseline row", m["baseline_row"] == 47, str(m["baseline_row"]))
check("manifest default frame_size is medium", m["frame_size"] == [32, 48])
_tier_frame = Image.new("RGBA", (48, 72), (0, 0, 0, 0))
_tier_frame.load()[24, 71] = (*A.PALETTE[0], 255)
m_large = A.manifest("still", [("f0", _tier_frame)], [1], frame=A.FRAMES["large"])
check("manifest large tier frame_size", m_large["frame_size"] == [48, 72])
_tier_frame = Image.new("RGBA", (24, 32), (0, 0, 0, 0))
_tier_frame.load()[12, 31] = (*A.PALETTE[0], 255)
m_small = A.manifest("still", [("f0", _tier_frame)], [1], frame=A.FRAMES["small"])
check("manifest small tier frame_size", m_small["frame_size"] == [24, 32])

print("\ntier normalization anchors")
_stub_cells = [[(200, 200, 200) if x < 10 else None for x in range(10)]
               for _ in range(20)]
with mock.patch.object(A, "recover_grid", return_value=(_stub_cells, {})):
    small_frame = A.normalize(RAW_DIR / "knight.png", frame=A.FRAMES["small"])
    large_frame = A.normalize(RAW_DIR / "knight.png", frame=A.FRAMES["large"])
check("small normalize canvas is 24x32", small_frame.size == (24, 32))
check("large normalize canvas is 48x72", large_frame.size == (48, 72))
_spx = small_frame.load()
check("small normalize bottom-centre anchor",
      _spx[7, 12][3] == 255 and _spx[6, 12][3] == 0 and _spx[17, 12][3] == 0)
_lpx = large_frame.load()
check("large normalize bottom-centre anchor",
      _lpx[19, 52][3] == 255 and _lpx[18, 52][3] == 0 and _lpx[29, 52][3] == 0)

print("\ndeterminism")
one = A.normalize(RAW_DIR / "wizard.png")
two = A.normalize(RAW_DIR / "wizard.png")
one_png, two_png = png_bytes(one), png_bytes(two)
check("repeated offline rebuild is byte-identical PNG",
      hashlib.sha256(one_png).hexdigest() == hashlib.sha256(two_png).hexdigest())

for raw_tag, runtime_name in RUNTIME_SPRITES.items():
    rebuilt = png_bytes(A.normalize(RAW_DIR / f"{raw_tag}.png"))
    committed = (RUNTIME_DIR / runtime_name).read_bytes()
    check(f"offline rebuild matches committed {runtime_name} byte-for-byte",
          rebuilt == committed)

manifest_data = json.loads((RUNTIME_DIR / "manifest.json").read_text())
for raw_tag, runtime_name in RUNTIME_SPRITES.items():
    sprite_key = pathlib.Path(runtime_name).stem
    entry = manifest_data[sprite_key]
    rebuilt_image = A.normalize(RAW_DIR / f"{raw_tag}.png")
    recorded = entry["frames"][0]["sha256"]
    actual = hashlib.sha256(rebuilt_image.tobytes()).hexdigest()
    check(f"medium re-acquire sha256 matches manifest for {sprite_key}",
          actual == recorded, f"got {actual[:16]}… expected {recorded[:16]}…")

_p = one.load()
_op = [_p[x, y] for y in range(A.MEDIUM.h) for x in range(A.MEDIUM.w)
       if _p[x, y][3] == 255]
check("frame has a real opaque population", len(_op) > 300, f"{len(_op)} px")
palette_ok = all(px[:3] in A.PALETTE_SET for px in _op)
check("all opaque pixels are on-palette", palette_ok)
check("alpha is strictly binary",
      {_p[x, y][3] for y in range(A.MEDIUM.h) for x in range(A.MEDIUM.w)} <= {0, 255})

print("\ncommitted manifest")
manifest = manifest_data
check("manifest records moonberry-16 palette for every sprite",
      all(entry.get("palette") == "moonberry-16" for entry in manifest.values()),
      str({k: v.get("palette") for k, v in manifest.items()}))

print("\nprovider neutrality")
loaded = {m for m in sys.modules
          if "comfy" in m.lower() or "torch" in m.lower()}
check("no provider/model modules imported", not loaded, str(loaded))
check("acquire.py opens no socket",
      "socket" not in A.__dict__ and "urllib" not in A.__dict__)

print()
if FAILURES:
    print(f"{len(FAILURES)} FAILED: {FAILURES}")
    sys.exit(1)
print("all contract tests passed")
