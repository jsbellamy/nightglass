# Body Sprite Contract

Authoritative contract for every **Party Character** and **Opponent** body (ordinary
monster, elite, or Boss) that enters the Battlefield. Settled by
[#250](https://github.com/jsbellamy/nightglass/issues/250). Pipeline implementation
follows in later wave issues; this document is the single source of truth for
product rules, acquisition prompts, normalizer behaviour, manifest geometry, and
validator expectations.

Supersedes the retired size-tier acquisition contracts
([`acquisition-contract.md`](acquisition-contract.md),
[`acquisition-contract-small.md`](acquisition-contract-small.md),
[`acquisition-contract-large.md`](acquisition-contract-large.md)), which remain
as historical pointers only.

Reference implementation (when landed):
[`pipeline/acquire.py`](../pipeline/acquire.py), tests:
[`pipeline/test_contract.py`](../pipeline/test_contract.py).

## Shape of the pipeline

```
  Cursor GenerateImage (opaque RGB on #ff00ff)
      |  ACQUISITION TIME -- online, non-deterministic, never at build/runtime
      |  prompt: strict side profile, role-correct facing, generous magenta clearance
      v
  grid_raw/*.png + *.source.json          <-- Archived Raw Bundle (byte-identical copy)
      |  OFFLINE -- no provider, model, GPU, or network
      v
  ignore measurement stamp -> key -> crop -> fit ceiling -> quantize -> anchor
      v
  runtime/*.png (per-asset RGBA) + manifest.json (per-asset geometry)
```

The boundary is the archived raw bundle. The provider PNG is copied there
byte-for-byte and its SHA-256 is frozen in the adjacent provenance sidecar.
Everything below that boundary is provider-neutral and reproducible.

Local ComfyUI is reference-only per #22. Its output may inform look exploration
but may not enter `grid_raw/` or any shipped asset.

## Runtime geometry

Each manifest entry owns **per-asset** geometry. Example:

```json
{
  "frame_size": [40, 61],
  "visual_bounds": [0, 0, 40, 61],
  "foot_anchor": [20, 61]
}
```

| Field | Meaning |
| --- | --- |
| `frame_size` | `[width, height]` of the runtime canvas in logical pixels |
| `visual_bounds` | Half-open `[left, top, right, bottom)` over **opaque** runtime pixels |
| `foot_anchor` | Bottom-centre logical point `[frame_width / 2, frame_height]` |

Rules:

- Fit is measured from opaque `visual_bounds`, never from transparent frame padding.
- Runtime bodies render at native **1×**. They are **never** dynamically scaled per
  encounter. Integer display scale for the whole UI is allowed; per-body runtime
  rescaling is forbidden.
- Body PNG facing is authoritative: **Party Characters face RIGHT**; **ordinary
  Opponents and Bosses face LEFT**. The renderer does **not** mirror bodies.

There is **no** minimum width, minimum height, target fill, size tier, or
target-height range. A short, squat, tall, or wide subject is valid when its
actual opaque bounds fit its role composition (see hard ceilings below).

## Hard fit ceilings (spec)

These maxima are **spec**, not tuning. Opaque bounds are the width and height of
`visual_bounds` after normalization.

| Battlefield role | Maximum opaque bounds | Why |
| --- | ---: | --- |
| Party Character | 40×68 | 44px Formation pitch leaves 4px horizontal clearance and reserves vertical presentation space |
| ordinary Opponent | 30×68 | 34px five-Opponent pitch leaves 4px horizontal clearance |
| Boss | 160×72 | centred solo Boss remains on the Opponent half and below the Boss-bar band |

Exceeding a role ceiling fails acquisition. There is no prompt safe-box dimension
requirement in this contract — only these ceilings and composition fit.

## Cursor source contract

Cursor **GenerateImage** produces **opaque RGB** PNGs. Do not require or claim
source alpha; transparent-source support is **outside** this wave.

Prompts require:

- one complete, strict-side-profile subject;
- generous clearance on opaque flat **`#ff00ff`**;
- chunky simplified flat-colour Moonberry pixel-art styling;
- role-correct facing (RIGHT party, LEFT opponents including Bosses);
- no effects, shadows, scenery, text, or watermark.

Prompts must **not** contain an exact logical grid, final canvas dimensions,
rendered block dimensions, or safe-box measurements.

Before chroma-key measurement, normalization **ignores exactly** the raw pixel
`(0, height - 1)` — Cursor's deterministic lower-left stamp. The ingest report
and provenance record whether that pixel required cleanup. Every other source
pixel uses **`KEY_TOLERANCE = 40`**; do not widen the border tolerance.

## Chroma-key alpha

Fixed `#ff00ff` chroma key. `moonberry-16` contains no hot magenta, so the key
is disjoint from valid body pigment. The raw must have a controlled magenta
background and nothing else in frame.

At least 95% of the two-pixel border must be within 40 of `#ff00ff` in every RGB
channel (except the single ignored stamp pixel above). Pixels within that
tolerance are background. Runtime alpha is **binary** only: 0 or 255 after
binarization at 128.

## Deterministic runtime path

The normalizer performs, in order:

1. **Preserve archived raw bytes** — verify PNG and matching archived SHA-256.
2. **Ignore the measurement-only Cursor stamp** at `(0, height - 1)` before key
   measurement; record cleanup in report/provenance.
3. **Key background** at `KEY_TOLERANCE = 40` everywhere else.
4. **Crop** to subject opaque bounds.
5. **Proportionally reduce** to the role ceiling if opaque bounds exceed it.
6. **Quantize** to [`pipeline/palette.json`](../pipeline/palette.json)
   (`moonberry-16`) **without dithering**.
7. **Binarize alpha**.
8. **Bottom-centre** on a per-asset canvas; record `frame_size`, `visual_bounds`,
   and `foot_anchor` in the manifest.
9. Run the **validator** (dimensions, binary alpha, palette, embedded effects,
   clipping against the raw, stable baseline where sequences apply).

**Embedded effects** in body frames remain forbidden: opaque colours must be on
`moonberry-16` only; Ability effects stay separate assets.

## Legacy migration

Existing non-proof sprites remain visually and byte-identically unchanged through
an explicitly named **legacy rebuild adapter** in the pipeline until a later
asset-production wave reacquires them under this contract. New acquisitions follow
the flexible path above.

## Reproducibility

With no provider client, model, GPU library, socket, or network imported, the
offline build must rebuild every committed runtime body PNG **byte-for-byte** from
its archived raw and provenance. CI's `assets` job is the authoritative
full-catalog proof (`npm run assets:verify`).

Accepted prompts and raw hashes live beside raws in
[`assets-raw/grid_raw/`](../assets-raw/grid_raw/).

## Known limits

- Wrong-facing candidates are rejected; do not mirror the raw to repair them.
- The key tolerance assumes hot magenta never enters a Character palette. If
  `moonberry-16` ever gains a nearby colour, the alpha route must be re-decided.
- The embedded-effects rule remains a palette check. It catches the disjoint
  `moonberry-glow` ramp but cannot identify an effect drawn entirely in
  `moonberry-16`.
