"""Negative + determinism tests for the body sprite contract (#250, #251)."""
import hashlib
import io
import json
import pathlib
import sys
import tempfile
from contextlib import redirect_stdout
from unittest import mock

from PIL import Image

import acquire as A
import backdrops as B

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
    "burger-drake": "burger-drake.png",
    "cornquacker": "cornquacker.png",
    "the-combine": "the-combine.png",
    "the-fryer": "the-fryer.png",
    "scarequack": "scarequack.png",
    "boss": "boss-1.png",
    "boss-2": "boss-2.png",
    "boss-3": "boss-3.png",
}

PRODUCTION_RAW_TAGS = A.default_build_raw_tags()


def check(label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    if not condition:
        FAILURES.append(label)
    print(f"  [{status}] {label}{(' -- ' + detail) if detail else ''}")


def good_frame():
    return A.normalize_legacy_grid_v1(RAW_DIR / "knight.png")


print("identity body profiles")
hunter_profile = A.body_profile_for_tag("hunter")
check("Hunter profile is Party 40x68 facing right",
      hunter_profile.role == "party-character"
      and hunter_profile.max_opaque_w == 40
      and hunter_profile.max_opaque_h == 68
      and hunter_profile.facing == "right")
pipcap_profile = A.body_profile_for_tag("pipcap")
check("Pipcap profile is ordinary Opponent 30x68 facing left",
      pipcap_profile.role == "ordinary-opponent"
      and pipcap_profile.max_opaque_w == 30
      and pipcap_profile.max_opaque_h == 68
      and pipcap_profile.facing == "left")
boss_profile = A.body_profile_for_tag("boss-3")
check("Boss profile is Boss 160x72 facing left",
      boss_profile.role == "boss"
      and boss_profile.max_opaque_w == 160
      and boss_profile.max_opaque_h == 72
      and boss_profile.facing == "left")
burger_profile = A.body_profile_for_tag("burger-drake")
check("Burger Drake profile is ordinary Opponent 30x68 facing left",
      burger_profile.role == "ordinary-opponent"
      and burger_profile.max_opaque_w == 30
      and burger_profile.max_opaque_h == 68
      and burger_profile.facing == "left")
cornquacker_profile = A.body_profile_for_tag("cornquacker")
check("Cornquacker profile is ordinary Opponent 30x68 facing left",
      cornquacker_profile.role == "ordinary-opponent"
      and cornquacker_profile.max_opaque_w == 30
      and cornquacker_profile.max_opaque_h == 68
      and cornquacker_profile.facing == "left")
combine_profile = A.body_profile_for_tag("the-combine")
check("The Combine profile is Boss 160x72 facing left",
      combine_profile.role == "boss"
      and combine_profile.max_opaque_w == 160
      and combine_profile.max_opaque_h == 72
      and combine_profile.facing == "left")
fryer_profile = A.body_profile_for_tag("the-fryer")
check("The Fryer profile is Boss 160x72 facing left",
      fryer_profile.role == "boss"
      and fryer_profile.max_opaque_w == 160
      and fryer_profile.max_opaque_h == 72
      and fryer_profile.facing == "left")
scarequack_profile = A.body_profile_for_tag("scarequack")
check("Scarequack profile is Boss 160x72 facing left",
      scarequack_profile.role == "boss"
      and scarequack_profile.max_opaque_w == 160
      and scarequack_profile.max_opaque_h == 72
      and scarequack_profile.facing == "left")
tickmoth_profile = A.body_profile_for_tag("tickmoth")
check("Tickmoth profile is ordinary Opponent 30x68 facing left",
      tickmoth_profile.role == "ordinary-opponent"
      and tickmoth_profile.max_opaque_w == 30
      and tickmoth_profile.max_opaque_h == 68
      and tickmoth_profile.facing == "left")
tollbat_profile = A.body_profile_for_tag("tollbat")
check("Tollbat profile is ordinary Opponent 30x68 facing left",
      tollbat_profile.role == "ordinary-opponent"
      and tollbat_profile.max_opaque_w == 30
      and tollbat_profile.max_opaque_h == 68
      and tollbat_profile.facing == "left")
astrolabe_spider_profile = A.body_profile_for_tag("astrolabe-spider")
check("Astrolabe Spider profile is ordinary Opponent 30x68 facing left",
      astrolabe_spider_profile.role == "ordinary-opponent"
      and astrolabe_spider_profile.max_opaque_w == 30
      and astrolabe_spider_profile.max_opaque_h == 68
      and astrolabe_spider_profile.facing == "left")
the_vigil_profile = A.body_profile_for_tag("the-vigil")
check("The Vigil profile is Boss 160x72 facing left",
      the_vigil_profile.role == "boss"
      and the_vigil_profile.max_opaque_w == 160
      and the_vigil_profile.max_opaque_h == 72
      and the_vigil_profile.facing == "left")
the_tocsin_profile = A.body_profile_for_tag("the-tocsin")
check("The Tocsin profile is Boss 160x72 facing left",
      the_tocsin_profile.role == "boss"
      and the_tocsin_profile.max_opaque_w == 160
      and the_tocsin_profile.max_opaque_h == 72
      and the_tocsin_profile.facing == "left")
the_unwound_profile = A.body_profile_for_tag("the-unwound")
check("The Unwound profile is Boss 160x72 facing left",
      the_unwound_profile.role == "boss"
      and the_unwound_profile.max_opaque_w == 160
      and the_unwound_profile.max_opaque_h == 72
      and the_unwound_profile.facing == "left")
aphelion_profile = A.body_profile_for_tag("aphelion")
check("Aphelion profile is Boss 160x72 facing left",
      aphelion_profile.role == "boss"
      and aphelion_profile.max_opaque_w == 160
      and aphelion_profile.max_opaque_h == 72
      and aphelion_profile.facing == "left")
_moonberry = A.load_runtime_palette("moonberry-16")
_fowl = A.load_runtime_palette("fowl-harvest-24")
for out_name, expected_id in [
    ("knight", "moonberry-16"),
    ("wizard", "moonberry-16"),
    ("priest", "moonberry-16"),
    ("hunter", "moonberry-16"),
    ("pipcap", "moonberry-16"),
    ("boss-1", "moonberry-16"),
    ("boss-2", "moonberry-16"),
    ("boss-3", "moonberry-16"),
    ("burger-drake", "fowl-harvest-24"),
    ("cornquacker", "fowl-harvest-24"),
    ("the-combine", "fowl-harvest-24"),
    ("the-fryer", "fowl-harvest-24"),
    ("scarequack", "fowl-harvest-24"),
    ("tickmoth", "unwound-belfry-24"),
    ("tollbat", "unwound-belfry-24"),
    ("astrolabe-spider", "unwound-belfry-24"),
    ("the-vigil", "unwound-belfry-24"),
    ("the-tocsin", "unwound-belfry-24"),
    ("the-unwound", "unwound-belfry-24"),
    ("aphelion", "unwound-belfry-24"),
]:
    identity = A.ASSET_IDENTITIES[out_name]
    check(f"{out_name} selects palette {expected_id}",
          identity["palette"] == expected_id
          and A.palette_for_identity(identity, identity_name=out_name).palette_id
          == expected_id)
try:
    A.load_runtime_palette("not-a-palette")
    unknown_palette_error = ""
except ValueError as error:
    unknown_palette_error = str(error)
check("unknown palette ids fail without fallback",
      "unknown palette id" in unknown_palette_error, unknown_palette_error)
try:
    A.body_profile_for_identity(
        {"role": "not-a-role", "facing": "left"},
        identity_name="fixture",
    )
    unknown_role_error = ""
except ValueError as error:
    unknown_role_error = str(error)
check("unknown role values fail without fallback",
      "unknown role" in unknown_role_error, unknown_role_error)
try:
    A.body_profile_for_identity(
        {"role": "boss", "facing": "north"},
        identity_name="fixture",
    )
    unknown_facing_error = ""
except ValueError as error:
    unknown_facing_error = str(error)
check("unknown facing values fail without fallback",
      "unknown facing" in unknown_facing_error, unknown_facing_error)
layout = A.load_layout()
check("layout.json matches shared battlefield and anchor contract",
      layout["battlefield"]["floor_y"] == 80
      and layout["anchors_x"]["party"] == [24, 68, 112])


MONSTER_FRAMES = {
    "small": (24, 32, 20, 26, False),
    "medium": (32, 48, 26, 40, False),
    "large": (48, 72, 40, 60, True),
}


print("frame tiers")
for tier, (w, h, safe_w, safe_h, safe_box_gate) in MONSTER_FRAMES.items():
    spec = A.FRAMES[tier]
    check(f"FRAMES[{tier!r}] matches MONSTER_FRAMES",
          (spec.w, spec.h, spec.safe_w, spec.safe_h, spec.safe_box_gate)
          == (w, h, safe_w, safe_h, safe_box_gate)
          and spec.min_logical_height > 0,
          f"w={spec.w} h={spec.h} safe={spec.safe_w}x{spec.safe_h} "
          f"min_h={spec.min_logical_height}")
check("MEDIUM is the default medium tier", A.MEDIUM is A.FRAMES["medium"])


def png_bytes(frame):
    return A.runtime_png_bytes(frame)


print("raw acquisition gates")
bundle = [RAW_DIR / f"{tag}.png" for tag in PRODUCTION_RAW_TAGS]
gate_errs = [e for p in bundle for e in A.raw_gates(p)]
check("archived raws match their unmodified provider hashes", not gate_errs,
      str(gate_errs))

def _sidecar(tag: str) -> dict:
    return json.loads((RAW_DIR / f"{tag}.png").with_suffix(".source.json").read_text())

flexible_tags = {
    tag for tag in PRODUCTION_RAW_TAGS if _sidecar(tag).get("acquisition") == "flexible"
}
legacy_bundle = [RAW_DIR / f"{tag}.png" for tag in PRODUCTION_RAW_TAGS if tag not in flexible_tags]
reports = {p.stem: A.recover_grid(p)[1] for p in legacy_bundle}
check("Knight grid is recoverable without reduction",
      reports["knight"]["grid"] == [32, 45], str(reports["knight"]))
check("Wizard grid is recoverable without reduction",
      reports["wizard"]["grid"] == [29, 45], str(reports["wizard"]))
check("Boss opponent grid is recoverable without reduction",
      reports["boss"]["grid"] == [32, 41], str(reports["boss"]))
check("Boss-2 Gloomcap Matron grid is recoverable without reduction",
      reports["boss-2"]["grid"] == [29, 43], str(reports["boss-2"]))
check("Priest grid is recoverable without reduction",
      reports["priest"]["grid"] == [27, 46], str(reports["priest"]))
check("both pitch fits clear the confidence gate",
      all(report[axis]["score"] >= A.MIN_GRID_SCORE
          for report in reports.values() for axis in ("pitch_x", "pitch_y")))

hunter_sidecar = _sidecar("hunter")
hunter_measure = A.measure_candidate(RAW_DIR / "hunter.png", tag="hunter")
check("Hunter archived raw uses flexible acquisition provenance",
      hunter_sidecar.get("acquisition") == "flexible"
      and hunter_sidecar.get("identity_profile", {}).get("role") == "party-character"
      and hunter_sidecar.get("facing") == "right",
      str(hunter_sidecar))
check("Hunter flexible opaque bounds fit the Party 40x68 ceiling",
      hunter_measure["status"] == "advance"
      and hunter_measure["fitted_opaque_size"][0] <= hunter_profile.max_opaque_w
      and hunter_measure["fitted_opaque_size"][1] <= hunter_profile.max_opaque_h
      and hunter_measure["clipped_sides"] == [],
      str(hunter_measure))

pipcap_sidecar = _sidecar("pipcap")
pipcap_measure = A.measure_candidate(RAW_DIR / "pipcap.png", tag="pipcap")
check("Pipcap archived raw uses flexible acquisition provenance",
      pipcap_sidecar.get("acquisition") == "flexible"
      and pipcap_sidecar.get("identity_profile", {}).get("role") == "ordinary-opponent"
      and pipcap_sidecar.get("facing") == "left",
      str(pipcap_sidecar))
check("Pipcap flexible opaque bounds fit the ordinary Opponent 30x68 ceiling",
      pipcap_measure["status"] == "advance"
      and pipcap_measure["fitted_opaque_size"][0] <= pipcap_profile.max_opaque_w
      and pipcap_measure["fitted_opaque_size"][1] <= pipcap_profile.max_opaque_h
      and pipcap_measure["clipped_sides"] == [],
      str(pipcap_measure))

burger_sidecar = _sidecar("burger-drake")
burger_measure = A.measure_candidate(RAW_DIR / "burger-drake.png", tag="burger-drake")
check("Burger Drake archived raw uses flexible Fowl Harvest provenance",
      burger_sidecar.get("acquisition") == "flexible"
      and burger_sidecar.get("identity_profile", {}).get("role") == "ordinary-opponent"
      and burger_sidecar.get("facing") == "left"
      and burger_sidecar.get("palette") == "fowl-harvest-24@1",
      str(burger_sidecar))
check("Burger Drake flexible opaque bounds fit the ordinary Opponent 30x68 ceiling",
      burger_measure["status"] == "advance"
      and burger_measure["fitted_opaque_size"][0] <= burger_profile.max_opaque_w
      and burger_measure["fitted_opaque_size"][1] <= burger_profile.max_opaque_h
      and burger_measure["clipped_sides"] == [],
      str(burger_measure))

corn_sidecar = _sidecar("cornquacker")
corn_measure = A.measure_candidate(RAW_DIR / "cornquacker.png", tag="cornquacker")
check("Cornquacker archived raw uses flexible Fowl Harvest provenance",
      corn_sidecar.get("acquisition") == "flexible"
      and corn_sidecar.get("identity_profile", {}).get("role") == "ordinary-opponent"
      and corn_sidecar.get("facing") == "left"
      and corn_sidecar.get("palette") == "fowl-harvest-24@1",
      str(corn_sidecar))
check("Cornquacker flexible opaque bounds fit the ordinary Opponent 30x68 ceiling",
      corn_measure["status"] == "advance"
      and corn_measure["fitted_opaque_size"][0] <= cornquacker_profile.max_opaque_w
      and corn_measure["fitted_opaque_size"][1] <= cornquacker_profile.max_opaque_h
      and corn_measure["clipped_sides"] == [],
      str(corn_measure))

combine_sidecar = _sidecar("the-combine")
combine_measure = A.measure_candidate(RAW_DIR / "the-combine.png", tag="the-combine")
check("The Combine archived raw uses flexible Fowl Harvest provenance",
      combine_sidecar.get("acquisition") == "flexible"
      and combine_sidecar.get("identity_profile", {}).get("role") == "boss"
      and combine_sidecar.get("facing") == "left"
      and combine_sidecar.get("palette") == "fowl-harvest-24@1",
      str(combine_sidecar))
check("The Combine flexible opaque bounds fit the Boss 160x72 ceiling",
      combine_measure["status"] == "advance"
      and combine_measure["fitted_opaque_size"][0] <= combine_profile.max_opaque_w
      and combine_measure["fitted_opaque_size"][1] <= combine_profile.max_opaque_h
      and combine_measure["clipped_sides"] == [],
      str(combine_measure))

fryer_sidecar = _sidecar("the-fryer")
fryer_measure = A.measure_candidate(RAW_DIR / "the-fryer.png", tag="the-fryer")
check("The Fryer archived raw uses flexible Fowl Harvest provenance",
      fryer_sidecar.get("acquisition") == "flexible"
      and fryer_sidecar.get("identity_profile", {}).get("role") == "boss"
      and fryer_sidecar.get("facing") == "left"
      and fryer_sidecar.get("palette") == "fowl-harvest-24@1",
      str(fryer_sidecar))
check("The Fryer flexible opaque bounds fit the Boss 160x72 ceiling",
      fryer_measure["status"] == "advance"
      and fryer_measure["fitted_opaque_size"][0] <= fryer_profile.max_opaque_w
      and fryer_measure["fitted_opaque_size"][1] <= fryer_profile.max_opaque_h
      and fryer_measure["clipped_sides"] == [],
      str(fryer_measure))

scare_sidecar = _sidecar("scarequack")
scare_measure = A.measure_candidate(RAW_DIR / "scarequack.png", tag="scarequack")
check("Scarequack archived raw uses flexible Fowl Harvest provenance",
      scare_sidecar.get("acquisition") == "flexible"
      and scare_sidecar.get("identity_profile", {}).get("role") == "boss"
      and scare_sidecar.get("facing") == "left"
      and scare_sidecar.get("palette") == "fowl-harvest-24@1",
      str(scare_sidecar))
check("Scarequack flexible opaque bounds fit the Boss 160x72 ceiling",
      scare_measure["status"] == "advance"
      and scare_measure["fitted_opaque_size"][0] <= scarequack_profile.max_opaque_w
      and scare_measure["fitted_opaque_size"][1] <= scarequack_profile.max_opaque_h
      and scare_measure["clipped_sides"] == [],
      str(scare_measure))

tickmoth_sidecar = _sidecar("tickmoth")
tickmoth_measure = A.measure_candidate(RAW_DIR / "tickmoth.png", tag="tickmoth")
check("Tickmoth archived raw uses flexible Unwound Belfry provenance",
      tickmoth_sidecar.get("acquisition") == "flexible"
      and tickmoth_sidecar.get("identity_profile", {}).get("role") == "ordinary-opponent"
      and tickmoth_sidecar.get("facing") == "left"
      and tickmoth_sidecar.get("palette") == "unwound-belfry-24@1",
      str(tickmoth_sidecar))
check("Tickmoth flexible opaque bounds fit the ordinary Opponent 30x68 ceiling",
      tickmoth_measure["status"] == "advance"
      and tickmoth_measure["fitted_opaque_size"][0] <= tickmoth_profile.max_opaque_w
      and tickmoth_measure["fitted_opaque_size"][1] <= tickmoth_profile.max_opaque_h
      and tickmoth_measure["clipped_sides"] == [],
      str(tickmoth_measure))

tollbat_sidecar = _sidecar("tollbat")
tollbat_measure = A.measure_candidate(RAW_DIR / "tollbat.png", tag="tollbat")
check("Tollbat archived raw uses flexible Unwound Belfry provenance",
      tollbat_sidecar.get("acquisition") == "flexible"
      and tollbat_sidecar.get("identity_profile", {}).get("role") == "ordinary-opponent"
      and tollbat_sidecar.get("facing") == "left"
      and tollbat_sidecar.get("palette") == "unwound-belfry-24@1",
      str(tollbat_sidecar))
check("Tollbat flexible opaque bounds fit the ordinary Opponent 30x68 ceiling",
      tollbat_measure["status"] == "advance"
      and tollbat_measure["fitted_opaque_size"][0] <= tollbat_profile.max_opaque_w
      and tollbat_measure["fitted_opaque_size"][1] <= tollbat_profile.max_opaque_h
      and tollbat_measure["clipped_sides"] == [],
      str(tollbat_measure))

astrolabe_spider_sidecar = _sidecar("astrolabe-spider")
astrolabe_spider_measure = A.measure_candidate(
    RAW_DIR / "astrolabe-spider.png", tag="astrolabe-spider")
check("Astrolabe Spider archived raw uses flexible Unwound Belfry provenance",
      astrolabe_spider_sidecar.get("acquisition") == "flexible"
      and astrolabe_spider_sidecar.get("identity_profile", {}).get("role") == "ordinary-opponent"
      and astrolabe_spider_sidecar.get("facing") == "left"
      and astrolabe_spider_sidecar.get("palette") == "unwound-belfry-24@1",
      str(astrolabe_spider_sidecar))
check("Astrolabe Spider flexible opaque bounds fit the ordinary Opponent 30x68 ceiling",
      astrolabe_spider_measure["status"] == "advance"
      and astrolabe_spider_measure["fitted_opaque_size"][0] <= astrolabe_spider_profile.max_opaque_w
      and astrolabe_spider_measure["fitted_opaque_size"][1] <= astrolabe_spider_profile.max_opaque_h
      and astrolabe_spider_measure["clipped_sides"] == [],
      str(astrolabe_spider_measure))

the_vigil_sidecar = _sidecar("the-vigil")
the_vigil_measure = A.measure_candidate(RAW_DIR / "the-vigil.png", tag="the-vigil")
check("The Vigil archived raw uses flexible Unwound Belfry provenance",
      the_vigil_sidecar.get("acquisition") == "flexible"
      and the_vigil_sidecar.get("identity_profile", {}).get("role") == "boss"
      and the_vigil_sidecar.get("facing") == "left"
      and the_vigil_sidecar.get("palette") == "unwound-belfry-24@1",
      str(the_vigil_sidecar))
check("The Vigil flexible opaque bounds fit the Boss 160x72 ceiling",
      the_vigil_measure["status"] == "advance"
      and the_vigil_measure["fitted_opaque_size"][0] <= the_vigil_profile.max_opaque_w
      and the_vigil_measure["fitted_opaque_size"][1] <= the_vigil_profile.max_opaque_h
      and the_vigil_measure["clipped_sides"] == [],
      str(the_vigil_measure))

the_tocsin_sidecar = _sidecar("the-tocsin")
the_tocsin_measure = A.measure_candidate(RAW_DIR / "the-tocsin.png", tag="the-tocsin")
check("The Tocsin archived raw uses flexible Unwound Belfry provenance",
      the_tocsin_sidecar.get("acquisition") == "flexible"
      and the_tocsin_sidecar.get("identity_profile", {}).get("role") == "boss"
      and the_tocsin_sidecar.get("facing") == "left"
      and the_tocsin_sidecar.get("palette") == "unwound-belfry-24@1",
      str(the_tocsin_sidecar))
check("The Tocsin flexible opaque bounds fit the Boss 160x72 ceiling",
      the_tocsin_measure["status"] == "advance"
      and the_tocsin_measure["fitted_opaque_size"][0] <= the_tocsin_profile.max_opaque_w
      and the_tocsin_measure["fitted_opaque_size"][1] <= the_tocsin_profile.max_opaque_h
      and the_tocsin_measure["clipped_sides"] == [],
      str(the_tocsin_measure))

the_unwound_sidecar = _sidecar("the-unwound")
the_unwound_measure = A.measure_candidate(RAW_DIR / "the-unwound.png", tag="the-unwound")
check("The Unwound archived raw uses flexible Unwound Belfry provenance",
      the_unwound_sidecar.get("acquisition") == "flexible"
      and the_unwound_sidecar.get("identity_profile", {}).get("role") == "boss"
      and the_unwound_sidecar.get("facing") == "left"
      and the_unwound_sidecar.get("palette") == "unwound-belfry-24@1",
      str(the_unwound_sidecar))
check("The Unwound flexible opaque bounds fit the Boss 160x72 ceiling",
      the_unwound_measure["status"] == "advance"
      and the_unwound_measure["fitted_opaque_size"][0] <= the_unwound_profile.max_opaque_w
      and the_unwound_measure["fitted_opaque_size"][1] <= the_unwound_profile.max_opaque_h
      and the_unwound_measure["clipped_sides"] == [],
      str(the_unwound_measure))

aphelion_sidecar = _sidecar("aphelion")
aphelion_measure = A.measure_candidate(RAW_DIR / "aphelion.png", tag="aphelion")
check("Aphelion archived raw uses flexible Unwound Belfry provenance",
      aphelion_sidecar.get("acquisition") == "flexible"
      and aphelion_sidecar.get("identity_profile", {}).get("role") == "boss"
      and aphelion_sidecar.get("facing") == "left"
      and aphelion_sidecar.get("palette") == "unwound-belfry-24@1",
      str(aphelion_sidecar))
check("Aphelion flexible opaque bounds fit the Boss 160x72 ceiling",
      aphelion_measure["status"] == "advance"
      and aphelion_measure["fitted_opaque_size"][0] <= aphelion_profile.max_opaque_w
      and aphelion_measure["fitted_opaque_size"][1] <= aphelion_profile.max_opaque_h
      and aphelion_measure["clipped_sides"] == [],
      str(aphelion_measure))

boss3_sidecar = _sidecar("boss-3")
boss3_measure = A.measure_candidate(RAW_DIR / "boss-3.png", tag="boss-3")
check("Boss-3 Thornmother archived raw uses flexible acquisition provenance",
      boss3_sidecar.get("acquisition") == "flexible"
      and boss3_sidecar.get("identity_profile", {}).get("role") == "boss"
      and boss3_sidecar.get("facing") == "left",
      str(boss3_sidecar))
check("Boss-3 flexible opaque bounds fit the Boss 160x72 ceiling",
      boss3_measure["status"] == "advance"
      and boss3_measure["fitted_opaque_size"][0] <= boss_profile.max_opaque_w
      and boss3_measure["fitted_opaque_size"][1] <= boss_profile.max_opaque_h
      and boss3_measure["clipped_sides"] == [],
      str(boss3_measure))


print("candidate measurement interface")
with tempfile.TemporaryDirectory() as temp_name:
    temp = pathlib.Path(temp_name)
    candidate = temp / "boss-3-candidate.png"
    candidate.write_bytes((RAW_DIR / "boss-3.png").read_bytes())
    report = A.measure_candidate(candidate, tag="boss-3")
    check("candidate measurement does not require a provenance sidecar",
          not candidate.with_suffix(".source.json").exists()
          and report["status"] == "advance",
          str(report))
    check("flexible candidate report records profile and fit, not logical grid",
          report["profile"]["max_opaque_w"] == 160
          and report["fitted_opaque_size"] is not None
          and "grid" not in report
          and report["primary_failure"] is None
          and report["clipped_sides"] == []
          and report["gates"] == [],
          str(report))

    output = io.StringIO()
    saved_report = temp / "candidate-report.json"
    with redirect_stdout(output):
        exit_code = A.main([
            "measure", "--tag", "boss-3", "--report", str(saved_report),
            str(candidate),
        ])
    cli_report = json.loads(output.getvalue())
    check("measure CLI returns machine-readable candidate JSON",
          exit_code == 0
          and cli_report["tag"] == "boss-3"
          and cli_report["candidates"][0]["status"] == "advance",
          output.getvalue())
    check("measure CLI saves the same machine-readable report when requested",
          json.loads(saved_report.read_text()) == cli_report,
          saved_report.read_text() if saved_report.exists() else "missing report")

    roomy_candidate = temp / "knight-candidate.png"
    roomy_candidate.write_bytes((RAW_DIR / "knight.png").read_bytes())
    roomy_report = A.measure_candidate(roomy_candidate, tag="hunter")
    check("oversized opaque bounds advance for proportional reduction",
          roomy_report["status"] == "advance"
          and roomy_report["fitted_opaque_size"][0] <= hunter_profile.max_opaque_w
          and roomy_report["fitted_opaque_size"][1] <= hunter_profile.max_opaque_h,
          str(roomy_report))

    stamp_raw = temp / "stamp-candidate.png"
    stamp_src = Image.open(RAW_DIR / "hunter.png").convert("RGBA")
    stamp_src.load()[0, stamp_src.height - 1] = (0, 255, 0, 255)
    stamp_src.save(stamp_raw)
    stamp_report = A.measure_candidate(stamp_raw, tag="hunter")
    check("measurement ignores only the lower-left stamp pixel",
          stamp_report["status"] == "advance"
          and stamp_report["cursor_stamp_removed"] is True,
          str(stamp_report))
    check("stamp candidate preserves provider bytes until archival copy",
          stamp_raw.read_bytes() != (RAW_DIR / "hunter.png").read_bytes(),
          "synthetic stamp raw differs from archived hunter bytes")

    promoted_raw_dir = temp / "raw"
    promoted_out_dir = temp / "runtime"
    result = A.promote_candidate(
        candidate,
        tag="boss-3",
        provider="Cursor GenerateImage",
        acquisition_tool="GenerateImage",
        prompt="strict side profile facing LEFT",
        raw_dir=promoted_raw_dir,
        out_dir=promoted_out_dir,
    )
    promoted_sidecar = json.loads(
        (promoted_raw_dir / "boss-3.source.json").read_text())
    promoted_manifest = json.loads((promoted_out_dir / "manifest.json").read_text())
    promoted_runtime = Image.open(promoted_out_dir / "boss-3.png")
    check("promotion creates canonical raw, runtime, sidecar, and manifest",
          result["status"] == "promoted"
          and (promoted_raw_dir / "boss-3.png").read_bytes() == candidate.read_bytes()
          and (promoted_out_dir / "boss-3.png").exists()
          and (promoted_out_dir / "manifest.json").exists(),
          str(result))
    check("promotion generates flexible provenance and geometry",
          promoted_sidecar["acquisition"] == "flexible"
          and promoted_sidecar["cursor_stamp_removed"] is False
          and promoted_sidecar["provider"] == "Cursor GenerateImage"
          and promoted_sidecar["acquisition_tool"] == "GenerateImage"
          and promoted_sidecar["prompt"] == "strict side profile facing LEFT"
          and promoted_sidecar["raw_sha256"] == hashlib.sha256(candidate.read_bytes()).hexdigest()
          and promoted_sidecar["identity"] == "boss-3"
          and promoted_sidecar["asset_class"] == "opponent"
          and promoted_sidecar["palette"] == "moonberry-16@1"
          and promoted_sidecar["runtime_destination"] == "src/assets/sprites/boss-3.png"
          and promoted_sidecar["facing"] == "left"
          and "visual_bounds" in promoted_manifest["boss-3"]
          and not A.validate_manifest_geometry(
              promoted_runtime, promoted_manifest["boss-3"], "boss-3"),
          str(promoted_sidecar))

    rejected = temp / "rejected.png"
    Image.new("RGBA", (64, 96), (0, 0, 255, 255)).save(rejected)
    rejected_raw_dir = temp / "rejected-raw"
    rejected_out_dir = temp / "rejected-runtime"
    try:
        A.promote_candidate(
            rejected,
            tag="boss-3",
            provider="Cursor GenerateImage",
            acquisition_tool="GenerateImage",
            prompt="strict side profile facing LEFT",
            raw_dir=rejected_raw_dir,
            out_dir=rejected_out_dir,
        )
        rejected_error = ""
    except ValueError as error:
        rejected_error = str(error)
    check("promotion refuses retry candidates without writing shipping artifacts",
          "cannot be promoted" in rejected_error
          and not rejected_raw_dir.exists()
          and not rejected_out_dir.exists(),
          rejected_error)

    wrong_facing_raw_dir = temp / "wrong-facing-raw"
    wrong_facing_out_dir = temp / "wrong-facing-runtime"
    try:
        A.promote_candidate(
            candidate,
            tag="boss-3",
            provider="Cursor GenerateImage",
            acquisition_tool="GenerateImage",
            prompt="strict side profile facing RIGHT",
            raw_dir=wrong_facing_raw_dir,
            out_dir=wrong_facing_out_dir,
        )
        wrong_facing_error = "accepted"
    except ValueError as error:
        wrong_facing_error = str(error)
    check("promotion rejects prompts that contradict canonical facing",
          "must specify only facing LEFT" in wrong_facing_error
          and not wrong_facing_raw_dir.exists()
          and not wrong_facing_out_dir.exists(),
          wrong_facing_error)

    try:
        A.promote_candidate(
            candidate,
            tag="boss-3",
            provider="Cursor GenerateImage",
            acquisition_tool="GenerateImage",
            prompt="strict side profile with a complete silhouette",
            raw_dir=wrong_facing_raw_dir,
            out_dir=wrong_facing_out_dir,
        )
        missing_facing_error = "accepted"
    except ValueError as error:
        missing_facing_error = str(error)
    check("promotion requires an explicit canonical facing clause",
          "must specify only facing LEFT" in missing_facing_error
          and not wrong_facing_raw_dir.exists()
          and not wrong_facing_out_dir.exists(),
          missing_facing_error)

    prompt_file = temp / "prompt.txt"
    prompt_file.write_text("strict side profile facing LEFT")
    rejected_report_path = temp / "rejected-report.json"
    output = io.StringIO()
    with redirect_stdout(output):
        rejected_exit = A.main([
            "promote", "--tag", "boss-3",
            "--raw", str(rejected), "--provider", "Cursor GenerateImage",
            "--acquisition-tool", "GenerateImage", "--prompt-file", str(prompt_file),
            "--report", str(rejected_report_path),
        ])
    rejected_cli_report = json.loads(output.getvalue())
    check("failed promote CLI emits and saves machine-readable JSON",
          rejected_exit == 1
          and rejected_cli_report["status"] == "error"
          and json.loads(rejected_report_path.read_text()) == rejected_cli_report,
          output.getvalue())

    tiered_raw_dir = temp / "tiered-raw"
    tiered_out_dir = temp / "tiered-runtime"
    tiered_raw_dir.mkdir()
    logical = Image.new("RGB", (48, 72), A.MAGENTA)
    logical_px = logical.load()
    for y in range(6, 66):
        for x in range(4, 44):
            logical_px[x, y] = A.PALETTE[(x + y) % 2]
    large_raw = logical.resize((768, 1152), Image.Resampling.NEAREST)
    large_path = tiered_raw_dir / "boss-2.png"
    large_raw.save(large_path)
    large_path.with_suffix(".source.json").write_text(json.dumps({
        "provider": "fixture",
        "raw_sha256": hashlib.sha256(large_path.read_bytes()).hexdigest(),
        "tier": "large",
    }))
    legacy_path = tiered_raw_dir / "boss-3.png"
    legacy_path.write_bytes((RAW_DIR / "boss-3.png").read_bytes())
    legacy_path.with_suffix(".source.json").write_text(json.dumps({
        "provider": "fixture",
        "raw_sha256": hashlib.sha256(legacy_path.read_bytes()).hexdigest(),
    }))
    A.build_archived_bundle(
        ["boss-2", "boss-3"], raw_dir=tiered_raw_dir, out_dir=tiered_out_dir)
    tiered_manifest = json.loads((tiered_out_dir / "manifest.json").read_text())
    check("offline build honors legacy-grid-v1 tier sidecars",
          Image.open(tiered_out_dir / "boss-2.png").size == (48, 72)
          and Image.open(tiered_out_dir / "boss-3.png").size == (32, 48)
          and tiered_manifest["boss-2"]["frame_size"] == [48, 72]
          and tiered_manifest["boss-3"]["frame_size"] == [32, 48]
          and "visual_bounds" in tiered_manifest["boss-3"],
          str({name: entry["frame_size"] for name, entry in tiered_manifest.items()}))

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
errs = A.validate(Image.new("RGBA", (32, 32), (0, 0, 0, 255)), "wrongdim",
                  frame=A.MEDIUM)
check("wrong dimensions rejected", any("wrong dimensions" in e for e in errs))

# non-RGBA
errs = A.validate(Image.new("RGB", (32, 48), (233, 226, 189)), "rgb")
check("non-RGBA rejected", any("non-RGBA" in e for e in errs))

# unapproved alpha -- a soft matte that escaped binarization
f = good_frame()
px = f.load()
px[16, 30] = (*A.PALETTE[0], 128)
errs = A.validate(f, "softalpha", frame=A.MEDIUM)
check("unapproved alpha rejected", any("unapproved alpha" in e for e in errs))

# embedded effects -- an off-palette glow baked into a Character frame
f = good_frame()
f.load()[16, 20] = (255, 255, 0, 255)
errs = A.validate(f, "glow", frame=A.MEDIUM, palette=_moonberry)
check("embedded effects rejected", any("embedded effects" in e for e in errs))

_fowl_only = next(
    rgb for rgb in _fowl.colors if rgb not in _moonberry.color_set)
_fowl_frame = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
_fowl_frame.load()[16, 24] = (*_fowl_only, 255)
errs = A.validate(_fowl_frame, "fowl-on-moonberry", frame=A.MEDIUM, palette=_moonberry)
check("Moonberry validator rejects Fowl-only opaque colour",
      any("embedded effects" in e for e in errs), str(errs))
_moon_only = next(
    rgb for rgb in _moonberry.colors if rgb not in _fowl.color_set)
_moon_frame = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
_moon_frame.load()[16, 24] = (*_moon_only, 255)
errs = A.validate(_moon_frame, "moon-on-fowl", frame=A.MEDIUM, palette=_fowl)
check("Fowl validator rejects Moonberry-only opaque colour",
      any("embedded effects" in e for e in errs), str(errs))

# empty frame
errs = A.validate(Image.new("RGBA", (32, 48), (0, 0, 0, 0)), "empty",
                  frame=A.MEDIUM)
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

clipped = Image.new("RGBA", (64, 64), (*A.MAGENTA, 255))
clipped.paste(Image.new("RGBA", (20, 20), (233, 226, 189, 255)), (44, 44))
tmp = HERE / "_clipped_bottom_right_test.png"
clipped.save(tmp)
errs = A.raw_clipping(tmp)
check("generator clipping detects bottom and right edges",
      any("bottom/right" in e for e in errs), errs[0] if errs else "")
clipped_report = A.measure_candidate_legacy(tmp)
check("candidate report keeps clipped sides when the magenta-border gate fails",
      clipped_report["clipped_sides"] == ["bottom", "right"]
      and clipped_report["primary_failure"] == "clip-fail",
      str(clipped_report))
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
    small_frame = A.normalize_legacy_grid_v1(RAW_DIR / "knight.png", frame=A.FRAMES["small"])
    large_frame = A.normalize_legacy_grid_v1(RAW_DIR / "knight.png", frame=A.FRAMES["large"])
check("small normalize canvas is 24x32", small_frame.size == (24, 32))
check("large normalize canvas is 48x72", large_frame.size == (48, 72))
_spx = small_frame.load()
check("small normalize bottom-centre anchor",
      _spx[7, 12][3] == 255 and _spx[6, 12][3] == 0 and _spx[17, 12][3] == 0)
_lpx = large_frame.load()
check("large normalize bottom-centre anchor",
      _lpx[19, 52][3] == 255 and _lpx[18, 52][3] == 0 and _lpx[29, 52][3] == 0)

print("\ndeterminism")
one = A.normalize_legacy_grid_v1(RAW_DIR / "wizard.png")
two = A.normalize_legacy_grid_v1(RAW_DIR / "wizard.png")
one_png, two_png = png_bytes(one), png_bytes(two)
check("repeated offline rebuild is byte-identical PNG",
      hashlib.sha256(one_png).hexdigest() == hashlib.sha256(two_png).hexdigest())

for raw_tag, runtime_name in RUNTIME_SPRITES.items():
    sidecar = json.loads((RAW_DIR / f"{raw_tag}.png").with_suffix(".source.json").read_text())
    sprite_key = pathlib.Path(runtime_name).stem
    rebuilt_image, _geometry, adapter, _stamp, _palette = A.normalize_archived(
        RAW_DIR / f"{raw_tag}.png", sidecar, out_name=sprite_key)
    rebuilt = png_bytes(rebuilt_image)
    committed = (RUNTIME_DIR / runtime_name).read_bytes()
    check(f"offline rebuild matches committed {runtime_name} byte-for-byte",
          rebuilt == committed, f"adapter={adapter}")

manifest_data = json.loads((RUNTIME_DIR / "manifest.json").read_text())
for raw_tag, runtime_name in RUNTIME_SPRITES.items():
    sprite_key = pathlib.Path(runtime_name).stem
    entry = manifest_data[sprite_key]
    sidecar = json.loads((RAW_DIR / f"{raw_tag}.png").with_suffix(".source.json").read_text())
    rebuilt_image, _geometry, adapter, _stamp, _palette = A.normalize_archived(
        RAW_DIR / f"{raw_tag}.png", sidecar, out_name=sprite_key)
    recorded = entry["frames"][0]["sha256"]
    actual = hashlib.sha256(rebuilt_image.tobytes()).hexdigest()
    label = ("flexible" if adapter == "flexible" else "legacy-grid-v1")
    check(f"{label} rebuild sha256 matches manifest for {sprite_key}",
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
_manifest_palettes = {k: v.get("palette") for k, v in manifest.items()}
_expected_palettes = {
    name: A.ASSET_IDENTITIES[name]["palette"] for name in manifest
}
check("manifest records identity-selected palette for every sprite",
      _manifest_palettes == _expected_palettes,
      str(_manifest_palettes))
check("every manifest entry records visual_bounds and foot_anchor",
      all("visual_bounds" in entry and "foot_anchor" in entry
          for entry in manifest.values()))
for sprite_key, entry in manifest.items():
    runtime = Image.open(RUNTIME_DIR / f"{sprite_key}.png")
    check(f"manifest geometry matches runtime for {sprite_key}",
          not A.validate_manifest_geometry(runtime, entry, sprite_key))
bad_entry = dict(entry)
bad_entry["foot_anchor"] = [0, 0]
check("validate_manifest_geometry rejects disagreeing manifest rows",
      A.validate_manifest_geometry(runtime, bad_entry, sprite_key))

print("\nprovider neutrality")
loaded = {m for m in sys.modules
          if "comfy" in m.lower() or "torch" in m.lower()}
check("no provider/model modules imported", not loaded, str(loaded))
check("acquire.py opens no socket",
      "socket" not in A.__dict__ and "urllib" not in A.__dict__)

print("\nfowl-harvest-24 palette")
_fh_path = HERE / "palettes" / "fowl-harvest-24.json"
_glow_path = HERE / "effects" / "palette_glow.json"
_fh = json.loads(_fh_path.read_text())
_fh_colors = _fh["colors"]
_fh_names = [entry["name"] for entry in _fh_colors]
_fh_rgbs = [tuple(entry["rgb"]) for entry in _fh_colors]
_glow_rgbs = {tuple(entry["rgb"]) for entry in json.loads(_glow_path.read_text())["colors"]}
check("fowl-harvest-24 has exactly 24 named swatches", len(_fh_colors) == 24)
check("fowl-harvest-24 color names are unique",
      len(_fh_names) == len(set(_fh_names)))
check("fowl-harvest-24 RGB values are unique",
      len(_fh_rgbs) == len(set(_fh_rgbs)))
check("fowl-harvest-24 excludes acquisition hot magenta",
      (255, 0, 255) not in _fh_rgbs)
_fh_glow_overlap = set(_fh_rgbs) & _glow_rgbs
check("fowl-harvest-24 RGB disjoint from moonberry-glow@1",
      not _fh_glow_overlap, str(_fh_glow_overlap))

print("\nunwound-belfry-24 palette")
_ub_path = HERE / "palettes" / "unwound-belfry-24.json"
_ub = json.loads(_ub_path.read_text())
_ub_colors = _ub["colors"]
_ub_names = [entry["name"] for entry in _ub_colors]
_ub_rgbs = [tuple(entry["rgb"]) for entry in _ub_colors]
check("unwound-belfry-24 has exactly 24 named swatches", len(_ub_colors) == 24)
check("unwound-belfry-24 color names are unique",
      len(_ub_names) == len(set(_ub_names)))
check("unwound-belfry-24 RGB values are unique",
      len(_ub_rgbs) == len(set(_ub_rgbs)))
check("unwound-belfry-24 excludes acquisition hot magenta",
      (255, 0, 255) not in _ub_rgbs)
_ub_glow_overlap = set(_ub_rgbs) & _glow_rgbs
check("unwound-belfry-24 RGB disjoint from moonberry-glow@1",
      not _ub_glow_overlap, str(_ub_glow_overlap))

print("\nbody bundle discovery")
_discovered_body = A.discover_complete_body_raw_tags()
check("complete body raw tags are lexicographically sorted",
      _discovered_body == tuple(sorted(_discovered_body)))
check("production body bundles discovered in runtime-key order",
      A.default_build_raw_tags() == (
          "aphelion", "astrolabe-spider", "boss", "boss-2", "boss-3",
          "burger-drake", "cornquacker", "hunter", "knight", "pipcap", "priest",
          "scarequack", "the-combine", "the-fryer", "the-tocsin", "the-unwound",
          "the-vigil", "tickmoth", "tollbat", "wizard"),
      str(A.default_build_raw_tags()))
check("Aphelion complete body bundle is discovered",
      "aphelion" in _discovered_body)
check("Astrolabe-Spider complete body bundle is discovered",
      "astrolabe-spider" in _discovered_body)
check("Burger Drake complete body bundle is discovered",
      "burger-drake" in _discovered_body)
check("Tickmoth complete body bundle is discovered",
      "tickmoth" in _discovered_body)
check("Tollbat complete body bundle is discovered",
      "tollbat" in _discovered_body)
check("The Vigil complete body bundle is discovered",
      "the-vigil" in _discovered_body)
check("The Tocsin complete body bundle is discovered",
      "the-tocsin" in _discovered_body)
check("The Unwound complete body bundle is discovered",
      "the-unwound" in _discovered_body)
check("Cornquacker complete body bundle is discovered",
      "cornquacker" in _discovered_body)
check("The Combine complete body bundle is discovered",
      "the-combine" in _discovered_body)
check("The Fryer complete body bundle is discovered",
      "the-fryer" in _discovered_body)
check("Scarequack complete body bundle is discovered",
      "scarequack" in _discovered_body)
check("missing-bundle interim set is empty after Fryer and Scarequack promotion",
      A.MISSING_BODY_BUNDLE_INTERIM_RAW_TAGS == frozenset())
check("promoted Fryer runtime is included in default rebuild",
      "the-fryer" in A.default_build_raw_tags()
      and (RUNTIME_DIR / "the-fryer.png").is_file())
check("promoted Scarequack runtime is included in default rebuild",
      "scarequack" in A.default_build_raw_tags()
      and (RUNTIME_DIR / "scarequack.png").is_file())
with tempfile.TemporaryDirectory() as _fryer_orphan_temp:
    _fryer_orphan_raw = pathlib.Path(_fryer_orphan_temp)
    Image.new("RGBA", (8, 8), (0, 0, 0, 255)).save(
        _fryer_orphan_raw / "the-fryer.png")
    with mock.patch.object(A, "RAW_DIR", _fryer_orphan_raw):
        _fryer_png_only = A.discover_body_orphan_failures()
with tempfile.TemporaryDirectory() as _fryer_sidecar_temp:
    _fryer_sidecar_raw = pathlib.Path(_fryer_sidecar_temp)
    (_fryer_sidecar_raw / "the-fryer.source.json").write_text("{}")
    with mock.patch.object(A, "RAW_DIR", _fryer_sidecar_raw):
        _fryer_sidecar_only = A.discover_body_orphan_failures()
with tempfile.TemporaryDirectory() as _scare_orphan_temp:
    _scare_orphan_raw = pathlib.Path(_scare_orphan_temp)
    Image.new("RGBA", (8, 8), (0, 0, 0, 255)).save(
        _scare_orphan_raw / "scarequack.png")
    with mock.patch.object(A, "RAW_DIR", _scare_orphan_raw):
        _scare_png_only = A.discover_body_orphan_failures()
check("half Fryer or Scarequack body bundles fail orphan discovery",
      len(_fryer_png_only) == 1
      and "the-fryer" in _fryer_png_only[0]
      and "archived PNG without provenance" in _fryer_png_only[0]
      and len(_fryer_sidecar_only) == 1
      and "the-fryer" in _fryer_sidecar_only[0]
      and "sidecar without matching" in _fryer_sidecar_only[0]
      and len(_scare_png_only) == 1
      and "scarequack" in _scare_png_only[0],
      str((_fryer_png_only, _fryer_sidecar_only, _scare_png_only)))
with tempfile.TemporaryDirectory() as _body_orphan_temp:
    _body_orphan_raw = pathlib.Path(_body_orphan_temp)
    Image.new("RGBA", (8, 8), (0, 0, 0, 255)).save(_body_orphan_raw / "png-only.png")
    (_body_orphan_raw / "sidecar-only.source.json").write_text("{}")
    with mock.patch.object(A, "RAW_DIR", _body_orphan_raw):
        _body_orphan_msgs = A.discover_body_orphan_failures()
check("orphan body bundles are reported",
      len(_body_orphan_msgs) == 2
      and any("sidecar without matching" in message for message in _body_orphan_msgs)
      and any("archived PNG without provenance" in message for message in _body_orphan_msgs),
      str(_body_orphan_msgs))
with tempfile.TemporaryDirectory() as _unknown_temp:
    _unknown_raw = pathlib.Path(_unknown_temp)
    Image.new("RGBA", (8, 8), (0, 0, 0, 255)).save(_unknown_raw / "mystery.png")
    (_unknown_raw / "mystery.source.json").write_text("{}")
    with mock.patch.object(A, "RAW_DIR", _unknown_raw):
        try:
            A.discover_body_build_raw_tags()
            unknown_identity_error = ""
        except ValueError as error:
            unknown_identity_error = str(error)
check("unknown discovered body identity fails verification",
      "no known Nightglass asset identity" in unknown_identity_error,
      unknown_identity_error)
with tempfile.TemporaryDirectory() as _collision_temp:
    _collision_raw = pathlib.Path(_collision_temp)
    for tag in ("boss", "boss-2"):
        Image.new("RGBA", (8, 8), (0, 0, 0, 255)).save(_collision_raw / f"{tag}.png")
        (_collision_raw / f"{tag}.source.json").write_text("{}")
    collision_names = dict(A.OUTPUT_NAMES)
    collision_names["boss-2"] = "boss-1"
    with mock.patch.object(A, "RAW_DIR", _collision_raw), mock.patch.object(
            A, "OUTPUT_NAMES", collision_names):
        try:
            A.discover_body_build_raw_tags()
            collision_error = ""
        except ValueError as error:
            collision_error = str(error)
check("output key collision fails verification",
      "collides" in collision_error, collision_error)

print("\nbackdrop bundle discovery")
_discovered = B.discover_complete_bundle_keys()
check("complete backdrop keys are lexicographically sorted",
      _discovered == tuple(sorted(_discovered)))
_LEGACY_STAGE_BACKDROPS = ("backdrop-1", "backdrop-2", "backdrop-3")
check("existing three Stage backdrops discovered",
      len(_discovered) >= 3 and _discovered[:3] == _LEGACY_STAGE_BACKDROPS,
      str(_discovered))
with tempfile.TemporaryDirectory() as _orphan_temp:
    _orphan_raw = pathlib.Path(_orphan_temp)
    Image.new("RGBA", (8, 8), (0, 0, 0, 255)).save(_orphan_raw / "png-only.png")
    (_orphan_raw / "sidecar-only.source.json").write_text("{}")
    with mock.patch.object(B, "RAW_DIR", _orphan_raw):
        _orphan_msgs = B.discover_orphan_failures()
check("orphan backdrop bundles are reported",
      len(_orphan_msgs) == 2
      and any("sidecar without matching" in message for message in _orphan_msgs)
      and any("PNG without provenance" in message for message in _orphan_msgs),
      str(_orphan_msgs))

print()
if FAILURES:
    print(f"{len(FAILURES)} FAILED: {FAILURES}")
    sys.exit(1)
print("all contract tests passed")
