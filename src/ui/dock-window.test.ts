import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { DOCK_GAP_PX, DOCK_HEIGHT, dockRect } from "./dock-geometry";
import { TILE_HEIGHT, TILE_WIDTH } from "./battle-tile-layout";
import {
  createCachedDockGeometryDeps,
  createDockWindowPort,
  physicalRectToLogical,
  type DockWebviewWindow,
} from "./dock-window";

function createManualScheduler() {
  const queue: Array<() => void | Promise<void>> = [];
  return {
    scheduleFrame(callback: () => void | Promise<void>) {
      queue.push(callback);
    },
    async flushOne() {
      const callback = queue.shift();
      if (!callback) {
        return;
      }
      await callback();
    },
    get depth() {
      return queue.length;
    },
  };
}

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
    const frames = createManualScheduler();
    let moved: (() => void) | undefined;
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: async () => tile,
      getMonitorForTile: async () => monitor,
      getDockWindow: async () => dock,
      scheduleFrame: frames.scheduleFrame,
      onTileMoved: (listener) => {
        moved = listener;
        return () => {};
      },
    });

    await port.open();
    const positionsBefore = dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length;
    moved?.();
    expect(frames.depth).toBe(1);
    await frames.flushOne();
    expect(
      dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length,
    ).toBe(positionsBefore + 1);
    expect(dock.callOrder.filter((entry) => entry === "show")).toHaveLength(1);
  });

  it("coalesces ten synchronous move events into one setPosition per frame", async () => {
    const dock = mockDockWindow();
    const frames = createManualScheduler();
    let moved: (() => void) | undefined;
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: async () => tile,
      getMonitorForTile: async () => monitor,
      getDockWindow: async () => dock,
      scheduleFrame: frames.scheduleFrame,
      onTileMoved: (listener) => {
        moved = listener;
        return () => {};
      },
    });

    await port.open();
    const positionsBefore = dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length;
    for (let i = 0; i < 10; i += 1) {
      moved?.();
    }
    expect(frames.depth).toBe(1);
    await frames.flushOne();
    expect(
      dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length,
    ).toBe(positionsBefore + 1);
    expect(frames.depth).toBe(0);
  });

  it("runs one trailing setPosition for a move that arrives while applyPosition is in flight", async () => {
    const dock = mockDockWindow();
    const frames = createManualScheduler();
    let moved: (() => void) | undefined;
    let releaseTileRead: (() => void) | undefined;
    let tileReads = 0;
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: async () => {
        tileReads += 1;
        if (tileReads === 2) {
          await new Promise<void>((resolve) => {
            releaseTileRead = resolve;
          });
        }
        return tile;
      },
      getMonitorForTile: async () => monitor,
      getDockWindow: async () => dock,
      scheduleFrame: frames.scheduleFrame,
      onTileMoved: (listener) => {
        moved = listener;
        return () => {};
      },
    });

    await port.open();
    const positionsBefore = dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length;
    moved?.();
    const flushInFlight = frames.flushOne();
    await Promise.resolve();
    moved?.();
    expect(frames.depth).toBe(1);
    releaseTileRead?.();
    await flushInFlight;
    await frames.flushOne();
    expect(
      dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length,
    ).toBe(positionsBefore + 2);
  });

  it("lands the dock on dockRect of the last tile position after a move burst", async () => {
    const dock = mockDockWindow();
    const frames = createManualScheduler();
    let moved: (() => void) | undefined;
    let currentTile = { ...tile };
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: async () => ({ ...currentTile }),
      getMonitorForTile: async () => monitor,
      getDockWindow: async () => dock,
      scheduleFrame: frames.scheduleFrame,
      onTileMoved: (listener) => {
        moved = listener;
        return () => {};
      },
    });

    await port.open();
    const positions = [
      { ...tile, x: 100 },
      { ...tile, x: 200 },
      { ...tile, x: 300 },
    ];
    for (const next of positions) {
      currentTile = next;
      moved?.();
    }
    await frames.flushOne();
    const expected = dockRect(positions[positions.length - 1]!, monitor);
    expect(dock.callOrder[dock.callOrder.length - 1]).toBe(
      `setPosition:${expected.x},${expected.y}`,
    );
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

  it("fetches scaleFactor and currentMonitor at most once across a drag, never outerSize", async () => {
    const frames = createManualScheduler();
    const dock = mockDockWindow();
    let moved: (() => void) | undefined;
    let physicalX = 440;
    const host = {
      scaleFactor: vi.fn(async () => 2),
      outerPosition: vi.fn(async () => ({ x: physicalX, y: 1464 })),
      outerSize: vi.fn(async () => ({ width: 960, height: 224 })),
      currentMonitor: vi.fn(async () => ({
        position: { x: 0, y: 0 },
        size: { width: 3840, height: 2160 },
      })),
    };
    const geometry = createCachedDockGeometryDeps(host);
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: geometry.getTileOuterPosition,
      getMonitorForTile: geometry.getMonitorForTile,
      invalidateGeometryCache: geometry.invalidateGeometryCache,
      getDockWindow: async () => dock,
      scheduleFrame: frames.scheduleFrame,
      onTileMoved: (listener) => {
        moved = listener;
        return () => {};
      },
    });

    await port.open();
    for (let i = 0; i < 8; i += 1) {
      physicalX += 10;
      moved?.();
    }
    await frames.flushOne();

    expect(host.scaleFactor).toHaveBeenCalledTimes(1);
    expect(host.currentMonitor).toHaveBeenCalledTimes(1);
    expect(host.outerSize).not.toHaveBeenCalled();
    expect(host.outerPosition.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps steady-state IPC to outerPosition and setPosition per coalesced frame", async () => {
    const frames = createManualScheduler();
    const dock = mockDockWindow();
    let moved: (() => void) | undefined;
    let physicalX = 440;
    const host = {
      scaleFactor: vi.fn(async () => 2),
      outerPosition: vi.fn(async () => ({ x: physicalX, y: 1464 })),
      currentMonitor: vi.fn(async () => ({
        position: { x: 0, y: 0 },
        size: { width: 3840, height: 2160 },
      })),
    };
    const geometry = createCachedDockGeometryDeps(host);
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: geometry.getTileOuterPosition,
      getMonitorForTile: geometry.getMonitorForTile,
      invalidateGeometryCache: geometry.invalidateGeometryCache,
      getDockWindow: async () => dock,
      scheduleFrame: frames.scheduleFrame,
      onTileMoved: (listener) => {
        moved = listener;
        return () => {};
      },
    });

    await port.open();
    const outerBefore = host.outerPosition.mock.calls.length;
    const setBefore = dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length;
    host.scaleFactor.mockClear();
    host.currentMonitor.mockClear();

    physicalX = 500;
    moved?.();
    await frames.flushOne();

    expect(host.outerPosition.mock.calls.length - outerBefore).toBe(1);
    expect(
      dock.callOrder.filter((entry) => entry.startsWith("setPosition")).length - setBefore,
    ).toBe(1);
    expect(host.scaleFactor).not.toHaveBeenCalled();
    expect(host.currentMonitor).not.toHaveBeenCalled();
  });

  it("invalidates scale and monitor caches on monitor change, close, and destroy", async () => {
    const frames = createManualScheduler();
    const dock = mockDockWindow();
    let moved: (() => void) | undefined;
    let scale = 2;
    let monitorPhysical = {
      position: { x: 0, y: 0 },
      size: { width: 3840, height: 2160 },
    };
    const host = {
      scaleFactor: vi.fn(async () => scale),
      outerPosition: vi.fn(async () => ({ x: 440, y: 1464 })),
      currentMonitor: vi.fn(async () => monitorPhysical),
    };
    const geometry = createCachedDockGeometryDeps(host);
    const port = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: geometry.getTileOuterPosition,
      getMonitorForTile: geometry.getMonitorForTile,
      invalidateGeometryCache: geometry.invalidateGeometryCache,
      getDockWindow: async () => dock,
      scheduleFrame: frames.scheduleFrame,
      onTileMoved: (listener) => {
        moved = listener;
        return () => {};
      },
    });

    await port.open();
    moved?.();
    await frames.flushOne();
    expect(host.scaleFactor).toHaveBeenCalledTimes(1);
    expect(host.currentMonitor).toHaveBeenCalledTimes(1);

    await port.close();
    moved?.();
    await frames.flushOne();
    expect(host.scaleFactor).toHaveBeenCalledTimes(2);
    expect(host.currentMonitor).toHaveBeenCalledTimes(2);

    scale = 1.5;
    monitorPhysical = {
      position: { x: 3840, y: 0 },
      size: { width: 1920, height: 1080 },
    };
    // Cache still warm from the post-close move; a fresh monitor read must drop scale.
    geometry.invalidateGeometryCache();
    await geometry.getMonitorForTile();
    await geometry.getTileOuterPosition();
    expect(host.currentMonitor).toHaveBeenCalledTimes(3);
    expect(host.scaleFactor).toHaveBeenCalledTimes(3);

    port.destroy();
    const afterDestroy = createDockWindowPort({
      isTauri: true,
      dockUrl,
      getTileOuterPosition: geometry.getTileOuterPosition,
      getMonitorForTile: geometry.getMonitorForTile,
      invalidateGeometryCache: geometry.invalidateGeometryCache,
      getDockWindow: async () => dock,
      scheduleFrame: frames.scheduleFrame,
      onTileMoved: (listener) => {
        moved = listener;
        return () => {};
      },
    });
    await afterDestroy.open();
    expect(host.scaleFactor).toHaveBeenCalledTimes(4);
    expect(host.currentMonitor).toHaveBeenCalledTimes(4);
  });

  it("uses TILE_WIDTH and TILE_HEIGHT instead of outerSize in cached geometry readers", async () => {
    const host = {
      scaleFactor: vi.fn(async () => 2),
      outerPosition: vi.fn(async () => ({ x: 440, y: 1464 })),
      currentMonitor: vi.fn(async () => ({
        position: { x: 0, y: 0 },
        size: { width: 3840, height: 2160 },
      })),
    };
    const geometry = createCachedDockGeometryDeps(host);
    const tileRect = await geometry.getTileOuterPosition();
    expect(tileRect).toEqual(
      physicalRectToLogical(
        {
          x: 440,
          y: 1464,
          width: TILE_WIDTH * 2,
          height: TILE_HEIGHT * 2,
        },
        2,
      ),
    );
  });
});
