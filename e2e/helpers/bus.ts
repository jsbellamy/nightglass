import type { Page } from "@playwright/test";
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
