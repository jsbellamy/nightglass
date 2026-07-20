# ComfyUI production-fit research

Research snapshot: 2026-07-17

## Question

Can a local ComfyUI installation on an RTX 5090 become the primary or a
complementary generator behind this project's vendor-neutral, offline asset
ingestion pipeline?

The production constraint is strict: each Party Member ships as deterministic
32×48 RGBA frames and displays at exactly 1× in a fixed 480×112 Battle Tile.
Character-body motion is separate from projectiles, trails, impacts, spell areas,
buffs, and heals. No model, generator, or ComfyUI component is called by the game
at runtime.

## Recommendation

**Conditional go as the preferred local experimentation and acquisition
workbench; not yet proven as the sole production Character-animation source.**

Run the bounded RTX 5090 trial below before paying for an AutoSprite trial. The
hardware is unusually capable for this job: NVIDIA specifies 32 GB of GDDR7 for
the RTX 5090, while current ComfyUI supports NVIDIA through stable PyTorch/CUDA
13.0 and uses dynamic VRAM/offloading for models larger than available VRAM.
([RTX 5090 specifications](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/),
[ComfyUI system requirements](https://docs.comfy.org/installation/system_requirements),
[ComfyUI memory options](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/cli_args.py))

ComfyUI is a better strategic fit than a hosted sprite generator for privacy,
per-run marginal cost, inspectable workflows, model choice, reference/pose
control, and long-term independence. It is a worse turnkey fit: it does not
provide a first-party “Character plus named actions to validated spritesheet”
contract. The project must design workflows, curate outputs, and own every
normalization, timing, anchor, provenance, and validation step.

Recommended division of labor:

1. Use local ComfyUI first for original-IP concept exploration, canonical
   Character references, pose-conditioned key frames, effects, alpha masks, and
   animation candidates.
2. Prefer core ComfyUI nodes and native model integrations. Admit a custom node
   only after source, license, dependency, and pinned-commit review.
3. Keep ComfyUI behind the same development-only provider boundary proposed for
   AutoSprite. Archive raw outputs and generation manifests; normalize with a
   project-owned tool outside ComfyUI.
4. If the local trial passes, make ComfyUI the primary acquisition source and
   retain AutoSprite as a small comparative motion trial. If motion consistency
   fails, keep ComfyUI for static art/effects and use AutoSprite, an artist, or
   another tool for Character motion.

## Verified facts

### Current local install and RTX 5090 fit

- ComfyUI supports Windows and Linux. Its current requirements recommend Python
  3.13, with Python 3.12 as a fallback for custom-node compatibility, and direct
  NVIDIA installation through stable PyTorch built for CUDA 13.0. Windows
  Desktop is still described as beta and follows stable releases; portable or a
  manual virtual-environment install receives newer changes sooner.
  ([System requirements](https://docs.comfy.org/installation/system_requirements),
  [Windows Desktop](https://docs.comfy.org/installation/desktop/windows))
- The RTX 5090 is Blackwell, CUDA capability 12.0, with 32 GB GDDR7 and 1,792
  GB/s memory bandwidth. NVIDIA says Blackwell CUDA support began with CUDA 12.8;
  current ComfyUI instructions have moved to stable CUDA 13.0 PyTorch packages.
  ([RTX 5090 specifications](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/),
  [NVIDIA Blackwell compatibility guide](https://docs.nvidia.com/cuda/archive/12.8.1/pdf/Blackwell_Compatibility_Guide.pdf),
  [ComfyUI system requirements](https://docs.comfy.org/installation/system_requirements))
- ComfyUI exposes dynamic VRAM, async weight offloading, reserved-VRAM,
  low/no-VRAM, cache, attention, precision, and deterministic-algorithm options.
  Its `--deterministic` help explicitly warns that deterministic algorithms may
  still not make every image deterministic.
  ([Core command-line arguments](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/cli_args.py),
  [Troubleshooting and performance options](https://docs.comfy.org/troubleshooting/overview))
- The official Wan2.2 native guide says its 5B text/image-to-video model can fit
  on 8 GB VRAM with native offloading. Thus 32 GB is ample for that documented
  baseline, but it does not prove every 14B video workflow, precision, resolution,
  custom-node stack, or batch will fit without CPU/RAM offload.
  ([Wan2.2 native workflow](https://docs.comfy.org/tutorials/video/wan/wan2_2))

**Inference:** start with a clean manual virtual environment or current portable
build, current NVIDIA Studio driver, stable CUDA 13.0 PyTorch, and core nodes.
Do not begin with nightly PyTorch, SageAttention, Triton patches, or a large
custom-node bundle. The initial Blackwell workarounds are now historical context,
not the current default install path; optimization layers add variables before
quality and repeatability are measured.

### Workflow, API, queue, history, and outputs

- A ComfyUI workflow is a graph stored as human-readable JSON. Generated images
  normally embed the workflow, and JSON files can be independently archived and
  versioned. ([Workflow documentation](https://docs.comfy.org/development/core-concepts/workflow))
- Local ComfyUI accepts an API-format workflow at `POST /prompt`, validates it,
  queues it, and returns a `prompt_id`. `/queue`, `/history`,
  `/history/{prompt_id}`, `/view`, `/upload/image`, `/object_info`, model-listing,
  and system-stat routes support orchestration; `/ws` reports progress,
  completion, and errors.
  ([Server routes](https://docs.comfy.org/development/comfyui-server/comms_routes),
  [Server overview](https://docs.comfy.org/development/comfyui-server/comms_overview))
- Core launch arguments can set explicit input, output, temporary, base, model,
  port, and CUDA-device paths, and can disable browser auto-launch. The official
  CLI can install, launch, snapshot, bisect, and manage nodes, and can inspect
  workflow dependencies.
  ([Core command-line arguments](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/cli_args.py),
  [comfy-cli repository](https://github.com/Comfy-Org/comfy-cli))
- ComfyUI re-executes only graph portions whose inputs changed, which is useful
  for repeatable prompt/seed/pose matrices but means cache policy is part of the
  operational environment.
  ([ComfyUI repository](https://github.com/Comfy-Org/ComfyUI))

This is enough to build a local acquisition adapter without custom HTTP nodes:
submit a pinned API-workflow JSON, watch its prompt ID, fetch history/output
records, copy raw outputs into the project archive, then invoke the project
normalizer. The game and runtime asset loader never speak to ComfyUI.

### Reproducibility and provenance

- The core KSampler records seed, steps, CFG, sampler, scheduler, positive and
  negative conditioning, latent input, and denoise strength. The official docs
  describe the seed as the random-noise control for reproducible results.
  ([KSampler documentation](https://docs.comfy.org/built-in-nodes/sampling/ksampler))
- PNG outputs can embed the complete submitted prompt and workflow information;
  workflow JSON is also independently exportable.
  ([Workflow documentation](https://docs.comfy.org/development/core-concepts/workflow),
  [output-node metadata](https://docs.comfy.org/custom-nodes/v3_migration))
- ComfyUI Manager can save and restore installation snapshots, but its own
  documentation says snapshot coverage is incomplete for custom nodes not
  managed by Git. ([ComfyUI Manager](https://github.com/Comfy-Org/ComfyUI-Manager))

**Inference:** workflow JSON plus seed is necessary but not a sufficient
production provenance record. The project must also archive:

- ComfyUI core version and Git commit; frontend version only if it affects the
  exported workflow;
- Python, PyTorch, CUDA runtime, NVIDIA driver, operating system, precision and
  all launch flags;
- every custom-node repository URL and exact commit, plus a locked Python
  dependency set;
- exact model, VAE, text encoder, ControlNet, reference adapter, LoRA,
  segmentation model, and upscaler filenames, licenses, source URLs, and SHA-256
  hashes;
- UI workflow JSON and API-format workflow JSON; full positive/negative prompts,
  seeds, sampler, scheduler, step count, guidance, denoise, dimensions, batch,
  reference inputs, masks, pose maps, and node parameters;
- the raw API request/response, prompt ID, logs, elapsed time, peak VRAM/RAM,
  output files, and their SHA-256 hashes.

Use `--deterministic` during the trial, but define reproduction as
**byte-identical normalization from archived raw media**, not necessarily
byte-identical regeneration after a CUDA, PyTorch, node, or model change. The
core flag itself does not promise universal image determinism.
([Core command-line arguments](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/cli_args.py))

### Character identity and action control

The locally available control stack is capable but compositional:

- Core ComfyUI supports LoRA loading. LoRA is a compact fine-tuning approach,
  suitable for adapting a base model to a Character or art direction, but the
  base model, training tool, training images, and resulting LoRA each need their
  own provenance and license review.
  ([ComfyUI LoRA guide](https://docs.comfy.org/tutorials/basic/lora))
- Core ComfyUI supports ControlNet conditioning and permits multiple controls.
  Official examples describe sketch, edge, depth, and pose-like conditions as
  ways to constrain composition and structure. ControlNet's official code is
  Apache-2.0; individual downloaded weights remain separate artifacts whose
  licenses must also be checked.
  ([ComfyUI ControlNet guide](https://docs.comfy.org/tutorials/controlnet/controlnet),
  [ControlNet repository](https://github.com/lllyasviel/ControlNet))
- IP-Adapter conditions a diffusion model on reference imagery. Its official
  model repository is Apache-2.0, but it inherits compatibility constraints from
  the chosen base model.
  ([IP-Adapter model card](https://huggingface.co/h94/IP-Adapter))
- Image-to-image and masks can retain a canonical reference while changing pose
  or action, and ComfyUI represents alpha-derived masks as first-class workflow
  inputs. ([Image-to-image guide](https://docs.comfy.org/tutorials/basic/image-to-image),
  [image and mask data](https://docs.comfy.org/custom-nodes/backend/images_and_masks))

**Recommended consistency ladder (inference):** begin with a project-owned
canonical side-view reference, fixed prompt vocabulary, identical palette and
silhouette constraints, pose/sketch ControlNet, and reference-image conditioning.
Only train a Character LoRA from project-owned, approved images if this cheaper
stack still drifts. Evaluate identity at final 32×48, because consistency in a
large preview can disappear during quantization.

### Animation and temporal consistency

- Core ComfyUI has native Wan image-to-video nodes and official Wan2.2 workflows.
  Wan2.2 offers 5B hybrid and 14B image-to-video variants; the official model and
  ComfyUI guide state Apache-2.0 and commercial use. The 5B workflow exposes
  starting image, dimensions, and frame length.
  ([Wan2.2 ComfyUI workflow](https://docs.comfy.org/tutorials/video/wan/wan2_2),
  [Wan2.2 5B model card](https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B))
- Wan-Move adds point-trajectory control for image-to-video, while Wan Fun
  Control can condition generation on a control video and preserve output FPS.
  The documented Fun Control path requires custom video and pose-preprocessor
  nodes for some workflows.
  ([Wan-Move workflow](https://docs.comfy.org/tutorials/video/wan/wan-move),
  [Wan Fun Control workflow](https://docs.comfy.org/tutorials/video/wan/fun-control))
- AnimateDiff-Evolved is an Apache-2.0 custom-node project supporting ControlNet,
  IP-Adapter, motion LoRAs, and cross-context consistency techniques, but it also
  depends on a wider custom-node and motion-model ecosystem. Its author warns
  that some motion models reproduce training-data watermarks.
  ([AnimateDiff-Evolved repository](https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved))

**Inference:** video generation is useful for discovering body mechanics and
extracting candidate frames, but “smooth video” is not the acceptance target.
At 32×48, interpolation, camera motion, texture crawl, weapon morphing, and
subpixel movement can be worse than a deliberately authored 4–8 frame action.
The trial should compare two paths:

1. pose-conditioned individual key frames with explicit timing; and
2. short image-to-video motion, sampled into a small number of selected frames.

Neither path is assumed to produce a final sheet without manual selection and
offline normalization.

### Pixel art, spritesheets, alpha, and effect separation

ComfyUI is an image/video workflow engine, not a validated spritesheet exporter.
Its core nodes can generate and save images, animated PNG, and lossless animated
WebP, while output dimensions and image batches are graph inputs. The project
still owns frame selection, grid packing, durations, anchors, semantic events,
palette, and validation.
([Output helpers](https://docs.comfy.org/custom-nodes/v3_migration),
[workflow model](https://docs.comfy.org/development/core-concepts/workflow))

For transparent output, recent core ComfyUI includes native BiRefNet background
removal producing RGBA plus a mask; Comfy-Org describes the repackaged weights as
MIT-licensed. By contrast, BRIA RMBG-2.0's self-hosted weights are explicitly
non-commercial without a separate agreement, so they should not enter this
commercial pipeline by default.
([ComfyUI BiRefNet workflow](https://docs.comfy.org/tutorials/utility/remove-background-birefnet),
[Comfy-Org BiRefNet model card](https://huggingface.co/Comfy-Org/BiRefNet),
[BRIA RMBG-2.0 model card](https://huggingface.co/briaai/RMBG-2.0))

**Recommended acquisition layout (inference):** generate at a larger, aspect-
matched working canvas such as 256×384 or 512×768, with nearest-neighbor/palette
normalization tested outside ComfyUI. This is development-time reduction, not
runtime downscaling. Compare it with generation closer to target size; do not
assume a larger source preserves readable one-pixel features.

Character workflows must request **body-only motion**. Weapons that define the
fixed Class silhouette may remain in the Character frames, but slash trails,
arrows/projectiles, impacts, cast circles, auras, heals, and environmental light
belong to separate effect workflows and runtime layers. The Character manifest
can emit semantic cues such as `release_projectile` or `impact_expected`; it
must not bake the effect into the body frames.

## Vendor-neutral offline boundary

Treat ComfyUI as another acquisition provider. Its raw bundle should contain the
provenance record above plus canonical references, pose maps, masks, raw large
frames, source videos, extracted frames, and licenses. The provider-neutral
normalizer then:

1. selects an approved frame sequence;
2. removes or applies alpha, with no detached fragments or background halo;
3. crops/pads and, when explicitly approved, reduces the source offline;
4. quantizes to the approved palette without stochastic dithering;
5. places every Party Member frame on exactly a 32×48 RGBA canvas;
6. enforces the bottom-center foot anchor and optional hand/weapon/cast anchors;
7. records integer millisecond durations, loop mode, action name, and effect-cue
   times;
8. rejects embedded effects, clipping, unexpected colors, non-RGBA output,
   incorrect dimensions, unstable baseline, or unapproved alpha;
9. emits a provider-neutral manifest plus hashes; and
10. reproduces byte-identical runtime files from the archived raw bundle with no
    ComfyUI installation or model present.

Only the final normalized bundle enters the game. Comfy workflow JSON, model
names, node types, prompt IDs, and Python dependencies never enter the runtime
asset API.

## Security and maintenance

- ComfyUI's official documentation warns that custom nodes are executable
  community code that can compromise the system. Manager installation clones a
  repository, installs its Python requirements, and may execute its `install.py`.
  Dependency conflicts between node packs are explicitly acknowledged.
  ([Custom-node security guidance](https://docs.comfy.org/installation/install_custom_node),
  [Manager publishing behavior](https://docs.comfy.org/custom-nodes/backend/manager))
- Manager's default `normal` security level limits installs to registered nodes
  and models. Its protected manager directory was introduced because older
  remotely reachable configurations could be tampered with. The docs specifically
  distinguish localhost-only use from `--listen 0.0.0.0` exposure.
  ([Manager security migration](https://github.com/Comfy-Org/ComfyUI-Manager/blob/main/docs/en/v3.38-userdata-security-migration.md))
- ComfyUI follows a frequent release cycle, and Desktop stable can lag newer core
  functionality. ([ComfyUI repository](https://github.com/Comfy-Org/ComfyUI),
  [system requirements](https://docs.comfy.org/installation/system_requirements))

Operational policy:

- Bind only to `127.0.0.1`; do not enable permissive CORS or expose port 8188.
- Use a dedicated virtual environment and non-sensitive OS account/workspace.
- Prefer safetensors; review every model card and license at the exact revision.
- Start core-only. For each admitted custom node, review code/install scripts,
  pin the commit, hash it, lock dependencies, and scan before execution.
- Maintain one known-good frozen environment for production acquisitions and a
  disposable update environment for evaluating upgrades.
- Disable automatic bulk updates. Re-run the acceptance matrix before promoting
  any ComfyUI, PyTorch, CUDA, model, or node change.
- Keep original-IP source art outside any workflow containing hosted partner/API
  nodes; a “ComfyUI node” is not necessarily local inference.

## Commercial original-IP license gate

ComfyUI core is GPL-3.0, but the production license review cannot stop there:
every base model, adapter, ControlNet weight, LoRA, VAE, text encoder,
segmentation model, custom node, and training dataset has independent terms.
([ComfyUI repository](https://github.com/Comfy-Org/ComfyUI))

Known candidate examples:

| Artifact | Verified license signal | Planning consequence |
| --- | --- | --- |
| FLUX.1-schnell | Apache-2.0; official card expressly permits commercial use | Plausible clean baseline for static exploration; quality/consistency at tiny pixel output still unproven |
| SDXL base 1.0 | CreativeML Open RAIL++-M; licensor claims no rights in compliant output but use restrictions apply | Usable only with retained license and restriction review |
| IP-Adapter weights | Apache-2.0 | Adapter license is acceptable, but the base-model license still governs the combined workflow |
| ControlNet code | Apache-2.0 | Each ControlNet weight and preprocessor dependency needs separate review |
| Wan2.2 5B | Apache-2.0; official model card claims no rights over lawful generated content | Strong local animation-trial candidate |
| Comfy-Org BiRefNet | MIT | Preferred first alpha-mask candidate |
| BRIA RMBG-2.0 self-hosted | Non-commercial absent separate agreement | Exclude from commercial production by default |

Sources: [FLUX.1-schnell model card](https://huggingface.co/black-forest-labs/FLUX.1-schnell/blob/main/README.md),
[SDXL license](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md),
[IP-Adapter model card](https://huggingface.co/h94/IP-Adapter),
[ControlNet repository](https://github.com/lllyasviel/ControlNet),
[Wan2.2 model card](https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B),
[BiRefNet model card](https://huggingface.co/Comfy-Org/BiRefNet), and
[BRIA RMBG-2.0 model card](https://huggingface.co/briaai/RMBG-2.0).

No cited license is an originality or non-infringement warranty. Use only
project-owned references and training images; never prompt for Ragnarok Online,
its characters, monsters, locations, logos, or distinctive art style. Archive
the license text/revision with every raw acquisition and review accepted output
for accidental resemblance.

## Cost and operations compared with AutoSprite

| Dimension | Local ComfyUI on owned RTX 5090 | AutoSprite Pro |
| --- | --- | --- |
| Marginal generation cost | Electricity, storage, and operator time; no per-generation vendor credits | Subscription plus credits/redos |
| Privacy | Can remain fully local with core/local nodes | Inputs and outputs processed by vendor and subprocessors |
| Reproducibility controls | Workflow JSON, explicit seeds/settings, pinned models/nodes; still not universally bit-deterministic | Public API does not document seed/model pinning |
| Character/action convenience | Workflow must be designed and curated | Purpose-built Character, pose, named/custom action, video, and sheet flow |
| Exact 32×48 contract | Project normalizer required | Project normalizer also required because documented cells are square |
| Animation consistency | Many controllable approaches, but no turnkey guarantee | Vendor claims consistency, but trial remains required |
| Maintenance | Significant: drivers, Python, PyTorch, models, custom nodes, licenses | Vendor maintains generator; project absorbs API/retention/vendor risk |
| Offline independence | Strong after models are downloaded and environment is frozen | Strong only after returned assets are archived |

**Inference:** ComfyUI's true cost is engineering and art-direction time, not GPU
access. The owned RTX 5090 removes the largest hardware barrier, but the project
should budget periodic environment maintenance, model storage, prompt/pose
curation, and manual cleanup. AutoSprite may still win on operator time if its
acceptance rate is materially higher.

## Bounded RTX 5090 trial

### Fixed inputs

- One original weapon user with a fixed weapon silhouette.
- One original caster with a readable hand/casting silhouette.
- One project-owned canonical, right-facing reference per Character, plus a
  small approved palette and rough pose guides.
- Body actions: `idle`, `basic_attack` or `cast`, `hurt`, and `knockout`.
- Separate effects: one slash/impact pair and one projectile/impact spell pair.
- Final review occurs only in the real 480×112 Battle Tile at 1×.

### Matrix

| Axis | Weapon user | Caster |
| --- | --- | --- |
| Static baseline | 8 fixed-seed candidates from a commercially acceptable base model | Same |
| Reference control | Canonical reference only; reference + pose ControlNet; reference + pose + image-to-image | Same |
| Motion path A | 4–8 pose-conditioned key frames for idle and attack | 4–8 pose-conditioned key frames for idle and cast |
| Motion path B | Short Wan2.2 5B image-to-video, then extract 4, 6, and 8 frames | Same |
| Working resolution | Compare 256×384 and 512×768 source normalization | Same |
| Alpha | Controlled flat background/mask; BiRefNet RGBA | Same |
| Repeatability | Re-run one frozen API workflow twice with same environment and seed | Same |
| Effects | Generate slash and impact separately; no effect in body frames | Generate projectile and impact separately; no effect in body frames |

Cap the trial at two base-model families, one reference adapter, one ControlNet
family, native Wan2.2 5B, BiRefNet, and at most one reviewed custom-node pack.
Do not train a LoRA in phase one. Only add a small Character LoRA phase if the
reference-plus-pose path narrowly fails identity consistency while action
readability and normalization otherwise pass.

Record setup time, generation time, peak VRAM/RAM, raw disk use, accepted outputs
per attempted output, manual cleanup minutes per accepted action, and normalized
Battle Tile screenshots/video.

### Pass criteria

- Both Characters and their actions read immediately at 32×48/1× in the
  480×112 Battle Tile, including with five ordinary opponents present.
- Every normalized frame is exactly 32×48 RGBA; the feet remain within one pixel
  of the bottom-center baseline unless intentionally airborne.
- Head, hands, feet, weapon, and casting silhouette do not clip.
- Signature palette, proportions, facing, weapon handedness, and equipment
  silhouette do not visibly drift across approved actions.
- No unacceptable shimmer, texture crawl, foot sliding, morphing weapon/limb,
  duplicate-frame stall, or camera movement survives final frame reduction.
- Body frames contain no inseparable projectile, trail, impact, aura, heal, cast
  circle, or environmental effect.
- Alpha has no background rectangle, material halo, detached debris, or missing
  interior pixels at 1×.
- The same archived raw bundle and normalizer version reproduce byte-identical
  runtime PNGs/manifests without ComfyUI.
- The frozen Comfy API workflow completes headlessly through queue/history/output
  endpoints and records complete provenance.
- All accepted models, weights, nodes, and inputs pass the commercial license and
  original-IP review.
- Median hands-on cleanup is no more than 30 minutes per accepted body action;
  otherwise the process is not yet scalable for four Classes.

### Decision after trial

- **Primary local source:** both Characters pass body-motion, alpha, readability,
  provenance, and cleanup gates. Continue with ComfyUI and compare AutoSprite
  only on a small identical action set.
- **Complementary source:** static references/effects pass, but Character motion
  fails consistency or cleanup. Keep ComfyUI for concept/key-frame/effect work
  and trial AutoSprite or artist-assisted motion through the same normalizer.
- **No-go for production assets:** even static identity/readability or license
  provenance fails. Retain ComfyUI only for disposable ideation and prohibit its
  outputs from the runtime tree.

## Unknowns requiring the local trial

1. The user's exact OS, driver, RAM, storage speed, power/thermal behavior, and
   whether current stable CUDA 13.0 PyTorch installs cleanly on this machine.
2. Measured throughput, peak VRAM/RAM, power, heat, disk footprint, and crash rate
   for the chosen static and Wan2.2 workflows.
3. Which commercially acceptable base model best preserves this original art
   direction after reduction to 32×48.
4. Whether reference conditioning plus pose ControlNet is sufficient across all
   actions, or a project-owned Character LoRA is required.
5. Whether per-frame key poses or video extraction produces less drift and
   cleanup at final size.
6. Whether BiRefNet alpha survives palette quantization without halos or whether
   controlled-background chroma/mask authoring is better.
7. Whether fixed seeds are pixel-identical across repeated runs in the frozen
   environment and how outputs change after any stack upgrade.
8. Whether one reviewed custom-node pack adds enough value to justify its
   dependency and security cost.
9. The acceptable palette size, animation frame counts/timings, and exact
   attachment-anchor set, which belong to the later animation asset contract.
10. Whether the manual cleanup threshold is economically preferable to
    AutoSprite credits and operator time.

## Final fit decision

ComfyUI is a **go for a local proof-of-fit and is the stronger long-term platform
candidate**, especially because an RTX 5090 is already available. It is a
**conditional go for shipped art**, contingent on the bounded weapon-user/caster
trial. It is a **no-go as a runtime or direct-to-game dependency**.

The most valuable outcome is not a particular model or node graph. It is the
project-owned acquisition archive, exact 32×48 normalizer, validator, and
provider-neutral manifest. Those assets let ComfyUI, AutoSprite, an artist, or a
future generator compete on quality without changing the game.
