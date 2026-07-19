"""PROTOTYPE presentation composition + attribution review — wipe me when #4 closes.

Renders the #20 stress case again, but with the presentation transform layer on
top, inside the real fixed 480x112 Battle Tile (#1) at 1x. The question is no
longer "does the effect read" (#20 answered yes) but "can the player tell WHICH
Party Member acted", which is a question about the body layer.

Three arms, all from the same timeline:
  FULL     lunge/recoil attribution + hurt recoil/flash + idle bob
  REDUCED  every positional transform suppressed, actor bar instead (#16 floor)
  NONE     #20's behaviour, as the control -- effects only, bodies static

Opponents are stand-ins (flipped, darkened party sprites), same honest caveat as
#20: no opponent art exists.
"""
import hashlib
import json
import pathlib
import sys

from PIL import Image, ImageDraw, ImageEnhance

import present

HERE = pathlib.Path(__file__).parent
FIT = HERE.parent / "comfyui-fit"
EFFECTS = FIT / "effects"
REVIEW = HERE / "review"
TW, TH = 480, 112
STRIKE_DY = -26

MAN = json.loads((EFFECTS / "frames" / "manifest.json").read_text())
MAN_EXTRA = json.loads((HERE / "frames" / "manifest.json").read_text())
FRAME_DIR = {n: EFFECTS / "frames" for n in MAN} | {n: HERE / "frames" for n in MAN_EXTRA}
MAN = MAN | MAN_EXTRA
PIVOT = {"knight_slash": (7, 15)}

# Party (left) and the five-opponent stress rank (right), as foot anchors.
# Front / Middle / Back Formation, spread so silhouettes do not overlap -- the
# first render stacked them and made the actor-side transform unjudgeable.
KNIGHT_FOOT = (108, TH - 6)     # Front
WIZARD_FOOT = (68, TH - 14)     # Middle
PRIEST_FOOT = (28, TH - 22)     # Back
OPPONENT_FEET = [(248, TH - 6), (296, TH - 12), (344, TH - 6),
                 (392, TH - 14), (440, TH - 8)]


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


def frame_at(name, t_ms):
    acc = 0
    for i, f in enumerate(MAN[name]["frames"]):
        if acc <= t_ms < acc + f["duration_ms"]:
            return i
        acc += f["duration_ms"]
    return None


def place_effect(tile, name, i, at):
    im = Image.open(FRAME_DIR[name] / f"{name}_{i}.png").convert("RGBA")
    px, py = PIVOT.get(name, (im.width // 2, im.height // 2))
    tile.alpha_composite(im, (at[0] + MAN[name].get("anchor_dx", 0) - px, at[1] - py))


def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return (int(round(a[0] + (b[0] - a[0]) * t)), int(round(a[1] + (b[1] - a[1]) * t)))


# --- timeline ----------------------------------------------------------------
# Knight basic_attack, Wizard cast, and Priest heal all run concurrently: the
# crowded case, now with a friendly-target action in the mix.
KNIGHT_START = 0
KNIGHT_CUE = MAN["knight_slash"]["cues_ms"]["impact_expected"]
KNIGHT_IMPACT = KNIGHT_START + KNIGHT_CUE
BOLT_START, BOLT_FLIGHT = 40, 300
WIZ_IMPACT = BOLT_START + BOLT_FLIGHT
HEAL_START = 100
TARGET, SECOND_TARGET = OPPONENT_FEET[0], OPPONENT_FEET[1]
HEAL_TARGET = KNIGHT_FOOT       # Priest heals the front-line Knight


def body_offset(who, t_ms, arm):
    """The presentation transform for one Character at time t. (0,0) under REDUCED."""
    if arm == "none":
        return (0, 0)
    if arm == "reduced":
        return (0, 0)
    if who == "knight":
        return present.lunge_offset(t_ms - KNIGHT_START, facing=1)
    if who == "wizard":
        return present.lunge_offset(t_ms - BOLT_START, facing=1)
    if who == "target":
        return present.hurt_offset(t_ms - KNIGHT_IMPACT, facing=1)
    if who == "second":
        return present.hurt_offset(t_ms - WIZ_IMPACT, facing=1)
    return (0, 0)          # no idle transform exists; see present.py


def is_flashing(who, t_ms, arm):
    """Hurt flash, suppressed under REDUCED (photosensitivity) and NONE."""
    if arm != "full":
        return False
    if who == "target":
        return 0 <= t_ms - KNIGHT_IMPACT < present.HURT["flash_ms"]
    if who == "second":
        return 0 <= t_ms - WIZ_IMPACT < present.HURT["flash_ms"]
    return False


def acting(who, t_ms):
    """Is this Character mid-action? Drives the REDUCED-arm actor bar."""
    if who == "knight":
        return 0 <= t_ms - KNIGHT_START < MAN["knight_slash"]["total_ms"]
    if who == "wizard":
        return 0 <= t_ms - BOLT_START < BOLT_FLIGHT
    if who == "priest":
        return 0 <= t_ms - HEAL_START < MAN["priest_heal"]["total_ms"]
    return False


def render(t_ms, cast, arm):
    tile = night_garden()

    for who, sprite, foot in cast:
        # Actor pool FIRST, so it sits under the body like cast light. Required
        # in both arms -- it is the attribution channel, not a fallback.
        if arm != "none" and acting(who, t_ms):
            ImageDraw.Draw(tile).ellipse(present.actor_pool_ellipse(foot),
                                         fill=(*present.ACTOR_POOL["rgb"], 255))
        dx, dy = body_offset(who, t_ms, arm)
        im = present.flash(sprite) if is_flashing(who, t_ms, arm) else sprite
        tile.alpha_composite(im, (foot[0] - im.width // 2 + dx,
                                  foot[1] - im.height + dy))

    i = frame_at("knight_slash", t_ms - KNIGHT_START)
    if i is not None:
        place_effect(tile, "knight_slash", i, strike(TARGET))
    i = frame_at("knight_impact", t_ms - KNIGHT_IMPACT)
    if i is not None:
        place_effect(tile, "knight_impact", i, strike(TARGET))

    dt = t_ms - BOLT_START
    if 0 <= dt < BOLT_FLIGHT:
        loop = MAN["wizard_bolt"]["total_ms"]
        place_effect(tile, "wizard_bolt", frame_at("wizard_bolt", dt % loop),
                     lerp(strike(WIZARD_FOOT), strike(SECOND_TARGET), dt / BOLT_FLIGHT))
    i = frame_at("wizard_impact", t_ms - WIZ_IMPACT)
    if i is not None:
        place_effect(tile, "wizard_impact", i, strike(SECOND_TARGET))

    # Priest heal: friendly target, strike_target anchor, rise baked into asset.
    i = frame_at("priest_heal", t_ms - HEAL_START)
    if i is not None:
        place_effect(tile, "priest_heal", i, strike(HEAL_TARGET))
    return tile


def filmstrip(cast, arm, times, path, label):
    pad, gap = 10, 6
    strip = Image.new("RGBA", (TW + 2 * pad, pad + 16 + len(times) * (TH + gap)),
                      (28, 28, 34, 255))
    d = ImageDraw.Draw(strip)
    d.text((pad, 4), label, fill=(255, 255, 255, 230))
    for r, t in enumerate(times):
        y = pad + 16 + r * (TH + gap)
        strip.alpha_composite(render(t, cast, arm), (pad, y))
        d.text((pad + 3, y + 2), f"{t}ms", fill=(255, 255, 255, 200))
    strip.convert("RGB").save(path)
    print("wrote", path)


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    # runtime/*.png are the contract-valid frames; canonical/*-32x48.png are
    # stale phase-1 outputs that FAIL the validator (noted in #20's NOTES.md).
    knight = Image.open(FIT / "runtime" / "knight_seed103.png").convert("RGBA")
    wizard = Image.open(FIT / "runtime" / "wizard_seed201.png").convert("RGBA")

    def opponent(src):
        return ImageEnhance.Brightness(
            src.transpose(Image.FLIP_LEFT_RIGHT)).enhance(0.62)

    # Priest is a stand-in too: no Priest reference exists (only Knight/Wizard
    # were generated in #15). Its job here is to occupy a back-Formation slot.
    cast = [("knight", knight, KNIGHT_FOOT), ("wizard", wizard, WIZARD_FOOT),
            ("priest", wizard, PRIEST_FOOT)]
    names = ["target", "second", "opp3", "opp4", "opp5"]
    for k, (n, foot) in enumerate(zip(names, OPPONENT_FEET)):
        cast.append((n, opponent(knight if k % 2 == 0 else wizard), foot))

    times = [0, 60, 120, 180, 240, 300, 340, 400]
    filmstrip(cast, "none", times, REVIEW / "CONTROL_1x.png",
              "CONTROL (#20 behaviour) - effects only, bodies static")
    filmstrip(cast, "full", times, REVIEW / "ATTRIBUTION_1x.png",
              "FULL - lunge/recoil attribution + hurt recoil/flash")
    filmstrip(cast, "reduced", times, REVIEW / "REDUCED_1x.png",
              "REDUCED MOTION - no positional transform, actor bar instead")

    # How many pixels? This is the real open parameter, so render the candidates
    # side by side at 1x AND 6x rather than asserting a number.
    zoom, pad = 6, 10
    abox = (86, 40, 134, 112)                    # the Knight alone
    abw, abh = abox[2] - abox[0], abox[3] - abox[1]
    cand = [1, 2, 3, 4]
    ats = [0, 60, 120, 150, 200]
    amp = Image.new("RGBA", (pad + len(ats) * (abw * zoom + pad),
                             16 + len(cand) * (abh * zoom + pad + 12)), (28, 28, 34, 255))
    da = ImageDraw.Draw(amp)
    da.text((pad, 3), "LUNGE AMPLITUDE - out_px candidates, Knight at 6x",
            fill=(255, 255, 255, 230))
    saved = present.LUNGE["out_px"]
    for r, px in enumerate(cand):
        present.LUNGE["out_px"] = px
        y = 16 + r * (abh * zoom + pad + 12)
        da.text((pad, y), f"out_px = {px}", fill=(186, 255, 217, 230))
        for c, t in enumerate(ats):
            crop = render(t, cast, "full").crop(abox).resize(
                (abw * zoom, abh * zoom), Image.NEAREST)
            amp.alpha_composite(crop, (pad + c * (abw * zoom + pad), y + 12))
    present.LUNGE["out_px"] = saved
    amp.convert("RGB").save(REVIEW / "AMPLITUDE_6x.png")
    print("wrote", REVIEW / "AMPLITUDE_6x.png")

    # 6x zoom on the ACTOR side across the wind-up->snap, where attribution lives
    box = (60, 30, 140, 112)
    bw, bh = box[2] - box[0], box[3] - box[1]
    ts = [0, 40, 80, 120, 160, 220]
    z = Image.new("RGBA", (pad + len(ts) * (bw * zoom + pad), bh * zoom + 2 * pad + 14),
                  (28, 28, 34, 255))
    d = ImageDraw.Draw(z)
    d.text((pad, 3), "ACTOR SIDE 6x - Knight wind-up (0-120ms) then snap-back",
           fill=(255, 255, 255, 230))
    for c, t in enumerate(ts):
        crop = render(t, cast, "full").crop(box).resize((bw * zoom, bh * zoom),
                                                        Image.NEAREST)
        x = pad + c * (bw * zoom + pad)
        z.alpha_composite(crop, (x, pad + 14))
        d.text((x + 3, pad + 2), f"{t}ms dx={present.lunge_offset(t)[0]:+d}",
               fill=(255, 255, 255, 210))
    z.convert("RGB").save(REVIEW / "ACTOR_6x.png")
    print("wrote", REVIEW / "ACTOR_6x.png")

    # 6x zoom on the heal, the untested friendly-target shape
    box2, ts2 = (78, 24, 146, 112), [100, 190, 280, 390, 500]
    bw2, bh2 = box2[2] - box2[0], box2[3] - box2[1]
    z2 = Image.new("RGBA", (pad + len(ts2) * (bw2 * zoom + pad),
                            bh2 * zoom + 2 * pad + 14), (28, 28, 34, 255))
    d2 = ImageDraw.Draw(z2)
    d2.text((pad, 3), "PRIEST HEAL 6x - upward rise baked into a tall still, "
                      "anchor=strike_target", fill=(255, 255, 255, 230))
    for c, t in enumerate(ts2):
        crop = render(t, cast, "full").crop(box2).resize((bw2 * zoom, bh2 * zoom),
                                                          Image.NEAREST)
        x = pad + c * (bw2 * zoom + pad)
        z2.alpha_composite(crop, (x, pad + 14))
        d2.text((x + 3, pad + 2), f"{t}ms", fill=(255, 255, 255, 210))
    z2.convert("RGB").save(REVIEW / "HEAL_6x.png")
    print("wrote", REVIEW / "HEAL_6x.png")


if __name__ == "__main__":
    main()


def gifs():
    """Animated arms — a 2px lunge is a MOTION cue and a filmstrip cannot show
    motion, while a single-frame hurt flash reads at full strength in a still.
    Judging attribution from the strip alone is biased against the transform, so
    the arms are also exported at 30fps (#16's frame budget) for honest review."""
    knight = Image.open(FIT / "runtime" / "knight_seed103.png").convert("RGBA")
    wizard = Image.open(FIT / "runtime" / "wizard_seed201.png").convert("RGBA")

    def opponent(src):
        return ImageEnhance.Brightness(
            src.transpose(Image.FLIP_LEFT_RIGHT)).enhance(0.62)

    cast = [("knight", knight, KNIGHT_FOOT), ("wizard", wizard, WIZARD_FOOT),
            ("priest", wizard, PRIEST_FOOT)]
    for k, (n, foot) in enumerate(zip(["target", "second", "o3", "o4", "o5"],
                                      OPPONENT_FEET)):
        cast.append((n, opponent(knight if k % 2 == 0 else wizard), foot))

    step, end, zoom = 33, 561, 2          # 30fps, ~0.55s of action, 2x for review
    for arm in ("none", "full", "reduced"):
        frames = [render(t, cast, arm).convert("RGB").resize(
            (TW * zoom, TH * zoom), Image.NEAREST) for t in range(0, end, step)]
        p = REVIEW / f"ARM_{arm}.gif"
        frames[0].save(p, save_all=True, append_images=frames[1:],
                       duration=step, loop=0)
        print("wrote", p, f"({len(frames)} frames)")


def build_cast():
    knight = Image.open(FIT / "runtime" / "knight_seed103.png").convert("RGBA")
    wizard = Image.open(FIT / "runtime" / "wizard_seed201.png").convert("RGBA")

    def opponent(src):
        return ImageEnhance.Brightness(
            src.transpose(Image.FLIP_LEFT_RIGHT)).enhance(0.62)

    cast = [("knight", knight, KNIGHT_FOOT), ("wizard", wizard, WIZARD_FOOT),
            ("priest", wizard, PRIEST_FOOT)]
    for k, (n, foot) in enumerate(zip(["target", "second", "o3", "o4", "o5"],
                                      OPPONENT_FEET)):
        cast.append((n, opponent(knight if k % 2 == 0 else wizard), foot))
    return cast


def retune():
    """Second review pass (#4): the first showed the actor bar out-reading the
    lunge, but with the flash at full whiteout that comparison may be measuring
    an over-tuned flash rather than a weak lunge. Sweep both, judge together."""
    cast = build_cast()
    pad = 10
    # (a) flash strength, at the instant of impact, whole tile at 1x
    strengths = [1.0, 0.6, 0.35, 0.2]
    t = KNIGHT_IMPACT + 20
    sheet = Image.new("RGBA", (TW + 2 * pad, 16 + len(strengths) * (TH + 18)),
                      (28, 28, 34, 255))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 3), f"FLASH STRENGTH at impact ({t}ms), 1x, five-opponent stress",
           fill=(255, 255, 255, 230))
    saved_f = present.HURT["flash_strength"]
    for r, s in enumerate(strengths):
        present.HURT["flash_strength"] = s
        y = 16 + r * (TH + 18)
        d.text((pad, y), f"flash_strength = {s}", fill=(186, 255, 217, 230))
        sheet.alpha_composite(render(t, cast, "full"), (pad, y + 12))
    present.HURT["flash_strength"] = saved_f
    sheet.convert("RGB").save(REVIEW / "RETUNE_FLASH_1x.png")
    print("wrote", REVIEW / "RETUNE_FLASH_1x.png")

    # (b) with the flash damped, do the lunge candidates carry attribution at 1x?
    present.HURT["flash_strength"] = 0.35
    cands, ts = [2, 3, 4], [0, 66, 99, 150]
    sheet2 = Image.new("RGBA", (TW + 2 * pad, 16 + len(cands) * len(ts) * (TH + 14)),
                       (28, 28, 34, 255))
    d2 = ImageDraw.Draw(sheet2)
    d2.text((pad, 3), "LUNGE at 1x with flash damped to 0.35 - actor side, "
                      "3 concurrent actors", fill=(255, 255, 255, 230))
    saved_l, row = present.LUNGE["out_px"], 0
    for px in cands:
        present.LUNGE["out_px"] = px
        for t2 in ts:
            y = 16 + row * (TH + 14)
            d2.text((pad, y), f"out_px={px}  t={t2}ms  dx={present.lunge_offset(t2)[0]:+d}",
                    fill=(186, 255, 217, 230))
            sheet2.alpha_composite(render(t2, cast, "full"), (pad, y + 12))
            row += 1
    present.LUNGE["out_px"], present.HURT["flash_strength"] = saved_l, saved_f
    sheet2.convert("RGB").save(REVIEW / "RETUNE_LUNGE_1x.png")
    print("wrote", REVIEW / "RETUNE_LUNGE_1x.png")
