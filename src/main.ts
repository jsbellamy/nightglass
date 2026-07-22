import { mountDockShell } from "./ui/dock-root";
import { startTileRoot } from "./ui/tile-root";

function isDockWindow(): boolean {
  return new URLSearchParams(window.location.search).get("window") === "dock";
}

window.addEventListener("DOMContentLoaded", () => {
  const tileRoot = document.querySelector<HTMLElement>("#tile");
  const dockRoot = document.querySelector<HTMLElement>("#dock");
  if (!tileRoot || !dockRoot) {
    throw new Error("#tile and #dock root elements are required");
  }

  if (isDockWindow()) {
    document.documentElement.classList.add("dock-window");
    tileRoot.hidden = true;
    dockRoot.hidden = false;
    mountDockShell(dockRoot);
    return;
  }

  dockRoot.hidden = true;
  tileRoot.hidden = false;
  startTileRoot(tileRoot);
});
