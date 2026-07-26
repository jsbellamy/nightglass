import { describe, expect, it } from "vitest";
import { validateContent, ENCOUNTER_BUDGETS } from "../core/validate-content";
import { buildContent } from "./index";
import { fowlHarvestStages } from "./fowl-harvest-stages";

describe("Fowl Harvest Stages 4–6", () => {
  it("exports three Stages with approved names, backdrop keys, and rarity odds", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");

    expect(fowlHarvestStages).toHaveLength(3);
    expect(fowlHarvestStages.map((stage) => stage.id)).toEqual([4, 5, 6]);
    expect(fowlHarvestStages.map((stage) => stage.name)).toEqual([
      "Last Stop Diner",
      "Crooked Cornfield",
      "Harvest Yard",
    ]);
    expect(fowlHarvestStages.map((stage) => stage.backdropKey)).toEqual([
      "last-stop-diner",
      "crooked-cornfield",
      "harvest-yard",
    ]);
    expect(fowlHarvestStages.map((stage) => stage.rarityOdds)).toEqual([
      [18, 42, 30, 10],
      [12, 38, 34, 16],
      [8, 32, 38, 22],
    ]);
  });

  it("Stage 4 draws from the five-family pool across four Waves, then solo The Fryer", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");
    const stage = fowlHarvestStages.find((entry) => entry.id === 4);
    if (!stage) {
      throw new Error("missing Stage 4");
    }

    expect(stage.waves).toHaveLength(4);
    expect(stage.waves[0]!.opponents).toEqual([
      "burger-drake-s4-14",
      "milkshake-mallard-s4-13",
      "balewaddle-s4-13",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "burger-drake-s4-20",
      "pie-widgeon-s4-10",
      "milkshake-mallard-s4-10",
    ]);
    expect(stage.waves[2]!.opponents).toEqual([
      "burger-drake-s4-13a",
      "milkshake-mallard-s4-13",
      "balewaddle-s4-14",
    ]);
    expect(stage.waves[3]!.opponents).toEqual([
      "burger-drake-s4-10",
      "milkshake-mallard-s4-10",
      "balewaddle-s4-10",
      "pie-widgeon-s4-10",
    ]);
    expect(stage.boss.opponents).toEqual(["the-fryer"]);
  });

  it("Stage 5 draws from the five-family pool across four Waves, then solo Scarequack", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");
    const stage = fowlHarvestStages.find((entry) => entry.id === 5);
    if (!stage) {
      throw new Error("missing Stage 5");
    }

    expect(stage.waves).toHaveLength(4);
    expect(stage.waves[0]!.opponents).toEqual([
      "cornquacker-s5-17",
      "balewaddle-s5-17",
      "pie-widgeon-s5-16",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "cornquacker-s5-13",
      "milkshake-mallard-s5-13",
      "balewaddle-s5-13",
      "pie-widgeon-s5-11",
    ]);
    expect(stage.waves[2]!.opponents).toEqual([
      "cornquacker-s5-14a",
      "cornquacker-s5-14b",
      "balewaddle-s5-11",
      "milkshake-mallard-s5-11",
    ]);
    expect(stage.waves[3]!.opponents).toEqual([
      "cornquacker-s5-10",
      "milkshake-mallard-s5-10",
      "balewaddle-s5-10",
      "pie-widgeon-s5-10a",
      "pie-widgeon-s5-10b",
    ]);
    expect(stage.boss.opponents).toEqual(["scarequack"]);
  });

  it("Stage 6 draws from the five-family pool across four Waves, then solo The Combine", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");
    const stage = fowlHarvestStages.find((entry) => entry.id === 6);
    if (!stage) {
      throw new Error("missing Stage 6");
    }

    expect(stage.waves).toHaveLength(4);
    expect(stage.waves[0]!.opponents).toEqual([
      "burger-drake-s6-22",
      "cornquacker-s6-22",
      "milkshake-mallard-s6-21",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "balewaddle-s6-22",
      "pie-widgeon-s6-22",
      "cornquacker-s6-21",
    ]);
    expect(stage.waves[2]!.opponents).toEqual([
      "burger-drake-s6-13",
      "cornquacker-s6-13",
      "milkshake-mallard-s6-13",
      "balewaddle-s6-13",
      "pie-widgeon-s6-13",
    ]);
    expect(stage.waves[3]!.opponents).toEqual([
      "burger-drake-s6-26",
      "pie-widgeon-s6-26",
      "balewaddle-s6-13",
    ]);
    expect(stage.boss.opponents).toEqual(["the-combine"]);
  });

  it("authors four ordinary Waves per Stage 4–6 with 3–5 Opponents each and exact budgets", () => {
    const content = buildContent();
    const opponentById = new Map(content.opponents.map((opponent) => [opponent.id, opponent]));

    for (const stage of fowlHarvestStages) {
      const budget = ENCOUNTER_BUDGETS[stage.id as 4 | 5 | 6];
      expect(stage.waves).toHaveLength(4);
      for (const [waveIndex, wave] of stage.waves.entries()) {
        expect(wave.opponents.length).toBeGreaterThanOrEqual(3);
        expect(wave.opponents.length).toBeLessThanOrEqual(5);
        const waveXp = wave.opponents.reduce((sum, opponentId) => {
          const opponent = opponentById.get(opponentId);
          if (!opponent) {
            throw new Error(`missing opponent ${opponentId}`);
          }
          return sum + opponent.xpAward;
        }, 0);
        expect(waveXp).toBe(budget.waves[waveIndex]);
        for (const opponentId of wave.opponents) {
          expect(opponentById.get(opponentId)?.boss).toBe(false);
        }
      }
    }
  });

  it("Stages 4–6 ordinary waves use at least three families with no family exceeding half the slots", () => {
    const content = buildContent();
    const opponentById = new Map(content.opponents.map((opponent) => [opponent.id, opponent]));

    for (const stage of fowlHarvestStages) {
      for (const wave of stage.waves) {
        const familyCounts = new Map<string, number>();
        for (const opponentId of wave.opponents) {
          const opponent = opponentById.get(opponentId);
          if (!opponent) {
            throw new Error(`missing opponent ${opponentId}`);
          }
          familyCounts.set(opponent.family, (familyCounts.get(opponent.family) ?? 0) + 1);
        }
        expect(familyCounts.size).toBeGreaterThanOrEqual(3);
        const maxFamilySlots = Math.max(...familyCounts.values());
        expect(maxFamilySlots).toBeLessThanOrEqual(wave.opponents.length / 2);
      }
    }
  });

  it("gives every Boss a solo encounter and rarity odds that sum to 100", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");

    for (const stage of fowlHarvestStages) {
      expect(stage.boss.opponents).toHaveLength(1);
      const oddsSum = stage.rarityOdds.reduce((total, weight) => total + weight, 0);
      expect(oddsSum).toBe(100);
    }
  });

  it("passes validateContent for shipped Fowl Harvest Stages 4–6", () => {
    expect(validateContent(buildContent())).toEqual([]);
  });

  it("is wired into shipped Content as Stages 4–6", () => {
    const content = buildContent();

    expect(content.stages).toHaveLength(10);
    expect(content.stages.slice(3, 6)).toEqual(fowlHarvestStages);
    expect(content.stages.map((stage) => stage.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
