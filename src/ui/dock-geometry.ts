export const DOCK_WIDTH = 800;
export const DOCK_HEIGHT = 480;
export const DOCK_GAP_PX = 8;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DockSide = "above" | "below";

export interface DockRectResult {
  x: number;
  y: number;
  width: number;
  side: DockSide;
  /** Battle Tile x after center + clamp-snap. Equals input tile.x when unclamped. */
  tileX: number;
}

export function dockRect(tileRect: Rect, monitorRect: Rect): DockRectResult {
  const midpoint = monitorRect.y + monitorRect.height / 2;
  const bottomParked = tileRect.y >= midpoint;
  const offset = (DOCK_WIDTH - tileRect.width) / 2;
  const proposedDockX = tileRect.x - offset;
  const minX = monitorRect.x;
  const maxX = monitorRect.x + monitorRect.width - DOCK_WIDTH;
  const x = Math.max(minX, Math.min(proposedDockX, maxX));
  const tileX = x + offset;

  if (bottomParked) {
    return {
      x,
      y: tileRect.y - DOCK_GAP_PX - DOCK_HEIGHT,
      width: DOCK_WIDTH,
      side: "above",
      tileX,
    };
  }

  return {
    x,
    y: tileRect.y + tileRect.height + DOCK_GAP_PX,
    width: DOCK_WIDTH,
    side: "below",
    tileX,
  };
}
