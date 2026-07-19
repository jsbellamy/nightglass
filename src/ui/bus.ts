import type { EngineEvent } from "../core/events";
import type { Snapshot } from "../core/snapshot";
import type { ClassId, EquipmentSlotId } from "../core/types";

export const NIGHTGLASS_BUS_CHANNEL = "nightglass";

export type TileCommand =
  | { cmd: "selectStage"; args: [1 | 2 | 3] }
  | {
      cmd: "setParty";
      args: [{ members: [ClassId, ClassId, ClassId]; reserve: ClassId }];
    }
  | { cmd: "setFormation"; args: [[ClassId, ClassId, ClassId]] }
  | {
      cmd: "setLoadout";
      args: [ClassId, [string, string, string]];
    }
  | { cmd: "allocateTalent"; args: [ClassId, string] }
  | { cmd: "deallocateTalent"; args: [ClassId, string] }
  | {
      cmd: "equip";
      args: [number, ClassId, EquipmentSlotId];
    }
  | { cmd: "unequip"; args: [ClassId, EquipmentSlotId] }
  | { cmd: "discard"; args: [number[]] };

export type BusMessage =
  | { type: "command"; command: TileCommand }
  | { type: "snapshot"; snapshot: Snapshot }
  | { type: "pump"; events: EngineEvent[]; snapshot: Snapshot }
  | { type: "armory-badge" }
  | { type: "dock-opened" }
  | { type: "dock-closed" };

type BusHandlerMap = {
  [M in BusMessage as M["type"]]?: (message: M) => void;
};

export interface BusEndpoint {
  publish(message: BusMessage): void;
  close(): void;
}

export function createBusEndpoint(
  handlers: BusHandlerMap,
  channelName: string = NIGHTGLASS_BUS_CHANNEL,
): BusEndpoint {
  const channel = new BroadcastChannel(channelName);

  channel.onmessage = (event: MessageEvent<BusMessage>) => {
    const message = event.data;
    const handler = handlers[message.type];
    if (handler) {
      handler(message as never);
    }
  };

  return {
    publish(message) {
      channel.postMessage(message);
    },
    close() {
      channel.close();
    },
  };
}
