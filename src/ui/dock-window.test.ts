import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { DOCK_GAP_PX, DOCK_HEIGHT, dockRect } from "./dock-geometry";
import {
  createDockWindowPort,
  physicalRectToLogical,
  type DockWebviewWindow,
} from "./dock-window";

describe("physicalRectToLogical", () => {
  it("divides physical Tile and monitor coordinates by the Tile scale factor", () => {
    const physical = { x: 440, y: 1464, width: 960, height: 224 };
    expect(physicalRectToLogical(physical, 2)).toEqual({
      x: 220,
      y: 732,
      width: 480,
      height: 112,
    });
  });
});

describe("dock window port", () => {
  const monitor = { x: 0, y: 0, width: 1920, height: 1080 };
  const tile = { x: 220, y: 732, width: 480, height: 112 };
  const dockUrl = "http://test.local/?window=dock";

  function mockDockWindow(overrides: Partial<DockWebviewWindow> = {}): DockWebviewWindow & {
    callOrder: string[];
  } {
    const callOrder: string[] = [];
    return {
      callOrder,
      show: async () => {
        callOrder.push("show");
        await overrides.show?.();
      },
      hide: async () => {
        callOrder.push("hide");
        await overrides.hide?.();
      },
      setPosition: async (x, y) => {
        callOrder.push(`setPosition:${x},${y}`);
        await overrides.setPosition?.(x, y);
      },
      ready: async () => {
        callOrder.push("ready");
        await overrides.ready?.();
      },
    };
  }

  it("manual-check: dock-no-tile-resize — reads tile geometry without calling tile resize or move APIs", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "dock-window.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/getCurrentWindow\(\)\.set(Position|Size|Fullscreen)/);
    expect(source).not.toMatch(/getCurrentWindow\(\)\.hide\(/);
    expect(source).toMatch(/scaleFactor/);
  });

  it("does not mark the Dock open when ready rejects on a new window", async () => {
    const dock = mockDockWindow({
      ready: () => Promise.reject(new Error("tauri://error")),
    });
    const createDockWindow = vi.fn(async () => dock);
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: async () => tile,
      getMonitorForTile: async () => monitor,
      createDockWindow,
    });

    await port.open();

    expect(createDockWindow).toHaveBeenCalledOnce();
    expect(dock.callOrder).toEqual(["ready"]);
    expect(port.isOpen()).toBe(false);
  });

  it("opens a new Dock with create → ready → position → show", async () => {
    const dock = mockDockWindow();
    const createDockWindow = vi.fn(async () => dock);
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: async () => tile,
      getMonitorForTile: async () => monitor,
      createDockWindow,
    });

    await port.open();
    const expected = dockRect(tile, monitor);
    expect(createDockWindow).toHaveBeenCalledOnce();
    expect(dock.callOrder).toEqual([
      "ready",
      `setPosition:${expected.x},${expected.y}`,
      "show",
    ]);
    expect(port.isOpen()).toBe(true);
  });

  it("reuses an existing Dock with immediate ready, positions before show, and preserves hide/reopen", async () => {
    const dock = mockDockWindow();
    const createDockWindow = vi.fn();
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: async () => tile,
      getMonitorForTile: async () => monitor,
      getDockWindow: async () => dock,
      createDockWindow,
    });

    await port.open();
    const expected = dockRect(tile, monitor);
    expect(createDockWindow).not.toHaveBeenCalled();
    expect(dock.callOrder.indexOf("ready")).toBeLessThan(
      dock.callOrder.indexOf(`setPosition:${expected.x},${expected.y}`),
    );
    expect(dock.callOrder.indexOf(`setPosition:${expected.x},${expected.y}`)).toBeLessThan(
      dock.callOrder.indexOf("show"),
    );
    expect(port.isOpen()).toBe(true);

    await port.close();
    expect(dock.callOrder).toContain("hide");
    expect(port.isOpen()).toBe(false);

    dock.callOrder.length = 0;
    await port.open();
    expect(dock.callOrder).toEqual([
      "ready",
      `setPosition:${expected.x},${expected.y}`,
      "show",
    ]);
    expect(createDockWindow).not.toHaveBeenCalled();
  });

  it("repositions only the Dock when the Tile moves", async () => {
    const dock = mockDockWindow();
    let moved: (() => void) | undefined;
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: async () => tile,
      getMonitorForTile: async () => monitor,
      getDockWindow: async () => dock,
      onTileMoved: (listener) => {
        moved = listener;
        return () => {};
      },
    });

    await port.open();
    const positionsBefore = dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length;
    moved?.();
    await vi.waitUntil(
      () =>
        dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length >
        positionsBefore,
    );
    expect(dock.callOrder.filter((entry) => entry === "show")).toHaveLength(1);
  });

  it("production adapter converts physical geometry using the Tile scale factor before dockRect", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "dock-window.ts"),
      "utf8",
    );
    expect(source).toMatch(/physicalRectToLogical/);
    expect(source).toMatch(/scaleFactor\(\)/);
  });

  it("positions the dock at dockRect with the configured gap for a bottom-parked tile", async () => {
    const dock = mockDockWindow();
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: async () => tile,
      getMonitorForTile: async () => monitor,
      createDockWindow: async () => dock,
    });

    await port.open();
    const expectedY = tile.y - DOCK_GAP_PX - DOCK_HEIGHT;
    expect(dock.callOrder).toContain(`setPosition:${tile.x},${expectedY}`);
  });
});
