# Evidence: #531 Knight Basic / Core Ability icons

Unregistered Ability (Loadout) sources for Knight Basic Attack and Core
Abilities. Source-local colour mode; no central registry, Content, runtime PNG,
manifest, or UI edits in this slice.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Ability Loadout icon) |
| Status | candidate for shipping (unregistered until #534) |
| Runtime destination | none in this slice; later `src/assets/icons/<iconKey>.png` via #534/#535 |
| Runtime shape | 34×34 RGBA transparent after paint; derived common outline `58,6,20` |
| Visual vocabulary | source-local mechanic colours (not `moonberry-16` / `fowl-harvest-24`) |
| Geometry | 32×32 logical grid shell; long-side preference 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `knight-ability-sheet@8x.png` and `knight-ability-sheet.png` (native 34×) |
| Validator | targeted source-local ingest + paint; CI `assets` job for full-catalog byte-identity once registered |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/preview/verify-ability-canary@8x.png` | style reference (source-local Ability canary) |
| `src/assets/icon-sources/verify-ability-canary/source.grid` | style cohort |
| `src/assets/icons/preview/hold-the-line@8x.png` | style reference (chunky peer) |
| `src/assets/icons/preview/vanguard@8x.png` | style reference |
| `src/assets/icons/preview/sundering-charge@8x.png` | style reference |
| `src/assets/icons/preview/iron-discipline@8x.png` | style reference |

## Accepted identities

| iconKey | Identity read | Accepted candidate | Recovered grid |
| --- | --- | --- | --- |
| `steel-cut` | Diagonal steel sword cut with notch accent | **r2** | 25×23 |
| `sweeping-arc` | Broad crescent sword sweep over target ticks | **r2** | 25×28 |
| `shield-brace` | Planted kite with brace bar and ground stops | **r4** | 18×21 |
| `rallying-guard` | Three small shields behind gold banner emblem | **r1** | 25×22 |
| `pommel-break` | Pommel striking cracked helm with compact stun spark | **r5** | 20×17 |

Provider soft sampling produced 141–249 unique cell RGBs per raw. Ingest wrote
source-local legends after a deterministic flat collapse (merge distance 28,
cap 12 colours) so legends stay printable and match the Ability “flat 8–12
colours” prompt contract. Collapse parameters and before/after counts are in
each sidecar and `ingest-report.json`.

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| steel-cut-r1 | ability icon | fail | none | overshoot 32×32 | overshoot | shrink + clearance |
| steel-cut-r2 | ability icon | pass | none | 25×23 | pass | accept |
| sweeping-arc-r1 | ability icon | pass | none | 20×21 | pass (preference thin) | prefer larger |
| sweeping-arc-r2 | ability icon | pass | none | 25×28 | pass | accept |
| shield-brace-r1 | ability icon | fail | none | long axis 18 | underfill | enlarge |
| shield-brace-r2 | ability icon | fail | none | 22×31 | overshoot | mid-size |
| shield-brace-r3 | ability icon | fail | none | 12×36 | overshoot / pitch | squat + style ref |
| shield-brace-r4 | ability icon | pass | none | 18×21 | pass | accept |
| rallying-guard-r1 | ability icon | pass | none | 25×22 | pass | accept |
| pommel-break-r1 | ability icon | fail | none | 33×34 | overshoot | shrink |
| pommel-break-r2 | ability icon | fail | none | 30×32 | overshoot | shrink |
| pommel-break-r3 | ability icon | fail | none | 27×32 | overshoot | shrink |
| pommel-break-r4 | ability icon | fail | none | 30×35 | overshoot | tiny glyph |
| pommel-break-r5 | ability icon | pass | none | 20×17 | pass | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| steel-cut-r1 | overshoot | 32×32 |
| sweeping-arc-r1 | preference thin (gate-pass) | 20×21; superseded by r2 |
| shield-brace-r1 | underfill | long axis 18 |
| shield-brace-r2 | overshoot | 22×31 |
| shield-brace-r3 | overshoot | 12×36 |
| pommel-break-r1 | overshoot | 33×34 |
| pommel-break-r2 | overshoot | 30×32 |
| pommel-break-r3 | overshoot | 27×32 |
| pommel-break-r4 | overshoot | 30×35 |

Rejected provider raws were pruned from scratch; the table is the durable
record. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`knight-ability-sheet@8x.png`](./knight-ability-sheet@8x.png)
(left→right: steel-cut | sweeping-arc | shield-brace | rallying-guard |
pommel-break). Native strip: [`knight-ability-sheet.png`](./knight-ability-sheet.png).

Subagent verdict: **accept**. All five match identity at a glance and are
distinguishable (slash / arc+AoE / planted shield / multi-shield+banner /
pommel-stun). Coherent chunky-pixel style with source-local steel/blue/gold/red
mechanic colours — not Moonberry/Fowl materials. No blocking defects. Preference
notes only: sweeping-arc blade smaller than the arc; rallying-guard rear shields
close in value to the banner; steel-cut notch is a small accent at sheet scale.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Five-icon review sheets: `knight-ability-sheet@8x.png`, `knight-ability-sheet.png`
- Per-icon @8× / native paint copies: [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{steel-cut,sweeping-arc,shield-brace,rallying-guard,pommel-break}/source.grid`
