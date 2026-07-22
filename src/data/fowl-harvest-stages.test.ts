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

  it("Stage 4 is three Burger Drakes, four Burger Drakes, then solo The Fryer", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");
    const stage = fowlHarvestStages.find((entry) => entry.id === 4);
    if (!stage) {
      throw new Error("missing Stage 4");
    }

    expect(stage.waves[0].opponents).toEqual([
      "burger-drake-s4-27a",
      "burger-drake-s4-27b",
      "burger-drake-s4-26",
    ]);
    expect(stage.waves[1].opponents).toEqual([
      "burger-drake-s4-20",
      "burger-drake-s4-20",
      "burger-drake-s4-20",
      "burger-drake-s4-20",
    ]);
    expect(stage.boss.opponents).toEqual(["the-fryer"]);
  });

  it("Stage 5 is three Cornquackers, five Cornquackers, then solo Scarequack", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");
    const stage = fowlHarvestStages.find((entry) => entry.id === 5);
    if (!stage) {
      throw new Error("missing Stage 5");
    }

    expect(stage.waves[0].opponents).toEqual([
      "cornquacker-s5-34",
      "cornquacker-s5-33a",
      "cornquacker-s5-33b",
    ]);
    expect(stage.waves[1].opponents).toEqual([
      "cornquacker-s5-20",
      "cornquacker-s5-20",
      "cornquacker-s5-20",
      "cornquacker-s5-20",
      "cornquacker-s5-20",
    ]);
    expect(stage.boss.opponents).toEqual(["scarequack"]);
  });

  it("Stage 6 is mixed Burger and Corn waves then solo The Combine", async () => {
    const { fowlHarvestStages } = await import("./fowl-harvest-stages");
    const stage = fowlHarvestStages.find((entry) => entry.id === 6);
    if (!stage) {
      throw new Error("missing Stage 6");
    }

    expect(stage.waves[0].opponents).toEqual([
      "burger-drake-s6-33",
      "burger-drake-s6-32",
      "cornquacker-s6-33",
      "cornquacker-s6-32",
    ]);
    expect(stage.waves[1].opponents).toEqual([
      "burger-drake-s6-26",
      "burger-drake-s6-26",
      "cornquacker-s6-26",
      "cornquacker-s6-26",
      "cornquacker-s6-26",
    ]);
    expect(stage.boss.opponents).toEqual(["the-combine"]);
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

    expect(content.stages).toHaveLength(6);
    expect(content.stages.slice(3)).toEqual(fowlHarvestStages);
    expect(content.stages.map((stage) => stage.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
