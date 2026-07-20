import { expect, test } from "@playwright/test";
import { postBusSnapshot } from "./helpers/bus";
import { advanceUntilVisible } from "./helpers/advance";
import {
  assertAaContrast,
  readTextContrastSample,
} from "./helpers/contrast";
import { attachDockPage, focusDockTab, openTilePage } from "./helpers/dock-context";
import { armoryColourSnapshot } from "./helpers/snapshots";

const DOCK_PRIMARY_TEXT: { tab: string; selector: string }[] = [
  { tab: "party", selector: ".party-formation .character-name" },
  { tab: "loadout", selector: ".loadout-character .surface-section-title" },
  { tab: "talents", selector: '[data-class-id="knight"] [data-talent-points="true"]' },
  { tab: "armory", selector: ".equipment-name" },
  { tab: "stage", selector: ".attempt-position" },
];

test.describe("accessibility contrast floor", () => {
  test("evidence: aa-contrast — status line and all five Dock surfaces meet WCAG AA against resolved glass backgrounds", async ({
    browser,
  }) => {
    const { context, tile } = await openTilePage(browser);
    const dock = await attachDockPage(context);
    await postBusSnapshot(dock, armoryColourSnapshot());

    const statusSample = await readTextContrastSample(tile, ".stage-wave-text");
    expect(statusSample).not.toBeNull();
    assertAaContrast(statusSample!);

    const toggleSample = await readTextContrastSample(tile, ".dock-toggle");
    expect(toggleSample).not.toBeNull();
    assertAaContrast(toggleSample!);

    for (const { tab, selector } of DOCK_PRIMARY_TEXT) {
      await focusDockTab(dock, tab);
      const sample = await readTextContrastSample(dock, selector);
      expect(sample, `sample for ${tab}`).not.toBeNull();
      const ratio = assertAaContrast(sample!);
      expect(ratio, `contrast on ${tab}`).toBeGreaterThanOrEqual(4.5);
    }

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
    const epicCard = dock.locator(".armory-collection .equipment-card.rarity-epic");
    await expect(epicCard).toBeVisible({ timeout: 5_000 });
    const raritySignals = await epicCard.evaluate((card) => {
      const name = card.querySelector(".equipment-name")?.textContent?.trim();
      const meta = card.querySelector(".equipment-meta")?.textContent?.trim();
      const locked =
        card.querySelector(".locked-marker")?.textContent?.trim() ??
        card.querySelector(".equipment-lock-toggle")?.textContent?.trim();
      return {
        hasName: (name?.length ?? 0) > 0,
        hasMeta: (meta?.length ?? 0) > 0,
        lockedText: locked,
      };
    });
    expect(raritySignals.hasName).toBe(true);
    expect(raritySignals.hasMeta).toBe(true);
    expect(raritySignals.lockedText).toMatch(/Locked|Unlock/);

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
