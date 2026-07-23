import { expect, test } from "@playwright/test";
import { NIGHTGLASS_BUS_CHANNEL } from "../../src/ui/bus";
import { PUMP_INTERVAL_MS } from "../../src/ui/pump";
import { focusCharacterSection, focusCharacterView, focusDockTab } from "../helpers/dock-context";
import {
  closeEvidenceSession,
  openEvidenceSession,
  reconcileLoadoutSurfaceAfterSyntheticAssignment,
} from "../helpers/evidence-session";
import { declareEvidenceScenario } from "../helpers/evidence-scenarios";
import { keyboardBootSnapshot } from "../helpers/snapshots";

const CHARACTER_LOADOUT_SESSION = {
  preset: "live-tile-and-dock" as const,
  bootSaveJson: JSON.stringify(keyboardBootSnapshot()),
};

test.describe("Character Loadout evidence scenarios", () => {
  declareEvidenceScenario("character-loadout", async ({ browser }) => {
    const session = await openEvidenceSession(browser, CHARACTER_LOADOUT_SESSION.preset, {
      bootSaveJson: CHARACTER_LOADOUT_SESSION.bootSaveJson,
    });
    const dock = session.dock;
    if (!dock) {
      throw new Error("live-tile-and-dock session must include a Dock page");
    }
    await focusDockTab(dock, "character");

    const loadoutFit = await dock.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-dock-panel="character"]');
      const shell = document.querySelector<HTMLElement>(".dock-shell");
      const buildBoard = panel?.querySelector<HTMLElement>(".character-build-board");
      if (!panel || !shell || !buildBoard) {
        return null;
      }
      const loadoutSection = panel.querySelector<HTMLElement>('[data-character-section="loadout"]');
      const panelBox = panel.getBoundingClientRect();
      const shellBox = shell.getBoundingClientRect();
      const lastSlot = panel.querySelector<HTMLElement>(".loadout-slot:last-of-type");
      const lastBox = lastSlot?.getBoundingClientRect();
      const poolTiles = panel.querySelectorAll(
        ".loadout-pool-strip .loadout-pool-tiles [data-loadout-assign-tile]",
      );
      const strip = panel.querySelector<HTMLElement>(".loadout-pool-strip .loadout-pool-tiles");
      const stripBox = strip?.getBoundingClientRect();
      const stripIcons = [...panel.querySelectorAll<HTMLElement>(".loadout-assign-tile--strip-icon")];
      const fullyVisibleIcons = stripIcons.filter((icon) => {
        const box = icon.getBoundingClientRect();
        if (!stripBox || box.width < 1 || box.height < 1) {
          return false;
        }
        return (
          box.left >= stripBox.left - 1 &&
          box.right <= stripBox.right + 1 &&
          box.top >= stripBox.top - 1 &&
          box.bottom <= stripBox.bottom + 1
        );
      });
      return {
        panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
        buildScrollable: buildBoard.scrollHeight > buildBoard.clientHeight + 1,
        loadoutVisible: Boolean(loadoutSection && !loadoutSection.hidden),
        overflowY: getComputedStyle(panel).overflowY,
        slots: panel.querySelectorAll(".loadout-slot").length,
        poolCount: poolTiles.length,
        stripScrollable: Boolean(
          strip && strip.scrollWidth > strip.clientWidth + 1,
        ),
        fullyVisibleStripIcons: fullyVisibleIcons.length,
        hasReset: panel.querySelector("[data-loadout-reset]") !== null,
        lastSlotFits:
          lastBox !== undefined &&
          lastBox.bottom <= panelBox.bottom + 1 &&
          lastBox.top >= panelBox.top - 1 &&
          lastBox.bottom <= shellBox.bottom + 1,
        inlineAbilityCopy: [...panel.querySelectorAll(".loadout-assign-tile .ability-description")]
          .length,
        loadoutHeadingVisible:
          panel.querySelector<HTMLElement>(".loadout-surface .dock-surface-title") !== null &&
          getComputedStyle(
            panel.querySelector<HTMLElement>(".loadout-surface .dock-surface-title")!,
          ).display !== "none",
        talentsHeadingVisible:
          panel.querySelector<HTMLElement>(".talents-surface .dock-surface-title") !== null &&
          getComputedStyle(
            panel.querySelector<HTMLElement>(".talents-surface .dock-surface-title")!,
          ).display !== "none",
      };
    });

    expect(loadoutFit, "Character panel metrics").not.toBeNull();
    expect(loadoutFit!.loadoutVisible).toBe(true);
    expect(loadoutFit!.slots).toBe(3);
    expect(loadoutFit!.poolCount).toBeGreaterThan(0);
    expect(loadoutFit!.fullyVisibleStripIcons).toBeGreaterThan(0);
    expect(loadoutFit!.fullyVisibleStripIcons).toBeLessThanOrEqual(4);
    expect(loadoutFit!.fullyVisibleStripIcons).toBeLessThanOrEqual(loadoutFit!.poolCount);
    expect(loadoutFit!.hasReset, "no reset control on Loadout").toBe(false);
    expect(loadoutFit!.panelScrollable, "loadout fits without panel scroll").toBe(false);
    expect(loadoutFit!.buildScrollable, "Build board fits without outer scroll").toBe(false);
    expect(loadoutFit!.lastSlotFits, "third loadout slot visible without scroll").toBe(true);
    expect(loadoutFit!.overflowY).toMatch(/auto|scroll/);
    expect(loadoutFit!.inlineAbilityCopy, "no inline Ability copy on tiles").toBe(0);
    expect(loadoutFit!.loadoutHeadingVisible, "Loadout heading visible on Build").toBe(true);
    expect(loadoutFit!.talentsHeadingVisible, "Talents heading visible on Build").toBe(true);

    const stripViewportCapacity = await dock.evaluate(() => {
      const strip = document.querySelector<HTMLElement>(
        '[data-class-id="knight"] .loadout-pool-strip .loadout-pool-tiles',
      );
      const icon = document.querySelector<HTMLElement>(".loadout-assign-tile--strip-icon");
      if (!strip || !icon) {
        return null;
      }
      const iconWidth = icon.getBoundingClientRect().width;
      if (iconWidth < 1) {
        return null;
      }
      return Math.floor(strip.clientWidth / iconWidth);
    });
    expect(stripViewportCapacity, "strip viewport fits four icons").toBeGreaterThanOrEqual(4);

    const stripTile = dock.locator(
      '[data-class-id="knight"] .loadout-pool-strip .loadout-pool-tiles [data-ability-id="pommel-break"]',
    );
    await stripTile.hover();
    await expect(dock.locator('[data-loadout-available-heading="true"]')).not.toHaveText(
      /^Available skills$/i,
    );
    await dock.mouse.move(0, 0);
    await stripTile.focus();
    await expect(dock.locator('[data-loadout-available-heading="true"]')).not.toHaveText(
      /^Available skills$/i,
    );

    const stripAccess = await dock.evaluate(() => {
      const strip = document.querySelector<HTMLElement>(
        '[data-class-id="knight"] .loadout-pool-strip .loadout-pool-tiles',
      );
      const tiles = strip
        ? [...strip.querySelectorAll<HTMLElement>("[data-loadout-assign-tile]")]
        : [];
      if (!strip || tiles.length === 0) {
        return null;
      }
      const last = tiles.at(-1)!;
      strip.scrollLeft = strip.scrollWidth;
      const box = last.getBoundingClientRect();
      const stripBox = strip.getBoundingClientRect();
      return {
        tileCount: tiles.length,
        lastVisible:
          box.left >= stripBox.left - 1 &&
          box.right <= stripBox.right + 1 &&
          box.width > 0,
      };
    });
    expect(stripAccess).not.toBeNull();
    expect(stripAccess!.tileCount).toBe(loadoutFit!.poolCount);
    if (stripAccess!.tileCount > 4) {
      expect(stripAccess!.lastVisible, "horizontal strip reaches last choice").toBe(true);
    }

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
    await reconcileLoadoutSurfaceAfterSyntheticAssignment(dock);
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
    await reconcileLoadoutSurfaceAfterSyntheticAssignment(dock);
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
    await reconcileLoadoutSurfaceAfterSyntheticAssignment(dock);
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

    await closeEvidenceSession(session);
  });

  declareEvidenceScenario("character-information-popovers", async ({ browser }) => {
    const session = await openEvidenceSession(browser, CHARACTER_LOADOUT_SESSION.preset, {
      bootSaveJson: CHARACTER_LOADOUT_SESSION.bootSaveJson,
    });
    const tile = session.tile;
    const dock = session.dock;
    if (!dock || !tile) {
      throw new Error("live-tile-and-dock session must include tile and dock pages");
    }
    await focusDockTab(dock, "character");

    async function readPopoverBox(selector: string) {
      return dock.evaluate((sel) => {
        const pop = document.querySelector<HTMLElement>(sel);
        if (!pop || pop.hidden) {
          return null;
        }
        const box = pop.getBoundingClientRect();
        return {
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        };
      }, selector);
    }

    const basic = dock.locator('[data-class-id="knight"] [data-loadout-basic]');
    await basic.hover();
    await expect(dock.locator('[data-loadout-ability-popover="true"]:not([hidden])')).toBeVisible();
    const hoverAbilityText = await dock
      .locator('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
      .innerText();
    const abilityBoxHover = await readPopoverBox('[data-loadout-ability-popover="true"]');

    await basic.focus();
    await expect(dock.locator('[data-loadout-ability-popover="true"]:not([hidden])')).toBeVisible();
    const focusAbilityText = await dock
      .locator('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
      .innerText();
    expect(focusAbilityText).toBe(hoverAbilityText);
    const abilityBoxFocus = await readPopoverBox('[data-loadout-ability-popover="true"]');
    expect(abilityBoxFocus).toEqual(abilityBoxHover);

    for (let pump = 0; pump < 4; pump += 1) {
      await tile.waitForTimeout(PUMP_INTERVAL_MS);
      const boxAfterPump = await readPopoverBox('[data-loadout-ability-popover="true"]');
      expect(boxAfterPump).toEqual(abilityBoxFocus);
      const textAfterPump = await dock
        .locator('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
        .innerText();
      expect(textAfterPump).toBe(hoverAbilityText);
    }

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
    await focusCharacterView(dock, "build", { focusTabChrome: true });
    await expect(dock.locator('[data-loadout-ability-popover="true"]')).toBeHidden();

    await focusCharacterSection(dock, "talents");
    const fortitude = dock.locator(
      '[data-class-id="knight"] .talent-cell[data-talent-id="fortitude"]',
    );
    await fortitude.hover();
    await expect(dock.locator('[data-talent-popover="true"]:not([hidden])')).toBeVisible();
    const hoverTalentText = await dock.locator('[data-talent-popover="true"]').innerText();
    const talentBoxHover = await readPopoverBox('[data-talent-popover="true"]');

    await fortitude.focus();
    await expect(dock.locator('[data-talent-popover="true"]:not([hidden])')).toBeVisible();
    const focusTalentText = await dock.locator('[data-talent-popover="true"]').innerText();
    expect(focusTalentText).toBe(hoverTalentText);
    await expect(fortitude).toHaveAttribute("aria-describedby", /talent-desc-fortitude/);

    const talentBoxAfterFocus = await readPopoverBox('[data-talent-popover="true"]');
    expect(talentBoxAfterFocus).not.toBeNull();

    for (let pump = 0; pump < 4; pump += 1) {
      await tile.waitForTimeout(PUMP_INTERVAL_MS);
      const boxAfterPump = await readPopoverBox('[data-talent-popover="true"]');
      expect(boxAfterPump).toEqual(talentBoxAfterFocus);
      const textAfterPump = await dock.locator('[data-talent-popover="true"]').innerText();
      expect(textAfterPump).toBe(hoverTalentText);
    }

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
    await focusCharacterView(dock, "build", { focusTabChrome: true });
    await expect(dock.locator('[data-talent-popover="true"]')).toBeHidden();

    await closeEvidenceSession(session);
  });
});
