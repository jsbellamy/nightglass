// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import type { Snapshot } from "../core/snapshot";
import { fixtureContent } from "../core/testing/fixture-content";
import { buildContent } from "../data";
import {
  BATTLEFIELD_HEIGHT,
  STATUS_LINE_HEIGHT,
  TILE_HEIGHT,
  TILE_WIDTH,
  mountBattleTile,
} from "./battle-tile";

const LOOT_SEED = 42;

function snapshotWithFiveOpponents(base: Snapshot): Snapshot {
  const attempt = base.attempt;
  if (!attempt) {
    throw new Error("fixture snapshot must include an Attempt");
  }
  const grunt = fixtureContent.opponents.find((opponent) => opponent.id === "fixture-grunt");
  if (!grunt) {
    throw new Error("missing fixture grunt");
  }
  const opponents = Array.from({ length: 5 }, (_, index) => ({
    entityId: `opp:${attempt.encounter}:${index}`,
    side: "opponent" as const,
    defId: grunt.id,
    health: grunt.base.maxHealth,
    maxHealth: grunt.base.maxHealth,
    knockedOut: false,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
  }));
  return {
    ...structuredClone(base),
    attempt: {
      ...attempt,
      combatants: [...attempt.combatants.filter((entry) => entry.side === "party"), ...opponents],
    },
  };
}

describe("Battle Tile renderer", () => {
  it("mounts a 480×112 tile with a 24px status line and ~86px battlefield", () => {
    const root = document.createElement("main");
    mountBattleTile(root, buildContent());

    expect(root.classList.contains("battle-tile")).toBe(true);
    expect(TILE_WIDTH).toBe(480);
    expect(TILE_HEIGHT).toBe(112);
    expect(STATUS_LINE_HEIGHT).toBe(24);
    expect(BATTLEFIELD_HEIGHT).toBe(86);
    expect(root.querySelector(".status-line")).not.toBeNull();
    expect(root.querySelector(".battlefield")).not.toBeNull();
  });

  it("renders Party formation slots facing right and opponents facing left", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    tile.render(engine.snapshot());

    const party = [...root.querySelectorAll<HTMLElement>(".combatant.party")];
    expect(party.map((element) => element.classList.contains("facing-right"))).toEqual([
      true,
      true,
      true,
    ]);
    expect(party.some((element) => element.classList.contains("formation-front"))).toBe(true);
    expect(party.some((element) => element.classList.contains("formation-middle"))).toBe(true);
    expect(party.some((element) => element.classList.contains("formation-back"))).toBe(true);

    const opponents = [...root.querySelectorAll<HTMLElement>(".combatant.opponent")];
    expect(opponents.every((element) => element.classList.contains("facing-left"))).toBe(true);
  });

  it("fits five ordinary opponents at 1× without overlap classes", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    tile.render(snapshotWithFiveOpponents(engine.snapshot()));

    expect(root.querySelector(".battlefield")?.classList.contains("opponent-stress-layout")).toBe(
      true,
    );
    const slots = [...root.querySelectorAll<HTMLElement>(".combatant.opponent")].map((element) =>
      [...element.classList].find((className) => className.startsWith("opponent-slot-")),
    );
    expect(slots).toEqual([
      "opponent-slot-0",
      "opponent-slot-1",
      "opponent-slot-2",
      "opponent-slot-3",
      "opponent-slot-4",
    ]);
  });

  it("uses pixelated sprites and exposes mark/body/effect layers with only body populated", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    tile.render(engine.snapshot());

    const stack = root.querySelector(".combatant-stack");
    expect(stack?.querySelector(".layer-mark")).not.toBeNull();
    expect(stack?.querySelector(".layer-body .combatant-sprite")).not.toBeNull();
    expect(stack?.querySelector(".layer-effect")).not.toBeNull();
    expect(stack?.querySelector(".layer-mark")?.childElementCount).toBe(0);
    expect(stack?.querySelector(".layer-effect")?.childElementCount).toBe(0);

    const sprite = root.querySelector<HTMLImageElement>(".combatant-sprite");
    expect(sprite?.style.imageRendering).toBe("pixelated");
  });

  it("updates health bar width after an impact event", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const opponent = snapshot.attempt?.combatants.find((combatant) => combatant.side === "opponent");
    if (!opponent) {
      throw new Error("expected opponent combatant");
    }
    tile.render(snapshot);

    const impact = {
      seq: 99,
      atMs: 1_000,
      type: "impact" as const,
      entityId: "party:knight:front",
      abilityId: "knight-basic",
      results: [
        {
          targetId: opponent.entityId,
          kind: "damage" as const,
          channel: "physical" as const,
          amount: 8,
          healthAfter: opponent.health - 8,
        },
      ],
    };
    opponent.health = impact.results[0]!.healthAfter;
    tile.applyEvents([impact]);
    tile.render(snapshot);

    const fill = root.querySelector<HTMLElement>(
      `[data-entity-id="${opponent.entityId}"] .health-fill`,
    );
    const expectedPercent = Math.round((opponent.health / opponent.maxHealth) * 100);
    expect(fill?.dataset["healthPercent"]).toBe(String(expectedPercent));
    expect(Number(fill?.dataset["healthPercent"])).toBeLessThan(100);
  });

  it("shows the Boss wide top-edge health bar and hides the per-combatant bar", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = structuredClone(engine.snapshot());
    const attempt = snapshot.attempt;
    if (!attempt) {
      throw new Error("missing attempt");
    }
    attempt.encounter = 3;
    attempt.combatants = [
      ...attempt.combatants.filter((entry) => entry.side === "party"),
      {
        entityId: "opp:3:0",
        side: "opponent",
        defId: "fixture-boss",
        health: 180,
        maxHealth: 200,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];
    tile.render(snapshot);

    const bossBar = root.querySelector<HTMLElement>(".boss-health-bar");
    expect(bossBar?.hidden).toBe(false);
    expect(root.querySelector(".boss-combatant .health-bar")).toBeNull();
    expect(root.querySelector<HTMLElement>(".boss-health-fill")?.dataset["healthPercent"]).toBe(
      "90",
    );
  });

  it("shows the current Stage and Wave on the status line", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    tile.render(engine.snapshot());

    const text = root.querySelector(".stage-wave-text")?.textContent ?? "";
    expect(text).toContain("Orchard Understory");
    expect(text).toContain("Wave 1");
  });

  it("keys the battlefield backdrop image per Stage and keeps audio mute controls", () => {
    const root = document.createElement("main");
    const content = buildContent();
    const tile = mountBattleTile(root, content);
    const engine = createEngine(content, undefined, LOOT_SEED);
    tile.render(engine.snapshot());

    const battlefield = root.querySelector<HTMLElement>(".battlefield");
    const backdrop = root.querySelector<HTMLElement>(".battlefield-backdrop");
    expect(battlefield?.dataset["backdropKey"]).toBe("backdrop-1");
    expect(backdrop?.style.backgroundImage).toMatch(/backdrop-1/);
    expect(backdrop?.style.backgroundImage).not.toMatch(/linear-gradient/);
    expect(root.querySelector(".audio-mute-toggle")).not.toBeNull();
    expect(root.querySelector(".audio-volume-toggle")).not.toBeNull();

    const stage2 = structuredClone(engine.snapshot());
    if (!stage2.attempt) {
      throw new Error("missing attempt");
    }
    stage2.attempt.stage = 2;
    tile.render(stage2);
    expect(battlefield?.dataset["backdropKey"]).toBe("backdrop-2");
    expect(backdrop?.style.backgroundImage).toMatch(/backdrop-2/);

    stage2.attempt.stage = 3;
    tile.render(stage2);
    expect(battlefield?.dataset["backdropKey"]).toBe("backdrop-3");
    expect(backdrop?.style.backgroundImage).toMatch(/backdrop-3/);
  });
});
