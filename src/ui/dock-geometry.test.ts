import { describe, expect, it } from "vitest";
import { DOCK_GAP_PX, DOCK_HEIGHT, DOCK_WIDTH, dockRect } from "./dock-geometry";

describe("dockRect", () => {
  const monitor = { x: 0, y: 0, width: 1920, height: 1080 };

  it("places the dock above a bottom-parked tile with an 8px gap and tile width", () => {
    const tile = { x: 220, y: 732, width: 480, height: 112 };

    expect(dockRect(tile, monitor)).toEqual({
      x: 220,
      y: 732 - DOCK_GAP_PX - DOCK_HEIGHT,
      width: DOCK_WIDTH,
      side: "above",
    });
  });

  it("places the dock below a top-parked tile with an 8px gap and tile width", () => {
    const tile = { x: 100, y: 48, width: 480, height: 112 };

    expect(dockRect(tile, monitor)).toEqual({
      x: 100,
      y: 48 + 112 + DOCK_GAP_PX,
      width: DOCK_WIDTH,
      side: "below",
    });
  });

  it("never exceeds the tile width", () => {
    const tile = { x: 0, y: 900, width: 480, height: 112 };

    expect(dockRect(tile, monitor).width).toBe(tile.width);
    expect(dockRect(tile, monitor).width).toBe(DOCK_WIDTH);
  });
});
