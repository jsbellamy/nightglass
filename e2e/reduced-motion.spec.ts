import { expect, test } from "@playwright/test";
import { declareEvidenceScenario } from "./helpers/evidence-scenarios";
import { openEvidenceSession } from "./helpers/evidence-session";

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
  declareEvidenceScenario("reduced-motion", async ({ browser }) => {
    test.setTimeout(120_000);

    const reduced = await openEvidenceSession(browser, "reduced-motion-live-tile");
    const reducedTile = reduced.tile!;

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

    await reduced.finish();

    const control = await openEvidenceSession(browser, "live-tile");
    const tile = control.tile!;
    await waitForLungeOffset(tile);
    await control.finish();
  });
});
