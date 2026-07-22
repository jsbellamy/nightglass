import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { createEngine } from "../src/core/engine";
import { cloneSnapshot, type DropInstance, type Snapshot } from "../src/core/snapshot";
import type { ClassId, EquipmentSlotId } from "../src/core/types";
import { buildContent } from "../src/data";
import { NIGHTGLASS_BUS_CHANNEL } from "../src/ui/bus";
import { DOCK_HEIGHT, DOCK_WIDTH } from "../src/ui/dock-geometry";
import { PUMP_INTERVAL_MS } from "../src/ui/pump";
import {
  STATUS_LINE_HEIGHT,
  TILE_HEIGHT,
  TILE_WIDTH,
} from "../src/ui/battle-tile-layout";
import { postBusCommand, postBusSnapshot } from "./helpers/bus";
import { advanceUntil, advanceUntilVisible } from "./helpers/advance";
import { contrastRatio, parseRGB } from "./helpers/contrast";
import { focusDockTab, openTileAndDock } from "./helpers/dock-context";

const SCREENSHOTS = "e2e-screenshots";
/** Committed review artifact for the knockout-readability judgement (#103). */
const KNOCKOUT_ARTIFACT = "docs/research/evidence/knockout-readability/tile-combat.png";
/** Committed review artifact after Character Equipment removal (#300): Armory worn strip. */
const EQUIPMENT_CHROME_LEGIBILITY_ARTIFACT =
  "docs/research/evidence/124-equipment-icon-consumers/armory-worn-strip.png";

type Rect = { x: number; y: number; w: number; h: number; cls?: string };

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x - 0.5 &&
    inner.y >= outer.y - 0.5 &&
    inner.x + inner.w <= outer.x + outer.w + 0.5 &&
    inner.y + inner.h <= outer.y + outer.h + 0.5
  );
}

function assertCombatantsFitTile(combatants: Rect[]): void {
  const collisions: string[] = [];
  for (let i = 0; i < combatants.length; i++) {
    for (let j = i + 1; j < combatants.length; j++) {
      const left = combatants[i]!;
      const right = combatants[j]!;
      if (overlaps(left, right)) collisions.push(`${left.cls} x ${right.cls}`);
    }
  }
  expect(collisions, "combatant overlaps").toEqual([]);
  const escapes = combatants.filter(
    (c) =>
      c.x < 0 ||
      c.y < 0 ||
      c.x + c.w > TILE_WIDTH + 0.5 ||
      c.y + c.h > TILE_HEIGHT + 0.5,
  );
  expect(escapes, "combatants outside tile").toEqual([]);
}

async function openTile(browser: Browser): Promise<{ context: Awaited<ReturnType<Browser["newContext"]>>; tile: Page }> {
  mkdirSync(SCREENSHOTS, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: TILE_WIDTH, height: TILE_HEIGHT },
    deviceScaleFactor: 1,
  });
  const tile = await context.newPage();
  await tile.goto("/", { waitUntil: "networkidle" });
  await tile.waitForSelector(".battle-tile .status-line");
  return { context, tile };
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
  snapshot.progression.armory = armory;
  return snapshot;
}

/** Third-peer bus spy on the page — observes delivery without production hooks. */
async function installBusSpy(page: Page): Promise<void> {
  await page.evaluate((channelName) => {
    const w = window as unknown as {
      __ngBusLog: { type: string }[];
      __ngBusSpy?: BroadcastChannel;
    };
    w.__ngBusLog = [];
    w.__ngBusSpy?.close();
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (event: MessageEvent<{ type: string }>) => {
      w.__ngBusLog.push({ type: event.data.type });
    };
    w.__ngBusSpy = channel;
  }, NIGHTGLASS_BUS_CHANNEL);
}

async function readBusSpyTypes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __ngBusLog?: { type: string }[] };
    return (w.__ngBusLog ?? []).map((m) => m.type);
  });
}

type EffectImageLoadingState = {
  frameSeen: boolean;
  iconSeen: boolean;
  brokenFrames: { complete: boolean }[];
  brokenIcons: { complete: boolean }[];
};

async function readEffectImageLoadingState(tile: Page): Promise<EffectImageLoadingState> {
  return tile.evaluate(() => {
    const samples = (selector: string) =>
      [...document.querySelectorAll<HTMLImageElement>(selector)].map((el) => ({
        complete: el.complete && el.naturalWidth > 0 && el.naturalHeight > 0,
      }));
    const frames = samples("img.effect-frame");
    const icons = samples("img.status-icon");
    const brokenFrames = frames.filter((entry) => !entry.complete);
    const brokenIcons = icons.filter((entry) => !entry.complete);
    return {
      frameSeen: frames.some((entry) => entry.complete),
      iconSeen: icons.some((entry) => entry.complete),
      brokenFrames,
      brokenIcons,
    };
  });
}

function effectImagesReady(state: EffectImageLoadingState): boolean {
  return (
    state.frameSeen &&
    state.iconSeen &&
    state.brokenFrames.length === 0 &&
    state.brokenIcons.length === 0
  );
}

test.describe("rendered-output evidence seam", () => {
  test("evidence: tile-geometry / evidence: native-1x-scaling / evidence: aa-contrast / evidence: effect-image-loading — Battle Tile geometry, sprites, contrast, effect frames, status glyphs, and combat feedback at native 1×", async ({
    browser,
  }) => {
    const { context, tile } = await openTile(browser);
    const pageErrors: string[] = [];
    tile.on("pageerror", (e) => pageErrors.push(String(e)));

    await tile.screenshot({ path: `${SCREENSHOTS}/01-tile-initial.png` });

    const geometry = await tile.evaluate(() => {
      const r = (el: Element | null): Rect => {
        if (!el) return { x: 0, y: 0, w: 0, h: 0 };
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      };
      return {
        root: r(document.querySelector(".battle-tile")),
        statusLine: r(document.querySelector(".status-line")),
        opponents: [...document.querySelectorAll(".opponent-zone .combatant")].map((el) => ({
          cls: el.className,
          ...r(el),
        })),
        party: [...document.querySelectorAll(".party-zone .combatant")].map((el) => ({
          cls: el.className,
          ...r(el),
        })),
      };
    });

    expect(geometry.root.w, "tile width").toBe(TILE_WIDTH);
    expect(geometry.root.h, "tile height").toBe(TILE_HEIGHT);
    expect(Math.round(geometry.statusLine.h), "status line height").toBe(STATUS_LINE_HEIGHT);

    const all = [...geometry.opponents, ...geometry.party];
    assertCombatantsFitTile(all);

    const sprites = await tile.evaluate(() =>
      [...document.querySelectorAll("img.combatant-sprite")].map((img) => {
        const el = img as HTMLImageElement;
        const stack = el.closest(".combatant-stack");
        const combatant = el.closest(".combatant");
        const transformed =
          !!combatant?.classList.contains("knocked-out") ||
          (stack !== null && getComputedStyle(stack).transform !== "none");
        const b = el.getBoundingClientRect();
        return {
          src: el.getAttribute("src")?.split("/").pop(),
          natural: [el.naturalWidth, el.naturalHeight] as [number, number],
          rendered: [Math.round(b.width), Math.round(b.height)] as [number, number],
          complete: el.complete && el.naturalWidth > 0,
          transformed,
        };
      }),
    );
    expect(
      sprites.filter((s) => !s.complete),
      "broken sprites",
    ).toEqual([]);
    const scaled = sprites.filter(
      (s) =>
        s.complete &&
        !s.transformed &&
        (s.natural[0] !== s.rendered[0] || s.natural[1] !== s.rendered[1]),
    );
    expect(scaled, "non-1× sprites (excluding knockout transforms)").toEqual([]);

    const contrastSamples = await tile.evaluate(() => {
      const bgOf = (el: Element) => {
        let n: Element | null = el;
        while (n) {
          const c = getComputedStyle(n).backgroundColor;
          if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
          n = n.parentElement;
        }
        return getComputedStyle(document.body).backgroundColor;
      };
      const targets = [".stage-wave-text", ".dock-toggle", ".health-text", ".boss-health-text"];
      return targets.flatMap((sel) =>
        [...document.querySelectorAll(sel)].slice(0, 1).map((el) => {
          const cs = getComputedStyle(el);
          return { sel, color: cs.color, bg: bgOf(el), size: cs.fontSize, weight: cs.fontWeight };
        }),
      );
    });
    for (const sample of contrastSamples) {
      const fg = parseRGB(sample.color);
      const bg = parseRGB(sample.bg);
      expect(fg, `parse fg for ${sample.sel}`).not.toBeNull();
      expect(bg, `parse bg for ${sample.sel}`).not.toBeNull();
      const ratio = contrastRatio(fg!, bg!);
      const px = parseFloat(sample.size);
      const large = px >= 24 || (px >= 18.66 && parseInt(sample.weight, 10) >= 700);
      const floor = large ? 3 : 4.5;
      expect(ratio, `AA contrast ${sample.sel}`).toBeGreaterThanOrEqual(floor);
    }

    await advanceUntil(tile, async () => effectImagesReady(await readEffectImageLoadingState(tile)));
    const effectState = await readEffectImageLoadingState(tile);
    expect(effectState).toMatchObject({
      frameSeen: true,
      iconSeen: true,
      brokenFrames: [],
      brokenIcons: [],
    });

    // Seeded run knocks someone out after sim advances; wait for the DOM class, then
    // assert on the nodes CSS actually targets (.combatant-sprite / .combatant-stack).
    await advanceUntilVisible(tile, tile.locator(".combatant.knocked-out"));
    await expect(tile.locator(".combatant.knocked-out")).toBeVisible();
    mkdirSync("docs/research/evidence/knockout-readability", { recursive: true });
    await tile.screenshot({ path: `${SCREENSHOTS}/02-tile-combat.png` });
    await tile.screenshot({ path: KNOCKOUT_ARTIFACT });

    const ko = await tile.evaluate(() => {
      const combatant = document.querySelector(".combatant.knocked-out");
      if (!combatant) return null;
      const sprite = combatant.querySelector(".combatant-sprite");
      const stack = combatant.querySelector(".combatant-stack");
      return {
        spriteFilter: sprite ? getComputedStyle(sprite).filter : null,
        stackTransform: stack ? getComputedStyle(stack).transform : null,
      };
    });
    expect(ko, "knocked-out combatant present").not.toBeNull();
    expect(
      ko!.spriteFilter !== "none" || ko!.stackTransform !== "none",
      "knockout non-colour signal on the nodes CSS targets",
    ).toBe(true);

    expect(pageErrors, "tile page errors").toEqual([]);
    await context.close();
  });

  test("evidence: tile-geometry — five Opponents fit the Battle Tile at 1× on a Stage 2 Wave without overlap", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const { context, tile } = await openTile(browser);

    // Five-opponent waves exist only in stages 2–3. Advance until Stage 2 unlocks,
    // then force it over the bus as a third peer (no production test hook).
    await advanceUntil(tile, async () => {
      const text = await tile.locator(".stage-wave-text").textContent();
      return text?.includes("Moonlit") ?? false;
    });
    await expect(tile.locator(".stage-wave-text")).toContainText("Moonlit");
    await postBusCommand(tile, { cmd: "selectStage", args: [2] });
    await expect(tile.locator(".stage-wave-text")).toContainText("Moonlit");

    await advanceUntil(
      tile,
      async () => (await tile.locator(".opponent-zone .combatant").count()) === 5,
      { stepMs: 2_000 },
    );
    await expect(tile.locator(".opponent-zone .combatant")).toHaveCount(5);

    await expect(tile.locator(".battlefield")).toHaveClass(/opponent-stress-layout/);

    const geometry = await tile.evaluate(() => {
      const r = (el: Element | null): Rect => {
        if (!el) return { x: 0, y: 0, w: 0, h: 0 };
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height, cls: el.className };
      };
      return {
        root: r(document.querySelector(".battle-tile")),
        statusLine: r(document.querySelector(".status-line")),
        opponents: [...document.querySelectorAll(".opponent-zone .combatant")].map((el) => ({
          cls: el.className,
          ...r(el),
        })),
        party: [...document.querySelectorAll(".party-zone .combatant")].map((el) => ({
          cls: el.className,
          ...r(el),
        })),
      };
    });

    expect(geometry.root.w, "tile width in stress layout").toBe(TILE_WIDTH);
    expect(geometry.root.h, "tile height in stress layout").toBe(TILE_HEIGHT);
    expect(Math.round(geometry.statusLine.h), "status line in stress layout").toBe(
      STATUS_LINE_HEIGHT,
    );
    expect(geometry.opponents, "five Opponents").toHaveLength(5);
    expect(geometry.party, "three party members").toHaveLength(3);
    expect(
      [...geometry.opponents, ...geometry.party],
      "eight combatants in the stress layout",
    ).toHaveLength(8);
    assertCombatantsFitTile([...geometry.opponents, ...geometry.party]);

    type DropClearance = {
      notification: Rect;
      statusLine: Rect;
      stageWave: Rect;
      buttons: Rect[];
      combatants: Rect[];
      notificationInStatusDom: boolean;
    };

    let dropClearance: DropClearance | null = null;
    await advanceUntil(tile, async () => {
      dropClearance = await tile.evaluate(() => {
        const r = (el: Element | null): Rect => {
          if (!el) return { x: 0, y: 0, w: 0, h: 0 };
          const b = el.getBoundingClientRect();
          return { x: b.x, y: b.y, w: b.width, h: b.height, cls: el.className };
        };
        const notificationEl = document.querySelector<HTMLElement>(
          ".status-notification-layer .drop-toast",
        );
        if (
          !notificationEl ||
          notificationEl.hidden ||
          !notificationEl.querySelector(".equipment-icon-img--content")
        ) {
          return null;
        }
        const notification = r(notificationEl);
        if (notification.h < 34) {
          return null;
        }
        const statusLine = r(document.querySelector(".status-line"));
        const stageWave = r(document.querySelector(".stage-wave-text"));
        const buttons = [...document.querySelectorAll(".status-button")].map((el) => r(el));
        const combatants = [...document.querySelectorAll(".combatant")].map((el) => r(el));
        const statusLineEl = document.querySelector(".status-line");
        return {
          notification,
          statusLine,
          stageWave,
          buttons,
          combatants,
          notificationInStatusDom:
            !!statusLineEl &&
            (statusLineEl.contains(notificationEl) ||
              statusLineEl.parentElement?.contains(notificationEl) === true),
        };
      });
      return (dropClearance?.notification.h ?? 0) >= 34;
    });

    if (!dropClearance) {
      throw new Error("drop clearance poll passed but left dropClearance unset");
    }
    expect(dropClearance.notification.h).toBeGreaterThanOrEqual(34);
    expect(dropClearance.notificationInStatusDom, "drop notification mounted in status chrome").toBe(
      true,
    );
    for (const combatant of dropClearance.combatants) {
      expect(
        overlaps(dropClearance.notification, combatant),
        `drop notification must not overlap ${combatant.cls}`,
      ).toBe(false);
    }
    for (const button of dropClearance.buttons) {
      expect(
        overlaps(dropClearance.notification, button),
        `drop notification must not overlap ${button.cls}`,
      ).toBe(false);
    }
    expect(
      overlaps(dropClearance.notification, dropClearance.stageWave),
      "drop notification must not overlap stage-wave text",
    ).toBe(false);

    await tile.screenshot({ path: `${SCREENSHOTS}/05-tile-five-opponents.png` });
    await tile.screenshot({ path: `${SCREENSHOTS}/06-tile-drop-notification.png` });
    await context.close();
  });

  test("evidence: cross-webview-delivery / evidence: dock-surfaces — Management Dock populates from the Battle Tile over a shared bus and cycles its three surfaces", async ({
    browser,
  }) => {
    const { context, tile } = await openTile(browser);
    const pageErrors: string[] = [];
    tile.on("pageerror", (e) => pageErrors.push(String(e)));

    await installBusSpy(tile);

    const dock = await context.newPage();
    dock.on("pageerror", (e) => pageErrors.push(String(e)));
    await dock.setViewportSize({ width: DOCK_WIDTH, height: DOCK_HEIGHT });
    await dock.goto("/?window=dock", { waitUntil: "networkidle" });
    await dock.waitForSelector(".management-dock");

    // Handshake: dock publishes dock-opened; tile answers with snapshot;
    // dock renders populated content — across two real pages on one origin.
    await expect
      .poll(async () => {
        const types = await readBusSpyTypes(tile);
        const openedAt = types.indexOf("dock-opened");
        if (openedAt < 0) return false;
        return types.slice(openedAt + 1).includes("snapshot");
      }, { timeout: 5_000 })
      .toBe(true);

    await expect
      .poll(async () => {
        return dock.evaluate(() => {
          const panel = document.querySelector(".dock-panel:not([hidden])");
          return panel ? panel.textContent?.trim().length ?? 0 : 0;
        });
      }, { timeout: 5_000 })
      .toBeGreaterThan(20);

    await dock.screenshot({ path: `${SCREENSHOTS}/03-dock-initial.png` });

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

    const tabs = await dock.evaluate(() =>
      [...document.querySelectorAll("[data-dock-tab]")].map((b) => (b as HTMLElement).dataset.dockTab),
    );
    expect(tabs).toHaveLength(3);

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

    for (const [i, tab] of tabs.entries()) {
      await dock.click(`[data-dock-tab="${tab}"]`);
      await dock.waitForTimeout(150);
      const state = await dock.evaluate((t) => {
        const panel = document.querySelector(`[data-dock-panel="${t}"]`);
        const visible = [...document.querySelectorAll(".dock-panel")].filter(
          (p) => !(p as HTMLElement).hidden,
        );
        const picker = document.querySelector<HTMLElement>(".dock-body > .character-picker");
        const armorySelector = panel?.querySelector<HTMLElement>(
          '[data-armory-character-selector="true"]',
        );
        const formationControl = document.querySelector(
          ".character-picker [data-formation-action]",
        );
        return {
          chars: panel ? panel.textContent?.trim().length ?? 0 : 0,
          visibleCount: visible.length,
          pickerHidden: picker?.hidden === true,
          armorySelectorInPanel: armorySelector !== null,
          formationOnCharacterTab: t === "character" && formationControl !== null,
          stageHasPicker: t === "stage" && picker?.hidden === true,
        };
      }, tab);
      await dock.screenshot({ path: `${SCREENSHOTS}/04-dock-${i + 1}-${tab}.png` });
      expect(state.chars, `dock surface ${tab} content`).toBeGreaterThan(20);
      expect(state.visibleCount, `one panel for ${tab}`).toBe(1);
      if (tab === "character") {
        expect(state.pickerHidden, "full Character rail on Character").toBe(false);
        expect(state.formationOnCharacterTab, "formation controls on Character").toBe(true);
      } else {
        expect(state.pickerHidden, `full rail hidden on ${tab}`).toBe(true);
      }
      if (tab === "armory") {
        expect(state.armorySelectorInPanel, "Armory compact selector").toBe(true);
      }
      if (tab === "stage") {
        expect(state.stageHasPicker, "Stage omits Character nav").toBe(true);
        expect(state.armorySelectorInPanel, "Stage has no Armory selector").toBe(false);
      }
    }

    const firstTab = tabs[0];
    expect(firstTab).toBeTruthy();
    await dock.click(`[data-dock-tab="${firstTab}"]`);
    await dock.focus(`[data-dock-tab="${firstTab}"]`);
    await dock.keyboard.press("ArrowRight");
    await dock.waitForTimeout(100);
    const afterArrow = await dock.evaluate(() => ({
      selected: (
        document.querySelector('[data-dock-tab][aria-selected="true"]') as HTMLElement | null
      )?.dataset.dockTab,
    }));
    expect(afterArrow.selected).toBeTruthy();
    expect(afterArrow.selected).not.toBe(firstTab);

    const beforeClose = await tile.evaluate(() => document.querySelectorAll(".battle-tile").length);
    await dock.click(".dock-close");
    await dock.waitForTimeout(400);
    const tileAlive = await tile.evaluate(() => document.querySelectorAll(".battle-tile").length);
    expect(tileAlive, "tile still mounted after dock close").toBe(beforeClose);

    // Tile sim keeps advancing after dock close; pump stops once dock-closed crosses back.
    const typesBefore = await readBusSpyTypes(tile);
    const pumpCountBefore = typesBefore.filter((t) => t === "pump").length;
    await expect
      .poll(async () => {
        const types = await readBusSpyTypes(tile);
        return types.includes("dock-closed");
      }, { timeout: 3_000 })
      .toBe(true);
    await tile.waitForTimeout(PUMP_INTERVAL_MS * 2);
    const typesAfter = await readBusSpyTypes(tile);
    const pumpCountAfter = typesAfter.filter((t) => t === "pump").length;
    expect(pumpCountAfter, "no further pump after dock-closed").toBe(pumpCountBefore);

    expect(pageErrors, "page errors").toEqual([]);
    await context.close();
  });

  test("evidence: equipment-icon-content-tier / evidence: equipment-icon-chrome-legibility — Armory grid content-tier geometry and density; worn strip carries the chrome-legibility slug (content tier, explicit change)", async ({
    browser,
  }) => {
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
      await dock.click(`.armory-character-selector [data-character-chip="${classId}"]`);
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

    mkdirSync("docs/research/evidence/124-equipment-icon-consumers", { recursive: true });
    const wornStrip = await dock.locator('[data-armory-worn-strip="true"]');
    await wornStrip.screenshot({ path: EQUIPMENT_CHROME_LEGIBILITY_ARTIFACT });

    await context.close();
  });

  test("evidence: character-loadout-no-scroll — three Ability Loadout slots fit without Character panel scroll at 800×480", async ({
    browser,
  }) => {
    const { context, dock } = await openTileAndDock(browser);
    await focusDockTab(dock, "character");

    const loadoutFit = await dock.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-dock-panel="character"]');
      if (!panel) {
        return null;
      }
      const loadoutSection = panel.querySelector<HTMLElement>('[data-character-section="loadout"]');
      const panelBox = panel.getBoundingClientRect();
      const lastSlot = panel.querySelector<HTMLElement>(".loadout-slot:last-of-type");
      const lastBox = lastSlot?.getBoundingClientRect();
      return {
        panelScrollable: panel.scrollHeight > panel.clientHeight + 1,
        loadoutVisible: Boolean(loadoutSection && !loadoutSection.hidden),
        overflowY: getComputedStyle(panel).overflowY,
        slots: panel.querySelectorAll(".loadout-slot").length,
        lastSlotFits:
          lastBox !== undefined &&
          lastBox.bottom <= panelBox.bottom + 1 &&
          lastBox.top >= panelBox.top - 1,
      };
    });

    expect(loadoutFit, "Character panel metrics").not.toBeNull();
    expect(loadoutFit!.loadoutVisible).toBe(true);
    expect(loadoutFit!.slots).toBe(3);
    expect(loadoutFit!.panelScrollable, "loadout fits without panel scroll").toBe(false);
    expect(loadoutFit!.lastSlotFits, "third loadout slot visible without scroll").toBe(true);
    expect(loadoutFit!.overflowY).toMatch(/auto|scroll/);

    await context.close();
  });

  test("evidence: character-talents-no-scroll — current Talent Tier fits without Character panel scroll at 800×480", async ({
    browser,
  }) => {
    const { context, dock } = await openTileAndDock(browser);
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
        tierRows: panel.querySelectorAll(".talent-grid .talent-cell").length,
        overflowY: getComputedStyle(panel).overflowY,
      };
    });

    expect(talentsFit, "Character talents metrics").not.toBeNull();
    expect(talentsFit!.talentsVisible).toBe(true);
    expect(talentsFit!.tierRows).toBeGreaterThan(0);
    expect(talentsFit!.panelScrollable, "talents tier fits without panel scroll").toBe(false);
    expect(talentsFit!.overflowY).toMatch(/auto|scroll/);

    await context.close();
  });
});
