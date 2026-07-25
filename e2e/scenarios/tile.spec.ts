import { expect, test } from "@playwright/test";
import {
  STATUS_LINE_HEIGHT,
  TILE_HEIGHT,
  TILE_WIDTH,
} from "../../src/ui/battle-tile-layout";
import { advanceUntil, advanceUntilVisible } from "../helpers/advance";
import { postBusSnapshot } from "../helpers/bus";
import { contrastRatio, parseRGB } from "../helpers/contrast";
import { closeEvidenceSession, openEvidenceSession } from "../helpers/evidence-session";
import { defineEvidenceScenario } from "../helpers/evidence-scenarios";
import { captureReviewScene } from "../helpers/review-scenes";
import {
  holdTheLineStatusSnapshot,
  stageTwoFiveOpponentDropSnapshot,
  stageTwoFiveOpponentStressSnapshot,
} from "../helpers/snapshots";

const SCREENSHOTS = "e2e-screenshots";

type Rect = { x: number; y: number; w: number; h: number; cls?: string };

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

type CooldownPipSample = {
  pip: Rect;
  fillFraction: string | null;
};

type CooldownPipCombatant = {
  id: string | null;
  pips: CooldownPipSample[];
  statusIcons: Rect | null;
};

function assertCooldownPipLayout(
  tileRoot: Rect,
  party: CooldownPipCombatant[],
  opponents: { pipCount: number }[],
  bossPipCount: number,
): void {
  expect(opponents.every((entry) => entry.pipCount === 0), "opponent cooldown pips").toBe(true);
  expect(bossPipCount, "boss cooldown pips").toBe(0);
  for (const combatant of party) {
    expect(combatant.pips, `${combatant.id} pip count`).toHaveLength(3);
    for (const pip of combatant.pips) {
      expect(pip.pip.w, `${combatant.id} pip width`).toBeGreaterThan(0);
      expect(pip.pip.h, `${combatant.id} pip height`).toBeGreaterThan(0);
      expect(pip.pip.x, `${combatant.id} pip inside tile`).toBeGreaterThanOrEqual(tileRoot.x - 0.5);
      expect(pip.pip.y, `${combatant.id} pip inside tile`).toBeGreaterThanOrEqual(tileRoot.y - 0.5);
      expect(pip.pip.x + pip.pip.w, `${combatant.id} pip inside tile`).toBeLessThanOrEqual(
        tileRoot.x + tileRoot.w + 0.5,
      );
      expect(pip.pip.y + pip.pip.h, `${combatant.id} pip inside tile`).toBeLessThanOrEqual(
        tileRoot.y + tileRoot.h + 0.5,
      );
      if (combatant.statusIcons) {
        expect(
          overlaps(pip.pip, combatant.statusIcons),
          `${combatant.id} pip overlaps status-icons`,
        ).toBe(false);
      }
    }
  }
}

async function readCooldownPipState(
  tile: import("@playwright/test").Page,
): Promise<{
  tileRoot: Rect;
  party: CooldownPipCombatant[];
  opponents: { pipCount: number }[];
  bossPipCount: number;
}> {
  return tile.evaluate(() => {
    const r = (el: Element | null): Rect => {
      if (!el) {
        return { x: 0, y: 0, w: 0, h: 0 };
      }
      const bounds = el.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height };
    };
    const tileRoot = r(document.querySelector(".battle-tile"));
    const party = [...document.querySelectorAll(".party-zone .combatant")].map((combatant) => ({
      id: combatant.getAttribute("data-entity-id"),
      pips: [...combatant.querySelectorAll(".cooldown-pip")].map((pip) => ({
        pip: r(pip),
        fillFraction: pip
          .querySelector<HTMLElement>(".cooldown-pip-fill")
          ?.dataset["fillFraction"] ?? null,
      })),
      statusIcons: combatant.querySelector(".status-icons")
        ? r(combatant.querySelector(".status-icons"))
        : null,
    }));
    const opponents = [...document.querySelectorAll(".opponent-zone .combatant")].map(
      (combatant) => ({
        pipCount: combatant.querySelectorAll(".cooldown-pip").length,
      }),
    );
    return {
      tileRoot,
      party,
      opponents,
      bossPipCount: document.querySelectorAll(".boss-combatant .cooldown-pip").length,
    };
  });
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
      slugs: [
        "tile-geometry",
        "native-1x-scaling",
        "aa-contrast",
        "effect-image-loading",
        "cooldown-pips",
      ],
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

    const initialPips = await readCooldownPipState(tile);
    assertCooldownPipLayout(
      initialPips.tileRoot,
      initialPips.party,
      initialPips.opponents,
      initialPips.bossPipCount,
    );

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

    let cooldownEvidence: {
      partial: boolean;
      fullUnused: boolean;
    } | null = null;
    await advanceUntil(tile, async () => {
      const state = await readCooldownPipState(tile);
      assertCooldownPipLayout(
        state.tileRoot,
        state.party,
        state.opponents,
        state.bossPipCount,
      );
      const fills = state.party.flatMap((combatant) =>
        combatant.pips.map((pip) => Number.parseFloat(pip.fillFraction ?? "1")),
      );
      const partial = fills.some((fill) => fill > 0 && fill < 1);
      const fullUnused = fills.some((fill) => fill >= 0.999);
      cooldownEvidence = { partial, fullUnused };
      return partial && fullUnused;
    });
    expect(cooldownEvidence?.partial, "used ability slot shows partial pip fill").toBe(true);
    expect(cooldownEvidence?.fullUnused, "unused slot stays full").toBe(true);

    const reducedMotionPips = await tile.evaluate(() => {
      const battlefield = document.querySelector(".battlefield");
      battlefield?.classList.add("reduced-motion");
      return [...document.querySelectorAll(".party-zone .cooldown-pip")].length;
    });
    expect(reducedMotionPips, "cooldown pips retained under reduced motion").toBe(9);

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
    const stressSnapshot = stageTwoFiveOpponentStressSnapshot();
    const stressSession = await openEvidenceSession(browser, {
      preset: "live-tile",
      savedSnapshotJson: JSON.stringify(stressSnapshot),
    });
    const stressTile = stressSession.tile;

    await expect(stressTile.locator(".stage-wave-text")).toContainText("Moonlit");
    await expect(stressTile.locator(".opponent-zone .combatant")).toHaveCount(5);
    await expect(stressTile.locator(".battlefield")).toHaveClass(/opponent-stress-layout/);

    const geometry = await stressTile.evaluate(() => {
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

    await stressTile.screenshot({ path: `${SCREENSHOTS}/05-tile-five-opponents.png` });
    await closeEvidenceSession(stressSession);

    const dropSnapshot = stageTwoFiveOpponentDropSnapshot();
    const dropSession = await openEvidenceSession(browser, {
      preset: "live-tile",
      savedSnapshotJson: JSON.stringify(dropSnapshot),
    });
    const tile = dropSession.tile;

    await expect(tile.locator(".stage-wave-text")).toContainText("Moonlit");

    type DropClearance = {
      notification: Rect;
      statusLine: Rect;
      stageWave: Rect;
      buttons: Rect[];
      combatants: Rect[];
      notificationInStatusDom: boolean;
    };

    await advanceUntil(
      tile,
      async () => (await tile.locator(".status-notification-layer .drop-toast:not([hidden])").count()) > 0,
      { stepMs: 250, maxSimMs: 2_000 },
    );

    let dropClearance: DropClearance | null = null;
    await expect
      .poll(async () => {
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
        return dropClearance;
      }, { timeout: 5_000 })
      .not.toBeNull();

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

    await tile.screenshot({ path: `${SCREENSHOTS}/06-tile-drop-notification.png` });
    await closeEvidenceSession(dropSession);
  },
  );
});
