import { expect, type Browser, type Page } from "@playwright/test";
import { DOCK_HEIGHT, DOCK_WIDTH } from "../../src/ui/dock-geometry";
import type { DockTabId } from "../../src/ui/dock";
import { TILE_HEIGHT, TILE_WIDTH } from "../../src/ui/battle-tile-layout";

export async function openTilePage(
  browser: Browser,
  savedSnapshotJson?: string,
): Promise<{ context: Awaited<ReturnType<Browser["newContext"]>>; tile: Page }> {
  const context = await browser.newContext({
    viewport: { width: TILE_WIDTH, height: TILE_HEIGHT },
    deviceScaleFactor: 1,
  });
  if (savedSnapshotJson) {
    await context.addInitScript((raw) => {
      localStorage.setItem("nightglass-save-v1", raw);
    }, savedSnapshotJson);
  }
  const tile = await context.newPage();
  await tile.goto("/", { waitUntil: "networkidle" });
  await tile.waitForSelector(".battle-tile .status-line");
  return { context, tile };
}

/** Browser-degraded Management Dock: second page on the same origin + bus handshake. */
export async function attachDockPage(
  context: Awaited<ReturnType<Browser["newContext"]>>,
): Promise<Page> {
  const dock = await context.newPage();
  await dock.setViewportSize({ width: DOCK_WIDTH, height: DOCK_HEIGHT });
  await dock.goto("/?window=dock", { waitUntil: "networkidle" });
  await dock.waitForSelector(".management-dock");
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

export type CharacterSubTabId = "loadout" | "talents" | "stats";

/** Activate a nested Character workspace tab (keyboard-only; safe under pointer blocking). */
export async function focusCharacterSubTab(dock: Page, subTab: CharacterSubTabId): Promise<void> {
  await focusDockTab(dock, "character");
  const tabButton = dock.locator(`[data-character-sub-tab="${subTab}"]`);
  const selected = await tabButton.getAttribute("aria-selected");
  if (selected !== "true") {
    await tabButton.focus();
    await dock.keyboard.press("Enter");
  }
  await expect(dock.locator(`[data-character-section="${subTab}"]:not([hidden])`)).toBeVisible();
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
