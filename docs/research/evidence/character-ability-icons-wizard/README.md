# Evidence: #533 Wizard Basic and Core Ability icons

Acquire and ingest five Wizard Basic/Core Ability sources as **unregistered**
source-local grids with evidence and a five-icon review sheet. Registry,
runtime PNG, manifest, and UI wiring are deferred to #534 / #535.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Ability / Loadout icon) |
| Status | candidate for shipping (sources only; unregistered) |
| Runtime destination | `src/assets/icon-sources/<key>/source.grid` (runtime PNG deferred to #534) |
| Runtime shape | Logical 32×32 drawable; Stage-2 paint yields 34×34 RGBA with derived charcoal-plum outline when registered |
| Visual vocabulary | Source-local mechanic colours (no `moonberry-16` / `fowl-harvest-24`); ≤10 flat RGBs after acquisition flatten (contract 8–12) |
| Geometry | Icon grid shell; long-side preference 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `wizard-ability-sheet@8x.png` + native `wizard-ability-sheet.png` |
| Validator | Targeted `recover_icon_grid` + source-local parse/write roundtrip; CI `assets` job for catalog (sources unregistered → no runtime rebuild for these keys yet) |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/preview/verify-ability-canary@8x.png` | style cohort (source-local canary) |
| `src/assets/icon-sources/verify-ability-canary/source.grid` | source-form reference |
| `src/assets/icons/preview/starfall@8x.png` | style cohort (Wizard peer) |
| `src/assets/icons/preview/wildfire-sigil@8x.png` | style cohort (Wizard peer) |
| `src/assets/icons/preview/leyline-attunement@8x.png` | style cohort (Wizard peer) |
| `src/assets/icons/preview/elemental-practice@8x.png` | style cohort (Wizard peer) |

## Identity / accepted candidates

| iconKey | Mechanic read | Accepted candidate | Recovered grid | Flat colours |
| --- | --- | --- | --- | --- |
| `arc-spark` | Forked lightning bolt between two conductor nodes (Basic, single-target lightning) | **r5** | 29×29 | (rework; 8–12 flats) |
| `cinder-bloom` | Fire blossom with three flame petals (all-opponents fire burst) | **r1** | 30×27 | 159→9 |
| `frost-lance` | Crystalline ice spear with faceted head (single-target frost projectile) | **r2** | 27×29 | 192→10 |
| `prism-ward` | Triangular prism with interlocking protective arcs (party ward) | **r7** | 20×22 | preference thin; gate-pass |
| `thunder-ring` | Electric ring with inward lightning teeth + center stun star (AoE lightning stun) | **r6** | 29×28 | (rework; 8–12 flats) |

Acquisition flatten: recovered cells are median-cut quantized into the contract
**8–12 flat colours** band; exterior near-outline charcoal is stripped when the
count remains in-band so Stage-2 derived outline owns the ring. Provider raws
stay byte-immutable evidence. `prism-ward` remains preference-thin (long axis 22)
after repeated enlarge retries that either underfill preference or overshoot MAX_BODY.

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| arc-spark-r1 | ability icon | pass | none | 23×23 | preference thin | enlarge |
| arc-spark-r2 | ability icon | fail | none | 30×31 | overshoot | shrink + clearance |
| arc-spark-r3 | ability icon | pass | none | 24×24 | preference thin | enlarge (superseded by r5) |
| cinder-bloom-r1 | ability icon | pass | none | 30×27 | advance | accept |
| frost-lance-r1 | ability icon | pass | none | 23×27 | preference thin | enlarge |
| frost-lance-r2 | ability icon | pass | none | 27×29 | advance | accept |
| prism-ward-r1 | ability icon | fail | none | long axis 19 | underfill | enlarge |
| prism-ward-r2 | ability icon | fail | none | 35×34 | overshoot | shrink |
| prism-ward-r3 | ability icon | fail | none | 36×36 | overshoot | shrink + peer size anchor |
| prism-ward-r4 | ability icon | pass | none | 21×20 | advance (preference thin) | accept |
| thunder-ring-r1 | ability icon | fail | none | 18×36 | overshoot | shrink + clearance |
| thunder-ring-r2 | ability icon | fail | none | 30×31 | overshoot | shrink |
| thunder-ring-r3 | ability icon | fail | none | 32×33 | overshoot | peer size anchor |
| thunder-ring-r4 | ability icon | pass | none | 19×21 | advance (preference thin) | accept |

| arc-spark-r5 | ability icon | pass | none | 29×29 | advance | accept (C2 rework) |
| prism-ward-r5 | ability icon | pass | none | 22×19 | preference thin | enlarge |
| prism-ward-r6 | ability icon | pass | none | 20×21 | preference thin | enlarge |
| prism-ward-r7 | ability icon | pass | none | 20×22 | advance (preference thin) | accept |
| thunder-ring-r5 | ability icon | pass | none | 19×20 | preference thin | enlarge |
| thunder-ring-r6 | ability icon | pass | none | 29×28 | advance | accept (C2 rework) |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| arc-spark-r1 | preference underfill (gate-pass; superseded) | 23×23 |
| arc-spark-r2 | overshoot | 30×31 |
| arc-spark-r3 | preference underfill (gate-pass; superseded by r5) | 24×24 |
| frost-lance-r1 | preference underfill (gate-pass; superseded) | 23×27 |
| prism-ward-r1 | underfill | long axis 19 |
| prism-ward-r2 | overshoot | 35×34 |
| prism-ward-r3 | overshoot | 36×36 |
| prism-ward-r4 | preference underfill (gate-pass; superseded by r7) | 21×20 |
| prism-ward-r5 | preference underfill (gate-pass; superseded by r7) | 22×19 |
| prism-ward-r6 | preference underfill (gate-pass; superseded by r7) | 20×21 |
| thunder-ring-r1 | overshoot | 18×36 |
| thunder-ring-r2 | overshoot | 30×31 |
| thunder-ring-r3 | overshoot | 32×33 |
| thunder-ring-r4 | preference underfill (gate-pass; superseded by r6) | 19×21 |
| thunder-ring-r5 | preference underfill (gate-pass; superseded by r6) | 19×20 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`wizard-ability-sheet@8x.png`](./wizard-ability-sheet@8x.png)
(left→right: arc-spark | cinder-bloom | frost-lance | prism-ward | thunder-ring).
Native companion: [`wizard-ability-sheet.png`](./wizard-ability-sheet.png).

Subagent verdict: **accept** (initial + post-C2-rework). All five match mechanic identity
(forked spark, flame blossom, ice spear, prism+arcs, electric ring+stun center), read as
Ability Loadout glyphs rather than Equipment, and are glance-distinguishable as a set.
`prism-ward` remains preference-thin vs peers (long axis 22 after enlarge retries that
oscillated between preference underfill and MAX_BODY overshoot) — not blocking. No other
blocking defects.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Per-icon Stage-2 evidence previews: [`previews/`](./previews/) (not registered runtime)
- Committed sources: `src/assets/icon-sources/{arc-spark,cinder-bloom,frost-lance,prism-ward,thunder-ring}/source.grid`
