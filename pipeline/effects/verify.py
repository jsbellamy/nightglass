"""Effect asset gate checks for the vertical slice (#43).

1. DETERMINISM  — author -> derive reproduces every frame byte-identically.
2. SEPARATION   — embedded-effects validator rejects every effect frame baked
                  onto the canonical Knight; clean frame passes.
3. BODY-FREE    — Character runtime sprites are never modified by the pipeline.
4. STATUS       — status glyphs exist, are 7×7 RGBA binary-alpha glow-only,
                  and are byte- and shape-distinct at 1×.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import subprocess
import sys

from PIL import Image

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
FRAMES_ROOT = ROOT / "src" / "assets" / "effects"
STATUS_DIR = FRAMES_ROOT / "status"
SPRITES = ROOT / "src" / "assets" / "sprites"
VERIFY_REPORT = HERE / "verify-report.json"
PY = sys.executable

sys.path.insert(0, str(HERE.parent))
import acquire  # noqa: E402

PALETTE = json.loads((HERE / "palette_glow.json").read_text())
GLOW_RGB = {tuple(c["rgb"]) for c in PALETTE["colors"]}
STATUS_GLYPH_IDS = (
    "braced",
    "exposed",
    "guarded",
    "inspired",
    "overdrive",
    "riven",
    "scalded",
    "scorched",
    "shaken",
    "sheltered",
    "stun",
    "warded",
)


def digest_dir(d: pathlib.Path, pat: str = "*.png") -> dict[str, str]:
    return {
        str(p.relative_to(d)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(d.rglob(pat))
    }


def effect_frame_paths() -> list[pathlib.Path]:
    manifest = json.loads((FRAMES_ROOT / "manifest.json").read_text())
    paths: list[pathlib.Path] = []
    for spec in manifest.values():
        for frame in spec["frames"]:
            paths.append(FRAMES_ROOT / frame["file"])
    return paths


def status_glyph_shape(im: Image.Image) -> frozenset[tuple[int, int]]:
    return frozenset(
        (x, y)
        for y in range(im.height)
        for x in range(im.width)
        if im.getpixel((x, y))[3]
    )


def check_status_glyphs() -> tuple[bool, str]:
    expected = [f"{name}.png" for name in STATUS_GLYPH_IDS]
    present = sorted(p.name for p in STATUS_DIR.glob("*.png"))
    if present != expected:
        return False, f"inventory mismatch: {present} != {expected}"

    digests: dict[str, str] = {}
    shapes: dict[str, frozenset[tuple[int, int]]] = {}
    for name in STATUS_GLYPH_IDS:
        path = STATUS_DIR / f"{name}.png"
        im = Image.open(path).convert("RGBA")
        if im.size != (7, 7):
            return False, f"{name}: size {im.size} != (7, 7)"
        for y in range(7):
            for x in range(7):
                r, g, b, a = im.getpixel((x, y))
                if a not in (0, 255):
                    return False, f"{name}: non-binary alpha at ({x},{y})={a}"
                if a == 0:
                    if (r, g, b, a) != (0, 0, 0, 0):
                        return False, f"{name}: transparent pixel not clear at ({x},{y})"
                    continue
                if (r, g, b) not in GLOW_RGB:
                    return False, f"{name}: off-glow RGB {(r, g, b)} at ({x},{y})"
        digests[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        shapes[name] = status_glyph_shape(im)

    if len(set(digests.values())) != len(digests):
        return False, f"byte collision among {list(digests)}"
    if len(set(shapes.values())) != len(shapes):
        return False, f"shape collision among {list(shapes)}"
    return True, f"{len(STATUS_GLYPH_IDS)} glyphs 7x7 glow-only binary-alpha shape-distinct"


def write_verify_report(checks: list[dict[str, str]]) -> None:
    failures = [c["label"] for c in checks if c["status"] != "PASS"]
    report = {
        "script": "pipeline/effects/verify.py",
        "passed": not failures,
        "failure_count": len(failures),
        "failures": failures,
        "checks": checks,
    }
    VERIFY_REPORT.write_text(json.dumps(report, indent=2) + "\n")


def main() -> int:
    checks: list[dict[str, str]] = []

    def record(label: str, ok: bool, detail: str) -> None:
        status = "PASS" if ok else "FAIL"
        checks.append({"label": label, "status": status, "detail": detail})
        print(f"{label}: {status} ({detail})")

    # Capture Character sprites *before* author/derive so a pipeline write to
    # SPRITES can fail this gate (comparing two post-rebuild digests cannot).
    sprites_before = digest_dir(SPRITES)

    before = digest_dir(FRAMES_ROOT) | digest_dir(HERE / "source")
    for script in ("author.py", "derive.py"):
        subprocess.run([PY, str(HERE / script)], cwd=HERE, check=True, capture_output=True)
    after = digest_dir(FRAMES_ROOT) | digest_dir(HERE / "source")
    drift = [k for k in before if before[k] != after.get(k)]
    record(
        "1. determinism",
        not drift,
        f"{len(before)} files rebuilt byte-identically"
        if not drift
        else f"drift={drift}",
    )

    knight = Image.open(SPRITES / "knight.png").convert("RGBA")
    ctrl = acquire.validate(knight.copy(), "control")
    unguarded: list[tuple[str, list[str]]] = []
    for p in effect_frame_paths():
        baked = knight.copy()
        eff = Image.open(p).convert("RGBA")
        baked.alpha_composite(eff, (16 - eff.width // 2, 22 - eff.height // 2))
        errs = acquire.validate(baked, p.name)
        if not any("effect" in e or "palette" in e or "colour" in e for e in errs):
            unguarded.append((p.name, errs))
    n = len(effect_frame_paths())
    ok = not unguarded and not ctrl
    record(
        "2. separation",
        ok,
        f"clean Knight frame passes: {not ctrl}; "
        f"{n - len(unguarded)}/{n} effect frames baked into it are caught",
    )
    for nm, e in unguarded[:5]:
        print(f"     unguarded: {nm} -> {e}")

    sprites_after = digest_dir(SPRITES)
    drifted = sorted(
        k for k in sprites_before if sprites_before[k] != sprites_after.get(k)
    ) + sorted(k for k in sprites_after if k not in sprites_before)
    same = not drifted
    record(
        "3. body-free",
        same,
        f"{len(sprites_before)} canonical Character files unchanged by pipeline"
        if same
        else f"drifted: {drifted}",
    )

    status_ok, status_detail = check_status_glyphs()
    record("4. status", status_ok, status_detail)

    manifest = json.loads((FRAMES_ROOT / "manifest.json").read_text())
    total = sum(len(m["frames"]) for m in manifest.values())
    stills = {m["source"]["still"] for m in manifest.values()}
    print(
        f"\nauthored source stills: {len(stills)}   derivations: {len(manifest)}   "
        f"derived frames: {total}"
    )

    write_verify_report(checks)
    return sum(1 for c in checks if c["status"] != "PASS")


if __name__ == "__main__":
    sys.exit(main())
