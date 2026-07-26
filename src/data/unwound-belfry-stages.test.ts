import { describe, expect, it } from "vitest";
import { validateContent, ENCOUNTER_BUDGETS } from "../core/validate-content";
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

  it("Stage 7 draws from the four-family pool across four Waves, then solo The Vigil", async () => {
    const { unwoundBelfryStages } = await import("./unwound-belfry-stages");
    const stage = unwoundBelfryStages.find((entry) => entry.id === 7);
    if (!stage) {
      throw new Error("missing Stage 7");
    }

    expect(stage.waves).toHaveLength(4);
    expect(stage.waves[0]!.opponents).toEqual([
      "tollbat-s7-44a",
      "tickmoth-s7-20",
      "sundial-gargoyle-s7-16",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "tickmoth-s7-36a",
      "pendulum-rat-s7-24",
      "sundial-gargoyle-s7-20",
    ]);
    expect(stage.waves[2]!.opponents).toEqual([
      "tollbat-s7-20",
      "tickmoth-s7-40",
      "pendulum-rat-s7-20",
    ]);
    expect(stage.waves[3]!.opponents).toEqual([
      "tickmoth-s7-20",
      "tickmoth-s7-20",
      "pendulum-rat-s7-20",
      "sundial-gargoyle-s7-20",
    ]);
    expect(stage.boss.opponents).toEqual(["the-vigil"]);
  });

  it("Stage 8 draws from the five-family pool across four Waves, then solo The Tocsin", async () => {
    const { unwoundBelfryStages } = await import("./unwound-belfry-stages");
    const stage = unwoundBelfryStages.find((entry) => entry.id === 8);
    if (!stage) {
      throw new Error("missing Stage 8");
    }

    expect(stage.waves).toHaveLength(4);
    expect(stage.waves[0]!.opponents).toEqual([
      "astrolabe-spider-s8-48a",
      "tollbat-s8-24",
      "sundial-gargoyle-s8-23",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "pendulum-rat-s8-38",
      "astrolabe-spider-s8-38",
      "tollbat-s8-19",
    ]);
    expect(stage.waves[2]!.opponents).toEqual([
      "tickmoth-s8-38",
      "astrolabe-spider-s8-38",
      "pendulum-rat-s8-19",
    ]);
    expect(stage.waves[3]!.opponents).toEqual([
      "tickmoth-s8-19",
      "astrolabe-spider-s8-19",
      "pendulum-rat-s8-19",
      "sundial-gargoyle-s8-19",
      "tollbat-s8-19",
    ]);
    expect(stage.boss.opponents).toEqual(["the-tocsin"]);
  });

  it("Stage 9 draws from the five-family pool across four Waves, then solo The Unwound", async () => {
    const { unwoundBelfryStages } = await import("./unwound-belfry-stages");
    const stage = unwoundBelfryStages.find((entry) => entry.id === 9);
    if (!stage) {
      throw new Error("missing Stage 9");
    }

    expect(stage.waves).toHaveLength(4);
    expect(stage.waves[0]!.opponents).toEqual([
      "astrolabe-spider-s9-70a",
      "tollbat-s9-30",
      "sundial-gargoyle-s9-30",
    ]);
    expect(stage.waves[1]!.opponents).toEqual([
      "pendulum-rat-s9-70",
      "tickmoth-s9-30",
      "sundial-gargoyle-s9-30",
    ]);
    expect(stage.waves[2]!.opponents).toEqual([
      "tickmoth-s9-52",
      "astrolabe-spider-s9-52",
      "pendulum-rat-s9-26",
    ]);
    expect(stage.waves[3]!.opponents).toEqual([
      "tickmoth-s9-26",
      "sundial-gargoyle-s9-26",
      "pendulum-rat-s9-26",
      "astrolabe-spider-s9-26",
      "tollbat-s9-26",
    ]);
    expect(stage.boss.opponents).toEqual(["the-unwound"]);
  });

  it("authors four ordinary Waves per Stage 7–9 with 3–5 Opponents each and exact budgets", () => {
    const content = buildContent();
    const opponentById = new Map(content.opponents.map((opponent) => [opponent.id, opponent]));

    for (const stage of unwoundBelfryStages.filter((entry) => entry.id >= 7 && entry.id <= 9)) {
      const budget = ENCOUNTER_BUDGETS[stage.id as 7 | 8 | 9];
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

  it("keeps Stages 7–9 ordinary Waves at least three families with no majority slot share", () => {
    const content = buildContent();
    const opponentFamilyById = new Map(
      content.opponents.map((opponent) => [opponent.id, opponent.family]),
    );

    for (const stage of unwoundBelfryStages.filter((entry) => entry.id >= 7 && entry.id <= 9)) {
      for (const wave of stage.waves) {
        const familyCounts = new Map<string, number>();
        for (const opponentId of wave.opponents) {
          const family = opponentFamilyById.get(opponentId);
          if (!family) {
            throw new Error(`missing opponent family for ${opponentId}`);
          }
          familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
        }

        expect(familyCounts.size).toBeGreaterThanOrEqual(3);

        const slotCount = wave.opponents.length;
        const maxFamilySlots = Math.max(...familyCounts.values());
        expect(maxFamilySlots).toBeLessThanOrEqual(slotCount / 2);
      }
    }
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

  it("passes validateContent for shipped Unwound Belfry Stages 7–10", () => {
    expect(validateContent(buildContent())).toEqual([]);
  });

  it("is wired into shipped Content as Stages 7–10", () => {
    const content = buildContent();

    expect(content.stages).toHaveLength(10);
    expect(content.stages.slice(6)).toEqual(unwoundBelfryStages);
    expect(content.stages.map((stage) => stage.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
