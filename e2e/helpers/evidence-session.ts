import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { TILE_HEIGHT, TILE_WIDTH } from "../../src/ui/battle-tile-layout";
import { reviewSceneRoot } from "./review-scenes";

export type EvidenceSessionPreset =
  | "live-tile"
  | "live-tile-and-dock"
  | "isolated-dock";

export type LiveTileEvidenceSessionOptions = {
  preset: "live-tile";
  /** Serialized save JSON for boot-from-snapshot evidence (third-peer bus still applies). */
  savedSnapshotJson?: string;
};

export type EvidenceSession = {
  context: BrowserContext;
  tile: Page;
  pageErrors: string[];
};

export async function openEvidenceSession(
  browser: Browser,
  options: LiveTileEvidenceSessionOptions,
): Promise<EvidenceSession> {
  if (options.preset !== "live-tile") {
    throw new Error(`Evidence Session preset "${options.preset}" is not implemented yet`);
  }

  mkdirSync(reviewSceneRoot, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: TILE_WIDTH, height: TILE_HEIGHT },
    deviceScaleFactor: 1,
  });

  if (options.savedSnapshotJson) {
    await context.addInitScript((raw) => {
      localStorage.setItem("nightglass-save-v1", raw);
    }, options.savedSnapshotJson);
  }

  const pageErrors: string[] = [];
  const tile = await context.newPage();
  tile.on("pageerror", (error) => pageErrors.push(String(error)));

  await tile.goto("/", { waitUntil: "networkidle" });
  await tile.waitForSelector(".battle-tile .status-line");

  return { context, tile, pageErrors };
}

export async function closeEvidenceSession(session: EvidenceSession): Promise<void> {
  expect(session.pageErrors, "tile page errors").toEqual([]);
  await session.context.close();
}
