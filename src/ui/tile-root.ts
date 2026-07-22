import { buildContent } from "../data";
import type { Content } from "../core/types";
import type { EngineEvent } from "../core/events";
import type { Snapshot } from "../core/snapshot";
import { createEngine, type Engine } from "./snapshot-view";
import { bootTile, DEFAULT_LOOT_SEED, type BootResult } from "./boot";
import { applyTileCommand, createBusEndpoint, type BusEndpoint } from "./bus";
import { mountBattleTile } from "./battle-tile";
import { createProductionDockWindowPort, type DockWindowPort } from "./dock-window";
import {
  invalidatesLegality,
  serializeEngineLegality,
  type SerializedEngineLegality,
} from "./engine-legality";
import { createFrameMetrics } from "./frame-metrics";
import { PUMP_INTERVAL_MS, startPump, type PumpController, type PumpDeps } from "./pump";
import type { TileShell } from "./tile-shell-types";

const TEST_HOOKS_ENABLED =
  import.meta.env.DEV || import.meta.env.MODE === "evidence";

type TileShellPumpSchedule = Partial<
  Pick<
    PumpDeps,
    | "now"
    | "setInterval"
    | "clearInterval"
    | "requestAnimationFrame"
    | "cancelAnimationFrame"
    | "document"
  >
>;

export interface TileShellOptions {
  dockWindow?: DockWindowPort;
  busFactory?: typeof createBusEndpoint;
  engine?: Engine;
  content?: Content;
  onBeforeUnload?: () => void;
  deferPump?: boolean;
  /** Wall-clock ms for snapshot timing; defaults to `Date.now`. */
  now?: () => number;
  /** Injectable pump timers for tests; production uses real browser scheduling. */
  pumpSchedule?: TileShellPumpSchedule;
}

export type { TileShell } from "./tile-shell-types";

/** Production Battle Tile entry: save/offline boot, then `mountTileShell`. */
export function startTileRoot(root: HTMLElement): BootResult {
  return bootTile(root, {
    content: buildContent(),
    mountTile: mountTileShell,
  });
}

export function mountTileShell(root: HTMLElement, options: TileShellOptions = {}): TileShell {
  const content = options.content ?? buildContent();
  const engine = options.engine ?? createEngine(content, undefined, DEFAULT_LOOT_SEED);
  const dockWindow = options.dockWindow ?? createProductionDockWindowPort();
  const busFactory = options.busFactory ?? createBusEndpoint;

  let bus: BusEndpoint | null = null;
  let dockSubscribed = false;

  const tile = mountBattleTile(root, content, {
    onDockToggle: () => {
      void dockWindow.toggle().then((opened) => {
        if (opened) {
          bus?.publish({ type: "dock-opened" });
        } else {
          bus?.publish({ type: "dock-closed" });
        }
      });
    },
  });

  tile.render(engine.snapshot());

  function publishSnapshot(): void {
    const snapshot = engine.snapshot();
    bus?.publish({
      type: "snapshot",
      snapshot,
      legality: currentLegality(snapshot),
    });
  }

  bus = busFactory({
    command(message) {
      const events = applyTileCommand(engine, message.command);
      invalidateTickSnapshot();
      if (events.length > 0) {
        tile.applyEvents(events, engine.snapshot());
      }
      publishSnapshot();
    },
    "dock-closed"() {
      dockSubscribed = false;
      void dockWindow.close();
    },
    "dock-opened"() {
      dockSubscribed = true;
      void dockWindow.open();
      // A dock that just mounted has no state yet; the pump only publishes on
      // events, so without this it renders blank until combat next ticks.
      publishSnapshot();
    },
  });

  const clockNow = options.now ?? Date.now;
  const frameMetrics = createFrameMetrics({ now: clockNow });

  let lastSnapshot: Snapshot | null = null;
  let lastSnapshotAtMs = 0;
  let cachedLegality: SerializedEngineLegality | null = null;

  function invalidateTickSnapshot(): void {
    lastSnapshot = null;
    lastSnapshotAtMs = 0;
    cachedLegality = null;
  }

  function currentLegality(snapshot: Snapshot): SerializedEngineLegality {
    if (cachedLegality === null) {
      cachedLegality = serializeEngineLegality(engine, snapshot, content);
    }
    return cachedLegality;
  }

  const REALTIME_CLAMP_MS = PUMP_INTERVAL_MS;

  function presentationNowMs(): number {
    if (!lastSnapshot) {
      return Math.floor(clockNow());
    }
    const elapsed = Math.max(0, clockNow() - lastSnapshotAtMs);
    return Math.floor(
      lastSnapshot.simNowMs + Math.min(elapsed, REALTIME_CLAMP_MS),
    );
  }

  const pumpDeps = {
    advanceBy: (ms: number) => engine.advanceBy(ms),
    onAdvance: (events: EngineEvent[]) => {
      if (events.some(invalidatesLegality)) {
        cachedLegality = null;
      }
      lastSnapshot = engine.snapshot();
      lastSnapshotAtMs = clockNow();
      frameMetrics.time("applyEvents", () =>
        tile.applyEvents(events, lastSnapshot!),
      );
      if (dockSubscribed) {
        const legality = frameMetrics.time("legality", () => currentLegality(lastSnapshot!));
        frameMetrics.time("publish", () =>
          bus?.publish({ type: "pump", events, snapshot: lastSnapshot!, legality }),
        );
      }
    },
    render: () => {
      if (!lastSnapshot) {
        lastSnapshot = engine.snapshot();
        lastSnapshotAtMs = clockNow();
      }
      tile.render(lastSnapshot, presentationNowMs());
    },
    frameMetrics,
  };

  let pump: PumpController | null = null;
  function startLivePump(): void {
    if (pump) {
      return;
    }
    const schedule = options.pumpSchedule;
    const pumpOptions: PumpDeps = {
      ...pumpDeps,
      now: schedule?.now ?? clockNow,
    };
    if (schedule?.setInterval) {
      pumpOptions.setInterval = schedule.setInterval;
    }
    if (schedule?.clearInterval) {
      pumpOptions.clearInterval = schedule.clearInterval;
    }
    if (schedule?.requestAnimationFrame) {
      pumpOptions.requestAnimationFrame = schedule.requestAnimationFrame;
    }
    if (schedule?.cancelAnimationFrame) {
      pumpOptions.cancelAnimationFrame = schedule.cancelAnimationFrame;
    }
    if (schedule?.document) {
      pumpOptions.document = schedule.document;
    }
    pump = startPump(pumpOptions);
  }

  /**
   * Advances the simulation by `totalMs` immediately, without waiting for wall
   * clock. Chunked at PUMP_INTERVAL_MS so event batching matches live play.
   * Test-only: absent from production builds.
   */
  function advanceForTest(totalMs: number): void {
    let remaining = Math.max(0, Math.floor(totalMs));
    while (remaining > 0) {
      const step = Math.min(remaining, PUMP_INTERVAL_MS);
      const events = engine.advanceBy(step);
      if (events.length > 0) {
        pumpDeps.onAdvance(events);
      }
      remaining -= step;
    }
    pumpDeps.render();
  }

  if (!options.deferPump) {
    startLivePump();
  }

  if (TEST_HOOKS_ENABLED) {
    const testWindow = window as unknown as Record<string, unknown>;
    testWindow["__nightglassAdvance"] = (ms: number) => advanceForTest(ms);
    testWindow["__nightglassFrameMetrics"] = () => pump?.frameMetrics() ?? null;
    testWindow["__nightglassFrameMetricsReset"] = () => {
      frameMetrics.reset();
    };
  }

  publishSnapshot();

  const onBeforeUnload = options.onBeforeUnload;
  if (onBeforeUnload) {
    window.addEventListener("pagehide", onBeforeUnload);
  }

  return {
    startPump: startLivePump,
    stop() {
      pump?.stop();
      pump = null;
    },
    frameMetrics() {
      return pump?.frameMetrics() ?? null;
    },
    tickSnapshotAtMs() {
      return lastSnapshotAtMs;
    },
    destroy() {
      pump?.stop();
      pump = null;
      if (onBeforeUnload) {
        window.removeEventListener("pagehide", onBeforeUnload);
      }
      bus?.close();
      dockWindow.destroy();
      tile.destroy();
      bus = null;
    },
  };
}
