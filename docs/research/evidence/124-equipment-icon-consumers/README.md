# Equipment icon consumer review artifact

Scenario key: `evidence: equipment-icon-chrome-legibility`.

Emitted by the rendered-evidence harness (`npm run test:evidence`) as
`character-equipment-rows.png` — a real Chromium capture of the Character
Equipment section after Armory's slot strip was deleted (#271). No chrome-tier
(16×16) consumer remains in the Dock; this slug is carried by the Character
Equipment content-tier (34×34) rows with an explicit tier change noted in
`docs/agents/acceptance-evidence.md` and the #271 PR body.

## Judgement (nightglass#132, retargeted by #271)

**Legible — discharged at Character Equipment.** The original chrome-tier
downscale judgement against the Armory slot strip no longer has a Dock
consumer. Character Equipment rows keep identity readable at content tier
beside Weapon / Armor / Charm labels across all four Class Kits.

## Note on the PNG

This file must match the harness frame written during
`evidence: equipment-icon-content-tier / evidence: equipment-icon-chrome-legibility`
in `e2e/rendered-evidence.spec.ts`, not an ad-hoc manual capture.
