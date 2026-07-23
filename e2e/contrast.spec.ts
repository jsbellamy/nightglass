import { expect, test } from "@playwright/test";
import { advanceUntilVisible } from "./helpers/advance";
import {
  assertAaContrast,
  readTextContrastSample,
} from "./helpers/contrast";
import {
  focusCharacterSection,
  focusDockTab,
} from "./helpers/dock-context";
import { declareEvidenceScenario } from "./helpers/evidence-scenarios";
import { openEvidenceSession } from "./helpers/evidence-session";
import { armoryColourSnapshot } from "./helpers/snapshots";

const ARMORY_COMPARE_VISIBLE = '[data-armory-compare-popover="true"]:not([hidden])';
const ARMORY_COMPARE_DROP = ".armory-grid .equipment-card.rarity-epic[data-drop-id='99']";

async function showArmoryComparePopover(
  dock: import("@playwright/test").Page,
  requireStatTable: boolean,
): Promise<void> {
  const card = dock.locator(ARMORY_COMPARE_DROP);
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.dispatchEvent("mouseenter");
  await expect(dock.locator(ARMORY_COMPARE_VISIBLE)).toBeVisible({ timeout: 15_000 });
  if (requireStatTable) {
    await expect(
      dock.locator(`${ARMORY_COMPARE_VISIBLE} .armory-compare-stat-table th`).first(),
    ).toBeVisible({ timeout: 15_000 });
  }
}

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
    selector:
      '[data-character-section="loadout"] .loadout-pool-tiles [data-loadout-assign-tile] .ability-name',
  },
  {
    tab: "character",
    selector:
      '[data-character-section="loadout"] [data-loadout-ability-popover="true"] [data-ability-description="true"]',
  },
  {
    tab: "character",
    selector: '[data-character-section="talents"] [data-class-id="knight"] [data-talent-points="true"]',
  },
  {
    tab: "character",
    selector:
      '[data-character-section="talents"] [data-talent-popover="true"] .talent-popover-name',
  },
  {
    tab: "character",
    selector:
      '[data-character-section="talents"] [data-talent-id="fortitude"][data-talent-action="allocate"]',
  },
  {
    tab: "character",
    selector:
      '[data-character-section="talents"] [data-talent-id="fortitude"][data-talent-action="deallocate"]',
  },
  {
    tab: "character",
    selector: '[data-character-section="stats"] [data-stats-xp="true"]',
  },
  {
    tab: "character",
    selector:
      '[data-character-section="stats"] [data-stat-key="physical"] .stats-total',
  },
  {
    tab: "character",
    selector:
      '[data-character-section="stats"] [data-stat-key="physical"] [data-stat-sources="true"]',
  },
  { tab: "armory", selector: ".armory-worn-strip .armory-worn-slot-label" },
  { tab: "armory", selector: '.armory-worn-strip [data-slot-filled="false"] .armory-worn-slot-empty' },
  { tab: "armory", selector: ".character-picker .character-chip-name" },
  { tab: "armory", selector: `${ARMORY_COMPARE_VISIBLE} .armory-compare-name` },
  { tab: "armory", selector: `${ARMORY_COMPARE_VISIBLE} .armory-compare-stat-table th` },
  { tab: "armory", selector: ".armory-slot-segment" },
  { tab: "armory", selector: ".armory-state-select" },
  { tab: "stage", selector: ".attempt-position" },
];

const CHARACTER_PICKER_TEXT = [
  '.character-picker-chip[aria-selected="true"] .character-chip-name',
  '.character-picker-chip[aria-selected="true"] .character-chip-level',
  '.character-picker-chip[aria-selected="false"] .character-chip-name',
  '.character-picker-chip[aria-selected="false"] .character-chip-level',
] as const;

test.describe("accessibility contrast floor", () => {
  declareEvidenceScenario("contrast-aa-dock-surfaces", async ({ browser }) => {
    test.setTimeout(60_000);
    const live = await openEvidenceSession(browser, "live-tile-and-dock");
    const tile = live.tile!;

    const statusSample = await readTextContrastSample(tile, ".stage-wave-text");
    expect(statusSample).not.toBeNull();
    assertAaContrast(statusSample!);

    const toggleSample = await readTextContrastSample(tile, ".dock-toggle");
    expect(toggleSample).not.toBeNull();
    assertAaContrast(toggleSample!);

    await live.finish();

    const isolated = await openEvidenceSession(browser, "isolated-dock", {
      dockSnapshot: armoryColourSnapshot(),
    });
    const seededDock = isolated.dock!;

    let loadoutPopoverPrepared = false;
    let talentPopoverPrepared = false;
    for (const { tab, selector } of DOCK_PRIMARY_TEXT) {
      await focusDockTab(seededDock, tab);
      if (tab === "character") {
        if (selector.includes('[data-character-section="loadout"]')) {
          await focusCharacterSection(seededDock, "loadout");
          if (
            selector.includes('[data-loadout-ability-popover="true"]') &&
            !loadoutPopoverPrepared
          ) {
            const poolTile = seededDock.locator(
              '[data-character-section="loadout"] .loadout-pool-tiles [data-loadout-assign-tile]',
            ).first();
            await poolTile.hover();
            await expect(
              seededDock.locator(
                '[data-character-section="loadout"] [data-loadout-ability-popover="true"] [data-ability-description="true"]',
              ),
            ).toBeVisible();
            loadoutPopoverPrepared = true;
          }
        } else if (selector.includes('[data-character-section="stats"]')) {
          await focusCharacterSection(seededDock, "stats");
        } else if (selector.includes('[data-character-section="talents"]')) {
          await focusCharacterSection(seededDock, "talents");
          if (!talentPopoverPrepared) {
            const fortitudeCell = seededDock.locator(
              '[data-character-section="talents"] [data-class-id="knight"] .talent-cell[data-talent-id="fortitude"]',
            );
            await fortitudeCell.hover();
            await expect(
              seededDock.locator(
                '[data-character-section="talents"] [data-talent-popover="true"] .talent-popover-name',
              ),
            ).toBeVisible();
            talentPopoverPrepared = true;
          }
        }
      }
      if (tab === "armory" && selector === ".character-picker .character-chip-name") {
        await expect(seededDock.locator(".character-picker .character-chip-name").first()).toBeVisible({
          timeout: 15_000,
        });
      }
      if (tab === "armory" && selector.includes(ARMORY_COMPARE_VISIBLE)) {
        await showArmoryComparePopover(seededDock, selector.includes("stat-table"));
      }
      const sample = await readTextContrastSample(seededDock, selector);
      expect(sample, `sample for ${selector}`).not.toBeNull();
      const ratio = assertAaContrast(sample!);
      expect(ratio, `contrast on ${selector}`).toBeGreaterThanOrEqual(4.5);
    }

    await focusDockTab(seededDock, "character");
    for (const selector of CHARACTER_PICKER_TEXT) {
      const sample = await readTextContrastSample(seededDock, selector);
      expect(sample, `picker sample ${selector}`).not.toBeNull();
      const ratio = assertAaContrast(sample!);
      expect(ratio, `picker contrast ${selector}`).toBeGreaterThanOrEqual(4.5);
    }

    await focusDockTab(seededDock, "stage");
    const lockedStageSample = await readTextContrastSample(
      seededDock,
      '[data-stage-id="2"] .stage-name',
    );
    expect(lockedStageSample, "locked Stage row name").not.toBeNull();
    expect(assertAaContrast(lockedStageSample!), "locked Stage contrast").toBeGreaterThanOrEqual(
      4.5,
    );

    await focusDockTab(seededDock, "character");
    const disabledControlSample = await readTextContrastSample(
      seededDock,
      ".formation-action:disabled",
    );
    expect(disabledControlSample, "disabled formation action").not.toBeNull();
    expect(
      assertAaContrast(disabledControlSample!),
      "disabled control contrast",
    ).toBeGreaterThanOrEqual(4.5);

    await focusDockTab(seededDock, "stage");
    const stageFits = await seededDock.evaluate(() => {
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

    await seededDock.evaluate(() => {
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
        return seededDock.evaluate(() => {
          const panel = document.querySelector(".dock-panel:not([hidden])");
          return (panel as HTMLElement | null)?.dataset.overflow ?? null;
        });
      })
      .toBe("true");
    const overflowing = await seededDock.evaluate(() => {
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

    await isolated.finish();
  });

  declareEvidenceScenario("colour-independence", async ({ browser }) => {
    test.setTimeout(60_000);
    const live = await openEvidenceSession(browser, "live-tile-and-dock");
    const tile = live.tile!;

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

    await live.finish();

    const isolated = await openEvidenceSession(browser, "isolated-dock", {
      dockSnapshot: armoryColourSnapshot(),
    });
    const seededDock = isolated.dock!;

    await focusDockTab(seededDock, "armory");
    const epicCard = seededDock.locator(".armory-grid .equipment-card.rarity-epic");
    await expect(epicCard).toBeVisible({ timeout: 5_000 });
    await epicCard.hover();
    await expect(seededDock.locator('[data-armory-compare-popover="true"]:not([hidden])')).toBeVisible();
    const popoverFocus = await seededDock.evaluate(() => {
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

    const tileLock = seededDock.locator('[data-tile-lock="99"]');
    await expect(tileLock).toBeVisible();
    await expect(tileLock).toContainText(/Unlock/);

    await focusDockTab(seededDock, "stage");
    const lockedStage = await seededDock.evaluate(() => {
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

    await isolated.finish();
  });
});
