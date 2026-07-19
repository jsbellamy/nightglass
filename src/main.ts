import { createEngine } from "./core/engine";
import { buildContent } from "./data";
import { mountBattleTile } from "./ui/battle-tile";
import { startPump } from "./ui/pump";

export { TILE_HEIGHT, TILE_WIDTH } from "./ui/battle-tile";

/** Interim #50: fresh Engine each launch until save/boot slice lands. */
const LOOT_SEED = 42;

export function mountTileShell(root: HTMLElement): void {
  const content = buildContent();
  const engine = createEngine(content, undefined, LOOT_SEED);
  const tile = mountBattleTile(root, content);
  tile.render(engine.snapshot());

  startPump({
    advanceBy: (ms) => engine.advanceBy(ms),
    onAdvance: (events) => tile.applyEvents(events, engine.snapshot()),
    render: () => tile.render(engine.snapshot()),
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector<HTMLElement>("#tile");
  if (!root) throw new Error("#tile root element missing");
  mountTileShell(root);
});
