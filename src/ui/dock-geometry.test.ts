import { describe, expect, it } from "vitest";
import { DOCK_GAP_PX, DOCK_HEIGHT, DOCK_WIDTH, dockRect } from "./dock-geometry";

const TILE_WIDTH = 480;
const CENTER_OFFSET = (DOCK_WIDTH - TILE_WIDTH) / 2;

describe("dockRect", () => {
  const monitor = { x: 0, y: 0, width: 1920, height: 1080 };

  it("parks the Management Dock above a bottom-parked Battle Tile with an 8px gap", () => {
    const tile = { x: 220, y: 732, width: 480, height: 112 };

    expect(dockRect(tile, monitor)).toEqual({
      x: 220 - CENTER_OFFSET,
      y: 732 - DOCK_GAP_PX - DOCK_HEIGHT,
      width: DOCK_WIDTH,
      side: "above",
      tileX: 220,
    });
  });

  it("parks the Management Dock below a top-parked Battle Tile with an 8px gap", () => {
    const tile = { x: 200, y: 48, width: 480, height: 112 };

    expect(dockRect(tile, monitor)).toEqual({
      x: 200 - CENTER_OFFSET,
      y: 48 + 112 + DOCK_GAP_PX,
      width: DOCK_WIDTH,
      side: "below",
      tileX: 200,
    });
  });

  it("sizes the Management Dock to the workspace constants, not the Battle Tile width", () => {
    const tile = { x: 0, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, monitor).width).toBe(800);
  });

  it("centers the Management Dock on the Battle Tile when the monitor has room", () => {
    const tile = { x: 200, y: 900, width: 480, height: 112 };

    const result = dockRect(tile, monitor);
    expect(result.x).toBe(200 - CENTER_OFFSET);
    expect(result.tileX).toBe(200);
  });

  it("clamps the dock to the right monitor edge and snaps the tile to stay centered", () => {
    const tile = { x: 1300, y: 900, width: 480, height: 112 };
    const maxDockX = monitor.width - DOCK_WIDTH;

    const result = dockRect(tile, monitor);
    expect(result.x).toBe(maxDockX);
    expect(result.tileX).toBe(maxDockX + CENTER_OFFSET);
    expect(result.tileX).not.toBe(tile.x);
  });

  it("flush-lefts the dock when the monitor is narrower than the dock workspace", () => {
    const tinyMonitor = { x: 50, y: 0, width: 600, height: 1080 };
    const tile = { x: 100, y: 900, width: 480, height: 112 };

    const result = dockRect(tile, tinyMonitor);
    expect(result.x).toBe(50);
    expect(result.tileX).toBe(50 + CENTER_OFFSET);
  });

  it("clamps the dock to the left monitor edge and snaps the tile to stay centered", () => {
    const tile = { x: 80, y: 900, width: 480, height: 112 };

    const result = dockRect(tile, monitor);
    expect(result.x).toBe(0);
    expect(result.tileX).toBe(CENTER_OFFSET);
    expect(result.tileX).not.toBe(tile.x);
  });
});
