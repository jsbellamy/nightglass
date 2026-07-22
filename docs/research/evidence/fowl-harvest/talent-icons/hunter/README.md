# Evidence: #393 Hunter Talent Tier 2 icons

Acquire, ingest, and visually approve four Hunter Talent Tier 2 skill glyphs as
**unregistered** Moonberry source families. Behavior-neutral interim: no
runtime PNG, registry entry, manifest entry, content node, or UI mapping.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Talent / Ability Talent skill glyph) |
| Status | candidate for shipping (source-only interim; activation is a later slice) |
| Runtime destination | deferred — `src/assets/icons/<iconKey>.png` after activation (#411) |
| Runtime shape | 34×34 RGBA; derived `contour-plum-deepest` outline (when activated) |
| Visual vocabulary | `moonberry-16`; per-family `palette_subset` in each `source.json` |
| Geometry | Icon grid shell; long side target 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `hunter-tier2-talent-sheet@8x.png` and evidence `previews/<iconKey>@8x.png` |
| Validator | targeted ingest + `python3 pipeline/icons/verify.py`; CI `assets` job for full-catalog |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `docs/research/evidence/305-talent-icons-hunter/hunter-talent-sheet@8x.png` | Hunter Tier 1 talent cohort |
| `docs/research/evidence/305-talent-icons-hunter/accepted-raws/heartseeker.png` | Hunter glyph convention |
| `docs/research/evidence/305-talent-icons-hunter/accepted-raws/draw-weight.png` | Hunter glyph convention |
| `docs/research/evidence/305-talent-icons-hunter/accepted-raws/fieldcraft.png` | Hunter glyph convention |
| `docs/research/evidence/305-talent-icons-hunter/accepted-raws/moonwire-trap.png` | Hunter glyph convention |
| `src/assets/icon-sources/heartseeker/source.grid` | accepted Hunter glyph text-grid |
| `src/assets/icon-sources/fieldcraft/source.grid` | accepted Hunter glyph text-grid |
| `src/assets/icon-sources/draw-weight/source.grid` | accepted Hunter glyph text-grid |
| `src/assets/icon-sources/moonwire-trap/source.grid` | accepted Hunter glyph text-grid |

## Identity choices

| iconKey | Subject (issue prompt) | Accepted candidate | Recovered |
| --- | --- | --- | --- |
| `fletchers-eye` | arrowhead inside a watchful eye (flat Physical Power) | **r1** | **30×21**; far 0.3% |
| `wayfarers-ward` | travel cloak folded into a small ward crest (Elemental Resistance) | **r2** after overshoot on r1 | **26×25**; far 0.0% |
| `piercing-rain` | three downward arrows breaking one armor plate (AoE Physical + Exposed) | **r2** (r1 preference underfill; r3 pitch-fail) | **24×22**; far 1.1% |
| `twin-fang` | two close parallel arrowheads aimed at one target point | **r3** after overshoot on r1/r2 | **19×22**; far 2.0% |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| fletchers-eye-r1 | icon | pass | none | 30×21; far 0.3% | advance | accept |
| wayfarers-ward-r1 | icon | fail | none | 35×36 | overshoot | shrink |
| wayfarers-ward-r2 | icon | pass | none | 26×25; far 0.0% | advance | accept |
| piercing-rain-r1 | icon | pass | none | 21×23; far 3.0% | preference underfill | enlarge |
| piercing-rain-r2 | icon | pass | none | 24×22; far 1.1% | preference underfill | accept (gate-pass) |
| piercing-rain-r3 | icon | fail | none | pitch x=0.038 | pitch-fail | keep r2 |
| twin-fang-r1 | icon | fail | none | 32×29 | overshoot | shrink |
| twin-fang-r2 | icon | fail | none | 35×14 | overshoot | shrink/narrow |
| twin-fang-r3 | icon | pass | none | 19×22; far 2.0% | preference underfill | accept (gate-pass) |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| wayfarers-ward-r1 | overshoot | 35×36 |
| piercing-rain-r1 | preference underfill (gate-pass; superseded) | 21×23 |
| piercing-rain-r3 | pitch-fail | x=0.038 (<0.04) |
| twin-fang-r1 | overshoot | 32×29 |
| twin-fang-r2 | overshoot | 35×14 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above plus `candidate-reports/*.json`. Provider raws are evidence only —
**nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`hunter-tier2-talent-sheet@8x.png`](./hunter-tier2-talent-sheet@8x.png)
(left→right: fletchers-eye | wayfarers-ward | piercing-rain | twin-fang).

Subagent verdict: **accept**. All four match intended identities at 8×, silhouettes
are distinct (oval / crest / triple-prong / V), and there are no blocking
Equipment / scene / UI-frame misreads. Non-blocking: Wayfarer’s Ward may
momentarily read as a “shield badge,” still consistent with ward/crest symbolism.

### Visual review (step 6) — hunter tier-2 talents

- **Artifact:** `docs/research/evidence/fowl-harvest/talent-icons/hunter/hunter-tier2-talent-sheet@8x.png`
- **Verdict:** accept
- **fletchers-eye:** Eye + iris arrowhead matches Fletcher’s Eye; readable at 8×.
- **wayfarers-ward:** Folded-cloak / ward crest matches Wayfarer’s Ward; readable at 8×.
- **piercing-rain:** Three down-arrows + split plate matches Piercing Rain; readable at 8×.
- **twin-fang:** Twin converging fangs / arrowheads matches Twin Fang; readable at 8×.
- **Distinct silhouettes:** yes (oval / crest / triple-prong / V).
- **Equipment / scene / UI-frame misreads:** none blocking.
- **Blocking defects:** none.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Hunter Tier 2 review sheet: [`hunter-tier2-talent-sheet@8x.png`](./hunter-tier2-talent-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{fletchers-eye,wayfarers-ward,piercing-rain,twin-fang}/`
