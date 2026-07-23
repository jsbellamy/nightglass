import {
  CHARACTER_LOADOUT_EVIDENCE_FIXTURE_ID,
  buildCharacterLoadoutEvidenceContent,
  readActiveEvidenceFixtureId,
} from "./data/fixtures/character-loadout-evidence";
import { mountDockShellWithContent } from "./ui/character-loadout-evidence-dock";
import { bootTile } from "./ui/boot";
import { mountDockShell } from "./ui/dock-root";
import { mountTileShell, startTileRoot } from "./ui/tile-root";

function isDockWindow(): boolean {
  return new URLSearchParams(window.location.search).get("window") === "dock";
}

function isCharacterLoadoutEvidenceActive(): boolean {
  return readActiveEvidenceFixtureId() === CHARACTER_LOADOUT_EVIDENCE_FIXTURE_ID;
}

window.addEventListener("DOMContentLoaded", () => {
  const tileRoot = document.querySelector<HTMLElement>("#tile");
  const dockRoot = document.querySelector<HTMLElement>("#dock");
  if (!tileRoot || !dockRoot) {
    throw new Error("#tile and #dock root elements are required");
  }

  const evidenceContent = isCharacterLoadoutEvidenceActive()
    ? buildCharacterLoadoutEvidenceContent()
    : null;

  if (isDockWindow()) {
    document.documentElement.classList.add("dock-window");
    tileRoot.hidden = true;
    dockRoot.hidden = false;
    if (evidenceContent) {
      mountDockShellWithContent(dockRoot, evidenceContent);
    } else {
      mountDockShell(dockRoot);
    }
    return;
  }

  dockRoot.hidden = true;
  tileRoot.hidden = false;
  if (evidenceContent) {
    bootTile(tileRoot, { content: evidenceContent, mountTile: mountTileShell });
  } else {
    startTileRoot(tileRoot);
  }
});
