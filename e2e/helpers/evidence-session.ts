import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import type { Snapshot } from "../../src/core/snapshot";
import { DOCK_HEIGHT, DOCK_WIDTH } from "../../src/ui/dock-geometry";
import { TILE_HEIGHT, TILE_WIDTH } from "../../src/ui/battle-tile-layout";
import {
  attachBusCommandReplayerListener,
  bindBusCommandReplayerEngine,
  installBusSpy,
  postBusSnapshot,
  waitForDockOpenedSnapshotHandshake,
} from "./bus";
import { engineLegalityForSnapshot } from "./snapshots";
import { focusCharacterView, openTilePage } from "./dock-context";
import type { EvidenceFixtureId } from "./evidence-scenarios";
import { reviewSceneRoot } from "./review-scenes";

export type EvidenceSessionPreset = EvidenceFixtureId;

export type LiveTileEvidenceSessionOptions = {
  preset: "live-tile";
  /** Serialized save JSON for boot-from-snapshot evidence (third-peer bus still applies). */
  savedSnapshotJson?: string;
};

export type LiveTileAndDockEvidenceSessionOptions = {
  preset: "live-tile-and-dock";
};

export type EvidenceSessionObjectOptions =
  | LiveTileEvidenceSessionOptions
  | LiveTileAndDockEvidenceSessionOptions;

export type EvidenceSessionOptions = {
  bootSaveJson?: string;
  /** Seeds the Dock when using isolated-dock (no live Tile pump peer). */
  dockSnapshot?: Snapshot;
  /**
   * When set with dockSnapshot, posts production Content-derived serialized legality
   * instead of the generic empty legality helper.
   */
  seedEngineLegality?: boolean;
};

export type EvidenceSession = {
  context: BrowserContext;
  tile: Page | null;
  dock: Page | null;
  pageErrors: string[];
  /** Closes the browser context; optionally asserts collected page errors first. */
  finish: (options?: { assertPageErrors?: boolean }) => Promise<void>;
};

export async function waitForPopulatedDock(dock: Page, timeout = 10_000): Promise<void> {
  await expect
    .poll(
      async () =>
        dock.evaluate(() => {
          const panel = document.querySelector(".dock-panel:not([hidden])");
          return panel ? panel.textContent?.trim().length ?? 0 : 0;
        }),
      { timeout },
    )
    .toBeGreaterThan(20);
}

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

async function openLiveTileAndDockSession(
  browser: Browser,
  bootSaveJson?: string,
): Promise<EvidenceSession> {
  const pageErrors: string[] = [];
  const { context, tile } = await openTilePage(browser, bootSaveJson);
  trackPageErrors(tile, pageErrors);
  await installBusSpy(tile);
  const dock = await context.newPage();
  trackPageErrors(dock, pageErrors);
  await dock.setViewportSize({ width: DOCK_WIDTH, height: DOCK_HEIGHT });
  await dock.goto("/?window=dock", { waitUntil: "networkidle" });
  await dock.waitForSelector(".management-dock");
  await waitForDockOpenedSnapshotHandshake(tile);
  await waitForPopulatedDock(dock);
  return sessionHandle(context, tile, dock, pageErrors);
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
      return openLiveTileAndDockSession(browser, bootSaveJson);
    }
    case "isolated-dock": {
      const context = await browser.newContext({
        viewport: { width: DOCK_WIDTH, height: DOCK_HEIGHT },
        deviceScaleFactor: 1,
      });
      const dock = await context.newPage();
      const seedInteractive =
        Boolean(options.dockSnapshot) && Boolean(options.seedEngineLegality);
      if (seedInteractive && options.dockSnapshot) {
        await bindBusCommandReplayerEngine(dock, options.dockSnapshot);
      }
      await dock.goto("/?window=dock", { waitUntil: "networkidle" });
      await dock.waitForSelector(".management-dock");
      if (options.dockSnapshot) {
        const legality = options.seedEngineLegality
          ? engineLegalityForSnapshot(options.dockSnapshot)
          : undefined;
        await postBusSnapshot(dock, options.dockSnapshot, legality);
        if (seedInteractive) {
          await attachBusCommandReplayerListener(dock);
        }
      }
      trackPageErrors(dock, pageErrors);
      await waitForPopulatedDock(dock);
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
  options: LiveTileAndDockEvidenceSessionOptions,
): Promise<EvidenceSession>;
export async function openEvidenceSession(
  browser: Browser,
  preset: EvidenceSessionPreset,
  options?: EvidenceSessionOptions,
): Promise<EvidenceSession>;
export async function openEvidenceSession(
  browser: Browser,
  presetOrOptions: EvidenceSessionPreset | EvidenceSessionObjectOptions,
  maybeOptions?: EvidenceSessionOptions,
): Promise<EvidenceSession> {
  if (typeof presetOrOptions === "object") {
    if (presetOrOptions.preset === "live-tile-and-dock") {
      return openEvidenceSessionForPreset(browser, "live-tile-and-dock", maybeOptions ?? {});
    }
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

/**
 * Loadout drag and select-then-slot set `data-surface-preserve-live` until the anchor
 * blurs. Synthetic harness paths never complete that blur, so clear the pause flag and
 * refocus Loadout chrome so reconcile can flush the pending Snapshot.
 */
export async function reconcileLoadoutSurfaceAfterSyntheticAssignment(dock: Page): Promise<void> {
  await dock.evaluate(() => {
    for (const node of document.querySelectorAll<HTMLElement>("[data-surface-preserve-live]")) {
      delete node.dataset["surfacePreserveLive"];
    }
  });
  await focusCharacterView(dock, "build", { focusTabChrome: true });
}
