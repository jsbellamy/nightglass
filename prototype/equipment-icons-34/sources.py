"""PROTOTYPE — hand-authored native-grid family sources (direct deterministic path).

Two families chosen by the map Notes / audit:
  dewlight-focus  → starfruit-prism   (dense detail: orb on sprig)
  bramblesong-bow → nightvine-longbow (open silhouette: bow with window)

Tier II shares the Tier I compact source and applies a recolor map.
"""

from __future__ import annotations

from paint import grid_from_rows

LEGEND = {
    "D": "contour-plum-deepest",
    "P": "contour-plum-deep",
    "p": "berry-shadow",
    "B": "berry",
    "b": "berry-mid",
    "R": "berry-bright",
    "T": "twilight-slate",
    "m": "mint-shadow",
    "M": "mint",
    "S": "sage",
    "L": "mint-light",
    "l": "mint-pale",
    "w": "skin-warm",
    "G": "cream-gold",
    "C": "cream",
}

# Dense-detail: round dew orb with value-separated facets on a short leafy stand.
DEWLIGHT_FOCUS_ROWS = [
    "..........................",
    "........LLLLLLLL..........",
    "......LLCCCCCCCCLL........",
    ".....LCCCGGGGGGCCCCL......",
    "....LCCGCCCCCCCCGCCCL.....",
    "....LCCGCGCCCCGCGCCCL.....",
    "....LCCGCCCCCCCCGCCCL.....",
    "....LCCCGGGGGGCCCCCL......",
    ".....LCCCCCCCCCCCCL.......",
    "......LLCCCCCCCCLL........",
    ".......LLMMMMMMLL.........",
    "........mmMMMMmm..........",
    ".........mMMMMm...........",
    "........SmMMMMmS..........",
    ".......SSmMMMMmSS.........",
    "........SmMMMMmS..........",
    ".........MMMMMM...........",
    ".........mmmmmm...........",
    "..........mmmm............",
    "..........................",
]

# Open silhouette: vertical recurve bow, limbs ≥3 cells, cream string as one vertical chord.
BRAMBLESONG_BOW_ROWS = [
    "..........................",
    "....mmm.................C.",
    "...mMMMm................C.",
    "..mMMMMMm...............C.",
    ".mMMM.MMMm..............C.",
    ".mMMm..MMMm.............C.",
    "mMMm....MMMm............C.",
    "mMMm.....MMMm...........C.",
    "mMMm......MMMm..........C.",
    "mMMM.......MMM..........C.",
    "mMMM.......MMM..........C.",
    "mMMM.......MMM..........C.",
    "mMMM.......MMM..........C.",
    "mMMM.......MMM..........C.",
    "mMMm......MMMm..........C.",
    "mMMm.....MMMm...........C.",
    ".mMMm...MMMm............C.",
    ".mMMM..MMMm.............C.",
    "..mMMMMMMm..............C.",
    "...mMMMMm...............C.",
    "....mmmm................C.",
    "..........................",
]

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


def dewlight_focus_grid():
    return grid_from_rows(DEWLIGHT_FOCUS_ROWS, LEGEND)


def bramblesong_bow_grid():
    return grid_from_rows(BRAMBLESONG_BOW_ROWS, LEGEND)


FAMILIES = [
    {
        "source_key": "dewlight-focus",
        "grid": dewlight_focus_grid,
        "variants": [
            {"icon_key": "dewlight-focus", "recolor": {}},
            {"icon_key": "starfruit-prism", "recolor": FOCUS_TO_PRISM},
        ],
    },
    {
        "source_key": "bramblesong-bow",
        "grid": bramblesong_bow_grid,
        "variants": [
            {"icon_key": "bramblesong-bow", "recolor": {}},
            {"icon_key": "nightvine-longbow", "recolor": BOW_TO_LONGBOW},
        ],
    },
]
