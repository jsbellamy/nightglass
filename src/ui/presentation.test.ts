// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import type { Snapshot } from "../core/snapshot";
import { fixtureContent } from "../core/testing/fixture-content";
import { buildContent } from "../data";
import { mountBattleTile } from "./battle-tile";
import { ARMORY_BADGE_EVENT } from "./bus";
import {
  ACTOR_POOL,
  BANNER_DURATION_MS,
  DOWNED,
  DROP_TOAST_MS,
  HURT,
  LUNGE,
  createPresentation,
  hurtOffset,
  lungeOffset,
  readAnchorGeometry,
  strikePointOffset,
} from "./presentation";

const LOOT_SEED = 42;

function snapshotWithAction(snapshot: Snapshot, nowMs: number): Snapshot {
  const next = structuredClone(snapshot);
  const attempt = next.attempt;
  if (!attempt) {
    throw new Error("missing attempt");
  }
  const actor = attempt.combatants.find((entry) => entry.entityId === "party:knight:front");
  if (!actor) {
    throw new Error("missing front knight");
  }
  actor.action = {
    abilityId: "steel-cut",
    startedAtMs: nowMs - 100,
    impactAtMs: nowMs + 250,
    endsAtMs: nowMs + 900,
    targetIds: ["opp:1:0"],
    impactResolved: false,
  };
  next.simNowMs = nowMs;
  return next;
}

describe("presentation contract math", () => {
  it("keeps lunge at full extension for at least 66ms", () => {
    const holdStart = LUNGE.rampMs;
    const holdEnd = LUNGE.rampMs + LUNGE.holdMs - 1;
    expect(LUNGE.holdMs).toBeGreaterThanOrEqual(66);
    for (let t = holdStart; t <= holdEnd; t += 1) {
      expect(lungeOffset(t)).toEqual({ x: LUNGE.outPx, y: 0 });
    }
  });

  it("pins hurt recoil and flash constants", () => {
    expect(HURT).toEqual({ recoilPx: 2, recoilMs: 90, flashMs: 60, flashStrength: 0.6 });
    expect(hurtOffset(0, 1)).toEqual({ x: -2, y: 0 });
  });

  it("computes strike-point offsets from the foot anchor", () => {
    expect(strikePointOffset()).toEqual({ x: 0, y: -26 });
    expect(strikePointOffset(-15)).toEqual({ x: -15, y: -26 });
  });

  it("pins actor pool and downed constants", () => {
    expect(ACTOR_POOL).toEqual({ rgb: [111, 227, 173], rx: 11, ry: 3, dy: 1 });
    expect(DOWNED).toEqual({ darken: 0.5, dropPx: 3 });
  });
});

describe.each([false, true])("presentation mapping (reducedMotion=%s)", (reducedMotion) => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("main");
  });

  afterEach(() => {
    root.replaceChildren();
  });

  it("shows the actor pool for the full Action Cycle", () => {
    const tile = mountBattleTile(root, buildContent(), { reducedMotion });
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = snapshotWithAction(engine.snapshot(), 1_000);
    tile.render(snapshot);

    const pool = root.querySelector<HTMLElement>(".actor-pool");
    expect(pool).not.toBeNull();
    expect(pool?.dataset["actorPoolRgb"]).toBe("111,227,173");
  });
});

describe("presentation mapping", () => {
  let root: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    root = document.createElement("main");
  });

  afterEach(() => {
    vi.useRealTimers();
    root.replaceChildren();
  });

  it("applies hurt flash strength 0.6 on impact", () => {
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    snapshot.simNowMs = 2_000;
    tile.render(snapshot);

    const targetId = snapshot.attempt?.combatants.find((entry) => entry.side === "opponent")?.entityId;
    if (!targetId) {
      throw new Error("missing opponent");
    }

    tile.applyEvents(
      [
        {
          seq: 1,
          atMs: 2_000,
          type: "impact",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          results: [
            {
              targetId,
              kind: "damage",
              channel: "physical",
              amount: 5,
              healthAfter: 20,
            },
          ],
        },
      ],
      snapshot,
    );

    const body = root.querySelector<HTMLElement>(`[data-entity-id="${targetId}"] .layer-body`);
    expect(body?.classList.contains("hurt-flash")).toBe(true);
    expect(body?.style.getPropertyValue("--hurt-flash-strength")).toBe("0.6");
  });

  it("mirrors party-facing-right and opponent-facing-left motion from Presentation Events", () => {
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = snapshotWithAction(engine.snapshot(), 1_000);
    tile.render(snapshot);

    const partyActor = root.querySelector<HTMLElement>('[data-entity-id="party:knight:front"]');
    expect(Number(partyActor?.dataset["bodyOffsetX"])).toBeGreaterThan(0);

    const opponentId = snapshot.attempt?.combatants.find((entry) => entry.side === "opponent")?.entityId;
    if (!opponentId) {
      throw new Error("missing opponent");
    }
    tile.applyEvents(
      [
        {
          seq: 1,
          atMs: 1_000,
          type: "impact",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          results: [{ targetId: opponentId, kind: "damage", channel: "physical", amount: 1, healthAfter: 10 }],
        },
      ],
      snapshot,
    );
    const opponentActor = root.querySelector<HTMLElement>(`[data-entity-id="${opponentId}"]`);
    expect(Number(opponentActor?.dataset["bodyOffsetX"])).toBeGreaterThan(0);
  });

  it("drops lunge offsets under reduced motion but keeps the actor pool and damage numbers", () => {
    const tile = mountBattleTile(root, buildContent(), { reducedMotion: true });
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = snapshotWithAction(engine.snapshot(), 1_500);
    tile.render(snapshot);

    const actor = root.querySelector<HTMLElement>('[data-entity-id="party:knight:front"]');
    expect(actor?.dataset["bodyOffsetX"]).toBe("0");
    expect(root.querySelector(".actor-pool")).not.toBeNull();

    const targetId = snapshot.attempt?.combatants.find((entry) => entry.side === "opponent")?.entityId;
    if (!targetId) {
      throw new Error("missing opponent");
    }
    tile.applyEvents(
      [
        {
          seq: 2,
          atMs: 1_600,
          type: "impact",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          results: [
            {
              targetId,
              kind: "damage",
              channel: "physical",
              amount: 4,
              healthAfter: 18,
            },
          ],
        },
      ],
      snapshot,
    );
    expect(root.querySelector(".damage-number")).not.toBeNull();
    expect(actor?.dataset["bodyOffsetX"]).toBe("0");
  });

  it("renders two status glyphs then a +n chip", () => {
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    snapshot.simNowMs = 500;
    tile.render(snapshot);

    tile.applyEvents(
      [
        { seq: 1, atMs: 500, type: "status-applied", entityId: "party:knight:front", statusId: "braced", expiresAtMs: 5_500 },
        { seq: 2, atMs: 501, type: "status-applied", entityId: "party:knight:front", statusId: "warded", expiresAtMs: 6_500 },
        { seq: 3, atMs: 502, type: "status-applied", entityId: "party:knight:front", statusId: "stun", expiresAtMs: 1_700 },
      ],
      snapshot,
    );

    const row = root.querySelector(".status-icons");
    expect(row?.querySelectorAll(".status-icon")).toHaveLength(2);
    expect(row?.querySelector(".status-overflow-chip")?.textContent).toBe("+1");
  });

  it("keeps Knockout collapse classes and downed position across a wave transition", () => {
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = structuredClone(engine.snapshot());
    const downed = snapshot.attempt?.combatants.find((entry) => entry.entityId === "party:knight:front");
    if (!downed) {
      throw new Error("missing knight");
    }
    downed.knockedOut = true;
    downed.health = 0;
    snapshot.simNowMs = 10_000;
    tile.render(snapshot);

    const element = root.querySelector<HTMLElement>('[data-entity-id="party:knight:front"]');
    const body = element?.querySelector<HTMLElement>(".layer-body");
    expect(element?.classList.contains("knockout-collapse")).toBe(true);
    expect(element?.classList.contains("knockout-desaturate")).toBe(true);
    expect(element?.dataset["bodyOffsetY"]).toBe(String(DOWNED.dropPx));
    expect(body?.style.transform).toBe(`translate(0px, ${DOWNED.dropPx}px)`);

    tile.applyEvents(
      [{ seq: 9, atMs: 10_000, type: "wave-started", stage: 1, encounter: 2, boss: false }],
      snapshot,
    );
    tile.render(snapshot);
    expect(element?.classList.contains("knockout-collapse")).toBe(true);
    expect(element?.classList.contains("knockout-desaturate")).toBe(true);
    expect(element?.dataset["bodyOffsetY"]).toBe(String(DOWNED.dropPx));
    expect(body?.style.transform).toBe(`translate(0px, ${DOWNED.dropPx}px)`);
  });

  it("suppresses centre-lane banners for non-Boss wave-started events", () => {
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    snapshot.simNowMs = 3_000;
    tile.render(snapshot);

    tile.applyEvents(
      [{ seq: 3, atMs: 3_000, type: "wave-started", stage: 1, encounter: 2, boss: false }],
      snapshot,
    );
    const banner = root.querySelector<HTMLElement>(".lane-banner");
    expect(banner?.hidden).toBe(true);
    expect(banner?.classList.contains("lane-banner-visible")).toBe(false);
  });

  it("shows a Boss Wave centre-lane banner", () => {
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    snapshot.simNowMs = 3_000;
    tile.render(snapshot);

    tile.applyEvents(
      [{ seq: 3, atMs: 3_000, type: "wave-started", stage: 1, encounter: 3, boss: true }],
      snapshot,
    );
    const banner = root.querySelector<HTMLElement>(".lane-banner");
    expect(banner?.hidden).toBe(false);
    expect(banner?.textContent).toBe("Boss Wave");
  });

  it("shows Stage Attempt and Stage-cleared centre-lane banners", () => {
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    snapshot.simNowMs = 3_000;
    tile.render(snapshot);

    tile.applyEvents(
      [{ seq: 4, atMs: 3_000, type: "stage-attempt-started", stage: 1, attemptId: 2 }],
      snapshot,
    );
    expect(root.querySelector<HTMLElement>(".lane-banner")?.textContent).toBe("Orchard Understory");

    tile.applyEvents([{ seq: 5, atMs: 3_500, type: "stage-cleared", stage: 1 }], snapshot);
    expect(root.querySelector<HTMLElement>(".lane-banner")?.textContent).toBe("Orchard Understory");
  });

  it("shows and clears centre-lane banners over ~1.5s", () => {
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    snapshot.simNowMs = 3_000;
    tile.render(snapshot);

    tile.applyEvents([{ seq: 3, atMs: 3_000, type: "party-defeat", stage: 1 }], snapshot);
    const banner = root.querySelector<HTMLElement>(".lane-banner");
    expect(banner?.hidden).toBe(false);
    expect(banner?.textContent).toBe("Party Defeat");

    snapshot.simNowMs = 3_000 + BANNER_DURATION_MS + 1;
    tile.render(snapshot);
    expect(root.querySelector<HTMLElement>(".lane-banner")?.hidden).toBe(true);
  });

  it("shows a drop toast and emits the Armory badge hook", () => {
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = structuredClone(engine.snapshot());
    snapshot.progression.armory.push({
      dropId: 99,
      baseId: "thornquill-blade",
      itemLevel: 1,
      rarity: "rare",
      affixes: [],
      awardedAtMs: 4_000,
      seen: false,
      locked: false,
      assignedTo: null,
    });
    snapshot.simNowMs = 4_000;

    const badge = vi.fn();
    root.addEventListener(ARMORY_BADGE_EVENT, badge);
    tile.applyEvents([{ seq: 4, atMs: 4_000, type: "drop-awarded", dropId: 99 }], snapshot);

    const toast = root.querySelector<HTMLElement>(".status-notification-layer .drop-toast");
    expect(toast?.hidden).toBe(false);
    expect(toast?.getAttribute("aria-label")).toBe("Thornquill Blade drop");
    expect(toast?.querySelector(".equipment-icon-img--content")).not.toBeNull();
    expect(toast?.classList.contains("rarity-rare")).toBe(true);
    expect(toast?.classList.contains("interim-drop-toast")).toBe(false);
    expect(badge).toHaveBeenCalledTimes(1);

    snapshot.simNowMs = 4_000 + DROP_TOAST_MS + 1;
    tile.render(snapshot);
    expect(root.querySelector<HTMLElement>(".status-notification-layer .drop-toast")?.hidden).toBe(
      true,
    );
  });

  it("places strike-target effects at the computed strike point", () => {
    const battlefield = document.createElement("section");
    battlefield.className = "battlefield";
    const effectLane = document.createElement("div");
    effectLane.className = "effect-lane";
    const feedbackLayer = document.createElement("div");
    feedbackLayer.className = "feedback-layer";
    const notificationLayer = document.createElement("div");
    notificationLayer.className = "status-notification-layer";
    battlefield.append(effectLane, feedbackLayer);

    const combatant = document.createElement("div");
    combatant.className = "combatant opponent facing-left";
    combatant.dataset["entityId"] = "opp:1:0";
    combatant.style.left = "300px";
    combatant.innerHTML =
      '<div class="combatant-stack"><div class="layer layer-mark"></div><div class="layer layer-body"></div><div class="layer layer-effect"></div></div>';
    battlefield.append(combatant);
    document.body.append(battlefield);

    const presentation = createPresentation({
      battlefield,
      effectLane,
      feedbackLayer,
      notificationLayer,
      content: buildContent(),
    });

    const snapshot = createEngine(buildContent(), undefined, LOOT_SEED).snapshot();
    snapshot.simNowMs = 1_000;
    presentation.applyEvents(
      [
        {
          seq: 1,
          atMs: 900,
          type: "action-started",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          impactAtMs: 1_000,
          targetIds: ["opp:1:0"],
        },
      ],
      snapshot,
    );
    presentation.render(950, snapshot);

    const effect = effectLane.querySelector<HTMLElement>(".effect-frame.strike-target");
    expect(effect?.dataset["strikeX"]).toBe("-15");
    expect(effect?.dataset["strikeY"]).toBe("-26");
    presentation.destroy();
    battlefield.remove();
  });
});

function mountPresentationHarness(): {
  battlefield: HTMLElement;
  effectLane: HTMLElement;
  feedbackLayer: HTMLElement;
  notificationLayer: HTMLElement;
  presentation: ReturnType<typeof createPresentation>;
  addCombatant: (entityId: string, leftPx: string, bottomPx?: string) => HTMLElement;
} {
  const battlefield = document.createElement("section");
  battlefield.className = "battlefield";
  const effectLane = document.createElement("div");
  effectLane.className = "effect-lane";
  const feedbackLayer = document.createElement("div");
  feedbackLayer.className = "feedback-layer";
  const notificationLayer = document.createElement("div");
  notificationLayer.className = "status-notification-layer";
  battlefield.append(effectLane, feedbackLayer);
  document.body.append(battlefield, notificationLayer);

  const addCombatant = (entityId: string, leftPx: string, bottomPx = "6px") => {
    const combatant = document.createElement("div");
    combatant.className = "combatant";
    combatant.dataset["entityId"] = entityId;
    combatant.style.position = "absolute";
    combatant.style.left = leftPx;
    combatant.style.bottom = bottomPx;
    combatant.style.width = "32px";
    combatant.style.height = "40px";
    combatant.innerHTML =
      '<div class="combatant-stack"><div class="layer layer-mark"></div><div class="layer layer-body"></div><div class="layer layer-effect"></div></div>';
    battlefield.append(combatant);
    return combatant;
  };

  const presentation = createPresentation({
    battlefield,
    effectLane,
    feedbackLayer,
    notificationLayer,
    content: buildContent(),
  });

  return { battlefield, effectLane, feedbackLayer, notificationLayer, presentation, addCombatant };
}

describe("batched anchor geometry reads", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("resolves bottomPx to 6 when computed bottom is empty", () => {
    const battlefield = document.createElement("section");
    const combatant = document.createElement("div");
    combatant.dataset["entityId"] = "opp:1:0";
    combatant.style.position = "absolute";
    battlefield.append(combatant);
    document.body.append(battlefield);

    const geometry = readAnchorGeometry(battlefield, new Set(["opp:1:0"]));
    expect(geometry.get("opp:1:0")?.bottomPx).toBe(6);

    battlefield.remove();
  });

  it("skips an effect when its target is absent from the battlefield", () => {
    const { effectLane, presentation, addCombatant } = mountPresentationHarness();
    addCombatant("opp:1:0", "100px");
    const snapshot = createEngine(buildContent(), undefined, LOOT_SEED).snapshot();
    snapshot.simNowMs = 1_000;
    presentation.applyEvents(
      [
        {
          seq: 1,
          atMs: 900,
          type: "action-started",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          impactAtMs: 1_000,
          targetIds: ["opp:missing"],
        },
      ],
      snapshot,
    );
    presentation.render(950, snapshot);
    expect(effectLane.querySelector(".effect-host")).toBeNull();
    presentation.destroy();
  });

  it("places two concurrent strike-target hosts at the same pixels as direct anchor reads", () => {
    const { effectLane, presentation, addCombatant } = mountPresentationHarness();
    const targetA = addCombatant("opp:1:0", "120px", "8px");
    const targetB = addCombatant("opp:1:1", "280px", "10px");
    const expectedA = {
      left: `${targetA.offsetLeft}px`,
      bottom: `${parseInt(getComputedStyle(targetA).bottom || "6", 10)}px`,
    };
    const expectedB = {
      left: `${targetB.offsetLeft}px`,
      bottom: `${parseInt(getComputedStyle(targetB).bottom || "6", 10)}px`,
    };

    const snapshot = createEngine(buildContent(), undefined, LOOT_SEED).snapshot();
    snapshot.simNowMs = 1_000;
    presentation.applyEvents(
      [
        {
          seq: 1,
          atMs: 900,
          type: "action-started",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          impactAtMs: 1_000,
          targetIds: ["opp:1:0"],
        },
        {
          seq: 2,
          atMs: 900,
          type: "action-started",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          impactAtMs: 1_000,
          targetIds: ["opp:1:1"],
        },
      ],
      snapshot,
    );
    presentation.render(950, snapshot);

    const hosts = [...effectLane.querySelectorAll<HTMLElement>(".effect-host")];
    expect(hosts).toHaveLength(2);
    expect(hosts.map((host) => host.style.left).sort()).toEqual([expectedA.left, expectedB.left].sort());
    expect(hosts.map((host) => host.style.bottom).sort()).toEqual(
      [expectedA.bottom, expectedB.bottom].sort(),
    );
    presentation.destroy();
  });

  it("updates effect host position when a combatant moves between renders", () => {
    const { effectLane, presentation, addCombatant } = mountPresentationHarness();
    const target = addCombatant("opp:1:0", "100px");
    let layoutLeft = 100;
    Object.defineProperty(target, "offsetLeft", {
      configurable: true,
      get: () => layoutLeft,
    });
    const snapshot = createEngine(buildContent(), undefined, LOOT_SEED).snapshot();
    snapshot.simNowMs = 1_000;
    presentation.applyEvents(
      [
        {
          seq: 1,
          atMs: 900,
          type: "action-started",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          impactAtMs: 1_000,
          targetIds: ["opp:1:0"],
        },
      ],
      snapshot,
    );
    presentation.render(950, snapshot);
    const firstLeft = effectLane.querySelector<HTMLElement>(".effect-host")?.style.left;

    layoutLeft = 220;
    presentation.render(960, snapshot);
    const secondLeft = effectLane.querySelector<HTMLElement>(".effect-host")?.style.left;
    expect(secondLeft).not.toBe(firstLeft);
    expect(secondLeft).toBe("220px");
    presentation.destroy();
  });

  it("does not consult combatant layout when no effects or floating damage are active", () => {
    const { presentation, addCombatant } = mountPresentationHarness();
    addCombatant("opp:1:0", "50px");
    const snapshot = createEngine(buildContent(), undefined, LOOT_SEED).snapshot();
    snapshot.simNowMs = 500;

    const offsetLeftSpy = vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockReturnValue(0);
    const getComputedStyleSpy = vi.spyOn(window, "getComputedStyle");

    presentation.render(500, snapshot);

    expect(offsetLeftSpy).not.toHaveBeenCalled();
    expect(getComputedStyleSpy).not.toHaveBeenCalled();
    offsetLeftSpy.mockRestore();
    getComputedStyleSpy.mockRestore();
    presentation.destroy();
  });

  it("captures combatant layout before reconciling the effect lane each frame", () => {
    const { effectLane, presentation, addCombatant } = mountPresentationHarness();
    addCombatant("opp:1:0", "140px");
    const snapshot = createEngine(buildContent(), undefined, LOOT_SEED).snapshot();
    snapshot.simNowMs = 1_000;
    presentation.applyEvents(
      [
        {
          seq: 1,
          atMs: 900,
          type: "action-started",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          impactAtMs: 1_000,
          targetIds: ["opp:1:0"],
        },
      ],
      snapshot,
    );

    let readsBeforeEffectAppend = 0;
    const appendSpy = vi.spyOn(effectLane, "append");
    const offsetLeftDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetLeft")!;
    const offsetLeftSpy = vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (appendSpy.mock.calls.length === 0) {
        readsBeforeEffectAppend += 1;
      }
      return offsetLeftDescriptor.get!.call(this);
    });

    presentation.render(950, snapshot);

    expect(readsBeforeEffectAppend).toBeGreaterThan(0);
    if (appendSpy.mock.calls.length > 0) {
      const lastReadOrder = Math.max(...offsetLeftSpy.mock.invocationCallOrder);
      expect(lastReadOrder).toBeLessThan(appendSpy.mock.invocationCallOrder[0]!);
    }
    offsetLeftSpy.mockRestore();
    appendSpy.mockRestore();
    presentation.destroy();
  });
});

describe("keyed DOM reconciliation", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("reuses the same status-icon img when the snapshot is unchanged", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    snapshot.simNowMs = 500;
    tile.render(snapshot);
    tile.applyEvents(
      [
        { seq: 1, atMs: 500, type: "status-applied", entityId: "party:knight:front", statusId: "braced", expiresAtMs: 5_500 },
      ],
      snapshot,
    );
    tile.render(snapshot);
    const firstIcon = root.querySelector<HTMLImageElement>(".status-icon");
    tile.render(snapshot);
    const secondIcon = root.querySelector<HTMLImageElement>(".status-icon");
    expect(firstIcon).toBe(secondIcon);
    tile.destroy();
  });

  it("removes a status icon when the status expires between frames", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    snapshot.simNowMs = 500;
    tile.applyEvents(
      [
        { seq: 1, atMs: 500, type: "status-applied", entityId: "party:knight:front", statusId: "braced", expiresAtMs: 5_500 },
      ],
      snapshot,
    );
    tile.render(snapshot);
    expect(root.querySelector(".status-icon")).not.toBeNull();

    tile.applyEvents(
      [{ seq: 2, atMs: 600, type: "status-expired", entityId: "party:knight:front", statusId: "braced" }],
      snapshot,
    );
    tile.render(snapshot);
    expect(root.querySelector(".status-icon")).toBeNull();
    tile.destroy();
  });

  it("keeps the effect img node across frames and only updates src when the frame URL changes", () => {
    const { effectLane, presentation, addCombatant } = mountPresentationHarness();
    addCombatant("opp:1:0", "100px");
    const snapshot = createEngine(buildContent(), undefined, LOOT_SEED).snapshot();
    snapshot.simNowMs = 1_000;
    presentation.applyEvents(
      [
        {
          seq: 1,
          atMs: 900,
          type: "action-started",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          impactAtMs: 1_000,
          targetIds: ["opp:1:0"],
        },
      ],
      snapshot,
    );
    presentation.render(950, snapshot);
    const firstImg = effectLane.querySelector<HTMLImageElement>(".effect-frame");
    expect(firstImg).not.toBeNull();
    const srcSpy = vi.spyOn(firstImg!, "src", "set");

    presentation.render(955, snapshot);
    const secondImg = effectLane.querySelector<HTMLImageElement>(".effect-frame");
    expect(secondImg).toBe(firstImg);
    expect(srcSpy).not.toHaveBeenCalled();
    srcSpy.mockRestore();
    presentation.destroy();
  });

  it("reuses the same damage-number span across consecutive frames within its lifetime", () => {
    const { presentation, addCombatant } = mountPresentationHarness();
    addCombatant("opp:1:0", "100px");
    const snapshot = createEngine(buildContent(), undefined, LOOT_SEED).snapshot();
    snapshot.simNowMs = 2_000;
    presentation.applyEvents(
      [
        {
          seq: 1,
          atMs: 2_000,
          type: "impact",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          results: [{ targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 3, healthAfter: 10 }],
        },
      ],
      snapshot,
    );
    presentation.render(2_050, snapshot);
    const first = document.body.querySelector<HTMLElement>(".damage-number");
    presentation.render(2_100, snapshot);
    const second = document.body.querySelector<HTMLElement>(".damage-number");
    expect(first).toBe(second);
    presentation.destroy();
  });

  it("removes damage numbers after their lifetime and does not accumulate orphans", () => {
    const { presentation, addCombatant } = mountPresentationHarness();
    addCombatant("opp:1:0", "100px");
    const snapshot = createEngine(buildContent(), undefined, LOOT_SEED).snapshot();
    for (let i = 0; i < 30; i += 1) {
      const atMs = 1_000 + i * 1_000;
      presentation.applyEvents(
        [
          {
            seq: i + 1,
            atMs,
            type: "impact",
            entityId: "party:knight:front",
            abilityId: "steel-cut",
            results: [{ targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 1, healthAfter: 10 }],
          },
        ],
        snapshot,
      );
      presentation.render(atMs + 50, snapshot);
      presentation.render(atMs + 950, snapshot);
    }
    expect(document.body.querySelectorAll(".damage-number")).toHaveLength(0);
    presentation.destroy();
  });

  it("creates no new status icons, effect frames, or damage spans after the first steady frame", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    let snapshot = engine.snapshot();
    snapshot.simNowMs = 1_050;
    tile.applyEvents(
      [
        { seq: 1, atMs: 1_000, type: "status-applied", entityId: "party:knight:front", statusId: "braced", expiresAtMs: 9_000 },
        {
          seq: 2,
          atMs: 900,
          type: "action-started",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          impactAtMs: 1_000,
          targetIds: ["opp:1:0"],
        },
        {
          seq: 3,
          atMs: 1_000,
          type: "impact",
          entityId: "party:knight:front",
          abilityId: "steel-cut",
          results: [
            {
              targetId: "opp:1:0",
              kind: "damage",
              channel: "physical",
              amount: 2,
              healthAfter: 8,
            },
          ],
        },
      ],
      snapshot,
    );
    tile.render(snapshot);

    const createElementSpy = vi.spyOn(document, "createElement");
    for (let frame = 0; frame < 60; frame += 1) {
      snapshot = { ...snapshot, simNowMs: 1_050 + frame * 16 };
      tile.render(snapshot);
    }
    const createdTags = createElementSpy.mock.calls.map(([tag]) => tag);
    expect(createdTags.filter((tag) => tag === "img" || tag === "span")).toHaveLength(0);
    createElementSpy.mockRestore();
    tile.destroy();
  });
});

describe("simulation boundary", () => {
  it("does not place asset names in src/core", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const coreDir = join(dirname(fileURLToPath(import.meta.url)), "../core");
    const files = readdirSync(coreDir).filter((file) => file.endsWith(".ts"));
    const joined = files.map((file) => readFileSync(join(coreDir, file), "utf8")).join("\n");
    expect(joined).not.toMatch(/arc-slash|moonberry-glow|actor-pool/);
  });
});
