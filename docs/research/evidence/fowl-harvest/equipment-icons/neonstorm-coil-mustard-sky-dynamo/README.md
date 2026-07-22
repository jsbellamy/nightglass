# Evidence: #395 Neonstorm Coil and Mustard-Sky Dynamo

Isolated, unregistered `fowl-harvest-24` Wizard focus Equipment icon source
families (Tier III Neonstorm Coil; Tier IV Mustard-Sky Dynamo). Same Equipment
icon pipeline geometry (CANVAS 34 / DRAWABLE 32). This slice writes text-grid
sources and acquisition evidence only — no registry entry, runtime PNG, preview
under `src/assets/icons/`, manifest, EquipmentBaseDef, Armory mapping, or UI.

Tier IV is an independent silhouette, never a recolor of Tier III.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Equipment Base icon) |
| Status | candidate for shipping (unregistered interim) |
| Runtime destination | deferred — later activation slice (#412); sources at `src/assets/icon-sources/<key>/` |
| Runtime shape | 34×34 RGBA when activated; derived `oil-ink` outline |
| Visual vocabulary | `fowl-harvest-24`; per-family `palette_subset` in each `source.json` |
| Geometry | Icon contract Fowl shell; long-side preference 26–30; gates in `pipeline/icons/constants.py` |
| Review context | [`wizard-fowl-equipment-sheet@8x.png`](./wizard-fowl-equipment-sheet@8x.png) |
| Validator | targeted Fowl-qualified ingest of the two accepted raws → `source.grid` (byte-identical re-ingest); `python3 pipeline/icons/verify.py` proves existing registered catalog unchanged (new families are unregistered); CI `assets` job for full-catalog byte-identity after push |

## Style cohort (shared)

| Path | Role |
| --- | --- |
| `docs/research/evidence/126-equipment-icons/accepted-raws/dewlight-focus.png` | Wizard focus Equipment grid cohort |
| `docs/research/evidence/126-equipment-icons/accepted-raws/moonpetal-relic.png` | focus Equipment peer |
| `src/assets/icons/verify-fowl-canary.png` | `fowl-harvest-24` palette / outline canary |

## Exact issue prompts

Both issue-body prompts were submitted as candidate **r1** via Cursor
`GenerateImage`. Verbatim issue prompts + `prompt_sha256` are archived in
[`issue-exact-prompts.json`](./issue-exact-prompts.json) and copied onto each
accepted `.source.json` / `source.json` as `issue_exact_prompt` /
`issue_exact_prompt_sha256`. Accepted provenance also stores the
**accepted-candidate prompt** (gate-retry variants).

| iconKey | Exact prompt submitted as | Accepted candidate | `prompt_sha256` (issue-exact) |
| --- | --- | --- | --- |
| `neonstorm-coil` | r1 (exact) | **r5** (flat-color lock after overshoot / off-ramp / clip) | see `issue-exact-prompts.json` |
| `mustard-sky-dynamo` | r1 (exact) | **r6** (enlarge after off-ramp / clip / underfill) | see `issue-exact-prompts.json` |

## Original sample + identity

| iconKey | Intended read | Accepted | Recovered |
| --- | --- | --- | --- |
| `neonstorm-coil` | chrome induction coil, diner-teal winding, warning-red indicator (Tier III) | **r5** | **13×21** |
| `mustard-sky-dynamo` | squat storm-slate generator, mustard rotor, teal prongs (Tier IV) | **r6** | **17×20** |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| neonstorm-coil-r1 | icon | fail | none | overshoot 33×30 | overshoot | shrink + clearance |
| neonstorm-coil-r2 | icon | pass geom | none | 24×27; far 40.2% | off-ramp | exact hex materials |
| neonstorm-coil-r3 | icon | pass geom | none | 23×27; far 23.4% | off-ramp | stronger RGB lock |
| neonstorm-coil-r4 | icon | fail | bottom/left | — | clip-fail | clearance + flat colors |
| neonstorm-coil-r5 | icon | pass | none | 13×21; far 17.6% | advance | accept |
| mustard-sky-dynamo-r1 | icon | pass geom | none | 25×28; far 24.0% | off-ramp | exact on-palette names |
| mustard-sky-dynamo-r2 | icon | pass geom | none | 22×25; far 28.1% | off-ramp | hex lock + swatch strip |
| mustard-sky-dynamo-r3 | icon | fail | bottom/left | — | clip-fail | clearance |
| mustard-sky-dynamo-r4 | icon | fail | all sides | — | clip-fail | shrink into magenta |
| mustard-sky-dynamo-r5 | icon | fail | none | long axis 19 | underfill | enlarge |
| mustard-sky-dynamo-r6 | icon | pass | none | 17×20; far 15.6% | advance | accept |

Scratch measurement JSONs: [`scratch/`](./scratch/).

## Rejected candidates

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| neonstorm-coil-r1 | overshoot | recovered 33×30 |
| neonstorm-coil-r2 | off-ramp | far 40.2% (cool steel / mint-cyan) |
| neonstorm-coil-r3 | off-ramp | far 23.4% |
| neonstorm-coil-r4 | clip-fail | clipped bottom/left |
| mustard-sky-dynamo-r1 | off-ramp | far 24.0% |
| mustard-sky-dynamo-r2 | off-ramp | far 28.1% |
| mustard-sky-dynamo-r3 | clip-fail | clipped bottom/left |
| mustard-sky-dynamo-r4 | clip-fail | clipped all sides |
| mustard-sky-dynamo-r5 | underfill | long axis 19 |

Rejected provider raws were pruned from `scratch/`; durable record is the table
above plus candidate-report JSON. Provider raws are evidence only — **nothing
added to `assets-raw/`**.

## Step-6 visual review

Composite: [`wizard-fowl-equipment-sheet@8x.png`](./wizard-fowl-equipment-sheet@8x.png)
(left→right: neonstorm-coil | mustard-sky-dynamo).

Subagent verdict: **accept**. neonstorm-coil reads as a compact upright storm-slate
cylinder with diner-teal windings and a tiny warning-red indicator; mustard-sky-dynamo
reads as a squat storm-slate housing with mustard rotor and teal prongs. The pair is
separated by form (tall cylinder vs low mechanical block), not a recolor. No
Character / duck / scene / UI-frame read.

## Artifacts

- Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/)
- Issue-exact prompt archive: [`issue-exact-prompts.json`](./issue-exact-prompts.json)
- Ingest report: [`ingest-report.json`](./ingest-report.json)
- Wizard Fowl Equipment review sheet: [`wizard-fowl-equipment-sheet@8x.png`](./wizard-fowl-equipment-sheet@8x.png)
- Per-icon @8× copies (evidence only): [`previews/`](./previews/)
- Unregistered text sources: `src/assets/icon-sources/{neonstorm-coil,mustard-sky-dynamo}/`
