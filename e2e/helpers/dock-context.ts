import { expect, type Browser, type Page } from "@playwright/test";
import { DOCK_HEIGHT, DOCK_WIDTH } from "../../src/ui/dock-geometry";
import type { DockTabId } from "../../src/ui/dock";
import { TILE_HEIGHT, TILE_WIDTH } from "../../src/ui/battle-tile-layout";
import { waitForDockOpenedSnapshotHandshake } from "./bus";

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

export async function createTileInteractiveContext(
  browser: Browser,
  savedSnapshotJson?: string,
): Promise<Awaited<ReturnType<Browser["newContext"]>>> {
  const context = await browser.newContext({
    viewport: { width: TILE_WIDTH, height: TILE_HEIGHT },
    deviceScaleFactor: 1,
  });
  if (savedSnapshotJson) {
    await context.addInitScript((raw) => {
      localStorage.setItem("nightglass-save-v1", raw);
    }, savedSnapshotJson);
  }
  return context;
}

export async function attachTilePage(
  context: Awaited<ReturnType<Browser["newContext"]>>,
): Promise<Page> {
  const tile = await context.newPage();
  await tile.goto("/", { waitUntil: "networkidle" });
  await tile.waitForSelector(".battle-tile .status-line");
  return tile;
}

export async function openTilePage(
  browser: Browser,
  savedSnapshotJson?: string,
): Promise<{ context: Awaited<ReturnType<Browser["newContext"]>>; tile: Page }> {
  const context = await createTileInteractiveContext(browser, savedSnapshotJson);
  const tile = await attachTilePage(context);
  return { context, tile };
}

export async function prepareDockPage(
  context: Awaited<ReturnType<Browser["newContext"]>>,
): Promise<Page> {
  const dock = await context.newPage();
  await dock.setViewportSize({ width: DOCK_WIDTH, height: DOCK_HEIGHT });
  return dock;
}

export async function navigateDockShell(dock: Page): Promise<void> {
  await dock.goto("/?window=dock", { waitUntil: "networkidle" });
  await dock.waitForSelector(".management-dock");
}

export type AttachDockPageOptions = {
  /** When set, waits for tile bus handshake before populated-dock poll. */
  tile?: Page;
};

/** Browser-degraded Management Dock: second page on the same origin + bus handshake. */
export async function attachDockPage(
  context: Awaited<ReturnType<Browser["newContext"]>>,
  options: AttachDockPageOptions = {},
): Promise<Page> {
  const dock = await prepareDockPage(context);
  await navigateDockShell(dock);
  if (options.tile) {
    await waitForDockOpenedSnapshotHandshake(options.tile);
  }
  await waitForPopulatedDock(dock);
  return dock;
}

export async function openTileAndDock(
  browser: Browser,
  savedSnapshotJson?: string,
): Promise<{ context: Awaited<ReturnType<Browser["newContext"]>>; tile: Page; dock: Page }> {
  const { context, tile } = await openTilePage(browser, savedSnapshotJson);
  const dock = await attachDockPage(context);
  return { context, tile, dock };
}

/** Keyboard-open the dock toggle on the Battle Tile (no pointer). */
export async function openDockFromTileKeyboard(tile: Page): Promise<void> {
  await tile.locator(".dock-toggle").focus();
  await tile.keyboard.press("Enter");
}

export async function focusDockTab(dock: Page, tab: DockTabId): Promise<void> {
  const tabButton = dock.locator(`[data-dock-tab="${tab}"]`);
  const selected = await tabButton.getAttribute("aria-selected");
  if (selected !== "true") {
    await tabButton.focus();
    await dock.keyboard.press("Enter");
  }
  await expect(dock.locator(`[data-dock-panel="${tab}"]:not([hidden])`)).toBeVisible();
}

export type CharacterViewId = "build" | "stats";

const CHARACTER_VIEW_ORDER: readonly CharacterViewId[] = ["build", "stats"];

export type CharacterBuildSectionId = "loadout" | "talents";

export type FocusCharacterViewOptions = {
  /** Focus the header tab control even when that view is already active (popover dismiss, Loadout reconcile). */
  focusTabChrome?: boolean;
};

async function readCharacterNavigationOrder(dock: Page): Promise<string[]> {
  return dock.evaluate(() =>
    [...document.querySelectorAll("[data-character-sub-tab]")].map(
      (button) => (button as HTMLElement).dataset.characterSubTab ?? "",
    ),
  );
}

export async function expectApprovedCharacterNavigationOrder(dock: Page): Promise<void> {
  const order = await readCharacterNavigationOrder(dock);
  expect(order).toEqual([...CHARACTER_VIEW_ORDER]);
  await expect(dock.locator('[data-character-sub-tab="build"][aria-selected="true"]')).toBeVisible();
}

async function activateCharacterNavTab(
  dock: Page,
  view: CharacterViewId,
  options: { focusTabChrome?: boolean } = {},
): Promise<void> {
  const tabButton = dock.locator(`[data-character-sub-tab="${view}"]`);
  const selected = await tabButton.getAttribute("aria-selected");
  if (selected !== "true") {
    await tabButton.focus();
    await dock.keyboard.press("Enter");
  } else if (options.focusTabChrome) {
    await tabButton.focus();
  }
  await expect(tabButton).toHaveAttribute("aria-selected", "true");
}

/** Activates Build or Stats; on Build, both Loadout and Talents columns must be visible. */
export async function focusCharacterView(
  dock: Page,
  view: CharacterViewId,
  options: FocusCharacterViewOptions = {},
): Promise<void> {
  await focusDockTab(dock, "character");
  await activateCharacterNavTab(dock, view, options);
  if (view === "build") {
    await expect(dock.locator('[data-character-section="loadout"]:not([hidden])')).toBeVisible();
    await expect(dock.locator('[data-character-section="talents"]:not([hidden])')).toBeVisible();
  } else {
    await expect(dock.locator('[data-character-section="stats"]:not([hidden])')).toBeVisible();
  }
}

/**
 * Semantic Build-board sections (Loadout, Talents) and Stats view activation for evidence scenarios.
 */
export async function focusCharacterSection(
  dock: Page,
  section: CharacterBuildSectionId | "stats",
  options: FocusCharacterViewOptions = {},
): Promise<void> {
  if (section === "stats") {
    await focusCharacterView(dock, "stats", options);
    return;
  }
  await focusCharacterView(dock, "build", options);
  await expect(dock.locator(`[data-character-section="${section}"]:not([hidden])`)).toBeVisible();
}

export async function assertFocusRingVisible(page: Page, selector: string): Promise<void> {
  const ring = await page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) {
      return null;
    }
    el.focus();
    const style = getComputedStyle(el);
    const width = Number.parseFloat(style.outlineWidth || "0");
    return {
      width,
      style: style.outlineStyle,
      hasClass: el.classList.contains("focus-ring"),
    };
  }, selector);
  expect(ring, `focus ring on ${selector}`).not.toBeNull();
  expect(ring!.hasClass, `focus-ring class on ${selector}`).toBe(true);
  expect(ring!.width, `outline width on ${selector}`).toBeGreaterThan(0);
  expect(ring!.style, `outline style on ${selector}`).not.toBe("none");
}

export function characterPickerChipLocator(page: Page, classId: string) {
  return page.locator(`.character-picker [data-character-chip="${classId}"]`);
}

export function armoryCharacterChipLocator(page: Page, classId: string) {
  return characterPickerChipLocator(page, classId);
}
