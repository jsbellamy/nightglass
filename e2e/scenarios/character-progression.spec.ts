import { expect, test } from "@playwright/test";
import {
  expectApprovedCharacterNavigationOrder,
  focusCharacterSection,
  focusDockTab,
} from "../helpers/dock-context";
import {
  closeEvidenceSession,
  openEvidenceSession,
} from "../helpers/evidence-session";
import { declareEvidenceScenario } from "../helpers/evidence-scenarios";
import { captureReviewScene } from "../helpers/review-scenes";
import { keyboardBootSnapshot } from "../helpers/snapshots";

const CHARACTER_PROGRESSION_SESSION = {
  preset: "live-tile-and-dock" as const,
  bootSaveJson: JSON.stringify(keyboardBootSnapshot()),
};

test.describe("Character progression evidence scenarios", () => {
  declareEvidenceScenario("character-stats-breakdown", async ({ browser }) => {
    const session = await openEvidenceSession(browser, CHARACTER_PROGRESSION_SESSION.preset, {
      bootSaveJson: CHARACTER_PROGRESSION_SESSION.bootSaveJson,
    });
    const dock = session.dock;
    if (!dock) {
      throw new Error("live-tile-and-dock session must include a Dock page");
    }
    await focusDockTab(dock, "character");

    const navModel = await expectApprovedCharacterNavigationOrder(dock);
    if (navModel === "legacy") {
      await expect(dock.locator('[data-character-sub-tab="loadout"][aria-selected="true"]')).toBeVisible();
    } else {
      await expect(dock.locator('[data-character-sub-tab="build"][aria-selected="true"]')).toBeVisible();
      await expect(dock.locator('[data-character-section="loadout"]:not([hidden])')).toBeVisible();
    }

    await focusCharacterSection(dock, "stats");
    const statsFit = await dock.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".dock-shell");
      const panel = document.querySelector<HTMLElement>('[data-dock-panel="character"]');
      const section = panel?.querySelector<HTMLElement>('[data-character-section="stats"]');
      if (!shell || !panel || !section || section.hidden) {
        return null;
      }
      const shellBox = shell.getBoundingClientRect();
      const rows = [...section.querySelectorAll<HTMLElement>("[data-stat-key]")];
      const interactiveRows = rows.filter((row) => {
        const tabIndex = Number.parseInt(row.getAttribute("tabindex") ?? "-1", 10);
        return (
          row.matches("button, a, input, select, textarea") ||
          tabIndex >= 0 ||
          row.getAttribute("role") === "button"
        );
      });
      const last = rows.at(-1)?.getBoundingClientRect();
      return {
        keys: rows.map((row) => row.dataset["statKey"]),
        sourceRows: section.querySelectorAll("[data-stat-sources]").length,
        totals: section.querySelectorAll("[data-stat-total]").length,
        interactiveRows: interactiveRows.length,
        panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
        lastFits:
          last !== undefined &&
          last.bottom <= shellBox.bottom + 1 &&
          last.top >= shellBox.top - 1,
      };
    });
    expect(statsFit).not.toBeNull();
    expect(statsFit!.keys).toEqual([
      "maxHealth",
      "physical",
      "elemental",
      "armor",
      "elementalResistance",
    ]);
    expect(statsFit!.sourceRows).toBe(5);
    expect(statsFit!.totals).toBe(5);
    expect(statsFit!.interactiveRows).toBe(0);
    expect(statsFit!.panelScrollable).toBe(false);
    expect(statsFit!.lastFits).toBe(true);

    await focusCharacterSection(dock, "talents");
    await dock
      .locator(
        '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="allocate"]',
      )
      .click();
    await focusCharacterSection(dock, "stats");
    await expect(dock.locator('[data-class-id="knight"] [data-pending-kind="stats"]')).toBeVisible({
      timeout: 10_000,
    });
    const pendingFit = await dock.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".dock-shell");
      const marker = document.querySelector<HTMLElement>(
        '[data-class-id="knight"] [data-pending-kind="stats"]',
      );
      if (!shell || !marker) {
        return null;
      }
      const shellBox = shell.getBoundingClientRect();
      const box = marker.getBoundingClientRect();
      return (
        box.bottom <= shellBox.bottom + 1 &&
        box.top >= shellBox.top - 1 &&
        box.right <= shellBox.right + 1 &&
        box.left >= shellBox.left - 1
      );
    });
    expect(pendingFit).toBe(true);

    await captureReviewScene(dock, "character-stats-breakdown", "character-stats-breakdown");

    await closeEvidenceSession(session);
  });

  declareEvidenceScenario("character-talents-actions", async ({ browser }) => {
    const session = await openEvidenceSession(browser, CHARACTER_PROGRESSION_SESSION.preset, {
      bootSaveJson: CHARACTER_PROGRESSION_SESSION.bootSaveJson,
    });
    const dock = session.dock;
    if (!dock) {
      throw new Error("live-tile-and-dock session must include a Dock page");
    }
    await focusDockTab(dock, "character");
    await focusCharacterSection(dock, "talents");

    const talentsFit = await dock.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-dock-panel="character"]');
      if (!panel) {
        return null;
      }
      const talentsSection = panel.querySelector<HTMLElement>('[data-character-section="talents"]');
      return {
        panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
        talentsVisible: Boolean(talentsSection && !talentsSection.hidden),
        tierSections: panel.querySelectorAll("[data-talent-tier]").length,
        tierRows: panel.querySelectorAll(".talent-tree-scroll .talent-cell").length,
        stickyDetail: panel.querySelector('[data-talent-detail="true"], aside.talent-detail') !== null,
        overflowY: getComputedStyle(panel).overflowY,
      };
    });

    expect(talentsFit, "Character talents metrics").not.toBeNull();
    expect(talentsFit!.talentsVisible).toBe(true);
    expect(talentsFit!.tierSections).toBe(2);
    expect(talentsFit!.tierRows).toBeGreaterThanOrEqual(8);
    expect(talentsFit!.panelScrollable, "two-tier tree scrolls inside the panel").toBe(true);
    expect(talentsFit!.stickyDetail, "sticky Talent detail retired").toBe(false);
    expect(talentsFit!.overflowY).toMatch(/auto|scroll/);

    const allocate = dock.locator(
      '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="allocate"]',
    );
    await expect(allocate).toHaveText("+");
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="deallocate"]',
      ),
    ).toHaveText("−");

    for (let i = 0; i < 5; i++) {
      await allocate.click();
    }
    await expect(
      dock.locator(
        '[data-class-id="knight"] .talent-cell[data-talent-id="fortitude"] .talent-rank-badge',
      ),
    ).toHaveText("5/5", { timeout: 10_000 });

    await dock
      .locator(
        '[data-class-id="knight"] [data-talent-id="hold-the-line"][data-talent-action="allocate"]',
      )
      .click();
    await expect(
      dock.locator(
        '[data-class-id="knight"] .talent-cell--chosen[data-talent-id="hold-the-line"]',
      ),
    ).toBeVisible({ timeout: 10_000 });

    const treeScroll = dock.locator('[data-class-id="knight"] .talent-tree-scroll');
    await treeScroll.evaluate((el) => {
      el.scrollTop = Math.min(48, Math.max(0, el.scrollHeight - el.clientHeight));
    });
    const scrollBefore = await treeScroll.evaluate((el) => el.scrollTop);

    await dock
      .locator(
        '[data-class-id="knight"] [data-talent-id="falling-star"][data-talent-action="allocate"]',
      )
      .click();
    await expect(
      dock.locator(
        '[data-class-id="knight"] .talent-cell--chosen[data-talent-id="falling-star"]',
      ),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      dock.locator(
        '[data-class-id="knight"] .talent-cell--chosen[data-talent-id="hold-the-line"]',
      ),
    ).toHaveCount(0);

    const scrollAfter = await treeScroll.evaluate((el) => el.scrollTop);
    expect(scrollAfter).toBe(scrollBefore);

    const gateNote = dock.locator(
      '[data-class-id="knight"] .talent-tier-gate-note, [data-class-id="knight"] .talent-gate-note',
    );
    await expect(gateNote.first()).toBeVisible();

    await captureReviewScene(dock, "character-talents-actions", "talent-direct-actions");

    await closeEvidenceSession(session);
  });
});
