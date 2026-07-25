# #626 — player Tier-3 bespoke effect families

Eight bespoke `moonberry-glow` source stills and derivation specs for Tier-3
class-kit talents. Recipes still point at generic families until the recipe
slice repoints them.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Ability effect frame family) |
| Status | candidate for shipping |
| Runtime destination | `pipeline/effects/source/<talent>.png` → `src/assets/effects/<talent>/*.png` |
| Runtime shape | 30×30 RGBA source stills; derived frame sequences per `manifest.json` |
| Visual vocabulary | `moonberry-glow` via `pipeline/effects/palette_glow.json` (unchanged) |
| Geometry | procedural pixel loops in `pipeline/effects/author.py`; no facing |
| Review context | `STILLS_COMPOSITE_4x.png`, `COHORT_PAIRS_4x.png` |
| Validator | `python3 pipeline/effects/verify.py` + `npm run assets:verify` |

## Reads (C1)

| still key (family) | mirrors idiom | read |
| --- | --- | --- |
| `aegis-wall` | `buff_halo` | curved wall of overlapping interlocked shields; mint/cream `arc` ramp, buff read |
| `titans-cleave` | `arc_slash` | enormous greatsword mid downward cleave, wide heavy arc; cream/mint `arc` ramp |
| `comet-fall` | `spell_bloom` | warm cream-and-berry comet with short tapering tail streaking down; `bloom` ramp warm |
| `glacial-prison` | `spell_bloom` | faceted mint ice-crystal prism, angular shards from cold core; `arc` mint + `bloom` violet accents |
| `radiant-bulwark` | `heal_rise` | domed cream-gold light barrier arcing protectively upward; cream/mint `arc` ramp, rising read |
| `solar-verdict` | `spell_bolt` | tapered cream-gold spear of light — lane-travel projectile; cream `arc` ramp |
| `death-rain` | `arrow_bolt` | tight fan of three parallel descending arrows — lane-travel volley; mint `arc` ramp |
| `killshot` | `arrow_bolt` | single heavy broadhead arrow, longer/thicker than base `arrow-bolt`; mint/cream `arc` ramp |

## Style cohort

Existing procedural `moonberry-glow` effect idioms the talents currently borrow:
`buff-halo`, `arc-slash-heavy`, `spell-bloom-scaled-fire`, `spell-bloom-scaled-frost`,
`heal-rise`, `spell-bolt-light`, `arrow-bolt`. See `COHORT_PAIRS_4x.png` (bespoke
still left, mirrored idiom right).

## Evidence

- `STILLS_COMPOSITE_4x.png` — all eight bespoke stills @4× nearest
- `COHORT_PAIRS_4x.png` — bespoke vs mirrored idiom pairs @4×
- Archived per-still PNGs (byte-identical to `pipeline/effects/source/`)
- Pipeline: `npm run assets:effects && npm run assets:verify` — green (43 derivations,
  20 authored stills; offline rebuild PASS for all eight families)

## Byte-identical rebuild (local)

`python3 pipeline/effects/author.py` rewrite of committed source stills:

| File | SHA-256 | Match |
| --- | --- | --- |
| `aegis-wall.png` | `659bd7bb270a880a31c9c41b1dae0e8cf19e8b0402da0028e5cf0af7b1ece5b4` | identical |
| `titans-cleave.png` | `a53d1a3e3e1f2895f6ccd191499c7fc4815c0dc1cd5ef0677a1a62fb78fa5d0e` | identical |
| `comet-fall.png` | `81a4fba7754ad8e73d81f3ee1e51a6df62344a8256dc45c079758926e6bf8db5` | identical |
| `glacial-prison.png` | `770fe01bf3f4dc9ac0a3ee6b76e2413befb08d1463287005263d01bffddad963` | identical |
| `radiant-bulwark.png` | `171726e39332bbb46c7663e1889e307e92174d2fa8a6282798bdef7ed24fd1c0` | identical |
| `solar-verdict.png` | `4c6f0a7c92168f2a1e5d3580bd2d009ea1aacbb1f521df3f90a888e5230f5e6b` | identical |
| `death-rain.png` | `6cd1858d21c90ad23e2b55704ee17cb369d0523582e9fee46cd7002e5638221f` | identical |
| `killshot.png` | `086d15bfa4bc77a5d14ec15f9723c2a43d0746947698e2704013b9b4de7d5517` | identical |

`palette_glow.json` untouched; existing effect families byte-identical to `main`.
CI `assets` job is the authoritative full-catalog proof after push.

## Rejected candidates

None — single authored procedural still per talent id advanced after silhouette
review on `STILLS_COMPOSITE_4x.png`.

## Step-6 visual review

Composite: `STILLS_COMPOSITE_4x.png` (cohort context: `COHORT_PAIRS_4x.png`).

Subagent verdict: **accept**.

| still key | verdict | notes |
| --- | --- | --- |
| `aegis-wall` | accept | three overlapping shield chevrons read as interlocked barrier; distinct from circular `buff-halo` |
| `titans-cleave` | accept | wide crescent + blade stroke reads heavy downward cleave; heavier than `arc-slash` |
| `comet-fall` | accept | bright head, cream→berry tail streaking down; warm `bloom` ramp |
| `glacial-prison` | accept | pentagonal facet prism; mint `arc` body + violet `bloom` shard tips |
| `radiant-bulwark` | accept | domed barrier with cream cores; rising protective read vs column `heal-rise` |
| `solar-verdict` | accept | horizontal tapered spear; lane-travel orientation; cream `arc` ramp |
| `death-rain` | accept | three parallel arrows in tight vertical fan; volley silhouette |
| `killshot` | accept | thicker/longer broadhead than `arrow-bolt` on 30×30 canvas |

Style matches moonberry-glow binary-alpha procedural effect cohort (same palette
discipline as existing arc/bloom/bolt families).
