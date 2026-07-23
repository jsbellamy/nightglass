# Evidence: #532 Hunter Basic and Core Ability icons

Acquire and ingest five Hunter Basic/Core Ability sources as **unregistered**
source-local grids with evidence and a five-icon review sheet. No registry,
Content, runtime PNG, manifest, or UI change (issue C4).

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Ability / Loadout icon) |
| Status | candidate for shipping (sources only; registration is #534) |
| Runtime destination | `src/assets/icon-sources/<key>/source.grid` (unregistered) |
| Runtime shape | Logical 32×32 drawable; source-local rgb legend; outline `58,6,20` |
| Visual vocabulary | Source-local mechanic colours (physical / trap); no `moonberry-16` / `fowl-harvest-24` |
| Geometry | Icon grid shell; long-side preference 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `hunter-ability-sheet@8x.png` and evidence `previews/<key>@8x.png` |
| Validator | targeted `recover_icon_grid` + source-local parse/write; CI `assets` job for catalog (sources present, families not yet registered) |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/preview/verify-ability-canary@8x.png` | Ability source-local style cohort |
| `src/assets/icon-sources/verify-ability-canary/source.grid` | Ability source-local text form reference |
| `src/assets/icons/preview/heartseeker@8x.png` | Hunter peer (Talent glyph) |
| `src/assets/icons/preview/fletchers-eye@8x.png` | Hunter peer |
| `src/assets/icons/preview/draw-weight@8x.png` | Hunter peer |
| `src/assets/icons/preview/fieldcraft@8x.png` | Hunter peer |

## Accepted candidates

| iconKey | Candidate | Recovered grid | Colors (raw→flat) | Notes |
| --- | --- | --- | --- | --- |
| `quickshot` | r1 | 23×27 | 139→12 | Issue prompt as written |
| `pinpoint-shot` | r3 | 26×20 | 133→9 | r1/r2 overshoot; shrink retry |
| `barbed-arrow` | r3 | 23×22 | 151→12 | r1/r2/r4 overshoot; preference underfill accepted |
| `split-volley` | r2 | 28×28 | 129→9 | r1 clip-fail on all sides |
| `snareburst` | r2 | 19×25 | 168→12 | r1/r3–r5 overshoot; preference underfill accepted |

Provider raws sample many near-duplicate RGBs. Ingest applies a **task-local**
flat-fill cluster (≤12 colours, RGB distance 28) before `cells_to_local_source`
so the legend stays inside the `[.A-Za-z0-9]` grid alphabet. Rebuild is from the
committed `source.grid`, not the provider raw.

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
| snareburst-r2 | icon | pass | none | 19×25 | preference underfill | try enlarge |
| snareburst-r3 | icon | fail | none | 32×26 | overshoot | mid-size |
| snareburst-r4 | icon | fail | none | 22×35 | overshoot | careful enlarge |
| snareburst-r5 | icon | fail | none | 29×32 | overshoot | stop; keep r2 |

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
| snareburst-r3 | overshoot | 32×26 |
| snareburst-r4 | overshoot | 22×35 |
| snareburst-r5 | overshoot | 29×32 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`hunter-ability-sheet@8x.png`](./hunter-ability-sheet@8x.png)
(left→right: quickshot | pinpoint-shot | barbed-arrow | split-volley | snareburst).

Subagent verdict: **accept**. All five read as distinct Loadout Ability glyphs
(bow+arrow, bullseye pierce, barbed wound arrow, triple fan, toothed snare+stun),
share charcoal-plum outline / upper-left light / similar scale, and show no
blocking soft-AA or silhouette collisions.

## Artifacts

- Accepted raws + exact-prompt sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Hunter Ability review sheet: [`hunter-ability-sheet@8x.png`](./hunter-ability-sheet@8x.png)
- Per-icon @8× evidence previews: [`previews/`](./previews/)
- Unregistered sources: `src/assets/icon-sources/{quickshot,pinpoint-shot,barbed-arrow,split-volley,snareburst}/source.grid`
