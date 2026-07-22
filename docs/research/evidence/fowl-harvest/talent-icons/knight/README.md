# Evidence: #390 Knight Talent Tier 2 icons

Isolated, unregistered Moonberry Talent / Ability Talent skill glyphs for
Knight Tier 2. Four one-variant source families under the Equipment icon
pipeline geometry (CANVAS 34 / DRAWABLE 32). No runtime PNG, registry entry,
manifest entry, content node, or UI mapping in this slice.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Talent / Ability Talent skill glyph) |
| Status | candidate for shipping (sources only; activation deferred) |
| Runtime destination | none in this issue — later integration slice registers `iconKey` |
| Runtime shape | 34×34 RGBA when activated; derived `contour-plum-deepest` outline |
| Visual vocabulary | `moonberry-16`; per-family `palette_subset` in each `source.json` |
| Geometry | Icon grid shell; long side target 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `knight-tier2-talent-sheet@8x.png` and `previews/<key>@8x.png` |
| Validator | targeted ingest + parse; CI `assets` job for full-catalog (existing registry only) |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icon-sources/fortitude/source.grid` | style cohort (Knight Tier 1) |
| `src/assets/icon-sources/hold-the-line/source.grid` | style cohort (Knight Tier 1) |
| `src/assets/icon-sources/swordcraft/source.grid` | style cohort (Knight Tier 1) |
| `src/assets/icon-sources/thornquill-blade/source.grid` | style cohort (Equipment blade / Moonberry steel) |

Issue generation prompts are the identity samples. Style references attached at
generation were @8× paints of the cohort grids above (plus gate-faithful
accepted raws from `#305` when reinforcing clearance / pitch).

## Original sample + style cohort + identity choices

| iconKey | Original sample (SUBJECT) | Style cohort | Identity / style preserved |
| --- | --- | --- | --- |
| `iron-discipline` | closed steel helm over a compact shield, reading Armor and drilled defense | fortitude / hold-the-line / swordcraft / thornquill-blade | Closed mint-steel helm stacked on a compact kite; cream rim / berry accents — drilled defense glyph, not a wearable helm. Accepted **r2** (r1 clip-fail; r3 clip-fail after enlarge). Recovered **15×22** (gate-pass; preference thin vs 26–30). |
| `veterans-edge` | one disciplined sword edge with two short rank notches, reading trained Physical Power | same | Single upright mint blade with two cream/berry rank notches on the edge — trained power glyph, not crossed blades (`swordcraft`). Accepted **r2**. Recovered **26×26**, far 0%. |
| `vanguard` | three forward shield silhouettes in one compact formation, reading Party protection and advance | same | Three overlapping mint kite shields in a forward wedge — Party advance wall, distinct from single `fortitude` / braced `hold-the-line`. Accepted **r2**. Recovered **28×21**. |
| `sundering-charge` | heavy sword driving through a split armor plate, reading single-target Physical Damage plus Exposed | same | Diagonal mint blade through a split berry/plum plate shard — Exposed breach read, not a plain sword. Accepted **r4** after overshoot (r2/r3). Recovered **27×27**, far 0.3%. |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| iron-discipline-r1 | icon | fail | all sides | — | clip-fail | reinforce magenta clearance |
| iron-discipline-r2 | icon | pass | none | 15×22; far 4.2% | advance (preference thin) | accept |
| iron-discipline-r3 | icon | fail | bottom/left | — | clip-fail | keep r2 |
| veterans-edge-r1 | icon | fail | bottom/left | — | clip-fail | reinforce clearance |
| veterans-edge-r2 | icon | pass | none | 26×26; far 0% | advance | accept |
| vanguard-r1 | icon | fail | bottom/left | — | clip-fail | reinforce clearance |
| vanguard-r2 | icon | pass | none | 28×21; far 7.0% | advance | accept |
| sundering-charge-r1 | icon | fail | bottom/left | — | clip-fail | reinforce clearance |
| sundering-charge-r2 | icon | fail | none | 34×35 | overshoot | shrink + clearance |
| sundering-charge-r3 | icon | fail | none | 30×33 | overshoot | shrink more |
| sundering-charge-r4 | icon | pass | none | 27×27; far 0.3% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| iron-discipline-r1 | clip-fail | subject touched all raw edges |
| iron-discipline-r3 | clip-fail | bottom/left (enlarge retry) |
| veterans-edge-r1 | clip-fail | bottom/left |
| vanguard-r1 | clip-fail | bottom/left |
| sundering-charge-r1 | clip-fail | bottom/left |
| sundering-charge-r2 | overshoot | 34×35 |
| sundering-charge-r3 | overshoot | 30×33 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above plus measure JSON beside it. Provider raws are evidence only — **nothing
added to `assets-raw/`**.

## Step-6 visual review

Composite: [`knight-tier2-talent-sheet@8x.png`](./knight-tier2-talent-sheet@8x.png)
(left→right: iron-discipline | veterans-edge | vanguard | sundering-charge).

Subagent verdict: **accept**. All four read as Moonberry Talent / Ability
skill glyphs with native-readable, mutually distinct silhouettes and clear
identity match (helm-over-shield; notched single sword; three-shield
formation; sword sundering a split plate). Palette and chunky pixel language
match the Knight Tier 1 cohort (fortitude / hold-the-line / swordcraft /
thornquill-blade); no brown/tan/cyan/pure white/black, and no Equipment Base,
Armory, UI-frame, or scene reads. No blocking defects.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Knight Tier 2 review sheet: [`knight-tier2-talent-sheet@8x.png`](./knight-tier2-talent-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Unregistered sources: `src/assets/icon-sources/{iron-discipline,veterans-edge,vanguard,sundering-charge}/`
