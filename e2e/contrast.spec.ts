import { expect, test } from "@playwright/test";
import { postBusSnapshot } from "./helpers/bus";
import { advanceUntilVisible } from "./helpers/advance";
import {
  assertAaContrast,
  readTextContrastSample,
} from "./helpers/contrast";
import {
  attachDockPage,
  focusCharacterSubTab,
  focusDockTab,
  openTilePage,
} from "./helpers/dock-context";
import { armoryColourSnapshot } from "./helpers/snapshots";

const DOCK_PRIMARY_TEXT: { tab: "character" | "armory" | "stage"; selector: string }[] = [
  {
    tab: "character",
    selector: ".character-picker .character-chip-name",
  },
  {
    tab: "character",
    selector: '[data-character-section="loadout"] .loadout-character .surface-section-title',
  },
  {
    tab: "character",
    selector: '[data-character-section="talents"] [data-class-id="knight"] [data-talent-points="true"]',
  },
  {
    tab: "character",
    selector:
      '[data-character-section="talents"] [data-talent-detail="true"] .talent-name',
  },
  {
    tab: "character",
    selector:
      '[data-character-section="talents"] [data-talent-detail="true"] [data-talent-action="allocate"]',
  },
  { tab: "armory", selector: ".armory-worn-strip .armory-worn-slot-label" },
  { tab: "armory", selector: '.armory-worn-strip [data-slot-filled="false"] .armory-worn-slot-empty' },
  { tab: "armory", selector: ".armory-detail .equipment-detail .equipment-name" },
  { tab: "armory", selector: ".armory-compare-popover .armory-compare-name" },
  { tab: "armory", selector: ".armory-compare-popover .armory-compare-stat-table th" },
  { tab: "armory", selector: ".armory-slot-segment" },
  { tab: "armory", selector: ".armory-state-select" },
  { tab: "armory", selector: ".armory-detail .armory-attempt-note" },
  { tab: "stage", selector: ".attempt-position" },
];

const CHARACTER_PICKER_TEXT = [
  '.character-picker-chip[aria-selected="true"] .character-chip-name',
  '.character-picker-chip[aria-selected="true"] .character-chip-level',
  '.character-picker-chip[aria-selected="false"] .character-chip-name',
  '.character-picker-chip[aria-selected="false"] .character-chip-level',
] as const;

test.describe("accessibility contrast floor", () => {
  test("evidence: aa-contrast / evidence: dock-surfaces — status line and Dock surfaces meet WCAG AA; scroll affordance appears only when a panel overflows", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const { context, tile } = await openTilePage(browser);
    const dock = await attachDockPage(context);
    await postBusSnapshot(dock, armoryColourSnapshot());

    const statusSample = await readTextContrastSample(tile, ".stage-wave-text");
    expect(statusSample).not.toBeNull();
    assertAaContrast(statusSample!);

    const toggleSample = await readTextContrastSample(tile, ".dock-toggle");
    expect(toggleSample).not.toBeNull();
    assertAaContrast(toggleSample!);

    let talentDetailPrepared = false;
    for (const { tab, selector } of DOCK_PRIMARY_TEXT) {
      await focusDockTab(dock, tab);
      if (tab === "character") {
        if (selector.includes('[data-character-section="loadout"]')) {
          await focusCharacterSubTab(dock, "loadout");
        } else if (selector.includes('[data-character-section="talents"]')) {
          await focusCharacterSubTab(dock, "talents");
          if (!talentDetailPrepared) {
            await dock
              .locator(
                '[data-character-section="talents"] [data-class-id="knight"] .talent-cell[data-talent-id="fortitude"]',
              )
              .click();
            await expect(
              dock.locator(
                '[data-character-section="talents"] [data-talent-detail="true"] .talent-name',
              ),
            ).toBeVisible();
            talentDetailPrepared = true;
          }
        }
      }
      if (tab === "armory" && selector === ".armory-detail .equipment-detail .equipment-name") {
        const tile = dock.locator('.armory-grid .equipment-card[data-drop-id="99"]');
        await expect(tile).toBeVisible({ timeout: 15_000 });
        await tile.click();
        await expect(dock.locator(selector)).toBeVisible();
      }
      if (tab === "armory" && selector.includes("armory-compare-popover")) {
        const tile = dock.locator('.armory-grid .equipment-card[data-drop-id="99"]');
        await expect(tile).toBeVisible();
        await tile.hover();
        await expect(
          dock.locator('[data-armory-compare-popover="true"]:not([hidden])'),
        ).toBeVisible();
      }
      const sample = await readTextContrastSample(dock, selector);
      expect(sample, `sample for ${selector}`).not.toBeNull();
      const ratio = assertAaContrast(sample!);
      expect(ratio, `contrast on ${selector}`).toBeGreaterThanOrEqual(4.5);
    }

    await focusDockTab(dock, "character");
    for (const selector of CHARACTER_PICKER_TEXT) {
      const sample = await readTextContrastSample(dock, selector);
      expect(sample, `picker sample ${selector}`).not.toBeNull();
      const ratio = assertAaContrast(sample!);
      expect(ratio, `picker contrast ${selector}`).toBeGreaterThanOrEqual(4.5);
    }

    await focusDockTab(dock, "stage");
    const lockedStageSample = await readTextContrastSample(
      dock,
      '[data-stage-id="2"] .stage-name',
    );
    expect(lockedStageSample, "locked Stage row name").not.toBeNull();
    expect(assertAaContrast(lockedStageSample!), "locked Stage contrast").toBeGreaterThanOrEqual(
      4.5,
    );

    await focusDockTab(dock, "character");
    const disabledControlSample = await readTextContrastSample(
      dock,
      ".formation-action:disabled",
    );
    expect(disabledControlSample, "disabled formation action").not.toBeNull();
    expect(
      assertAaContrast(disabledControlSample!),
      "disabled control contrast",
    ).toBeGreaterThanOrEqual(4.5);

    await focusDockTab(dock, "stage");
    const stageFits = await dock.evaluate(() => {
      const panel = document.querySelector(".dock-panel:not([hidden])");
      if (!panel) {
        return null;
      }
      const style = getComputedStyle(panel);
      return {
        overflowAttr: (panel as HTMLElement).dataset.overflow,
        fits: panel.scrollHeight <= panel.clientHeight + 1,
        overflowY: style.overflowY,
        scrollbarWidth: style.scrollbarWidth,
        attachment: style.backgroundAttachment,
      };
    });
    expect(stageFits).not.toBeNull();
    expect(stageFits!.fits, "short Stage panel does not overflow").toBe(true);
    expect(stageFits!.overflowAttr).toBe("false");
    expect(stageFits!.overflowY).toMatch(/auto|scroll/);
    expect(stageFits!.scrollbarWidth).toBe("thin");
    expect(stageFits!.attachment.includes("local")).toBe(false);

    await dock.evaluate(() => {
      const panel = document.querySelector(".dock-panel:not([hidden])");
      if (!panel) {
        return;
      }
      const filler = document.createElement("div");
      filler.id = "scroll-affordance-probe";
      filler.style.height = "2000px";
      filler.style.minHeight = "2000px";
      filler.style.flexShrink = "0";
      panel.append(filler);
    });
    await expect
      .poll(async () => {
        return dock.evaluate(() => {
          const panel = document.querySelector(".dock-panel:not([hidden])");
          return (panel as HTMLElement | null)?.dataset.overflow ?? null;
        });
      })
      .toBe("true");
    const overflowing = await dock.evaluate(() => {
      const panel = document.querySelector(".dock-panel:not([hidden])");
      if (!panel) {
        return null;
      }
      const style = getComputedStyle(panel);
      return {
        overflowAttr: (panel as HTMLElement).dataset.overflow,
        attachment: style.backgroundAttachment,
        canScroll: panel.scrollHeight > panel.clientHeight + 1,
      };
    });
    expect(overflowing?.overflowAttr).toBe("true");
    expect(overflowing?.canScroll).toBe(true);
    expect(overflowing?.attachment.includes("local")).toBe(true);

    await context.close();
  });

  test("colour independence — knockout, rarity, and locked-stage states expose non-colour signals", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const { context, tile } = await openTilePage(browser);
    const dock = await attachDockPage(context);

    await advanceUntilVisible(tile, tile.locator(".combatant.knocked-out"));
    await expect(tile.locator(".combatant.knocked-out")).toBeVisible();
    const knockout = await tile.evaluate(() => {
      const combatant = document.querySelector(".combatant.knocked-out");
      const sprite = combatant?.querySelector(".combatant-sprite");
      const stack = combatant?.querySelector(".combatant-stack");
      return {
        collapsed: combatant?.classList.contains("knockout-collapse") ?? false,
        desaturated: combatant?.classList.contains("knockout-desaturate") ?? false,
        spriteFilter: sprite ? getComputedStyle(sprite).filter : null,
        stackTransform: stack ? getComputedStyle(stack).transform : null,
      };
    });
    expect(
      knockout.collapsed ||
        knockout.desaturated ||
        knockout.spriteFilter !== "none" ||
        knockout.stackTransform !== "none",
    ).toBe(true);

    await postBusSnapshot(dock, armoryColourSnapshot());
    await tile.close();

    await focusDockTab(dock, "armory");
    await dock.locator('.armory-grid .equipment-card[data-drop-id="99"]').click();
    await expect(dock.locator(".armory-detail .equipment-detail .equipment-name")).toBeVisible();
    const epicCard = dock.locator(".armory-grid .equipment-card.rarity-epic");
    await expect(epicCard).toBeVisible({ timeout: 5_000 });
    await epicCard.hover();
    await expect(dock.locator('[data-armory-compare-popover="true"]:not([hidden])')).toBeVisible();
    const popoverFocus = await dock.evaluate(() => {
      const popover = document.querySelector<HTMLElement>('[data-armory-compare-popover="true"]');
      const tile = document.querySelector<HTMLElement>('.armory-grid .equipment-card[data-drop-id="99"]');
      return {
        pointerEvents: popover ? getComputedStyle(popover).pointerEvents : null,
        describedBy: tile?.getAttribute("aria-describedby") ?? null,
      };
    });
    expect(popoverFocus.pointerEvents).toBe("none");
    expect(popoverFocus.describedBy).toMatch(/armory-compare-desc-99/);
    const raritySignals = await epicCard.evaluate((card) => {
      return {
        hasIcon: card.querySelector(".equipment-icon-img--content") !== null,
        lockedLabel: card.querySelector(".locked-marker")?.getAttribute("aria-label") ?? "",
        hasNameText: (card.querySelector(".equipment-name")?.textContent?.trim().length ?? 0) > 0,
        hasUnseenWord: (card.textContent ?? "").includes("Unseen"),
      };
    });
    expect(raritySignals.hasIcon).toBe(true);
    expect(raritySignals.lockedLabel).toBe("Locked");
    expect(raritySignals.hasNameText).toBe(false);
    expect(raritySignals.hasUnseenWord).toBe(false);

    await epicCard.click();
    await expect(
      dock.locator('[data-armory-detail="true"] .equipment-detail .equipment-name'),
    ).toBeVisible();
    const detailLock = dock.locator('[data-lock-toggle="99"]');
    await expect(detailLock).toBeVisible();
    await expect(detailLock).toContainText(/Unlock/);
    await expect(
      dock.locator('[data-armory-detail="true"] .equipment-detail .locked-marker'),
    ).toContainText(/Locked/);

    await focusDockTab(dock, "stage");
    const lockedStage = await dock.evaluate(() => {
      const row = document.querySelector('[data-stage-id="2"]');
      return {
        ariaDisabled: row?.getAttribute("aria-disabled"),
        glyph: row?.querySelector(".stage-lock-glyph")?.textContent,
        disabled: (row as HTMLButtonElement | null)?.disabled ?? false,
      };
    });
    expect(lockedStage.ariaDisabled).toBe("true");
    expect(lockedStage.disabled).toBe(true);
    expect(lockedStage.glyph).toBeTruthy();

    await context.close();
  });
});
