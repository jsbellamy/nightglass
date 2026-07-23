import type { Snapshot } from "../core/snapshot";
import type { Content } from "../core/types";
import { createBusEndpoint, type BusEndpoint } from "./bus";
import { mountManagementDock } from "./dock";
import {
  legalityViewFromSerialized,
  type SerializedEngineLegality,
} from "./engine-legality";
import { assertRegisteredEquipmentIcons } from "./icons";

/**
 * Evidence-only Dock shell mount: identical to `mountDockShell` but uses the
 * supplied Content for render and legality instead of production `buildContent()`.
 */
export function mountDockShellWithContent(
  root: HTMLElement,
  content: Content,
): { destroy(): void } {
  let bus: BusEndpoint;
  assertRegisteredEquipmentIcons(content);

  let pumpRenderScheduled = false;
  let pumpRafId: number | null = null;
  let pendingPumpSnapshot: Snapshot | null = null;
  let pendingPumpLegality: SerializedEngineLegality | null = null;

  function cancelPendingPumpRender(): void {
    if (pumpRafId !== null) {
      window.cancelAnimationFrame(pumpRafId);
      pumpRafId = null;
    }
    pumpRenderScheduled = false;
  }

  function flushCoalescedPumpRender(dock: ReturnType<typeof mountManagementDock>): void {
    pumpRafId = null;
    pumpRenderScheduled = false;
    if (!pendingPumpSnapshot || !pendingPumpLegality) {
      return;
    }
    dock.render(
      pendingPumpSnapshot,
      legalityViewFromSerialized(pendingPumpLegality, pendingPumpSnapshot, content),
    );
  }

  function scheduleCoalescedPumpRender(
    dock: ReturnType<typeof mountManagementDock>,
    snapshot: Snapshot,
    legality: SerializedEngineLegality,
  ): void {
    pendingPumpSnapshot = snapshot;
    pendingPumpLegality = legality;
    if (pumpRenderScheduled) {
      return;
    }
    pumpRenderScheduled = true;
    pumpRafId = window.requestAnimationFrame(() => {
      flushCoalescedPumpRender(dock);
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

  bus = createBusEndpoint({
    snapshot(message) {
      cancelPendingPumpRender();
      dock.render(
        message.snapshot,
        legalityViewFromSerialized(message.legality, message.snapshot, content),
      );
    },
    pump(message) {
      scheduleCoalescedPumpRender(dock, message.snapshot, message.legality);
    },
    "dock-closed"() {
      dock.setOpen(false);
    },
    "dock-opened"() {
      dock.setOpen(true);
    },
  });

  bus.publish({ type: "dock-opened" });

  return {
    destroy() {
      cancelPendingPumpRender();
      bus.close();
      dock.destroy();
    },
  };
}
