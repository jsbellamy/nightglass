# Equipment icon consumer review artifact

Scenario key: `evidence: equipment-icon-chrome-legibility`.

Emitted by the rendered-evidence harness (`npm run test:evidence`) as
`armory-slot-strip.png` — a real Chromium capture of the Armory slot strip with
all sixteen equipped slots showing 16×16 chrome-tier icons beside their slot
labels.

## Judgement (nightglass#132)

**Legible — discharged.** The chrome-tier downscale from the 34×34 content-tier
pipeline remains readable beside each slot label (Weapon / Armor / Charm) across
all four Class Kits. Identity is carried by the 34×34 card and drop-toast
consumers; the slot icon is an affordance hint only, matching the two-tier
contract in #124.

## Note on the PNG

This file must match the harness frame written during
`evidence: equipment-icon-content-tier / evidence: equipment-icon-chrome-legibility`
in `e2e/rendered-evidence.spec.ts`, not an ad-hoc manual capture.
