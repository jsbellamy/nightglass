import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { createEngine } from "../src/core/engine";
import { cloneSnapshot, type DropInstance, type Snapshot } from "../src/core/snapshot";
import type { ClassId, EquipmentSlotId } from "../src/core/types";
import { buildContent } from "../src/data";
import { NIGHTGLASS_BUS_CHANNEL } from "../src/ui/bus";
import { serializeEngineLegality } from "../src/ui/engine-legality";
import { DOCK_HEIGHT, DOCK_WIDTH } from "../src/ui/dock-geometry";
import { postBusSnapshot, installBusSpy } from "./helpers/bus";
import { declareEvidenceScenario } from "./helpers/evidence-scenarios";
import { focusDockTab, openTileAndDock, openTilePage } from "./helpers/dock-context";
import { captureReviewScene } from "./helpers/review-scenes";
import { keyboardBootSnapshot } from "./helpers/snapshots";

const SCREENSHOTS = "e2e-screenshots";

async function openTile(browser: Browser): Promise<{ context: Awaited<ReturnType<Browser["newContext"]>>; tile: Page }> {
  mkdirSync(SCREENSHOTS, { recursive: true });
  return openTilePage(browser);
}

function equipmentIconReviewSnapshot(): Snapshot {
  const engine = createEngine(buildContent(), undefined, 42);
  const snapshot = cloneSnapshot(engine.snapshot());
  const equipped: [string, ClassId, EquipmentSlotId][] = [
    ["thornquill-blade", "knight", "weapon"],
    ["leafmail-vest", "knight", "armor"],
    ["berrybright-charm", "knight", "charm"],
    ["dewlight-focus", "wizard", "weapon"],
    ["plumweave-aegis", "wizard", "armor"],
    ["gloamberry-locket", "wizard", "charm"],
    ["moonpetal-relic", "priest", "weapon"],
    ["plumweave-aegis", "priest", "armor"],
    ["berrybright-charm", "priest", "charm"],
    ["bramblesong-bow", "hunter", "weapon"],
    ["leafmail-vest", "hunter", "armor"],
    ["gloamberry-locket", "hunter", "charm"],
  ];
  const armory: DropInstance[] = equipped.map((entry, index) => ({
    dropId: index + 1,
    baseId: entry[0],
    itemLevel: 1,
    rarity: index % 4 === 0 ? "rare" : "common",
    affixes: [],
    awardedAtMs: 10_000 - index,
    seen: true,
    locked: false,
    assignedTo: { classId: entry[1], slot: entry[2] },
  }));
  armory.push({
    dropId: 100,
    baseId: "starfruit-prism",
    itemLevel: 2,
    rarity: "epic",
    affixes: [],
    awardedAtMs: 20_000,
    seen: false,
    locked: false,
    assignedTo: null,
  });
  armory.push(
    {
      dropId: 101,
      baseId: "thornquill-blade",
      itemLevel: 1,
      rarity: "common",
      affixes: [],
      awardedAtMs: 19_000,
      seen: true,
      locked: false,
      assignedTo: null,
    },
    {
      dropId: 102,
      baseId: "leafmail-vest",
      itemLevel: 1,
      rarity: "common",
      affixes: [],
      awardedAtMs: 18_000,
      seen: true,
      locked: false,
      assignedTo: null,
    },
    {
      dropId: 103,
      baseId: "berrybright-charm",
      itemLevel: 1,
      rarity: "uncommon",
      affixes: [],
      awardedAtMs: 17_000,
      seen: true,
      locked: false,
      assignedTo: null,
    },
  );
  snapshot.progression.armory = armory;
  return snapshot;
}

async function postArmoryReviewSnapshot(page: Page): Promise<void> {
  const content = buildContent();
  const snapshot = equipmentIconReviewSnapshot();
  const engine = createEngine(content, snapshot, 42);
  const legality = serializeEngineLegality(engine, snapshot, content);
  await page.evaluate(
    ({ channelName, snapshot: snap, legality: leg }) => {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage({ type: "snapshot", snapshot: snap, legality: leg });
      channel.close();
    },
    { channelName: NIGHTGLASS_BUS_CHANNEL, snapshot, legality },
  );
}

test.describe("rendered-output evidence seam", () => {
  declareEvidenceScenario("armory-collection-compare", async ({ browser }) => {
    const { context, tile } = await openTile(browser);
    const dock = await context.newPage();
    await dock.setViewportSize({ width: DOCK_WIDTH, height: DOCK_HEIGHT });
    await dock.goto("/?window=dock", { waitUntil: "networkidle" });
    await dock.waitForSelector(".management-dock");

    await postBusSnapshot(dock, equipmentIconReviewSnapshot());
    await dock.click('[data-dock-tab="armory"]');
    await dock.waitForSelector('.armory-grid .equipment-card[data-drop-id="100"]');

    const collection = await dock.evaluate(() => {
      const tiles = [...document.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")];
      return {
        tileIds: tiles.map((tile) => tile.dataset["dropId"]),
        tileCount: tiles.length,
        stateOptions: [...document.querySelectorAll<HTMLOptionElement>(".armory-state-select option")].map(
          (option) => option.value,
        ),
      };
    });
    expect(collection.tileCount).toBe(4);
    expect(collection.tileIds).toEqual(["100", "101", "102", "103"]);
    expect(collection.stateOptions).toEqual(["all", "unseen", "locked"]);
    expect(collection.tileIds.every((id) => Number(id) >= 100)).toBe(true);

    const epicTile = dock.locator('.armory-grid .equipment-card[data-drop-id="100"]');
    await epicTile.hover();
    await expect(dock.locator('[data-armory-compare-popover="true"]:not([hidden])')).toBeVisible();

    const popover = await dock.evaluate(() => {
      const host = document.querySelector<HTMLElement>(".armory-body--compare-host");
      const pop = document.querySelector<HTMLElement>('[data-armory-compare-popover="true"]');
      const tile = document.querySelector<HTMLElement>('.armory-grid .equipment-card[data-drop-id="100"]');
      if (!host || !pop || !tile) {
        return null;
      }
      const hostBox = host.getBoundingClientRect();
      const popBox = pop.getBoundingClientRect();
      return {
        pointerEvents: getComputedStyle(pop).pointerEvents,
        fitsHost:
          popBox.left >= hostBox.left - 1 &&
          popBox.right <= hostBox.right + 1 &&
          popBox.top >= hostBox.top - 1 &&
          popBox.bottom <= hostBox.bottom + 1,
        noInnerScroll: pop.scrollHeight <= pop.clientHeight + 1,
        hasStatTable: pop.querySelector('[data-stat-deltas="true"]') !== null,
        describedBy: tile.getAttribute("aria-describedby"),
        noDuplicateColumns: pop.querySelector(".armory-compare-columns") === null,
      };
    });
    expect(popover).not.toBeNull();
    expect(popover!.pointerEvents).toBe("none");
    expect(popover!.fitsHost).toBe(true);
    expect(popover!.noInnerScroll).toBe(true);
    expect(popover!.hasStatTable).toBe(true);
    expect(popover!.describedBy).toMatch(/armory-compare-desc-100/);
    expect(popover!.noDuplicateColumns).toBe(true);

    await context.close();
  });

  declareEvidenceScenario("armory-drag-density", async ({ browser }) => {
    const { context, tile } = await openTile(browser);
    const dock = await context.newPage();
    await dock.setViewportSize({ width: DOCK_WIDTH, height: DOCK_HEIGHT });
    await dock.goto("/?window=dock", { waitUntil: "networkidle" });
    await dock.waitForSelector(".management-dock");

    await postArmoryReviewSnapshot(dock);
    await dock.click('[data-dock-tab="armory"]');
    await dock.waitForSelector('.armory-grid .equipment-card[data-drop-id="100"]');
    await dock.click('.character-picker [data-character-chip="wizard"]');
    await installBusSpy(dock);
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

    const layoutBeforeDrag = await dock.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-dock-panel="armory"]');
      const body = document.querySelector<HTMLElement>(".armory-body--compare-host");
      if (!panel || !body) {
        return null;
      }
      return {
        panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
        bodyScrollable: body.scrollHeight > body.clientHeight + 1,
        hasDetail: document.querySelector('[data-armory-detail="true"]') !== null,
      };
    });
    expect(layoutBeforeDrag?.hasDetail).toBe(false);
    expect(layoutBeforeDrag?.panelScrollable).toBe(false);
    expect(layoutBeforeDrag?.bodyScrollable).toBe(false);

    const epicTile = dock.locator('.armory-grid .equipment-card[data-drop-id="100"]');
    const weaponSlot = dock.locator('[data-worn-slot="weapon"]');
    await epicTile.dragTo(weaponSlot);

    await expect(weaponSlot).toHaveAttribute("data-slot-filled", "true");

    const grid = dock.locator('[data-armory-collection="true"]');
    const weaponBox = await weaponSlot.boundingBox();
    const gridBox = await grid.boundingBox();
    if (weaponBox && gridBox) {
      await dock.mouse.move(weaponBox.x + weaponBox.width / 2, weaponBox.y + weaponBox.height / 2);
      await dock.mouse.down();
      await dock.mouse.move(gridBox.x + gridBox.width / 2, gridBox.y + gridBox.height / 2, {
        steps: 12,
      });
      await dock.mouse.up();
    }

    const commands = await dock.evaluate(() => {
      const w = window as unknown as { __ngCmdLog?: unknown[] };
      return w.__ngCmdLog ?? [];
    });
    expect(commands).toContainEqual({ cmd: "equip", args: [100, "wizard", "weapon"] });
    expect(commands).toContainEqual({ cmd: "unequip", args: ["wizard", "weapon"] });

    const afterUnequip = await dock.evaluate(() => {
      const weapon = document.querySelector<HTMLElement>('[data-worn-slot="weapon"]');
      return {
        weaponEmpty: weapon?.dataset["slotFilled"] === "false",
      };
    });
    expect(afterUnequip.weaponEmpty).toBe(true);

    const layoutAfterDrag = await dock.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-dock-panel="armory"]');
      const body = document.querySelector<HTMLElement>(".armory-body--compare-host");
      if (!panel || !body) {
        return null;
      }
      return {
        panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
        bodyScrollable: body.scrollHeight > body.clientHeight + 1,
      };
    });
    expect(layoutAfterDrag?.panelScrollable).toBe(false);
    expect(layoutAfterDrag?.bodyScrollable).toBe(false);

    await context.close();
  });

  declareEvidenceScenario("equipment-icon-tiers", async ({ browser }) => {
    const { context, tile } = await openTile(browser);
    const dock = await context.newPage();
    await dock.setViewportSize({ width: DOCK_WIDTH, height: DOCK_HEIGHT });
    await dock.goto("/?window=dock", { waitUntil: "networkidle" });
    await dock.waitForSelector(".management-dock");

    await postBusSnapshot(dock, equipmentIconReviewSnapshot());
    await dock.click('[data-dock-tab="armory"]');
    await dock.waitForSelector(".armory-grid .equipment-icon-img--content");
    await dock.waitForSelector('[data-armory-worn-strip="true"] .equipment-icon-img--content');

    const gridContent = await dock.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>(
        ".armory-grid .equipment-icon-img--content",
      );
      const wrap = img?.closest(".equipment-icon-content");
      const tile = img?.closest(".equipment-card");
      if (!img || !wrap || !tile) {
        return null;
      }
      const imgBox = img.getBoundingClientRect();
      const wrapBox = wrap.getBoundingClientRect();
      const wrapStyle = getComputedStyle(wrap);
      const imgStyle = getComputedStyle(img);
      return {
        imgW: imgBox.width,
        imgH: imgBox.height,
        attrW: img.width,
        attrH: img.height,
        wrapOverflow: wrapStyle.overflow,
        wrapBorderWidth: wrapStyle.borderTopWidth,
        imgWidthCss: imgStyle.width,
        imgHeightCss: imgStyle.height,
        fitsWrap:
          imgBox.left >= wrapBox.left - 0.5 &&
          imgBox.right <= wrapBox.right + 0.5 &&
          imgBox.top >= wrapBox.top - 0.5 &&
          imgBox.bottom <= wrapBox.bottom + 0.5,
        hasRarityTint: /(?:^|\s)rarity-/.test(tile.className),
        hasTileName: tile.querySelector(".equipment-name") !== null,
        hasUnseenWord: (tile.textContent ?? "").includes("Unseen"),
      };
    });

    expect(gridContent, "Armory grid content-tier icon present").not.toBeNull();
    expect(gridContent!.imgW, "rendered content width").toBe(34);
    expect(gridContent!.imgH, "rendered content height").toBe(34);
    expect(gridContent!.attrW, "logical content width").toBe(34);
    expect(gridContent!.attrH, "logical content height").toBe(34);
    expect(gridContent!.imgWidthCss, "CSS content width").toBe("34px");
    expect(gridContent!.imgHeightCss, "CSS content height").toBe("34px");
    expect(gridContent!.wrapOverflow, "no overflow clip on wrapper").not.toBe("hidden");
    expect(Number.parseFloat(gridContent!.wrapBorderWidth), "no wrapper border").toBe(0);
    expect(gridContent!.fitsWrap, "icon fits wrapper").toBe(true);
    expect(gridContent!.hasRarityTint, "rarity class on tile").toBe(true);
    expect(gridContent!.hasTileName, "icon-first tiles omit name").toBe(false);
    expect(gridContent!.hasUnseenWord, "tiles omit Unseen prose").toBe(false);

    const density = await dock.evaluate(() => {
      const grid = document.querySelector<HTMLElement>(".armory-grid");
      const tiles = [...document.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")];
      if (!grid || tiles.length === 0) {
        return null;
      }
      const gridBox = grid.getBoundingClientRect();
      const tops = new Map<number, HTMLElement[]>();
      for (const tile of tiles) {
        const top = Math.round(tile.getBoundingClientRect().top);
        const row = tops.get(top) ?? [];
        row.push(tile);
        tops.set(top, row);
      }
      const firstRowTop = Math.min(...tops.keys());
      const firstRow = tops.get(firstRowTop) ?? [];
      const firstRowVisible = firstRow.every((tile) => {
        const box = tile.getBoundingClientRect();
        return box.bottom <= gridBox.bottom + 1 && box.top >= gridBox.top - 1;
      });
      return {
        columnCount: firstRow.length,
        firstRowVisible,
        tileCount: tiles.length,
        chromeSurvives: document.querySelector(".equipment-icon-img--chrome") !== null,
        slotStrip: document.querySelector(".armory-slot-strip") !== null,
        wornStrip: document.querySelector('[data-armory-worn-strip="true"]') !== null,
      };
    });

    expect(density, "Armory density sample").not.toBeNull();
    expect(density!.slotStrip, "legacy slot strip remains removed").toBe(false);
    expect(density!.wornStrip, "worn loadout strip present").toBe(true);
    expect(density!.chromeSurvives, "no chrome-tier icon remains in the dock").toBe(false);
    expect(density!.columnCount, "at least three columns at 800px dock width").toBeGreaterThanOrEqual(
      3,
    );
    expect(density!.firstRowVisible, "at least one full row visible without scrolling").toBe(true);

    const classIds = ["knight", "wizard", "priest", "hunter"] as const;
    for (const classId of classIds) {
      await dock.click(`.character-picker [data-character-chip="${classId}"]`);
      const slotFits = await dock.evaluate(() => {
        return [...document.querySelectorAll<HTMLElement>("[data-worn-slot]")].map((row) => {
          const img = row.querySelector<HTMLImageElement>(".equipment-icon-img--content");
          if (!img) {
            return { slot: row.dataset["wornSlot"], ok: false, reason: "missing icon" };
          }
          const imgBox = img.getBoundingClientRect();
          const rowBox = row.getBoundingClientRect();
          const wrap = img.closest(".equipment-icon-content");
          const wrapBox = wrap?.getBoundingClientRect();
          const overflow = wrap ? getComputedStyle(wrap).overflow : null;
          const fitsRow =
            imgBox.left >= rowBox.left - 0.5 &&
            imgBox.right <= rowBox.right + 0.5 &&
            imgBox.top >= rowBox.top - 0.5 &&
            imgBox.bottom <= rowBox.bottom + 0.5;
          const fitsWrap =
            wrapBox !== undefined &&
            imgBox.left >= wrapBox.left - 0.5 &&
            imgBox.right <= wrapBox.right + 0.5 &&
            imgBox.top >= wrapBox.top - 0.5 &&
            imgBox.bottom <= wrapBox.bottom + 0.5;
          return {
            slot: row.dataset["wornSlot"],
            ok:
              fitsRow &&
              fitsWrap &&
              overflow !== "hidden" &&
              imgBox.width === 34 &&
              imgBox.height === 34,
            reason:
              fitsRow && fitsWrap && overflow !== "hidden"
                ? "ok"
                : `clip/overflow row=${fitsRow} wrap=${fitsWrap} overflow=${overflow}`,
          };
        });
      });
      expect(slotFits, `three worn slots for ${classId}`).toHaveLength(3);
      for (const entry of slotFits) {
        expect(entry.ok, `${classId}/${entry.slot}: ${entry.reason}`).toBe(true);
      }
    }

    expect(await dock.locator('[data-character-section="equipment"]').count()).toBe(0);

    const wornStrip = dock.locator('[data-armory-worn-strip="true"]');
    await captureReviewScene(wornStrip, "equipment-icon-tiers", "armory-worn-strip");

    await context.close();
  });

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
