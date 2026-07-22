# Evidence: #399 Red Beacon Token and Black-Oil Locket icons

Acquire, ingest, and visually approve two distinct universal Charm Equipment
icons as isolated, unregistered `fowl-harvest-24` source families. Tier IV is an
independent silhouette, never a recolor of Tier III.

Behavior-neutral interim: no runtime PNG, icon registry/manifest entry,
EquipmentBaseDef, or Armory mapping. Activation is a later integration slice
(#412).

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Equipment Base icon) |
| Status | candidate for shipping (unregistered interim) |
| Runtime destination | deferred — `src/assets/icons/<iconKey>.png` after activation (#412) |
| Runtime shape | 34×34 RGBA; derived `oil-ink` outline (when activated) |
| Visual vocabulary | `fowl-harvest-24`; per-family `palette_subset` in each `source.json` |
| Geometry | Icon grid shell; long side preference 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `charm-equipment-sheet@8x.png` and evidence `previews/<iconKey>@8x.png` |
| Validator | targeted ingest of the two accepted raws → `source.grid`; `python3 pipeline/icons/verify.py` (new families unregistered); CI `assets` for full catalog |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `docs/research/evidence/126-equipment-icons/accepted-raws/berrybright-charm.png` | Moonberry Charm Equipment convention |
| `src/assets/icons/preview/berrybright-charm@8x.png` | Charm @8× readability |
| `src/assets/icons/preview/verify-fowl-canary@8x.png` | Fowl named-palette icon paint proof |

## Identity choices

| iconKey | Subject (issue prompt) | Accepted candidate | Recovered |
| --- | --- | --- | --- |
| `red-beacon-token` | circular road-warning token with red beacon lens + chipped diner-teal rim (Tier III) | **r4** | **25×28**; far 11.4% |
| `black-oil-locket` | oil-black locket with rust-orange seam + red warning glint (Tier IV) | **r2** | **18×21**; far 1.8% |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| red-beacon-token-r1 | icon | fail | none | 18×20; far 24.1% | off-ramp | on-palette materials |
| red-beacon-token-r2 | icon | fail | none | long axis 19 | underfill | enlarge |
| red-beacon-token-r3 | icon | fail | none | 31×34 | overshoot | shrink |
| red-beacon-token-r4 | icon | pass | none | 25×28; far 11.4% | advance | accept |
| black-oil-locket-r1 | icon | pass | none | 14×20; far 4.9% | preference underfill | enlarge |
| black-oil-locket-r2 | icon | pass | none | 18×21; far 1.8% | advance | accept |
| black-oil-locket-r3 | icon | fail | none | 26×33 | overshoot | keep r2 |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| red-beacon-token-r1 | off-ramp | far 24.1% |
| red-beacon-token-r2 | underfill | long axis 19 |
| red-beacon-token-r3 | overshoot | 31×34 |
| black-oil-locket-r1 | preference underfill (gate-pass; superseded) | 14×20 |
| black-oil-locket-r3 | overshoot | 26×33 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above plus `candidate-reports/*.json`. Provider raws are evidence only —
**nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`charm-equipment-sheet@8x.png`](./charm-equipment-sheet@8x.png)
(left→right: red-beacon-token | black-oil-locket).

Subagent verdict: **accept**. Distinct silhouettes (circular teal/red token vs
tilted oil-black locket), readable at 8×, no Character/scene/UI-frame misreads.

### Visual review (step 6) — Charm Equipment Tier III–IV

- **Artifact:** `docs/research/evidence/fowl-harvest/equipment-icons/red-beacon-token-black-oil-locket/charm-equipment-sheet@8x.png`
- **Verdict:** accept
- **red-beacon-token:** Circular road-warning token with solid red lens and diner-teal rim; readable at 8×.
- **black-oil-locket:** Tilted oil-black locket with rust-orange seam and red glint; readable at 8×.
- **Distinct silhouettes (not recolors):** yes
- **Character / scene / UI-frame misreads:** none
- **Blocking defects:** none

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Charm review sheet: [`charm-equipment-sheet@8x.png`](./charm-equipment-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{red-beacon-token,black-oil-locket}/`
