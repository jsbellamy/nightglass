# #389 — Scalded, Shaken, Scorched, Overdrive status glyphs

Procedural 7×7 status glyphs authored as point sets in
`pipeline/effects/author.py` (no provider generation). Color is
`glow-mint-bright` from `moonberry-glow`; distinction is silhouette-only.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Status Effect glyph) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/effects/status/{scalded,shaken,scorched,overdrive}.png` |
| Runtime shape | 7×7 RGBA, binary alpha, glow-only opaque pixels |
| Visual vocabulary | `moonberry-glow` via `pipeline/effects/palette_glow.json` |
| Geometry | point-set silhouettes; no facing |
| Review context | `STATUS_SHEET_8x.png` + `NEW_FOUR_1x.png` |
| Validator | `python3 pipeline/effects/verify.py` gate 4 + determinism rebuild |

## Reads

| Id | Silhouette |
| --- | --- |
| `scalded` | rising steam/wave wisps |
| `shaken` | broken opposing chevrons |
| `scorched` | compact flame/char mark |
| `overdrive` | three forward turbine bars |

## Evidence

- `layout.txt` — sheet index map
- `STATUS_SHEET_8x.png` — all twelve glyphs @8× nearest
- `NEW_FOUR_1x.png` — the four new glyphs at native 1×
- Pipeline: `python3 pipeline/effects/verify.py` — determinism PASS (byte-identical
  rebuild of committed effect/status files) and status gate PASS (12 glyphs,
  7×7, glow-only, binary-alpha, shape-distinct frozensets)

## Byte-identical rebuild (local)

`python3 pipeline/effects/author.py` rewrite of the four committed PNGs:

| File | SHA-256 | Match |
| --- | --- | --- |
| `scalded.png` | `45c2e6afd4cba83b9f1ddc708b14d88f6aa4d525b5f43e57fc8b9158b22a889b` | identical |
| `shaken.png` | `a567e6d2b73b6fd96499250558cb169c83e2b653fe67786f2714e2b90b5f1f84` | identical |
| `scorched.png` | `099dfc6131abd5f04a2658983561e1f7aacd8acf7a07c40021bcc4bea6b73cc1` | identical |
| `overdrive.png` | `37eb6de5cfa52fe12aaa6fcde592eba8f8779eff7179bde66907b3e9a5dd412f` | identical |

Full pipeline: `python3 pipeline/effects/verify.py` — determinism PASS (98 files
rebuilt byte-identically) and status PASS (12 glyphs). Repository-wide
`npm run assets:verify` PASS locally (pipeline verify change). CI `assets` job
remains the authoritative full-catalog proof after push.

Step-6 subagent verdict for this slice: **accept**.

- Scalded / shaken / scorched / overdrive match their intended reads at native 1×
  and are practically distinct from each other and the rest of the cohort.
- Braced/Warded 1px diamond adjacency is pre-existing from #43 (frozenset-distinct;
  out of scope here).
