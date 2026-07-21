import { expect, test } from "@playwright/test";
import {
  assertFocusRingVisible,
  attachDockPage,
  focusDockTab,
  openDockFromTileKeyboard,
  openTilePage,
} from "./helpers/dock-context";
import { keyboardBootSnapshot } from "./helpers/snapshots";

test.describe("accessibility keyboard floor", () => {
  test("keyboard — boot, open dock, reach every surface, and complete one real flow per surface with visible focus rings and no pointer", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const bootSave = JSON.stringify(keyboardBootSnapshot());
    const { context, tile } = await openTilePage(browser, bootSave);
    await tile.addInitScript(() => {
      const block = (event: Event) => {
        if (event instanceof PointerEvent) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };
      for (const type of ["pointerdown", "pointerup", "click"] as const) {
        window.addEventListener(type, block, true);
      }
    });

    await openDockFromTileKeyboard(tile);
    const dock = await attachDockPage(context);

    await focusDockTab(dock, "character");
    await dock.locator('[data-character-chip="knight"]').focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '.character-picker-chip[aria-selected="true"]');
    await assertFocusRingVisible(dock, '[data-formation-action="move-down"][data-slot="0"]');
    await dock.locator('[data-formation-action="move-down"][data-slot="0"]').focus();
    await dock.keyboard.press("Enter");
    await expect(dock.locator('[data-pending-kind="formation"]')).toContainText(/next Wave/i);

    await dock.locator('[data-character-chip="knight"]').focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '[data-party-swap="knight"]');
    await dock.locator('[data-party-swap="knight"]').focus();
    await dock.keyboard.press("Enter");
    await expect(dock.locator('[data-pending-kind="party"]')).toContainText(/next Attempt/i);

    // After the swap, Knight is Reserve — exercise → slot actions on the rail.
    await dock.locator('[data-character-chip="knight"]').focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '[data-party-swap-slot="1"]');
    await dock.locator('[data-party-swap-slot="1"]').focus();
    await dock.keyboard.press("Enter");
    await expect(dock.locator('[data-pending-kind="party"]')).toContainText(/next Attempt/i);

    await dock.locator('[data-character-chip="knight"]').focus();
    await dock.keyboard.press("Enter");
    const loadoutSelect = dock.locator('[data-class-id="knight"] [data-loadout-assign="0"]');
    await loadoutSelect.focus();
    await assertFocusRingVisible(dock, '[data-class-id="knight"] [data-loadout-assign="0"]');
    await loadoutSelect.focus();
    await loadoutSelect.evaluate((select) => {
      const el = select as HTMLSelectElement;
      if (el.options.length < 2) {
        throw new Error("loadout select missing alternate ability");
      }
      el.selectedIndex = 1;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(dock.locator('[data-class-id="knight"] [data-pending-kind="loadout"]')).toContainText(
      /next Wave/i,
    );

    await dock.locator('[data-character-chip="knight"]').focus();
    await dock.keyboard.press("Enter");
    const allocate = dock.locator(
      '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="allocate"]',
    );
    await allocate.focus();
    await assertFocusRingVisible(
      dock,
      '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="allocate"]',
    );
    await dock.keyboard.press("Enter");
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="deallocate"]',
      ),
    ).toBeVisible();

    await dock.locator('[data-character-chip="knight"]').focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '.equipment-slot-browse[data-browse-slot="charm"]');

    await focusDockTab(dock, "armory");
    await dock.locator('[data-character-chip="knight"]').focus();
    await dock.keyboard.press("Enter");
    await dock.locator('[data-discard-select="1"]').focus();
    await assertFocusRingVisible(dock, '[data-discard-select="1"]');
    await dock.locator('.equipment-card[data-drop-id="1"]').focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '.equipment-card[data-drop-id="1"]');
    await dock.locator('[data-lock-toggle="1"]').focus();
    await assertFocusRingVisible(dock, '[data-lock-toggle="1"]');
    await dock.locator('[data-equip-button="true"]').focus();
    await dock.keyboard.press("Enter");
    await expect(dock.locator(".armory-grid")).toBeVisible();
    await expect(dock.locator('[data-armory-detail="true"]')).toBeVisible();

    await focusDockTab(dock, "character");
    await dock.locator('[data-character-chip="knight"]').focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '.equipment-slot-unequip[data-unequip-slot="weapon"]');

    await focusDockTab(dock, "stage");
    await dock.locator('[data-stage-id="1"]').focus();
    await assertFocusRingVisible(dock, '[data-stage-id="1"]');
    await dock.keyboard.press("Enter");
    await expect(dock.locator(".stage-confirm")).toBeVisible();
    await dock.locator('[data-stage-confirm="yes"]').focus();
    await assertFocusRingVisible(dock, '[data-stage-confirm="yes"]');
    await dock.keyboard.press("Enter");
    await expect(dock.locator(".stage-confirm")).toHaveCount(0);

    await context.close();
  });
});
