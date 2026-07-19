export const DOCK_WIDTH = 480;
export const DOCK_HEIGHT = 336;
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
}

export function dockRect(tileRect: Rect, monitorRect: Rect): DockRectResult {
  const midpoint = monitorRect.y + monitorRect.height / 2;
  const bottomParked = tileRect.y >= midpoint;
  const width = tileRect.width;

  if (bottomParked) {
    return {
      x: tileRect.x,
      y: tileRect.y - DOCK_GAP_PX - DOCK_HEIGHT,
      width,
      side: "above",
    };
  }

  return {
    x: tileRect.x,
    y: tileRect.y + tileRect.height + DOCK_GAP_PX,
    width,
    side: "below",
  };
}
