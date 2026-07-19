# Grid-recovery canonical reference provenance — #29

The provider PNGs in this directory are the archived raw-bundle boundary. They
were copied byte-for-byte from OpenAI's built-in image-generation output. Exact
prompts and the byte-locking hashes are in the adjacent `*.source.json` files.
No generator is called by `acquire.py`, tests, build, or runtime.

The accepted Knight's direct image-generation input is archived at
`references/knight-pose-reference.png` (SHA-256
`8885e9a2e6b999e7ddaabf20a4a41a00d151ad5b6b5ae39d958f9f117845e406`).
It is reference-only and does not enter ingest. The Wizard directly references
the historical canonical image recorded by #15.

| Class | Recovered grid | Raw SHA-256 | Runtime SHA-256 |
| --- | --- | --- | --- |
| Knight | 32×45 | `9dfcdd69592cec858d9ff4d53429a2a3b48815918f4b463083e7201d69546cb5` | `095de4483520b5986689d914035fe5c85753fe5f1e03d4e7a6f14308e3985f0f` |
| Wizard | 29×45 | `cf390b253ea5b422f35ce667ae499d1a78e3d5be006552d20df740cd4c63d833` | `27b7252f1780ed5510efe3e5b892b9f5345005c2becf4a5d658572f13cfd54ea` |

## Identity review

- **Knight:** accepted after rejecting two visually plausible but over-wide
  grids (42×48 and 37×48). The final compact guard faces right with the sword
  angled up-right and the shield raised, while preserving the mint leaf armour,
  berry plume/scarf, cream accents, shield device, and dark-plum contours.
- **Wizard:** preserves the berry pointed hat, mint robe/scarf, cream hair,
  berry ornaments, wand, and right-facing Class silhouette. No embedded spell
  effect entered the Character frame.

Both runtime frames validate at 32×48 with baseline row 47, binary alpha, and
only `moonberry-16` colours. `test_contract.py` proves the Wizard rebuild matches
the committed runtime PNG byte-for-byte with no provider or network present.

## Opponent proof — #30

Left-facing botanical opponents acquired through the same external-provider /
logical-grid path. Ordinary budget ~28×40; Boss fuller on the shared 32×48
canvas. Both stay on `moonberry-16`.

| Subject | Recovered grid | Raw SHA-256 | Runtime SHA-256 |
| --- | --- | --- | --- |
| Pipcap (ordinary) | 29×40 | `61521e221604d6106dc890e3feafec8326b704c7626e1400fa858cea429cb5a7` | `0977d7793f8e9ee756119bb2bdd0256655732630503d2a735a2b86fd47274418` |
| Boss | 32×41 | `ae87deb3e047d6a80f2db3194f666479a89acd980141659f6a9c8178ca63829a` | `138a6c500e2e41cba3e7828257432f8965e22968602dae1e90f67b75f26d0007` |

HITL verdict and review sheets:
[`opponents/NOTES.md`](../opponents/NOTES.md).
