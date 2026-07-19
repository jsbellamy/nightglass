import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import type { EngineEvent } from "../core/events";
import { levelFromXp } from "../core/xp";
import { validateContent } from "../core/validate-content";
import type { AbilityDef } from "../core/types";
import { buildContent } from "./index";
import { opponentAbilities } from "./opponents";

const LOOT_SEED = 42;
const TEN_MINUTES_MS = 10 * 60 * 1000;

const content = buildContent();

function abilityById(id: string): AbilityDef {
  const ability = content.abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing ability ${id}`);
  }
  return ability;
}

function advanceUntil(
  engine: ReturnType<typeof createEngine>,
  predicate: (events: EngineEvent[]) => boolean,
  maxMs: number,
  stepMs = 1,
): EngineEvent[] {
  const events: EngineEvent[] = [];
  for (let ms = 0; ms < maxMs; ms += stepMs) {
    events.push(...engine.advanceBy(stepMs));
    if (predicate(events)) {
      return events;
    }
  }
  throw new Error(`condition not met within ${maxMs}ms`);
}

describe("assembled Stage content", () => {
  it("passes validateContent with exact encounter XP budgets", () => {
    expect(validateContent(content)).toEqual([]);
  });

  it("defines three Moonberry Stages with pinned backdrop keys and rarity odds", () => {
    expect(content.stages).toHaveLength(3);
    expect(content.stages.map((stage) => stage.name)).toEqual([
      "Orchard Understory",
      "Moonlit Bramble",
      "Nightbloom Terrace",
    ]);
    expect(content.stages.map((stage) => stage.backdropKey)).toEqual([
      "backdrop-1",
      "backdrop-2",
      "backdrop-3",
    ]);
    expect(content.stages.map((stage) => stage.rarityOdds)).toEqual([
      [55, 35, 9, 1],
      [40, 40, 17, 3],
      [25, 45, 24, 6],
    ]);
  });

  it("reuses one Pipcap family for ordinary Waves and three distinct Bosses", () => {
    const ordinary = content.opponents.filter((opponent) => !opponent.boss);
    const bosses = content.opponents.filter((opponent) => opponent.boss);

    expect(ordinary.length).toBeGreaterThan(0);
    expect(new Set(ordinary.map((opponent) => opponent.family))).toEqual(new Set(["pipcap"]));
    expect(new Set(ordinary.map((opponent) => opponent.spriteKey))).toEqual(new Set(["pipcap"]));

    expect(bosses).toHaveLength(3);
    expect(bosses.map((boss) => boss.id)).toEqual(["boss-1", "boss-2", "boss-3"]);
    expect(bosses.map((boss) => boss.spriteKey)).toEqual(["boss-1", "boss-2", "boss-3"]);
    expect(bosses.every((boss) => boss.boss)).toBe(true);
  });

  it("gives every Boss a telegraphed sweep with Wind-up at least 1200ms", () => {
    const sweepIds = ["boss-1-sweep", "boss-2-sweep", "boss-3-sweep"];
    for (const id of sweepIds) {
      const sweep = abilityById(id);
      expect(sweep.targeting).toEqual({ kind: "all-opponents" });
      expect(sweep.windUpMs).toBeGreaterThanOrEqual(1200);
      expect(sweep.cooldownMs).toBeGreaterThan(0);
    }
    expect(opponentAbilities.filter((ability) => ability.id.endsWith("-sweep"))).toHaveLength(3);
  });

  it("clears Stage 1 and reaches Level 2 within ten simulated minutes", () => {
    const engine = createEngine(content, undefined, LOOT_SEED);
    engine.advanceBy(1);

    const events = advanceUntil(
      engine,
      (batch) => batch.some((event) => event.type === "stage-cleared" && event.stage === 1),
      TEN_MINUTES_MS,
    );

    expect(engine.snapshot().simNowMs).toBeLessThanOrEqual(TEN_MINUTES_MS);
    expect(events.some((event) => event.type === "stage-cleared" && event.stage === 1)).toBe(
      true,
    );

    const snap = engine.snapshot();
    expect(snap.progression.party).toEqual(["knight", "wizard", "priest"]);
    expect(snap.progression.reserve).toBe("hunter");
    expect(snap.progression.characterXp.knight).toBeGreaterThanOrEqual(100);
    expect(
      levelFromXp(snap.progression.characterXp.knight, content.xpThresholds),
    ).toBeGreaterThanOrEqual(2);
    expect(events.some((event) => event.type === "level-up" && event.classId === "knight")).toBe(
      true,
    );
  });

  it("allows Party Defeat at Stage 3 with the default untalented Party", () => {
    const boot = createEngine(content, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.unlockedStage = 3;

    const engine = createEngine(content, saved, LOOT_SEED);
    engine.selectStage(3);

    const events = advanceUntil(
      engine,
      (batch) => batch.some((event) => event.type === "party-defeat"),
      TEN_MINUTES_MS,
    );

    expect(events.some((event) => event.type === "party-defeat" && event.stage === 3)).toBe(
      true,
    );
  });
});
