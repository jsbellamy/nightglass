import { createEngine, type Engine } from "./core/engine";
import { buildContent } from "./data";
import type { Content } from "./core/types";
import { bootTile } from "./ui/boot";
import { assertRegisteredEquipmentIcons } from "./ui/icons";
import { createBusEndpoint, type BusEndpoint, type TileCommand } from "./ui/bus";
import { mountBattleTile } from "./ui/battle-tile";
import { createProductionDockWindowPort, type DockWindowPort } from "./ui/dock-window";
import { mountManagementDock } from "./ui/dock";
import {
  legalityViewFromSerialized,
  serializeEngineLegality,
  type SerializedEngineLegality,
} from "./ui/engine-legality";
import { PUMP_INTERVAL_MS, startPump, type PumpController, type PumpDeps } from "./ui/pump";
import { createFrameMetrics } from "./ui/frame-metrics";
import type { TileShell } from "./ui/tile-shell-types";
import { ARMORY_BADGE_EVENT } from "./ui/bus";
import type { EngineEvent } from "./core/events";
import type { Snapshot } from "./core/snapshot";

export { TILE_HEIGHT, TILE_WIDTH } from "./ui/battle-tile";

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

export type { TileShell } from "./ui/tile-shell-types";

function isDockWindow(): boolean {
  return new URLSearchParams(window.location.search).get("window") === "dock";
}

export function applyTileCommand(engine: Engine, command: TileCommand): EngineEvent[] {
  const method = engine[command.cmd] as (...args: unknown[]) => void | EngineEvent[];
  const result = method.apply(engine, command.args);
  return Array.isArray(result) ? result : [];
}

export interface DockShellSchedule {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
}

export interface DockShellOptions {
  schedule?: DockShellSchedule;
  busFactory?: typeof createBusEndpoint;
}

export function mountDockShell(
  root: HTMLElement,
  options: DockShellOptions = {},
): { destroy(): void } {
  let bus: BusEndpoint;
  const content = buildContent();
  assertRegisteredEquipmentIcons(content);

  const schedule: DockShellSchedule = options.schedule ?? {
    requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
    cancelAnimationFrame: (handle) => window.cancelAnimationFrame(handle),
  };

  let pumpRenderScheduled = false;
  let pumpRafId: number | null = null;
  let pendingPumpSnapshot: Snapshot | null = null;
  let pendingPumpLegality: SerializedEngineLegality | null = null;

  function cancelPendingPumpRender(): void {
    if (pumpRafId !== null) {
      schedule.cancelAnimationFrame(pumpRafId);
      pumpRafId = null;
    }
    pumpRenderScheduled = false;
  }

  function flushCoalescedPumpRender(): void {
    pumpRafId = null;
    pumpRenderScheduled = false;
    if (!pendingPumpSnapshot || !pendingPumpLegality) {
      return;
    }
    dock.render(
      pendingPumpSnapshot,
      legalityViewFromSerialized(pendingPumpLegality),
    );
  }

  function scheduleCoalescedPumpRender(
    snapshot: Snapshot,
    legality: SerializedEngineLegality,
  ): void {
    pendingPumpSnapshot = snapshot;
    pendingPumpLegality = legality;
    if (pumpRenderScheduled) {
      return;
    }
    pumpRenderScheduled = true;
    pumpRafId = schedule.requestAnimationFrame(() => {
      flushCoalescedPumpRender();
    });
  }

  const dock = mountManagementDock(root, {
    content,
    onClose: () => {
      bus.publish({ type: "dock-closed" });
    },
    onCommand: (command) => {
      bus.publish({ type: "command", command });
    },
  });
  dock.setOpen(true);

  bus = (options.busFactory ?? createBusEndpoint)({
    snapshot(message) {
      cancelPendingPumpRender();
      dock.render(message.snapshot, legalityViewFromSerialized(message.legality));
    },
    pump(message) {
      scheduleCoalescedPumpRender(message.snapshot, message.legality);
    },
    "armory-badge"() {
      dock.setArmoryBadge(true);
    },
    "dock-closed"() {
      dock.setOpen(false);
    },
    "dock-opened"() {
      dock.setOpen(true);
    },
  });

  // Announce ourselves so the tile answers with a snapshot to render.
  bus.publish({ type: "dock-opened" });

  return {
    destroy() {
      cancelPendingPumpRender();
      bus.close();
      dock.destroy();
    },
  };
}

export function mountTileShell(root: HTMLElement, options: TileShellOptions = {}): TileShell {
  const content = options.content ?? buildContent();
  const engine = options.engine ?? createEngine(content, undefined, 42);
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
      legality: serializeEngineLegality(engine, snapshot, content),
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

  root.addEventListener(ARMORY_BADGE_EVENT, () => {
    bus?.publish({ type: "armory-badge" });
  });

  const clockNow = options.now ?? Date.now;
  const frameMetrics = createFrameMetrics({ now: clockNow });

  let lastSnapshot: Snapshot | null = null;
  let lastSnapshotAtMs = 0;

  function invalidateTickSnapshot(): void {
    lastSnapshot = null;
    lastSnapshotAtMs = 0;
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
      lastSnapshot = engine.snapshot();
      lastSnapshotAtMs = clockNow();
      frameMetrics.time("applyEvents", () =>
        tile.applyEvents(events, lastSnapshot!),
      );
      if (dockSubscribed) {
        const legality = frameMetrics.time("legality", () =>
          serializeEngineLegality(engine, lastSnapshot!, content),
        );
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

  if (!options.deferPump) {
    startLivePump();
  }

  if (import.meta.env.DEV) {
    const devWindow = window as unknown as Record<string, unknown>;
    devWindow["__nightglassFrameMetrics"] = () => pump?.frameMetrics() ?? null;
    devWindow["__nightglassFrameMetricsReset"] = () => {
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

window.addEventListener("DOMContentLoaded", () => {
  const tileRoot = document.querySelector<HTMLElement>("#tile");
  const dockRoot = document.querySelector<HTMLElement>("#dock");
  if (!tileRoot || !dockRoot) {
    throw new Error("#tile and #dock root elements are required");
  }

  if (isDockWindow()) {
    document.documentElement.classList.add("dock-window");
    tileRoot.hidden = true;
    dockRoot.hidden = false;
    mountDockShell(dockRoot);
    return;
  }

  dockRoot.hidden = true;
  tileRoot.hidden = false;
  bootTile(tileRoot, {
    content: buildContent(),
    mountTile: mountTileShell,
  });
});
