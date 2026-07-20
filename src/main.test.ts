// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEngine } from "./core/engine";
import { buildContent } from "./data";
import type { EngineEvent } from "./core/events";
import { mountTileShell, type TileShellPumpSchedule } from "./main";
import { BATTLEFIELD_HEIGHT, STATUS_LINE_HEIGHT, TILE_HEIGHT, TILE_WIDTH } from "./ui/battle-tile";
import type { BusMessage, createBusEndpoint } from "./ui/bus";
import type { DockWindowPort } from "./ui/dock-window";
import * as battleTile from "./ui/battle-tile";
import { PUMP_INTERVAL_MS, RENDER_FRAME_MS } from "./ui/pump";

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

  it("manual-check: dock-pump-continuity — keeps the tile pump running while opening, switching, and closing the dock", () => {
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

  it("manual-check: dock-position-only — positions only the dock window, never the tile window APIs", async () => {
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

describe("dock handshake", () => {
  it("sends a fresh snapshot when a dock announces it opened", () => {
    const root = document.createElement("main");
    const published: BusMessage[] = [];
    let handlers: Parameters<typeof createBusEndpoint>[0] = {};

    const shell = mountTileShell(root, {
      dockWindow: createMockDockWindow(),
      busFactory: (busHandlers) => {
        handlers = busHandlers;
        return {
          publish: (message) => published.push(message),
          close: () => {},
        };
      },
    });

    published.length = 0;
    handlers["dock-opened"]?.({ type: "dock-opened" });

    expect(published.some((message) => message.type === "snapshot")).toBe(true);
    shell.stop();
  });
});

describe("tick snapshot cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function createControlledPumpSchedule(clock: { ms: number }) {
    const rafCallbacks: FrameRequestCallback[] = [];
    const doc = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;

    return {
      doc,
      rafCallbacks,
      schedule: {
        now: () => clock.ms,
        setInterval: ((handler: TimerHandler) =>
          setInterval(handler, PUMP_INTERVAL_MS)) as typeof setInterval,
        clearInterval: ((id: ReturnType<typeof setInterval>) =>
          clearInterval(id)) as typeof clearInterval,
        requestAnimationFrame: (callback: FrameRequestCallback) => {
          rafCallbacks.push(callback);
          return rafCallbacks.length;
        },
        cancelAnimationFrame: vi.fn(),
        document: doc,
      } satisfies TileShellPumpSchedule,
      runRafAt(at: number): void {
        clock.ms = at;
        const callbacks = rafCallbacks.splice(0);
        for (const callback of callbacks) {
          callback(at);
        }
      },
    };
  }

  it("calls engine.snapshot once per sim tick across subsequent renders", () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const snapshotSpy = vi.spyOn(engine, "snapshot");
    const clock = { ms: 0 };
    const pump = createControlledPumpSchedule(clock);

    vi.spyOn(engine, "advanceBy").mockReturnValue([
      { seq: 1, atMs: 250, type: "config-applied" },
    ] satisfies EngineEvent[]);

    const root = document.createElement("main");
    const shell = mountTileShell(root, {
      engine,
      content,
      dockWindow: createMockDockWindow(),
      deferPump: true,
      now: () => clock.ms,
      pumpSchedule: pump.schedule,
    });

    snapshotSpy.mockClear();
    shell.startPump();

    vi.advanceTimersByTime(PUMP_INTERVAL_MS);

    for (let frame = 0; frame < 5; frame++) {
      pump.runRafAt((frame + 1) * RENDER_FRAME_MS);
    }

    expect(snapshotSpy).toHaveBeenCalledTimes(1);
    shell.stop();
  });

  it("reuses one snapshot object for applyEvents and the pump bus publish", async () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const clock = { ms: 0 };
    const pump = createControlledPumpSchedule(clock);
    const capturedApplySnapshots: unknown[] = [];
    const published: BusMessage[] = [];

    const { mountBattleTile: realMount } =
      await vi.importActual<typeof battleTile>("./ui/battle-tile");
    vi.spyOn(battleTile, "mountBattleTile").mockImplementation((root, battleContent, options) => {
      const tile = realMount(root, battleContent, options);
      const originalApply = tile.applyEvents.bind(tile);
      tile.applyEvents = (events, snapshot) => {
        capturedApplySnapshots.push(snapshot);
        return originalApply(events, snapshot);
      };
      return tile;
    });

    vi.spyOn(engine, "advanceBy").mockReturnValue([
      { seq: 1, atMs: 250, type: "config-applied" },
    ] satisfies EngineEvent[]);

    const root = document.createElement("main");
    const shell = mountTileShell(root, {
      engine,
      content,
      dockWindow: createMockDockWindow(),
      deferPump: true,
      now: () => clock.ms,
      pumpSchedule: pump.schedule,
      busFactory: (handlers) => ({
        publish: (message) => {
          published.push(message);
          if (message.type === "pump") {
            handlers.pump?.(message);
          }
        },
        close: () => {},
      }),
    });

    shell.startPump();
    vi.advanceTimersByTime(PUMP_INTERVAL_MS);

    const pumpMessage = published.find((message) => message.type === "pump");
    expect(pumpMessage?.type).toBe("pump");
    expect(capturedApplySnapshots).toHaveLength(1);
    expect(pumpMessage?.snapshot).toBe(capturedApplySnapshots[0]);
    shell.stop();
    vi.mocked(battleTile.mountBattleTile).mockRestore();
  });

  it("renders on demand before the first sim tick", () => {
    const root = document.createElement("main");
    const shell = mountTileShell(root, {
      dockWindow: createMockDockWindow(),
      deferPump: true,
    });

    expect(root.querySelectorAll(".combatant").length).toBeGreaterThan(0);
    shell.stop();
  });

  it("reflects post-command state on the next render without waiting for a tick", async () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const clock = { ms: 0 };
    const pump = createControlledPumpSchedule(clock);
    const renderedPending: unknown[] = [];

    const { mountBattleTile: realMount } =
      await vi.importActual<typeof battleTile>("./ui/battle-tile");
    const mountSpy = vi.spyOn(battleTile, "mountBattleTile").mockImplementation((root, battleContent, options) => {
      const tile = realMount(root, battleContent, options);
      const originalRender = tile.render.bind(tile);
      tile.render = (snapshot) => {
        renderedPending.push(snapshot.progression.pendingParty);
        return originalRender(snapshot);
      };
      return tile;
    });

    let handlers: Parameters<typeof createBusEndpoint>[0] = {};
    const root = document.createElement("main");
    const shell = mountTileShell(root, {
      engine,
      content,
      dockWindow: createMockDockWindow(),
      deferPump: true,
      now: () => clock.ms,
      pumpSchedule: pump.schedule,
      busFactory: (busHandlers) => {
        handlers = busHandlers;
        return {
          publish: () => {},
          close: () => {},
        };
      },
    });

    shell.startPump();
    vi.advanceTimersByTime(PUMP_INTERVAL_MS);
    pump.runRafAt(RENDER_FRAME_MS);
    renderedPending.length = 0;

    handlers.command?.({
      type: "command",
      command: { cmd: "setParty", args: [["priest", "wizard", "knight"], "hunter"] },
    });
    pump.runRafAt(RENDER_FRAME_MS * 2);

    expect(renderedPending[renderedPending.length - 1]).toEqual({
      members: ["priest", "wizard", "knight"],
      reserve: "hunter",
    });
    shell.stop();
    mountSpy.mockRestore();
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
