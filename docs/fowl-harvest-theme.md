# Fowl Harvest Visual Theme

Canonical art contract for the battlefield content working-titled **Invasion of
the Mutated Ducks**. Settled by
[#319](https://github.com/jsbellamy/nightglass/issues/319). This document is the
durable source of truth for palette, tone, mutation rules, lighting, and finished
acquisition prompt kits. It does not add playable Stages, Opponent definitions,
or interface wiring.

| Field | Value |
| --- | --- |
| Theme id | `fowl-harvest` |
| Working display title | Invasion of the Mutated Ducks |
| Body palette id | `fowl-harvest-24` (`pipeline/palettes/fowl-harvest-24.json`) |
| Party Characters | remain `moonberry-16` — unchanged by this theme |
| Acquisition background | `#ff00ff` only at acquisition time; never a runtime swatch |

## Mutation and tone

Every creature is recognizably a **duck** fused anatomically with a rural or
roadside object — one living mutation, not a duck wearing a prop or riding a
separate machine.

| Axis | Rule |
| --- | --- |
| Tone | 70% absurd, 30% unsettling |
| Menace | posture, scale, asymmetry, aggression — not gore, exposed organs, realistic wounds, or photorealism |
| Body language | chunky flat-colour pixel art, oversized beaks and feet, strong dark contours, exaggerated silhouette |
| Facing | strict side profiles; **Opponents face LEFT** (ordinary and Boss) per the Battlefield facing rule |
| Party | Moonberry Party Characters face RIGHT and keep `moonberry-16` |

## Environment lighting

Toxic rural dusk: mustard storm light, bruised orange horizon, deep green fields,
oily teal shadows, restrained diner neon and red warning lamps. Backdrops are
palette-exempt scenery; they follow this lighting read without quantizing to
`fowl-harvest-24`.

## Body palette (`fowl-harvest-24`)

Quantization is nearest-in-RGB with **no dithering**. Opaque runtime opponent
pixels must land on exactly these swatches. The list is v1 spec — not tuning.

| name | hex | rgb |
| --- | --- | --- |
| oil-ink | `#111018` | 17, 16, 24 |
| crow-black | `#1e1c29` | 30, 28, 41 |
| bruise-plum | `#351524` | 53, 21, 36 |
| grease-brown-deep | `#4f2926` | 79, 41, 38 |
| patty-brown | `#6f3528` | 111, 53, 40 |
| toast-brown | `#9b4f2e` | 155, 79, 46 |
| rust-orange-deep | `#bf532f` | 191, 83, 47 |
| beak-orange | `#e47a35` | 228, 122, 53 |
| duck-shadow | `#d88c35` | 216, 140, 53 |
| duck-gold | `#e9a541` | 233, 165, 65 |
| yolk-gold | `#ecb34a` | 236, 179, 74 |
| corn-yellow | `#f0cf4a` | 240, 207, 74 |
| corn-light | `#f6df67` | 246, 223, 103 |
| diner-cream | `#f3d897` | 243, 216, 151 |
| field-green-deep | `#315e27` | 49, 94, 39 |
| field-green | `#487c29` | 72, 124, 41 |
| husk-green | `#6aa233` | 106, 162, 51 |
| leaf-green | `#9fcb50` | 159, 203, 80 |
| husk-light | `#b7d969` | 183, 217, 105 |
| pond-teal-deep | `#146451` | 20, 100, 81 |
| diner-teal | `#1f9277` | 31, 146, 119 |
| teal-light | `#4fb99b` | 79, 185, 155 |
| condiment-red | `#c83d3d` | 200, 61, 61 |
| storm-slate | `#55586a` | 85, 88, 106 |

Hot magenta `#ff00ff` is acquisition chroma key only. No runtime swatch may
match any `moonberry-glow@1` RGB value.

## Canonical identity keys

| Kind | Key | Role |
| --- | --- | --- |
| ordinary opponent | `burger-drake` | squat burger fusion; top hat, monocle, burger torso, yellow duck body |
| ordinary opponent | `cornquacker` | tall corn-cob head/neck, leafy husk body, red eye, orange bill and feet |
| ordinary opponent | `milkshake-mallard` | duck fused with a tall diner shake cup; straw crest, cream spill collar; tall smooth cylinder |
| ordinary opponent | `balewaddle` | duck fused with a twine-bound hay bale; broad blocky cube |
| ordinary opponent | `pie-widgeon` | duck fused with a lattice-crust pie in its tin; low wide disc |
| Boss | `the-combine` | duck fused with rusted combine harvester |
| Boss | `the-fryer` | duck fused with chrome roadside deep fryer (Stage 4) |
| Boss | `scarequack` | duck fused with crooked scarecrow and fencepost (Stage 5) |
| backdrop | `last-stop-diner` | abandoned roadside hamburger stand |
| backdrop | `crooked-cornfield` | invaded bent-corn farm lane |
| backdrop | `harvest-yard` | deserted grain-processing yard |

User-approved Burger Drake and Cornquacker portrait references informed early
identity only; acquisition uses the self-contained descriptions and finished
prompts below.

### Ordinary-opponent silhouette separation

The five ordinary Fowl Harvest silhouettes must stay mutually distinguishable at
the 30×68 ordinary-opponent ceiling (see `docs/body-sprite-contract.md` → Hard
fit ceilings): `burger-drake` squat and broad, `cornquacker` tall and lumpy,
`milkshake-mallard` tall and smoothly cylindrical, `balewaddle` broad and
blocky, `pie-widgeon` low and disc-flat. A candidate that reads as another
family's silhouette is rejected at visual review even when every deterministic
gate passes.

---

## `burger-drake` (ordinary opponent)

### Generation prompt

```text
Single full-body Burger Drake ordinary opponent game sprite, strict side profile facing LEFT. A squat mutated golden-yellow duck anatomically fused through a greasy roadside cheeseburger. Its broad torso is the burger: toasted bun forms the rounded shoulders and lower body, a dark patty forms the middle band, pale melted cheese corners protrude clearly, and a thin diner-teal pickle or relish rim separates the layers. The mutation is one living creature, not a duck carrying, sitting in, or wearing a sandwich.

Preserve its dapper absurd identity: oversized orange duck bill, one angry visible eye behind a cracked round monocle, an oily near-black tall top hat with a restrained condiment-red band, one small yellow wing resting across the burger body, and two complete orange webbed feet. Compact broad silhouette, low center of gravity, slight forward aggression. The bill, top hat, burger layers, wing, and both feet must remain distinct at native game scale.

Chunky simplified flat-colour Fowl Harvest rural-mutation pixel art with large readable shapes, selective oil-black / bruise-plum contour, and only named fowl-harvest-24 colors: duck and yolk golds, beak orange, toast and patty browns, diner cream, restrained diner teal, condiment red, and oily near-black. Tone is 70% absurd and 30% unsettling. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, grease droplets, stink lines, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other food, or other subject.
```

### Intended read

At native 1× it reads in this order: duck → burger fusion → dapper top-hat/monocle character. It is broad and squat, visibly left-facing, cleanly grounded, and unmistakable from Pipcap. The burger layers remain anatomical rather than a costume. Quantization retains distinct bun, cheese, patty, duck, teal relish, hat, bill, eye, wing, and feet planes without silent material collapse.

---

## `cornquacker` (ordinary opponent)

### Generation prompt

```text
Single full-body Cornquacker ordinary opponent game sprite, strict side profile facing LEFT. A tall mutant duck anatomically fused with an ear of corn and its living husk. A lumpy golden corn cob replaces and elongates the crown and back of the head into a distinctive tall column while the orange duck bill projects clearly to the left. Broad layered green husk leaves wrap into the torso, wings, and curled tail; the mutation is one creature, not a duck wearing a corn costume or carrying produce.

Preserve its aggressive absurd identity: one narrowed visible condiment-red eye set beneath the corn kernels, open angular orange bill, ragged husk shoulder, one hooked leaf-wing reaching forward, another leaf plane defining the round body, a small dark-green stem tail, and two complete orange webbed feet. Tall narrow silhouette with a forward lean. The corn column, bill, red eye, hooked leaf-wing, round husk body, tail, and both feet must remain distinct at native game scale.

Chunky simplified flat-colour Fowl Harvest rural-mutation pixel art matching the accepted Burger Drake's block size, selective contour, saturation discipline, and 70% absurd / 30% unsettling tone. Use only named fowl-harvest-24 colors: corn and yolk golds, beak orange, field/husk/leaf greens, restrained condiment red, and oily near-black / bruise-plum contour. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, pollen, kernels flying loose, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other crop, or other subject.
```

### Intended read

At native 1× it reads in this order: hostile duck → corn-cob head/neck fusion → living husk body. It is tall and narrow where Burger Drake is squat and broad, but both clearly belong to one Fowl Harvest cohort. Corn yellow, leaf planes, red eye, orange bill/feet, and dark contour remain separate after quantization. It is not a duck in a vegetable costume.

---

## `milkshake-mallard` (ordinary opponent)

### Generation prompt

```text
Single full-body Milkshake Mallard ordinary opponent game sprite, strict side profile facing LEFT. A tall mutant golden-yellow duck anatomically fused with a diner milkshake cup. Its torso is the cup: a tall smooth tapering diner-cream vessel banded with a restrained condiment-red stripe forms the whole body, a thick swirl of pale cream spills over the rim as a drooping collar around the neck, and a bent diner-teal straw rises from the back of the skull like a crest. The mutation is one living creature, not a duck standing in, holding, or drinking from a cup.

Preserve its absurd unsettling identity: an oversized orange duck bill projecting clearly to the left, one narrowed visible condiment-red eye, the bent teal straw crest, the tall smooth cream cup torso with its red band, the drooping spilled-cream collar, one small yellow wing laid against the cup, and two complete orange webbed feet. Tall, narrow, smooth-sided silhouette with a slight forward lean. The bill, eye, straw crest, cup band, spill collar, wing, and both feet must remain distinct at native game scale.

Chunky simplified flat-colour Fowl Harvest rural-mutation pixel art matching the accepted Burger Drake and Cornquacker in block size, selective oil-black / bruise-plum contour, saturation discipline, and 70% absurd / 30% unsettling tone. Use only named fowl-harvest-24 colors: duck and yolk golds, beak orange, diner cream, restrained diner teal, condiment red, and oily near-black. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, drips, splashes, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other drink, or other subject.
```

### Intended read

At native 1× it reads in order: duck → milkshake-cup torso → straw-crested diner mutant. It is tall like Cornquacker but smooth and cylindrical where Cornquacker is lumpy and leafy, so the two tall Fowl silhouettes stay distinguishable. Cup, red band, spill collar, straw, bill, and both feet survive quantization as separate planes. It is not a duck in a cup.

---

## `balewaddle` (ordinary opponent)

### Generation prompt

```text
Single full-body Balewaddle ordinary opponent game sprite, strict side profile facing LEFT. A broad squat mutant golden-yellow duck anatomically fused with a twine-bound hay bale. Its torso is the bale: a wide blocky rectangular mass of dry field-gold straw with clearly cut flat ends, bound by two taut dark twine bands that bite into the body and raise ridges of straw between them. Loose stalks bristle from the shoulders and the underside; the mutation is one living creature, not a duck sitting on, behind, or inside a bale.

Preserve its absurd unsettling identity: an oversized orange duck bill projecting clearly to the left, one small angry visible condiment-red eye, a short thick neck sunk into the bale, the blocky straw torso with two twine bands and bristling loose stalks, one small yellow wing breaking the straw plane, and two complete orange webbed feet planted wide beneath the mass. Broad, blocky, cube-like silhouette with a very low centre of gravity. The bill, eye, both twine bands, straw bristle, wing, and both feet must remain distinct at native game scale.

Chunky simplified flat-colour Fowl Harvest rural-mutation pixel art matching the accepted Burger Drake and Cornquacker in block size, selective oil-black / bruise-plum contour, saturation discipline, and 70% absurd / 30% unsettling tone. Use only named fowl-harvest-24 colors: duck, yolk and field golds, beak orange, toast browns, husk greens, oily near-black, and restrained condiment red. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, falling straw, chaff, dust, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other bale, or other subject.
```

### Intended read

At native 1× it reads in order: duck → hay-bale torso → squat blocky farm mutant. It is broader and harder-edged than Burger Drake's rounded burger mass, and unmistakable from the two tall families. Twine bands, straw bristle, bill, eye, and both feet survive quantization. It is not a duck peering over a bale.

---

## `pie-widgeon` (ordinary opponent)

### Generation prompt

```text
Single full-body Pie Widgeon ordinary opponent game sprite, strict side profile facing LEFT. A low wide mutant golden-yellow duck anatomically fused with a cooling lattice-crust pie still in its tin. Its whole body is the pie: a shallow crimped toast-brown crust disc sits in a dull storm-slate tin, a woven lattice of crust strips crosses the back with dark condiment-red filling showing between the gaps, and the crimped rim runs the full width of the creature. A small duck head and neck rise from the front edge of the crust. The mutation is one living creature, not a duck standing behind or eating a pie.

Preserve its absurd unsettling identity: an oversized orange duck bill projecting clearly to the left, one narrowed visible condiment-red eye, the crimped crust rim, the woven lattice strips with red filling between them, the dull slate tin edge beneath, one small yellow wing tucked against the crust, and two complete orange webbed feet reaching down past the tin. Low, wide, disc-flat silhouette with a long horizontal base. The bill, eye, crimped rim, individual lattice strips, tin edge, wing, and both feet must remain distinct at native game scale.

Chunky simplified flat-colour Fowl Harvest rural-mutation pixel art matching the accepted Burger Drake and Cornquacker in block size, selective oil-black / bruise-plum contour, saturation discipline, and 70% absurd / 30% unsettling tone. Use only named fowl-harvest-24 colors: duck and yolk golds, beak orange, toast and patty browns, diner cream, storm slate, condiment red, and oily near-black. No gore, wounds, exposed organs, realism, gradients, anti-aliasing, blur, or dithering.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, steam, crumbs, sparkles, particles, Ability effect, text, watermark, scenery, UI, transparency, other food, or other subject.
```

### Intended read

At native 1× it reads in order: duck → lattice pie in a tin → low wide diner mutant. It is the flattest and widest of the five Fowl silhouettes, clearly separate from Burger Drake's tall-stacked burger layers. Crimped rim, lattice strips, red filling, tin edge, bill, and both feet survive quantization. It is not a duck behind a pie on a table.

---

## `the-combine` (Boss)

### Generation prompt

```text
Single full-body The Combine Boss opponent game sprite, strict side profile facing LEFT. A massive mutant golden duck anatomically fused with a rusted combine harvester, forming one broad low harvesting beast rather than a duck riding or standing beside a machine. The front remains unmistakably duck: huge yellow head, one glaring condiment-red eye, and an oversized orange bill warped into a blunt toothed thresher intake. Behind it, a storm-slate and rust-brown grain-hopper torso swells into a wide machine body; one large dark tractor-wheel haunch and one planted orange webbed forefoot create complete grounded contacts. Ragged corn-stalk plumage and green husk feathers rise from the back, with a short bent unloading-auger tail silhouette.

The silhouette must be extremely broad and boss-like while remaining readable as one left-facing duck mutation. Keep the eye, bill-thresher, duck skull, hopper torso, wheel haunch, webbed forefoot, corn-stalk plumage, and auger tail as separate large shapes. Slight forward crouch, crushing weight, comic fury. No driver seat with a driver and no separate vehicle.

Chunky simplified flat-colour Fowl Harvest rural-mutation pixel art matching the accepted Burger Drake and Cornquacker in block size, selective contour, saturation discipline, and 70% absurd / 30% unsettling tone. Use only named fowl-harvest-24 colors: duck/corn golds, beak and rust oranges, patty/toast browns, storm slate, oily near-black, field/husk greens, diner cream, and restrained condiment red. Metal reads through planes and rivet-scale clusters, not gradients. No gore, wounds, exposed organs, realism, anti-aliasing, blur, dithering, smoke, exhaust, sparks, or motion streaks.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background. No shadow, floor, glow, dust cloud, loose kernels, particles, Ability effect, text, watermark, scenery, UI, transparency, separate machinery, or other subject.
```

### Intended read

At native 1× it reads in this order: enormous hostile duck → combine-harvester anatomical fusion → cornfield mutation. It is much wider and heavier than both ordinary opponents without looking like a vehicle prop. The bill-thresher, red eye, hopper body, wheel haunch, webbed forefoot, corn plumage, and auger tail remain distinct after quantization. It occupies the Boss half without colliding with the Boss-bar band.

---

## `the-fryer` (Boss)

### Generation prompt

```text
Single full-body The Fryer Boss opponent game sprite, strict side profile facing LEFT. A hulking mutant golden duck anatomically fused with a chrome roadside deep fryer: the fryer forms one broad greasy-metal torso, basket-like fins rise from its back, and guarded vents show a restrained orange heating-coil glow. Keep one glaring condiment-red eye, an oversized orange duck bill, clear yellow duck head, complete webbed feet, and a broad low Boss silhouette. It is one living mutation, never a duck riding, wearing, carrying, or standing beside a fryer.

Chunky simplified flat-colour Fowl Harvest rural-mutation pixel art, 70% absurd and 30% unsettling. Use only named fowl-harvest-24 colors with oil-ink and bruise-plum contour. No gore, wounds, realism, gradients, anti-aliasing, blur, dithering, smoke, sparks, grease droplets, effects, particles, text, watermark, scenery, UI, shadow, transparency, or another subject.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background.
```

### Intended read

At native 1× it reads in this order: hostile duck → chrome deep-fryer anatomical fusion → basket-like back fins and guarded heating-coil glow. The silhouette is hulking and broad-greasy-metal, with one living mutation — never a duck wearing, riding, carrying, or standing beside a fryer. The red eye, orange bill, duck head, fryer torso, coil glow, basket fins, and webbed feet remain distinct after quantization. It occupies the Boss opaque ceiling without colliding with the Boss-bar band.

Archived unpromoted raw: `assets-raw/grid_raw/the-fryer.png` ([#387](https://github.com/jsbellamy/nightglass/issues/387)); runtime registration is [#405](https://github.com/jsbellamy/nightglass/issues/405).

---

## `scarequack` (Boss)

### Generation prompt

```text
Single full-body Scarequack Boss opponent game sprite, strict side profile facing LEFT. A towering mutant duck anatomically fused with a crooked scarecrow and fencepost: a corn-husk body wraps a tall splintered-post spine, ragged sackcloth wing panels form broad angular arms, and one lantern-like condiment-red eye shines beneath a crooked sack head and a clear orange duck bill. Keep complete webbed feet, the corn husks, sackcloth wings, fencepost, bill, eye, and tall silhouette as separate large readable shapes. It is one living mutation, never a duck in a costume or standing beside a scarecrow.

Chunky simplified flat-colour Fowl Harvest rural-mutation pixel art, 70% absurd and 30% unsettling. Use only named fowl-harvest-24 colors with oil-ink and bruise-plum contour. No gore, wounds, realism, gradients, anti-aliasing, blur, dithering, fire, particles, effects, text, watermark, scenery, UI, shadow, transparency, or another subject.

Show exactly one complete subject with generous empty clearance on every edge of an opaque flat solid magenta #ff00ff background.
```

### Intended read

At native 1× it reads in this order: hostile duck → scarecrow and fencepost anatomical fusion → corn-husk body and lantern-like red eye. The silhouette is tall and crooked, distinct from the broad Fryer and Combine Bosses. Splintered post spine, ragged sackcloth wing panels, sack head, bill, eye, husks, and webbed feet remain separate large shapes after quantization. It is one living mutation — never a duck in a costume or standing beside a scarecrow.

Archived unpromoted raw: `assets-raw/grid_raw/scarequack.png` ([#388](https://github.com/jsbellamy/nightglass/issues/388)); runtime registration is [#405](https://github.com/jsbellamy/nightglass/issues/405).

---

## `last-stop-diner` (backdrop)

### Generation prompt

```text
Ultra-wide panoramic toxic-rural-dusk fantasy battlefield backdrop strip in a chunky, softly painted pixel-art style. Very low contrast and overall dark enough for bright combat sprites, 2-pixel health bars, damage numbers, and luminous effects to remain the strongest signals.

SCENE: the Last Stop Diner, an abandoned roadside hamburger stand at the edge of invaded farmland. A squat chrome-and-teal diner with a bent blank rooftop sign, dark service windows, greasy red vinyl booths barely visible inside, empty picnic tables, a silent vending machine, scattered paper wrappers, and shallow oily puddles. Mustard storm light and a bruised orange horizon sit behind deep green roadside weeds and oily teal shadows. Use restrained diner teal, warning red, toast brown, and dirty cream as dim environmental accents; no bright white neon.

COMPOSITION: designed for a short 480×86 crop. Pack the diner facade, bent sign, picnic tables, and horizon into the middle horizontal band. Keep a nearly flat, dark parking-lot ground band across the bottom fifth so native-scale sprites stand cleanly. Keep the sky thin. Preserve open low-detail space across both combat halves. Nothing sharp, luminous, or high-contrast behind health bars.

Environmental evidence of an invasion may include scratches, a toppled condiment caddy, webbed muddy tracks, and chewed wrappers, but show no creature or body. No ducks, characters, animals, monsters, food-shaped creatures, text, readable lettering, logos, watermark, UI, borders, vignette frame, focal weapon, fire, gore, or hot-magenta field.
```

### Intended read

At native 480×86, it reads immediately as a deserted roadside diner under toxic dusk—not a Moonberry garden and not a generic city. Teal chrome, mustard/orange sky, greasy browns, and field greens establish Fowl Harvest materials while remaining subordinate to combat. Ground contact is clear across the full band. No environmental shape can be mistaken for a duck or combatant.

---

## `crooked-cornfield` (backdrop)

### Generation prompt

```text
Ultra-wide panoramic toxic-rural-dusk fantasy battlefield backdrop strip in a chunky, softly painted pixel-art style. Very low contrast and overall dark enough for bright combat sprites, 2-pixel health bars, damage numbers, and luminous effects to remain the strongest signals.

SCENE: the Crooked Cornfield, an invaded farm lane between towering, unnaturally bent corn rows. Heavy corn heads and ragged leaves lean inward without forming faces. Broken irrigation pipes cross shallow ditches of sickly green runoff; a leaning wire fence, distant water tower, and one dim red warning lamp punctuate the horizon. Mustard storm light and bruised orange dusk fade into deep field greens, husk yellow-browns, oily teal drainage shadows, and restrained rust.

COMPOSITION: designed for a short 480×86 crop. Pack crooked corn silhouettes, broken pipework, fence, and distant water tower into the middle horizontal band. Keep a nearly flat dark farm-track ground band across the bottom fifth. Keep the sky thin. Leave broad low-detail combat space on both halves. Corn highlights and runoff must be muted, never glowing brighter than combat feedback.

Environmental evidence of invasion may include snapped stalks, oversized webbed tracks, and a dragged irrigation hose, but show no creature or body. No ducks, characters, animals, monsters, scarecrow with a face, readable text, logos, watermark, UI, borders, vignette frame, focal weapon, fire, gore, or hot-magenta field.
```

### Intended read

At native 480×86, it reads as an oppressive crooked cornfield with failed irrigation and toxic runoff, not a lush Moonberry garden. Yellow-green crop planes, orange dusk, teal drainage shadows, and rusted farm hardware broaden the world palette while keeping combat clear. Corn silhouettes never resemble hidden opponents.

---

## `harvest-yard` (backdrop)

### Generation prompt

```text
Ultra-wide panoramic toxic-rural-dusk fantasy battlefield backdrop strip in a chunky, softly painted pixel-art style. Very low contrast and overall dark enough for bright combat sprites, 2-pixel health bars, damage numbers, and luminous effects to remain the strongest signals.

SCENE: the Harvest Yard, a deserted grain-processing yard and thresher shed at the edge of mutant-duck territory. Broad corrugated grain silos, a low open machinery shed, rusted conveyors, hanging chains, stacked feed sacks, and one parked skeletal farm trailer form an industrial rural skyline. Two dim floodlights throw dirty cream pools through mustard dust; a restrained red beacon and oily teal machine shadows cut across rust brown, storm slate, and deep field green.

COMPOSITION: designed for a short 480×86 crop. Pack silos, shed roof, conveyors, and floodlight structures into the middle horizontal band. Keep a nearly flat dark packed-earth/concrete ground band across the bottom fifth for a very wide Boss. Keep the sky thin. Preserve an especially broad low-detail clearing on the opponent half so a 160×72 Boss silhouette remains distinct. Nothing bright or sharp behind the Boss bar.

Environmental evidence of invasion may include bent metal, a split feed sack, large webbed tracks, and a damaged thresher door, but show no complete combine harvester and no creature or body. No ducks, characters, animals, monsters, readable text, logos, watermark, UI, borders, vignette frame, focal weapon, active machinery, fire, gore, or hot-magenta field.
```

### Intended read

At native 480×86, it reads as a grain and machinery yard prepared for a huge harvesting-machine mutation. Silos, shed, conveyor, floodlights, rust, slate, dusty yellow, and teal machine shadows distinguish it from both other Fowl Harvest scenes and all Moonberry backdrops. The opponent half remains visually quiet enough for The Combine's wide silhouette.
