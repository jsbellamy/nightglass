import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import type { Snapshot } from "../../src/core/snapshot";
import { DOCK_HEIGHT, DOCK_WIDTH } from "../../src/ui/dock-geometry";
import { TILE_HEIGHT, TILE_WIDTH } from "../../src/ui/battle-tile-layout";
import { postBusSnapshot } from "./bus";
import { attachDockPage, openTilePage } from "./dock-context";
import type { EvidenceFixtureId } from "./evidence-scenarios";
import { reviewSceneRoot } from "./review-scenes";

export type EvidenceSessionPreset = EvidenceFixtureId;

export type LiveTileEvidenceSessionOptions = {
  preset: "live-tile";
  /** Serialized save JSON for boot-from-snapshot evidence (third-peer bus still applies). */
  savedSnapshotJson?: string;
};

export type EvidenceSessionOptions = {
  bootSaveJson?: string;
  /** Seeds the Dock when using isolated-dock (no live Tile pump peer). */
  dockSnapshot?: Snapshot;
};

export type EvidenceSession = {
  context: BrowserContext;
  tile: Page | null;
  dock: Page | null;
  pageErrors: string[];
  /** Closes the browser context; optionally asserts collected page errors first. */
  finish: (options?: { assertPageErrors?: boolean }) => Promise<void>;
};

function trackPageErrors(page: Page, pageErrors: string[]): void {
  page.on("pageerror", (error) => pageErrors.push(String(error)));
}

function sessionHandle(
  context: BrowserContext,
  tile: Page | null,
  dock: Page | null,
  pageErrors: string[],
): EvidenceSession {
  return {
    context,
    tile,
    dock,
    pageErrors,
    finish: async (options: { assertPageErrors?: boolean } = {}) => {
      const assertPageErrors = options.assertPageErrors ?? true;
      if (assertPageErrors) {
        expect(pageErrors, "page errors").toEqual([]);
      }
      await context.close();
    },
  };
}

async function openEvidenceSessionForPreset(
  browser: Browser,
  preset: EvidenceFixtureId,
  options: EvidenceSessionOptions = {},
): Promise<EvidenceSession> {
  const pageErrors: string[] = [];
  const bootSaveJson = options.bootSaveJson;

  switch (preset) {
    case "live-tile": {
      mkdirSync(reviewSceneRoot, { recursive: true });
      const { context, tile } = await openTilePage(browser, bootSaveJson);
      trackPageErrors(tile, pageErrors);
      return sessionHandle(context, tile, null, pageErrors);
    }
    case "live-tile-seeded-snapshot": {
      const { context, tile } = await openTilePage(browser, bootSaveJson);
      trackPageErrors(tile, pageErrors);
      return sessionHandle(context, tile, null, pageErrors);
    }
    case "live-tile-and-dock": {
      const { context, tile } = await openTilePage(browser, bootSaveJson);
      trackPageErrors(tile, pageErrors);
      const dock = await attachDockPage(context);
      trackPageErrors(dock, pageErrors);
      return sessionHandle(context, tile, dock, pageErrors);
    }
    case "isolated-dock": {
      const context = await browser.newContext({
        viewport: { width: DOCK_WIDTH, height: DOCK_HEIGHT },
        deviceScaleFactor: 1,
      });
      const dock = await context.newPage();
      await dock.goto("/?window=dock", { waitUntil: "networkidle" });
      await dock.waitForSelector(".management-dock");
      if (options.dockSnapshot) {
        await postBusSnapshot(dock, options.dockSnapshot);
      }
      trackPageErrors(dock, pageErrors);
      await expect
        .poll(
          async () =>
            dock.evaluate(() => {
              const panel = document.querySelector(".dock-panel:not([hidden])");
              return panel ? panel.textContent?.trim().length ?? 0 : 0;
            }),
          { timeout: 10_000 },
        )
        .toBeGreaterThan(20);
      return sessionHandle(context, null, dock, pageErrors);
    }
    case "reduced-motion-live-tile": {
      const context = await browser.newContext({
        viewport: { width: TILE_WIDTH, height: TILE_HEIGHT },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      if (bootSaveJson) {
        await context.addInitScript((raw) => {
          localStorage.setItem("nightglass-save-v1", raw);
        }, bootSaveJson);
      }
      const tile = await context.newPage();
      await tile.goto("/", { waitUntil: "networkidle" });
      await tile.waitForSelector(".battle-tile .status-line");
      trackPageErrors(tile, pageErrors);
      return sessionHandle(context, tile, null, pageErrors);
    }
    default: {
      const _exhaustive: never = preset;
      throw new Error(`unknown evidence session preset: ${_exhaustive}`);
    }
  }
}

export async function openEvidenceSession(
  browser: Browser,
  options: LiveTileEvidenceSessionOptions,
): Promise<EvidenceSession & { tile: Page }>;
export async function openEvidenceSession(
  browser: Browser,
  preset: EvidenceSessionPreset,
  options?: EvidenceSessionOptions,
): Promise<EvidenceSession>;
export async function openEvidenceSession(
  browser: Browser,
  presetOrOptions: EvidenceSessionPreset | LiveTileEvidenceSessionOptions,
  maybeOptions?: EvidenceSessionOptions,
): Promise<EvidenceSession> {
  if (typeof presetOrOptions === "object") {
    const session = await openEvidenceSessionForPreset(browser, presetOrOptions.preset, {
      bootSaveJson: presetOrOptions.savedSnapshotJson,
    });
    if (!session.tile) {
      throw new Error(`Evidence Session preset "${presetOrOptions.preset}" did not open a tile`);
    }
    return session as EvidenceSession & { tile: Page };
  }
  return openEvidenceSessionForPreset(browser, presetOrOptions, maybeOptions ?? {});
}

export async function closeEvidenceSession(session: EvidenceSession): Promise<void> {
  await session.finish();
}
