# PROTOTYPE — Sweep / Salvage confirm preview

Throwaway UI prototype answering:

> What’s a more elegant way to show which pieces will be swept or salvaged
> before the player confirms — without a text dump of names?

Run from the project root:

```sh
./prototype/armory-confirm/run.sh
```

Open <http://127.0.0.1:4175>. Variants are shareable as `?variant=A`,
`?variant=B`, and `?variant=C`; the pending action rides along as `&mode=sweep`
or `&mode=salvage`.

- **A — Spotlight grid**: non-candidates dim in place; the affected tiles *are*
  the preview. Rare/Epic keep a gem badge. Confirm is a slim sticky bar.
- **B — Icon filmstrip**: a horizontal strip of icons for the batch (salvage
  ends with an outcome chip). Grid stays readable; confirm sits beside the strip.
- **C — Pane: pick then fill**: toolbar has peer **Salvage** / **Discard**
  only (no auto-fill bar, no sweep select). Each opens the detail pane.
  Salvage → rarity chips + Fill 10 slots. Discard → Item Level chips + Fill
  from tier. Confirm stays in the pane.

This is disposable layout code: CSS placeholder icons, stub Armory data, no
persistence, no production wiring. Capture the verdict in `NOTES.md`, then
delete or absorb.
