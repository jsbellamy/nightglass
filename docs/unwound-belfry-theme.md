# Unwound Belfry Visual Theme

Canonical art contract for the battlefield content working-titled **The Unwound
Belfry**. Settled by
[#567](https://github.com/jsbellamy/nightglass/issues/567). This document is the
durable source of truth for palette, tone,
mutation rules, lighting, and finished acquisition prompt kits. It does not add
playable Stages, Opponent definitions, or interface wiring.

| Field | Value |
| --- | --- |
| Theme id | `unwound-belfry` |
| Working display title | The Unwound Belfry |
| Stages | 7–10 (Stages 7–9 have ordinary waves; Stage 10 is a boss-only capstone — see C9) |
| Body palette id | `unwound-belfry-24` (`pipeline/palettes/unwound-belfry-24.json`) |
| Party Characters | remain `moonberry-16` — unchanged by this theme |
| Acquisition background | `#ff00ff` only at acquisition time; never a runtime swatch |

## Mutation and tone

Every creature is a recognizable nocturnal belfry-dweller (moth, bat, spider,
owl, raven, or the tower's own mechanism) anatomically fused with a broken
clock, bell, or astronomical instrument — one living mutation, not a creature
wearing, carrying, or standing beside a device.

Stage 10 is a boss-only fight with no ordinary waves; `aphelion` is the V1
capstone Boss. Opponent statistics, Abilities, XP, encounter rosters, Stage
progression, and V1 completion behavior are out of scope for this theme and are
settled by a separate combat grill — this document is visual identity only.

| Axis | Rule |
| --- | --- |
| Tone | 55% absurd, 45% uncanny |
| Menace | posture, scale, asymmetry, stillness, cold light — not gore, exposed organs, realistic wounds, or photorealism |
| Body language | chunky flat-colour pixel art, strong moonless-indigo contours, tarnished-metal planes, exaggerated silhouette |
| Facing | strict side profiles; **Opponents face LEFT** (ordinary and Boss) per the Battlefield facing rule |
| Party | Moonberry Party Characters face RIGHT and keep `moonberry-16` |

## Environment lighting

Moonless indigo night in a decaying bell-tower — tarnished-brass lamp and
candle-ivory glow, deep verdigris shadow, cold-glass highlights standing in for
an absent moon, and sparse alarm-red warning lamps. Backdrops are palette-exempt
scenery; they follow this lighting read without quantizing to `unwound-belfry-24`.

## Body palette (`unwound-belfry-24`)

Quantization is nearest-in-RGB with **no dithering**. Opaque runtime opponent
pixels must land on exactly these swatches. The list is v1 spec — not tuning. A
single swatch may be nudged by ±1 per channel **only** to satisfy the disjointness
invariant (I1); record any such nudge in the palette JSON `note`.

| name | hex | rgb |
| --- | --- | --- |
| belfry-void | `#0c0b16` | 12, 11, 22 |
| moonless-indigo | `#171528` | 23, 21, 40 |
| indigo-shadow | `#22203a` | 34, 32, 58 |
| dusk-indigo | `#33314f` | 51, 49, 79 |
| slate-indigo | `#474765` | 71, 71, 101 |
| brass-umber | `#4a3a1f` | 74, 58, 31 |
| tarnished-brass | `#6e5227` | 110, 82, 39 |
| old-brass | `#8f6d31` | 143, 109, 49 |
| brass | `#b08a3e` | 176, 138, 62 |
| brass-light | `#cfa85a` | 207, 168, 90 |
| verdigris-deep | `#153f3a` | 21, 63, 58 |
| verdigris | `#1f6157` | 31, 97, 87 |
| verdigris-light | `#3a8a76` | 58, 138, 118 |
| patina-pale | `#6bb39a` | 107, 179, 154 |
| candle-ivory-deep | `#b9a06d` | 185, 160, 109 |
| candle-ivory | `#e8d3a0` | 232, 211, 160 |
| candle-flame | `#f6ecc6` | 246, 236, 198 |
| ivory-white | `#fbf6e2` | 251, 246, 226 |
| glass-teal | `#3d7d8f` | 61, 125, 143 |
| cold-glass | `#7fb8c9` | 127, 184, 201 |
| glass-highlight | `#c8e8ef` | 200, 232, 239 |
| alarm-ember | `#7a1f22` | 122, 31, 34 |
| alarm-red | `#b8302e` | 184, 48, 46 |
| alarm-glow | `#e0563f` | 224, 86, 63 |

Hot magenta `#ff00ff` is acquisition chroma key only. No runtime swatch may
match any `moonberry-glow@1` RGB value.

## Canonical identity keys

| Kind | Key | Role |
| --- | --- | --- |
| ordinary opponent | `tickmoth` | moth fused with a cracked pocket watch; small, dial-thorax, four indigo wings |
| ordinary opponent | `tollbat` | bat fused with a cracked bronze hand-bell; wide leathery wings, clapper tongue |
| ordinary opponent | `astrolabe-spider` | spider fused with a broken brass astrolabe; verdigris zodiac disc-body, caliper legs |
| Boss | `the-vigil` | great owl fused with a stopped tower clock (Stage 7) |
| Boss | `the-tocsin` | colossal raven fused with a cracked bronze bourdon bell (Stage 8) |
| Boss | `the-unwound` | the belfry's great clock movement and carillon awakened (Stage 9) |
| Boss | `aphelion` | celestial armillary/orrery leviathan (Stage 10, boss-only capstone) |
| backdrop | `stopped-clock-court` | moonless plaza of dead street clocks at the tower's foot (Stage 7) |
| backdrop | `carillon-hall` | interior bell chamber of hanging tarnished bells (Stage 8) |
| backdrop | `the-mainspring` | the great gearworks / clock-heart chamber (Stage 9) |
| backdrop | `the-oculus` | the tower's open astronomical crown under a broken firmament (Stage 10) |

Silhouette contrast across the cohort: `tickmoth` small-winged, `tollbat`
wide-winged, `astrolabe-spider` low and many-legged; each Boss reads within the
broad 160×72 opaque envelope.

---

## `tickmoth` (ordinary opponent)

### Generation prompt

```text
Single full-body Tickmoth ordinary opponent game sprite, strict side profile facing LEFT. A moth anatomically fused with a cracked antique pocket watch. Its furred thorax is the watch case: a round tarnished-brass casing forms the body, a cracked glass crystal reveals a pale candle-ivory clock dial with bent hands across the chest, and a broken winding crown and snapped fob-ring rise from the top. The two upper wings are dust-indigo moth wings whose scale-patterns read as faint verdigris gear-etchings; the lower wings taper to thin clock-hand points. The mutation is one living creature, not a moth resting on or carrying a watch.

Preserve its uncanny absurd identity: a small furred moth head with feathered antennae, two cold-glass compound eyes with a single alarm-red glint, the brass watch-case torso with cracked crystal and bent dial hands, four indigo wings, and a slender segmented abdomen ending in a hairspring coil. Compact winged silhouette, delicate but wrong. The antennae, cracked dial, brass case, upper and lower wings, and coil abdomen must remain distinct at native game scale.

Chunky simplified flat-colour Unwound Belfry pixel art with large readable shapes, selective moonless-indigo contour, and only named unwound-belfry-24 colors: moonless indigos, tarnished brass, candle ivory, verdigris, cold glass, and a restrained alarm-red glint. Tone is 55% absurd and 45% uncanny. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, dust, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other object, or other subject.
```

### Intended read

At native 1× it reads in order: moth → cracked pocket-watch fusion → uncanny clockwork insect. It is small and delicate against the wide-winged Tollbat and the low many-legged Astrolabe-Spider. Antennae, cracked dial and bent hands, brass case, upper and lower wings, and coil abdomen remain distinct after quantization. It is not a moth holding a watch.

---

## `tollbat` (ordinary opponent)

### Generation prompt

```text
Single full-body Tollbat ordinary opponent game sprite, strict side profile facing LEFT. A bat anatomically fused with a cracked bronze hand-bell. Its torso is the bell: a tarnished verdigris-streaked bronze bell forms the chest and hangs from a brass yoke fused into the shoulders, a hairline crack splits one side, and an iron clapper hangs as a heavy tongue beneath a snarling muzzle. The broad leathery wings are bell-metal thin, their membrane ribs reading as cast seams; one wing sweeps forward. The mutation is one living creature, not a bat clutching or wearing a bell.

Preserve its uncanny absurd identity: a snub bat head with tall notched ears and bared teeth, one cold-glass eye with an alarm-red pinpoint, the cracked bronze bell torso with brass yoke, the iron clapper tongue, two wide leathery wings, and two small hooked feet gripping nothing. Wide-winged menacing silhouette, heavier than it should be. The ears, bell torso, crack, clapper tongue, both wings, and feet must remain distinct at native game scale.

Chunky simplified flat-colour Unwound Belfry pixel art matching Tickmoth's block size, selective moonless-indigo contour, and 55% absurd / 45% uncanny tone. Use only named unwound-belfry-24 colors: moonless indigos, tarnished brass and bronze, verdigris patina, candle ivory, cold glass, and restrained alarm red. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, sound lines, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other object, or other subject.
```

### Intended read

At native 1× it reads in order: bat → cracked bronze-bell fusion → uncanny belfry bat. It is wide-winged and heavy where Tickmoth is small and delicate and the Astrolabe-Spider is low and many-legged. Ears, bell torso, crack, clapper tongue, both wings, and feet remain distinct after quantization. It is not a bat carrying a bell.

---

## `astrolabe-spider` (ordinary opponent)

### Generation prompt

```text
Single full-body Astrolabe-Spider ordinary opponent game sprite, strict side profile facing LEFT. A spider anatomically fused with a broken brass astrolabe. Its abdomen is the astrolabe: a flat verdigris-and-brass engraved disc etched with a faint zodiac ring and a broken rotating rule, tilted to read side-on as a thick coin-like body. The cephalothorax is a smaller brass hub; eight legs are slender jointed brass caliper-arms, some ending in fine pointer tips. The mutation is one living creature, not a spider standing on or holding an instrument.

Preserve its uncanny absurd identity: a compact brass head-hub with a cluster of cold-glass eyes and one alarm-red sighting-lens, an engraved verdigris astrolabe-disc abdomen with a snapped alidade rule, and eight jointed caliper legs arranged in a low wide stance. Low, many-legged, unsettling silhouette. The eye cluster, astrolabe disc, broken rule, and the splayed caliper legs must remain distinct at native game scale.

Chunky simplified flat-colour Unwound Belfry pixel art matching Tickmoth and Tollbat in block size, selective moonless-indigo contour, and 55% absurd / 45% uncanny tone. Use only named unwound-belfry-24 colors: moonless indigos, tarnished brass, verdigris patina, candle ivory, cold glass, and a restrained alarm-red lens. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, web, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other object, or other subject.
```

### Intended read

At native 1× it reads in order: spider → broken-astrolabe fusion → uncanny instrument-arachnid. It is low and many-legged, contrasting the small winged Tickmoth and wide-winged Tollbat. Eye cluster, engraved disc, snapped rule, and caliper legs remain distinct after quantization. It is not a spider standing on an instrument.

---

## `the-vigil` (Boss)

### Generation prompt

```text
Single full-body The Vigil Boss opponent game sprite, strict side profile facing LEFT. A massive great-horned owl anatomically fused with a stopped tower clock, forming one broad low perched sentinel rather than an owl beside a clock. Its round facial disc IS a cracked stopped clock-dial: a candle-ivory face, bent tarnished-brass hour and minute hands frozen, roman ticks around the rim, and one glaring alarm-red eye burning through a shattered spot in the crystal. A heavy brass clock-bezel frames the face; verdigris-tarnished feathers layer the broad body like oxidized copper plates, ear tufts rise as bent brass finials, and two great brass talons grip a broken clock-gear perch.

The silhouette must be extremely broad and boss-like while remaining readable as one left-facing owl mutation within a wide, low envelope. Keep the clock-dial face, bent hands, alarm-red eye, brass bezel, finial ear-tufts, verdigris plumage, folded wings, and gripping talons as separate large shapes. Slight forward hunch, watchful menace, monumental weight. No separate clock and no clockface held in the talons.

Chunky simplified flat-colour Unwound Belfry pixel art matching the ordinary Belfry opponents in block size, selective moonless-indigo contour, saturation discipline, and 55% absurd / 45% uncanny tone. Use only named unwound-belfry-24 colors: moonless indigos, tarnished brass, verdigris patina, candle ivory, cold glass, and restrained alarm red. Metal and patina read through flat planes and rivet-scale clusters, not gradients. No gore, wounds, exposed organs, realism, anti-aliasing, blur, dithering, smoke, or motion streaks.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, particles, Ability effect, text, watermark, scenery, UI, transparency, separate clock, or other subject.
```

### Intended read

At native 1× it reads in order: enormous owl → stopped tower-clock fusion → cracked-dial face with a burning red eye. It is broad and low, filling the wide Boss envelope within the 160×72 opaque ceiling without colliding with the Boss-bar band. Dial and bent hands, red eye, bezel, ear-finials, verdigris plumage, folded wings, and talons remain distinct after quantization. It is one living mutation, never an owl beside a clock.

---

## `the-tocsin` (Boss)

### Generation prompt

```text
Single full-body The Tocsin Boss opponent game sprite, strict side profile facing LEFT. A colossal raven anatomically fused with a cracked bronze bourdon bell, forming one broad heavy alarm-beast rather than a raven beside a bell. Its swollen torso is the great bell: a tarnished bronze bell mouth opens toward the ground with an alarm-red furnace glow burning in its throat, a hairline crack runs up one side, verdigris streaks the shoulders, and a massive iron clapper hangs as a tongue below a jagged open beak. A raven's head, one cold-glass eye with an alarm-red core, and a ruff of dark indigo feathers crown the bell; broad ragged wings sweep back like cast bronze, and two heavy talons plant on the ground.

The silhouette must be extremely broad and boss-like while remaining one left-facing raven-bell mutation within a wide, low envelope. Keep the beak, raven head, bell torso, furnace-throat glow, clapper tongue, crack, feather ruff, ragged wings, and talons as separate large shapes. Slight forward lunge, tolling fury, crushing weight. No separate bell and no bell held in the talons.

Chunky simplified flat-colour Unwound Belfry pixel art matching the Belfry cohort in block size, selective moonless-indigo contour, saturation discipline, and 55% absurd / 45% uncanny tone. Use only named unwound-belfry-24 colors: moonless indigos, tarnished bronze and brass, verdigris patina, candle ivory, cold glass, and restrained alarm red confined to the throat-glow and eye. Metal reads through flat planes and rivet-scale clusters, not gradients. No gore, wounds, exposed organs, realism, anti-aliasing, blur, dithering, smoke, sparks, or sound lines.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow beyond the contained throat, particles, Ability effect, text, watermark, scenery, UI, transparency, separate bell, or other subject.
```

### Intended read

At native 1× it reads in order: enormous raven → cracked bourdon-bell fusion → alarm-red furnace throat. It is broad and heavy, distinct from The Vigil's clock-owl, within the 160×72 opaque ceiling without colliding with the Boss-bar band. Beak, head, bell torso, throat-glow, clapper tongue, crack, wings, and talons remain distinct after quantization; alarm red stays confined to throat and eye. It is one living mutation, never a raven beside a bell.

---

## `the-unwound` (Boss)

### Generation prompt

```text
Single full-body The Unwound Boss opponent game sprite, strict side profile facing LEFT. The belfry's own great clock movement and carillon awakened into one broad monumental machine-beast — the tower's mechanism given monstrous life, not a creature beside machinery. A huge cracked candle-ivory clock-dial forms the face, its bent tarnished-brass hands wrenched and a broken glass crystal exposing an alarm-red glow behind the dial. The body is a wide cage of brass gear-wheels over a spring-coil spine; a ribcage of small hanging cracked bronze bells hangs beneath, verdigris-streaked, one iron clapper swinging. Broken pendulum arms reach forward like limbs and a great mainspring uncoils at the back; two heavy brass gear-feet plant on the ground.

The silhouette must be extremely broad, low, and boss-like — a wide horizontal mass, never a tall tower — while remaining one left-facing awakened mechanism. Keep the cracked dial face, wrenched hands, red under-glow, gear-wheel body, hanging-bell ribcage, pendulum-arm limbs, uncoiled mainspring, and gear-feet as separate large shapes. Looming forward menace, immense weight, uncanny wrongness. No human figure, no driver, no separate tower.

Chunky simplified flat-colour Unwound Belfry pixel art matching the Belfry cohort in block size, selective moonless-indigo contour, saturation discipline, and 55% absurd / 45% uncanny tone. Use only named unwound-belfry-24 colors: moonless indigos, tarnished brass and bronze, verdigris patina, candle ivory, cold glass, and restrained alarm red confined to the dial under-glow. Metal reads through flat planes and rivet-scale clusters, not gradients. No gore, wounds, exposed organs, realism, anti-aliasing, blur, dithering, smoke, sparks, or motion streaks.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow beyond the contained dial under-glow, particles, Ability effect, text, watermark, scenery, UI, transparency, separate tower, or other subject.
```

### Intended read

At native 1× it reads in order: awakened belfry mechanism → cracked great-clock face with a red under-glow → hanging-bell ribcage and gear body. It is broad, low, and monumental — filling the wide Boss envelope within the 160×72 opaque ceiling without going tall and without colliding with the Boss-bar band. Dial and wrenched hands, gear body, bell ribcage, pendulum limbs, mainspring, and gear-feet remain distinct after quantization. It is the belfry itself, not a figure operating a machine.

---

## `aphelion` (Boss)

### Generation prompt

```text
Single full-body Aphelion Boss opponent game sprite, strict side profile facing LEFT. A celestial armillary-orrery leviathan anatomically fused into one broad drifting cosmic beast — an astronomical instrument given monstrous life, not a creature beside a model. Nested tarnished-brass armillary rings orbit a cold-glass void-core that reads as a dark cracked lens where a heart should be; a broken zodiac band arcs across the body, small brass planet-spheres hang on bent arms, and a snapped meridian ring forms a jaw-like crescent at the front holding one glaring alarm-red star-eye. A moonless-indigo body of deep space shows between the brass rings; long orrery-arm limbs reach forward and a curved counterweight tail sweeps back.

The silhouette must be extremely broad and boss-like — a wide ringed cosmic mass — while remaining one left-facing celestial mutation within a wide, low envelope. Keep the nested armillary rings, cold-glass void-core, zodiac band, hanging planet-spheres, crescent meridian jaw, alarm-red star-eye, orrery-arm limbs, and counterweight tail as separate large shapes. Cold, vast, uncanny grandeur. No human figure and no separate stand or model base.

Chunky simplified flat-colour Unwound Belfry pixel art matching the Belfry cohort in block size, selective moonless-indigo contour, saturation discipline, and 55% absurd / 45% uncanny tone. Use only named unwound-belfry-24 colors: moonless indigos, tarnished brass, verdigris patina, candle ivory, cold glass, and a restrained alarm-red star-eye. Metal and glass read through flat planes and rivet-scale clusters, not gradients. No gore, wounds, exposed organs, realism, anti-aliasing, blur, dithering, smoke, sparks, or motion streaks.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow beyond the contained core, particles, star-field, Ability effect, text, watermark, scenery, UI, transparency, separate stand, or other subject.
```

### Intended read

At native 1× it reads in order: celestial armillary-orrery leviathan → nested brass rings around a cold-glass void-core → broken zodiac and crescent jaw with a red star-eye. It is broad and vast, filling the wide Boss envelope within the 160×72 opaque ceiling without colliding with the Boss-bar band. Rings, void-core, zodiac band, planet-spheres, crescent jaw, star-eye, orrery-arm limbs, and tail remain distinct after quantization. As the V1 capstone it reads colder and more cosmic than The Unwound.

---

## `stopped-clock-court` (backdrop)

### Generation prompt

```text
Ultra-wide panoramic moonless-belfry-night fantasy battlefield backdrop strip in a chunky, softly painted pixel-art style. Very low contrast and overall dark enough for bright combat sprites, 2-pixel health bars, damage numbers, and luminous effects to remain the strongest signals.

SCENE: the Stopped-Clock Court, a moonless indigo plaza of dead street clocks at the foot of a great bell-tower. Rows of tarnished-brass pillar clocks and a shuttered clockmaker's shopfront stand with cracked candle-ivory dials, all hands frozen at different wrong hours. Verdigris-streaked cobbles, a dry fountain, and iron railings sit under a moonless indigo sky with cold-glass highlights where a moon should be. One dim alarm-red warning lamp and a low tarnished-brass lantern glow are the only warm accents.

COMPOSITION: designed for a short 480×86 crop. Pack the pillar clocks, shopfront, tower base, and horizon into the middle horizontal band. Keep a nearly flat, dark cobbled ground band across the bottom fifth so native-scale sprites stand cleanly. Keep the sky thin. Preserve open low-detail space across both combat halves. Nothing sharp, luminous, or high-contrast behind health bars.

Environmental evidence may include a toppled clock, scattered gears, and a fallen bell, but show no creature or body. No moths, bats, spiders, owls, ravens, monsters, faces in the clocks, readable numerals as text, logos, watermark, UI, borders, vignette frame, focal object, fire, gore, or hot-magenta field.
```

### Intended read

At native 480×86 it reads immediately as a moonless plaza of dead street clocks at a bell-tower's foot — not a Moonberry garden and not a Fowl Harvest rural scene. Tarnished brass, verdigris cobbles, candle-ivory dials, indigo sky, and one alarm-red lamp establish Belfry materials while staying subordinate to combat. Ground contact is clear across the band; no clock silhouette reads as a hidden opponent.

---

## `carillon-hall` (backdrop)

### Generation prompt

```text
Ultra-wide panoramic moonless-belfry-night fantasy battlefield backdrop strip in a chunky, softly painted pixel-art style. Very low contrast and overall dark enough for bright combat sprites, 2-pixel health bars, damage numbers, and luminous effects to remain the strongest signals.

SCENE: the Carillon Hall, the interior bell chamber of the tower where rows of cracked tarnished-bronze bells hang from a heavy brass frame on frayed ropes. Verdigris patina streaks the bells and beams; a broken keyboard-frame and slack bell-ropes hang between stone arches. Moonless indigo darkness fills the depth, cold-glass highlights catch on the bell shoulders, candle-ivory light pools from a low guttering candle, and one dim alarm-red beacon glows on the far wall.

COMPOSITION: designed for a short 480×86 crop. Pack the hanging bells, brass frame, ropes, and stone arches into the middle horizontal band. Keep a nearly flat, dark plank-and-stone floor band across the bottom fifth. Keep the ceiling depth thin and dark. Leave broad low-detail combat space on both halves. Bell highlights and candle glow must be muted, never glowing brighter than combat feedback.

Environmental evidence may include a fallen clapper, snapped rope, and cracked bell, but show no creature or body. No bats, ravens, moths, monsters, faces, readable text, logos, watermark, UI, borders, vignette frame, focal object, fire, gore, or hot-magenta field.
```

### Intended read

At native 480×86 it reads as the interior bell chamber of hanging tarnished bells under moonless indigo — distinct from the outdoor Court and from all Fowl Harvest and Moonberry scenes. Verdigris bronze, brass frame, candle-ivory pool, and cold-glass edges broaden the world while combat stays clear. Hanging bells never resemble hidden opponents.

---

## `the-mainspring` (backdrop)

### Generation prompt

```text
Ultra-wide panoramic moonless-belfry-night fantasy battlefield backdrop strip in a chunky, softly painted pixel-art style. Very low contrast and overall dark enough for bright combat sprites, 2-pixel health bars, damage numbers, and luminous effects to remain the strongest signals.

SCENE: the Mainspring, the great clock-heart chamber deep in the tower where enormous tarnished-brass gear-wheels, a giant coiled mainspring, and a slow pendulum fill the walls. Verdigris-streaked cogs interlock behind a broken movement-frame; cold-glass jewel-bearings catch faint light and a candle-ivory glow seeps between the gears. Moonless indigo shadow pools in the mechanism's depth, with one dim alarm-red gauge lamp among the works.

COMPOSITION: designed for a short 480×86 crop. Pack the great gear-wheels, mainspring coil, pendulum, and movement-frame into the middle horizontal band. Keep a nearly flat, dark iron-grate floor band across the bottom fifth for a very wide Boss. Keep the upper depth thin and dark. Preserve an especially broad low-detail clearing on the opponent half so a 160×72 Boss silhouette remains distinct. Nothing bright or sharp behind the Boss bar.

Environmental evidence may include a stripped gear, a snapped spring, and a fallen weight, but show no complete clock-beast and no creature or body. No owls, ravens, moths, spiders, monsters, faces in the gears, readable text, logos, watermark, UI, borders, vignette frame, focal object, active sparks, fire, gore, or hot-magenta field.
```

### Intended read

At native 480×86 it reads as the tower's giant gearworks clock-heart, prepared for a huge mechanism-beast — distinct from Court and Hall and from all other scenes. Brass cogs, verdigris, cold-glass bearings, and candle-ivory seep broaden the palette while the opponent half stays quiet for The Unwound's wide silhouette.

---

## `the-oculus` (backdrop)

### Generation prompt

```text
Ultra-wide panoramic moonless-belfry-night fantasy battlefield backdrop strip in a chunky, softly painted pixel-art style. Very low contrast and overall dark enough for bright combat sprites, 2-pixel health bars, damage numbers, and luminous effects to remain the strongest signals.

SCENE: the Oculus, the tower's open astronomical crown beneath a broken firmament. A great tarnished-brass armillary frame and a cracked observatory ring open onto a moonless indigo void where the constellations hang wrong and unwound, faint cold-glass stars scattered like broken glass. Verdigris-streaked instrument rings, a snapped telescope, and a low candle-ivory glow frame the edges; one dim alarm-red signal burns at the rim. The sky is a deep dark void, not a bright starfield.

COMPOSITION: designed for a short 480×86 crop. Pack the armillary frame, observatory ring, broken instruments, and horizon rim into the middle horizontal band. Keep a nearly flat, dark stone-parapet ground band across the bottom fifth for a very wide Boss. Keep the void sky thin and dark so it never competes with combat. Preserve an especially broad low-detail clearing on the opponent half so a 160×72 Boss silhouette remains distinct. Nothing bright or sharp behind the Boss bar; scattered stars must stay dim.

Environmental evidence may include a snapped ring, a cracked lens, and a fallen brass sphere, but show no complete celestial beast and no creature or body. No armillary-monster, orrery-creature, faces, readable constellations as text, logos, watermark, UI, borders, vignette frame, focal object, bright starburst, fire, gore, or hot-magenta field.
```

### Intended read

At native 480×86 it reads as the tower's open astronomical crown under a broken, unwound firmament — the coldest, most cosmic Belfry scene, distinct from the three interior/tower-foot scenes. Brass armillary, verdigris rings, and cold-glass broken stars over a moonless-indigo void broaden the world for the capstone while the opponent half stays quiet for Aphelion's wide silhouette. No dim star reads as a hidden combatant.
