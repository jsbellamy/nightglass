"""Six Equipment Base families — registry only until #131 lands art."""

from __future__ import annotations

from dataclasses import dataclass

from .paint import validate_recolor_map

# Tier II recolor maps for the two prototype-evidence families; others are placeholders
# until the Icons slice generates sources.
FOCUS_TO_PRISM = {
    "mint-light": "berry-bright",
    "mint-pale": "cream",
    "cream": "cream-gold",
    "cream-gold": "berry",
    "mint": "berry-mid",
    "mint-shadow": "berry-shadow",
    "sage": "twilight-slate",
}

BOW_TO_LONGBOW = {
    "mint": "berry-mid",
    "mint-shadow": "contour-plum-deep",
    "mint-light": "berry",
    "cream": "berry-bright",
    "sage": "twilight-slate",
}

BLADE_TO_EDGE: dict[str, str] = {}
RELIC_TO_LANTERN: dict[str, str] = {}
VEST_TO_AEGIS: dict[str, str] = {}
CHARM_TO_LOCKET: dict[str, str] = {}


@dataclass(frozen=True)
class IconVariant:
    icon_key: str
    recolor: dict[str, str]


@dataclass(frozen=True)
class IconFamily:
    source_key: str
    palette_subset: tuple[str, ...]
    variants: tuple[IconVariant, ...]
    source_rel: str

    def validate(self) -> None:
        subset = frozenset(self.palette_subset)
        for variant in self.variants:
            validate_recolor_map(variant.recolor, subset)


def _subset(*names: str) -> tuple[str, ...]:
    return names


FAMILIES: tuple[IconFamily, ...] = (
    IconFamily(
        "thornquill-blade",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "cream",
            "cream-gold",
            "twilight-slate",
        ),
        (
            IconVariant("thornquill-blade", {}),
            IconVariant("duskthorn-edge", BLADE_TO_EDGE),
        ),
        "thornquill-blade/source.grid",
    ),
    IconFamily(
        "dewlight-focus",
        _subset(
            "contour-plum-deep",
            "mint-pale",
            "cream",
            "cream-gold",
            "mint",
            "mint-shadow",
            "mint-light",
            "sage",
        ),
        (
            IconVariant("dewlight-focus", {}),
            IconVariant("starfruit-prism", {}),
        ),
        "dewlight-focus/source.grid",
    ),
    IconFamily(
        "moonpetal-relic",
        _subset(
            "contour-plum-deepest",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "cream",
            "cream-gold",
            "mint-pale",
        ),
        (
            IconVariant("moonpetal-relic", {}),
            IconVariant("halcyon-lantern", RELIC_TO_LANTERN),
        ),
        "moonpetal-relic/source.grid",
    ),
    IconFamily(
        "bramblesong-bow",
        _subset(
            "contour-plum-deep",
            "mint",
            "mint-shadow",
            "mint-light",
            "mint-pale",
            "cream",
            "cream-gold",
            "berry",
            "berry-mid",
            "berry-bright",
            "berry-shadow",
            "twilight-slate",
            "sage",
            "skin-warm",
        ),
        (
            IconVariant("bramblesong-bow", {}),
            IconVariant("nightvine-longbow", {}),
        ),
        "bramblesong-bow/source.grid",
    ),
    IconFamily(
        "leafmail-vest",
        _subset(
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "sage",
            "mint-light",
            "twilight-slate",
            "berry-mid",
            "cream",
        ),
        (
            IconVariant("leafmail-vest", {}),
            IconVariant("plumweave-aegis", VEST_TO_AEGIS),
        ),
        "leafmail-vest/source.grid",
    ),
    IconFamily(
        "berrybright-charm",
        _subset(
            "contour-plum-deepest",
            "berry",
            "berry-bright",
            "berry-mid",
            "cream-gold",
            "mint-light",
            "mint-pale",
        ),
        (
            IconVariant("berrybright-charm", {}),
            IconVariant("gloamberry-locket", CHARM_TO_LOCKET),
        ),
        "berrybright-charm/source.grid",
    ),
)

# Pipeline verification family — synthetic geometry, not Equipment art.
VERIFY_CANARY_FAMILY = IconFamily(
    "verify-canary",
    _subset("mint", "berry-mid", "cream", "contour-plum-deepest"),
    (
        IconVariant("verify-canary-a", {}),
        IconVariant(
            "verify-canary-b",
            {"mint": "berry-bright"},
        ),
    ),
    "verify-canary/source.grid",
)

ALL_BUILD_FAMILIES: tuple[IconFamily, ...] = (*FAMILIES, VERIFY_CANARY_FAMILY)


def validate_registry() -> None:
    for family in ALL_BUILD_FAMILIES:
        family.validate()
