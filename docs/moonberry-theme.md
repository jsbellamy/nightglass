# Moonberry Visual Theme

Canonical art contract for the battlefield content working-titled **Moonberry
Night-Garden**. Original art direction from
[#3](https://github.com/jsbellamy/nightglass/issues/3). This document is the
durable source of truth for palette, tone, mutation rules, lighting, and finished
acquisition prompt kits. It does not add playable Stages, Opponent definitions,
or interface wiring.

| Field | Value |
| --- | --- |
| Theme id | `moonberry` |
| Working display title | Moonberry Night-Garden |
| Stages | 1–3 |
| Body palette id | `moonberry-16` (`pipeline/palette.json`) |
| Party Characters | `moonberry-16` — this is also the Party Character palette, unlike the other themes |
| Acquisition background | `#ff00ff` only at acquisition time; never a runtime swatch |

## Mutation and tone

Every ordinary Moonberry opponent is a recognizable creature of a storybook night
orchard — a mushroom, briar, moth, beetle, or snail — grown wrong under
moonlight. Unlike Fowl Harvest and Unwound Belfry there is no object-fusion rule;
the mutation is overgrowth and enchantment, not machinery.

| Axis | Rule |
| --- | --- |
| Tone | 60% enchanted, 40% wrong |
| Menace | posture, scale, asymmetry, overgrowth — not gore, exposed organs, realistic wounds, or photorealism |
| Body language | chunky flat-colour pixel art, strong contour-plum outlines, soft botanical mass, exaggerated silhouette |
| Facing | strict side profiles; **Opponents face LEFT** (ordinary and Boss) per the Battlefield facing rule |
| Party | Moonberry Party Characters face RIGHT and share this palette |

## Environment lighting

A moonlit orchard understory — cool mint and sage foliage under a berry-dark
canopy, cream moonlight pooling on the ground, twilight-slate shadow, and ripe
berry highlights standing in for warmth. Backdrops are palette-exempt scenery
that follow this lighting read without quantizing to `moonberry-16`.

## Body palette (`moonberry-16`)

Quantization is nearest-in-RGB with **no dithering**. Opaque runtime pixels must
land on exactly these swatches. Transcribed from `pipeline/palette.json`; that
file is authoritative and this table is a reader convenience.

| name | hex | rgb |
| --- | --- | --- |
| contour-plum-deepest | `#3a0614` | 58, 6, 20 |
| contour-plum-deep | `#4c0b24` | 76, 11, 36 |
| contour-plum | `#4f0417` | 79, 4, 23 |
| berry-shadow | `#701d32` | 112, 29, 50 |
| twilight-slate | `#4a4459` | 74, 68, 89 |
| berry-mid | `#853256` | 133, 50, 86 |
| berry | `#a6365a` | 166, 54, 90 |
| berry-bright | `#e8496f` | 232, 73, 111 |
| mint-shadow | `#62a58c` | 98, 165, 140 |
| mint | `#71ae92` | 113, 174, 146 |
| sage | `#95a187` | 149, 161, 135 |
| mint-light | `#b1d4a9` | 177, 212, 169 |
| mint-pale | `#c0d0af` | 192, 208, 175 |
| skin-warm | `#cf8e76` | 207, 142, 118 |
| cream-gold | `#ddca96` | 221, 202, 150 |
| cream | `#e9e2bd` | 233, 226, 189 |

Hot magenta `#ff00ff` is acquisition chroma key only. No runtime swatch may
match any `moonberry-glow@1` RGB value.

## Canonical identity keys

| Kind | Key | Role |
| --- | --- | --- |
| ordinary opponent | `pipcap` | squat mushroom-cap creature (shipped) |
| ordinary opponent | `brambling` | hunched briar-imp of living thorn-cane with berry-cluster fists; tall and spiky |
| ordinary opponent | `lanternmoth` | orchard moth whose abdomen has swollen into a cream lantern-bulb; wide-winged |
| ordinary opponent | `huskbeetle` | beetle shelled in a split moonberry husk; low, wide, domed |
| ordinary opponent | `dewsnail` | snail with a spiral shell of condensed dew and berry-juice swirl; low and coiled |
| Boss | `boss-1` | Bramblehorn (Stage 1, shipped) |
| Boss | `boss-2` | Gloomcap Matron (Stage 2, shipped) |
| Boss | `boss-3` | Thornmother Vane (Stage 3, shipped) |
| backdrop | `backdrop-1` | Orchard Understory (shipped) |
| backdrop | `backdrop-2` | Moonlit Bramble (shipped) |
| backdrop | `backdrop-3` | Nightbloom Terrace (shipped) |

Silhouette separation across the ordinary cohort: the five ordinary Moonberry
silhouettes must stay mutually distinguishable at the 30×68 ordinary-opponent
ceiling — `pipcap` squat and capped, `brambling` tall and spiky, `lanternmoth`
wide and top-heavy, `huskbeetle` low, wide and domed, `dewsnail` low, smooth and
coiled. A candidate that reads as another family's silhouette is rejected at
visual review even when every deterministic gate passes.

---

## `brambling` (ordinary opponent)

### Generation prompt

```text
Single full-body Brambling ordinary opponent game sprite, strict side profile facing LEFT. A hunched orchard imp whose entire body is woven from living thorn-briar. Ropes of berry-dark bramble cane coil into a narrow twisting torso and long spindly limbs, a snarl of cane forms a low hooded head with two cream pinprick eyes, and dense clusters of ripe moonberries hang as heavy knuckled fists at the ends of its arms. The mutation is one living creature, not an imp holding, wearing, or standing inside a bramble bush.

Preserve its enchanted wrong identity: the hooded briar head with two cream eye-points, a narrow twisting cane torso, two long thorn-studded arms ending in heavy berry-cluster fists, and thin splayed root-feet. Tall, narrow, spiky silhouette with a forward lean. The hood snarl, individual arm thorns, berry fists, and root feet must remain distinct at native game scale.

Chunky simplified flat-colour Moonberry storybook night-garden pixel art with large readable shapes, selective contour-plum outline, and only named moonberry-16 colors: contour plums, berry reds, twilight slate, mint and sage greens, cream-gold and cream. Tone is 60% enchanted and 40% wrong. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, falling leaves, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other plant, or other subject.
```

### Intended read

At native 1× it reads in order: briar tangle → hunched imp → berry-fisted attacker. It is tall, narrow and spiky where Pipcap is squat and capped. Hood snarl, arm thorns, berry-cluster fists, and root feet stay separate planes after quantization. It is not a bush with a face.

---

## `lanternmoth` (ordinary opponent)

### Generation prompt

```text
Single full-body Lanternmoth ordinary opponent game sprite, strict side profile facing LEFT. An orchard moth whose abdomen has swollen into a hanging cream lantern-bulb. Broad dusty mint-and-sage wings spread wide from a small furred berry-dark thorax, and the bulbous cream-gold lantern abdomen hangs low beneath the body like a paper lamp, its seams reading as flat panel lines with one pale cream-lit pane. The mutation is one living creature, not a moth carrying, towing, or perched on a lantern.

Preserve its enchanted wrong identity: a small furred head with two broad feathered antennae, a compact berry-dark thorax, two wide dusty mint wings held in a broad spread, and the swollen cream-gold lantern abdomen with flat panel seams and one pale lit pane. Wide, top-heavy winged silhouette. Antennae, wing edges, thorax, panel seams, and the lit pane must remain distinct at native game scale.

Chunky simplified flat-colour Moonberry storybook night-garden pixel art with large readable shapes, selective contour-plum outline, and only named moonberry-16 colors: contour plums, berry reds, twilight slate, mint and sage greens, cream-gold and cream. Tone is 60% enchanted and 40% wrong. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, light rays, dust motes, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other insect, or other subject.
```

### Intended read

At native 1× it reads in order: moth → swollen lantern abdomen → uncanny orchard lamp-bearer. It is the widest and most top-heavy of the five Moonberry silhouettes. Antennae, both wing planes, thorax, and the lantern's panel seams stay separate after quantization. The lantern is anatomy, not luggage.

---

## `huskbeetle` (ordinary opponent)

### Generation prompt

```text
Single full-body Huskbeetle ordinary opponent game sprite, strict side profile facing LEFT. A broad low orchard beetle whose wing-cases have been replaced by the split husk of a fallen moonberry. A domed berry-red husk shell, cracked open along its length with the torn rind edges curling upward, forms the whole back; a squat sage-green beetle body carries it on six short thick legs, and blunt mandibles jut forward beneath a low armoured brow. The mutation is one living creature, not a beetle sheltering under a piece of fruit rind.

Preserve its enchanted wrong identity: a low armoured head with blunt forward mandibles and two short antennae, the cracked domed berry husk shell with curled rind edges and a pale cream inner seam, a squat sage body, and six short thick legs planted wide. Low, wide, domed silhouette that hugs the ground. Mandibles, the husk crack, the rind curl, and all six legs must remain distinct at native game scale.

Chunky simplified flat-colour Moonberry storybook night-garden pixel art with large readable shapes, selective contour-plum outline, and only named moonberry-16 colors: contour plums, berry reds, twilight slate, mint and sage greens, cream-gold and cream. Tone is 60% enchanted and 40% wrong. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, juice droplets, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other fruit, or other subject.
```

### Intended read

At native 1× it reads in order: beetle → split berry-husk shell → low armoured crawler. It is the lowest and widest of the five, unmistakable from Pipcap's vertical cap. Mandibles, husk crack, cream inner seam, and six distinct legs survive quantization. It is not a beetle standing under a rind umbrella.

---

## `dewsnail` (ordinary opponent)

### Generation prompt

```text
Single full-body Dewsnail ordinary opponent game sprite, strict side profile facing LEFT. A garden snail whose shell has set into a tight spiral of condensed dew shot through with a berry-juice swirl. The spiral shell reads as smooth pale mint with a single berry-red swirl band tracing its whorl to a clear centre; a long soft twilight-slate foot stretches forward beneath it with a rippled trailing edge, and two tall eye-stalks with cream tips rise from a blunt head. The mutation is one living creature, not a snail carrying a glass ornament.

Preserve its enchanted wrong identity: two tall eye-stalks with cream tips, a blunt soft head, the smooth mint spiral shell with its berry swirl band and clear whorl centre, and a long low slate foot with a rippled trailing edge. Low, rounded, coiled silhouette on a long horizontal base. The eye-stalks, whorl spiral, swirl band, and rippled foot edge must remain distinct at native game scale.

Chunky simplified flat-colour Moonberry storybook night-garden pixel art with large readable shapes, selective contour-plum outline, and only named moonberry-16 colors: contour plums, berry reds, twilight slate, mint and sage greens, cream-gold and cream. Tone is 60% enchanted and 40% wrong. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, slime trail, water droplets, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other mollusc, or other subject.
```

### Intended read

At native 1× it reads in order: snail → dew-glass spiral shell → slow uncanny orchard crawler. It is low and smoothly coiled where Huskbeetle is low and angular, so the two lowest silhouettes stay distinguishable. Eye-stalks, whorl, swirl band, and rippled foot survive quantization. It is not a snail with a marble on its back.
