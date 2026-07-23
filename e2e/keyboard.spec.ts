import { expect, test } from "@playwright/test";
import {
  assertFocusRingVisible,
  characterPickerChipLocator,
  expectApprovedCharacterNavigationOrder,
  focusCharacterSection,
  focusCharacterView,
  focusDockTab,
  openDockFromTileKeyboard,
} from "./helpers/dock-context";
import { declareEvidenceScenario } from "./helpers/evidence-scenarios";
import { openEvidenceSession } from "./helpers/evidence-session";
import { keyboardBootSnapshot } from "./helpers/snapshots";

/**
 * Activate a bindPressable control with a keydown only. Playwright's
 * keyboard.press("Enter") also synthesizes a click, which would run the
 * bindPressable action twice — fine for idempotent selects, but it leaves a
 * dangling assignment selection after a slot assign.
 */
async function pressEnterKeydown(
  locator: import("@playwright/test").Locator,
): Promise<void> {
  await locator.evaluate((element) => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
}

test.describe("accessibility keyboard floor", () => {
  declareEvidenceScenario("keyboard-floor", async ({ browser }) => {
    test.setTimeout(180_000);
    const bootSave = JSON.stringify(keyboardBootSnapshot());
    const session = await openEvidenceSession(browser, "live-tile-and-dock", {
      bootSaveJson: bootSave,
    });
    const tile = session.tile!;
    const dock = session.dock!;
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

    // Fresh Dock starts on Armory.
    await expect(dock.locator('[data-dock-tab="armory"][aria-selected="true"]')).toBeVisible();
    await expect(dock.locator('[data-dock-panel="armory"]:not([hidden])')).toBeVisible();

    await characterPickerChipLocator(dock, "knight").focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '.character-picker-chip[aria-selected="true"]');
    await assertFocusRingVisible(dock, '[data-formation-action="move-down"][data-slot="0"]');
    await dock.locator('[data-formation-action="move-down"][data-slot="0"]').focus();
    await dock.keyboard.press("Enter");
    await expect(dock.locator('[data-pending-kind="formation"]')).toContainText(/next Wave/i);

    await characterPickerChipLocator(dock, "knight").focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '[data-party-swap="knight"]');
    await dock.locator('[data-party-swap="knight"]').focus();
    await dock.keyboard.press("Enter");
    await expect(dock.locator('[data-pending-kind="party"]')).toContainText(/next Attempt/i);

    // After the swap, Knight is Reserve — exercise → slot actions on the rail.
    await characterPickerChipLocator(dock, "knight").focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '[data-party-swap-slot="1"]');
    await dock.locator('[data-party-swap-slot="1"]').focus();
    await dock.keyboard.press("Enter");
    await expect(dock.locator('[data-pending-kind="party"]')).toContainText(/next Attempt/i);

    await characterPickerChipLocator(dock, "knight").focus();
    await dock.keyboard.press("Enter");
    await assertFocusRingVisible(dock, '[data-worn-slot="charm"]');
    await dock.locator('[data-worn-slot="charm"]').focus();
    await dock.keyboard.press("Enter");
    await expect(
      dock.locator('[data-slot-filter="charm"][aria-pressed="true"]'),
    ).toBeVisible();
    await dock.locator('[data-slot-filter="all"]').focus();
    await dock.keyboard.press("Enter");
    await expect(
      dock.locator('[data-slot-filter="all"][aria-pressed="true"]'),
    ).toBeVisible();
    await dock.locator('[data-discard-select="1"]').focus();
    await assertFocusRingVisible(dock, '[data-discard-select="1"]');
    await dock.locator('.equipment-card[data-drop-id="1"]').focus();
    await assertFocusRingVisible(dock, '.equipment-card[data-drop-id="1"]');
    await dock.locator('[data-tile-lock="1"]').focus();
    await assertFocusRingVisible(dock, '[data-tile-lock="1"]');
    await expect(dock.locator(".armory-grid")).toBeVisible();
    await expect(dock.locator('[data-armory-detail="true"]')).toHaveCount(0);
    await expect(dock.locator('[data-equip-button="true"]')).toHaveCount(0);
    await expect(dock.locator('[data-armory-character-selector="true"]')).toHaveCount(0);

    // Top-level tabs: Armory → Character → Stage roving order.
    await dock.locator('[data-dock-tab="armory"]').focus();
    await dock.keyboard.press("ArrowRight");
    await expect(dock.locator('[data-dock-tab="character"][aria-selected="true"]')).toBeVisible();
    await dock.keyboard.press("ArrowRight");
    await expect(dock.locator('[data-dock-tab="stage"][aria-selected="true"]')).toBeVisible();
    await dock.keyboard.press("ArrowLeft");
    await expect(dock.locator('[data-dock-tab="character"][aria-selected="true"]')).toBeVisible();

    await expectApprovedCharacterNavigationOrder(dock);
    await expect(dock.locator('[data-character-section="loadout"]:not([hidden])')).toBeVisible();
    await expect(dock.locator('[data-character-section="talents"]:not([hidden])')).toBeVisible();
    await characterPickerChipLocator(dock, "knight").focus();
    await dock.keyboard.press("Enter");

    const basicAttack = dock.locator('[data-class-id="knight"] [data-loadout-basic]');
    await basicAttack.focus();
    await assertFocusRingVisible(dock, '[data-class-id="knight"] [data-loadout-basic]');
    await expect(
      dock.locator('[data-loadout-ability-popover="true"]:not([hidden])'),
    ).toBeVisible();
    await expect(
      dock.locator(
        '[data-loadout-ability-popover="true"] [data-ability-description="true"]',
      ),
    ).not.toBeEmpty();

    const loadoutPoolTile = dock.locator(
      '[data-class-id="knight"] .loadout-pool-tiles [data-ability-id="pommel-break"]',
    );
    await loadoutPoolTile.focus();
    await assertFocusRingVisible(
      dock,
      '[data-class-id="knight"] .loadout-pool-tiles [data-ability-id="pommel-break"]',
    );
    await pressEnterKeydown(loadoutPoolTile);
    await expect(loadoutPoolTile).toHaveClass(/loadout-tile--selected-source/);
    await dock.keyboard.press("Escape");
    await expect(loadoutPoolTile).not.toHaveClass(/loadout-tile--selected-source/);

    await pressEnterKeydown(loadoutPoolTile);
    const loadoutSlot0 = dock.locator(
      '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="0"] [data-loadout-assign-tile]',
    );
    await loadoutSlot0.focus();
    await pressEnterKeydown(loadoutSlot0);
    await focusCharacterView(dock, "build", { focusTabChrome: true });
    await expect(dock.locator('[data-class-id="knight"] [data-pending-kind="loadout"]')).toContainText(
      /next Wave/i,
    );
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="0"] [data-ability-id="pommel-break"]',
      ),
    ).toBeVisible();

    // Slot ↔ slot swap without drag.
    await loadoutSlot0.focus();
    await pressEnterKeydown(loadoutSlot0);
    const loadoutSlot1 = dock.locator(
      '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="1"] [data-loadout-assign-tile]',
    );
    const slot1AbilityBefore = await loadoutSlot1.getAttribute("data-ability-id");
    await loadoutSlot1.focus();
    await pressEnterKeydown(loadoutSlot1);
    await focusCharacterView(dock, "build", { focusTabChrome: true });
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="1"] [data-ability-id="pommel-break"]',
      ),
    ).toBeVisible();
    if (slot1AbilityBefore) {
      await expect(
        dock.locator(
          `[data-class-id="knight"] [data-loadout-slot-drop][data-slot="0"] [data-ability-id="${slot1AbilityBefore}"]`,
        ),
      ).toBeVisible();
    }

    await dock.locator('[data-character-sub-tab="build"]').focus();
    await dock.keyboard.press("ArrowRight");
    await expect(dock.locator('[data-character-sub-tab="stats"][aria-selected="true"]')).toBeVisible();
    await dock.keyboard.press("ArrowLeft");
    await expect(dock.locator('[data-character-sub-tab="build"][aria-selected="true"]')).toBeVisible();

    await focusCharacterSection(dock, "talents");
    const fortitudeCell = dock.locator(
      '[data-class-id="knight"] .talent-cell[data-talent-id="fortitude"]',
    );
    await fortitudeCell.focus();
    await assertFocusRingVisible(
      dock,
      '[data-class-id="knight"] .talent-cell[data-talent-id="fortitude"]',
    );
    await expect(dock.locator('[data-talent-popover="true"]:not([hidden])')).toBeVisible();
    await expect(fortitudeCell).toHaveAttribute("aria-describedby", /talent-desc-fortitude/);

    const allocate = dock.locator(
      '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="allocate"]',
    );
    await allocate.focus();
    await assertFocusRingVisible(
      dock,
      '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="allocate"]',
    );
    for (let i = 0; i < 5; i++) {
      await pressEnterKeydown(allocate);
    }
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-talent-id="fortitude"] .talent-rank-stepper-value',
      ),
    ).toHaveText("5/5");

    const deallocate = dock.locator(
      '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="deallocate"]',
    );
    await deallocate.focus();
    await assertFocusRingVisible(
      dock,
      '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="deallocate"]',
    );
    await pressEnterKeydown(deallocate);
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-talent-id="fortitude"] .talent-rank-stepper-value',
      ),
    ).toHaveText("4/5");
    await pressEnterKeydown(allocate);
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-talent-id="fortitude"] .talent-rank-stepper-value',
      ),
    ).toHaveText("5/5");

    const holdLineAllocate = dock.locator(
      '[data-class-id="knight"] [data-talent-id="hold-the-line"][data-talent-action="allocate"]',
    );
    await holdLineAllocate.focus();
    await pressEnterKeydown(holdLineAllocate);
    await expect(
      dock.locator(
        '[data-class-id="knight"] .talent-cell--chosen[data-talent-id="hold-the-line"]',
      ),
    ).toBeVisible();

    const treeScroll = dock.locator('[data-class-id="knight"] .talent-tree-scroll');
    await treeScroll.evaluate((el) => {
      el.scrollTop = Math.min(40, el.scrollHeight - el.clientHeight);
    });
    const scrollBefore = await treeScroll.evaluate((el) => el.scrollTop);

    const fallingStarAllocate = dock.locator(
      '[data-class-id="knight"] [data-talent-id="falling-star"][data-talent-action="allocate"]',
    );
    await fallingStarAllocate.focus();
    await pressEnterKeydown(fallingStarAllocate);
    await expect(
      dock.locator(
        '[data-class-id="knight"] .talent-cell--chosen[data-talent-id="falling-star"]',
      ),
    ).toBeVisible();
    await expect(
      dock.locator(
        '[data-class-id="knight"] .talent-cell--chosen[data-talent-id="hold-the-line"]',
      ),
    ).toHaveCount(0);
    const scrollAfter = await treeScroll.evaluate((el) => el.scrollTop);
    expect(scrollAfter).toBe(scrollBefore);

    await focusCharacterSection(dock, "stats");
    const statsFocusables = await dock.evaluate(() => {
      const section = document.querySelector('[data-character-section="stats"]:not([hidden])');
      if (!section) {
        return null;
      }
      return [...section.querySelectorAll<HTMLElement>("[data-stat-key], .stats-row, .stats-sources")]
        .filter((node) => {
          const tabIndex = Number.parseInt(node.getAttribute("tabindex") ?? "-1", 10);
          return (
            node.matches("button, a, input, select, textarea") ||
            tabIndex >= 0 ||
            node.getAttribute("role") === "button"
          );
        })
        .map((node) => node.className);
    });
    expect(statsFocusables).toEqual([]);

    await focusDockTab(dock, "stage");
    await expect(dock.locator(".character-picker")).toBeHidden();
    const stageRail = await dock.evaluate(() => {
      const picker = document.querySelector<HTMLElement>(".character-picker");
      const firstStage = document.querySelector<HTMLElement>('[data-stage-id="1"]');
      return {
        pickerInert: picker?.inert === true,
        pickerDisplay: picker ? getComputedStyle(picker).display : null,
        stageDisabled: (firstStage as HTMLButtonElement | null)?.disabled ?? null,
      };
    });
    expect(stageRail.pickerInert).toBe(true);
    expect(stageRail.pickerDisplay).toBe("none");
    expect(stageRail.stageDisabled).toBe(false);

    await dock.locator('[data-dock-tab="stage"]').focus();
    let focusedStage = false;
    let hitRail = false;
    for (let i = 0; i < 12; i++) {
      await dock.keyboard.press("Tab");
      const focused = await dock.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return {
          stageId: el?.getAttribute("data-stage-id"),
          inRail: Boolean(el?.closest(".character-picker")),
        };
      });
      if (focused.inRail) {
        hitRail = true;
        break;
      }
      if (focused.stageId === "1") {
        focusedStage = true;
        break;
      }
    }
    expect(hitRail, "no Character rail target before Stage rows").toBe(false);
    expect(focusedStage, "first unlocked Stage row reachable by Tab").toBe(true);
    await assertFocusRingVisible(dock, '[data-stage-id="1"]');
    await dock.keyboard.press("Enter");
    await expect(dock.locator(".stage-confirm")).toBeVisible();
    await dock.locator('[data-stage-confirm="yes"]').focus();
    await assertFocusRingVisible(dock, '[data-stage-confirm="yes"]');
    await dock.keyboard.press("Enter");
    await expect(dock.locator(".stage-confirm")).toHaveCount(0);

    await session.finish();
  });
});
