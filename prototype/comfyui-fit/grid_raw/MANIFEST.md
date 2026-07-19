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
