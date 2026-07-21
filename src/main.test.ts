// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEngine } from "./core/engine";
import { buildContent } from "./data";
import type { EngineEvent } from "./core/events";
import type { Snapshot } from "./core/snapshot";
import { mountDockShell, mountTileShell } from "./main";
import { BATTLEFIELD_HEIGHT, STATUS_LINE_HEIGHT, TILE_HEIGHT, TILE_WIDTH } from "./ui/battle-tile";
import type { BusMessage, createBusEndpoint } from "./ui/bus";
import type { DockWindowPort } from "./ui/dock-window";
import * as battleTile from "./ui/battle-tile";
import * as dockModule from "./ui/dock";
import { serializeEngineLegality } from "./ui/engine-legality";
import { PUMP_INTERVAL_MS } from "./ui/pump";
import type { Page } from "@playwright/test";
import { advanceSim } from "../e2e/helpers/advance";

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
    const { mountManagementDock: realMount } = dockModule;
    vi.spyOn(dockModule, "mountManagementDock").mockImplementation((mountRoot, options) => {
      const dock = realMount(mountRoot, options);
      const originalRender = dock.render.bind(dock);
      dock.render = (...args) => {
        renderSpy();
        return originalRender(...args);
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

  it("keeps dock focus until coalesced pump renders flush on the next animation frame", () => {
    const harness = createDockShellHarness();
    document.body.append(harness.root);

    const tab = harness.root.querySelector<HTMLElement>('[data-dock-tab="character"]');
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
    let handlers: Parameters<typeof createBusEndpoint>[0] = {};
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
          publish: (message) => {
            published.push(message);
            if (message.type === "pump") {
              handlers.pump?.(message);
            }
          },
          close: () => {},
        };
      },
    });

    handlers["dock-opened"]?.({ type: "dock-opened" });
    published.length = 0;

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

  it("records applyEvents, legality, and publish phase durations when a tick produces events", async () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const clock = { ms: 0 };
    const pump = createControlledPumpSchedule(clock);

    vi.spyOn(engine, "advanceBy").mockImplementation(() => {
      clock.ms += 2;
      return [{ seq: 1, atMs: 250, type: "config-applied" }] satisfies EngineEvent[];
    });

    const { mountBattleTile: realMount } =
      await vi.importActual<typeof battleTile>("./ui/battle-tile");
    vi.spyOn(battleTile, "mountBattleTile").mockImplementation((root, battleContent, options) => {
      const tile = realMount(root, battleContent, options);
      const originalApply = tile.applyEvents.bind(tile);
      tile.applyEvents = (events, snapshot) => {
        clock.ms += 5;
        return originalApply(events, snapshot);
      };
      return tile;
    });

    const legalityModule = await import("./ui/engine-legality");
    const realSerialize = legalityModule.serializeEngineLegality;
    vi.spyOn(legalityModule, "serializeEngineLegality").mockImplementation(
      (eng, snapshot, cnt) => {
        clock.ms += 10;
        return realSerialize(eng, snapshot, cnt);
      },
    );

    const root = document.createElement("main");
    let handlers: Parameters<typeof createBusEndpoint>[0] = {};
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
          publish: (message) => {
            clock.ms += 20;
            if (message.type === "pump") {
              handlers.pump?.(message);
            }
          },
          close: () => {},
        };
      },
    });

    handlers["dock-opened"]?.({ type: "dock-opened" });

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    const report = shell.frameMetrics();
    expect(report?.tickSampleCount).toBe(1);
    expect(report?.tickPhases.advance.p50Ms).toBe(2);
    expect(report?.tickPhases.applyEvents.p50Ms).toBe(5);
    expect(report?.tickPhases.legality.p50Ms).toBe(10);
    expect(report?.tickPhases.publish.p50Ms).toBe(20);

    shell.stop();
    vi.mocked(battleTile.mountBattleTile).mockRestore();
    vi.mocked(legalityModule.serializeEngineLegality).mockRestore();
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

describe("__nightglassAdvance test hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (vi.isMockFunction(battleTile.mountBattleTile)) {
      vi.mocked(battleTile.mountBattleTile).mockRestore();
    }
  });

  function createControlledPumpSchedule(clock: { ms: number }) {
    const rafCallbacks: FrameRequestCallback[] = [];
    const doc = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;

    return {
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
    };
  }

  it("advances snapshot.simNowMs by the requested duration", () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const before = engine.snapshot().simNowMs;
    const root = document.createElement("main");
    const shell = mountTileShell(root, {
      engine,
      content,
      dockWindow: createMockDockWindow(),
      deferPump: true,
    });
    const advance = (window as unknown as Record<string, unknown>)["__nightglassAdvance"] as
      | ((ms: number) => void)
      | undefined;
    expect(typeof advance).toBe("function");

    advance!(60_000);

    expect(engine.snapshot().simNowMs).toBe(before + 60_000);
    shell.stop();
  });

  it("chunks a 60 s jump into 240 advanceBy calls of 250 ms each", () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const advanceBySpy = vi.spyOn(engine, "advanceBy");
    const root = document.createElement("main");
    const shell = mountTileShell(root, {
      engine,
      content,
      dockWindow: createMockDockWindow(),
      deferPump: true,
    });
    const advance = (window as unknown as Record<string, unknown>)["__nightglassAdvance"] as (
      ms: number,
    ) => void;

    advance(60_000);

    expect(advanceBySpy).toHaveBeenCalledTimes(240);
    for (const [ms] of advanceBySpy.mock.calls) {
      expect(ms).toBe(PUMP_INTERVAL_MS);
    }
    shell.stop();
  });

  it("routes tick events through onAdvance so pump bus messages match live play", async () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const published: BusMessage[] = [];

    vi.spyOn(engine, "advanceBy").mockReturnValue([
      { seq: 1, atMs: 250, type: "config-applied" },
    ] satisfies EngineEvent[]);

    const root = document.createElement("main");
    let handlers: Parameters<typeof createBusEndpoint>[0] = {};
    const shell = mountTileShell(root, {
      engine,
      content,
      dockWindow: createMockDockWindow(),
      deferPump: true,
      busFactory: (busHandlers) => {
        handlers = busHandlers;
        return {
          publish: (message) => {
            published.push(message);
            if (message.type === "pump") {
              busHandlers.pump?.(message);
            }
          },
          close: () => {},
        };
      },
    });

    handlers["dock-opened"]?.({ type: "dock-opened" });
    published.length = 0;

    const advance = (window as unknown as Record<string, unknown>)["__nightglassAdvance"] as (
      ms: number,
    ) => void;
    advance(PUMP_INTERVAL_MS);

    const pumpMessage = published.find((message) => message.type === "pump");
    expect(pumpMessage?.type).toBe("pump");
    expect(pumpMessage?.events).toHaveLength(1);
    shell.stop();
  });

  it("renders synchronously once after the jump without waiting for animation frame", async () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const { mountBattleTile: realMount } =
      await vi.importActual<typeof battleTile>("./ui/battle-tile");
    const renderSpy = vi.fn();
    vi.spyOn(battleTile, "mountBattleTile").mockImplementation((root, battleContent, options) => {
      const tile = realMount(root, battleContent, options);
      const originalRender = tile.render.bind(tile);
      tile.render = (...args) => {
        renderSpy();
        return originalRender(...args);
      };
      return tile;
    });

    const root = document.createElement("main");
    const shell = mountTileShell(root, {
      engine,
      content,
      dockWindow: createMockDockWindow(),
      deferPump: true,
    });

    renderSpy.mockClear();
    const advance = (window as unknown as Record<string, unknown>)["__nightglassAdvance"] as (
      ms: number,
    ) => void;
    advance(PUMP_INTERVAL_MS);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(root.querySelectorAll(".combatant").length).toBeGreaterThan(0);
    shell.stop();
  });

  it("keeps the live pump advancing sim time after a sim jump", () => {
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const clock = { ms: 0 };
    const pump = createControlledPumpSchedule(clock);

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
    const advance = (window as unknown as Record<string, unknown>)["__nightglassAdvance"] as (
      ms: number,
    ) => void;
    advance(60_000);
    const simAfterJump = engine.snapshot().simNowMs;

    pump.advancePumpMs(PUMP_INTERVAL_MS);

    expect(engine.snapshot().simNowMs).toBe(simAfterJump + PUMP_INTERVAL_MS);
    shell.stop();
  });
});

describe("advanceSim helper", () => {
  it("throws a clear diagnostic when __nightglassAdvance is absent", async () => {
    delete (window as unknown as Record<string, unknown>)["__nightglassAdvance"];
    const page = {
      evaluate: async <T, R>(fn: (arg: T) => R, arg: T) => fn(arg),
    } as unknown as Page;

    await expect(advanceSim(page, 1_000)).rejects.toThrow(
      /__nightglassAdvance is missing.*evidence build/i,
    );
  });
});

describe("pump publish when dock subscribed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function createControlledPumpSchedule(clock: { ms: number }) {
    const rafCallbacks: FrameRequestCallback[] = [];
    const doc = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;

    return {
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
    };
  }

  function mountTileWithBusCapture(clock: { ms: number }) {
    const pump = createControlledPumpSchedule(clock);
    const published: BusMessage[] = [];
    let handlers: Parameters<typeof createBusEndpoint>[0] = {};
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);

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
      busFactory: (busHandlers) => {
        handlers = busHandlers;
        return {
          publish: (message) => published.push(message),
          close: () => {},
        };
      },
    });

    published.length = 0;

    return { shell, pump, published, handlers, engine, content };
  }

  it("records zero legality and publish phase time when no dock is subscribed", () => {
    const clock = { ms: 0 };
    const { shell, pump } = mountTileWithBusCapture(clock);

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    const report = shell.frameMetrics();
    expect(report?.tickSampleCount).toBe(1);
    expect(report?.tickPhases.legality.p50Ms).toBe(0);
    expect(report?.tickPhases.publish.p50Ms).toBe(0);
    expect(report?.tickPhases.applyEvents.p50Ms).toBeGreaterThanOrEqual(0);
    shell.stop();
  });

  it("publishes no pump message on a tick with events when no dock has announced", () => {
    const clock = { ms: 0 };
    const { shell, pump, published } = mountTileWithBusCapture(clock);

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    expect(published.filter((message) => message.type === "pump")).toHaveLength(0);
    shell.stop();
  });

  it("does not call serializeEngineLegality during a tick when no dock is subscribed", async () => {
    const legalityModule = await import("./ui/engine-legality");
    const serializeSpy = vi.spyOn(legalityModule, "serializeEngineLegality");

    const clock = { ms: 0 };
    const { shell, pump } = mountTileWithBusCapture(clock);
    serializeSpy.mockClear();

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    expect(serializeSpy).not.toHaveBeenCalled();
    shell.stop();
    serializeSpy.mockRestore();
  });

  it("publishes a pump message with legality after dock-opened when a tick produces events", async () => {
    const clock = { ms: 0 };
    const { shell, pump, published, handlers, engine, content } = mountTileWithBusCapture(clock);

    handlers["dock-opened"]?.({ type: "dock-opened" });
    published.length = 0;

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    const pumpMessages = published.filter((message) => message.type === "pump");
    expect(pumpMessages).toHaveLength(1);
    const pumpMessage = pumpMessages[0]!;
    expect(pumpMessage.type).toBe("pump");
    expect(pumpMessage.legality).toEqual(
      serializeEngineLegality(engine, pumpMessage.snapshot, content),
    );
    shell.stop();
  });

  it("stops publishing pump messages on the next tick after dock-closed", () => {
    const clock = { ms: 0 };
    const { shell, pump, published, handlers } = mountTileWithBusCapture(clock);

    handlers["dock-opened"]?.({ type: "dock-opened" });
    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    expect(published.filter((message) => message.type === "pump")).toHaveLength(1);

    handlers["dock-closed"]?.({ type: "dock-closed" });
    published.length = 0;
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    expect(published.filter((message) => message.type === "pump")).toHaveLength(0);
    shell.stop();
  });

  it("publishes snapshot immediately on dock-opened without waiting for the next tick", () => {
    const clock = { ms: 0 };
    const { shell, published, handlers } = mountTileWithBusCapture(clock);

    handlers["dock-opened"]?.({ type: "dock-opened" });

    expect(published.some((message) => message.type === "snapshot")).toBe(true);
    shell.stop();
  });

  it("publishes snapshot on command even when no dock is subscribed", () => {
    const clock = { ms: 0 };
    const { shell, published, handlers } = mountTileWithBusCapture(clock);

    handlers.command?.({
      type: "command",
      command: { cmd: "setParty", args: [["priest", "wizard", "knight"], "hunter"] },
    });

    expect(published.some((message) => message.type === "snapshot")).toBe(true);
    shell.stop();
  });

  it("manual-check: adr-0002-tile-independence — applies events and updates tick snapshot whether or not a dock is subscribed", async () => {
    const clock = { ms: 0 };
    const pump = createControlledPumpSchedule(clock);
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);
    const applyCalls: { events: EngineEvent[]; snapshot: unknown }[] = [];

    vi.spyOn(engine, "advanceBy").mockReturnValue([
      { seq: 1, atMs: 250, type: "config-applied" },
    ] satisfies EngineEvent[]);

    const { mountBattleTile: realMount } =
      await vi.importActual<typeof battleTile>("./ui/battle-tile");
    vi.spyOn(battleTile, "mountBattleTile").mockImplementation((root, battleContent, options) => {
      const tile = realMount(root, battleContent, options);
      const originalApply = tile.applyEvents.bind(tile);
      tile.applyEvents = (events, snapshot) => {
        applyCalls.push({ events, snapshot });
        return originalApply(events, snapshot);
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
        return { publish: () => {}, close: () => {} };
      },
    });

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    const unsubscribedApply = applyCalls.length;
    const unsubscribedTickAt = shell.tickSnapshotAtMs();
    expect(unsubscribedApply).toBe(1);

    applyCalls.length = 0;
    handlers["dock-opened"]?.({ type: "dock-opened" });
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    const subscribedApply = applyCalls.length;
    const subscribedTickAt = shell.tickSnapshotAtMs();
    expect(subscribedApply).toBe(1);
    expect(subscribedTickAt).toBeGreaterThan(unsubscribedTickAt);

    shell.stop();
    vi.mocked(battleTile.mountBattleTile).mockRestore();
  });
});

describe("serialized legality cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function createControlledPumpSchedule(clock: { ms: number }) {
    const rafCallbacks: FrameRequestCallback[] = [];
    const doc = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;

    return {
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
    };
  }

  function mountSubscribedTile(clock: { ms: number }) {
    const pump = createControlledPumpSchedule(clock);
    const published: BusMessage[] = [];
    let handlers: Parameters<typeof createBusEndpoint>[0] = {};
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
      busFactory: (busHandlers) => {
        handlers = busHandlers;
        return {
          publish: (message) => published.push(message),
          close: () => {},
        };
      },
    });

    handlers["dock-opened"]?.({ type: "dock-opened" });
    published.length = 0;

    return { shell, pump, published, handlers, engine, content };
  }

  it("does not call serializeEngineLegality on a tick whose events are all non-invalidating", async () => {
    const legalityModule = await import("./ui/engine-legality");
    const serializeSpy = vi.spyOn(legalityModule, "serializeEngineLegality");

    const clock = { ms: 0 };
    const { shell, pump, engine } = mountSubscribedTile(clock);
    serializeSpy.mockClear();

    vi.spyOn(engine, "advanceBy").mockReturnValue([
      { seq: 1, atMs: 250, type: "impact", entityId: "e1", abilityId: "a", results: [] },
      { seq: 2, atMs: 250, type: "knockout", entityId: "e2" },
    ] satisfies EngineEvent[]);

    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    expect(serializeSpy).not.toHaveBeenCalled();
    shell.stop();
    serializeSpy.mockRestore();
  });

  it.each([
    { seq: 1, atMs: 250, type: "level-up", classId: "knight", level: 2 },
    { seq: 1, atMs: 250, type: "drop-awarded", dropId: 99 },
    { seq: 1, atMs: 250, type: "config-applied" },
  ] as const satisfies readonly EngineEvent[])(
    "recomputes legality on a tick containing $type",
    async (invalidating) => {
      const legalityModule = await import("./ui/engine-legality");
      const serializeSpy = vi.spyOn(legalityModule, "serializeEngineLegality");

      const clock = { ms: 0 };
      const { shell, pump, engine, content, published } = mountSubscribedTile(clock);
      serializeSpy.mockClear();

      vi.spyOn(engine, "advanceBy").mockReturnValue([invalidating]);
      shell.startPump();
      pump.advancePumpMs(PUMP_INTERVAL_MS);

      expect(serializeSpy).toHaveBeenCalledTimes(1);
      const pumpMessage = published.find((message) => message.type === "pump");
      expect(pumpMessage?.legality).toEqual(
        serializeEngineLegality(engine, pumpMessage!.snapshot, content),
      );

      shell.stop();
      serializeSpy.mockRestore();
    },
  );

  it("invalidates the cache on command so the snapshot publish carries fresh legality", async () => {
    const legalityModule = await import("./ui/engine-legality");
    const serializeSpy = vi.spyOn(legalityModule, "serializeEngineLegality");

    const clock = { ms: 0 };
    const { shell, pump, handlers, engine, content, published } = mountSubscribedTile(clock);

    shell.startPump();
    vi.spyOn(engine, "advanceBy").mockReturnValue([
      { seq: 1, atMs: 250, type: "config-applied" },
    ] satisfies EngineEvent[]);
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    serializeSpy.mockClear();

    handlers.command?.({
      type: "command",
      command: { cmd: "setParty", args: [["priest", "wizard", "knight"], "hunter"] },
    });

    expect(serializeSpy).toHaveBeenCalled();
    const snapshotMessage = published.find((message) => message.type === "snapshot");
    expect(snapshotMessage?.type).toBe("snapshot");
    expect(snapshotMessage?.legality).toEqual(
      serializeEngineLegality(engine, snapshotMessage!.snapshot, content),
    );
    shell.stop();
    serializeSpy.mockRestore();
  });

  it("reuses the cached legality object across consecutive non-invalidating ticks", async () => {
    const legalityModule = await import("./ui/engine-legality");
    const serializeSpy = vi.spyOn(legalityModule, "serializeEngineLegality");

    const clock = { ms: 0 };
    const { shell, pump, published, engine } = mountSubscribedTile(clock);
    serializeSpy.mockClear();

    vi.spyOn(engine, "advanceBy").mockReturnValue([
      { seq: 1, atMs: 250, type: "config-applied" },
    ] satisfies EngineEvent[]);
    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    const firstLegality = published.find((m) => m.type === "pump")?.legality;
    serializeSpy.mockClear();
    published.length = 0;

    vi.mocked(engine.advanceBy).mockReturnValue([
      { seq: 2, atMs: 500, type: "impact", entityId: "e1", abilityId: "a", results: [] },
    ] satisfies EngineEvent[]);
    pump.advancePumpMs(PUMP_INTERVAL_MS);

    expect(serializeSpy).not.toHaveBeenCalled();
    const secondLegality = published.find((m) => m.type === "pump")?.legality;
    expect(secondLegality).toBe(firstLegality);
    shell.stop();
    serializeSpy.mockRestore();
  });

  it("matches unconditional recomputation over a scripted command and event sequence", async () => {
    const clock = { ms: 0 };
    const { shell, pump, published, handlers, engine, content } = mountSubscribedTile(clock);

    const scripted: EngineEvent[][] = [
      [{ seq: 1, atMs: 250, type: "impact", entityId: "e1", abilityId: "a", results: [] }],
      [{ seq: 2, atMs: 500, type: "xp-awarded", classId: "knight", amount: 1, totalXp: 1 }],
      [{ seq: 3, atMs: 750, type: "level-up", classId: "knight", level: 2 }],
      [{ seq: 4, atMs: 1000, type: "drop-awarded", dropId: 7 }],
    ];

    let step = 0;
    vi.spyOn(engine, "advanceBy").mockImplementation(() => scripted[step++] ?? []);
    shell.startPump();

    const steps: { legality: unknown; snapshot: Snapshot }[] = [];
    const recordPublished = () => {
      for (const message of published) {
        if (message.type === "pump" || message.type === "snapshot") {
          steps.push({ legality: message.legality, snapshot: message.snapshot });
        }
      }
    };

    pump.advancePumpMs(PUMP_INTERVAL_MS);
    recordPublished();
    handlers.command?.({
      type: "command",
      command: { cmd: "setParty", args: [["priest", "wizard", "knight"], "hunter"] },
    });
    recordPublished();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    recordPublished();

    for (const { legality, snapshot } of steps) {
      expect(legality).toEqual(serializeEngineLegality(engine, snapshot, content));
    }
    shell.stop();
  });

  it("invalidates during an unsubscribed stretch so dock-opened receives freshly computed legality", async () => {
    const legalityModule = await import("./ui/engine-legality");
    const serializeSpy = vi.spyOn(legalityModule, "serializeEngineLegality");

    const clock = { ms: 0 };
    const pump = createControlledPumpSchedule(clock);
    const published: BusMessage[] = [];
    let handlers: Parameters<typeof createBusEndpoint>[0] = {};
    const content = buildContent();
    const engine = createEngine(content, undefined, 42);

    vi.spyOn(engine, "advanceBy").mockReturnValue([
      { seq: 1, atMs: 250, type: "level-up", classId: "knight", level: 2 },
    ] satisfies EngineEvent[]);

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
          publish: (message) => published.push(message),
          close: () => {},
        };
      },
    });

    shell.startPump();
    serializeSpy.mockClear();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    expect(serializeSpy).not.toHaveBeenCalled();

    handlers["dock-opened"]?.({ type: "dock-opened" });
    const snapshotMessage = published.find((message) => message.type === "snapshot");
    expect(snapshotMessage?.type).toBe("snapshot");
    expect(snapshotMessage!.legality).toEqual(
      serializeEngineLegality(engine, snapshotMessage!.snapshot, content),
    );
    expect(serializeSpy).toHaveBeenCalled();

    shell.stop();
    serializeSpy.mockRestore();
  });

  it("never mutates a cached legality map in place; invalidation replaces it", async () => {
    const clock = { ms: 0 };
    const { shell, pump, published, engine } = mountSubscribedTile(clock);

    vi.spyOn(engine, "advanceBy").mockReturnValue([
      { seq: 1, atMs: 250, type: "config-applied" },
    ] satisfies EngineEvent[]);
    shell.startPump();
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    const cached = published.find((m) => m.type === "pump")?.legality;
    expect(cached).toBeDefined();
    const equipBefore = { ...cached!.equip };

    vi.mocked(engine.advanceBy).mockReturnValue([
      { seq: 2, atMs: 500, type: "drop-awarded", dropId: 42 },
    ] satisfies EngineEvent[]);
    pump.advancePumpMs(PUMP_INTERVAL_MS);
    const pumpMessages = published.filter((m) => m.type === "pump");
    const refreshed = pumpMessages[pumpMessages.length - 1]?.legality;

    expect(refreshed).not.toBe(cached);
    expect(cached!.equip).toEqual(equipBefore);
    shell.stop();
  });
});

describe("frame metrics dev hooks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("DEV instrumentation reset clears tick and frame samples", () => {
    const root = document.createElement("main");
    const shell = mountTileShell(root, { dockWindow: createMockDockWindow() });
    const devWindow = window as unknown as Record<string, unknown>;
    expect(typeof devWindow["__nightglassFrameMetrics"]).toBe("function");
    expect(typeof devWindow["__nightglassFrameMetricsReset"]).toBe("function");

    vi.advanceTimersByTime(PUMP_INTERVAL_MS);
    const before = shell.frameMetrics();
    expect(before?.tickSampleCount ?? 0).toBeGreaterThanOrEqual(0);

    (devWindow["__nightglassFrameMetricsReset"] as () => void)();
    const after = shell.frameMetrics();
    expect(after?.tickSampleCount).toBe(0);
    expect(after?.sampleCount).toBe(0);

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
