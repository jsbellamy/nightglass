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

export type CharacterSectionId = "loadout" | "talents" | "stats";

/** @deprecated Use {@link CharacterSectionId}. */
export type CharacterSubTabId = CharacterSectionId;

const LEGACY_CHARACTER_NAV_ORDER = ["loadout", "talents", "stats"] as const;
const SUCCESSOR_CHARACTER_NAV_ORDER = ["build", "stats"] as const;

export type CharacterNavigationModel = "legacy" | "successor";

/**
 * Expand Character evidence helpers for the Build/Stats migration (#511) —
 * classifies DOM tab order during the interim expand phase only.
 */
function classifyCharacterNavigationOrder(
  subTabIds: readonly (string | undefined)[],
): CharacterNavigationModel {
  const order = subTabIds.map((id) => id ?? "");
  if (order.length === LEGACY_CHARACTER_NAV_ORDER.length) {
    const legacy = LEGACY_CHARACTER_NAV_ORDER.every((id, index) => order[index] === id);
    if (legacy) {
      return "legacy";
    }
  }
  if (order.length === SUCCESSOR_CHARACTER_NAV_ORDER.length) {
    const successor = SUCCESSOR_CHARACTER_NAV_ORDER.every((id, index) => order[index] === id);
    if (successor) {
      return "successor";
    }
  }
  throw new Error(
    `Character navigation must be exactly ${LEGACY_CHARACTER_NAV_ORDER.join(",")} or ${SUCCESSOR_CHARACTER_NAV_ORDER.join(",")}; got ${order.join(",")}`,
  );
}

async function readCharacterNavigationOrder(dock: Page): Promise<string[]> {
  return dock.evaluate(() =>
    [...document.querySelectorAll("[data-character-sub-tab]")].map(
      (button) => (button as HTMLElement).dataset.characterSubTab ?? "",
    ),
  );
}

export async function expectApprovedCharacterNavigationOrder(dock: Page): Promise<CharacterNavigationModel> {
  const order = await readCharacterNavigationOrder(dock);
  const model = classifyCharacterNavigationOrder(order);
  if (model === "legacy") {
    expect(order).toEqual([...LEGACY_CHARACTER_NAV_ORDER]);
  } else {
    expect(order).toEqual([...SUCCESSOR_CHARACTER_NAV_ORDER]);
  }
  return model;
}

export type FocusCharacterSectionOptions = {
  /** Focus the header tab control even when that section is already active (popover dismiss, Loadout reconcile). */
  focusTabChrome?: boolean;
};

function characterHeaderTabForSection(
  model: CharacterNavigationModel,
  section: CharacterSectionId,
): string {
  if (model === "legacy") {
    return section;
  }
  return section === "stats" ? "stats" : "build";
}

async function activateCharacterNavTab(
  dock: Page,
  tabId: string,
  options: { focusTabChrome?: boolean } = {},
): Promise<void> {
  const tabButton = dock.locator(`[data-character-sub-tab="${tabId}"]`);
  const selected = await tabButton.getAttribute("aria-selected");
  if (selected !== "true") {
    await tabButton.focus();
    await dock.keyboard.press("Enter");
  } else if (options.focusTabChrome) {
    await tabButton.focus();
  }
  await expect(tabButton).toHaveAttribute("aria-selected", "true");
}

/**
 * Expand Character evidence helpers for the Build/Stats migration (#511) —
 * opens the semantic Character section on legacy three-sub-tab or successor Build/Stats UI.
 */
export async function focusCharacterSection(
  dock: Page,
  section: CharacterSectionId,
  options: FocusCharacterSectionOptions = {},
): Promise<void> {
  await focusDockTab(dock, "character");
  const model = classifyCharacterNavigationOrder(await readCharacterNavigationOrder(dock));
  const headerTab = characterHeaderTabForSection(model, section);

  await activateCharacterNavTab(dock, headerTab, options);

  await expect(dock.locator(`[data-character-section="${section}"]:not([hidden])`)).toBeVisible();
}

/** @deprecated Prefer {@link focusCharacterSection}. */
export async function focusCharacterSubTab(dock: Page, subTab: CharacterSubTabId): Promise<void> {
  await focusCharacterSection(dock, subTab);
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
