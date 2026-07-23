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
| Validator | targeted source-local ingest of the five accepted raws → `source.grid`; `python3 pipeline/icons/verify.py` proves registered catalog unchanged; CI `assets` job for full-catalog byte-identity after push |

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
| `sun-mote` | compact golden sun orb, four broad rays, forward light wedge | **r8b** (C2 scale rework; prior r3 was 22×22) | **28×26** |
| `mending-light` | healing cross of light shards around repaired heart seam | **r3** after clip (r1) and overshoot (r2) | **23×23** |
| `dawn-recall` | broken halo rejoining above upward soul flame | **r10c** (C2 scale rework; prior r2 was 17×24) | **27×29** |
| `war-hymn` | ceremonial bell, rising musical strokes, party-chevron base | **r8b** (C2 scale rework; prior r1 was 20×23) | **25×29** |
| `judgment` | descending radiant hammer-beam striking dark cracked seal | **r3** after raw-gate (r1) and clip (r2); safety-safe prompt retained identity | **21×26** |

Issue exact prompts were submitted as each family's **r1** (judgment r1 used a safety-safe paraphrase of the issue gavel/beam identity). Accepted provenance records the prompt that produced the accepted raw; `issue_prompt` preserves the verbatim issue text.

**C2 scale rework (PR #543):** `sun-mote`, `war-hymn`, and `dawn-recall` were re-acquired after Spec flagged preference underfill (long axis &lt; 26). New accepted candidates land long axis in **26–30**. `mending-light` (23×23) and `judgment` (long 26) were left unchanged per rework scope.

Provider cell samples can explode unique RGB counts past legend capacity. Promotion clusters opaque cells to ≤12 flat fills (threshold 28) and peels exterior near-outline ink before `cells_to_local_source`, matching the Ability prompt's 8–12 flat-colour intent. Cluster steps are recorded under `ingest.cluster` in each sidecar.

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| sun-mote-r1 | icon | fail | none | 32×30 | overshoot | shrink |
| sun-mote-r2 | icon | pass | none | 20×18 | advance (preference thin) | enlarge |
| sun-mote-r3 | icon | pass | none | 22×22 | advance (superseded by C2 rework) | enlarge |
| sun-mote-r4..r8a | icon | mix | mix | overshoot / clip / thin | preference / overshoot | parallel enlarge |
| sun-mote-r8b | icon | pass | none | 28×26 | advance | accept (C2 rework) |
| mending-light-r1 | icon | fail | bottom/left | — | clip-fail | add clearance |
| mending-light-r2 | icon | fail | none | 33×33 | overshoot | shrink |
| mending-light-r3 | icon | pass | none | 23×23 | advance | accept |
| dawn-recall-r1 | icon | fail | none | pitch y=0.039 | pitch-fail | strengthen grid shell |
| dawn-recall-r2 | icon | pass | none | 17×24 | advance (superseded by C2 rework) | enlarge |
| dawn-recall-r3..r10b | icon | mix | mix | thin / clip / overshoot | preference / clip / overshoot | parallel enlarge |
| dawn-recall-r10c | icon | pass | none | 27×29 | advance | accept (C2 rework) |
| war-hymn-r1 | icon | pass | none | 20×23 | advance (superseded by C2 rework) | enlarge |
| war-hymn-r2..r8a | icon | mix | mix | thin / underfill / overshoot | preference / overshoot | parallel enlarge |
| war-hymn-r8b | icon | pass | none | 25×29 | advance | accept (C2 rework) |
| judgment-r1 | icon | fail | — | border not flat magenta | raw-gate-fail | restate #ff00ff |
| judgment-r2 | icon | fail | bottom/left | — | clip-fail | add clearance + shrink |
| judgment-r3 | icon | pass | none | 21×26 | advance | accept |

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| sun-mote-r1 | overshoot | 32×30 |
| sun-mote-r2 | preference underfill (gate-pass) | 20×18 |
| sun-mote-r3 | preference underfill (gate-pass; C2 rework) | 22×22; superseded by r8b |
| sun-mote-r4 | clip-fail | all sides |
| sun-mote-r5 | clip-fail | bottom/left |
| sun-mote-r6 | overshoot | 35×34 |
| sun-mote-r7 | overshoot | 18×34 |
| sun-mote-r8a | overshoot | 33×31 |
| mending-light-r1 | clip-fail | bottom/left of raw canvas |
| mending-light-r2 | overshoot | 33×33 |
| dawn-recall-r1 | pitch-fail | y score 0.039 < 0.04 |
| dawn-recall-r2 | preference underfill (gate-pass; C2 rework) | 17×24; superseded by r10c |
| dawn-recall-r3..r9d / r10a/b/d | preference / clip / overshoot / underfill | durable rows in candidate table |
| war-hymn-r1 | preference underfill (gate-pass; C2 rework) | 20×23; superseded by r8b |
| war-hymn-r2..r8a | preference / underfill / overshoot | durable rows in candidate table |
| judgment-r1 | raw-gate-fail | border not flat `#ff00ff` |
| judgment-r2 | clip-fail | bottom/left of raw canvas |

Rejected provider raws were pruned from `scratch/` after promotion; durable record is the table above. Provider raws are evidence only — **nothing added to `assets-raw/`**.

## Step-6 visual review

Composite: [`priest-ability-sheet@8x.png`](./priest-ability-sheet@8x.png)
(left→right: sun-mote | mending-light | dawn-recall | war-hymn | judgment).

Initial acquisition subagent verdict: **accept** (identities + cohort).

C2 scale-rework subagent verdict: **accept**. Reworked `sun-mote` / `dawn-recall` /
`war-hymn` keep correct identities; fill aligns with the ~26–30 long-side cohort
alongside `judgment` (long 26). `mending-light` remains the intentional smaller
unchanged tile. No blocking defects.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Priest Ability review sheet: [`priest-ability-sheet@8x.png`](./priest-ability-sheet@8x.png) (+ 1× [`priest-ability-sheet.png`](./priest-ability-sheet.png))
- Per-icon @8× evidence previews: [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{sun-mote,mending-light,dawn-recall,war-hymn,judgment}/source.grid`
