"""Icon families — Equipment Bases plus Talent / Ability Talent one-variant glyphs."""

from __future__ import annotations

from dataclasses import dataclass

from .paint import validate_recolor_map
from .palette import DEFAULT_SOURCE_PALETTE_ID, PALETTE_PATHS, load_runtime_palette

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

# Halcyon read: berry frame → cool slate/mint (not brighter red); cream glow
# stays luminous (cream unmapped + cream-gold → skin-warm). Never
# cream→berry-bright — that washed Tier II into a flat red lantern.
RELIC_TO_LANTERN: dict[str, str] = {
    "berry": "twilight-slate",
    "berry-mid": "sage",
    "berry-shadow": "mint-shadow",
    "cream-gold": "skin-warm",
    "mint-pale": "mint",
    "mint-light": "mint",
}

# Stave/vine shift richer; do NOT recolor cream — the bowstring must stay cream
# through nightvine-longbow (cream→berry-bright made the string vanish into pink).
BOW_TO_LONGBOW: dict[str, str] = {
    "mint": "berry-mid",
    "mint-shadow": "contour-plum-deepest",
    "mint-light": "berry-bright",
    "mint-pale": "contour-plum",
    "sage": "contour-plum",
    "skin-warm": "berry-bright",
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
    palette_id: str = DEFAULT_SOURCE_PALETTE_ID

    def validate(self) -> None:
        if self.palette_id not in PALETTE_PATHS:
            raise ValueError(f"unknown palette id {self.palette_id!r}")
        runtime = load_runtime_palette(self.palette_id)
        subset = frozenset(self.palette_subset)
        unknown_subset = sorted(subset - runtime.names)
        if unknown_subset:
            raise ValueError(
                f"family {self.source_key!r} palette_subset names outside "
                f"{self.palette_id!r}: {unknown_subset}"
            )
        for variant in self.variants:
            validate_recolor_map(variant.recolor, subset, runtime)


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
    # Talent / Ability Talent — one-variant skill glyphs (#305 Knight batch).
    # Empty recolor; iconKey equals content id; not Equipment Bases / no Tier II.
    IconFamily(
        "fortitude",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("fortitude", {}),),
        "fortitude/source.grid",
    ),
    IconFamily(
        "swordcraft",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint",
            "mint-light",
            "cream",
            "cream-gold",
            "berry",
            "berry-bright",
            "berry-mid",
        ),
        (IconVariant("swordcraft", {}),),
        "swordcraft/source.grid",
    ),
    IconFamily(
        "hold-the-line",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "cream-gold",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("hold-the-line", {}),),
        "hold-the-line/source.grid",
    ),
    IconFamily(
        "falling-star",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "cream",
            "cream-gold",
            "berry",
            "berry-bright",
            "berry-mid",
            "berry-shadow",
        ),
        (IconVariant("falling-star", {}),),
        "falling-star/source.grid",
    ),
    # Talent / Ability Talent — one-variant skill glyphs (#309 Wizard batch).
    # Empty recolor; iconKey equals content id; not Equipment Bases / no Tier II.
    IconFamily(
        "elemental-practice",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "berry-mid",
            "berry",
            "berry-bright",
            "twilight-slate",
        ),
        (IconVariant("elemental-practice", {}),),
        "elemental-practice/source.grid",
    ),
    IconFamily(
        "warding-lore",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "cream",
            "cream-gold",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("warding-lore", {}),),
        "warding-lore/source.grid",
    ),
    IconFamily(
        "starfall",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "cream",
            "cream-gold",
            "berry",
            "berry-bright",
            "berry-mid",
            "berry-shadow",
        ),
        (IconVariant("starfall", {}),),
        "starfall/source.grid",
    ),
    IconFamily(
        "prismatic-shelter",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "cream-gold",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("prismatic-shelter", {}),),
        "prismatic-shelter/source.grid",
    ),
    # Talent / Ability Talent — one-variant skill glyphs (#310 Priest batch).
    # Empty recolor; iconKey equals content id; not Equipment Bases / no Tier II.
    IconFamily(
        "devotion",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "twilight-slate",
        ),
        (IconVariant("devotion", {}),),
        "devotion/source.grid",
    ),
    IconFamily(
        "radiant-study",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "cream-gold",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("radiant-study", {}),),
        "radiant-study/source.grid",
    ),
    IconFamily(
        "moonwell",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "cream-gold",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("moonwell", {}),),
        "moonwell/source.grid",
    ),
    IconFamily(
        "sunlance",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint",
            "mint-light",
            "cream",
            "cream-gold",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("sunlance", {}),),
        "sunlance/source.grid",
    ),
    # Talent / Ability Talent — one-variant skill glyphs (#311 Hunter batch).
    # Empty recolor; iconKey equals content id; not Equipment Bases / no Tier II.
    IconFamily(
        "draw-weight",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("draw-weight", {}),),
        "draw-weight/source.grid",
    ),
    IconFamily(
        "fieldcraft",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "cream-gold",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("fieldcraft", {}),),
        "fieldcraft/source.grid",
    ),
    IconFamily(
        "heartseeker",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "berry-shadow",
            "berry-mid",
            "berry",
            "berry-bright",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("heartseeker", {}),),
        "heartseeker/source.grid",
    ),
    IconFamily(
        "moonwire-trap",
        _subset(
            "contour-plum-deepest",
            "contour-plum-deep",
            "mint-shadow",
            "mint",
            "mint-light",
            "mint-pale",
            "cream",
            "cream-gold",
            "berry-mid",
            "berry",
            "sage",
            "twilight-slate",
        ),
        (IconVariant("moonwire-trap", {}),),
        "moonwire-trap/source.grid",
    ),
    # Fowl Harvest Equipment — independent one-variant families (issue #412).
    IconFamily(
        "augerwire-longbow",
        _subset(
            "oil-ink",
            "crow-black",
            "storm-slate",
            "pond-teal-deep",
            "diner-teal",
            "teal-light",
            "grease-brown-deep",
            "patty-brown",
            "toast-brown",
            "field-green-deep",
            "diner-cream",
            "bruise-plum",
        ),
        (IconVariant("augerwire-longbow", {}),),
        "augerwire-longbow/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "black-oil-locket",
        _subset(
            "oil-ink",
            "crow-black",
            "bruise-plum",
            "storm-slate",
            "grease-brown-deep",
            "patty-brown",
            "rust-orange-deep",
            "beak-orange",
            "duck-shadow",
            "condiment-red",
            "diner-cream",
            "toast-brown",
        ),
        (IconVariant("black-oil-locket", {}),),
        "black-oil-locket/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "combineplate-harness",
        _subset(
            "oil-ink",
            "crow-black",
            "grease-brown-deep",
            "patty-brown",
            "toast-brown",
            "rust-orange-deep",
            "beak-orange",
            "duck-shadow",
            "husk-green",
            "field-green",
            "field-green-deep",
            "storm-slate",
            "diner-cream",
            "bruise-plum",
        ),
        (IconVariant("combineplate-harness", {}),),
        "combineplate-harness/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "feed-sack-brigandine",
        _subset(
            "oil-ink",
            "crow-black",
            "grease-brown-deep",
            "patty-brown",
            "diner-cream",
            "corn-light",
            "yolk-gold",
            "husk-light",
            "husk-green",
            "field-green",
            "field-green-deep",
            "storm-slate",
        ),
        (IconVariant("feed-sack-brigandine", {}),),
        "feed-sack-brigandine/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "fryerplate-cleaver",
        _subset(
            "oil-ink",
            "crow-black",
            "bruise-plum",
            "storm-slate",
            "diner-cream",
            "teal-light",
            "diner-teal",
            "pond-teal-deep",
            "condiment-red",
            "grease-brown-deep",
            "patty-brown",
            "toast-brown",
        ),
        (IconVariant("fryerplate-cleaver", {}),),
        "fryerplate-cleaver/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "harvest-warning-lantern",
        _subset(
            "oil-ink",
            "crow-black",
            "bruise-plum",
            "grease-brown-deep",
            "patty-brown",
            "toast-brown",
            "rust-orange-deep",
            "beak-orange",
            "diner-cream",
            "storm-slate",
            "condiment-red",
            "yolk-gold",
            "corn-yellow",
        ),
        (IconVariant("harvest-warning-lantern", {}),),
        "harvest-warning-lantern/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "huskstring-recurve",
        _subset(
            "oil-ink",
            "crow-black",
            "bruise-plum",
            "grease-brown-deep",
            "patty-brown",
            "field-green",
            "husk-green",
            "leaf-green",
            "husk-light",
            "diner-cream",
            "beak-orange",
            "condiment-red",
        ),
        (IconVariant("huskstring-recurve", {}),),
        "huskstring-recurve/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "mustard-sky-dynamo",
        _subset(
            "oil-ink",
            "crow-black",
            "bruise-plum",
            "storm-slate",
            "diner-cream",
            "diner-teal",
            "teal-light",
            "pond-teal-deep",
            "corn-yellow",
            "yolk-gold",
            "duck-gold",
            "duck-shadow",
        ),
        (IconVariant("mustard-sky-dynamo", {}),),
        "mustard-sky-dynamo/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "neonstorm-coil",
        _subset(
            "oil-ink",
            "crow-black",
            "bruise-plum",
            "storm-slate",
            "diner-cream",
            "diner-teal",
            "teal-light",
            "pond-teal-deep",
            "condiment-red",
        ),
        (IconVariant("neonstorm-coil", {}),),
        "neonstorm-coil/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "red-beacon-token",
        _subset(
            "oil-ink",
            "crow-black",
            "storm-slate",
            "pond-teal-deep",
            "diner-teal",
            "teal-light",
            "condiment-red",
            "rust-orange-deep",
            "beak-orange",
            "grease-brown-deep",
            "patty-brown",
            "diner-cream",
        ),
        (IconVariant("red-beacon-token", {}),),
        "red-beacon-token/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "roadside-reliquary",
        _subset(
            "oil-ink",
            "crow-black",
            "bruise-plum",
            "grease-brown-deep",
            "patty-brown",
            "toast-brown",
            "diner-cream",
            "pond-teal-deep",
            "diner-teal",
            "teal-light",
            "condiment-red",
            "storm-slate",
        ),
        (IconVariant("roadside-reliquary", {}),),
        "roadside-reliquary/source.grid",
        palette_id="fowl-harvest-24",
    ),
    IconFamily(
        "threshertooth-blade",
        _subset(
            "oil-ink",
            "crow-black",
            "bruise-plum",
            "storm-slate",
            "rust-orange-deep",
            "beak-orange",
            "toast-brown",
            "husk-green",
            "field-green",
            "field-green-deep",
            "leaf-green",
            "diner-cream",
            "grease-brown-deep",
            "patty-brown",
        ),
        (IconVariant("threshertooth-blade", {}),),
        "threshertooth-blade/source.grid",
        palette_id="fowl-harvest-24",
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

VERIFY_FOWL_CANARY_FAMILY = IconFamily(
    "verify-fowl-canary",
    _subset("oil-ink", "beak-orange", "field-green", "corn-yellow"),
    (IconVariant("verify-fowl-canary", {}),),
    "verify-fowl-canary/source.grid",
    palette_id="fowl-harvest-24",
)

ALL_BUILD_FAMILIES: tuple[IconFamily, ...] = (
    *FAMILIES,
    VERIFY_CANARY_FAMILY,
    VERIFY_FOWL_CANARY_FAMILY,
)


def validate_registry() -> None:
    for family in ALL_BUILD_FAMILIES:
        family.validate()
