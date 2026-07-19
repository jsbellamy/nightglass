// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountTileShell } from "./main";
import { BATTLEFIELD_HEIGHT, STATUS_LINE_HEIGHT, TILE_HEIGHT, TILE_WIDTH } from "./ui/battle-tile";
import type { DockWindowPort } from "./ui/dock-window";
import { PUMP_INTERVAL_MS } from "./ui/pump";

describe("Battle Tile shell", () => {
  it("mounts the live Battle Tile with status line and battlefield on the root element", () => {
    const root = document.createElement("main");
    const shell = mountTileShell(root, { dockWindow: createMockDockWindow() });
    shell.stop();

    expect(root.classList.contains("battle-tile")).toBe(true);
    expect(root.getAttribute("aria-label")).toBe("Battle Tile");
    expect(TILE_WIDTH).toBe(480);
    expect(TILE_HEIGHT).toBe(112);
    expect(STATUS_LINE_HEIGHT).toBe(24);
    expect(BATTLEFIELD_HEIGHT).toBe(86);
    expect(root.querySelector(".status-line")).not.toBeNull();
    expect(root.querySelector(".battlefield")).not.toBeNull();
    expect(root.querySelectorAll(".combatant").length).toBeGreaterThan(0);
  });
});

describe("Management Dock integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the tile pump running while opening, switching, and closing the dock", () => {
    const root = document.createElement("main");
    const dockWindow = createMockDockWindow();
    const shell = mountTileShell(root, { dockWindow });
    const rendersBefore = root.querySelectorAll(".combatant").length;
    expect(rendersBefore).toBeGreaterThan(0);

    void dockWindow.open();
    root.querySelector<HTMLButtonElement>(".dock-toggle")?.click();
    void dockWindow.close();
    root.querySelector<HTMLButtonElement>(".dock-toggle")?.click();

    vi.advanceTimersByTime(PUMP_INTERVAL_MS * 2);
    expect(root.querySelectorAll(".combatant").length).toBe(rendersBefore);

    shell.stop();
  });

  it("positions only the dock window, never the tile window APIs", async () => {
    const root = document.createElement("main");
    const dockWindow = createMockDockWindow();
    const shell = mountTileShell(root, { dockWindow });

    await dockWindow.open();
    await dockWindow.reposition({
      tile: { x: 120, y: 640, width: 480, height: 112 },
      monitor: { x: 0, y: 0, width: 1920, height: 1080 },
    });
    await dockWindow.close();

    expect(dockWindow.dockPositionUpdates).toBeGreaterThan(0);
    expect(dockWindow.tileMutations).toEqual([]);
    shell.stop();
  });
});

function createMockDockWindow(): DockWindowPort & {
  tileMutations: string[];
  dockPositionUpdates: number;
} {
  const tileMutations: string[] = [];
  let dockPositionUpdates = 0;
  let open = false;
  return {
    tileMutations,
    get dockPositionUpdates() {
      return dockPositionUpdates;
    },
    async open() {
      open = true;
    },
    async close() {
      open = false;
    },
    async toggle() {
      open = !open;
      return open;
    },
    isOpen() {
      return open;
    },
    async reposition() {
      dockPositionUpdates += 1;
    },
    async syncPositionFromTile() {
      tileMutations.push("sync");
    },
    destroy() {
      open = false;
    },
  };
}
