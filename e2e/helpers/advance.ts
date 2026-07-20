import type { Page } from "@playwright/test";

/** Advances the tile's simulation by `ms` without waiting in real time. */
export async function advanceSim(page: Page, ms: number): Promise<void> {
  await page.evaluate((durationMs) => {
    const hook = (window as unknown as Record<string, unknown>)["__nightglassAdvance"];
    if (typeof hook !== "function") {
      throw new Error(
        "window.__nightglassAdvance is missing — run Playwright against an evidence build (npm run build:evidence), not production.",
      );
    }
    (hook as (totalMs: number) => void)(durationMs);
  }, ms);
}
