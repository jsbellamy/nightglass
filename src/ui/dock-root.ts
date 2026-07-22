import { buildContent } from "../data";
import type { Snapshot } from "../core/snapshot";
import { assertRegisteredEquipmentIcons } from "./icons";
import {
  createBusEndpoint,
  type BusEndpoint,
} from "./bus";
import { mountManagementDock } from "./dock";
import {
  legalityViewFromSerialized,
  type SerializedEngineLegality,
} from "./engine-legality";

export interface DockShellSchedule {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
}

export interface DockShellOptions {
  schedule?: DockShellSchedule;
  busFactory?: typeof createBusEndpoint;
  dockFactory?: typeof mountManagementDock;
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
  const dockFactory = options.dockFactory ?? mountManagementDock;

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

  const dock = dockFactory(root, {
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
