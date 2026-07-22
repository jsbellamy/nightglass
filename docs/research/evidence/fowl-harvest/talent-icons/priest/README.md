# Evidence: #392 Priest Talent Tier 2 icons

Behavior-neutral interim acquisition of four Priest Talent Tier 2 skill glyphs
as isolated, unregistered Moonberry text-grid families. No runtime PNG,
registry entry, manifest entry, content node, or UI mapping in this slice.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Talent / Ability Talent skill glyph) |
| Status | candidate for shipping (unregistered until activation slice) |
| Runtime destination | deferred — `src/assets/icons/<iconKey>.png` at activation |
| Runtime shape | 34×34 RGBA geometry via icon contract (source only here) |
| Visual vocabulary | `moonberry-16`; per-family `palette_subset` in `source.json` / `source.grid` |
| Geometry | Icon grid shell; long side target 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `priest-tier2-talent-sheet@8x.png` (evidence composite) |
| Validator | targeted ingest + `python3 -m icons.verify` fixture/rebuild gates; CI `assets` for full catalog |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icon-sources/devotion/source.grid` (+ `@8x` preview) | Priest Tier 1 glyph convention |
| `src/assets/icon-sources/moonwell/source.grid` (+ `@8x` preview) | Priest Tier 1 cohort |
| `src/assets/icon-sources/warding-lore/source.grid` (+ `@8x` preview) | style cohort (ward glyph language) |
| `src/assets/icon-sources/prismatic-shelter/source.grid` (+ `@8x` preview) | style cohort (shelter glyph language) |

## Original sample + identity choices

| iconKey | Original sample (SUBJECT) | Accepted | Recovered |
| --- | --- | --- | --- |
| `battle-liturgy` | compact prayer-book shield, reading Armor | **r2** after overshoot on r1 | **22×30** |
| `sunwarding` | radiating sun behind a ward ring, reading Elemental Resistance | **r2** after overshoot on r1 | **26×28** |
| `benediction` | two open hands beneath a small rising sun, reading Party Healing plus Inspired | **r1** | **30×30** |
| `dawn-ascendant` | first-light sun lifting a fallen wing or feather, reading revival plus Sheltered | **r5** after clip (r1), preference thin (r2), overshoot (r3/r4) | **19×22** |

Issue exact prompts were submitted as each family's **r1**. Accepted provenance
records the prompt that produced the accepted raw; `issue_prompt` preserves the
verbatim issue text.

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| battle-liturgy-r1 | icon | fail | none | 24×31 | overshoot | shrink |
| battle-liturgy-r2 | icon | pass | none | 22×30; far 0.9% | advance | accept |
| sunwarding-r1 | icon | fail | none | 35×36 | overshoot | shrink |
| sunwarding-r2 | icon | pass | none | 26×28; far 0.0% | advance | accept |
| benediction-r1 | icon | pass | none | 30×30; far 0.0% | advance | accept |
| dawn-ascendant-r1 | icon | fail | bottom/left | — | clip-fail | add clearance |
| dawn-ascendant-r2 | icon | pass | none | 19×21; far 2.2% | advance (preference thin) | enlarge |
| dawn-ascendant-r3 | icon | fail | none | 15×36 | overshoot | shrink bound |
| dawn-ascendant-r4 | icon | fail | none | 34×35 | overshoot | slight enlarge from r2 |
| dawn-ascendant-r5 | icon | pass | none | 19×22; far 6.1% | advance | accept |
| dawn-ascendant-r6 | icon | fail | none | long axis 19 | underfill | keep r5 (Spec scale rework) |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| battle-liturgy-r1 | overshoot | 24×31 |
| sunwarding-r1 | overshoot | 35×36 |
| dawn-ascendant-r1 | clip-fail | bottom/left of raw canvas |
| dawn-ascendant-r2 | preference underfill (gate-pass) | 19×21; superseded by r5 |
| dawn-ascendant-r3 | overshoot | 15×36 |
| dawn-ascendant-r4 | overshoot | 34×35 |
| dawn-ascendant-r6 | underfill | long axis 19 (Spec scale rework after review) |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`priest-tier2-talent-sheet@8x.png`](./priest-tier2-talent-sheet@8x.png)
(left→right: battle-liturgy | sunwarding | benediction | dawn-ascendant).

Subagent verdict: **accept**. All four match identity intents, stay silhouette-distinct
(book-shield vs ward-ring+sun vs cupped hands+sun vs uplifted wing+sun), and
read as Moonberry skill glyphs — not Equipment, scenes, Characters, or UI
frames. No blocking defects. Shared sun motifs are cohort glue, not duplicates.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Priest Tier 2 review sheet: [`priest-tier2-talent-sheet@8x.png`](./priest-tier2-talent-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Unregistered sources: `src/assets/icon-sources/{battle-liturgy,sunwarding,benediction,dawn-ascendant}/`
