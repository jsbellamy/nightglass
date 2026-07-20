// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEngine } from "./core/engine";
import { buildContent } from "./data";
import type { EngineEvent } from "./core/events";
import { mountDockShell, mountTileShell } from "./main";
import { BATTLEFIELD_HEIGHT, STATUS_LINE_HEIGHT, TILE_HEIGHT, TILE_WIDTH } from "./ui/battle-tile";
import type { BusMessage, createBusEndpoint } from "./ui/bus";
import type { DockWindowPort } from "./ui/dock-window";
import * as battleTile from "./ui/battle-tile";
import * as dockModule from "./ui/dock";
import { serializeEngineLegality } from "./ui/engine-legality";
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

describe("Management Dock shell pump coalescing", () => {
  const fanoutHandlers: Parameters<typeof createBusEndpoint>[0][] = [];

  function createFanoutBus(handlers: Parameters<typeof createBusEndpoint>[0]) {
    fanoutHandlers.push(handlers);
    return {
      publish(message: BusMessage) {
        for (const listener of fanoutHandlers) {
          const handler = listener[message.type];
          if (handler) {
            handler(message as never);
          }
        }
      },
      close() {
        const index = fanoutHandlers.indexOf(handlers);
        if (index >= 0) {
          fanoutHandlers.splice(index, 1);
        }
      },
    };
  }

  afterEach(() => {
    fanoutHandlers.length = 0;
    vi.restoreAllMocks();
  });

  function createDockShellHarness() {
    const rafCallbacks: FrameRequestCallback[] = [];
    const schedule = {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      },
      cancelAnimationFrame: vi.fn(),
    };
    const root = document.createElement("main");
    const renderSpy = vi.fn();
    const setArmoryBadgeSpy = vi.fn();
    const { mountManagementDock: realMount } = dockModule;
    vi.spyOn(dockModule, "mountManagementDock").mockImplementation((mountRoot, options) => {
      const dock = realMount(mountRoot, options);
      const originalRender = dock.render.bind(dock);
      dock.render = (...args) => {
        renderSpy();
        return originalRender(...args);
      };
      const originalSetBadge = dock.setArmoryBadge.bind(dock);
      dock.setArmoryBadge = (visible) => {
        setArmoryBadgeSpy(visible);
        return originalSetBadge(visible);
      };
      return dock;
    });

    const shell = mountDockShell(root, { schedule, busFactory: createFanoutBus });
    const publisher = createFanoutBus({});
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);

    return {
      shell,
      root,
      publisher,
      renderSpy,
      setArmoryBadgeSpy,
      engine,
      content,
      runRaf() {
        const callbacks = rafCallbacks.splice(0);
        for (const callback of callbacks) {
          callback(0);
        }
      },
      pumpPayload() {
        const snapshot = engine.snapshot();
        return {
          type: "pump" as const,
          events: [] as EngineEvent[],
          snapshot,
          legality: serializeEngineLegality(engine, snapshot, content),
        };
      },
    };
  }

  it("coalesces three pump messages in one animation frame into one dock render", () => {
    const harness = createDockShellHarness();
    harness.renderSpy.mockClear();

    const message = harness.pumpPayload();
    harness.publisher.publish(message);
    harness.publisher.publish(message);
    harness.publisher.publish(message);

    expect(harness.renderSpy).toHaveBeenCalledTimes(0);

    harness.runRaf();

    expect(harness.renderSpy).toHaveBeenCalledTimes(1);
    harness.shell.destroy();
  });

  it("renders synchronously on snapshot without waiting for animation frame", () => {
    const harness = createDockShellHarness();
    harness.renderSpy.mockClear();

    const snapshot = harness.engine.snapshot();
    harness.publisher.publish({
      type: "snapshot",
      snapshot,
      legality: serializeEngineLegality(harness.engine, snapshot, harness.content),
    });

    expect(harness.renderSpy).toHaveBeenCalledTimes(1);
    harness.runRaf();
    expect(harness.renderSpy).toHaveBeenCalledTimes(1);
    harness.shell.destroy();
  });

  it("delivers armory-badge without waiting for pump coalescing", () => {
    const harness = createDockShellHarness();
    harness.setArmoryBadgeSpy.mockClear();

    harness.publisher.publish({ type: "armory-badge" });

    expect(harness.setArmoryBadgeSpy).toHaveBeenCalledWith(true);
    harness.shell.destroy();
  });

  it("keeps dock focus until coalesced pump renders flush on the next animation frame", () => {
    const harness = createDockShellHarness();
    document.body.append(harness.root);

    const tab = harness.root.querySelector<HTMLElement>('[data-dock-tab="party"]');
    tab?.focus();
    expect(document.activeElement).toBe(tab);

    const message = harness.pumpPayload();
    harness.publisher.publish(message);
    harness.publisher.publish(message);
    harness.publisher.publish(message);

    expect(document.activeElement).toBe(tab);

    harness.runRaf();
    harness.shell.destroy();
    harness.root.remove();
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
      advancePumpMs(ms: number): void {
        clock.ms += ms;
        vi.advanceTimersByTime(ms);
      },
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
      } satisfies NonNullable<Parameters<typeof mountTileShell>[1]>["pumpSchedule"],
      runRafAt(at: number): void {
        clock.ms = at;
        const callbacks = rafCallbacks.splice(0);
        for (const callback of callbacks) {
          callback(at);
        }
      },
    };
  }

  it("clones the Engine snapshot once per sim tick while re-rendering between ticks", () => {
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

    pump.advancePumpMs(PUMP_INTERVAL_MS);

    for (let frame = 0; frame < 5; frame++) {
      pump.runRafAt((frame + 1) * 17);
    }

    expect(snapshotSpy).toHaveBeenCalledTimes(1);
    shell.stop();
  });

  it("publishes the same Snapshot on the pump bus that combat events were applied with", async () => {
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
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    const pumpMessage = published.find((message) => message.type === "pump");
    expect(pumpMessage?.type).toBe("pump");
    expect(capturedApplySnapshots).toHaveLength(1);
    expect(pumpMessage?.snapshot).toBe(capturedApplySnapshots[0]);
    expect(pumpMessage?.legality).toEqual(
      serializeEngineLegality(engine, pumpMessage!.snapshot, content),
    );
    shell.stop();
    vi.mocked(battleTile.mountBattleTile).mockRestore();
  });

  it("still draws the Battle Tile before the first sim tick when only the render pump is running", () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const clock = { ms: 0 };
    const pump = createControlledPumpSchedule(clock);
    vi.spyOn(engine, "advanceBy").mockReturnValue([]);

    const root = document.createElement("main");
    const shell = mountTileShell(root, {
      engine,
      content,
      dockWindow: createMockDockWindow(),
      deferPump: true,
      now: () => clock.ms,
      pumpSchedule: pump.schedule,
    });

    shell.startPump();
    pump.runRafAt(17);

    expect(root.querySelectorAll(".combatant").length).toBeGreaterThan(0);
    shell.stop();
  });

  it("records wall-clock ms when the cached tick snapshot is taken", () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const clock = { ms: 5_000 };
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

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    expect(shell.tickSnapshotAtMs()).toBe(5_000 + PUMP_INTERVAL_MS);
    shell.stop();
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

  it("reflects pending party edits on the next render without waiting for a sim tick", async () => {
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
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    pump.runRafAt(17);
    renderedPending.length = 0;

    handlers.command?.({
      type: "command",
      command: { cmd: "setParty", args: [["priest", "wizard", "knight"], "hunter"] },
    });
    pump.runRafAt(34);

    expect(renderedPending[renderedPending.length - 1]).toEqual({
      members: ["priest", "wizard", "knight"],
      reserve: "hunter",
    });
    shell.stop();
    mountSpy.mockRestore();
  });
});

describe("presentation clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.mocked(battleTile.mountBattleTile).mockRestore();
  });

  function createControlledPumpSchedule(clock: { ms: number }) {
    const rafCallbacks: FrameRequestCallback[] = [];
    const doc = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;

    return {
      rafCallbacks,
      advancePumpMs(ms: number): void {
        clock.ms += ms;
        vi.advanceTimersByTime(ms);
      },
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
      } satisfies NonNullable<Parameters<typeof mountTileShell>[1]>["pumpSchedule"],
      runRafAt(at: number): void {
        clock.ms = at;
        const callbacks = rafCallbacks.splice(0);
        for (const callback of callbacks) {
          callback(at);
        }
      },
    };
  }

  async function mountWithRenderNowMsCapture(clock: { ms: number }) {
    const presentationNowMs: number[] = [];
    const pump = createControlledPumpSchedule(clock);
    const { mountBattleTile: realMount } =
      await vi.importActual<typeof battleTile>("./ui/battle-tile");
    vi.spyOn(battleTile, "mountBattleTile").mockImplementation((root, battleContent, options) => {
      const tile = realMount(root, battleContent, options);
      const originalRender = tile.render.bind(tile);
      tile.render = (snapshot, nowMs) => {
        presentationNowMs.push(nowMs ?? snapshot.simNowMs);
        return originalRender(snapshot, nowMs);
      };
      return tile;
    });

    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const root = document.createElement("main");
    const shell = mountTileShell(root, {
      engine,
      content,
      dockWindow: createMockDockWindow(),
      deferPump: true,
      now: () => clock.ms,
      pumpSchedule: pump.schedule,
    });

    return { shell, engine, pump, presentationNowMs };
  }

  it("passes nowMs values 100 ms apart between sim ticks", async () => {
    const clock = { ms: 0 };
    const { shell, pump, presentationNowMs } = await mountWithRenderNowMsCapture(clock);

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    presentationNowMs.length = 0;

    pump.runRafAt(300);
    pump.runRafAt(400);

    expect(presentationNowMs).toHaveLength(2);
    expect(presentationNowMs[1]! - presentationNowMs[0]!).toBe(100);
    expect(presentationNowMs[0]).not.toBe(presentationNowMs[1]);
    shell.stop();
  });

  it("clamps interpolation to one sim tick ahead of the cached snapshot", async () => {
    const clock = { ms: 0 };
    const { shell, engine, pump, presentationNowMs } = await mountWithRenderNowMsCapture(clock);

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    const simNowMs = engine.snapshot().simNowMs;
    presentationNowMs.length = 0;

    pump.runRafAt(900);

    expect(presentationNowMs[presentationNowMs.length - 1]).toBe(simNowMs + PUMP_INTERVAL_MS);
    shell.stop();
  });

  it("never decreases nowMs across a late tick followed by recovery", async () => {
    const clock = { ms: 0 };
    const { shell, pump, presentationNowMs } = await mountWithRenderNowMsCapture(clock);

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    presentationNowMs.length = 0;

    pump.runRafAt(400);
    pump.runRafAt(800);
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    pump.runRafAt(1_050);
    pump.runRafAt(1_300);

    for (let index = 1; index < presentationNowMs.length; index++) {
      expect(presentationNowMs[index]!).toBeGreaterThanOrEqual(presentationNowMs[index - 1]!);
    }
    shell.stop();
  });

  it("passes only integer nowMs values to the tile renderer", async () => {
    const clock = { ms: 0 };
    const { shell, pump, presentationNowMs } = await mountWithRenderNowMsCapture(clock);

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    presentationNowMs.length = 0;

    pump.runRafAt(33);
    pump.runRafAt(66);
    pump.runRafAt(99);

    for (const nowMs of presentationNowMs) {
      expect(Number.isInteger(nowMs)).toBe(true);
    }
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
