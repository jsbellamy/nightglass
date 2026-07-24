# Evidence: #610 Wizard Tier-3 talent icons

Acquire, ingest, build, and register four Wizard Tier-3 Talent / Ability Talent
icons on `moonberry-16`, with matching `wizardTier3` / `wizardTier3Abilities`
content wired into Class Kit Content.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Talent / Ability Talent skill glyph) |
| Status | shipping (accepted) |
| Runtime destination | `src/assets/icons/<iconKey>.png` |
| Runtime shape | 34×34 RGBA; derived `contour-plum-deepest` outline |
| Visual vocabulary | `moonberry-16`; per-family `palette_subset` in `pipeline/icons/registry.py` |
| Geometry | Icon grid shell (`docs/icon-contract.md`); gates in `pipeline/icons/constants.py` |
| Review context | [`wizard-tier3-sheet@8x.png`](./wizard-tier3-sheet@8x.png) and `src/assets/icons/preview/<iconKey>@8x.png` |
| Validator | `npm run assets:build` then `npm run assets:verify` |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/elemental-practice.png` | style cohort (Wizard talent) |
| `src/assets/icons/leyline-attunement.png` | style cohort (Wizard talent) |
| `src/assets/icons/wildfire-sigil.png` | style cohort (Wizard talent) |

## Identity choices

| iconKey | Subject (C6) | Accepted | Recovered |
| --- | --- | --- | --- |
| `arcane-overflow` | overflowing rune orb | **r2** | **17×21**; far 0.4% |
| `runeward` | circular warding rune sigil ring | **r1** | **29×27**; far 2.0% |
| `comet-fall` | plum-and-cream comet, tail down-left | **r1** | **28×24**; far 3.8% |
| `glacial-prison` | faceted mint ice crystal with dark figure | **r1** | **22×26**; far 8.7% |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| arcane-overflow-r1 | icon | fail | all sides | subject clipped raw canvas | clip-fail | more magenta clearance |
| arcane-overflow-r2 | icon | pass | none | 17×21; far 0.4% | advance | accept |
| runeward-r1 | icon | pass | none | 29×27; far 2.0% | advance | accept |
| comet-fall-r1 | icon | pass | none | 28×24; far 3.8% | advance | accept |
| glacial-prison-r1 | icon | pass | none | 22×26; far 8.7% | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| arcane-overflow-r1 | clip-fail | clipped top/bottom/left/right of 1536×1024 raw |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`wizard-tier3-sheet@8x.png`](./wizard-tier3-sheet@8x.png)
(left→right: arcane-overflow | runeward | comet-fall | glacial-prison).

Subagent verdict: **accept**. All four match C6 identity reads, align with the
night-garden chunky-pixel Wizard talent family, and remain distinguishable.
Arcane-overflow’s smaller recovered grid (17×21) does not undermine the overflow
intent.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Candidate measurement reports: [`candidate-reports/`](./candidate-reports/)
- Review sheet: [`wizard-tier3-sheet@8x.png`](./wizard-tier3-sheet@8x.png)
- Per-icon @8× copies: [`previews/`](./previews/)
- Text sources: `src/assets/icon-sources/{arcane-overflow,comet-fall,glacial-prison,runeward}/`
- Runtime + contact sheet: `src/assets/icons/` (built by `npm run assets:build`)
