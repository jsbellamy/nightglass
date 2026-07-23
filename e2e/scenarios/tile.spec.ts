import { expect, test } from "@playwright/test";
import {
  STATUS_LINE_HEIGHT,
  TILE_HEIGHT,
  TILE_WIDTH,
} from "../../src/ui/battle-tile-layout";
import { advanceUntil, advanceUntilVisible } from "../helpers/advance";
import { postBusCommand, postBusSnapshot } from "../helpers/bus";
import { contrastRatio, parseRGB } from "../helpers/contrast";
import { closeEvidenceSession, openEvidenceSession } from "../helpers/evidence-session";
import { defineEvidenceScenario } from "../helpers/evidence-scenarios";
import { captureReviewScene } from "../helpers/review-scenes";
import { holdTheLineStatusSnapshot } from "../helpers/snapshots";

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

type EffectImageLoadingState = {
  frameSeen: boolean;
  iconSeen: boolean;
  brokenFrames: { complete: boolean }[];
  brokenIcons: { complete: boolean }[];
};

async function readEffectImageLoadingState(tile: import("@playwright/test").Page): Promise<EffectImageLoadingState> {
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

test.describe("Battle Tile evidence scenarios", () => {
  defineEvidenceScenario(
    {
      id: "tile-baseline-combat",
      slugs: ["tile-geometry", "native-1x-scaling", "aa-contrast", "effect-image-loading"],
      spec: {
        id: "rendered-evidence:tile-baseline-combat",
        path: "e2e/scenarios/tile.spec.ts",
      },
      fixture: "live-tile",
      reviewScenes: [
        {
          id: "tile-combat",
          durableDestination: "docs/research/evidence/knockout-readability/tile-combat.png",
        },
      ],
      summary:
        "Battle Tile geometry, sprites, contrast, effect frames, status glyphs, and combat feedback at native 1×",
    },
    async ({ browser }) => {
    const session = await openEvidenceSession(browser, { preset: "live-tile" });
    const { tile } = session;

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

    await advanceUntilVisible(tile, tile.locator(".combatant.knocked-out"));
    await expect(tile.locator(".combatant.knocked-out")).toBeVisible();
    await tile.screenshot({ path: `${SCREENSHOTS}/02-tile-combat.png` });
    await captureReviewScene(tile, "tile-baseline-combat", "tile-combat");

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

    await closeEvidenceSession(session);
  },
  );

  defineEvidenceScenario(
    {
      id: "hold-the-line-status-glyph",
      slugs: ["effect-image-loading"],
      spec: {
        id: "rendered-evidence:hold-the-line-status-glyph",
        path: "e2e/scenarios/tile.spec.ts",
      },
      fixture: "live-tile-seeded-snapshot",
      reviewScenes: [],
      summary: "Hold the Line status glyph loads from a seeded Snapshot without page error",
    },
    async ({ browser }) => {
    const snapshot = holdTheLineStatusSnapshot();
    const session = await openEvidenceSession(browser, {
      preset: "live-tile",
      savedSnapshotJson: JSON.stringify(snapshot),
    });
    const { tile } = session;

    await postBusSnapshot(tile, snapshot);

    await expect
      .poll(async () => {
        return tile.evaluate(() => {
          const icon = document.querySelector<HTMLImageElement>(
            'img.status-icon[data-status-key$=":hold-the-line"]',
          );
          return (
            icon !== null &&
            icon.complete &&
            icon.naturalWidth > 0 &&
            icon.naturalHeight > 0
          );
        });
      })
      .toBe(true);

    await closeEvidenceSession(session);
  },
  );

  defineEvidenceScenario(
    {
      id: "tile-five-opponents-drop-clearance",
      slugs: ["tile-geometry"],
      spec: {
        id: "rendered-evidence:tile-five-opponents-drop-clearance",
        path: "e2e/scenarios/tile.spec.ts",
      },
      fixture: "live-tile",
      reviewScenes: [],
      summary: "five Opponents fit the Battle Tile at 1× on a Stage 2 Wave without overlap",
    },
    async ({ browser }) => {
    test.setTimeout(60_000);
    const session = await openEvidenceSession(browser, { preset: "live-tile" });
    const { tile } = session;

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
    await closeEvidenceSession(session);
  },
  );
});
