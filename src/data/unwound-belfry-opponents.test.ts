import { describe, expect, it } from "vitest";
import type { AbilityDef, OpponentDef } from "../core/types";
import { opponentAbilityCandidates } from "../core/combat";
import { buildContent } from "./index";
import { opponentAbilities, opponents as shippedOpponents } from "./opponents";

const EXPECTED_OPPONENT_IDS = [
  "tickmoth-s7-36a",
  "tickmoth-s7-36b",
  "tickmoth-s7-40",
  "tickmoth-s8-38",
  "tickmoth-s9-60",
  "tickmoth-s9-52",
  "tollbat-s7-44a",
  "tollbat-s7-44b",
  "tollbat-s8-47a",
  "tollbat-s8-47b",
  "tollbat-s9-60",
  "astrolabe-spider-s8-48a",
  "astrolabe-spider-s8-48b",
  "astrolabe-spider-s9-70a",
  "astrolabe-spider-s9-70b",
  "the-vigil",
  "the-tocsin",
  "the-unwound",
  "aphelion",
] as const;

function abilityById(abilities: AbilityDef[], id: string): AbilityDef {
  const ability = abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing ability ${id}`);
  }
  return ability;
}

function opponentById(opponents: OpponentDef[], id: string): OpponentDef {
  const opponent = opponents.find((entry) => entry.id === id);
  if (!opponent) {
    throw new Error(`missing opponent ${id}`);
  }
  return opponent;
}

function xpFromOpponentId(id: string): number {
  if (id === "the-vigil") {
    return 480;
  }
  if (id === "the-tocsin") {
    return 570;
  }
  if (id === "the-unwound") {
    return 900;
  }
  if (id === "aphelion") {
    return 1500;
  }
  const match = /-(\d+)([a-z])?$/.exec(id);
  if (!match) {
    throw new Error(`cannot parse xp from opponent id ${id}`);
  }
  return Number(match[1]);
}

describe("Unwound Belfry Opponents", () => {
  it("exports every Stage roster id with xpAward matching its suffix", async () => {
    const { unwoundBelfryOpponents } = await import("./unwound-belfry-opponents");

    expect(unwoundBelfryOpponents.map((entry) => entry.id)).toEqual([...EXPECTED_OPPONENT_IDS]);
    for (const opponent of unwoundBelfryOpponents) {
      expect(opponent.xpAward).toBe(xpFromOpponentId(opponent.id));
    }
  });

  it("keeps ordinary and Boss families, flags, and sprite keys on spec", async () => {
    const { unwoundBelfryOpponents } = await import("./unwound-belfry-opponents");

    for (const id of [
      "tickmoth-s7-36a",
      "tickmoth-s9-52",
      "tollbat-s8-47b",
      "astrolabe-spider-s9-70a",
    ]) {
      const opponent = opponentById(unwoundBelfryOpponents, id);
      expect(opponent.boss).toBe(false);
      expect(opponent.family).toBe(opponent.spriteKey);
      expect(["tickmoth", "tollbat", "astrolabe-spider"]).toContain(opponent.spriteKey);
    }

    const vigil = opponentById(unwoundBelfryOpponents, "the-vigil");
    expect(vigil.boss).toBe(true);
    expect(vigil.family).toBe("the-vigil");
    expect(vigil.spriteKey).toBe("the-vigil");

    const tocsin = opponentById(unwoundBelfryOpponents, "the-tocsin");
    expect(tocsin.boss).toBe(true);
    expect(tocsin.family).toBe("the-tocsin");
    expect(tocsin.spriteKey).toBe("the-tocsin");

    const unwound = opponentById(unwoundBelfryOpponents, "the-unwound");
    expect(unwound.boss).toBe(true);
    expect(unwound.family).toBe("the-unwound");
    expect(unwound.spriteKey).toBe("the-unwound");

    const aphelion = opponentById(unwoundBelfryOpponents, "aphelion");
    expect(aphelion.boss).toBe(true);
    expect(aphelion.family).toBe("aphelion");
    expect(aphelion.spriteKey).toBe("aphelion");
  });

  it("pins starting base stats per approved tuning bands", async () => {
    const { unwoundBelfryOpponents } = await import("./unwound-belfry-opponents");

    const expectStats = (id: string, base: OpponentDef["base"]) => {
      expect(opponentById(unwoundBelfryOpponents, id).base).toEqual(base);
    };

    const tickmothS7 = {
      maxHealth: 340,
      physical: 30,
      elemental: 34,
      armor: 20,
      elementalResistance: 26,
    };
    for (const id of ["tickmoth-s7-36a", "tickmoth-s7-36b", "tickmoth-s7-40"]) {
      expectStats(id, tickmothS7);
    }

    expectStats("tickmoth-s8-38", {
      maxHealth: 400,
      physical: 34,
      elemental: 40,
      armor: 24,
      elementalResistance: 30,
    });

    const tickmothS9 = {
      maxHealth: 560,
      physical: 44,
      elemental: 52,
      armor: 30,
      elementalResistance: 38,
    };
    for (const id of ["tickmoth-s9-60", "tickmoth-s9-52"]) {
      expectStats(id, tickmothS9);
    }

    const tollbatS7 = {
      maxHealth: 430,
      physical: 42,
      elemental: 16,
      armor: 30,
      elementalResistance: 22,
    };
    for (const id of ["tollbat-s7-44a", "tollbat-s7-44b"]) {
      expectStats(id, tollbatS7);
    }

    const tollbatS8 = {
      maxHealth: 500,
      physical: 48,
      elemental: 18,
      armor: 34,
      elementalResistance: 26,
    };
    for (const id of ["tollbat-s8-47a", "tollbat-s8-47b"]) {
      expectStats(id, tollbatS8);
    }

    expectStats("tollbat-s9-60", {
      maxHealth: 680,
      physical: 60,
      elemental: 24,
      armor: 42,
      elementalResistance: 34,
    });

    const spiderS8 = {
      maxHealth: 520,
      physical: 36,
      elemental: 30,
      armor: 36,
      elementalResistance: 32,
    };
    for (const id of ["astrolabe-spider-s8-48a", "astrolabe-spider-s8-48b"]) {
      expectStats(id, spiderS8);
    }

    const spiderS9 = {
      maxHealth: 720,
      physical: 46,
      elemental: 40,
      armor: 46,
      elementalResistance: 42,
    };
    for (const id of ["astrolabe-spider-s9-70a", "astrolabe-spider-s9-70b"]) {
      expectStats(id, spiderS9);
    }

    expectStats("the-vigil", {
      maxHealth: 3600,
      physical: 46,
      elemental: 40,
      armor: 34,
      elementalResistance: 34,
    });
    expectStats("the-tocsin", {
      maxHealth: 4400,
      physical: 54,
      elemental: 34,
      armor: 40,
      elementalResistance: 38,
    });
    expectStats("the-unwound", {
      maxHealth: 6500,
      physical: 66,
      elemental: 44,
      armor: 50,
      elementalResistance: 46,
    });
    expectStats("aphelion", {
      maxHealth: 9000,
      physical: 78,
      elemental: 70,
      armor: 58,
      elementalResistance: 58,
    });
  });

  it("authors approved Tickmoth, Tollbat, and Astrolabe-Spider kits with specials before Basic", async () => {
    const { unwoundBelfryOpponentAbilities, unwoundBelfryOpponents } = await import(
      "./unwound-belfry-opponents"
    );

    expect(abilityById(unwoundBelfryOpponentAbilities, "tickmoth-frostwing-flutter")).toMatchObject({
      name: "Frostwing Flutter",
      slot: "core",
      targeting: { kind: "closest-opponent" },
      windUpMs: 450,
      recoveryMs: 650,
      cooldownMs: 8_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.9 },
        { kind: "apply-status", statusId: "timeslip" },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "tickmoth-tick-peck")).toMatchObject({
      name: "Tick Peck",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 380,
      recoveryMs: 620,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(unwoundBelfryOpponentAbilities, "tollbat-toll")).toMatchObject({
      name: "Toll",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 600,
      recoveryMs: 750,
      cooldownMs: 9_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.6 },
        { kind: "apply-status", statusId: "tolling" },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "tollbat-wing-buffet")).toMatchObject({
      name: "Wing Buffet",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 400,
      recoveryMs: 700,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(
      abilityById(unwoundBelfryOpponentAbilities, "astrolabe-spider-verdigris-web"),
    ).toMatchObject({
      name: "Verdigris Web",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 550,
      recoveryMs: 700,
      cooldownMs: 9_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.5 },
        { kind: "apply-status", statusId: "corroded" },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "astrolabe-spider-caliper-bite")).toMatchObject(
      {
        name: "Caliper Bite",
        slot: "basic",
        targeting: { kind: "closest-opponent" },
        windUpMs: 420,
        recoveryMs: 680,
        cooldownMs: 0,
        effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
      },
    );

    expect(opponentById(unwoundBelfryOpponents, "tickmoth-s7-36a").abilityIds).toEqual([
      "tickmoth-frostwing-flutter",
      "tickmoth-tick-peck",
    ]);
    expect(opponentById(unwoundBelfryOpponents, "tollbat-s7-44a").abilityIds).toEqual([
      "tollbat-toll",
      "tollbat-wing-buffet",
    ]);
    expect(opponentById(unwoundBelfryOpponents, "astrolabe-spider-s8-48a").abilityIds).toEqual([
      "astrolabe-spider-verdigris-web",
      "astrolabe-spider-caliper-bite",
    ]);
  });

  it("authors approved Boss kits with specials before Basic and combat priorities", async () => {
    const { unwoundBelfryOpponentAbilities, unwoundBelfryOpponents } = await import(
      "./unwound-belfry-opponents"
    );

    expect(abilityById(unwoundBelfryOpponentAbilities, "the-vigil-stopped-hour")).toMatchObject({
      name: "Stopped Hour",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 700,
      recoveryMs: 800,
      cooldownMs: 13_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.6 },
        { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "the-vigil-hollow-gaze")).toMatchObject({
      name: "Hollow Gaze",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 500,
      recoveryMs: 700,
      cooldownMs: 12_000,
      effects: [{ kind: "apply-status", statusId: "timeslip" }],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "the-vigil-talon-rake")).toMatchObject({
      name: "Talon Rake",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 450,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(unwoundBelfryOpponentAbilities, "the-tocsin-tocsin-toll")).toMatchObject({
      name: "Tocsin Toll",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 800,
      recoveryMs: 800,
      cooldownMs: 12_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.8 },
        { kind: "apply-status", statusId: "tolling" },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "the-tocsin-death-knell")).toMatchObject({
      name: "Death Knell",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 700,
      recoveryMs: 800,
      cooldownMs: 15_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.7 },
        { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "the-tocsin-iron-peck")).toMatchObject({
      name: "Iron Peck",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 450,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(
      abilityById(unwoundBelfryOpponentAbilities, "the-unwound-mainspring-release"),
    ).toMatchObject({
      name: "Mainspring Release",
      slot: "core",
      targeting: { kind: "self" },
      windUpMs: 400,
      recoveryMs: 600,
      cooldownMs: 14_000,
      validWhile: "status-absent",
      effects: [{ kind: "apply-status", statusId: "overdrive" }],
    });
    expect(
      abilityById(unwoundBelfryOpponentAbilities, "the-unwound-escapement-sweep"),
    ).toMatchObject({
      name: "Escapement Sweep",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 900,
      recoveryMs: 800,
      cooldownMs: 12_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 1 },
        { kind: "apply-status", statusId: "corroded" },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "the-unwound-grinding-halt")).toMatchObject({
      name: "Grinding Halt",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 800,
      recoveryMs: 850,
      cooldownMs: 16_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.7 },
        { kind: "apply-status", statusId: "stun", stunMs: 1_200 },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "the-unwound-gear-grind")).toMatchObject({
      name: "Gear Grind",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 500,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(unwoundBelfryOpponentAbilities, "aphelion-precession")).toMatchObject({
      name: "Precession",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 700,
      recoveryMs: 800,
      cooldownMs: 12_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.9 },
        { kind: "apply-status", statusId: "timeslip" },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "aphelion-eclipse-toll")).toMatchObject({
      name: "Eclipse Toll",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 800,
      recoveryMs: 800,
      cooldownMs: 13_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.9 },
        { kind: "apply-status", statusId: "tolling" },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "aphelion-aphelions-reach")).toMatchObject({
      name: "Aphelion's Reach",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 900,
      recoveryMs: 900,
      cooldownMs: 16_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "frost", coefficient: 1.1 },
        { kind: "apply-status", statusId: "stun", stunMs: 1_200 },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "aphelion-cold-zenith")).toMatchObject({
      name: "Cold Zenith",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 650,
      recoveryMs: 800,
      cooldownMs: 14_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.7 },
        { kind: "apply-status", statusId: "corroded" },
      ],
    });
    expect(abilityById(unwoundBelfryOpponentAbilities, "aphelion-orrery-strike")).toMatchObject({
      name: "Orrery Strike",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 500,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(opponentById(unwoundBelfryOpponents, "the-vigil").abilityIds).toEqual([
      "the-vigil-stopped-hour",
      "the-vigil-hollow-gaze",
      "the-vigil-talon-rake",
    ]);
    expect(opponentById(unwoundBelfryOpponents, "the-tocsin").abilityIds).toEqual([
      "the-tocsin-tocsin-toll",
      "the-tocsin-death-knell",
      "the-tocsin-iron-peck",
    ]);
    expect(opponentById(unwoundBelfryOpponents, "the-unwound").abilityIds).toEqual([
      "the-unwound-mainspring-release",
      "the-unwound-escapement-sweep",
      "the-unwound-grinding-halt",
      "the-unwound-gear-grind",
    ]);
    expect(opponentById(unwoundBelfryOpponents, "aphelion").abilityIds).toEqual([
      "aphelion-precession",
      "aphelion-eclipse-toll",
      "aphelion-aphelions-reach",
      "aphelion-cold-zenith",
      "aphelion-orrery-strike",
    ]);
  });

  it("keeps every core ability on a positive cooldown", async () => {
    const { unwoundBelfryOpponentAbilities } = await import("./unwound-belfry-opponents");

    for (const ability of unwoundBelfryOpponentAbilities) {
      if (ability.slot === "core") {
        expect(ability.cooldownMs).toBeGreaterThan(0);
      }
    }
  });

  it("lists specials before the authored Basic in opponentAbilityCandidates", async () => {
    const { unwoundBelfryOpponentAbilities, unwoundBelfryOpponents } = await import(
      "./unwound-belfry-opponents"
    );
    const abilitiesById = new Map(
      unwoundBelfryOpponentAbilities.map((ability) => [ability.id, ability]),
    );
    const content = {
      ...buildContent(),
      abilities: [...buildContent().abilities, ...unwoundBelfryOpponentAbilities],
      opponents: [...buildContent().opponents, ...unwoundBelfryOpponents],
    };

    for (const opponent of unwoundBelfryOpponents) {
      const candidates = opponentAbilityCandidates(content, opponent, abilitiesById);
      const basicIndex = candidates.findIndex((ability) => ability.slot === "basic");
      expect(basicIndex).toBeGreaterThanOrEqual(0);
      expect(candidates.slice(0, basicIndex).every((ability) => ability.slot !== "basic")).toBe(
        true,
      );
      expect(candidates.filter((ability) => ability.slot === "basic")).toHaveLength(1);
      expect(candidates[candidates.length - 1]?.slot).toBe("basic");
    }
  });

  it("is wired into shipped opponents and abilities", async () => {
    const { unwoundBelfryOpponentAbilities, unwoundBelfryOpponents } = await import(
      "./unwound-belfry-opponents"
    );
    const assembled = buildContent();

    for (const opponent of unwoundBelfryOpponents) {
      expect(assembled.opponents.find((entry) => entry.id === opponent.id)).toEqual(opponent);
    }
    for (const ability of unwoundBelfryOpponentAbilities) {
      expect(assembled.abilities.find((entry) => entry.id === ability.id)).toEqual(ability);
    }
    expect(assembled.opponents.length).toBe(shippedOpponents.length);
    expect(
      opponentAbilities.every((ability) => assembled.abilities.some((entry) => entry.id === ability.id)),
    ).toBe(true);
  });
});
