# Asset generation

Use this acquisition loop for every task that creates or changes a raster asset,
whether the source is generated, hand-authored, or derived. The loop produces a
reviewable asset and a reproducible path back to its source.

## Reading discipline

Read the report, not the render — see `AGENTS.md` → "Reading discipline" for
the rule and why it holds. In this loop it means:

- Steps 1-5 are answered from `ingest-report.json`, sidecars, and validator
  output.
- Step 6 is the single visual step: one composite, reviewed in a subagent that
  returns its verdict as text.
- Guardrail: no candidate PNG is opened during steps 1-5, and no step opens a
  directory of images.

## 1. Declare the asset contract

Before making an image, record:

```markdown
Asset class: <Character | opponent | Ability effect | interface | backdrop | other>
Status: <reference-only | candidate for shipping>
Runtime destination: <path or owning system>
Runtime shape: <dimensions, colour mode, alpha policy>
Visual vocabulary: <palette and art-direction source; name the Visual Theme when
  the asset belongs to a themed battlefield family — see
  [`../fowl-harvest-theme.md`](../fowl-harvest-theme.md) for Fowl Harvest>
Geometry: <facing, anchor, safe box, canvas ownership>
Review context: <native-scale surface or composition>
Validator: <command or explicit checks>
```

The declaration is complete when every field has a concrete value or an explicit
context pointer. A missing value is a decision to resolve before generation.

### Battlefield facing rule

Facing is fixed by combatant role and is not an art-direction choice:

| Combatant role | Required facing |
| --- | --- |
| Party Character (Knight, Wizard, Priest, Hunter) | **RIGHT** |
| Opponent (ordinary monster, elite, or Boss) | **LEFT** |

Use the role from the runtime destination or owning data record. Do not infer
facing from the word `Character` in an image-model prompt: providers often use
that generic word for any full-body game sprite. Write the literal required
direction into every submitted prompt; no `<FACING>` placeholder may remain.
If an issue prompt, copied shell, reference pose, or older note disagrees with
this table, this table wins. Correct the prompt before generation. A candidate
facing the wrong direction is rejected even if every dimensional and palette
gate passes; do not mirror a generated raw as a substitute for reacquisition.

### Contract pointers

- For every Party Character and Opponent body that enters the Battle Tile, read
  [`../body-sprite-contract.md`](../body-sprite-contract.md). It owns role-based
  opaque fit ceilings, per-asset `frame_size` / `visual_bounds` / `foot_anchor`,
  Cursor opaque-RGB prompts on `#ff00ff`, chroma key and stamp handling,
  proportional fit, bottom-centre anchoring, `moonberry-16`, binary alpha, the
  Archived Raw Bundle, validator gates, manifest geometry, offline byte-identical
  rebuild, and the legacy adapter promise for existing sprites. The retired
  small/medium/large tier contracts are historical pointers only — do not use
  their grid shells or fixed canvas sizes.
- For **Equipment Base icons**, read [`../icon-contract.md`](../icon-contract.md).
  It owns the 34×34 runtime, text-grid sources under `src/assets/icon-sources/`,
  palette scoping, ingest gates, `src/assets/icons/` manifest layout, and the
  deliberate divergence that icon provider raws are evidence under
  `docs/research/evidence/` rather than `assets-raw/`. Stage-2 build, 8× previews,
  and family contact sheets are produced by `pipeline/icons/` via
  `npm run assets:build`. Prompting lessons from
  [`../research/evidence/125-equipment-icons-34/`](../research/evidence/125-equipment-icons-34/)
  still apply; do **not** resume the unmerged `issue-58-equipment-icons` 16×16 premise.
- For Character presentation and Ability effects, also read
  [`../animation-contract.md`](../animation-contract.md). It owns layer separation,
  `moonberry-glow`, effect anchors, deterministic derivation, and runtime
  transforms.
- For **Stage backdrops**, read [`../backdrop-contract.md`](../backdrop-contract.md).
  It owns the 480×86 battlefield band, palette exemption from body palettes,
  deliberate large→nearest resize (the body no-resize rule does not apply),
  Archived Raw Bundle under `assets-raw/backdrops/`, deterministic complete-bundle
  discovery in `pipeline/backdrops.py`, and byte-identity verify.
- For **Fowl Harvest** opponent bodies and backdrops, read
  [`../fowl-harvest-theme.md`](../fowl-harvest-theme.md). It owns theme id
  `fowl-harvest`, body palette `fowl-harvest-24`, identity prompt kits, and
  toxic rural dusk material rules. Party Characters remain `moonberry-16`; do not
  retheme existing Moonberry sprites in acquisition prompts.
- For Moonberry visual language, use the decision and retained references from
  [Prototype the original-IP art direction](https://github.com/jsbellamy/nightglass/issues/3).
- For another asset class, the task must declare its runtime shape and validator;
  the acquisition loop still applies.

These files are the single sources of truth for their numbers and rules. This
guideline routes to them rather than restating them.

## 2. Prepare generation inputs

Give each input image one role: identity reference, pose/composition reference,
style reference, or edit target. Archive any direct input needed to reproduce an
accepted generation and record its SHA-256.

Write the prompt as a contract: subject and identity, composition, art language,
geometry, background, and acceptance constraints. For Battle Tile bodies, follow
the **Cursor source contract** in
[`../body-sprite-contract.md`](../body-sprite-contract.md): one complete
strict-side-profile subject, generous magenta clearance, chunky Moonberry
flat-colour pixel art, role-correct facing from the Battlefield facing rule
above, and **no** exact logical grid, canvas dimensions, block dimensions, or
safe-box measurements in the prompt.

For Equipment Base icons, use this **icon grid shell**
around a concrete subject noun — same discipline as the Character shell, resized
for icons. Attach Knight / Wizard / Priest stills as style references:

> TRUE chunky pixel art inventory icon ONLY. Drawn on an **exact 32×32 logical
> pixel grid rendered large**; every logical pixel is one clean flat square
> block — no smaller detail, smooth gradient, anti-aliasing, blur, or dithering.
> A single centered storybook night-garden fantasy item in three-quarter display
> angle: **\<SUBJECT\>**. Subject's long side spans about **26–30 logical
> pixels**, with at least **two** full magenta cells of clearance on every edge.
> Flat solid magenta **`#ff00ff`** background, nothing else in frame. Selective
> one-logical-pixel dark-plum outline. Use **only** mint / berry / cream / plum
> Moonberry colours (8–12 flat colors max) — **no brown, tan, cyan, pure white,
> or pure black**. Structural members at least **3 logical pixels** thick. No
> shadow, glow, sparkle, particles, text, watermark, or transparency.

Name materials that exist on `moonberry-16`. A "wooden" bow must be prompted as
mint/sage stave (or similar on-palette read); brown wood will pass chroma-key and
grid recovery, then **silently recolor** at quantize. Generate **one Tier I
family source** per silhouette; derive Tier II with a deterministic `recolor`
map rather than a second generation unless the silhouette itself must change for
identification.

This step is complete when (a) the prompt names every identity-bearing feature
and every geometric constraint, including the literal role-correct facing,
(b) Battle Tile body prompts satisfy the body contract's Cursor source rules and
contain no forbidden grid/canvas/safe-box measurements (Equipment icon prompts
contain the icon grid shell above), and (c) every direct image input has a
recorded role.

## 3. Generate and archive the raw

Generate one candidate per distinct asset. Copy the provider PNG out of the
provider dump into task-local scratch, then measure it with the owning pipeline;
for Battle Tile bodies run:

```bash
python3 pipeline/acquire.py measure --tag <knight|hunter|pipcap|boss-1|…> \
  --report <task-evidence>/candidate-report.json <candidate.png>
```

Role ceilings and facing come from the known asset identity (`layout.json` +
`ASSET_IDENTITIES`); callers cannot override them with `--tier` or custom
dimensions. Offline rebuild of archived tier raws still uses the internal
`legacy-grid-v1` adapter (see ADR-0004).

Measurement requires no provenance sidecar. It writes no asset or sidecar; when
`--report` is supplied, it saves the same JSON emitted on stdout as task
evidence. A rejected candidate remains scratch evidence and is represented
durably by its report/table row, not by a fabricated sidecar or committed PNG.

After deterministic gates and visual review both pass, promote the chosen
provider PNG byte-for-byte into the task's Archived Raw Bundle. For Battle Tile
bodies, `pipeline/acquire.py promote` performs the copy and generates a
provenance sidecar containing:

- provider and acquisition tool
- exact prompt
- raw SHA-256
- `acquisition` (`flexible` for new bodies), `identity_profile`, and
  `cursor_stamp_removed` when applicable
- direct input paths and SHA-256 values
- asset class and intended runtime destination

The accepted raw is immutable evidence. Subsequent transforms consume it and
write new files. This step is complete when recomputing the hash matches the
generated sidecar.

Reference-only exploration lives outside the shipped raw bundle and is labelled
reference-only at its storage location. Promotion to a shipping candidate starts
a fresh acquisition loop with shipping gates declared in step 1.

## 4. Measure, then retry

Run the earliest deterministic ingest or validator immediately. Use its report as
feedback for the next candidate. Provider-resolution prettiness is not a gate.
For Battle Tile bodies, use `pipeline/acquire.py measure` with the body role; do
not write an ad-hoc Python harness or measurement-only `.source.json`. Read the
measurement JSON rather than the candidate image.

### Battle Tile bodies (flexible contract)

Body `measure` reports raw gates (PNG, flat magenta border with
`KEY_TOLERANCE = 40`, stamp-pixel handling per
[`../body-sprite-contract.md`](../body-sprite-contract.md)), clipping against
the raw canvas, opaque bounds after key/crop, and fit against the role ceiling
(Party **40×68**, ordinary Opponent **30×68**, Boss **160×72**). There is no
logical-grid recovery, pitch score, safe box, or minimum dimension gate for new
body work.

| Failure | Signal | Retry move |
| --- | --- | --- |
| **Overshoot** | Opaque bounds exceed the role ceiling after crop | Preserve identity; simplify silhouette and redraw with more magenta clearance; do not add grid/canvas/safe-box numbers to the prompt. |
| **Clip-fail** | Subject touches a raw canvas edge | Preserve identity; add generous magenta clearance on the clipped side(s). |
| **Raw-gate-fail** | Border magenta, stamp cleanup, or archived-byte checks fail | Regenerate on controlled `#ff00ff`; do not re-export or resize the candidate into acceptance. |
| **Off-ramp** | Opaque colours far from `moonberry-16` after quantize (when reported) | Keep geometry fixed; retry with exact on-palette material names. |

If multiple signals fire, fix **raw-gate-fail** first unless measurable clipping
is also present; then **clip-fail**, **overshoot**, then **off-ramp**. A body
candidate advances only when every raw-level gate passes and opaque bounds fit the
role ceiling.

### Equipment icons (logical grid)

For Equipment icons, read `ingest-report.json` beside the provider raws;
each entry matches the structure `pipeline/icons/ingest.py` returns from ingest
(`recovered`, `ramp`) and carries the measurement the failure table below is keyed on:

| Failure | Report key |
| --- | --- |
| Overshoot | `recovered.grid` vs the acceptance canvas |
| Underfill | `recovered.grid` long axis vs `MIN_LONG_AXIS` |
| Pitch-fail | `recovered.pitch_x.score` / `recovered.pitch_y.score` vs `MIN_GRID_SCORE` |
| Clip-fail | `recovered.bbox` touching the raw canvas edge |
| Off-ramp | `ramp.far_fraction` / `ramp.off_ramp_reject` |

Classify each icon reject as exactly one primary failure, then retry
**prompt-side** with that class's move. Keep render resolution constant; never
resize a failed candidate into an accepted raw.

| Failure | Signal | Retry move |
| --- | --- | --- |
| **Overshoot** | Recovered grid wider/taller than the acceptance canvas | Preserve identity; shrink silhouette; restate magenta clearance on every edge. |
| **Underfill** | Recovered long axis below the icon gate (`MIN_LONG_AXIS = 20` in `pipeline/icons/constants.py`; **preference** 26–30 on a ~32-cell grid) | Regenerate larger in frame, or exaggerate the identity feature. Do not nearest-neighbour upscale a soft generation into an accepted raw. |
| **Pitch-fail** | X or Y pitch confidence below the icon contract gate | Strengthen the icon grid shell; attach an already-accepted grid-faithful raw as **style reference**; demand uniform square blocks. |
| **Clip-fail** | Subject touches a raw canvas edge | Preserve identity; add at least two magenta cells of clearance on the clipped side(s). |
| **Off-ramp** | More than ~20% of opaque subject cells are far from every `moonberry-16` swatch, or the Stage-2 preview shows a whole material plane silently recolored. Threshold: `OFF_RAMP_REJECT` in `pipeline/icons/constants.py` / `docs/icon-contract.md`. | Keep geometry fixed; retry with **exact on-palette material names** (mint/sage stave, berry vine, cream string — never "brown wood"). |

For icons, if two signals fire, fix **raw-gate-fail** first unless measurable
clipping is present; then **clip-fail**, **overshoot**, **pitch-fail**,
**off-ramp**, and **underfill** in that order.

### Autonomous candidate decisions

The implementing agent owns routine acquisition decisions. Implementation
subagents have no user-interaction channel: never emit a question or wait for
human approval to classify a measured failure or run a retry when the contract
already defines the answer.

For every candidate, record one row before generating the next:

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| `<name>` | body / icon | pass/fail | none or sides | opaque `W×H` vs ceiling, or icon grid | one class | advance/retry |

Apply this state machine:

1. **Reject and retry** when any raw gate fails, any side is clipped, or the
   measurement exceeds the owning contract gate (body: role opaque ceiling in
   [`../body-sprite-contract.md`](../body-sprite-contract.md); icon: recovered
   grid vs acceptance canvas and pitch scores).
2. Choose exactly one primary failure using the priority above. Preserve the
   subject identity and change only the prompt clauses needed by that retry move.
3. **Advance to visual review** only after every deterministic advancement gate
   passes. Visual review then judges role-correct
   facing, identity, silhouette, cohort consistency, and runtime obstructions;
   visual appeal never overrides a deterministic failure.
4. **Accept** only after deterministic validation and visual review both pass.
   Promote the chosen provider raw byte-for-byte with its complete provenance;
   record rejected candidates as table rows and remove redundant PNG copies.
5. **Stop and report blocked to the orchestrator** only when three consecutive
   candidates fail the same primary class after the prescribed retry move, two
   written requirements conflict, or multiple gate-passing candidates require a
   product-level identity choice. The report must include the candidate rows,
   exact blocking condition, attempted retry moves, and a recommended next
   choice. The orchestrator decides whether human input is necessary. Otherwise
   continue the loop autonomously.

Candidate measurement has no sidecar. Save its JSON with `--report`; this is the
validator report consumed by later agents. Promotion must generate shipping
provenance containing provider, acquisition tool, exact prompt, raw SHA-256,
direct inputs with roles and hashes, asset class, runtime destination, candidate
name, canonical identity, role, and facing. Promotion rejects prompts
without one explicit canonical subject-facing direction, or with a contradictory
direction: party Characters specify only **RIGHT** and opponents only **LEFT**.

**#125 Equipment icon trial (measured).** Brown wood reads as **off-ramp** at
17% and must be prompted as an on-palette material; grid-faithful style references
fix **pitch-fail**. Evidence:
[`../research/evidence/125-equipment-icons-34/ai-gen/`](../research/evidence/125-equipment-icons-34/ai-gen/).

For non-grid art, use the equivalent measurable failure—dimensions, crop,
contrast, alpha coverage, palette count, or layout occupancy—in the retry.

This step is complete when the accepted candidate has a saved validator report
naming opaque bounds or recovered grid (as appropriate) and every raw-level gate
result.

## 5. Build and validate

Run the asset's deterministic transform from the Archived Raw Bundle to its
runtime form. Exercise every declared gate, including provenance, dimensions,
colour mode, alpha, palette, clipping, anchors, layer separation, and manifest
fields where applicable.

Use the asset class's targeted command during generation and promotion. Never
run the repository-wide `npm run assets:verify` inside a candidate or retry
loop, and do not run it locally for an ordinary asset-only task. After the
accepted asset batch is committed and pushed, the CI `assets` job is the
authoritative full-catalog rebuild and byte-identity proof. Run the full command
locally only when the task changes pipeline code, an acquisition contract, the
palette, a manifest schema, or shared derivation logic that can affect existing
assets.

For Equipment icons, the transform is **two-stage** via `pipeline/icons/`:
`ingest.py` recovers a compact 1px/cell source (human-approved via the Stage-2 @8×
preview), then `build.py` / `paint.py` paint `moonberry-16` plus a derived outline
onto 34×34. Approve the **preview**, not the provider PNG. Family Tier II is a
`recolor` of the same compact source — rebuild both variants after any source edit.
`npm run assets:build` runs `pipeline/icons/build.py`; the CI `assets` job runs
`pipeline/icons/verify.py` with the acquisition and effects gates as part of
`npm run assets:verify`.
Read Equipment icon gate results from `pipeline/icons/verify-report.json` rather
than by re-running the script and parsing stdout or opening the built PNG.

The CI `assets` job rebuilds once more from the archived raw with the provider
absent and compares the encoded runtime file byte-for-byte with the accepted
output.

Local work is ready to push when every targeted declared gate passes. Final
verification is complete when the CI offline rebuild is byte-identical. If the
asset class has no deterministic encoder yet, the task must create one or
explicitly resolve why byte identity is outside its contract.

## 6. Review in context

Step 6 is the only step that opens a raster for judgement. Open **one** contact
sheet or native-scale composite — never a directory of candidate or runtime PNGs.
If the asset class has no sheet yet, build one (same discipline as the pipeline
outputs below) rather than opening *N* separate images.

Established composites:

- Equipment icons — `pipeline/icons/build.py` `build_contact_sheet` emits
  `src/assets/icons/family-sheet@8x.png` (all families on one sheet).
- Battle Tile body art — e.g.
  `docs/research/evidence/56-hunter-canonical/COHORT_1x.png` (style cohort at
  native 1×).
- Boss stills — e.g.
  `docs/research/evidence/57-boss-stills/LINEUP_strip_1x.png` (lineup at native
  1×).

Judge that single image in the surface where the asset ships: sprites at 1× on
the Battle Tile with representative neighbours; interface assets in their
control; backdrops behind the foreground palette.

Run the visual review in **a subagent with its own context** that returns text
only — not in the implementing agent's context. Give it:

- the one composite image path;
- the asset class's identity, silhouette, readability, and separation questions;
- the accept bar from the owning contract (step 1 pointers).

It returns an explicit **accept / retry / reject** verdict plus written answers to
those questions. The implementing agent records that text as step-6 evidence and
**does not open the image itself**. A subagent's context is discarded when it
returns, so the review image is paid for on that subagent's handful of turns
instead of on every remaining request of the asset task — the bound is structural,
not a matter of remembering to be careful.

**Human-in-the-loop review** is unchanged: a person looking at an image costs no
context and is not required to use a subagent. A HITL prototype remains open until
the human records the visual choice.

This step is complete when the task links the composite path, attaches the
subagent's text verdict (or the human's recorded choice), and records an explicit
accept/retry/reject result.

## 7. Record the acquisition

The task resolution links:

- the contract declaration
- accepted raw and provenance sidecar
- runtime output and manifest
- validator output and byte-identity proof
- native-scale review evidence
- rejected candidates recorded as a table row (candidate, primary failure class,
  recovered measurement) in the task's evidence README when their failure changes
  future prompting. The row is the durable artifact — a later task reads the row,
  never the rejected PNG. Worked example:
  [`../research/evidence/57-boss-stills/README.md`](../research/evidence/57-boss-stills/README.md)
  (**Rejected candidates** table).

Update the owning contract only when the result changes reusable behaviour.
Record task-specific measurements with the task evidence.

The asset task is complete when every listed artifact exists, every declared gate
passes, and the resolution identifies exactly which file is approved to ship.
