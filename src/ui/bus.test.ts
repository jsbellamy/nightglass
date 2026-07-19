// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import { createBusEndpoint, type BusMessage } from "./bus";

async function flushBus(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("nightglass BroadcastChannel bus", () => {
  it("round-trips a dock command into a tile Snapshot broadcast", async () => {
    const engine = createEngine(fixtureContent, undefined, 7);
    const tileSnapshot = vi.fn();

    const tileBus = createBusEndpoint({
      command: (message) => {
        if (message.command.cmd === "selectStage") {
          engine.selectStage(message.command.args[0]);
          tileBus.publish({ type: "snapshot", snapshot: engine.snapshot() });
        }
      },
    });

    const dockBus = createBusEndpoint({
      snapshot: (message) => {
        tileSnapshot(message.snapshot);
      },
    });

    dockBus.publish({ type: "command", command: { cmd: "selectStage", args: [1] } });
    await flushBus();

    expect(tileSnapshot).toHaveBeenCalledTimes(1);
    expect(tileSnapshot.mock.calls[0]?.[0].progression.unlockedStage).toBeGreaterThanOrEqual(1);

    tileBus.close();
    dockBus.close();
  });

  it("delivers pump batches with Snapshots to dock listeners", async () => {
    const engine = createEngine(fixtureContent, undefined, 11);
    const received: BusMessage[] = [];
    const dockBus = createBusEndpoint({
      pump: (message) => {
        received.push(message);
      },
    });

    const tileBus = createBusEndpoint({});
    tileBus.publish({
      type: "pump",
      events: [],
      snapshot: engine.snapshot(),
    });
    await flushBus();

    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe("pump");

    tileBus.close();
    dockBus.close();
  });
});
