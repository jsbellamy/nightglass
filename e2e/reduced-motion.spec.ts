import { expect, test } from "@playwright/test";
import { TILE_HEIGHT, TILE_WIDTH } from "../src/ui/tile-geometry";
import { openTilePage } from "./helpers/dock-context";

async function waitForActorPool(tile: import("@playwright/test").Page): Promise<void> {
  await expect
    .poll(
      async () => tile.locator(".actor-pool").count(),
      { timeout: 60_000, intervals: [500] },
    )
    .toBeGreaterThan(0);
}

async function waitForLungeOffset(tile: import("@playwright/test").Page): Promise<void> {
  await expect
    .poll(
      async () =>
        tile.evaluate(() => {
          const actors = [...document.querySelectorAll<HTMLElement>(".combatant[data-entity-id]")];
          return actors.some((actor) => {
            const offset = actor.dataset["bodyOffsetX"];
            return offset !== undefined && offset !== "0";
          });
        }),
      { timeout: 60_000, intervals: [200] },
    )
    .toBe(true);
}

test.describe("accessibility reduced motion", () => {
  test("evidence: reduced-motion — actor pool stays visible during Action Cycles while lunge/recoil offsets stay disabled", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const motionContext = await browser.newContext({
      viewport: { width: TILE_WIDTH, height: TILE_HEIGHT },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const reducedTile = await motionContext.newPage();
    await reducedTile.goto("/", { waitUntil: "networkidle" });
    await reducedTile.waitForSelector(".battle-tile .status-line");

    await waitForActorPool(reducedTile);
    const reducedState = await reducedTile.evaluate(() => {
      const battlefield = document.querySelector(".battlefield");
      const pools = document.querySelectorAll(".actor-pool").length;
      const offsets = [...document.querySelectorAll<HTMLElement>(".combatant")].map(
        (el) => el.dataset["bodyOffsetX"] ?? "0",
      );
      return {
        reducedClass: battlefield?.classList.contains("reduced-motion") ?? false,
        pools,
        maxOffset: Math.max(...offsets.map((value) => Math.abs(Number.parseInt(value, 10) || 0))),
      };
    });
    expect(reducedState.reducedClass).toBe(true);
    expect(reducedState.pools).toBeGreaterThan(0);
    expect(reducedState.maxOffset).toBe(0);

    await motionContext.close();

    const { context, tile } = await openTilePage(browser);
    await waitForLungeOffset(tile);
    await context.close();
  });
});
