import { describe, expect, it } from "vitest";
import { buildContent } from "./index";
import { unwoundBelfryStages } from "./unwound-belfry-stages";

describe("Unwound Belfry Stages 7–10", () => {
  it("exports four Stages with approved names, backdrop keys, and rarity odds", async () => {
    const { unwoundBelfryStages } = await import("./unwound-belfry-stages");

    expect(unwoundBelfryStages).toHaveLength(4);
    expect(unwoundBelfryStages.map((stage) => stage.id)).toEqual([7, 8, 9, 10]);
    expect(unwoundBelfryStages.map((stage) => stage.name)).toEqual([
      "Stopped-Clock Court",
      "Carillon Hall",
      "The Mainspring",
      "The Oculus",
    ]);
    expect(unwoundBelfryStages.map((stage) => stage.backdropKey)).toEqual([
      "stopped-clock-court",
      "carillon-hall",
      "the-mainspring",
      "the-oculus",
    ]);
    expect(unwoundBelfryStages.map((stage) => stage.rarityOdds)).toEqual([
      [6, 28, 40, 26],
      [4, 24, 42, 30],
      [3, 20, 42, 35],
      [2, 16, 42, 40],
    ]);
  });

  it("Stage 7 is mixed Tollbat and Tickmoth waves then solo The Vigil", async () => {
    const { unwoundBelfryStages } = await import("./unwound-belfry-stages");
    const stage = unwoundBelfryStages.find((entry) => entry.id === 7);
    if (!stage) {
      throw new Error("missing Stage 7");
    }

    expect(stage.waves[0]!.opponents).toEqual([
      "tollbat-s7-44a",
      "tollbat-s7-44b",
      "tickmoth-s7-36a",
      "tickmoth-s7-36b",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "tickmoth-s7-40",
      "tickmoth-s7-40",
      "tickmoth-s7-40",
      "tickmoth-s7-40",
    ]);
    expect(stage.boss.opponents).toEqual(["the-vigil"]);
  });

  it("Stage 8 is Astrolabe Spider and Tollbat waves then solo The Tocsin", async () => {
    const { unwoundBelfryStages } = await import("./unwound-belfry-stages");
    const stage = unwoundBelfryStages.find((entry) => entry.id === 8);
    if (!stage) {
      throw new Error("missing Stage 8");
    }

    expect(stage.waves[0]!.opponents).toEqual([
      "astrolabe-spider-s8-48a",
      "astrolabe-spider-s8-48b",
      "tollbat-s8-47a",
      "tollbat-s8-47b",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "tickmoth-s8-38",
      "tickmoth-s8-38",
      "tickmoth-s8-38",
      "tickmoth-s8-38",
      "tickmoth-s8-38",
    ]);
    expect(stage.boss.opponents).toEqual(["the-tocsin"]);
  });

  it("Stage 9 is mixed Belfry waves then solo The Unwound", async () => {
    const { unwoundBelfryStages } = await import("./unwound-belfry-stages");
    const stage = unwoundBelfryStages.find((entry) => entry.id === 9);
    if (!stage) {
      throw new Error("missing Stage 9");
    }

    expect(stage.waves[0]!.opponents).toEqual([
      "astrolabe-spider-s9-70a",
      "astrolabe-spider-s9-70b",
      "tollbat-s9-60",
      "tickmoth-s9-60",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "tickmoth-s9-52",
      "tickmoth-s9-52",
      "tickmoth-s9-52",
      "tickmoth-s9-52",
      "tickmoth-s9-52",
    ]);
    expect(stage.boss.opponents).toEqual(["the-unwound"]);
  });

  it("Stage 10 is boss-only with solo Aphelion and no ordinary waves", async () => {
    const { unwoundBelfryStages } = await import("./unwound-belfry-stages");
    const stage = unwoundBelfryStages.find((entry) => entry.id === 10);
    if (!stage) {
      throw new Error("missing Stage 10");
    }

    expect(stage.waves).toEqual([]);
    expect(stage.boss.opponents).toEqual(["aphelion"]);
  });

  it("gives every Boss a solo encounter and rarity odds that sum to 100", async () => {
    const { unwoundBelfryStages } = await import("./unwound-belfry-stages");

    for (const stage of unwoundBelfryStages) {
      expect(stage.boss.opponents).toHaveLength(1);
      const oddsSum = stage.rarityOdds.reduce((total, weight) => total + weight, 0);
      expect(oddsSum).toBe(100);
    }
  });

  it("is wired into shipped Content as Stages 7–10", () => {
    const content = buildContent();

    expect(content.stages).toHaveLength(10);
    expect(content.stages.slice(6)).toEqual(unwoundBelfryStages);
    expect(content.stages.map((stage) => stage.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
