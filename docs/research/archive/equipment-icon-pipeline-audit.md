# Audit: SideScape's icon pipeline and Nightglass's 16×16 experiment

> **Historical.** Point-in-time record from 2026-07-19. Superseded by the shipped
> 34×34 Equipment Base workflow in [`docs/acquisition-contract.md`](../../acquisition-contract.md)
> and `src/assets/icon-sources/`. Findings here may describe a state that no longer
> exists; do not action them without re-verifying against the current tree.

Research asset for [#122](https://github.com/jsbellamy/nightglass/issues/122), a ticket on the
[#121](https://github.com/jsbellamy/nightglass/issues/121) map *Choose a reliable native-grid
workflow for Equipment Base icons*.

**Question.** Which concrete mechanisms from SideScape's source-driven 32×32-to-34×34 icon pipeline
should Nightglass adapt, and which code, tests, contracts, measurements, and rejected-candidate
evidence from `issue-58-equipment-icons` remain valid after rejecting its 16×16 AI-acquisition
premise?

**Scope note.** This is an audit, not a design. It sorts existing material into *reusable*,
*replace*, and *retain as evidence*. It does not choose the replacement workflow — that is the
map's later tickets.

---

## 1. What the two pipelines actually are

Both are "prompt an image model on a magenta field, recover a logical grid offline, quantize,
commit a deterministic runtime PNG". They diverge on one axis, and that axis is the whole finding.

| | SideScape | Nightglass `issue-58` |
| --- | --- | --- |
| Acquisition grid | 32×32 logical | 16×16 logical |
| Runtime canvas | 34×34 (32×32 drawable + 1px ring) | 16×16 |
| Committed artifact | **compact source** (1px/cell, ~34×34 PNG) | **archived raw** (~1 MB, 1024×1024 provider PNG) |
| Style conformance | at **build**, every run (`paintSourceIcon`) | at **acquisition**, once (baked into the committed runtime PNG) |
| Outline | **derived** at build as one clean ring | prompted for, recovered as cells |
| Palette re-flow | free — change ramps, rebuild, every icon re-conforms | impossible without re-acquiring |
| Variant derivation | `recolor` map over one shared source | none; every icon is its own generation |
| Failure handling | ingest **rejects** with a named reason; 8× preview is the approval target | validator rejects; no preview-before-commit stage |

The decisive structural difference is **where the committed boundary sits**. SideScape commits a
tiny, human-legible, editable source and treats house style as a build function. Nightglass `#58`
commits a giant provider blob and treats house style as a one-time acquisition outcome.

---

## 2. Mechanisms worth adapting from SideScape

Ranked by how much they buy relative to the work of porting. Note SideScape's pipeline is Node/
`pngjs`; Nightglass's is Python/Pillow (`pipeline/acquire.py`). Everything below is a *mechanism* to
re-implement in Python, not code to copy — and the map already forbids coupling the repos.

### 2.1 The committed compact source (highest value)

`docs/icon-gen.md` §"What is and isn't committed": commit
`scripts/art/icon-sources/<name>.png` — one pixel per logical cell — and git-ignore the raw
generation. This single change gives Nightglass:

- **Editability.** A 34×34 PNG is hand-fixable in any pixel editor. A 1024×1024 provider blob is
  not. This is what makes "direct deterministic authoring must remain supported" (map Notes) even
  possible — a hand-authored source and an ingested source are the *same artifact*, so the
  AI-assisted path is genuinely optional rather than load-bearing.
- **Repo weight.** `issue-58` adds ~30 MB of PNGs for 12 icons plus 28 rejected candidates. The
  compact-source equivalent is a few KB each.
- **Build-time re-flow.** Because quantization happens in `paintSourceIcon` at every `npm run art`,
  a `moonberry-16` change (or a future ramp addition) re-conforms every icon automatically.
  `issue-58` would require re-acquiring all twelve from a non-deterministic provider.

### 2.2 Two named stages with a human approval gate between them

Stage 1 (`ingest-icon.mjs`) runs **once per icon, human-approved**. Stage 2 (`paintSourceIcon`,
invoked by the build) runs **every build, deterministic**. `issue-58` has only the equivalent of
Stage 1, so its determinism claim ("byte-identical offline rebuild") is real but shallow: it proves
the *normalizer* is deterministic, not that the *style* is reproducible.

### 2.3 The preview-is-the-approval-target rule

`docs/icon-gen.md` §"Design for the compact result": ingest writes an 8× preview rendered *through
the exact Stage-2 build path*, so it is byte-for-byte what ships. The doc is emphatic that the
large generation is an intermediate and "a successful ingest is necessary but not sufficient".

This directly explains `issue-58`'s five rejection rounds (`rejected-a`…`rejected-e`): with no
preview stage, each round's only feedback was "the committed 16×16 looks wrong", discovered after
acquisition. Adopting the preview gate is likely the largest single reduction in retry cost.

### 2.4 Ingest rejects with a *named, actionable* reason

`ingest-icon.mjs` exits non-zero and writes nothing on: rendered long axis under 26px; grid too big
for the drawable area; over 12 colors; **over 15% of subject cells off-ramp**; keyed subject touching
the crop edge. Each maps to a specific corrective action documented in `icon-gen.md`.

The off-ramp gate is the interesting one for Nightglass. SideScape learned it when "a red potion
shipped brown before the `blood` ramp existed" — quantization silently recolored an entire subject
because no ramp was near its hue. **Nightglass is exposed to exactly this**: `moonberry-16` is 16
colors dominated by plum/berry/mint/cream, and `issue-58`'s validator only checks that opaque
pixels are *on* the palette (which quantization guarantees trivially) — never that they are *near*
it. A golden lantern or a steel blade would ship silently plum-shifted and pass every gate.

### 2.5 Derive family variants by `recolor`, not by re-prompting

`icons.mjs` entries share one `source` and differ by an explicit `recolor` map of named palette refs
(see the potion and herb families around `icons.mjs:335-400`). `paintSourceIcon` applies it *after*
quantize/strip/reduce/despeckle, so "geometry, outline stripping, and despeckling remain
byte-identical across the family".

This is the mechanism the map's Tier-pair Note is reaching for: *"Derive Tier II deterministically
from its Tier I family source, allowing a separate silhouette only when required for
identification."* SideScape already proves it works and states the same policy in `icon-gen.md`
§"Generate base families, not every variant". The six Nightglass Tier pairs (blade↔edge,
focus↔prism, relic↔lantern, bow↔longbow, vest↔aegis, charm↔locket) map onto it directly — reducing
twelve acquisitions to six.

### 2.6 Palette scoping per source

`SOURCE_PALETTES` in `icons.mjs` restricts which ramps a given source may quantize into, because
`quantizeGrid` picks the *globally* nearest entry — so merely adding a ramp silently recolored
unrelated shipped icons (`adamant` put a green patch on mithril-chainbody). SideScape guards this
with a regression test in the SideScape repo (`src/ui/art-ramp-isolation.test.ts`); Nightglass
has no equivalent UI test — palette scoping is enforced in the icon build pipeline instead.

**Applicability is conditional.** This matters when the palette is large and grouped into ramps.
`moonberry-16` is flat and small, so the failure mode is weaker — but it becomes relevant the moment
Nightglass adds material ramps to fix §2.4. Worth knowing about; not worth porting up front.

### 2.7 Derive the outline rather than prompting for it

`paintSourceIcon` strips the traced exterior ink (`stripExteriorInk`) and re-derives one clean warm
ink ring via `paintGrid`'s `outlineMask`. `issue-58` prompts for a "dark-plum one-cell outline" and
accepts whatever comes back — outline consistency across twelve icons then depends on the model
behaving identically twelve times, which the rejected-candidate rounds suggest it did not.

### 2.8 Retry discipline as written doctrine

`icon-gen.md` §"Design for the compact result" is a genuinely valuable artifact independent of any
code: state the compact failure explicitly in the next prompt, attach the failed compact preview as
a negative reference, exaggerate only the lost feature, carry the correction forward as the family's
new standard. Plus concrete rules — identity feature 35–45% of the icon, separate parts by **value**
not hue, structural features ≥3 logical pixels, silhouette must carry category distinction when
material and subject share a ramp.

**Caveat on grid size.** These thickness rules are stated for a 32×32 grid. At 16×16 a "≥3 logical
pixel" feature is 19% of the canvas width versus 9% — the rules do not transfer unscaled, which is
itself evidence for the map's decision to allow native 34×34.

---

## 3. What in `issue-58` survives the rejected premise

The branch is two WIP commits (`16ef319`, `76f61ae`), never merged. Sorting its 57 changed files:

### 3.1 Reusable — port forward largely as-is

- **`FrameSpec` and the spec-parameterized normalizer.** `acquire.py` was refactored from
  hard-coded `FRAME_W/FRAME_H` to a frozen dataclass carrying canvas size, pitch bounds, anchor
  (`foot` | `center`), safe inset, and palette, threaded through `recover_grid` / `normalize` /
  `validate` / `manifest`. This is a **clean, premise-independent** generalization: it is what lets
  one pipeline serve both 32×48 Character stills and any icon canvas. A 34×34 icon spec is a
  one-line change to `ICON_SPEC`. **Keep this refactor.**
- **`anchor="center"` placement.** Icons are not foot-anchored; `normalize` centers them and
  `manifest(include_baseline=False)` omits `baseline_row`. Correct at any canvas size.
- **The magenta-key + `detect_pitch` / `sample_cells` comb-fit recovery path.** Shared with the
  Character stills, already proven on main, and grid-size agnostic — `pitch_min_cells` is the only
  icon-specific knob. Nothing about it presumes 16×16.
- **Provenance sidecar shape** (`.source.json`: provider, `raw_sha256`, asset class, runtime
  destination, style references with hashes, verbatim prompt). Good discipline; survives regardless
  of grid size. Note SideScape has no equivalent and would arguably benefit from one.
- **Separate icon raw dir / runtime dir / manifest**, and the `--icons` / `--sprites` CLI split.
- **The `RAW_DIR.glob` fix in `test_contract.py`** (`p.parent == RAW_DIR`) so the Character gate
  stops walking into `icons/`.
- **Docs wiring** in `pipeline/README.md` and `docs/agents/asset-generation.md` — the pointers stay
  valid, the target document changes.

### 3.2 Replace — bound to the rejected premise

- **`docs/icon-contract.md` in full.** Its 16×16 runtime shape, centered 12×12 safe box, `inset 2`
  validator rule, and prompt shell are all premise-bound. The *document structure* (contract
  declaration table, pipeline diagram, prompt contract, normalizer steps, validator table, manifest,
  reproducibility) is a good template to refill — the numbers in it are not.
- **The 16×16 prompt shell** and every `prompt` field in the twelve `.source.json` files.
- **`ICON_SPEC`'s numbers** — `width=16, height=16, pitch_min_cells=8, safe_inset=2`. The *shape*
  is reusable (§3.1); the values are not.
- **The 12 archived raws + 28 rejected candidates as the acquisition base.** ~30 MB of 1024×1024
  provider PNGs for a contract being abandoned. Do not carry them into the replacement branch as
  build inputs (see §3.3 for their evidentiary value).
- **The whole "commit the raw, style is fixed at acquisition" boundary.** Superseded by §2.1.
- **The safe-box-breach validator rule** as the *primary* geometry gate. SideScape's inverse gate is
  more useful for icons: it rejects subjects that are too **small** (rendered long axis under 26 of
  32), because an under-filled icon is the common failure. `issue-58` gates only "too big" — it has
  no minimum-fill gate at all, so a subject occupying 6×6 of its 16×16 canvas passes every check.

### 3.3 Retain as evidence — do not rebuild, do not delete

The branch's real value is the failure record. **Keep `issue-58-equipment-icons` as an unmerged
reference branch**; do not delete it, and do not merge it.

- **The rejection ladder.** `rejected-a` (all 12) → `rejected-b` (7) → `rejected-c` (4) →
  `rejected-d` (3) → `rejected-e` (2). Read as a difficulty ranking of the twelve subjects, this is
  hard-won and directly reusable: `dewlight-focus` and `nightvine-longbow` survived all five rounds
  and are the only two in `rejected-e`. The map's Notes already select
  `dewlight-focus` → `starfruit-prism` and `bramblesong-bow` → `nightvine-longbow` as the prototype
  pairs — this audit **confirms** that choice was well-made: those are the two hardest families, so
  a workflow that clears them clears the rest.
- **The specific failure signature.** A small round orb on a sprig stand (`dewlight-focus`) and a
  long thin bow (`nightvine-longbow`) are precisely the two subjects SideScape's doctrine predicts
  will fail at low resolution: sub-3-pixel structural members and a silhouette that collapses to a
  generic blob. This is strong independent corroboration that **16×16 was the binding constraint,
  not the prompt** — five rounds of prompt iteration could not fix a resolution problem.
- **The `.source.json` prompts** as a record of what was tried and did not work — the negative
  reference `icon-gen.md` §"retrying" asks for.

---

## 4. Findings that bear on later tickets

Flagged, not decided.

1. **The `moonberry-16` off-ramp hazard (§2.4) is unguarded and is the most likely silent-failure
   mode in any replacement workflow.** `issue-58`'s "on-palette" check cannot catch it by
   construction — quantization makes it always true. Whatever workflow is chosen needs a
   *distance* gate, and possibly material ramps beyond the 16 flat colors. This may deserve its own
   ticket.
2. **34×34 vs 32×32 vs 16×16 is really two decisions, not one:** the *acquisition* grid and the
   *runtime canvas*. SideScape acquires at 32×32 and ships 34×34 because it derives a 1px outline
   ring outside the drawable area. If Nightglass keeps its prompted outline instead of deriving one,
   the +2 margin buys nothing and 32×32 is the honest number.
3. **Consumer geometry is less frozen than the map implies.** On `main` the only Equipment icon
   consumer is `renderDropIconChip` in [`armory-surface.ts:108`](../../../src/ui/armory-surface.ts) —
   an explicitly interim text chip, CSS-sized **28×28** at `styles.css:1002`, marked
   `data-interim-icon="issue-58"`. There is **no Drop-notification icon consumer at all** yet. So
   "reopen the consumer geometry" is cheaper than expected: one call site, one CSS rule, one
   integration test file (`armory-surface.test.ts`). Note 28px is neither 16 nor 34 — the chip box
   will need a decision either way.
4. **Nightglass has no equivalent of SideScape's fill lint or sheet rubric.** SideScape's
   `docs/art-style.md` carries a lint suite and contact-sheet review that the ingest gates
   presuppose. Adopting SideScape's ingest gates without some equivalent downstream review imports
   half a system.
5. **Language boundary is a real cost.** SideScape's mechanisms live in ~3,100 lines of Node across
   `icon-source.mjs`, `icon-canvas.mjs`, `icons.mjs`, `ingest-icon.mjs`, `trace-core.mjs`.
   Nightglass needs the *ideas* in Python. The genuinely load-bearing pieces are small —
   quantize / strip-exterior-ink / reduce-palette / despeckle / derive-outline-ring — but
   `icons.mjs` (1,657 lines) is mostly registry, and Nightglass's registry already exists as
   `EQUIPMENT_BASES[].iconKey`. Do not port the registry; port the converter.

---

## 5. Summary

**Adapt from SideScape:** the committed compact source; the two-stage build with a human gate; the
preview-through-the-build-path approval rule; named rejection reasons including an off-ramp distance
gate; family derivation by `recolor` over one shared source; derived rather than prompted outlines;
and the written retry doctrine (rescaled off 32×32).

**Keep from `issue-58`:** the `FrameSpec` parameterization of `acquire.py`, `anchor="center"`, the
grid-recovery path, the provenance sidecar, the separate icon raw/runtime/manifest layout, and the
docs wiring.

**Replace from `issue-58`:** `docs/icon-contract.md` wholesale, the 16×16 prompt shell and all
twelve prompts, `ICON_SPEC`'s numbers, the commit-the-raw boundary, and the safe-box-breach rule as
primary geometry gate (invert it to a minimum-fill gate).

**Retain as evidence:** the five-round rejection ladder and the twelve `.source.json` prompts, on an
unmerged `issue-58-equipment-icons` branch. It confirms 16×16 was the binding constraint and that
`dewlight-focus` and `nightvine-longbow` are the right prototype subjects.
