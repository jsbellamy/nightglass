# Evidence: #398 Feed-Sack Brigandine & Combineplate Harness icons

Acquire, ingest, and visually approve two distinct universal Armor Equipment
icons as **unregistered** `fowl-harvest-24` source families. Behavior-neutral
interim: no runtime PNG, registry/manifest entry, EquipmentBaseDef, or Armory
mapping.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Equipment Base icon) |
| Status | candidate for shipping (source-only interim; activation is #412) |
| Runtime destination | deferred — `src/assets/icons/<iconKey>.png` after activation (#412) |
| Runtime shape | 34×34 RGBA; derived `oil-ink` outline (when activated) |
| Visual vocabulary | `fowl-harvest-24`; per-family `palette_subset` in each `source.json` |
| Geometry | Icon grid shell; long side target 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `armor-equipment-sheet@8x.png` and evidence `previews/<iconKey>@8x.png` |
| Validator | targeted ingest + `python3 pipeline/icons/verify.py`; CI `assets` job for full-catalog |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `docs/research/evidence/126-equipment-icons/accepted-raws/leafmail-vest.png` | Armor Equipment glyph convention |
| `docs/research/evidence/126-equipment-icons/family-sheet@8x.png` | Equipment icon cohort |

## Identity choices

| iconKey | Subject (issue prompt) | Accepted candidate | Recovered |
| --- | --- | --- | --- |
| `feed-sack-brigandine` | diner-cream feed-sack panels, husk-green straps, three storm-slate plates | **r2-stampclean** | **23×25**; far 12.5% |
| `combineplate-harness` | storm-slate / rust-orange combine chest plates, bolts, husk-green straps | **r2** | **20×23**; far 16.5% |

Tier III (`feed-sack-brigandine`) and Tier IV (`combineplate-harness`) are
independent silhouettes — not a recolor pair.

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| feed-sack-brigandine-r1 | icon | pass | none | 22×25; far 68.4% | off-ramp | on-palette material names |
| feed-sack-brigandine-r2 | icon | fail* | stamp-only left/bottom | — | clip-fail (Cursor stamp) | key stamp → magenta |
| feed-sack-brigandine-r2-stampclean | icon | pass | none | 23×25; far 12.5% | advance | accept |
| feed-sack-brigandine-r3 | icon | fail | all sides | — | clip-fail (true) | shrink (superseded by r2-stampclean) |
| feed-sack-brigandine-r4 | icon | fail* | stamp-only | — | clip-fail (Cursor stamp) | keep r2-stampclean |
| feed-sack-brigandine-r4-stampclean | icon | pass | none | 21×24; far 18.1% | advance (unused) | keep r2 |
| combineplate-harness-r1 | icon | fail | none | 31×35 | overshoot | shrink |
| combineplate-harness-r2 | icon | pass | none | 20×23; far 16.5% | advance | accept |

\*Icon ingest uses `ignore_stamp=False`; a single non-magenta Cursor stamp at
`(0, h-1)` falsely reports left/bottom clip. Stamp was keyed to `#ff00ff` and
recorded as `cursor_stamp_removed: true` before promotion.

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| feed-sack-brigandine-r1 | off-ramp | far 68.4% (chrome → teal drift) |
| feed-sack-brigandine-r2 (pre-clean) | clip-fail | Cursor stamp only |
| feed-sack-brigandine-r3 | clip-fail | subject touched all edges |
| feed-sack-brigandine-r4 (pre-clean) | clip-fail | Cursor stamp only |
| combineplate-harness-r1 | overshoot | 31×35 |

Rejected provider raws were pruned from `scratch/` after promotion; durable
record is the table above plus `candidate-reports/*.json`. Provider raws are
evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`armor-equipment-sheet@8x.png`](./armor-equipment-sheet@8x.png)
(left→right: feed-sack-brigandine | combineplate-harness).

Subagent verdict: **accept**. Both icons are chunky and readable at 8×, match their
material identities (cream feed-sack brigandine vs slate/rust combineplate), read
as different objects rather than recolors, and show no Character/scene/UI-frame
misreads. Blocking defects: none.

### Visual review (step 6) — armor equipment icons

- **Artifact:** `docs/research/evidence/fowl-harvest/equipment-icons/feed-sack-brigandine-combineplate-harness/armor-equipment-sheet@8x.png`
- **Verdict:** accept
- **feed-sack-brigandine:** Cream/off-white padded cloth panels with light-green straps and a vertical strip of dull slate plates; readable at 8×.
- **combineplate-harness:** Broad dark slate plus rust-orange machine chest plates, green harness straps, bolt/rivet dots; readable at 8×.
- **Distinct silhouettes:** yes (soft scalloped quilted sack vs angular industrial vest with shoulder wings).
- **Character / scene / UI-frame misreads:** none.
- **Blocking defects:** none.

## Artifacts

- Issue exact prompts: [`issue-exact-prompts.json`](./issue-exact-prompts.json)
- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Armor review sheet: [`armor-equipment-sheet@8x.png`](./armor-equipment-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{feed-sack-brigandine,combineplate-harness}/`
