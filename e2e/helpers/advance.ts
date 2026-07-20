import type { Locator, Page } from "@playwright/test";

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

export type AdvanceUntilOptions = {
  stepMs?: number;
  /** Sim-time budget (not wall clock) before the helper throws. */
  maxSimMs?: number;
};

/** Advance simulation in bounded steps until `condition` is true. */
export async function advanceUntil(
  page: Page,
  condition: () => Promise<boolean>,
  options: AdvanceUntilOptions = {},
): Promise<void> {
  const stepMs = options.stepMs ?? 500;
  const maxSimMs = options.maxSimMs ?? 10 * 60 * 1000;
  let advanced = 0;
  while (advanced < maxSimMs) {
    if (await condition()) {
      return;
    }
    await advanceSim(page, stepMs);
    advanced += stepMs;
  }
  if (!(await condition())) {
    throw new Error(`advanceUntil: condition not met within ${maxSimMs}ms of sim time`);
  }
}

export async function advanceUntilVisible(
  page: Page,
  locator: Locator,
  options?: AdvanceUntilOptions,
): Promise<void> {
  await advanceUntil(page, async () => locator.isVisible(), options);
}
