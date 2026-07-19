"""Equipment icon geometry and ingest gates (#130 / #126)."""

from __future__ import annotations

import acquire as A

CANVAS = 34
DRAWABLE = 32  # centered drawable band inside CANVAS
RING = 1  # derived contour-plum-deepest outline width
# Structural, not tunable: body + 2×ring must fit in DRAWABLE (32).
MAX_BODY = DRAWABLE - 2 * RING  # 30

# Provisional at n=2 (dewlight-focus / bramblesong-bow evidence). Recalibrate once
# the remaining Equipment families are generated in the Icons slice (#131).
MIN_LONG_AXIS = 20
OFF_RAMP_REJECT = 0.15
OFF_RAMP_FAR_RGB = 40  # subject cells farther than this from nearest allowed swatch

# Grid-recovery confidence floor — same constant as Character acquisition on main.
# Provisional at n=2; retune with MIN_LONG_AXIS when #131 lands.
MIN_GRID_SCORE = A.MIN_GRID_SCORE

# Icon pitch bounds: ~18–36 logical cells across the keyed subject bbox.
PITCH_MAX_DIVISOR = 18.0
PITCH_MIN_DIVISOR = 36.0
