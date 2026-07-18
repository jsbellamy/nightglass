# PROTOTYPE — Compact management fan-out

Throwaway UI prototype answering:

> What card dimensions, fan-out directions, screen-edge behavior, stacking
> rules, open/close interactions, and simultaneous-card capacity let management
> windows surround the fixed 480×112 Battle Tile while keeping its Battlefield
> continuously visible and live?

Run from the project root:

```sh
./prototype/management-fanout/run.sh
```

Open <http://127.0.0.1:4174>. Variants are shareable as `?variant=A`,
`?variant=B`, and `?variant=C`; the park position rides along as `&park=`.

- **A — Card Fan**: each status-line button opens its own 264×312 card; up to
  three float at once in a row that fans away from the parked edge, and the
  oldest card yields when a fourth opens.
- **B — Command Dock**: one 480×336 tabbed panel docked flush to the tile;
  exactly one management surface at a time, switched by tabs.
- **C — Ledger Spine**: a 300px-wide accordion column beside the tile; every
  surface can stay open as a collapsible section that grows away from the
  parked edge.

The **Park position** control (top left) moves the tile between screen edges to
exercise fan-direction flipping and clamping. The Battle Tile itself never
resizes, moves, or pauses when management opens.

This is disposable layout code: CSS placeholder art, read-only stub content, no
persistence, no production architecture.
