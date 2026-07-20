import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { postBusCommand } from "./helpers/bus";
import { openTilePage } from "./helpers/dock-context";
import { stageThreeStressSnapshot } from "./helpers/snapshots";

const SCREENSHOTS = "e2e-screenshots";
const POOL_OVERLAP_TOLERANCE_PX = 2;

test.describe("presentation concurrency stress", () => {
  test("evidence: five-actor-pools — Stage 3 five-opponent wave renders five actor pools without pool overlap beyond tolerance", async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    mkdirSync(SCREENSHOTS, { recursive: true });
    const { context, tile } = await openTilePage(
      browser,
      JSON.stringify(stageThreeStressSnapshot()),
    );

    await postBusCommand(tile, { cmd: "selectStage", args: [3] });
    await expect(tile.locator(".stage-wave-text")).toContainText("Nightbloom", { timeout: 30_000 });

    await expect
      .poll(async () => tile.locator(".opponent-zone .combatant").count(), {
        timeout: 180_000,
        intervals: [2_000],
      })
      .toBe(5);

    await expect(tile.locator(".battlefield")).toHaveClass(/opponent-stress-layout/);

    await expect
      .poll(async () => tile.locator(".actor-pool").count(), {
        timeout: 180_000,
        intervals: [500],
      })
      .toBe(5);

    const layout = await tile.evaluate((tolerance) => {
      const pools = [...document.querySelectorAll(".actor-pool")].map((pool) => {
        const host = pool.closest(".combatant");
        const box = pool.getBoundingClientRect();
        return {
          id: host?.getAttribute("data-entity-id") ?? "unknown",
          x: box.x,
          y: box.y,
          w: box.width,
          h: box.height,
        };
      });
      const collisions: string[] = [];
      for (let i = 0; i < pools.length; i++) {
        for (let j = i + 1; j < pools.length; j++) {
          const left = pools[i]!;
          const right = pools[j]!;
          const overlap = Math.max(
            0,
            Math.min(left.x + left.w, right.x + right.w) - Math.max(left.x, right.x),
          );
          const overlapY = Math.max(
            0,
            Math.min(left.y + left.h, right.y + right.h) - Math.max(left.y, right.y),
          );
          const area = overlap * overlapY;
          if (area > tolerance * tolerance) {
            collisions.push(`${left.id} x ${right.id} (${Math.round(area)}px²)`);
          }
        }
      }
      return { poolCount: pools.length, opponentCount: document.querySelectorAll(".opponent-zone .combatant").length, collisions };
    }, POOL_OVERLAP_TOLERANCE_PX);

    expect(layout.opponentCount).toBe(5);
    expect(layout.poolCount).toBe(5);
    expect(layout.collisions, "actor pool overlap").toEqual([]);

    await tile.screenshot({ path: `${SCREENSHOTS}/07-stage3-five-pools.png` });
    await context.close();
  });
});
