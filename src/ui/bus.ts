import type { Engine } from "../core/engine";
import type { EngineEvent } from "../core/events";
import type { Snapshot } from "../core/snapshot";
import type { SerializedEngineLegality } from "./engine-legality";

export const NIGHTGLASS_BUS_CHANNEL = "nightglass";

export const ARMORY_BADGE_EVENT = "nightglass:armory-badge";

/** Engine methods dispatchable across the bus. Excludes the tick/read seam and legality queries. */
export type TileCommandName = Exclude<
  keyof Engine,
  | "advanceBy"
  | "snapshot"
  | "beginFreshAttempt"
  | "canAllocateTalent"
  | "canDeallocateTalent"
  | "canEquip"
>;

export type TileCommand = {
  [K in TileCommandName]: { cmd: K; args: Parameters<Engine[K]> };
}[TileCommandName];

/** Every dispatchable Engine method must have a matching TileCommand variant. */
type Assert<T extends true> = T;
type _TileCommandCoversEngine = Assert<
  [TileCommand["cmd"]] extends [TileCommandName]
    ? [TileCommandName] extends [TileCommand["cmd"]]
      ? true
      : false
    : false
>;
void (0 as unknown as _TileCommandCoversEngine);

export type BusMessage =
  | { type: "command"; command: TileCommand }
  | { type: "snapshot"; snapshot: Snapshot; legality: SerializedEngineLegality }
  | { type: "pump"; events: EngineEvent[]; snapshot: Snapshot; legality: SerializedEngineLegality }
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
