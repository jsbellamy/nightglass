# Evidence: #4 presentation / animation contract prototype

Linked from [Define the animation asset contract](https://github.com/jsbellamy/nightglass/issues/4).
Settled contract: [`docs/animation-contract.md`](../../../animation-contract.md).
Runtime constants: `src/ui/presentation.ts`.

## Verdict

The **actor pool** (feet-glow ellipse on the mark layer) is the attribution
channel in both motion and reduced-motion arms. A tuned lunge alone was too
subtle at 1×; a 1 px actor bar read as HUD chrome. The pool ties attribution
without subtracting the accessibility arm.

`verify.py` passed all seven gates before the throwaway prototype was removed
in #714:

| Gate | Result |
| --- | --- |
| body-free | PASS — canonical sprites unchanged across composites |
| on-palette | PASS — flash and downed introduce 0 off-palette colours |
| disjoint | PASS — pool uses `moonberry-glow`, not `moonberry-16` |
| deterministic | PASS — tile renders byte-identical, Pillow only |
| anchor-stable | PASS — every transform returns to (0,0) |
| cue-aligned | PASS — lunge hold matches manifest `impact_expected` |
| 30fps-legible | PASS — 2 frames at full extension at worst phase |

## Review sheets

| File | Shows |
| --- | --- |
| [`CHANNEL_1x.png`](./CHANNEL_1x.png) | **the decision** — lunge vs bar vs pool at 1× |
| [`ARM_full.gif`](./ARM_full.gif) / [`ARM_reduced.gif`](./ARM_reduced.gif) / [`ARM_none.gif`](./ARM_none.gif) | the three arms at 30 fps |
| [`RETUNE_FLASH_1x.png`](./RETUNE_FLASH_1x.png) | flash strength sweep 1.0 → 0.2 |
| [`RETUNE_LUNGE_1x.png`](./RETUNE_LUNGE_1x.png) | lunge amplitude sweep with flash damped |
| [`HEAL_6x.png`](./HEAL_6x.png) | `band`-revealed heal on `strike_target` |
| [`ATTRIBUTION_1x.png`](./ATTRIBUTION_1x.png) / [`REDUCED_1x.png`](./REDUCED_1x.png) / [`CONTROL_1x.png`](./CONTROL_1x.png) | arms as filmstrips |
