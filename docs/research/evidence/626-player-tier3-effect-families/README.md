# 626 — player Tier-3 bespoke effect families

Eight bespoke `moonberry-glow` source stills and derivation specs for Tier-3
class-kit talents. Recipes still point at generic families until the recipe
slice repoints them.

## Visual verdicts (C5)

Per-still read from issue #626 C1; verdict against archived source still in
this directory.

| still key | intended read | verdict |
| --- | --- | --- |
| `aegis-wall` | curved wall of overlapping interlocked shields; mint/cream `arc` ramp, buff read | **accept** — three overlapping shield chevrons read as an interlocked barrier; mint/cream arc ramp, brighter cores |
| `titans-cleave` | enormous greatsword mid downward cleave, wide heavy arc; cream/mint `arc` ramp | **accept** — wide crescent arc plus blade stroke reads as a heavy downward cleave; cream core on mint arc |
| `comet-fall` | warm cream-and-berry comet with short tapering tail streaking down; `bloom` ramp warm | **accept** — bright head with cream→berry tapering tail streaking down-left; warm bloom ramp |
| `glacial-prison` | faceted mint ice-crystal prism, angular shards from cold core; `arc` mint + `bloom` violet accents | **accept** — pentagonal facet layout with mint arc body and violet bloom accents at shard tips |
| `radiant-bulwark` | domed cream-gold light barrier arcing protectively upward; cream/mint `arc` ramp, rising read | **accept** — domed barrier silhouette with cream cores along the arc; reads as protective uplift |
| `solar-verdict` | tapered cream-gold spear of light — lane-travel projectile; cream `arc` ramp | **accept** — horizontal spear silhouette with tapered tip; cream arc ramp, lane-travel read |
| `death-rain` | tight fan of three parallel descending arrows — lane-travel volley; mint `arc` ramp | **accept** — three parallel mint arrows in a tight vertical fan; volley silhouette |
| `killshot` | single heavy broadhead arrow, longer/thicker than base `arrow-bolt`; mint/cream `arc` ramp | **accept** — thicker shaft and broadhead vs `arrow-bolt`; longer horizontal span on 30×30 |

## Build evidence

- `npm run assets:effects && npm run assets:verify` — green on branch `issue-626-player-tier3-effect-families`
- `palette_glow.json` untouched; existing families byte-identical (I1)
- No `effectRecipes` / `src/data` edits (I2)
