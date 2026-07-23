import { expect, test } from "@playwright/test";
import { NIGHTGLASS_BUS_CHANNEL } from "../../src/ui/bus";
import { closeEvidenceSession, openEvidenceSession } from "../helpers/evidence-session";
import { declareEvidenceScenario } from "../helpers/evidence-scenarios";
import { captureReviewScene } from "../helpers/review-scenes";
import { armoryReviewSnapshot } from "../helpers/snapshots";

const ARMORY_SESSION = {
  preset: "isolated-dock" as const,
  dockSnapshot: armoryReviewSnapshot(),
};

test.describe("Armory evidence scenarios", () => {
  declareEvidenceScenario("armory-collection-compare", async ({ browser }) => {
    const session = await openEvidenceSession(browser, ARMORY_SESSION.preset, {
      dockSnapshot: ARMORY_SESSION.dockSnapshot,
    });
    const dock = session.dock;
    if (!dock) {
      throw new Error("isolated-dock session must include a Dock page");
    }

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

    await closeEvidenceSession(session);
  });

  declareEvidenceScenario("armory-drag-density", async ({ browser }) => {
    const session = await openEvidenceSession(browser, ARMORY_SESSION.preset, {
      dockSnapshot: ARMORY_SESSION.dockSnapshot,
      seedEngineLegality: true,
    });
    const dock = session.dock;
    if (!dock) {
      throw new Error("isolated-dock session must include a Dock page");
    }

    await dock.click('[data-dock-tab="armory"]');
    await dock.waitForSelector('.armory-grid .equipment-card[data-drop-id="100"]');
    await dock.click('.character-picker [data-character-chip="wizard"]');
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

    await expect
      .poll(async () => {
        const weaponEmpty = await dock.evaluate(() => {
          const weapon = document.querySelector<HTMLElement>('[data-worn-slot="weapon"]');
          return weapon?.dataset["slotFilled"] === "false";
        });
        return weaponEmpty;
      })
      .toBe(true);

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

    await closeEvidenceSession(session);
  });

  declareEvidenceScenario("equipment-icon-tiers", async ({ browser }) => {
    const session = await openEvidenceSession(browser, ARMORY_SESSION.preset, {
      dockSnapshot: ARMORY_SESSION.dockSnapshot,
    });
    const dock = session.dock;
    if (!dock) {
      throw new Error("isolated-dock session must include a Dock page");
    }

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

    await closeEvidenceSession(session);
  });
});
