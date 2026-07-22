# Evidence: #391 Wizard Talent Tier 2 icons

Isolated, unregistered Moonberry Talent / Ability Talent skill glyphs for the
four Wizard Tier 2 Talents. Same Equipment-icon pipeline geometry (CANVAS 34 /
DRAWABLE 32); one-variant families only. This slice writes text-grid sources and
acquisition evidence only — no registry entry, runtime PNG, preview under
`src/assets/icons/`, manifest, content node, or UI mapping.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Talent / Ability Talent skill glyph) |
| Status | candidate for shipping (unregistered interim) |
| Runtime destination | deferred — later activation slice; sources at `src/assets/icon-sources/<key>/` |
| Runtime shape | 34×34 RGBA when activated; derived `contour-plum-deepest` outline |
| Visual vocabulary | `moonberry-16`; per-family `palette_subset` in each `source.json` |
| Geometry | Icon grid shell; long-side preference 26–30; gates in `pipeline/icons/constants.py` |
| Review context | [`wizard-tier2-talent-sheet@8x.png`](./wizard-tier2-talent-sheet@8x.png) |
| Validator | targeted ingest + `python3 pipeline/icons/verify.py`; CI `assets` job for catalog |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icon-sources/elemental-practice/source.grid` | Wizard Tier 1 glyph convention |
| `src/assets/icon-sources/radiant-study/source.grid` | Wizard Tier 1 cohort peer |
| `src/assets/icon-sources/starfall/source.grid` | Wizard Tier 1 cohort peer |
| `src/assets/icon-sources/sunlance/source.grid` | Wizard Tier 1 cohort peer |
| `docs/research/evidence/305-talent-icons-wizard/accepted-raws/elemental-practice.png` | style reference (GenerateImage) |
| `docs/research/evidence/305-talent-icons-wizard/accepted-raws/starfall.png` | style reference (GenerateImage) |
| `docs/research/evidence/305-talent-icons-priest/accepted-raws/radiant-study.png` | style reference (GenerateImage) |
| `docs/research/evidence/305-talent-icons-priest/accepted-raws/sunlance.png` | style reference (GenerateImage) |

## Exact issue prompts

All four issue-body prompts were submitted as candidate **r1** via Cursor
`GenerateImage`. Accepted provenance sidecars store the prompt that produced the
accepted raw (exact for leyline / absolute-zero; gate-retry variants for
glassweave / wildfire-sigil).

| iconKey | Exact prompt submitted as | Accepted candidate |
| --- | --- | --- |
| `leyline-attunement` | r1 (exact) | **r1** |
| `glassweave` | r1 (exact) | **r4** (clearance + grid-faithful retry) |
| `wildfire-sigil` | r1 (exact) | **r4** (grid-faithful retry after enlarge underfills) |
| `absolute-zero` | r1 (exact) | **r1** |

## Original sample + identity

| iconKey | Intended read | Accepted | Recovered |
| --- | --- | --- | --- |
| `leyline-attunement` | crystal above two converging arcane lines (Elemental Power) | **r1** | **17×22** |
| `glassweave` | interlocked faceted hexagonal weave around a small heart (max Health) | **r4** | **19×22** |
| `wildfire-sigil` | circular flame rune with three outward embers (area Fire + Scorched) | **r4** | **23×20** |
| `absolute-zero` | sharp six-point frost seal with locked central dot (area Frost + Stun) | **r1** | **25×28** |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| leyline-attunement-r1 | icon | pass | none | 17×22; far 4.8% | advance | accept |
| leyline-attunement-r2 | icon | pass | none | 17×20; far 5.5% | advance (no gain) | keep r1 |
| glassweave-r1 | icon | fail | none | long axis 19 | underfill | enlarge |
| glassweave-r2 | icon | fail | none | long axis 19 | underfill | enlarge |
| glassweave-r3 | icon | fail | bottom/left | — | clip-fail | clearance |
| glassweave-r4 | icon | pass | none | 19×22; far 4.7% | advance | accept |
| wildfire-sigil-r1 | icon | fail | none | long axis 19 | underfill | enlarge |
| wildfire-sigil-r2 | icon | fail | none | long axis 18 | underfill | enlarge |
| wildfire-sigil-r3 | icon | fail | none | long axis 19 | underfill | grid-faithful (occupancy already large) |
| wildfire-sigil-r4 | icon | pass | none | 23×20; far 2.9% | advance | accept |
| absolute-zero-r1 | icon | pass | none | 25×28; far 3.2% | advance | accept |

Scratch measurement JSONs: [`scratch/`](./scratch/).

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| leyline-attunement-r2 | superseded (no size gain vs r1) | 17×20 |
| glassweave-r1 | underfill | long axis 19 |
| glassweave-r2 | underfill | long axis 19 |
| glassweave-r3 | clip-fail | clipped bottom/left |
| wildfire-sigil-r1 | underfill | long axis 19; bbox occupancy ~69×85% |
| wildfire-sigil-r2 | underfill | long axis 18; occupancy ~82×94% |
| wildfire-sigil-r3 | underfill | long axis 19; occupancy ~78×96% (coarse pitch) |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above plus candidate-report JSON. Provider raws are evidence only — **nothing
added to `assets-raw/`**.

## Step-6 visual review

Composite: [`wizard-tier2-talent-sheet@8x.png`](./wizard-tier2-talent-sheet@8x.png)
(left→right: leyline-attunement | glassweave | wildfire-sigil | absolute-zero).

Subagent verdict: **accept**. All four match identity, read as skill glyphs
(not Equipment / scene / UI frame), and are distinct at a glance (crystal+lines
vs hex weave vs flame sigil vs six-point frost seal). No retry targets.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Wizard Tier 2 review sheet: [`wizard-tier2-talent-sheet@8x.png`](./wizard-tier2-talent-sheet@8x.png)
- Per-icon @8× copies (evidence only): [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{leyline-attunement,glassweave,wildfire-sigil,absolute-zero}/`
