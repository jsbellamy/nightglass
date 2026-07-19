"""PROTOTYPE effect composition + stress review — wipe me when trial #20 closes.

Composites derived effect frames over the frozen canonical Characters inside the
real fixed 480x112 Battle Tile (#1) at 1x, against the five-opponent stress
case, and renders the action as a timeline filmstrip so readability is judged
where the decision actually lives -- in motion, at native scale, with the tile
crowded.

Opponents are stand-ins: the canonical Knight/Wizard flipped and darkened. No
opponent art exists yet, and the gate here is "does the effect read against five
bodies in the lane", which silhouette stand-ins answer honestly.

Effects are composited as SEPARATE layers over unmodified Character pixels. No
Character frame is ever written to -- that is the property the ticket asks about
and compose.py asserts it (see verify_body_free).
"""
import hashlib
import json
import pathlib

from PIL import Image, ImageDraw, ImageEnhance

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
FRAMES = HERE / "frames"
REVIEW = HERE / "review"
TW, TH = 480, 112
MAN = json.loads((FRAMES / "manifest.json").read_text())

# Party (left third) and the five-opponent stress rank (right), as foot anchors.
KNIGHT_FOOT = (52, TH - 6)
WIZARD_FOOT = (78, TH - 16)
OPPONENT_FEET = [(248, TH - 6), (296, TH - 12), (344, TH - 6),
                 (392, TH - 14), (440, TH - 8)]
STRIKE_DY = -26
PIVOT = {"knight_slash": (7, 15)}          # arc pivots here, not at canvas centre


def night_garden():
    tile = Image.new("RGBA", (TW, TH))
    d = ImageDraw.Draw(tile)
    for y in range(TH):
        t = y / TH
        d.line([(0, y), (TW, y)],
               fill=(int(38 + 30 * t), int(24 + 70 * t), int(52 + 60 * t), 255))
    d.line([(0, 24), (TW, 24)], fill=(120, 200, 180, 90))
    d.rectangle([0, TH - 10, TW, TH], fill=(30, 60, 45, 255))
    return tile


def strike(foot):
    return (foot[0], foot[1] + STRIKE_DY)


def place_body(tile, sprite, foot):
    tile.alpha_composite(sprite, (foot[0] - sprite.width // 2, foot[1] - sprite.height))


def place_effect(tile, name, frame_idx, at):
    im = Image.open(FRAMES / f"{name}_{frame_idx}.png").convert("RGBA")
    px, py = PIVOT.get(name, (im.width // 2, im.height // 2))
    dx = MAN[name].get("anchor_dx", 0)
    tile.alpha_composite(im, (at[0] + dx - px, at[1] - py))


def frame_at(name, t_ms):
    """Which frame of `name` is showing t_ms into its sequence, or None."""
    acc = 0
    for i, f in enumerate(MAN[name]["frames"]):
        if acc <= t_ms < acc + f["duration_ms"]:
            return i
        acc += f["duration_ms"]
    return None


def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return (int(round(a[0] + (b[0] - a[0]) * t)), int(round(a[1] + (b[1] - a[1]) * t)))


# --- the action timeline -----------------------------------------------------
# Knight basic_attack and Wizard cast run concurrently, the crowded case.
KNIGHT_START = 0
BOLT_START, BOLT_FLIGHT = 40, 300
WIZ_IMPACT_START = BOLT_START + BOLT_FLIGHT
KNIGHT_IMPACT_START = KNIGHT_START + MAN["knight_slash"]["cues_ms"]["impact_expected"]

TARGET = OPPONENT_FEET[0]
SECOND_TARGET = OPPONENT_FEET[1]


def render(t_ms, bodies):
    tile = night_garden()
    for sprite, foot in bodies:
        place_body(tile, sprite, foot)

    i = frame_at("knight_slash", t_ms - KNIGHT_START)
    if i is not None:
        place_effect(tile, "knight_slash", i, strike(TARGET))
    i = frame_at("knight_impact", t_ms - KNIGHT_IMPACT_START)
    if i is not None:
        place_effect(tile, "knight_impact", i, strike(TARGET))

    # bolt: loops its 2-frame shimmer for the whole flight, position lerped
    dt = t_ms - BOLT_START
    if 0 <= dt < BOLT_FLIGHT:
        loop = MAN["wizard_bolt"]["total_ms"]
        i = frame_at("wizard_bolt", dt % loop)
        place_effect(tile, "wizard_bolt", i,
                     lerp(strike(WIZARD_FOOT), strike(SECOND_TARGET), dt / BOLT_FLIGHT))
    i = frame_at("wizard_impact", t_ms - WIZ_IMPACT_START)
    if i is not None:
        place_effect(tile, "wizard_impact", i, strike(SECOND_TARGET))
    return tile


def verify_body_free(bodies):
    """Assert composition never mutates Character pixels: re-hash after render."""
    before = [hashlib.sha256(s.tobytes()).hexdigest() for s, _ in bodies]
    for t in range(0, 460, 20):
        render(t, bodies)
    after = [hashlib.sha256(s.tobytes()).hexdigest() for s, _ in bodies]
    ok = before == after
    print(f"body-free assertion: {'PASS' if ok else 'FAIL'} "
          f"({len(bodies)} Character sprites unchanged across 23 composites)")
    return ok


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    # NOTE: canonical/*-32x48.png are stale phase-1 (#15) outputs that predate
    # the frozen contract and FAIL its validator (718/673 off-palette px).
    # The contract-valid frames are runtime/*.png. Use those.
    knight = Image.open(ROOT / "runtime" / "knight_seed103.png").convert("RGBA")
    wizard = Image.open(ROOT / "runtime" / "wizard_seed201.png").convert("RGBA")

    def opponent(src):
        o = src.transpose(Image.FLIP_LEFT_RIGHT)
        return ImageEnhance.Brightness(o).enhance(0.62)

    bodies = [(knight, KNIGHT_FOOT), (wizard, WIZARD_FOOT)]
    for k, foot in enumerate(OPPONENT_FEET):
        bodies.append((opponent(knight if k % 2 == 0 else wizard), foot))

    verify_body_free(bodies)

    times = [0, 60, 120, 180, 240, 300, 340, 400]
    pad, gap = 10, 6
    strip = Image.new("RGBA", (TW + 2 * pad, pad + len(times) * (TH + gap)),
                      (28, 28, 34, 255))
    d = ImageDraw.Draw(strip)
    for r, t in enumerate(times):
        y = pad + r * (TH + gap)
        strip.alpha_composite(render(t, bodies), (pad, y))
        d.text((pad + 3, y + 2), f"{t}ms", fill=(255, 255, 255, 200))
    strip.convert("RGB").save(REVIEW / "STRESS_1x.png")
    print("wrote", REVIEW / "STRESS_1x.png")

    # 6x zoom of the contested lane at the two impact moments
    zoom, box = 6, (200, 40, 360, 112)
    zl = Image.new("RGBA", ((box[2] - box[0]) * zoom + 2 * pad,
                            2 * (box[3] - box[1]) * zoom + 3 * pad), (28, 28, 34, 255))
    for r, t in enumerate([KNIGHT_IMPACT_START + 20, WIZ_IMPACT_START + 60]):
        crop = render(t, bodies).crop(box)
        zl.alpha_composite(crop.resize(((box[2] - box[0]) * zoom,
                                        (box[3] - box[1]) * zoom), Image.NEAREST),
                           (pad, pad + r * ((box[3] - box[1]) * zoom + pad)))
    zl.convert("RGB").save(REVIEW / "IMPACT_6x.png")
    print("wrote", REVIEW / "IMPACT_6x.png")


if __name__ == "__main__":
    main()
