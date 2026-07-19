# Asset generation

Use this acquisition loop for every task that creates or changes a raster asset,
whether the source is generated, hand-authored, or derived. The loop produces a
reviewable asset and a reproducible path back to its source.

## 1. Declare the asset contract

Before making an image, record:

```markdown
Asset class: <Character | opponent | Ability effect | interface | backdrop | other>
Status: <reference-only | candidate for shipping>
Runtime destination: <path or owning system>
Runtime shape: <dimensions, colour mode, alpha policy>
Visual vocabulary: <palette and art-direction source>
Geometry: <facing, anchor, safe box, canvas ownership>
Review context: <native-scale surface or composition>
Validator: <command or explicit checks>
```

The declaration is complete when every field has a concrete value or an explicit
context pointer. A missing value is a decision to resolve before generation.

### Contract pointers

- For Characters and opponents that enter the Battle Tile, read
  [`../acquisition-contract.md`](../acquisition-contract.md). It owns the logical
  grid, conservative prompt safe box, magenta key, Archived Raw Bundle,
  bottom-center anchor, `moonberry-16`, validator, manifest, and offline rebuild.
- For Character presentation and Ability effects, also read
  [`../animation-contract.md`](../animation-contract.md). It owns layer separation,
  `moonberry-glow`, effect anchors, deterministic derivation, and runtime
  transforms.
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
geometry, background, and acceptance constraints. For Battle Tile bodies, paste
the acquisition contract's **grid shell** (exact logical canvas, flat-block
pixels, conservative **safe box**, magenta clearance, outline/palette bans)
around the subject description — do not paraphrase the shell into softer art
direction. Request the safe box; never ask the subject to fill the runtime
canvas.

This step is complete when (a) the prompt names every identity-bearing feature
and every geometric constraint, (b) Battle Tile body prompts contain the
contract grid shell verbatim or by an explicit quote of its clauses, and
(c) every direct image input has a recorded role.

## 3. Generate and archive the raw

Generate one candidate per distinct asset. Copy the provider PNG byte-for-byte
into the task's Archived Raw Bundle, then add a provenance sidecar containing:

- provider and acquisition tool
- exact prompt
- raw SHA-256
- direct input paths and SHA-256 values
- asset class and intended runtime destination

The raw is immutable evidence. Subsequent transforms consume it and write new
files. This step is complete when recomputing the hash matches the sidecar.

Reference-only exploration lives outside the shipped raw bundle and is labelled
reference-only at its storage location. Promotion to a shipping candidate starts
a fresh acquisition loop with shipping gates declared in step 1.

## 4. Measure, then retry

Run the earliest deterministic ingest or validator immediately. Use its report as
feedback for the next candidate. Provider-resolution prettiness is not a gate.

For logical-grid art, record recovered width, height, X/Y pitch, pitch
confidence, and whether the subject touches a raw canvas edge. Classify each
reject as exactly one primary failure, then retry **prompt-side** with that
class's move. Keep render resolution constant; never resize a failed candidate
into an accepted raw.

| Failure | Signal | Retry move |
| --- | --- | --- |
| **Overshoot** | Recovered grid wider/taller than the acceptance canvas, or above the declared safe box | Preserve identity; shrink silhouette into the safe box; restate magenta clearance on every edge. Template: *"The previous candidate recovered as `<W>×<H>`. Preserve its identity and pose, simplify its detail, and redraw the complete silhouette inside the contract's safe box with clearance on every edge."* |
| **Pitch-fail** | X or Y pitch confidence below the acquisition contract gate (soft/anti-aliased blocks, uneven cell size) | Strengthen the grid shell; attach an already-accepted grid-faithful raw as **style reference**; demand uniform square blocks and aligned seams. Do not only ask for "chunkier" art. |
| **Clip-fail** | Subject touches a raw canvas edge (clipping gate) | Preserve identity; add at least two magenta cells of clearance on the clipped side(s); keep the safe box. |

If two signals fire, fix **clip-fail** first, then **overshoot**, then
**pitch-fail**. A candidate advances only when its recovered grid fits and every
raw-level gate passes.

For non-grid art, use the equivalent measurable failure—dimensions, crop,
contrast, alpha coverage, palette count, or layout occupancy—in the retry.

This step is complete when the accepted candidate has a saved validator report
naming recovered grid (or equivalent) and every raw-level gate result.

## 5. Build and validate

Run the asset's deterministic transform from the Archived Raw Bundle to its
runtime form. Exercise every declared gate, including provenance, dimensions,
colour mode, alpha, palette, clipping, anchors, layer separation, and manifest
fields where applicable.

Rebuild once more from the archived raw with the provider absent. Compare the
encoded runtime file byte-for-byte with the accepted output.

This step is complete when every declared gate passes and the offline rebuild is
byte-identical. If the asset class has no deterministic encoder yet, the task
must create one or explicitly resolve why byte identity is outside its contract.

## 6. Review in context

Review the runtime asset at native scale in the surface where it ships. A sprite
is judged at 1× in the Battle Tile, with representative neighbouring bodies and
effects; an interface asset is judged in its actual control; a backdrop is judged
behind the foreground palette.

Record the review image and answer the asset-specific identity, silhouette,
readability, and separation questions. A HITL prototype remains open until the
human records the visual choice.

This step is complete when the task links the native-scale evidence and records
an explicit accept/retry/reject result.

## 7. Record the acquisition

The task resolution links:

- the contract declaration
- accepted raw and provenance sidecar
- runtime output and manifest
- validator output and byte-identity proof
- native-scale review evidence
- rejected candidates when their failure changes future prompting

Update the owning contract only when the result changes reusable behaviour.
Record task-specific measurements with the task evidence.

The asset task is complete when every listed artifact exists, every declared gate
passes, and the resolution identifies exactly which file is approved to ship.
