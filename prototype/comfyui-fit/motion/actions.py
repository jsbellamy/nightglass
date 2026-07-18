"""PROTOTYPE action spec — wipe me when trial #19 closes.

The per-action keyframe script both paths are judged against. Identity text is
frozen per Character (it is the phase-1 canonical prompt, minus the pose clause);
only the POSE clause varies per frame. That separation is the point: if identity
drifts when only the pose clause changes, path A has failed on its own terms.

No projectile / trail / impact / aura text appears anywhere here — effects are a
separate asset per the map Notes, and #20 owns them. The negative prompt carries
explicit effect suppression so the body frames stay clean.
"""

# --- frozen identity (phase-1 canonical prompt, pose clause removed) ---------
KNIGHT_ID = (
    "chibi fantasy knight game character, storybook night-garden guild style, "
    "bold dark plum outline contours, mint green and berry-pink and cream color "
    "palette, plump rounded armor with leaf and stitched-fabric motifs, holding a "
    "short sword and a round shield, big head small body cute proportions, full "
    "body, side profile facing right, clean readable silhouette, soft flat cel "
    "shading, centered, flat solid cerulean blue background, no text"
)

WIZARD_ID = (
    "chibi fantasy wizard game character, storybook night-garden guild style, "
    "bold dark plum outline contours, mint green and berry-pink and cream color "
    "palette, long pointed wizard hat and flowing robe with leaf and berry motifs, "
    "holding a slender wand, big head small body cute proportions, full body, side "
    "profile facing right, clean readable silhouette, soft flat cel shading, "
    "centered, flat solid cerulean blue background, no text"
)

# effect suppression is load-bearing: #19 forbids baked-in effects
NEG = (
    "photo, realistic, 3d render, blurry, extra limbs, extra arms, text, watermark, "
    "signature, gun, firearm, modern clothing, cluttered background, gradient "
    "background, multiple characters, motion blur, speed lines, "
    "glowing projectile, magic bolt, energy trail, spark trail, impact flash, "
    "explosion, aura, glow effect, particles, sparkles, light beam, smoke"
)

# --- action scripts ----------------------------------------------------------
# frame = (name, hold_ms, pose clause). hold_ms is the explicit timing #19 asks
# for; it is authored here rather than inferred, and is what path B must be
# resampled *against* for a fair comparison.

KNIGHT = {
    "idle": [
        ("a0", 200, "standing at rest, weight settled, sword lowered at side, shield held forward, shoulders level"),
        ("a1", 200, "standing at rest, chest risen slightly in a breath, sword lowered at side, shield held forward, shoulders raised a little"),
        ("a2", 200, "standing at rest, weight settled, sword lowered at side, shield held forward, shoulders level"),
        ("a3", 200, "standing at rest, chest sunk slightly, sword lowered at side, shield held forward, shoulders dropped a little"),
    ],
    "basic_attack": [
        ("a0", 120, "crouching back into a wind-up, sword drawn back behind the shoulder, shield tucked close, weight on the back foot"),
        ("a1", 80,  "lunging forward, sword swung high overhead at the peak of the arc, shield arm out for balance"),
        ("a2", 120, "sword swung down and forward at full extension in front of the body, front foot planted, body leaning forward"),
        ("a3", 160, "recovering upright, sword returning toward the side, shield brought back forward, weight centering"),
    ],
    "hurt": [
        ("a0", 100, "flinching backward, head recoiled back, shield arm knocked aside, torso twisted away, one foot skidding back"),
        ("a1", 140, "staggered back on the heels, arms loose and low, head still tipped back, off balance"),
        ("a2", 160, "steadying, torso returning upright, shield coming back forward, feet planted again"),
    ],
    "knockout": [
        ("a0", 120, "buckling, knees folding inward, sword slipping from the hand, torso pitching forward"),
        ("a1", 160, "collapsed to the knees, head bowed low, shield fallen, arms hanging"),
        ("a2", 400, "lying fallen on the ground on its side, eyes closed, sword and shield on the ground beside it, completely still"),
    ],
}

WIZARD = {
    "idle": [
        ("a0", 200, "standing at rest, wand held down at the side, robe hanging still, shoulders level"),
        ("a1", 200, "standing at rest, chest risen slightly in a breath, wand held down at the side, robe hem lifted a little, shoulders raised"),
        ("a2", 200, "standing at rest, wand held down at the side, robe hanging still, shoulders level"),
        ("a3", 200, "standing at rest, chest sunk slightly, wand held down at the side, robe hem settling, shoulders dropped"),
    ],
    "cast": [
        ("a0", 140, "drawing the wand back and inward toward the chest, free hand rising, head tipping down in concentration"),
        ("a1", 100, "wand sweeping upward above the head, robe and sleeve trailing, body stretching tall"),
        ("a2", 140, "wand thrust forward at full extension in front of the body, free hand braced back, body leaning into the cast"),
        ("a3", 160, "lowering the wand back toward the side, shoulders settling, robe falling back into place"),
    ],
    "hurt": [
        ("a0", 100, "flinching backward, head recoiled back, hat brim knocked askew, wand arm thrown wide, one foot skidding back"),
        ("a1", 140, "staggered back on the heels, arms loose and low, robe swinging, off balance"),
        ("a2", 160, "steadying, torso returning upright, wand coming back to the side, feet planted again"),
    ],
    "knockout": [
        ("a0", 120, "buckling, knees folding, wand slipping from the hand, hat sliding off, torso pitching forward"),
        ("a1", 160, "collapsed to the knees, head bowed low, robe pooled around, arms hanging"),
        ("a2", 400, "lying fallen on the ground on its side, eyes closed, wand and hat on the ground beside it, completely still"),
    ],
}

CHARACTERS = {
    # tag -> (identity prompt, anchor image already in the ComfyUI input dir, seed, action script)
    "knight": (KNIGHT_ID, "knight_seed103.png", 103, KNIGHT),
    "wizard": (WIZARD_ID, "wizard_seed201.png", 201, WIZARD),
}
