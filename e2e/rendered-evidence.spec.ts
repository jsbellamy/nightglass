import { expect, test } from "@playwright/test";
import { NIGHTGLASS_BUS_CHANNEL } from "../src/ui/bus";
import { declareEvidenceScenario } from "./helpers/evidence-scenarios";
import { focusDockTab, openTileAndDock } from "./helpers/dock-context";
import { keyboardBootSnapshot } from "./helpers/snapshots";

const SCREENSHOTS = "e2e-screenshots";

test.describe("rendered-output evidence seam", () => {
  declareEvidenceScenario("character-loadout", async ({ browser }) => {
    const { context, dock } = await openTileAndDock(
      browser,
      JSON.stringify(keyboardBootSnapshot()),
    );
    await focusDockTab(dock, "character");

    const loadoutFit = await dock.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-dock-panel="character"]');
      const shell = document.querySelector<HTMLElement>(".dock-shell");
      if (!panel || !shell) {
        return null;
      }
      const loadoutSection = panel.querySelector<HTMLElement>('[data-character-section="loadout"]');
      const panelBox = panel.getBoundingClientRect();
      const shellBox = shell.getBoundingClientRect();
      const lastSlot = panel.querySelector<HTMLElement>(".loadout-slot:last-of-type");
      const lastBox = lastSlot?.getBoundingClientRect();
      const poolTiles = panel.querySelectorAll(".loadout-pool-tiles [data-loadout-assign-tile]");
      return {
        panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
        loadoutVisible: Boolean(loadoutSection && !loadoutSection.hidden),
        overflowY: getComputedStyle(panel).overflowY,
        slots: panel.querySelectorAll(".loadout-slot").length,
        poolCount: poolTiles.length,
        lastSlotFits:
          lastBox !== undefined &&
          lastBox.bottom <= panelBox.bottom + 1 &&
          lastBox.top >= panelBox.top - 1 &&
          lastBox.bottom <= shellBox.bottom + 1,
        inlineAbilityCopy: [...panel.querySelectorAll(".loadout-assign-tile .ability-description")]
          .length,
      };
    });

    expect(loadoutFit, "Character panel metrics").not.toBeNull();
    expect(loadoutFit!.loadoutVisible).toBe(true);
    expect(loadoutFit!.slots).toBe(3);
    expect(loadoutFit!.poolCount).toBeGreaterThan(0);
    expect(loadoutFit!.panelScrollable, "loadout fits without panel scroll").toBe(false);
    expect(loadoutFit!.lastSlotFits, "third loadout slot visible without scroll").toBe(true);
    expect(loadoutFit!.overflowY).toMatch(/auto|scroll/);
    expect(loadoutFit!.inlineAbilityCopy, "no inline Ability copy on tiles").toBe(0);

    await dock.evaluate((channelName) => {
      const w = window as unknown as { __ngCmdLog?: unknown[]; __ngCmdSpy?: BroadcastChannel };
      w.__ngCmdLog = [];
      w.__ngCmdSpy?.close();
      const channel = new BroadcastChannel(channelName);
      channel.onmessage = (event: MessageEvent<{ type: string; command?: unknown }>) => {
        if (event.data.type === "command") {
          w.__ngCmdLog?.push(event.data.command);
        }
      };
      w.__ngCmdSpy = channel;
    }, NIGHTGLASS_BUS_CHANNEL);

    const dragHighlights = await dock.evaluate(() => {
      const source = document.querySelector<HTMLElement>(
        '[data-class-id="knight"] .loadout-pool-tiles [data-ability-id="pommel-break"]',
      );
      if (!source) {
        return null;
      }
      const dataTransfer = new DataTransfer();
      source.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
      );
      const result = {
        source: source.classList.contains("loadout-drag-source"),
        validTargets: document.querySelectorAll(".loadout-drop-target--valid").length,
      };
      source.dispatchEvent(
        new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }),
      );
      return result;
    });
    expect(dragHighlights).not.toBeNull();
    expect(dragHighlights!.source).toBe(true);
    expect(dragHighlights!.validTargets).toBe(3);

    const replaced = await dock.evaluate(() => {
      const source = document.querySelector<HTMLElement>(
        '[data-class-id="knight"] .loadout-pool-tiles [data-ability-id="pommel-break"]',
      );
      const target = document.querySelector<HTMLElement>(
        '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="0"]',
      );
      if (!source || !target) {
        return false;
      }
      const dataTransfer = new DataTransfer();
      source.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
      );
      target.dispatchEvent(
        new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }),
      );
      target.dispatchEvent(
        new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }),
      );
      source.dispatchEvent(
        new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }),
      );
      return true;
    });
    expect(replaced).toBe(true);
    await expect
      .poll(async () =>
        dock.evaluate(() => {
          const w = window as unknown as { __ngCmdLog?: { cmd?: string }[] };
          return (w.__ngCmdLog ?? []).some((command) => command.cmd === "setLoadout");
        }),
      )
      .toBe(true);
    // Drag sets data-surface-preserve-live on the source and only clears it on blur.
    // Synthetic drag never focuses the tile, so clear the pause flag then refocus chrome
    // so reconcile can flush the pending Snapshot (mirrors the keyboard floor flush).
    await dock.evaluate(() => {
      for (const node of document.querySelectorAll<HTMLElement>("[data-surface-preserve-live]")) {
        delete node.dataset["surfacePreserveLive"];
      }
    });
    await dock.locator('[data-character-sub-tab="loadout"]').focus();
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="0"] [data-ability-id="pommel-break"]',
      ),
    ).toBeVisible({ timeout: 10_000 });

    const slot1AbilityBefore = await dock
      .locator('[data-class-id="knight"] [data-loadout-slot-drop][data-slot="1"] [data-loadout-assign-tile]')
      .getAttribute("data-ability-id");
    const swapped = await dock.evaluate(() => {
      const source = document.querySelector<HTMLElement>(
        '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="0"] [data-ability-id="pommel-break"]',
      );
      const target = document.querySelector<HTMLElement>(
        '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="1"]',
      );
      if (!source || !target) {
        return false;
      }
      const dataTransfer = new DataTransfer();
      source.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
      );
      target.dispatchEvent(
        new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }),
      );
      target.dispatchEvent(
        new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }),
      );
      source.dispatchEvent(
        new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }),
      );
      return true;
    });
    expect(swapped).toBe(true);
    await dock.evaluate(() => {
      for (const node of document.querySelectorAll<HTMLElement>("[data-surface-preserve-live]")) {
        delete node.dataset["surfacePreserveLive"];
      }
    });
    await dock.locator('[data-character-sub-tab="loadout"]').focus();
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="1"] [data-ability-id="pommel-break"]',
      ),
    ).toBeVisible({ timeout: 10_000 });
    if (slot1AbilityBefore) {
      await expect(
        dock.locator(
          `[data-class-id="knight"] [data-loadout-slot-drop][data-slot="0"] [data-ability-id="${slot1AbilityBefore}"]`,
        ),
      ).toBeVisible();
    }

    const pommelInSlot = dock.locator(
      '[data-class-id="knight"] [data-loadout-slot-drop] [data-ability-id="pommel-break"]',
    );
    await pommelInSlot.click();
    await expect(pommelInSlot).toHaveClass(/loadout-tile--selected-source/);
    await expect(dock.locator(".loadout-slot--valid-target")).toHaveCount(3);
    const slot2Tile = dock.locator(
      '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="2"] [data-loadout-assign-tile]',
    );
    const slot2Before = await slot2Tile.getAttribute("data-ability-id");
    await slot2Tile.click();
    await dock.evaluate(() => {
      for (const node of document.querySelectorAll<HTMLElement>("[data-surface-preserve-live]")) {
        delete node.dataset["surfacePreserveLive"];
      }
    });
    await dock.locator('[data-character-sub-tab="loadout"]').focus();
    await expect(
      dock.locator(
        '[data-class-id="knight"] [data-loadout-slot-drop][data-slot="2"] [data-ability-id="pommel-break"]',
      ),
    ).toBeVisible({ timeout: 10_000 });
    if (slot2Before) {
      await expect(
        dock.locator(
          `[data-class-id="knight"] [data-loadout-slot-drop][data-slot="1"] [data-ability-id="${slot2Before}"]`,
        ),
      ).toBeVisible();
    }

    await dock.screenshot({ path: `${SCREENSHOTS}/06-character-loadout-assignment.png` });
    await context.close();
  });

  declareEvidenceScenario("character-information-popovers", async ({ browser }) => {
    const { context, dock } = await openTileAndDock(
      browser,
      JSON.stringify(keyboardBootSnapshot()),
    );
    await focusDockTab(dock, "character");

    const basic = dock.locator('[data-class-id="knight"] [data-loadout-basic]');
    await basic.hover();
    await expect(dock.locator('[data-loadout-ability-popover="true"]:not([hidden])')).toBeVisible();
    const hoverAbilityText = await dock
      .locator('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
      .innerText();

    await basic.focus();
    await expect(dock.locator('[data-loadout-ability-popover="true"]:not([hidden])')).toBeVisible();
    const focusAbilityText = await dock
      .locator('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
      .innerText();
    expect(focusAbilityText).toBe(hoverAbilityText);

    const abilityPopover = await dock.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".dock-shell");
      const pop = document.querySelector<HTMLElement>('[data-loadout-ability-popover="true"]');
      if (!shell || !pop || pop.hidden) {
        return null;
      }
      const shellBox = shell.getBoundingClientRect();
      const popBox = pop.getBoundingClientRect();
      return {
        pointerEvents: getComputedStyle(pop).pointerEvents,
        fitsShell:
          popBox.left >= shellBox.left - 1 &&
          popBox.right <= shellBox.right + 1 &&
          popBox.top >= shellBox.top - 1 &&
          popBox.bottom <= shellBox.bottom + 1,
        noInnerScroll: pop.scrollHeight <= pop.clientHeight + 1,
        hasAction: pop.querySelector("button, [data-talent-action], [data-loadout-assign-tile]") !== null,
      };
    });
    expect(abilityPopover).not.toBeNull();
    expect(abilityPopover!.pointerEvents).toBe("none");
    expect(abilityPopover!.fitsShell).toBe(true);
    expect(abilityPopover!.noInnerScroll).toBe(true);
    expect(abilityPopover!.hasAction).toBe(false);

    await dock.mouse.move(0, 0);
    await dock.locator('[data-character-sub-tab="loadout"]').focus();
    await expect(dock.locator('[data-loadout-ability-popover="true"]')).toBeHidden();

    await dock.click('[data-character-sub-tab="talents"]');
    const fortitude = dock.locator(
      '[data-class-id="knight"] .talent-cell[data-talent-id="fortitude"]',
    );
    await fortitude.hover();
    await expect(dock.locator('[data-talent-popover="true"]:not([hidden])')).toBeVisible();
    const hoverTalentText = await dock.locator('[data-talent-popover="true"]').innerText();

    await fortitude.focus();
    await expect(dock.locator('[data-talent-popover="true"]:not([hidden])')).toBeVisible();
    const focusTalentText = await dock.locator('[data-talent-popover="true"]').innerText();
    expect(focusTalentText).toBe(hoverTalentText);
    await expect(fortitude).toHaveAttribute("aria-describedby", /talent-desc-fortitude/);

    const talentPopover = await dock.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".dock-shell");
      const pop = document.querySelector<HTMLElement>('[data-talent-popover="true"]');
      if (!shell || !pop || pop.hidden) {
        return null;
      }
      const shellBox = shell.getBoundingClientRect();
      const popBox = pop.getBoundingClientRect();
      return {
        pointerEvents: getComputedStyle(pop).pointerEvents,
        fitsShell:
          popBox.left >= shellBox.left - 1 &&
          popBox.right <= shellBox.right + 1 &&
          popBox.top >= shellBox.top - 1 &&
          popBox.bottom <= shellBox.bottom + 1,
        hasAction: pop.querySelector("button, [data-talent-action]") !== null,
      };
    });
    expect(talentPopover).not.toBeNull();
    expect(talentPopover!.pointerEvents).toBe("none");
    expect(talentPopover!.fitsShell).toBe(true);
    expect(talentPopover!.hasAction).toBe(false);

    await dock.mouse.move(0, 0);
    await dock.locator('[data-character-sub-tab="talents"]').focus();
    await expect(dock.locator('[data-talent-popover="true"]')).toBeHidden();

    await context.close();
  });

  declareEvidenceScenario("character-stats-breakdown", async ({ browser }) => {
    const { context, dock } = await openTileAndDock(
      browser,
      JSON.stringify(keyboardBootSnapshot()),
    );
    await focusDockTab(dock, "character");

    const subTabOrder = await dock.evaluate(() =>
      [...document.querySelectorAll("[data-character-sub-tab]")].map(
        (button) => (button as HTMLElement).dataset.characterSubTab,
      ),
    );
    expect(subTabOrder).toEqual(["loadout", "talents", "stats"]);
    await expect(dock.locator('[data-character-sub-tab="loadout"][aria-selected="true"]')).toBeVisible();

    await dock.click('[data-character-sub-tab="stats"]');
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

    await dock.locator('[data-character-sub-tab="talents"]').click();
    await dock
      .locator(
        '[data-class-id="knight"] [data-talent-id="fortitude"][data-talent-action="allocate"]',
      )
      .click();
    await dock.click('[data-character-sub-tab="stats"]');
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

    await dock.screenshot({ path: `${SCREENSHOTS}/07-character-stats-breakdown.png` });
    await context.close();
  });

  declareEvidenceScenario("character-talents-actions", async ({ browser }) => {
    const { context, dock } = await openTileAndDock(
      browser,
      JSON.stringify(keyboardBootSnapshot()),
    );
    await focusDockTab(dock, "character");
    await dock.click('[data-character-sub-tab="talents"]');

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

    await dock.screenshot({ path: `${SCREENSHOTS}/08-talent-direct-actions.png` });
    await context.close();
  });
});
