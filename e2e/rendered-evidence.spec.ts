import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { DOCK_HEIGHT, DOCK_WIDTH } from "../src/ui/dock-geometry";
import {
  STATUS_LINE_HEIGHT,
  TILE_HEIGHT,
  TILE_WIDTH,
} from "../src/ui/tile-geometry";
import { postBusCommand } from "./helpers/bus";
import { contrastRatio, parseRGB } from "./helpers/contrast";

const SCREENSHOTS = "e2e-screenshots";

type Rect = { x: number; y: number; w: number; h: number; cls?: string };

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
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

test.describe("rendered-output evidence seam", () => {
  test("Battle Tile geometry, sprites, contrast, and combat feedback at native 1×", async ({
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

    await tile.waitForTimeout(2500);
    await tile.screenshot({ path: `${SCREENSHOTS}/02-tile-combat.png` });

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
    if (ko) {
      expect(
        ko.spriteFilter !== "none" || ko.stackTransform !== "none",
        "knockout non-colour signal on the nodes CSS targets",
      ).toBe(true);
    }

    expect(pageErrors, "tile page errors").toEqual([]);
    await context.close();
  });

  test("five Opponents fit the Battle Tile at 1× on a Stage 2 Wave without overlap", async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const { context, tile } = await openTile(browser);

    // Stage 2 unlocks after Stage 1 clears (engine advances on its own). Once Moonlit
    // is reachable, force Stage 2 over the bus as a third peer, then wait for Wave 2
    // (the five-opponent encounter).
    await expect(tile.locator(".stage-wave-text")).toContainText("Moonlit", {
      timeout: 90_000,
    });
    await postBusCommand(tile, { cmd: "selectStage", args: [2] });
    await expect(tile.locator(".stage-wave-text")).toContainText("Moonlit");

    await expect
      .poll(async () => tile.locator(".opponent-zone .combatant").count(), {
        timeout: 120_000,
        intervals: [2_000],
      })
      .toBeGreaterThanOrEqual(5);

    await expect(tile.locator(".battlefield")).toHaveClass(/opponent-stress-layout/);

    const geometry = await tile.evaluate(() => {
      const r = (el: Element): Rect => {
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height, cls: el.className };
      };
      return {
        opponents: [...document.querySelectorAll(".opponent-zone .combatant")].map(r),
        party: [...document.querySelectorAll(".party-zone .combatant")].map(r),
      };
    });

    expect(geometry.opponents.length).toBeGreaterThanOrEqual(5);
    assertCombatantsFitTile([...geometry.opponents, ...geometry.party]);

    await tile.screenshot({ path: `${SCREENSHOTS}/05-tile-five-opponents.png` });
    await context.close();
  });

  test("Management Dock populates from the Battle Tile over a shared bus and cycles its five surfaces", async ({
    browser,
  }) => {
    const { context, tile } = await openTile(browser);
    const pageErrors: string[] = [];
    tile.on("pageerror", (e) => pageErrors.push(String(e)));

    const dock = await context.newPage();
    dock.on("pageerror", (e) => pageErrors.push(String(e)));
    await dock.setViewportSize({ width: DOCK_WIDTH, height: DOCK_HEIGHT });
    await dock.goto("/?window=dock", { waitUntil: "networkidle" });
    await dock.waitForSelector(".management-dock");

    await expect
      .poll(async () => {
        return dock.evaluate(() => {
          const panel = document.querySelector(".dock-panel:not([hidden])");
          return panel ? panel.textContent?.trim().length ?? 0 : 0;
        });
      }, { timeout: 5_000 })
      .toBeGreaterThan(20);

    await dock.screenshot({ path: `${SCREENSHOTS}/03-dock-initial.png` });

    const tabs = await dock.evaluate(() =>
      [...document.querySelectorAll("[data-dock-tab]")].map((b) => (b as HTMLElement).dataset.dockTab),
    );
    expect(tabs).toHaveLength(5);

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

    const shell = await dock.evaluate((dockHeight) => {
      const s = document.querySelector(".dock-shell");
      const sr = s?.getBoundingClientRect();
      const surf = document.querySelector(".dock-surface");
      const cs = surf ? getComputedStyle(surf) : null;
      return {
        fillsWindow: sr ? Math.round(sr.height) >= dockHeight : false,
        surfaceOverflowY: cs?.overflowY ?? null,
      };
    }, DOCK_HEIGHT);
    expect(shell.fillsWindow).toBe(true);
    expect(shell.surfaceOverflowY).toMatch(/auto|scroll/);

    for (const [i, tab] of tabs.entries()) {
      await dock.click(`[data-dock-tab="${tab}"]`);
      await dock.waitForTimeout(150);
      const state = await dock.evaluate((t) => {
        const panel = document.querySelector(`[data-dock-panel="${t}"]`);
        const visible = [...document.querySelectorAll(".dock-panel")].filter(
          (p) => !(p as HTMLElement).hidden,
        );
        return {
          chars: panel ? panel.textContent?.trim().length ?? 0 : 0,
          visibleCount: visible.length,
        };
      }, tab);
      await dock.screenshot({ path: `${SCREENSHOTS}/04-dock-${i + 1}-${tab}.png` });
      expect(state.chars, `dock surface ${tab} content`).toBeGreaterThan(20);
      expect(state.visibleCount, `one panel for ${tab}`).toBe(1);
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
    expect(tileAlive).toBe(beforeClose);

    expect(pageErrors, "page errors").toEqual([]);
    await context.close();
  });
});
