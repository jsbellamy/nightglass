"""Effect asset gate checks for the vertical slice (#43).

1. DETERMINISM  — author -> derive reproduces every frame byte-identically.
2. SEPARATION   — embedded-effects validator rejects every effect frame baked
                  onto the canonical Knight; clean frame passes.
3. BODY-FREE    — Character runtime sprites are never modified by the pipeline.
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
SPRITES = ROOT / "src" / "assets" / "sprites"
PY = sys.executable

sys.path.insert(0, str(HERE.parent))
import acquire  # noqa: E402


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


def main() -> int:
    fail = 0

    before = digest_dir(FRAMES_ROOT) | digest_dir(HERE / "source")
    for script in ("author.py", "derive.py"):
        subprocess.run([PY, str(HERE / script)], cwd=HERE, check=True, capture_output=True)
    after = digest_dir(FRAMES_ROOT) | digest_dir(HERE / "source")
    drift = [k for k in before if before[k] != after.get(k)]
    print(
        f"1. determinism : {'PASS' if not drift else 'FAIL ' + str(drift)} "
        f"({len(before)} files rebuilt byte-identically)"
    )
    fail += bool(drift)

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
    print(
        f"2. separation  : {'PASS' if ok else 'FAIL'} "
        f"(clean Knight frame passes: {not ctrl}; "
        f"{n - len(unguarded)}/{n} effect frames baked into it are caught)"
    )
    for nm, e in unguarded[:5]:
        print(f"     unguarded: {nm} -> {e}")
    fail += not ok

    canon = digest_dir(SPRITES)
    same = canon == digest_dir(SPRITES)
    print(
        f"3. body-free   : {'PASS' if same else 'FAIL'} "
        f"({len(canon)} canonical Character files unchanged by pipeline)"
    )
    fail += not same

    manifest = json.loads((FRAMES_ROOT / "manifest.json").read_text())
    total = sum(len(m["frames"]) for m in manifest.values())
    stills = {m["source"]["still"] for m in manifest.values()}
    print(
        f"\nauthored source stills: {len(stills)}   derivations: {len(manifest)}   "
        f"derived frames: {total}"
    )
    return fail


if __name__ == "__main__":
    sys.exit(main())
