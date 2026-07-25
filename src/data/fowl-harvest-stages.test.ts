import { describe, expect, it } from "vitest";
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

  it("Stage 4 draws from the five-family pool, then solo The Fryer", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");
    const stage = fowlHarvestStages.find((entry) => entry.id === 4);
    if (!stage) {
      throw new Error("missing Stage 4");
    }

    expect(stage.waves[0]!.opponents).toEqual([
      "burger-drake-s4-27a",
      "milkshake-mallard-s4-27",
      "balewaddle-s4-26",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "burger-drake-s4-20",
      "burger-drake-s4-20",
      "pie-widgeon-s4-20",
      "milkshake-mallard-s4-20",
    ]);
    expect(stage.boss.opponents).toEqual(["the-fryer"]);
  });

  it("Stage 5 draws from the five-family pool, then solo Scarequack", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");
    const stage = fowlHarvestStages.find((entry) => entry.id === 5);
    if (!stage) {
      throw new Error("missing Stage 5");
    }

    expect(stage.waves[0]!.opponents).toEqual([
      "cornquacker-s5-34",
      "balewaddle-s5-33",
      "pie-widgeon-s5-33",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "cornquacker-s5-20",
      "cornquacker-s5-20",
      "milkshake-mallard-s5-20",
      "balewaddle-s5-20",
      "pie-widgeon-s5-20",
    ]);
    expect(stage.boss.opponents).toEqual(["scarequack"]);
  });

  it("Stage 6 draws from the five-family pool, then solo The Combine", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");
    const stage = fowlHarvestStages.find((entry) => entry.id === 6);
    if (!stage) {
      throw new Error("missing Stage 6");
    }

    expect(stage.waves[0]!.opponents).toEqual([
      "burger-drake-s6-33",
      "cornquacker-s6-33",
      "milkshake-mallard-s6-32",
      "balewaddle-s6-32",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "pie-widgeon-s6-26",
      "pie-widgeon-s6-26",
      "cornquacker-s6-26",
      "burger-drake-s6-26",
      "balewaddle-s6-26",
    ]);
    expect(stage.boss.opponents).toEqual(["the-combine"]);
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

  it("is wired into shipped Content as Stages 4–6", () => {
    const content = buildContent();

    expect(content.stages).toHaveLength(10);
    expect(content.stages.slice(3, 6)).toEqual(fowlHarvestStages);
    expect(content.stages.map((stage) => stage.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
