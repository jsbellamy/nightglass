# Equipment icon consumer review artifact

Scenario key: `evidence: equipment-icon-chrome-legibility`.

Emitted by the rendered-evidence harness (`npm run test:evidence`) as
`armory-worn-strip.png` — a real Chromium capture of the Armory worn loadout
strip after Character Equipment was removed (#300). No chrome-tier (16×16)
consumer remains in the Dock; this slug is carried by the worn-strip
content-tier (34×34) slot icons with an explicit tier change noted in
`docs/agents/acceptance-evidence.md` and the #300 PR body.

## Judgement (nightglass#132, retargeted by #271, then #300)

**Legible — discharged at Armory worn strip.** The original chrome-tier
downscale judgement against the Armory slot strip no longer has a Dock
consumer. The worn loadout strip keeps identity readable at content tier
beside Weapon / Armor / Charm labels across all four Class Kits.

## Note on the PNG

This file must match the harness frame written during
`evidence: equipment-icon-content-tier / evidence: equipment-icon-chrome-legibility`
in `e2e/rendered-evidence.spec.ts`, not an ad-hoc manual capture.

The prior `character-equipment-rows.png` artifact is superseded; leave the
old file untracked/removed once the harness regenerates `armory-worn-strip.png`.
