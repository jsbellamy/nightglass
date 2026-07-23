"""Equipment icon geometry and ingest gates (#130 / #126)."""

from __future__ import annotations

import acquire as A

CANVAS = 34
DRAWABLE = 32  # centered drawable band inside CANVAS
RING = 1  # derived contour-plum-deepest outline width
# Structural, not tunable: body + 2×ring must fit in DRAWABLE (32).
MAX_BODY = DRAWABLE - 2 * RING  # 30

# Recalibrated in #131 after six-family generation (was provisional n=2 at 0.15).
# Measured full-palette off-ramp on accepted raws peaked at 16.4% (thornquill-blade);
# 0.20 clears that band while still rejecting the synthetic ~25% fail fixture.
MIN_LONG_AXIS = 20
OFF_RAMP_REJECT = 0.20
OFF_RAMP_FAR_RGB = 40  # subject cells farther than this from nearest allowed swatch

# Grid-recovery confidence floor — same constant as Character acquisition on main.
# #131 measurements held the n=2 floor (all accepted families scored ≫ 0.04).
MIN_GRID_SCORE = A.MIN_GRID_SCORE

# Icon pitch bounds: ~18–36 logical cells across the keyed subject bbox.
PITCH_MAX_DIVISOR = 18.0
PITCH_MIN_DIVISOR = 36.0
