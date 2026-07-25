# NOTES — Sweep / Salvage confirm preview

**Question:** What’s a more elegant way to show which pieces will be swept or
salvaged before the player confirms?

**Verdict (locked 2026-07-25):** Variant **C — Pane: pick then fill**.

- Peer **Salvage** / **Discard** buttons (no auto-fill bar, no Sweep IL
  select in the toolbar).
- Each opens the detail pane: Salvage → rarity → Fill 10 slots; Discard →
  Item Level → Fill from tier.
- Confirm + Rare/Epic visibility stay in the pane; grid only marks the batch.

**Next:** Fold into `src/ui/armory-surface.ts`, update spec/CONTEXT if Discard
renames Sweep in player-facing chrome, refresh Armory tests/evidence, then
delete this prototype.
