# Research AutoSprite's production fit

Type: research
Status: resolved
Blocked by: none

## Question

What do AutoSprite's current API/MCP access, commercial terms, credit model, exports, animation controls, consistency characteristics, and operational limits imply for using it as the first generator behind a vendor-neutral sprite ingestion pipeline?

## Answer

The full primary-source findings are captured in
[AutoSprite production-fit research](../../../docs/research/autosprite-production-fit.md).

The decision is a **conditional go for one capped Pro-plan proof-of-fit; no-go as
a direct production, build-time, or runtime dependency**.

- AutoSprite is a plausible first candidate generator because it offers REST and
  MCP access, uploaded Character references, side-view preset and custom
  animations, reusable poses/movesets, asynchronous jobs, transparent PNG plus
  atlas exports, and free re-extraction from an existing generated video.
- The live pricing page currently puts API/MCP on Pro at $29/month with 1,500
  monthly credits. Official docs contain conflicting generic “subscription plan”
  language, so Pro is the safe trial assumption.
- Animation generation currently costs 5 credits at the default turbo tier;
  redos consume allowances or more credits. True production cost depends on the
  unknown acceptance rate, not the headline spritesheet count.
- AutoSprite documents square 32–512px cells, while Party Members require an
  exact 32×48 runtime canvas. Its own guidance prefers high-resolution inputs
  and acknowledges minor identity drift, jitter, clipping/scale, and imperfect
  background removal. Direct export into the game is therefore rejected.
- A development-only provider adapter must immediately archive inputs, prompts,
  request/response metadata, videos when available, sheets, atlases, and hashes.
  A project-owned offline normalizer produces deterministic 32×48 frames,
  anchors, timings, effect cues, provenance, and approval metadata. Only those
  validated local outputs may enter the runtime asset tree.
- Character-body animations must exclude projectiles, trails, impacts, spell
  areas, buffs, and heals; those remain separate effect assets.
- The public material gives no numeric rate/concurrency limit, SLA, hosted-URL
  lifetime, fixed retention period, seed/model pinning, idempotency guarantee,
  reproducibility guarantee, or API deprecation policy. The pipeline must work
  from archived raw files with AutoSprite absent.
- Terms allow output ownership to the extent permitted by law and the user's
  inputs, and state that User Content is not used for model training. They do not
  warrant originality, non-infringement, uniqueness, or commercial suitability.
  Only project-owned original inputs/prompts may be used, with resemblance and
  provenance review before approval.

The provider is adopted only if the new “Prototype AutoSprite at the Battle Tile
contract” ticket passes a bounded weapon-user/caster trial. Failure leaves the
provider-neutral manifest and validator intact so another generator,
hand-authored art, or artist cleanup can replace AutoSprite.
