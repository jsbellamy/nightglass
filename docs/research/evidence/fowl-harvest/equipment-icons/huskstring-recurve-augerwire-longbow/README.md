# Evidence: #397 Huskstring Recurve and Augerwire Longbow icons

Acquire, ingest, and visually approve two distinct Hunter bow Equipment icons as
**unregistered** `fowl-harvest-24` source families. Behavior-neutral interim: no
runtime PNG, registry/manifest entry, EquipmentBaseDef, or Armory mapping.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Equipment Base inventory icon) |
| Status | candidate for shipping (source-only interim; activation is a later slice) |
| Runtime destination | deferred — `src/assets/icons/<iconKey>.png` after Equipment integration (#412) |
| Runtime shape | 34×34 RGBA; derived `oil-ink` outline (when activated) |
| Visual vocabulary | `fowl-harvest-24`; per-family `palette_subset` in each `source.json` / `source.grid` |
| Geometry | Fowl icon grid shell (`docs/icon-contract.md`); long side target 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `huskstring-augerwire-sheet@8x.png` and evidence `previews/<iconKey>@8x.png` |
| Validator | targeted Fowl-qualified ingest + `python3 pipeline/icons/verify.py`; CI `assets` job for full-catalog |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/preview/verify-fowl-canary@8x.png` | Fowl named-palette style reference |
| `src/assets/icon-sources/verify-fowl-canary/source.grid` | Fowl text-grid / palette declaration reference |
| `docs/research/evidence/126-equipment-icons/accepted-raws/bramblesong-bow.png` | grid-faithful bow cohort (geometry) |
| Fowl Equipment prompt shell in `docs/icon-contract.md` | acquisition shell |

## Identity choices

| iconKey | Subject (issue prompt) | Accepted candidate | Recovered |
| --- | --- | --- | --- |
| `huskstring-recurve` | recurved bow of layered green corn husks, diner-cream cord, orange nocks | **r1** (exact issue prompt) | **12×28**; far 17.9% |
| `augerwire-longbow` | industrial longbow, storm-slate auger spine, coiled teal wire string | **r4** after off-ramp / overshoot retries | **12×28**; far 16.7% |

Tier IV is an independent silhouette (auger spine + teal coil), never a recolor of
Tier III.

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| huskstring-recurve-r1 | icon | pass | none | 12×28; far 17.9% | advance | accept |
| huskstring-recurve-r2 | icon | fail | none | 16×35 | overshoot | shrink |
| huskstring-recurve-r3 | icon | fail | none | 10×27; far 43.5% | off-ramp | keep r1 |
| augerwire-longbow-r1 | icon | fail | none | 8×25; far 33.0% | off-ramp | exact swatch names |
| augerwire-longbow-r2 | icon | fail | none | 14×29; far 22.8% | off-ramp | greenish teal + shrink |
| augerwire-longbow-r3 | icon | fail | none | 15×34 | overshoot | shrink clearance |
| augerwire-longbow-r4 | icon | pass | none | 12×28; far 16.7% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| huskstring-recurve-r2 | overshoot | 16×35 |
| huskstring-recurve-r3 | off-ramp | far 43.5% |
| augerwire-longbow-r1 | off-ramp | far 33.0% (exact issue prompt) |
| augerwire-longbow-r2 | off-ramp | far 22.8% |
| augerwire-longbow-r3 | overshoot | 15×34 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above plus `candidate-reports/*.json`. Provider raws are evidence only —
**nothing added to `assets-raw/`**.

Exact issue prompts were submitted as r1 for both families. Augerwire’s accepted
raw used a geometry/teal-tightened retry prompt; the exact issue prompt is
preserved on the provenance sidecar as `exact_issue_prompt`.

## Step-6 visual review

Composite: [`huskstring-augerwire-sheet@8x.png`](./huskstring-augerwire-sheet@8x.png)
(left→right: huskstring-recurve | augerwire-longbow).

Subagent verdict: **accept**. Both match intended identities at 8×, silhouettes
are structurally distinct (organic recurve vs auger-spine longbow with coiled
teal wire), and there are no Character / scene / UI-frame misreads.

### Visual review (step 6) — huskstring / augerwire bows

- **Artifact:** `docs/research/evidence/fowl-harvest/equipment-icons/huskstring-recurve-augerwire-longbow/huskstring-augerwire-sheet@8x.png`
- **Verdict:** accept
- **huskstring-recurve:** Recurved husk stave, cream cord, orange nocks; readable at 8×.
- **augerwire-longbow:** Storm-slate auger spine, coiled teal wire; readable at 8×.
- **Distinct silhouettes:** yes (not recolors).
- **Character / scene / UI-frame misreads:** none.
- **Blocking defects:** none.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Review sheet: [`huskstring-augerwire-sheet@8x.png`](./huskstring-augerwire-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{huskstring-recurve,augerwire-longbow}/`
