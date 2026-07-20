# AutoSprite production-fit research

Research snapshot: 2026-07-17

## Question

What do AutoSprite's current API/MCP access, commercial terms, credit model,
exports, animation controls, consistency characteristics, and operational limits
imply for using it as the first generator behind a vendor-neutral, offline sprite
ingestion pipeline?

The project-specific constraint is unusually strict: each Party Member must ship
on a 32×48 canvas and render as exactly 32×48 screen pixels at 1× inside a fixed
480×112 Battle Tile. Character motion and Ability effects are separate assets.
Generation may happen during development, but the game must make no generator
calls at runtime and may ship only deterministic, validated local assets.

## Recommendation

**Conditional go for a small paid production trial; no-go as a direct-to-game or
runtime dependency.**

AutoSprite is a plausible *first candidate generator* because it has an HTTPS
API and MCP surface, accepts uploaded reference art, generates side-view preset
and custom actions, exports transparent PNG sheets plus atlas metadata, and can
re-extract an existing generated video at different square sizes without another
generation charge. Those capabilities fit an offline acquisition adapter well.

It is not yet proven fit for this game's final Character art. The documented API
accepts one scalar `frameSize` from 32–512, and its examples and responses use
square cells; it does not document a rectangular 32×48 export. AutoSprite also
makes strong consistency claims but publishes no measurable quality guarantee,
while its own tutorial acknowledges floaty/jittery motion, clipping/scale, and
background-removal problems. Exact throughput, download-URL lifetime, retention
period, deterministic seed/model pinning, and API schema/version guarantees are
not published.

Therefore:

1. Put AutoSprite behind a provider adapter used only by developer tooling.
2. Preserve every downloaded source file and a complete request/response
   manifest immediately; do not treat hosted URLs or the AutoSprite library as
   the archive.
3. Normalize selected frames offline into the project's own 32×48 contract,
   then validate and approve them before they enter the runtime asset tree.
4. Keep Character-body motion free of generated projectiles, trails, impacts,
   spell areas, buffs, and heals. Generate or author those through a separate
   effect-asset path and compose them in the game.
5. Do not commit to AutoSprite for the four-Class production set until a paid
   trial passes the acceptance gate proposed below and the vendor confirms the
   unresolved commercial and operational questions.

## Verified facts from official sources

### Access and integration surfaces

- AutoSprite publishes a REST API for characters, poses, animations,
  spritesheets, static/animated assets, jobs, and account credit balance. The API
  is plain HTTPS rather than a required language SDK. REST and MCP use the same
  API key. ([REST API hub](https://www.autosprite.io/api))
- MCP exposes character upload/creation, pose generation, sprite generation and
  regeneration, jobs, static assets, animated assets, and download lookup from
  supported coding assistants. ([MCP documentation](https://www.autosprite.io/docs/mcp))
- The current public pricing summary assigns 1,500 monthly credits, API/MCP
  access, and custom movesets to the $29/month Pro plan; Starter is listed at
  $12/month with 500 credits. ([Pricing](https://www.autosprite.io/pricing))
- The API's read endpoints are available to authenticated users, while write and
  generation endpoints require a paid subscription and return
  `403 PLAN_REQUIRED` otherwise. ([API errors, limits, and credits](https://www.autosprite.io/docs/api-overview))

**Documentation conflict:** the API and MCP overview pages sometimes say API
access is included with “a subscription plan,” while the pricing table and
credits reference specifically place API/MCP on Pro. The FAQ also contains an
older, incompatible credit/export description. The safe planning assumption is
**Pro is required**, but the exact account gate must be verified in a paid trial
or confirmed by AutoSprite before automating the pipeline.

### Credits and plan mechanics

- The detailed current spritesheet API prices each animation independently by
  video tier: `turbo` 5 credits, `pro` 10 credits, `ultra` 10 credits per second,
  and `max` 48 credits for the documented default clip. Direction variants are
  billed separately. ([Spritesheets API](https://www.autosprite.io/docs/api-spritesheets))
- The API reserves credits before work and refunds failed operations; partial
  batch failure receives a proportional refund. Re-extracting a spritesheet from
  its existing source video with different size/frame-count/removal settings is
  documented as free, whereas a redo creates a new generated video and consumes
  a free-redo allowance or credits. ([API limits and credits](https://www.autosprite.io/docs/api-overview),
  [Spritesheets API](https://www.autosprite.io/docs/api-spritesheets))
- The official credits reference currently describes Free at 15 monthly credits,
  Starter at 500, Pro at 1,500, and one-time credit packs. Purchased credits are
  stated not to expire. ([Credits and pricing reference](https://www.autosprite.io/docs/reference-credits))

These are budget inputs, not a production-cost forecast. AI redos and rejected
outputs will dominate the true cost, and the project's acceptable-output rate is
unknown until tested at 32×48.

### Character and animation controls

- A Character may start from a prompt or uploaded image. Official guidance says
  high-resolution inputs with a clear silhouette, distinct palette, tight crop,
  and simple background produce the best consistency. ([Create a Character](https://www.autosprite.io/docs/guide-create-character))
- For side-view use, the documented preset kinds are idle, walk, run, attack,
  and jump; custom animations accept a name and motion prompt. Side-view output
  faces right and can be mirrored by the game. Idle, walk, and run are looped;
  attack and jump are one-shots. ([Animation types](https://www.autosprite.io/docs/reference-animation-types))
- A spritesheet request accepts 1–10 animation entries. It controls video tier,
  clip duration within tier limits, 2–64 extracted frames, a 32–512 output
  `frameSize`, sound, default/ultra background removal, optional first- and
  last-pose IDs, loop behavior, and raw custom prompts. `ultra` and `max` do not
  support the documented seamless-loop/last-frame controls. ([Spritesheets API](https://www.autosprite.io/docs/api-spritesheets))
- Custom pose generation can establish a first or last animation frame. A pose
  prompt is limited to 600 characters and costs 5 credits under the current API
  reference. ([Poses API](https://www.autosprite.io/docs/api-poses))
- The browser's Advanced Mode supports reusable movesets and a matrix that
  separates first frame, optional last frame, animation video, and sheet
  extraction. Its extraction controls include frame size, frame cap, background
  removal, and a pixel-art filter. ([Advanced Mode](https://www.autosprite.io/docs/guide-advanced-mode))

For this game, the useful subset is side-view idle, short movement/step, weapon
attack, hurt, Knockout, and one or more Class-specific casting/technique body
motions. The latter three are custom actions and must be trialled; the published
preset list does not provide a production contract for them.

### Export and metadata

- Each API-generated animation produces a sheet that can be fetched as a PNG via
  `sheetUrl` and an atlas via `atlasUrl`. The spritesheet record exposes kind,
  name, Character ID, source-video ID, frame width/height, frame count, columns,
  loop markers, speed multiplier, and creation time. These are presigned download
  URLs. ([Spritesheets API](https://www.autosprite.io/docs/api-spritesheets))
- The documented downloadable format is a transparent PNG with uniform cells
  plus JSON containing frame coordinates, animation sequences, frame-rate/timing
  information, and sheet dimensions. The UI also documents full-character and
  individual-animation downloads; engine guidance describes ZIP exports with a
  sheet, atlas, and zero-padded individual frames. ([Export formats](https://www.autosprite.io/docs/reference-export-formats),
  [GameMaker integration](https://www.autosprite.io/docs/integration-gamemaker))
- Regeneration from the same source video can choose 4–64 frames, a scalar square
  size from 32–512, default/ultra background removal, sharpening, and either
  palette-quantized compression or full RGBA. ([Spritesheets API](https://www.autosprite.io/docs/api-spritesheets))

The API documentation does **not** establish that the hosted URLs are durable.
The word “presigned” implies temporary access, but their expiry is not stated.
Downloads therefore need to be copied and checksummed as part of the same
offline job that receives them.

### Consistency and demonstrated limitations

- AutoSprite claims that animations generated from one source preserve Character
  design, proportions, colors, and details, and that exports align pivots and
  baselines. ([AutoSprite product page](https://www.autosprite.io/))
- The official input guidance qualifies that claim: consistency is best with a
  high-resolution, tightly cropped source, clear silhouette, simple background,
  and distinct palette. ([Create a Character](https://www.autosprite.io/docs/guide-create-character))
- AutoSprite's own tutorial lists cut-off/undersized characters,
  floaty or jittery animation, and residual backgrounds as common issues, with
  cropping, regeneration, speed adjustment, higher contrast, or transparent
  input as remedies. ([Official tutorial](https://www.autosprite.io/blog/how-to-use-autosprite))

No official source provides a repeatability score, identity-drift metric,
palette guarantee, foot-lock tolerance, anchor/pivot tolerance, or success rate
at tiny pixel-art sizes. The consistency statements should be treated as product
claims to test, not as acceptance guarantees.

### Operational behavior and limits

- Generation is asynchronous: requests return job IDs, clients poll job status,
  and successful jobs return spritesheet IDs. Failed jobs expose an error and
  receive automatic credit refunds. ([Jobs API](https://www.autosprite.io/docs/api-jobs))
- Requests are rate-limited per user. A limit breach returns HTTP 429 with a
  `Retry-After` header. The official page does not publish numeric request,
  concurrency, or generation-queue limits. List endpoints use cursor pagination
  with a maximum page size of 50. ([API errors, limits, and credits](https://www.autosprite.io/docs/api-overview))
- Pricing differentiates queue priority by plan and reserves the highest API
  throughput for the enterprise tier, but publishes no SLA or throughput number.
  ([Pricing](https://www.autosprite.io/pricing))

This is acceptable for a manually triggered, resumable development pipeline. It
is unsuitable for a runtime or release-critical synchronous dependency.

### Ownership, commercial use, and privacy

- AutoSprite's terms say the user retains rights in inputs and, subject to law
  and third-party rights, owns generated outputs to the extent permitted by the
  inputs and third-party materials. AutoSprite receives a non-exclusive license
  to process and store content only to operate the service. ([Terms, sections 4–5](https://www.autosprite.io/terms))
- The same terms prohibit unauthorized third-party characters, logos, and other
  protected IP. They make no originality, non-infringement, uniqueness, or
  commercial-suitability warranty, and place that risk on the user. Third-party
  AI models may underlie generation. ([Terms, sections 7–9, 13, and 17](https://www.autosprite.io/terms))
- AutoSprite says it does not use uploads, prompts, or outputs to train or improve
  machine-learning models beyond providing the service. It does share content
  with contracted hosting/CDN and AI-inference processors as needed to operate
  the service. ([Privacy policy, sections 2–4](https://www.autosprite.io/privacypolicy))
- The privacy policy gives no fixed content-retention period: data is kept as
  long as necessary for service and legitimate business needs, then deleted or
  anonymized. Users may request account/content deletion. ([Privacy policy,
  sections 5 and 7](https://www.autosprite.io/privacypolicy))

The project's original-IP rule is compatible with these terms, but ownership is
not an indemnity. Prompts and source art should describe the project's own visual
language, not request “Ragnarok Online style” or reproduce its distinctive
characters, monsters, logos, places, or abilities. Production candidates still
need art review for accidental resemblance and provenance records for every
input.

## Implications for the 32×48 Battle Tile asset contract

### Direct fit

| Need | AutoSprite evidence | Consequence |
| --- | --- | --- |
| Side-view, right-facing Character motion | First-party side-view kinds and custom actions exist | Good acquisition fit; only one facing direction is needed |
| Exact 32×48 authored/normalized frame | API documents a single 32–512 `frameSize` and square examples/responses | **Direct mismatch.** A project-owned offline crop/pad/resample step is mandatory unless a trial reveals an undocumented rectangular export |
| No runtime downscaling | Local PNG/atlas downloads exist | Fit, provided only normalized local files enter runtime |
| Pixel-readable motion at 1× | Minimum export is 32 square; official guidance prefers high-resolution input and documents pixel-art filtering | Unknown quality. Compare native 32 extraction with higher-size extraction normalized offline; do not assume either is acceptable |
| Deterministic shipped assets | Downloadable static files exist | Fit only after copying, hashing, validating, versioning, and disconnecting them from provider IDs/URLs |
| Stable feet/anchors across actions | Marketing claims aligned pivots/baselines; engine docs still explain manual pivot correction | Must be independently measured and normalized |
| Character body separate from effects | Custom motion prompts and separate Asset APIs exist | Prompt body-only motions; ingest effects through a different asset type and timeline contract |

The production frame should be the project's **32×48 transparent canvas**, not
AutoSprite's cell. The provider adapter may accept any provider-native shape,
but normalization must place an approved silhouette into 32×48 without runtime
scaling, with a project-defined bottom-center foot anchor and per-action timing.

### Proposed vendor-neutral offline ingest boundary

The provider-specific acquisition result should be quarantined under a raw asset
area. For each generation, preserve:

- provider name, API surface, provider Character/pose/video/sheet/job IDs;
- UTC request time, endpoint/tool name, full prompts, source-image hash, uploaded
  source image, animation kind/name, pose references, loop choice, video tier,
  duration, frame count/size, removal, sharpening, and compression settings;
- exact JSON request and response bodies with secrets and signed query strings
  redacted;
- returned sheet, atlas, individual frames/ZIP when available, source/pose images,
  and source animation video when the service actually exposes it;
- SHA-256 hashes and byte sizes for every local raw file;
- the AutoSprite terms/privacy effective date reviewed for that acquisition.

The project-owned normalizer should output a provider-neutral manifest such as:

- asset identity and semantic action (`idle`, `basic_attack`, `cast`, `hurt`,
  `knockout`);
- exactly 32×48 RGBA frames for Party Members;
- frame order and integer millisecond durations;
- loop mode;
- bottom-center foot anchor and any hand/weapon/cast attachment anchors in
  32×48 coordinates;
- separate effect cue events (`release_projectile`, `impact`, `heal_pulse`) that
  reference other project assets rather than baking effects into body frames;
- source-generation manifest hash, normalizer version, output hashes, validator
  version, approval status, and reviewer/date.

Only the normalized, validated output belongs in the runtime asset bundle. The
runtime loader must understand this project manifest, never AutoSprite IDs,
schemas, URLs, keys, or credit state.

## Paid-trial acceptance gate

Use a deliberately small trial before generating the four-Class roster. One
weapon user and one caster are enough to expose the high-risk cases.

### Trial matrix

1. Upload project-owned, side-facing reference art with a simple or transparent
   background and a silhouette designed for eventual 32×48 use.
2. For the weapon user, generate idle, short advance/return, basic attack, hurt,
   and Knockout. For the caster, generate idle, cast/release, hurt, and Knockout.
3. Keep projectile, slash trail, impact, aura, and spell-area visuals out of all
   Character prompts. Separately test one static or animated effect candidate
   through AutoSprite's Asset path, without assuming it will share Character
   metadata or anchors.
4. For the same accepted videos, compare free re-extractions at 32, 64, and 128
   square with both compression modes and relevant background-removal settings.
   Normalize each candidate offline into 32×48; never judge only the large
   preview.
5. Repeat at least one generation from identical inputs and parameters to measure
   variation. Pose reuse should also be tested for idle-to-action continuity.

### Pass criteria at final 32×48/1× presentation

- The Class and action are readable during actual 480×112 Battle Tile playback,
  not merely frame-by-frame or zoomed.
- Head, weapon, hands, and feet do not clip the 32×48 canvas; the feet stay on the
  required baseline within a one-pixel tolerance unless the action intentionally
  jumps.
- Identity, body proportions, signature colors, equipment silhouette, and weapon
  handedness do not visibly drift within or across approved actions.
- Alpha edges contain no background boxes, large halos, or detached fragments at
  1×.
- Motion has no unacceptable shimmer, foot sliding, duplicate-frame stall,
  morphing weapon, or unintended camera motion after frame reduction.
- Body-only animations contain no inseparable projectile, impact, trail, aura,
  heal, or environmental effect.
- The normalizer can reproduce byte-identical runtime files from the same saved
  raw inputs and versioned settings without calling AutoSprite.
- A fresh importer run tolerates job polling, partial failures, 429 retry timing,
  expired hosted URLs (by using already archived local raw files), and an absent
  AutoSprite account.

Failing the silhouette, identity, transparency, or body/effect separation gates
after a bounded number of redos is a no-go for AutoSprite Character production,
even if it remains useful for motion reference or effect ideation.

## Unknowns requiring paid trial or vendor confirmation

These facts are not established in the reviewed official public material:

1. Whether Starter currently includes API/MCP or Pro is strictly required; the
   official pages use conflicting language.
2. Whether any UI, API, enterprise setting, or support workflow exports a true
   rectangular 32×48 frame instead of a square cell.
3. What “Standard,” “High,” and “Max” resolution mean by plan, and whether API
   `frameSize` availability is plan-gated.
4. Numeric request, concurrent-job, daily-generation, and queue-throughput limits
   for Pro; there is no published SLA.
5. Presigned sheet/atlas/pose URL expiry and whether source animation videos are
   downloadable through a stable supported endpoint.
6. Retention periods for uploads, prompts, videos, jobs, sheets, deleted content,
   and processor backups; account deletion propagation time.
7. Whether requests support idempotency keys, random seeds, fixed model versions,
   reproducible regeneration, webhooks, or a formal API/schema deprecation policy.
8. Whether atlas pivots/baselines are explicit data or only implied by uniform
   cells, and whether their coordinate convention is stable across export types.
9. Measured success rates for identity, handedness, weapon integrity, foot lock,
   transparency, and readable pixel art after normalization to 32×48.
10. Complete subprocessors, processing regions, and any enterprise data-handling
    commitments beyond the public privacy policy.
11. Whether output ownership survives account cancellation in a way that needs
    any additional license file or receipt retained with the project. The terms
    say ownership-related sections survive termination, but vendor confirmation
    is prudent for a commercial production archive.

## Go/no-go decision

**Go now:** authorize only a capped Pro-plan trial and build the first acquisition
adapter as disposable development tooling. Preserve raw artifacts and prompts,
then judge normalized 32×48 frames in the real Battle Tile.

**Do not go yet:** do not standardize all four Classes, purchase high-volume
credits, design runtime code around AutoSprite's atlas, or depend on its hosted
library until the paid trial passes and the high-priority unknowns—rectangular
normalization quality, API plan access, URL lifetime, throughput, and retention—
are answered.

**Fallback:** if Character motion fails the 32×48 gate, retain the same
provider-neutral manifest and validator. Swap AutoSprite for another generator,
hand-authored sprites, or an artist cleanup workflow without changing combat or
runtime asset loading. AutoSprite may still serve as motion reference or a source
of separately reviewed effect concepts.
