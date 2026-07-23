import { expect, type Page } from "@playwright/test";
import type { Snapshot } from "../../src/core/snapshot";
import { NIGHTGLASS_BUS_CHANNEL } from "../../src/ui/bus";
import type { TileCommand } from "../../src/ui/bus";

const EMPTY_SERIALIZED_LEGALITY = {
  talentAllocate: {},
  talentDeallocate: {},
};

/** Post a tile command as a third BroadcastChannel peer — no production hook. */
export async function postBusCommand(page: Page, command: TileCommand): Promise<void> {
  await page.evaluate(
    ({ channelName, command: cmd }) => {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage({ type: "command", command: cmd });
      channel.close();
    },
    { channelName: NIGHTGLASS_BUS_CHANNEL, command },
  );
}

/** Publish a Snapshot to every bus peer (e.g. seed the Management Dock Armory). */
export async function postBusSnapshot(page: Page, snapshot: Snapshot): Promise<void> {
  await page.evaluate(
    ({ channelName, snapshot: snap, legality }) => {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage({ type: "snapshot", snapshot: snap, legality });
      channel.close();
    },
    { channelName: NIGHTGLASS_BUS_CHANNEL, snapshot, legality: EMPTY_SERIALIZED_LEGALITY },
  );
}

/** Third-peer bus observer on the page — observes delivery without production hooks. */
export async function installBusSpy(page: Page): Promise<void> {
  await page.evaluate((channelName) => {
    const w = window as unknown as {
      __ngBusLog: { type: string }[];
      __ngBusSpy?: BroadcastChannel;
    };
    w.__ngBusLog = [];
    w.__ngBusSpy?.close();
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (event: MessageEvent<{ type: string }>) => {
      w.__ngBusLog.push({ type: event.data.type });
    };
    w.__ngBusSpy = channel;
  }, NIGHTGLASS_BUS_CHANNEL);
}

export async function readBusSpyTypes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __ngBusLog?: { type: string }[] };
    return (w.__ngBusLog ?? []).map((m) => m.type);
  });
}

/** Bounded wait until the third-peer log satisfies a predicate. */
export async function waitUntilBusTypes(
  page: Page,
  predicate: (types: string[]) => boolean,
  timeout = 5_000,
): Promise<void> {
  await expect
    .poll(async () => predicate(await readBusSpyTypes(page)), { timeout })
    .toBe(true);
}

export async function waitForBusMessage(
  page: Page,
  messageType: string,
  timeout = 5_000,
): Promise<void> {
  await waitUntilBusTypes(page, (types) => types.includes(messageType), timeout);
}

/** After dock-opened, tile must publish snapshot on the real bus. */
export async function waitForDockOpenedSnapshotHandshake(tile: Page, timeout = 5_000): Promise<void> {
  await waitUntilBusTypes(
    tile,
    (types) => {
      const openedAt = types.indexOf("dock-opened");
      if (openedAt < 0) return false;
      return types.slice(openedAt + 1).includes("snapshot");
    },
    timeout,
  );
}
