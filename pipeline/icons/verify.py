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
from icons.constants import MAX_BODY, MIN_GRID_SCORE, MIN_LONG_AXIS, OFF_RAMP_REJECT  # noqa: E402
from icons.fixture_raws import write_gate_fixtures  # noqa: E402
from icons.ingest import (  # noqa: E402
    cells_to_swatches,
    ingest_raw_to_local_text_source,
    ingest_raw_to_text_source,
    recover_icon_grid,
)
from icons.paint import paint_source_local_icon, validate_recolor_map  # noqa: E402
from icons.palette import (  # noqa: E402
    DEFAULT_SOURCE_PALETTE_ID,
    PALETTE_PATHS,
    SOURCE_LOCAL_COLOR_MODE,
    SOURCE_LOCAL_OUTLINE_RGB,
    format_opaque_rgb,
    load_runtime_palette,
    outline_swatch_name,
    swatch_for_local_rgb,
)
from icons.text_source import TextSource, cells_from_source, cells_to_local_source, parse_text, write_text  # noqa: E402
from icons.registry import (  # noqa: E402
    ALL_BUILD_FAMILIES,
    BASIC_CORE_ABILITY_KEYS,
    FAMILIES,
    VERIFY_ABILITY_CANARY_FAMILY,
    VERIFY_CANARY_FAMILY,
    VERIFY_FOWL_CANARY_FAMILY,
)

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
    "palette catalog lists exactly three approved ids",
    set(PALETTE_PATHS.keys())
    == {"moonberry-16", "fowl-harvest-24", "unwound-belfry-24"},
    str(sorted(PALETTE_PATHS)),
)
moonberry = load_runtime_palette("moonberry-16")
fowl = load_runtime_palette("fowl-harvest-24")
belfry = load_runtime_palette("unwound-belfry-24")
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
check(
    "unwound-belfry catalog loads version and 24 swatches",
    belfry.version == 1
    and len(belfry.names) == 24
    and belfry.swatches["belfry-void"].rgb == (12, 11, 22),
    f"v={belfry.version} n={len(belfry.names)}",
)
try:
    load_runtime_palette("not-a-palette")
    check("unknown palette id fails directly", False)
except ValueError as exc:
    check("unknown palette id fails directly", "unknown palette id" in str(exc))

bad_palette_id = HERE / "_bad_palette_id.grid"
bad_palette_id.write_text(
    "\n".join(
        [
            "source_key: bad",
            "palette: not-a-palette",
            "palette_subset: mint",
            "legend",
            ". .",
            "grid",
            ".",
        ]
    )
    + "\n"
)
try:
    parse_text(bad_palette_id)
    check("parse rejects unknown palette id", False)
except ValueError as exc:
    check("parse rejects unknown palette id", "unknown palette id" in str(exc))
bad_palette_id.unlink()

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

print("\nsource-local color mode (C1–C3)")
ability_source_path = (
    ROOT / "src" / "assets" / "icon-sources" / "verify-ability-canary" / "source.grid"
)
ability_source = parse_text(ability_source_path)
check(
    "verify-ability-canary selects source-local mode",
    ability_source.color_mode == SOURCE_LOCAL_COLOR_MODE,
    ability_source.color_mode,
)
check(
    "source-local outline is the common Ability charcoal-plum ring",
    ability_source.outline_rgb == SOURCE_LOCAL_OUTLINE_RGB,
    str(ability_source.outline_rgb),
)

mixed_mode = HERE / "_mixed_color_mode.grid"
mixed_mode.write_text(
    "\n".join(
        [
            "source_key: mixed",
            "color_mode: source-local",
            "outline: 58,6,20",
            "palette_subset: mint",
            "legend",
            ". .",
            "A 10,20,30",
            "grid",
            ".A",
        ]
    )
    + "\n"
)
try:
    parse_text(mixed_mode)
    check("palette_subset forbidden in source-local mode", False)
except ValueError as exc:
    check("palette_subset forbidden in source-local mode", "forbidden" in str(exc))
mixed_mode.unlink()

bad_rgb = HERE / "_bad_local_rgb.grid"
bad_rgb.write_text(
    "\n".join(
        [
            "source_key: bad-rgb",
            "color_mode: source-local",
            "outline: 58,6,20",
            "legend",
            ". .",
            "A not-rgb",
            "grid",
            ".A",
        ]
    )
    + "\n"
)
try:
    parse_text(bad_rgb)
    check("malformed source-local legend rgb rejected", False)
except ValueError as exc:
    check("malformed source-local legend rgb rejected", "malformed" in str(exc))
bad_rgb.unlink()

dup_rgb = HERE / "_dup_local_rgb.grid"
dup_rgb.write_text(
    "\n".join(
        [
            "source_key: dup-rgb",
            "color_mode: source-local",
            "outline: 58,6,20",
            "legend",
            ". .",
            "A 10,20,30",
            "B 10,20,30",
            "grid",
            ".AB",
        ]
    )
    + "\n"
)
try:
    parse_text(dup_rgb)
    check("duplicate source-local legend rgb rejected", False)
except ValueError as exc:
    check("duplicate source-local legend rgb rejected", "duplicate" in str(exc))
dup_rgb.unlink()

oor_rgb = HERE / "_oor_local_rgb.grid"
oor_rgb.write_text(
    "\n".join(
        [
            "source_key: oor",
            "color_mode: source-local",
            "outline: 58,6,20",
            "legend",
            ". .",
            "A 10,20,300",
            "grid",
            ".A",
        ]
    )
    + "\n"
)
try:
    parse_text(oor_rgb)
    check("out-of-range source-local rgb rejected", False)
except ValueError as exc:
    check("out-of-range source-local rgb rejected", "out of range" in str(exc))
oor_rgb.unlink()

bad_outline = HERE / "_bad_local_outline.grid"
bad_outline.write_text(
    "\n".join(
        [
            "source_key: bad-outline",
            "color_mode: source-local",
            "outline: 1,2,3",
            "legend",
            ". .",
            "A 10,20,30",
            "grid",
            ".A",
        ]
    )
    + "\n"
)
try:
    parse_text(bad_outline)
    check("non-common source-local outline rejected", False)
except ValueError as exc:
    check("non-common source-local outline rejected", "outline rgb" in str(exc))
bad_outline.unlink()

transparent_rgba = HERE / "_transparent_rgba.grid"
transparent_rgba.write_text(
    "\n".join(
        [
            "source_key: transparent-rgba",
            "color_mode: source-local",
            "outline: 58,6,20",
            "legend",
            ". .",
            "A 10,20,30,0",
            "grid",
            ".A",
        ]
    )
    + "\n"
)
try:
    parse_text(transparent_rgba)
    check("transparent rgba legend entry rejected", False)
except ValueError as exc:
    check("transparent rgba legend entry rejected", "transparent" in str(exc))
transparent_rgba.unlink()

palette_forbidden = HERE / "_palette_forbidden_local.grid"
palette_forbidden.write_text(
    "\n".join(
        [
            "source_key: palette-forbidden",
            "color_mode: source-local",
            "outline: 58,6,20",
            "palette: moonberry-16",
            "legend",
            ". .",
            "A 10,20,30",
            "grid",
            ".A",
        ]
    )
    + "\n"
)
try:
    parse_text(palette_forbidden)
    check("palette line forbidden in source-local mode", False)
except ValueError as exc:
    check("palette line forbidden in source-local mode", "forbidden" in str(exc))
palette_forbidden.unlink()

with tempfile.TemporaryDirectory() as tmp:
    tmp_path = pathlib.Path(tmp)
    canonical = cells_to_local_source(
        "canonical-local",
        [[None, (40, 120, 200)], [None, (40, 120, 200)]],
    )
    out_path = tmp_path / "roundtrip.grid"
    write_text(out_path, canonical)
    emitted = out_path.read_text()
    check(
        "source-local write uses canonical rgb serialization",
        "40,120,200" in emitted and "40, 120, 200" not in emitted,
    )
    roundtrip = parse_text(out_path)
    check(
        "source-local parse/write roundtrip preserves legend rgb",
        roundtrip.local_legend == canonical.local_legend,
        str(roundtrip.local_legend),
    )

ability_cells = cells_from_source(ability_source)
ability_outline = swatch_for_local_rgb(SOURCE_LOCAL_OUTLINE_RGB)
ability_icon = paint_source_local_icon(ability_cells, outline=ability_outline)
check(
    "source-local runtime canvas is 34×34",
    ability_icon.size == (34, 34),
    str(ability_icon.size),
)
corner = ability_icon.getpixel((0, 0))
check(
    "source-local runtime keeps transparent alpha outside body",
    corner[3] == 0,
    str(corner),
)
outline_pixels = [
    ability_icon.getpixel((x, y))
    for y in range(34)
    for x in range(34)
    if ability_icon.getpixel((x, y))[3] == 255
    and ability_icon.getpixel((x, y))[:3] == SOURCE_LOCAL_OUTLINE_RGB
]
check(
    "source-local build derives one-cell charcoal-plum outline ring",
    len(outline_pixels) > 0,
    str(len(outline_pixels)),
)
fill_pixels = [
    px
    for px in (
        ability_icon.getpixel((x, y))
        for y in range(34)
        for x in range(34)
    )
    if px[3] == 255 and px[:3] == (40, 120, 200)
]
check(
    "source-local build preserves authored opaque fill rgb",
    len(fill_pixels) > 0,
    str(len(fill_pixels)),
)

print("\nbasic/core ability icon registration (#534)")
families_by_key = {family.source_key: family for family in FAMILIES}
for key in BASIC_CORE_ABILITY_KEYS:
    family = families_by_key.get(key)
    check(f"ability family {key} is registered", family is not None)
    if family is None:
        continue
    check(
        f"ability family {key} is source-local one-variant",
        family.color_mode == SOURCE_LOCAL_COLOR_MODE
        and len(family.variants) == 1
        and family.variants[0].icon_key == key
        and family.source_key == key,
        family.color_mode,
    )

print("\nregistry palette ids")
for family in ALL_BUILD_FAMILIES:
    if family.color_mode == SOURCE_LOCAL_COLOR_MODE:
        check(
            f"family {family.source_key} is source-local (no named palette)",
            family.palette_id == DEFAULT_SOURCE_PALETTE_ID and not family.palette_subset,
            family.color_mode,
        )
        continue
    check(
        f"family {family.source_key} declares known palette id",
        family.palette_id in PALETTE_PATHS,
        family.palette_id,
    )
check(
    "moonberry outline is contour-plum-deepest",
    outline_swatch_name("moonberry-16") == "contour-plum-deepest",
)
check(
    "fowl outline is oil-ink",
    outline_swatch_name("fowl-harvest-24") == "oil-ink",
)
check(
    "unwound-belfry outline is belfry-void",
    outline_swatch_name("unwound-belfry-24") == "belfry-void",
)

print("\nrecolor flatten guard")
bow_subset = frozenset(VERIFY_CANARY_FAMILY.palette_subset)
try:
    validate_recolor_map({"mint": "berry-mid"}, bow_subset, moonberry)
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
    validate_recolor_map({"mint": "berry-mid"}, bow_family_subset, moonberry)
    check("BOW_TO_LONGBOW-style flatten rejected", False)
except ValueError:
    check("BOW_TO_LONGBOW-style flatten rejected", True)

fowl_subset = frozenset(VERIFY_FOWL_CANARY_FAMILY.palette_subset)
fowl_palette = load_runtime_palette("fowl-harvest-24")
try:
    validate_recolor_map({"beak-orange": "mint"}, fowl_subset, fowl_palette)
    check("cross-palette recolor target rejected", False)
except ValueError as exc:
    check("cross-palette recolor target rejected", "mint" in str(exc))

print("\ningest fixture gates")
FIXTURES = HERE / "fixtures" / "raws"
write_gate_fixtures(FIXTURES)
subset = VERIFY_CANARY_FAMILY.palette_subset

pass_long, _ = recover_icon_grid(FIXTURES / "long-axis-pass.png")
thin_cells, thin_meta = recover_icon_grid(FIXTURES / "long-axis-fail.png")
check("MIN_LONG_AXIS pass fixture accepted", len(pass_long) > 0)
check(
    "thin fixture advances with size_review",
    thin_meta.get("size_review") == "thin" and len(thin_cells) > 0,
    str(thin_meta),
)
check(
    "thin long axis is below annotation threshold",
    max(thin_meta["grid"]) < MIN_LONG_AXIS,
    str(thin_meta["grid"]),
)

overshoot_cells, overshoot_meta = recover_icon_grid(FIXTURES / "overshoot-fit.png")
fit = overshoot_meta.get("fit") or {}
fit_from = fit.get("from") or [0, 0]
fit_to = fit.get("to") or [0, 0]
check(
    "overshoot-fit recovers above MAX_BODY then fits",
    fit.get("reason") == "overshoot"
    and max(fit_from) > MAX_BODY
    and fit_to[0] <= MAX_BODY
    and fit_to[1] <= MAX_BODY
    and len(overshoot_cells) == fit_to[1]
    and (len(overshoot_cells[0]) if overshoot_cells else 0) == fit_to[0],
    str(overshoot_meta),
)
overshoot_swatches = [
    [None if rgb is None else swatch_for_local_rgb(rgb) for rgb in row]
    for row in overshoot_cells
]
overshoot_icon = paint_source_local_icon(
    overshoot_swatches,
    outline=swatch_for_local_rgb(SOURCE_LOCAL_OUTLINE_RGB),
)
check(
    "overshoot-fit paints without raising",
    overshoot_icon.size == (34, 34),
    str(overshoot_icon.size),
)

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
    named_report = ingest_raw_to_text_source(
        FIXTURES / "overshoot-fit.png",
        source_key="fixture-overshoot",
        palette_subset=subset,
        out_path=tmp_path / "overshoot.grid",
    )
    check(
        "named-palette ingest surfaces fit in recovered meta",
        "fit" in named_report["recovered"]
        and named_report["recovered"]["fit"]["reason"] == "overshoot",
        str(named_report.get("recovered")),
    )
    local_report = ingest_raw_to_local_text_source(
        FIXTURES / "long-axis-fail.png",
        source_key="fixture-thin",
        out_path=tmp_path / "thin.grid",
    )
    check(
        "source-local ingest surfaces size_review in recovered meta",
        local_report["recovered"].get("size_review") == "thin",
        str(local_report.get("recovered")),
    )
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
        family_palette = entry.get("palette")
        family_color_mode = entry.get("color_mode")
        family_outline = entry.get("outline")
        if family_color_mode == SOURCE_LOCAL_COLOR_MODE:
            check(
                f"manifest {key} records source-local color_mode",
                family_color_mode == SOURCE_LOCAL_COLOR_MODE,
            )
            check(
                f"manifest {key} records common Ability outline rgb",
                family_outline == list(SOURCE_LOCAL_OUTLINE_RGB),
                str(family_outline),
            )
            continue
        if family_palette == "fowl-harvest-24":
            check(
                f"manifest {key} records fowl-harvest-24",
                family_palette == "fowl-harvest-24",
            )
            check(
                f"manifest {key} records oil-ink outline",
                family_outline == "oil-ink",
            )
        elif family_palette == "moonberry-16":
            check(
                f"manifest {key} records moonberry outline",
                family_outline == "contour-plum-deepest",
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
