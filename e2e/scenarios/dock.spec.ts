import { expect, test } from "@playwright/test";
import { DOCK_HEIGHT, DOCK_WIDTH } from "../../src/ui/dock-geometry";
import { PUMP_INTERVAL_MS } from "../../src/ui/pump";
import {
  expectApprovedCharacterNavigationOrder,
  focusCharacterSection,
  focusDockTab,
} from "../helpers/dock-context";
import { closeEvidenceSession, openEvidenceSession } from "../helpers/evidence-session";
import { declareEvidenceScenario } from "../helpers/evidence-scenarios";
import { readBusSpyTypes, waitForBusMessage } from "../helpers/bus";
import { captureReviewScene } from "../helpers/review-scenes";

const DOCK_TAB_SCENE = {
  armory: "dock-tab-armory",
  character: "dock-tab-character",
  stage: "dock-tab-stage",
} as const;

const CHARACTER_SUB_SCENE = {
  build: "character-sub-build",
  stats: "character-sub-stats",
} as const;

test.describe("Management Dock evidence scenarios", () => {
  declareEvidenceScenario("dock-cross-webview-surfaces", async ({ browser }) => {
    const session = await openEvidenceSession(browser, { preset: "live-tile-and-dock" });
    const { tile, dock } = session;
    if (!dock) {
      throw new Error("live-tile-and-dock session must include a Dock page");
    }

    await captureReviewScene(dock, "dock-cross-webview-surfaces", "dock-initial");

    const dockGeometry = await dock.evaluate(() => {
      const shell = document.querySelector(".dock-shell");
      const sr = shell?.getBoundingClientRect();
      return {
        w: sr ? Math.round(sr.width) : 0,
        h: sr ? Math.round(sr.height) : 0,
      };
    });
    expect(dockGeometry.w, "dock width").toBe(DOCK_WIDTH);
    expect(dockGeometry.h, "dock height").toBe(DOCK_HEIGHT);

    const initialTab = await dock.evaluate(
      () =>
        (
          document.querySelector('[data-dock-tab][aria-selected="true"]') as HTMLElement | null
        )?.dataset.dockTab ?? null,
    );
    expect(initialTab, "fresh Dock opens on Armory").toBe("armory");

    const tabs = await dock.evaluate(() =>
      [...document.querySelectorAll("[data-dock-tab]")].map((b) => (b as HTMLElement).dataset.dockTab),
    );
    expect(tabs).toEqual(["armory", "character", "stage"]);

    const tabFit = await dock.evaluate(() => {
      const list = document.querySelector(".dock-tabs");
      const tabEls = [...document.querySelectorAll("[data-dock-tab]")];
      if (!list) return { clipped: ["missing-list"], rows: 0 };
      const lr = list.getBoundingClientRect();
      return {
        clipped: tabEls
          .filter((t) => t.getBoundingClientRect().right > lr.right + 0.5)
          .map((t) => (t as HTMLElement).dataset.dockTab),
        rows: new Set(tabEls.map((t) => Math.round(t.getBoundingClientRect().y))).size,
      };
    });
    expect(tabFit.clipped, "tabs clipped at DOCK_WIDTH").toEqual([]);
    expect(tabFit.rows, "tabs on one row").toBe(1);

    const surfaceOverflowY = await dock.evaluate(() => {
      const surf = document.querySelector(".dock-surface");
      return surf ? getComputedStyle(surf).overflowY : null;
    });
    expect(surfaceOverflowY).toMatch(/auto|scroll/);

    for (const tab of tabs) {
      if (!tab) continue;
      await focusDockTab(dock, tab as "armory" | "character" | "stage");
      const state = await dock.evaluate((t) => {
        const panel = document.querySelector(`[data-dock-panel="${t}"]`);
        const visible = [...document.querySelectorAll(".dock-panel")].filter(
          (p) => !(p as HTMLElement).hidden,
        );
        const picker = document.querySelector<HTMLElement>(".dock-body > .character-picker");
        const dockBody = document.querySelector<HTMLElement>(".dock-body");
        const dockSurface = document.querySelector<HTMLElement>(".dock-surface");
        const armorySelector = document.querySelector('[data-armory-character-selector="true"]');
        const formationControl = document.querySelector(
          ".character-picker [data-formation-action]",
        );
        const pickerBox = picker?.getBoundingClientRect();
        const bodyBox = dockBody?.getBoundingClientRect();
        const surfaceBox = dockSurface?.getBoundingClientRect();
        const pickerStyle = picker ? getComputedStyle(picker) : null;
        return {
          chars: panel ? panel.textContent?.trim().length ?? 0 : 0,
          visibleCount: visible.length,
          pickerHiddenAttr: picker?.hidden === true,
          pickerDisplay: pickerStyle?.display ?? null,
          pickerWidth: pickerBox?.width ?? 0,
          pickerInert: picker?.inert === true,
          pickerAriaHidden: picker?.getAttribute("aria-hidden"),
          armorySelectorPresent: armorySelector !== null,
          formationPresent: formationControl !== null,
          stageSurfaceWidth:
            t === "stage" && bodyBox && surfaceBox
              ? surfaceBox.width / Math.max(bodyBox.width, 1)
              : null,
        };
      }, tab);
      const sceneId = DOCK_TAB_SCENE[tab as keyof typeof DOCK_TAB_SCENE];
      if (sceneId) {
        await captureReviewScene(dock, "dock-cross-webview-surfaces", sceneId);
      }
      expect(state.chars, `dock surface ${tab} content`).toBeGreaterThan(20);
      expect(state.visibleCount, `one panel for ${tab}`).toBe(1);
      expect(state.armorySelectorPresent, "no compact Armory selector").toBe(false);
      if (tab === "armory" || tab === "character") {
        expect(state.pickerHiddenAttr, `Character rail visible on ${tab}`).toBe(false);
        expect(state.pickerDisplay, `rail not display:none on ${tab}`).not.toBe("none");
        expect(state.pickerWidth, `rail occupies width on ${tab}`).toBeGreaterThan(10);
        expect(state.pickerInert, `rail interactive on ${tab}`).toBe(false);
        expect(state.pickerAriaHidden, `rail aria on ${tab}`).toBe("false");
        expect(state.formationPresent, `formation on ${tab}`).toBe(true);
      }
      if (tab === "stage") {
        expect(state.pickerHiddenAttr, "Stage hides Character rail").toBe(true);
        expect(state.pickerDisplay, "Stage rail display none").toBe("none");
        expect(state.pickerWidth, "Stage rail width zero").toBeLessThan(1);
        expect(state.pickerInert, "Stage rail inert").toBe(true);
        expect(state.pickerAriaHidden, "Stage rail aria-hidden").toBe("true");
        expect(state.stageSurfaceWidth, "Stage reclaims rail width").toBeGreaterThan(0.85);
      }
    }

    await focusDockTab(dock, "character");
    await expectApprovedCharacterNavigationOrder(dock);

    const buildOverflow = await dock.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".dock-shell");
      const panel = document.querySelector<HTMLElement>('[data-dock-panel="character"]');
      const buildBoard = panel?.querySelector<HTMLElement>(".character-build-board");
      if (!shell || !panel || !buildBoard) {
        return null;
      }
      const shellBox = shell.getBoundingClientRect();
      const boardBox = buildBoard.getBoundingClientRect();
      const tolerance = 2;
      return {
        panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
        buildScrollable: buildBoard.scrollHeight > buildBoard.clientHeight + 1,
        boardFitsShell:
          boardBox.left >= shellBox.left - tolerance &&
          boardBox.right <= shellBox.right + tolerance &&
          boardBox.top >= shellBox.top - tolerance &&
          boardBox.bottom <= shellBox.bottom + tolerance,
      };
    });
    expect(buildOverflow, "Character build metrics").not.toBeNull();
    expect(buildOverflow!.panelScrollable, "Character panel does not outer-scroll on Build").toBe(
      false,
    );
    expect(buildOverflow!.buildScrollable, "Build board does not outer-scroll").toBe(false);
    expect(buildOverflow!.boardFitsShell, "Build board fits inside dock shell").toBe(true);
    await captureReviewScene(dock, "dock-cross-webview-surfaces", CHARACTER_SUB_SCENE.build);

    await focusCharacterSection(dock, "stats");
    const statsClip = await dock.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".dock-shell");
      const panel = document.querySelector<HTMLElement>('[data-dock-panel="character"]');
      const section = panel?.querySelector<HTMLElement>('[data-character-section="stats"]');
      if (!shell || !panel || !section || section.hidden) {
        return { clipped: ["missing-stats"] };
      }
      const shellBox = shell.getBoundingClientRect();
      const tolerance = 2;
      const panelScrollable = panel.scrollHeight > panel.clientHeight + 1;
      const candidates = [...section.querySelectorAll<HTMLElement>("button, [tabindex='0']")];
      const clipped = candidates
        .filter((control) => {
          const box = control.getBoundingClientRect();
          if (box.width < 1 || box.height < 1) {
            return false;
          }
          return (
            box.right > shellBox.right + tolerance ||
            box.bottom > shellBox.bottom + tolerance ||
            box.left < shellBox.left - tolerance ||
            box.top < shellBox.top - tolerance
          );
        })
        .map((control) => control.getAttribute("aria-label") ?? control.className);
      return { clipped, panelScrollable };
    });
    expect(statsClip.panelScrollable, "Character panel does not outer-scroll on Stats").toBe(false);
    expect(statsClip.clipped, "no clipped live controls on Character/Stats").toEqual([]);
    await captureReviewScene(dock, "dock-cross-webview-surfaces", CHARACTER_SUB_SCENE.stats);

    const firstTab = tabs[0]!;
    expect(firstTab).toBe("armory");
    await focusDockTab(dock, "armory");
    await dock.focus(`[data-dock-tab="${firstTab}"]`);
    await dock.keyboard.press("ArrowRight");
    await expect
      .poll(async () =>
        dock.evaluate(() => {
          const selected = (
            document.querySelector('[data-dock-tab][aria-selected="true"]') as HTMLElement | null
          )?.dataset.dockTab;
          return selected && selected !== "armory" ? selected : null;
        }),
      )
      .not.toBeNull();

    const beforeClose = await tile.evaluate(() => document.querySelectorAll(".battle-tile").length);
    await dock.click(".dock-close");
    await waitForBusMessage(tile, "dock-closed", 3_000);
    const tileAlive = await tile.evaluate(() => document.querySelectorAll(".battle-tile").length);
    expect(tileAlive, "tile still mounted after dock close").toBe(beforeClose);

    const typesBefore = await readBusSpyTypes(tile);
    const pumpCountBefore = typesBefore.filter((t) => t === "pump").length;
    await tile.waitForTimeout(PUMP_INTERVAL_MS * 2);
    const typesAfter = await readBusSpyTypes(tile);
    const pumpCountAfter = typesAfter.filter((t) => t === "pump").length;
    expect(pumpCountAfter, "no further pump after dock-closed").toBe(pumpCountBefore);

    await closeEvidenceSession(session);
  });

  declareEvidenceScenario("dock-navigation-ownership", async ({ browser }) => {
    const session = await openEvidenceSession(browser, { preset: "live-tile-and-dock" });
    const { dock } = session;
    if (!dock) {
      throw new Error("live-tile-and-dock session must include a Dock page");
    }

    const tabOrder = await dock.evaluate(() =>
      [...document.querySelectorAll("[data-dock-tab]")].map(
        (button) => (button as HTMLElement).dataset.dockTab,
      ),
    );
    expect(tabOrder).toEqual(["armory", "character", "stage"]);
    await expect(dock.locator('[data-dock-tab="armory"][aria-selected="true"]')).toBeVisible();

    async function measureRail(tab: "armory" | "character" | "stage") {
      await focusDockTab(dock, tab);
      return dock.evaluate(() => {
        const picker = document.querySelector<HTMLElement>(".dock-body > .character-picker");
        const style = picker ? getComputedStyle(picker) : null;
        const box = picker?.getBoundingClientRect();
        const armorySelector = document.querySelector('[data-armory-character-selector="true"]');
        const compactClass = document.querySelector(".armory-character-selector");
        const body = document.querySelector<HTMLElement>(".dock-body");
        const surface = document.querySelector<HTMLElement>(".dock-surface");
        const bodyBox = body?.getBoundingClientRect();
        const surfaceBox = surface?.getBoundingClientRect();
        return {
          hiddenAttrOnlyWouldPass: picker?.hidden === true,
          display: style?.display ?? null,
          width: box?.width ?? 0,
          inert: picker?.inert === true,
          ariaHidden: picker?.getAttribute("aria-hidden"),
          armorySelectorPresent: armorySelector !== null || compactClass !== null,
          surfaceShare:
            bodyBox && surfaceBox ? surfaceBox.width / Math.max(bodyBox.width, 1) : null,
        };
      });
    }

    const armory = await measureRail("armory");
    expect(armory.armorySelectorPresent).toBe(false);
    expect(armory.display).not.toBe("none");
    expect(armory.width).toBeGreaterThan(10);
    expect(armory.inert).toBe(false);

    const character = await measureRail("character");
    expect(character.display).not.toBe("none");
    expect(character.width).toBeGreaterThan(10);
    expect(character.inert).toBe(false);

    const stage = await measureRail("stage");
    expect(stage.hiddenAttrOnlyWouldPass, "Stage sets hidden").toBe(true);
    expect(stage.display, "computed display must be none").toBe("none");
    expect(stage.width, "Stage rail width must be zero").toBeLessThan(1);
    expect(stage.inert).toBe(true);
    expect(stage.ariaHidden).toBe("true");
    expect(stage.surfaceShare).toBeGreaterThan(0.85);

    await captureReviewScene(dock, "dock-navigation-ownership", "dock-navigation-ownership-stage");
    await closeEvidenceSession(session);
  });
});
