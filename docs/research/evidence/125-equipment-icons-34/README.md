# Evidence: #125 native 34×34 Equipment icon prototype

Linked from [Prototype two native 34×34 Equipment icon families](https://github.com/jsbellamy/nightglass/issues/125).

## Rebuild

See [`rebuild-evidence.json`](./rebuild-evidence.json) — Stage-2 painted twice; `byte_stable: true`.

## Previews (Stage-2 @8×)

| Family | Tier I | Tier II |
| --- | --- | --- |
| Focus ↔ Prism | [dewlight-focus@8x.png](./dewlight-focus@8x.png) | [starfruit-prism@8x.png](./starfruit-prism@8x.png) |
| Bow ↔ Longbow | [bramblesong-bow@8x.png](./bramblesong-bow@8x.png) | [nightvine-longbow@8x.png](./nightvine-longbow@8x.png) |

Contact sheet: [family-sheet@8x.png](./family-sheet@8x.png)

## AI ingest trial

Optional GenerateImage path + measured reject ladder:
[`ai-gen/README.md`](./ai-gen/README.md). Lessons folded into
[`docs/agents/asset-generation.md`](../../../agents/asset-generation.md).

## Armory review

```
npm run prototype:equipment-icons-34
# optional: npm run prototype:equipment-icons-34:ingest
npm run dev
open http://localhost:1420/?window=dock&prototype=equipment-icons-34
```

Working notes: [`prototype/equipment-icons-34/NOTES.md`](../../../prototype/equipment-icons-34/NOTES.md)
