import { createEngine, type Engine } from "./core/engine";
import { buildContent } from "./data";
import { createBusEndpoint, type BusEndpoint, type TileCommand } from "./ui/bus";
import { mountBattleTile } from "./ui/battle-tile";
import { createProductionDockWindowPort, type DockWindowPort } from "./ui/dock-window";
import { mountManagementDock } from "./ui/dock";
import { startPump, type PumpController } from "./ui/pump";
import { ARMORY_BADGE_EVENT } from "./ui/presentation";
import type { EngineEvent } from "./core/events";

export { TILE_HEIGHT, TILE_WIDTH } from "./ui/battle-tile";

/** Interim #50: fresh Engine each launch until save/boot slice lands. */
const LOOT_SEED = 42;

export interface TileShellOptions {
  dockWindow?: DockWindowPort;
  busFactory?: typeof createBusEndpoint;
}

export interface TileShell extends PumpController {
  destroy(): void;
}

function isDockWindow(): boolean {
  return new URLSearchParams(window.location.search).get("window") === "dock";
}

function applyTileCommand(engine: Engine, command: TileCommand): EngineEvent[] {
  switch (command.cmd) {
    case "selectStage":
      return engine.selectStage(command.args[0]);
    case "setParty":
      engine.setParty(command.args[0].members, command.args[0].reserve);
      return [];
    case "setFormation":
      engine.setFormation(command.args[0]);
      return [];
    case "setLoadout":
      engine.setLoadout(command.args[0], command.args[1]);
      return [];
    case "allocateTalent":
      engine.allocateTalent(command.args[0], command.args[1]);
      return [];
    case "deallocateTalent":
      engine.deallocateTalent(command.args[0], command.args[1]);
      return [];
    case "equip":
      engine.equip(command.args[0], command.args[1], command.args[2]);
      return [];
    case "unequip":
      engine.unequip(command.args[0], command.args[1]);
      return [];
    case "discard":
      engine.discard(command.args[0]);
      return [];
    case "setLocked":
      engine.setLocked(command.args[0], command.args[1]);
      return [];
    case "markSeen":
      engine.markSeen(command.args[0]);
      return [];
    default: {
      const exhaustive: never = command;
      throw new Error(`Unhandled bus command: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function mountDockShell(root: HTMLElement): { destroy(): void } {
  let bus: BusEndpoint;

  const dock = mountManagementDock(root, {
    content: buildContent(),
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
      dock.render(message.snapshot);
    },
    pump(message) {
      dock.render(message.snapshot);
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

  return {
    destroy() {
      bus.close();
      dock.destroy();
    },
  };
}

export function mountTileShell(root: HTMLElement, options: TileShellOptions = {}): TileShell {
  const content = buildContent();
  const engine = createEngine(content, undefined, LOOT_SEED);
  const dockWindow = options.dockWindow ?? createProductionDockWindowPort();
  const busFactory = options.busFactory ?? createBusEndpoint;

  let bus: BusEndpoint | null = null;

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
    bus?.publish({ type: "snapshot", snapshot: engine.snapshot() });
  }

  bus = busFactory({
    command(message) {
      const events = applyTileCommand(engine, message.command);
      if (events.length > 0) {
        tile.applyEvents(events, engine.snapshot());
      }
      publishSnapshot();
    },
    "dock-closed"() {
      void dockWindow.close();
    },
    "dock-opened"() {
      void dockWindow.open();
    },
  });

  root.addEventListener(ARMORY_BADGE_EVENT, () => {
    bus?.publish({ type: "armory-badge" });
  });

  const pump = startPump({
    advanceBy: (ms) => engine.advanceBy(ms),
    onAdvance: (events) => {
      tile.applyEvents(events, engine.snapshot());
      bus?.publish({ type: "pump", events, snapshot: engine.snapshot() });
    },
    render: () => tile.render(engine.snapshot()),
  });

  publishSnapshot();

  return {
    stop() {
      pump.stop();
    },
    destroy() {
      pump.stop();
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
  mountTileShell(tileRoot);
});
