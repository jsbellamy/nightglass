# Evidence: #532 Hunter Basic and Core Ability icons

Acquire and ingest five Hunter Basic/Core Ability sources as **unregistered**
source-local grids with evidence and a five-icon review sheet. No registry,
Content, runtime PNG, manifest, UI, or pipeline change (issue C4).

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Ability / Loadout icon) |
| Status | candidate for shipping (sources only; registration is #534) |
| Runtime destination | `src/assets/icon-sources/<key>/source.grid` (unregistered) |
| Runtime shape | Logical 32×32 drawable; source-local rgb legend; outline `58,6,20` |
| Visual vocabulary | Source-local mechanic colours (physical / trap); no `moonberry-16` / `fowl-harvest-24`; ≤12 flat RGBs after acquisition flatten (contract 8–12) |
| Geometry | Icon grid shell; long-side preference 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `hunter-ability-sheet@8x.png` and evidence `previews/<key>@8x.png` |
| Validator | Targeted `recover_icon_grid` + acquisition flatten + source-local parse/write roundtrip; CI `assets` job for catalog (sources unregistered → no runtime rebuild for these keys yet) |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/preview/verify-ability-canary@8x.png` | Ability source-local style cohort |
| `src/assets/icon-sources/verify-ability-canary/source.grid` | Ability source-local text form reference |
| `src/assets/icons/preview/heartseeker@8x.png` | Hunter peer (chunky geometry) |
| `src/assets/icons/preview/fletchers-eye@8x.png` | Hunter peer |
| `src/assets/icons/preview/draw-weight@8x.png` | Hunter peer |
| `src/assets/icons/preview/fieldcraft@8x.png` | Hunter peer |

Ability Loadout icons use **source-local** mechanic colours (C3). Moonberry Talent
peers are geometry/outline cohort only — not a palette target.

## Accepted candidates

| iconKey | Candidate | Recovered grid | Colors (raw→flat) | Notes |
| --- | --- | --- | --- | --- |
| `quickshot` | r1 | 23×27 | 139→12 | Issue prompt as written |
| `pinpoint-shot` | r3 | 26×20 | 133→9 | r1/r2 overshoot; shrink retry |
| `barbed-arrow` | r3 | 23×22 | 151→12 | r1/r2/r4 overshoot; preference underfill accepted |
| `split-volley` | r2 | 28×28 | 129→9 | r1 clip-fail on all sides |
| `snareburst` | r7 | 30×30 | 365→12 | r1–r6 failed (overshoot/clip/identity); cord+inward heads+stun |

Provider soft sampling produces many near-duplicate cell RGBs. **Acquisition
flatten** (same knight/wizard Ability pattern): recovered cells are collapsed
with merge distance 28 and cap 12 colours before `cells_to_local_source`, so
legends stay printable and match the Ability “flat 8–12 colours” prompt
contract. Provider raws stay byte-immutable evidence. Production
`ingest_raw_to_local_text_source` is **unchanged**. Collapse parameters and
before/after counts are in each sidecar and `ingest-report.json`. Sidecars
record the exact prompt that produced the accepted candidate (including retry
clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| quickshot-r1 | icon | pass | none | 23×27 | advance | accept |
| pinpoint-shot-r1 | icon | fail | none | 36×33 | overshoot | shrink |
| pinpoint-shot-r2 | icon | fail | none | 31×30 | overshoot | shrink |
| pinpoint-shot-r3 | icon | pass | none | 26×20 | advance | accept |
| barbed-arrow-r1 | icon | fail | none | 31×36 | overshoot | shrink |
| barbed-arrow-r2 | icon | fail | none | 34×33 | overshoot | shrink |
| barbed-arrow-r3 | icon | pass | none | 23×22 | preference underfill | accept (enlarge overshot) |
| barbed-arrow-r4 | icon | fail | none | 32×32 | overshoot | stop; keep r3 |
| split-volley-r1 | icon | fail | all | — | clip-fail | add clearance |
| split-volley-r2 | icon | pass | none | 28×28 | advance | accept |
| snareburst-r1 | icon | fail | none | 35×34 | overshoot | shrink |
| snareburst-r2 | icon | pass | none | 19×25 | preference underfill | try enlarge / identity |
| snareburst-r3 | icon | fail | none | 32×26 | overshoot | mid-size |
| snareburst-r4 | icon | fail | none | 22×35 | overshoot | careful enlarge |
| snareburst-r5 | icon | fail | none | 29×32 | overshoot | identity retry |
| snareburst-r6 | icon | fail | bottom/left | — | clip-fail | add clearance |
| snareburst-r7 | icon | pass | none | 30×30 | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| pinpoint-shot-r1 | overshoot | 36×33 |
| pinpoint-shot-r2 | overshoot | 31×30 |
| barbed-arrow-r1 | overshoot | 31×36 |
| barbed-arrow-r2 | overshoot | 34×33 |
| barbed-arrow-r4 | overshoot | 32×32 |
| split-volley-r1 | clip-fail | subject touches all canvas edges |
| snareburst-r1 | overshoot | 35×34 |
| snareburst-r2 | preference underfill / weak identity | 19×25; superseded by r7 |
| snareburst-r3 | overshoot | 32×26 |
| snareburst-r4 | overshoot | 22×35 |
| snareburst-r5 | overshoot | 29×32 |
| snareburst-r6 | clip-fail | bottom/left |

Rejected provider raws were pruned; durable record is the table above. Provider
raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`hunter-ability-sheet@8x.png`](./hunter-ability-sheet@8x.png)
(left→right: quickshot | pinpoint-shot | barbed-arrow | split-volley | snareburst).

Subagent verdict: **accept**. Distinct Loadout Ability reads across the row.
Snareburst **r7** shows toothed cord ring, three inward arrowheads, and center
stun star (re-acquired after Spec identity fail on r2).

## Validator

Targeted acquisition path: `recover_icon_grid` → acquisition flatten →
`cells_to_local_source` / parse-write roundtrip (byte-identical on re-run).
Full-catalog CI `assets` job is the offline catalog proof; these families are
unregistered so they do not enter runtime rebuild yet.

## Artifacts

- Accepted raws + exact-prompt sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Hunter Ability review sheet: [`hunter-ability-sheet@8x.png`](./hunter-ability-sheet@8x.png)
- Per-icon @8× evidence previews: [`previews/`](./previews/)
- Unregistered sources: `src/assets/icon-sources/{quickshot,pinpoint-shot,barbed-arrow,split-volley,snareburst}/source.grid`
