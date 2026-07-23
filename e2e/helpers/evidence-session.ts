import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import type { Snapshot } from "../../src/core/snapshot";
import { CHARACTER_LOADOUT_EVIDENCE_SESSION_KEY } from "../../src/data/fixtures/character-loadout-evidence";
import { DOCK_HEIGHT, DOCK_WIDTH } from "../../src/ui/dock-geometry";
import { TILE_HEIGHT, TILE_WIDTH } from "../../src/ui/battle-tile-layout";
import {
  attachBusCommandReplayerListener,
  bindBusCommandReplayerEngine,
  installBusSpy,
  postBusSnapshot,
} from "./bus";
import { engineLegalityForSnapshot } from "./snapshots";
import {
  attachDockPage,
  attachTilePage,
  createTileInteractiveContext,
  focusCharacterView,
  navigateDockShell,
  prepareDockPage,
  waitForPopulatedDock,
} from "./dock-context";
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

export type CharacterLoadoutEvidenceSessionOptions = {
  preset: "character-loadout-evidence";
};

export type EvidenceSessionObjectOptions =
  | LiveTileEvidenceSessionOptions
  | LiveTileAndDockEvidenceSessionOptions
  | CharacterLoadoutEvidenceSessionOptions;

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

export { waitForPopulatedDock } from "./dock-context";

function trackPageErrors(page: Page, pageErrors: string[]): void {
  page.on("pageerror", (error) => pageErrors.push(String(error)));
}

async function installCharacterLoadoutEvidenceFixture(
  context: BrowserContext,
): Promise<void> {
  await context.addInitScript(
    ({ sessionKey, fixtureId }: { sessionKey: string; fixtureId: string }) => {
      sessionStorage.setItem(sessionKey, fixtureId);
    },
    {
      sessionKey: CHARACTER_LOADOUT_EVIDENCE_SESSION_KEY,
      fixtureId: "character-loadout-evidence",
    },
  );
}

type InteractiveContextOptions = {
  viewport: { width: number; height: number };
  deviceScaleFactor?: number;
  reducedMotion?: "reduce";
  bootSaveJson?: string;
  characterLoadoutEvidence?: boolean;
};

async function createInteractiveContext(
  browser: Browser,
  options: InteractiveContextOptions,
): Promise<{ context: BrowserContext; pageErrors: string[] }> {
  const pageErrors: string[] = [];
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    ...(options.reducedMotion ? { reducedMotion: options.reducedMotion } : {}),
  });
  if (options.characterLoadoutEvidence) {
    await installCharacterLoadoutEvidenceFixture(context);
  }
  if (options.bootSaveJson) {
    await context.addInitScript((raw) => {
      localStorage.setItem("nightglass-save-v1", raw);
    }, options.bootSaveJson);
  }
  return { context, pageErrors };
}

async function openTilePeer(
  context: BrowserContext,
  pageErrors: string[],
  options: { busSpy?: boolean } = {},
): Promise<Page> {
  const tile = await attachTilePage(context);
  trackPageErrors(tile, pageErrors);
  if (options.busSpy) {
    await installBusSpy(tile);
  }
  return tile;
}

async function openDockPeer(
  context: BrowserContext,
  pageErrors: string[],
  options: { tile?: Page } = {},
): Promise<Page> {
  const dock = await attachDockPage(context, options);
  trackPageErrors(dock, pageErrors);
  return dock;
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
  const bootSaveJson = options.bootSaveJson;

  switch (preset) {
    case "live-tile": {
      mkdirSync(reviewSceneRoot, { recursive: true });
      const pageErrors: string[] = [];
      const context = await createTileInteractiveContext(browser, bootSaveJson);
      const tile = await openTilePeer(context, pageErrors);
      return sessionHandle(context, tile, null, pageErrors);
    }
    case "live-tile-seeded-snapshot": {
      const pageErrors: string[] = [];
      const context = await createTileInteractiveContext(browser, bootSaveJson);
      const tile = await openTilePeer(context, pageErrors);
      return sessionHandle(context, tile, null, pageErrors);
    }
    case "live-tile-and-dock": {
      const { context, pageErrors } = await createInteractiveContext(browser, {
        viewport: { width: TILE_WIDTH, height: TILE_HEIGHT },
        bootSaveJson,
      });
      const tile = await openTilePeer(context, pageErrors, { busSpy: true });
      const dock = await openDockPeer(context, pageErrors, { tile });
      return sessionHandle(context, tile, dock, pageErrors);
    }
    case "character-loadout-evidence": {
      const { context, pageErrors } = await createInteractiveContext(browser, {
        viewport: { width: TILE_WIDTH, height: TILE_HEIGHT },
        bootSaveJson,
        characterLoadoutEvidence: true,
      });
      const tile = await openTilePeer(context, pageErrors, { busSpy: true });
      const dock = await openDockPeer(context, pageErrors, { tile });
      return sessionHandle(context, tile, dock, pageErrors);
    }
    case "isolated-dock": {
      const { context, pageErrors } = await createInteractiveContext(browser, {
        viewport: { width: DOCK_WIDTH, height: DOCK_HEIGHT },
      });
      const dock = await prepareDockPage(context);
      const seedInteractive =
        Boolean(options.dockSnapshot) && Boolean(options.seedEngineLegality);
      if (seedInteractive && options.dockSnapshot) {
        await bindBusCommandReplayerEngine(dock, options.dockSnapshot);
      }
      await navigateDockShell(dock);
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
      const { context, pageErrors } = await createInteractiveContext(browser, {
        viewport: { width: TILE_WIDTH, height: TILE_HEIGHT },
        bootSaveJson,
        reducedMotion: "reduce",
      });
      const tile = await openTilePeer(context, pageErrors);
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
    if (
      presetOrOptions.preset === "live-tile-and-dock" ||
      presetOrOptions.preset === "character-loadout-evidence"
    ) {
      return openEvidenceSessionForPreset(browser, presetOrOptions.preset, maybeOptions ?? {});
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
