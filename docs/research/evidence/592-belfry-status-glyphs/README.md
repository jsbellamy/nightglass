# #592 — Corroded, Tolling, Timeslip status glyphs

Procedural 7×7 status glyphs authored as point sets in
`pipeline/effects/author.py` (no provider generation). Color is
`glow-mint-bright` from `moonberry-glow`; distinction is silhouette-only.
Companion to the Unwound Belfry opponent data slice (#592).

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Status Effect glyph) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/effects/status/{corroded,tolling,timeslip}.png` |
| Runtime shape | 7×7 RGBA, binary alpha, glow-only opaque pixels |
| Visual vocabulary | `moonberry-glow` via `pipeline/effects/palette_glow.json` |
| Geometry | point-set silhouettes; no facing |
| Review context | `layout.txt` + native 1× inspection of committed PNGs |
| Validator | `python3 pipeline/effects/verify.py` gate 4 + determinism rebuild |

## Reads

| Id | Silhouette |
| --- | --- |
| `corroded` | scattered pit corrosion |
| `tolling` | small bell mouth |
| `timeslip` | bent clock hand |

## Style cohort

Existing procedural status glyphs (moonberry-glow binary-alpha): full sixteen-glyph
cohort under `src/assets/effects/status/`; new entries must remain frozenset-distinct
from all prior silhouettes.

## Evidence

- `layout.txt` — glyph index and point counts
- Pipeline: `python3 pipeline/effects/verify.py` — determinism PASS (102 files
  rebuilt byte-identically) and status gate PASS (16 glyphs, 7×7, glow-only,
  binary-alpha, shape-distinct frozensets)

## Byte-identical rebuild (local)

`python3 pipeline/effects/author.py` rewrite of the three committed PNGs:

| File | SHA-256 | Match |
| --- | --- | --- |
| `corroded.png` | `9a9b22283081ca518d35845edd5fdecd0af1b83cfb8908d8c11c744d88d7976c` | identical |
| `tolling.png` | `87d10abbc88ff53b75b28065857ab0c20ccdba4ba4b5d2768d3804c7efa9dad3` | identical |
| `timeslip.png` | `8edf333d1dc5fc13955ae2eb9bbd976149cf27b8bf6beebe960e092238724a29` | identical |

Full pipeline: `python3 pipeline/effects/verify.py` — determinism PASS (102 files
rebuilt byte-identically) and status PASS (16 glyphs). CI `assets` job remains the
authoritative full-catalog proof after push.

## Rejected candidates

None — single authored point set per id advanced after uniqueness check against
the thirteen existing frozensets.

## Step-6 visual review

Subagent verdict: **accept**.

- Corroded / tolling / timeslip match their intended reads at native 1× and are
  practically distinct from each other and the rest of the cohort.
- Style matches moonberry-glow binary-alpha status glyphs (same palette and pixel
  discipline as #389 / #467).
