import { describe, expect, it } from "vitest";
import { DOCK_GAP_PX, DOCK_HEIGHT, DOCK_WIDTH, dockRect } from "./dock-geometry";

describe("dockRect", () => {
  const monitor = { x: 0, y: 0, width: 1920, height: 1080 };

  it("parks the Management Dock above a bottom-parked Battle Tile with an 8px gap", () => {
    const tile = { x: 220, y: 732, width: 480, height: 112 };

    expect(dockRect(tile, monitor)).toEqual({
      x: 220,
      y: 732 - DOCK_GAP_PX - DOCK_HEIGHT,
      width: DOCK_WIDTH,
      side: "above",
    });
  });

  it("parks the Management Dock below a top-parked Battle Tile with an 8px gap", () => {
    const tile = { x: 100, y: 48, width: 480, height: 112 };

    expect(dockRect(tile, monitor)).toEqual({
      x: 100,
      y: 48 + 112 + DOCK_GAP_PX,
      width: DOCK_WIDTH,
      side: "below",
    });
  });

  it("sizes the Management Dock to the workspace constants, not the Battle Tile width", () => {
    const tile = { x: 0, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, monitor).width).toBe(800);
  });

  it("left-aligns the Management Dock to the Battle Tile when the monitor has room", () => {
    const tile = { x: 100, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, monitor).x).toBe(100);
  });

  it("shifts the Management Dock left when it would extend past the monitor edge", () => {
    const narrowMonitor = { x: 0, y: 0, width: 900, height: 1080 };
    const tile = { x: 200, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, narrowMonitor).x).toBe(100);
  });

  it("flush-lefts the Management Dock when the monitor is narrower than the dock workspace", () => {
    const tinyMonitor = { x: 50, y: 0, width: 600, height: 1080 };
    const tile = { x: 100, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, tinyMonitor).x).toBe(50);
  });
});
