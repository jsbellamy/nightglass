"""Contract tests for the Equipment icon pipeline."""

from __future__ import annotations

import hashlib
import importlib
import json
import pathlib
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT / "pipeline"))

import ast

import acquire  # noqa: E402

from icons import build as icon_build  # noqa: E402
from icons.constants import MIN_GRID_SCORE, MIN_LONG_AXIS, OFF_RAMP_REJECT  # noqa: E402
from icons.fixture_raws import write_gate_fixtures  # noqa: E402
from icons.ingest import (  # noqa: E402
    cells_to_swatches,
    ingest_raw_to_text_source,
    recover_icon_grid,
)
from icons.paint import validate_recolor_map  # noqa: E402
from icons.registry import VERIFY_CANARY_FAMILY  # noqa: E402
from icons.palette import (  # noqa: E402
    DEFAULT_SOURCE_PALETTE_ID,
    PALETTE_PATHS,
    load_runtime_palette,
)
from icons.text_source import parse_text, write_text  # noqa: E402

OUT_DIR = ROOT / "src" / "assets" / "icons"
FAILURES: list[str] = []
RESULTS: list[dict[str, str]] = []
VERIFY_REPORT = HERE / "verify-report.json"


def check(label: str, condition: bool, detail: str = "") -> None:
    status = "PASS" if condition else "FAIL"
    RESULTS.append({"label": label, "status": status, "detail": detail})
    if not condition:
        FAILURES.append(label)
    suffix = f" -- {detail}" if detail else ""
    print(f"  [{status}] {label}{suffix}")


def write_verify_report() -> None:
    passed = not FAILURES
    report = {
        "script": "pipeline/icons/verify.py",
        "passed": passed,
        "failure_count": len(FAILURES),
        "failures": list(FAILURES),
        "checks": RESULTS,
    }
    VERIFY_REPORT.write_text(json.dumps(report, indent=2) + "\n")


def _acquire_names_imported(module_path: pathlib.Path) -> set[str]:
    tree = ast.parse(module_path.read_text())
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module == "acquire":
            names.update(alias.name for alias in node.names)
    return names


print("icon pipeline imports acquire primitives")
ingest_imports = _acquire_names_imported(HERE / "ingest.py")
init_imports = _acquire_names_imported(HERE / "__init__.py")
for name in ("detect_pitch", "sample_cells", "recover_grid"):
    check(
        f"icons.ingest imports acquire.{name}",
        name in ingest_imports,
        str(sorted(ingest_imports)),
    )
check(
    "icons.paint delegates runtime_png_bytes to acquire",
    "acquire.runtime_png_bytes" in (HERE / "paint.py").read_text(),
)
check(
    "icons package re-exports acquire primitives",
    {"detect_pitch", "sample_cells", "recover_grid", "runtime_png_bytes"} <= init_imports,
    str(sorted(init_imports)),
)
check(
    "ingest binds shared recover_grid primitive",
    hasattr(importlib.import_module("icons.ingest"), "_ICON_SHARED_RECOVER")
    and importlib.import_module("icons.ingest")._ICON_SHARED_RECOVER is acquire.recover_grid,
)

print("\nnamed palette catalog")
check(
    "palette catalog lists exactly two approved ids",
    set(PALETTE_PATHS.keys()) == {"moonberry-16", "fowl-harvest-24"},
    str(sorted(PALETTE_PATHS)),
)
moonberry = load_runtime_palette("moonberry-16")
fowl = load_runtime_palette("fowl-harvest-24")
check(
    "moonberry catalog loads version and swatch names",
    moonberry.version == 1 and moonberry.names == frozenset(moonberry.swatches),
    f"v={moonberry.version} n={len(moonberry.names)}",
)
check(
    "fowl-harvest catalog loads version and RGB swatches",
    fowl.version == 1
    and fowl.swatches["beak-orange"].rgb == (228, 122, 53),
    f"v={fowl.version}",
)
try:
    load_runtime_palette("not-a-palette")
    check("unknown palette id fails directly", False)
except ValueError as exc:
    check("unknown palette id fails directly", "unknown palette id" in str(exc))

legacy_path = ROOT / "src" / "assets" / "icon-sources" / "thornquill-blade" / "source.grid"
legacy = parse_text(legacy_path)
check(
    "legacy source without palette line defaults to moonberry-16",
    legacy.palette_id == DEFAULT_SOURCE_PALETTE_ID,
    legacy.palette_id,
)

print("\ntext source parse errors")
bad_source = HERE / "_bad_palette.grid"
bad_source.write_text(
    "\n".join(
        [
            "source_key: bad",
            "palette_subset: mint",
            "legend",
            ". .",
            "X not-a-real-colour",
            "grid",
            ".X",
        ]
    )
    + "\n"
)
try:
    parse_text(bad_source)
    check("off-palette legend name is unrepresentable", False)
except ValueError as exc:
    check("off-palette legend name is unrepresentable", "not-a-real-colour" in str(exc))
bad_source.unlink()

fowl_bad = HERE / "_bad_fowl_subset.grid"
fowl_bad.write_text(
    "\n".join(
        [
            "source_key: fowl-fixture",
            "palette: fowl-harvest-24",
            "palette_subset: mint",
            "legend",
            ". .",
            "A beak-orange",
            "grid",
            ".A",
        ]
    )
    + "\n"
)
try:
    parse_text(fowl_bad)
    check("cross-palette subset name rejected", False)
except ValueError as exc:
    check("cross-palette subset name rejected", "mint" in str(exc))
fowl_bad.unlink()

print("\nrecolor flatten guard")
bow_subset = frozenset(VERIFY_CANARY_FAMILY.palette_subset)
try:
    validate_recolor_map({"mint": "berry-mid"}, bow_subset)
    check("recolor target already in palette_subset rejected", False)
except ValueError:
    check("recolor target already in palette_subset rejected", True)

# Measured BOW_TO_LONGBOW flatten case: berry-mid already in bow subset
bow_family_subset = frozenset(
    {
        "mint",
        "berry-mid",
        "cream",
        "contour-plum-deep",
    }
)
try:
    validate_recolor_map({"mint": "berry-mid"}, bow_family_subset)
    check("BOW_TO_LONGBOW-style flatten rejected", False)
except ValueError:
    check("BOW_TO_LONGBOW-style flatten rejected", True)

print("\ningest fixture gates")
FIXTURES = HERE / "fixtures" / "raws"
write_gate_fixtures(FIXTURES)
subset = VERIFY_CANARY_FAMILY.palette_subset

pass_long, _ = recover_icon_grid(FIXTURES / "long-axis-pass.png")
fail_long = False
try:
    recover_icon_grid(FIXTURES / "long-axis-fail.png")
except ValueError as exc:
    fail_long = "underfill" in str(exc) or str(MIN_LONG_AXIS) in str(exc)
check("MIN_LONG_AXIS pass fixture accepted", len(pass_long) > 0)
check("MIN_LONG_AXIS fail fixture rejected", fail_long)

_, ramp_pass = cells_to_swatches(
    recover_icon_grid(FIXTURES / "off-ramp-pass.png")[0], subset
)
_, ramp_fail = cells_to_swatches(
    recover_icon_grid(FIXTURES / "off-ramp-fail.png")[0], subset
)
check(
    "off-ramp pass fixture within threshold",
    not ramp_pass["off_ramp_reject"]
    and ramp_pass["far_fraction"] <= OFF_RAMP_REJECT,
    str(ramp_pass),
)
check(
    "off-ramp fail fixture over threshold",
    ramp_fail["off_ramp_reject"],
    str(ramp_fail),
)

grid_pass = True
grid_fail = False
try:
    recover_icon_grid(FIXTURES / "grid-recovery-pass.png")
except ValueError:
    grid_pass = False
try:
    recover_icon_grid(FIXTURES / "grid-recovery-fail.png")
except ValueError as exc:
    grid_fail = (
        "pitch-fail" in str(exc)
        or "no recoverable" in str(exc)
        or str(MIN_GRID_SCORE) in str(exc)
    )
check("grid-recovery pass fixture accepted", grid_pass)
check("grid-recovery fail fixture rejected", grid_fail)

with tempfile.TemporaryDirectory() as tmp:
    tmp_path = pathlib.Path(tmp)
    ingest_raw_to_text_source(
        FIXTURES / "grid-recovery-pass.png",
        source_key="fixture-ingest",
        palette_subset=subset,
        out_path=tmp_path / "out.grid",
    )
    out_grid = tmp_path / "out.grid"
    check("fixture ingest writes text grid", out_grid.exists())
    emitted = out_grid.read_text()
    check(
        "newly emitted source carries explicit palette id",
        f"palette: {DEFAULT_SOURCE_PALETTE_ID}" in emitted,
    )

print("\nbyte-identical icon rebuild")
manifest_path = OUT_DIR / "manifest.json"
if manifest_path.exists():
    manifest = json.loads(manifest_path.read_text())
    first = icon_build.build_all()
    second = icon_build.build_all()
    check(
        "double build_all is byte-stable",
        first == second and first,
        f"{len(first)} digests",
    )
    for key, entry in manifest.items():
        if key == "family-sheet":
            continue
        png = OUT_DIR / f"{key}.png"
        if not png.exists():
            check(f"committed runtime {key} exists", False)
            continue
        rebuilt = png.read_bytes()
        check(
            f"offline rebuild matches committed {key}",
            hashlib.sha256(rebuilt).hexdigest() == entry["sha256"],
        )
    sheet = OUT_DIR / "family-sheet@8x.png"
    check("family contact sheet @8x exists", sheet.exists())
    previews = list((OUT_DIR / "preview").glob("*@8x.png"))
    check("per-icon @8x previews exist", len(previews) >= 2, str(len(previews)))
else:
    check("manifest exists for rebuild proof", False)

print()
if FAILURES:
    print(f"{len(FAILURES)} FAILED: {FAILURES}")
    write_verify_report()
    sys.exit(1)
print("all icon contract tests passed")
write_verify_report()
