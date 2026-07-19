"""Negative + determinism tests for the acquisition contract (#21, #29).

Every rejection rule must actually fire, and the normalizer must reproduce
byte-identical runtime frames from the archived raw bundle with no provider.
"""
import io
import hashlib
import json
import pathlib
import sys

from PIL import Image

import acquire as A

HERE = pathlib.Path(__file__).parent
FAILURES = []


def check(label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    if not condition:
        FAILURES.append(label)
    print(f"  [{status}] {label}{(' -- ' + detail) if detail else ''}")


def good_frame():
    return A.normalize(HERE / "grid_raw" / "knight.png")


def png_bytes(frame):
    output = io.BytesIO()
    frame.save(output, format="PNG")
    return output.getvalue()


print("raw acquisition gates")
bundle = sorted((HERE / "grid_raw").glob("*.png"))
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
check("both pitch fits clear the confidence gate",
      all(report[axis]["score"] >= A.MIN_GRID_SCORE
          for report in reports.values() for axis in ("pitch_x", "pitch_y")))

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

print("\ndeterminism")
one = A.normalize(HERE / "grid_raw" / "wizard.png")
two = A.normalize(HERE / "grid_raw" / "wizard.png")
one_png, two_png = png_bytes(one), png_bytes(two)
check("repeated offline rebuild is byte-identical PNG",
      hashlib.sha256(one_png).hexdigest() == hashlib.sha256(two_png).hexdigest())
check("offline rebuild matches the committed runtime PNG byte-for-byte",
      one_png == (HERE / "runtime" / "wizard.png").read_bytes())

_p = one.load()
_op = [_p[x, y] for y in range(A.FRAME_H) for x in range(A.FRAME_W)
       if _p[x, y][3] == 255]
check("frame has a real opaque population", len(_op) > 300, f"{len(_op)} px")
palette_ok = all(px[:3] in A.PALETTE_SET for px in _op)
check("all opaque pixels are on-palette", palette_ok)
check("alpha is strictly binary",
      {_p[x, y][3] for y in range(A.FRAME_H) for x in range(A.FRAME_W)} <= {0, 255})

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
