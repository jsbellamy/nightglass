import { describe, expect, it } from "vitest";
import { DOCK_GAP_PX, DOCK_HEIGHT, DOCK_WIDTH, dockRect } from "./dock-geometry";

describe("dockRect", () => {
  const monitor = { x: 0, y: 0, width: 1920, height: 1080 };

  it("places the dock above a bottom-parked tile with an 8px gap and DOCK_WIDTH", () => {
    const tile = { x: 220, y: 732, width: 480, height: 112 };

    expect(dockRect(tile, monitor)).toEqual({
      x: 220,
      y: 732 - DOCK_GAP_PX - DOCK_HEIGHT,
      width: DOCK_WIDTH,
      side: "above",
    });
  });

  it("places the dock below a top-parked tile with an 8px gap and DOCK_WIDTH", () => {
    const tile = { x: 100, y: 48, width: 480, height: 112 };

    expect(dockRect(tile, monitor)).toEqual({
      x: 100,
      y: 48 + 112 + DOCK_GAP_PX,
      width: DOCK_WIDTH,
      side: "below",
    });
  });

  it("returns DOCK_WIDTH even when the tile width differs", () => {
    const tile = { x: 0, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, monitor).width).toBe(DOCK_WIDTH);
    expect(dockRect(tile, monitor).width).not.toBe(tile.width);
  });

  it("left-aligns x to the tile when the dock fits on the monitor", () => {
    const tile = { x: 100, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, monitor).x).toBe(tile.x);
  });

  it("clamps x so the dock stays on the monitor when tileRect.x + DOCK_WIDTH exceeds the right edge", () => {
    const narrowMonitor = { x: 0, y: 0, width: 900, height: 1080 };
    const tile = { x: 200, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, narrowMonitor).x).toBe(
      narrowMonitor.x + narrowMonitor.width - DOCK_WIDTH,
    );
  });

  it("clamps x to monitorRect.x when the monitor is narrower than DOCK_WIDTH", () => {
    const tinyMonitor = { x: 50, y: 0, width: 600, height: 1080 };
    const tile = { x: 100, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, tinyMonitor).x).toBe(tinyMonitor.x);
    expect(dockRect(tile, tinyMonitor).x).toBeGreaterThanOrEqual(tinyMonitor.x);
  });
});
