# Evidence: #530 Priest Basic and Core Ability icons

Acquire and ingest five Priest Basic/Core Ability sources as unregistered
source-local grids with evidence and a five-icon review sheet. No registry,
Content, runtime PNG, manifest, or UI change in this slice (activation → #534).

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Ability Loadout icon) |
| Status | candidate for shipping (unregistered interim) |
| Runtime destination | deferred — `src/assets/icons/<iconKey>.png` at activation (#534) |
| Runtime shape | 34×34 RGBA geometry via icon contract (source only here) |
| Visual vocabulary | source-local mechanic colours; common outline `58,6,20`; no `moonberry-16` / `fowl-harvest-24` |
| Geometry | Icon grid shell; long side preference 26–30; gates in `pipeline/icons/constants.py` |
| Review context | `priest-ability-sheet@8x.png` (evidence composite) + native 1× sheet |
| Validator | targeted source-local ingest of the five accepted raws → `source.grid`; `python3 -m icons.verify` proves registered catalog unchanged; CI `assets` job for full-catalog byte-identity after push |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `src/assets/icons/preview/verify-ability-canary@8x.png` | Pipeline Ability reference |
| `src/assets/icon-sources/verify-ability-canary/source.grid` | Pipeline Ability text-source form |
| `src/assets/icons/preview/sunlance@8x.png` | Talent glyph style peer |
| `src/assets/icons/preview/battle-liturgy@8x.png` | Talent glyph style peer |
| `src/assets/icons/preview/benediction@8x.png` | Talent glyph style peer |
| `src/assets/icons/preview/devotion@8x.png` | Talent glyph style peer |

## Original sample + identity choices

| iconKey | Original sample (SUBJECT) | Accepted | Recovered |
| --- | --- | --- | --- |
| `sun-mote` | compact golden sun orb, four broad rays, forward light wedge | **r3** after overshoot on r1; preference enlarge from r2 | **22×22** |
| `mending-light` | healing cross of light shards around repaired heart seam | **r3** after clip (r1) and overshoot (r2) | **23×23** |
| `dawn-recall` | broken halo rejoining above upward soul flame | **r2** after pitch-fail on r1 | **17×24** |
| `war-hymn` | ceremonial bell, rising musical strokes, party-chevron base | **r1** (gate pass); later enlarge attempts did not improve fill | **20×23** |
| `judgment` | descending radiant hammer-beam striking dark cracked seal | **r3** after raw-gate (r1) and clip (r2); safety-safe prompt retained identity | **21×26** |

Issue exact prompts were submitted as each family's **r1** (judgment r1 used a safety-safe paraphrase of the issue gavel/beam identity). Accepted provenance records the prompt that produced the accepted raw; `issue_prompt` preserves the verbatim issue text.

Provider cell samples can explode unique RGB counts past legend capacity. Promotion clusters opaque cells to ≤12 flat fills (threshold 28) and peels exterior near-outline ink before `cells_to_local_source`, matching the Ability prompt's 8–12 flat-colour intent. Cluster steps are recorded under `ingest.cluster` in each sidecar.

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| sun-mote-r1 | icon | fail | none | 32×30 | overshoot | shrink |
| sun-mote-r2 | icon | pass | none | 20×18 | advance (preference thin) | enlarge |
| sun-mote-r3 | icon | pass | none | 22×22 | advance | accept |
| mending-light-r1 | icon | fail | bottom/left | — | clip-fail | add clearance |
| mending-light-r2 | icon | fail | none | 33×33 | overshoot | shrink |
| mending-light-r3 | icon | pass | none | 23×23 | advance | accept |
| dawn-recall-r1 | icon | fail | none | pitch y=0.039 | pitch-fail | strengthen grid shell |
| dawn-recall-r2 | icon | pass | none | 17×24 | advance | accept |
| dawn-recall-r3 | icon | pass | none | 15×24 | advance (no better than r2) | keep r2 |
| war-hymn-r1 | icon | pass | none | 20×23 | advance | accept |
| war-hymn-r2 | icon | pass | none | 17×24 | advance (no better width) | keep r1 |
| war-hymn-r3 | icon | pass | none | 19×21 | advance (smaller) | keep r1 |
| judgment-r1 | icon | fail | — | border not flat magenta | raw-gate-fail | restate #ff00ff |
| judgment-r2 | icon | fail | bottom/left | — | clip-fail | add clearance + shrink |
| judgment-r3 | icon | pass | none | 21×26 | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| sun-mote-r1 | overshoot | 32×30 |
| sun-mote-r2 | preference underfill (gate-pass) | 20×18; superseded by r3 |
| mending-light-r1 | clip-fail | bottom/left of raw canvas |
| mending-light-r2 | overshoot | 33×33 |
| dawn-recall-r1 | pitch-fail | y score 0.039 < 0.04 |
| dawn-recall-r3 | preference underfill (gate-pass) | 15×24; superseded by r2 |
| war-hymn-r2 | preference underfill (gate-pass) | 17×24; kept r1 for width |
| war-hymn-r3 | preference underfill (gate-pass) | 19×21; kept r1 |
| judgment-r1 | raw-gate-fail | border not flat `#ff00ff` |
| judgment-r2 | clip-fail | bottom/left of raw canvas |

Rejected provider raws were pruned from `scratch/` after promotion; durable record is the table above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`priest-ability-sheet@8x.png`](./priest-ability-sheet@8x.png)
(left→right: sun-mote | mending-light | dawn-recall | war-hymn | judgment).

Subagent verdict: **accept**. All five identities read correctly and stay silhouette-distinct
(sun wedge vs cross+heart vs halo-flame vs bell+chevron vs hammer-beam+seal). Style
cohort notes: chunky blocks, selective charcoal-plum outline, upper-left light, source-local
mechanic colours. No blocking defects (no characters, text, UI frames, soft bloom).

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Priest Ability review sheet: [`priest-ability-sheet@8x.png`](./priest-ability-sheet@8x.png) (+ 1× [`priest-ability-sheet.png`](./priest-ability-sheet.png))
- Per-icon @8× evidence previews: [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{sun-mote,mending-light,dawn-recall,war-hymn,judgment}/source.grid`
