"""Six Equipment Base families — sources, palette subsets, Tier II recolor maps."""

from __future__ import annotations

from dataclasses import dataclass

from .paint import validate_recolor_map

# Tier II maps — targets must NOT appear in the family's palette_subset
# (flatten guard; see #125 mint→berry-mid merge).
BLADE_TO_EDGE: dict[str, str] = {
    "mint-light": "berry-bright",
    "mint": "contour-plum",
    "mint-shadow": "contour-plum-deepest",
    "cream-gold": "berry-bright",
    "skin-warm": "berry-bright",
}

FOCUS_TO_PRISM: dict[str, str] = {
    "mint-light": "skin-warm",
    "mint": "skin-warm",
    "mint-shadow": "contour-plum-deepest",
    "sage": "twilight-slate",
    "cream-gold": "contour-plum",
}

RELIC_TO_LANTERN: dict[str, str] = {
    "berry": "berry-bright",
    "berry-mid": "berry-bright",
    "berry-shadow": "contour-plum",
    "cream-gold": "contour-plum",
    "cream": "berry-bright",
}

BOW_TO_LONGBOW: dict[str, str] = {
    "mint": "berry-mid",
    "mint-shadow": "contour-plum-deepest",
    "mint-light": "berry-bright",
    "cream": "berry-bright",
    "sage": "contour-plum",
}

VEST_TO_AEGIS: dict[str, str] = {
    "mint": "berry",
    "mint-light": "berry-bright",
    "mint-shadow": "berry-shadow",
    "mint-pale": "contour-plum",
    "cream": "cream-gold",
}

CHARM_TO_LOCKET: dict[str, str] = {
    "berry-mid": "contour-plum",
    "mint-shadow": "contour-plum",
    "mint": "contour-plum",
    "cream-gold": "contour-plum",
}


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
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "cream-gold",
            "berry",
            "berry-mid",
            "berry-shadow",
            "skin-warm",
            "sage",
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
            "mint-light",
            "mint",
            "mint-shadow",
            "sage",
            "cream",
            "cream-gold",
            "berry",
            "berry-mid",
            "berry-shadow",
            "berry-bright",
        ),
        (
            IconVariant("dewlight-focus", {}),
            IconVariant("starfruit-prism", FOCUS_TO_PRISM),
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
            "cream",
            "cream-gold",
            "mint-pale",
            "mint-light",
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
            "berry-shadow",
            "sage",
            "twilight-slate",
            "skin-warm",
        ),
        (
            IconVariant("bramblesong-bow", {}),
            IconVariant("nightvine-longbow", BOW_TO_LONGBOW),
        ),
        "bramblesong-bow/source.grid",
    ),
    IconFamily(
        "leafmail-vest",
        _subset(
            "contour-plum-deep",
            "contour-plum-deepest",
            "mint-shadow",
            "mint",
            "sage",
            "mint-light",
            "mint-pale",
            "cream",
            "berry-mid",
            "twilight-slate",
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
            "contour-plum-deep",
            "berry",
            "berry-bright",
            "berry-mid",
            "berry-shadow",
            "cream-gold",
            "cream",
            "mint-light",
            "mint-pale",
            "mint",
            "mint-shadow",
            "skin-warm",
            "twilight-slate",
            "sage",
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
