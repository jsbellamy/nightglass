export const TILE_WIDTH = 480;
export const TILE_HEIGHT = 112;

export function mountTileShell(root: HTMLElement): void {
  root.classList.add("tile-shell");
  root.setAttribute("aria-label", "Battle Tile");
}

window.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector<HTMLElement>("#tile");
  if (!root) throw new Error("#tile root element missing");
  mountTileShell(root);
});
