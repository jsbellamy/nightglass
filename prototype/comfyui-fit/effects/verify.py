"""PROTOTYPE effect gate checks — wipe me when trial #20 closes.

Three assertions the ticket's answer rests on:

1. DETERMINISM  -- author -> derive is a pure function. Rebuilding from scratch
   reproduces every frame byte-identically, with no generator present.
2. SEPARATION   -- the acquisition contract's embedded-effects validator (#21)
   REJECTS every effect frame. That is the proof effects cannot be silently
   baked into a Character frame: the glow ramp is off moonberry-16, so the
   existing gate fires without needing a new rule.
3. BODY-FREE    -- no Character frame on disk is modified by composition.
"""
import hashlib
import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import acquire                                          # noqa: E402
from PIL import Image                                   # noqa: E402

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
FRAMES = HERE / "frames"
PY = sys.executable


def digest(d, pat="*.png"):
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(d.glob(pat))}


def main():
    fail = 0

    # 1. determinism
    before = digest(FRAMES) | digest(HERE / "source")
    for script in ("author.py", "derive.py"):
        subprocess.run([PY, str(HERE / script)], cwd=HERE, check=True,
                       capture_output=True)
    after = digest(FRAMES) | digest(HERE / "source")
    drift = [k for k in before if before[k] != after.get(k)]
    print(f"1. determinism : {'PASS' if not drift else 'FAIL ' + str(drift)} "
          f"({len(before)} files rebuilt byte-identically)")
    fail += bool(drift)

    # 2. separation -- the threat model is an effect BAKED INTO a Character
    # frame, so bake each one onto the canonical Knight at the strike point and
    # require the embedded-effects rule to fire. (Validating a bare effect file
    # proves nothing: it short-circuits on dimensions before reaching the
    # palette rule.) The control asserts the clean frame still passes, so a
    # rule that rejects everything cannot masquerade as a pass here.
    knight = Image.open(ROOT / "runtime" / "knight_seed103.png").convert("RGBA")
    ctrl = acquire.validate(knight.copy(), "control")
    unguarded = []
    for p in sorted(FRAMES.glob("*.png")):
        baked = knight.copy()
        eff = Image.open(p).convert("RGBA")
        baked.alpha_composite(eff, (16 - eff.width // 2, 22 - eff.height // 2))
        errs = acquire.validate(baked, p.name)
        if not any("effect" in e or "palette" in e or "colour" in e for e in errs):
            unguarded.append((p.name, errs))
    n = len(list(FRAMES.glob("*.png")))
    ok = not unguarded and not ctrl
    print(f"2. separation  : {'PASS' if ok else 'FAIL'} "
          f"(clean Knight frame passes: {not ctrl}; "
          f"{n - len(unguarded)}/{n} effects baked into it are caught by the "
          f"embedded-effects rule)")
    for nm, e in unguarded:
        print(f"     unguarded: {nm} -> {e}")
    fail += (not ok)

    # 3. body-free -- canonical Character files untouched by the whole run
    canon = digest(ROOT / "runtime")
    subprocess.run([PY, str(HERE / "compose.py")], cwd=HERE, check=True,
                   capture_output=True)
    same = canon == digest(ROOT / "runtime")
    print(f"3. body-free   : {'PASS' if same else 'FAIL'} "
          f"({len(canon)} canonical Character files unchanged by composition)")
    fail += (not same)

    # frame budget, for the cleanup-per-action question
    man = json.loads((FRAMES / "manifest.json").read_text())
    total = sum(len(m["frames"]) for m in man.values())
    print(f"\nauthored source stills: {len(man)}   derived frames: {total}   "
          f"ratio 1:{total / len(man):.2f}")
    return fail


if __name__ == "__main__":
    sys.exit(main())
