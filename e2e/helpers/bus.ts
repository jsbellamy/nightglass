import type { Page } from "@playwright/test";
import type { Snapshot } from "../../src/core/snapshot";
import { NIGHTGLASS_BUS_CHANNEL } from "../../src/ui/bus";
import type { TileCommand } from "../../src/ui/bus";

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
    ({ channelName, snapshot: snap }) => {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage({ type: "snapshot", snapshot: snap });
      channel.close();
    },
    { channelName: NIGHTGLASS_BUS_CHANNEL, snapshot },
  );
}
