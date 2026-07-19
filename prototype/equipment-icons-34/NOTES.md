# Prototype: two native 34×34 Equipment icon families

**Ticket:** [Prototype two native 34×34 Equipment icon families](https://github.com/jsbellamy/nightglass/issues/125)
**Map:** [Choose a reliable native-grid workflow for Equipment Base icons](https://github.com/jsbellamy/nightglass/issues/121)

## Question

Can a Nightglass-owned adaptation of SideScape's hybrid source-driven workflow produce readable, family-related native 34×34 Equipment Base icons for both a dense-detail family (`dewlight-focus` → `starfruit-prism`) and an open-silhouette family (`bramblesong-bow` → `nightvine-longbow`), with committed native-grid sources, byte-stable deterministic rebuilds, Moonberry conformance, and acceptable presentation in the real Armory?

## What this prototype is

Throwaway proof of the **workflow shape**, not the final twelve-icon set:

1. **Committed compact sources** under `sources/` (1px/cell, hand-authored — the direct deterministic path the map requires to remain supported).
2. **Stage-2 build** (`paint.py`) that quantizes to `moonberry-16`, strips exterior ink, applies family `recolor`, derives one `contour-plum-deepest` outline ring, and centers on a **34×34** canvas.
3. **Family derivation** — Tier II icons share the Tier I source + a recolor map (no second silhouette).
4. **Byte-stable rebuild** — `build.py` runs Stage-2 twice and writes `out/rebuild-evidence.json`.
5. **Real Armory presentation** — gated by `?prototype=equipment-icons-34` (native 34×34 chips, no CSS upscale).
6. **Optional AI ingest** — `inbox/` → `ingest.py` → `ai-sources/` + `out/ai/`; measured reject ladder in
   [`docs/research/evidence/125-equipment-icons-34/ai-gen/`](../../docs/research/evidence/125-equipment-icons-34/ai-gen/).
   Lessons folded into [`docs/agents/asset-generation.md`](../../docs/agents/asset-generation.md).

## One command

```bash
npm run prototype:equipment-icons-34
# or: python3 prototype/equipment-icons-34/build.py

# Optional AI path (raws already in inbox/):
npm run prototype:equipment-icons-34:ingest
```

## Review in the real Armory

```bash
npm run prototype:equipment-icons-34:ingest   # serves AI Stage-2 into public/
npm run dev
# open: http://localhost:1420/?window=dock&prototype=equipment-icons-34
```

Also inspect `out/family-sheet@8x.png` (hand) and `out/ai/preview/*@8x.png` (AI).

## Assets

| Path | Role |
| --- | --- |
| `sources/*.png` | Hand-authored compact family sources |
| `inbox/*.png` | AI archived raws |
| `ai-sources/*.png` | Compact sources recovered from AI |
| `out/<iconKey>.png` | Hand Stage-2 34×34 |
| `out/ai/<iconKey>.png` | AI Stage-2 34×34 |
| `out/rebuild-evidence.json` | Determinism proof (hand) |
| `out/ai/ingest-report.json` | Recovered grid + off-ramp stats |

## Verdict

Human verdict (2026-07-19): **looks good** — workflow cleared.

- Dense family (`dewlight-focus` → `starfruit-prism`): **accept**
- Open family (`bramblesong-bow` → `nightvine-longbow`): **accept**
- Family relation via recolor alone: **accept**
- Native 34×34 Armory presentation: **accept**
- AI ingest path usable with the documented retry loop?: **accept** (with off-ramp / overshoot / underfill discipline in `asset-generation.md`)
- Workflow cleared for contract/geometry tickets?: **yes**

Notes: Hand-authored and AI Stage-2 paths both reviewed; AI reject ladder (overshoot, brown-wood off-ramp) is retained as prompting evidence.
