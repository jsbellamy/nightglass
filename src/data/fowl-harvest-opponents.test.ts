import { describe, expect, it } from "vitest";
import type { AbilityDef, OpponentDef } from "../core/types";
import { opponentAbilityCandidates } from "../core/combat";
import { validateContent } from "../core/validate-content";
import { buildContent } from "./index";
import { opponentAbilities, opponents as shippedOpponents } from "./opponents";

const EXPECTED_OPPONENT_IDS = [
  "burger-drake-s4-27a",
  "burger-drake-s4-27b",
  "burger-drake-s4-26",
  "burger-drake-s4-20",
  "cornquacker-s5-34",
  "cornquacker-s5-33a",
  "cornquacker-s5-33b",
  "cornquacker-s5-20",
  "burger-drake-s6-33",
  "burger-drake-s6-32",
  "burger-drake-s6-26",
  "cornquacker-s6-33",
  "cornquacker-s6-32",
  "cornquacker-s6-26",
  "milkshake-mallard-s4-27",
  "milkshake-mallard-s4-20",
  "balewaddle-s4-26",
  "pie-widgeon-s4-20",
  "milkshake-mallard-s5-20",
  "balewaddle-s5-33",
  "balewaddle-s5-20",
  "pie-widgeon-s5-33",
  "pie-widgeon-s5-20",
  "milkshake-mallard-s6-32",
  "balewaddle-s6-32",
  "balewaddle-s6-26",
  "pie-widgeon-s6-26",
  "the-fryer",
  "scarequack",
  "the-combine",
] as const;

const NEW_FOWL_FAMILIES = ["milkshake-mallard", "balewaddle", "pie-widgeon"] as const;

const NEW_OPPONENT_IDS = [
  "milkshake-mallard-s4-27",
  "milkshake-mallard-s4-20",
  "balewaddle-s4-26",
  "pie-widgeon-s4-20",
  "milkshake-mallard-s5-20",
  "balewaddle-s5-33",
  "balewaddle-s5-20",
  "pie-widgeon-s5-33",
  "pie-widgeon-s5-20",
  "milkshake-mallard-s6-32",
  "balewaddle-s6-32",
  "balewaddle-s6-26",
  "pie-widgeon-s6-26",
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
  if (id === "the-fryer") {
    return 240;
  }
  if (id === "scarequack") {
    return 300;
  }
  if (id === "the-combine") {
    return 390;
  }
  const match = /-(\d+)([a-z])?$/.exec(id);
  if (!match) {
    throw new Error(`cannot parse xp from opponent id ${id}`);
  }
  return Number(match[1]);
}

describe("Fowl Harvest Opponents", () => {
  it("exports every Stage roster id with xpAward matching its suffix", async () => {
    const { fowlHarvestOpponents } = await import("./fowl-harvest-opponents");

    expect(fowlHarvestOpponents.map((entry) => entry.id)).toEqual([...EXPECTED_OPPONENT_IDS]);
    for (const opponent of fowlHarvestOpponents) {
      expect(opponent.xpAward).toBe(xpFromOpponentId(opponent.id));
    }
  });

  it("keeps ordinary and Boss families, flags, and sprite keys on spec", async () => {
    const { fowlHarvestOpponents } = await import("./fowl-harvest-opponents");

    for (const id of [
      "burger-drake-s4-27a",
      "burger-drake-s6-26",
      "cornquacker-s5-34",
      "cornquacker-s6-26",
    ]) {
      const opponent = opponentById(fowlHarvestOpponents, id);
      expect(opponent.boss).toBe(false);
      expect(opponent.family).toBe(opponent.spriteKey);
      expect(["burger-drake", "cornquacker"]).toContain(opponent.spriteKey);
    }

    const fryer = opponentById(fowlHarvestOpponents, "the-fryer");
    expect(fryer.boss).toBe(true);
    expect(fryer.family).toBe("the-fryer");
    expect(fryer.spriteKey).toBe("the-fryer");

    const scarequack = opponentById(fowlHarvestOpponents, "scarequack");
    expect(scarequack.boss).toBe(true);
    expect(scarequack.family).toBe("scarequack");
    expect(scarequack.spriteKey).toBe("scarequack");

    const combine = opponentById(fowlHarvestOpponents, "the-combine");
    expect(combine.boss).toBe(true);
    expect(combine.family).toBe("the-combine");
    expect(combine.spriteKey).toBe("the-combine");
  });

  it("pins starting base stats per approved tuning bands", async () => {
    const { fowlHarvestOpponents } = await import("./fowl-harvest-opponents");

    const expectStats = (id: string, base: OpponentDef["base"]) => {
      expect(opponentById(fowlHarvestOpponents, id).base).toEqual(base);
    };

    const burgerS4 = {
      maxHealth: 247,
      physical: 22,
      spell: 20,
      armor: 12,
      elementalResistance: 14,
      firePower: 0,
      frostPower: 0,
      lightningPower: 0,
      lightPower: 0,
      critChance: 0.05,
      critDamage: 1.5,
    };
    for (const id of ["burger-drake-s4-27a", "burger-drake-s4-27b", "burger-drake-s4-26", "burger-drake-s4-20"]) {
      expectStats(id, burgerS4);
    }

    const cornS5 = {
      maxHealth: 312,
      physical: 28,
      spell: 8,
      armor: 17,
      elementalResistance: 16,
      firePower: 0,
      frostPower: 0,
      lightningPower: 0,
      lightPower: 0,
      critChance: 0.05,
      critDamage: 1.5,
    };
    for (const id of ["cornquacker-s5-34", "cornquacker-s5-33a", "cornquacker-s5-33b", "cornquacker-s5-20"]) {
      expectStats(id, cornS5);
    }

    const burgerS6 = {
      maxHealth: 390,
      physical: 26,
      spell: 30,
      armor: 22,
      elementalResistance: 22,
      firePower: 0,
      frostPower: 0,
      lightningPower: 0,
      lightPower: 0,
      critChance: 0.05,
      critDamage: 1.5,
    };
    for (const id of ["burger-drake-s6-33", "burger-drake-s6-32", "burger-drake-s6-26"]) {
      expectStats(id, burgerS6);
    }

    const cornS6 = {
      maxHealth: 416,
      physical: 34,
      spell: 10,
      armor: 24,
      elementalResistance: 20,
      firePower: 0,
      frostPower: 0,
      lightningPower: 0,
      lightPower: 0,
      critChance: 0.05,
      critDamage: 1.5,
    };
    for (const id of ["cornquacker-s6-33", "cornquacker-s6-32", "cornquacker-s6-26"]) {
      expectStats(id, cornS6);
    }

    expectStats("the-fryer", {
      maxHealth: 1950,
      physical: 34,
      spell: 32,
      armor: 25,
      elementalResistance: 28,
      firePower: 0,
      frostPower: 0,
      lightningPower: 0,
      lightPower: 0,
      critChance: 0.05,
      critDamage: 1.5,
    });
    expectStats("scarequack", {
      maxHealth: 2730,
      physical: 42,
      spell: 18,
      armor: 32,
      elementalResistance: 30,
      firePower: 0,
      frostPower: 0,
      lightningPower: 0,
      lightPower: 0,
      critChance: 0.05,
      critDamage: 1.5,
    });
    expectStats("the-combine", {
      maxHealth: 3900,
      physical: 52,
      spell: 24,
      armor: 38,
      elementalResistance: 36,
      firePower: 0,
      frostPower: 0,
      lightningPower: 0,
      lightPower: 0,
      critChance: 0.05,
      critDamage: 1.5,
    });
  });

  it("authors approved Burger Drake and Cornquacker kits with specials before Basic", async () => {
    const { fowlHarvestOpponentAbilities, fowlHarvestOpponents } = await import(
      "./fowl-harvest-opponents"
    );

    const greaseSpit = abilityById(fowlHarvestOpponentAbilities, "burger-drake-grease-spit");
    expect(greaseSpit).toMatchObject({
      name: "Grease Spit",
      slot: "core",
      targeting: { kind: "closest-opponent" },
      windUpMs: 450,
      recoveryMs: 700,
      cooldownMs: 8_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "fire", coefficient: 0.9 },
        { kind: "apply-status", statusId: "scalded" },
      ],
    });

    const bunBash = abilityById(fowlHarvestOpponentAbilities, "burger-drake-bun-bash");
    expect(bunBash).toMatchObject({
      name: "Bun Bash",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 400,
      recoveryMs: 700,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    const huskLash = abilityById(fowlHarvestOpponentAbilities, "cornquacker-husk-lash");
    expect(huskLash).toMatchObject({
      name: "Husk Lash",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 600,
      recoveryMs: 700,
      cooldownMs: 9_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.55 },
        { kind: "apply-status", statusId: "riven" },
      ],
    });

    const cobPeck = abilityById(fowlHarvestOpponentAbilities, "cornquacker-cob-peck");
    expect(cobPeck).toMatchObject({
      name: "Cob Peck",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 450,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    const burger = opponentById(fowlHarvestOpponents, "burger-drake-s4-27a");
    expect(burger.abilityIds).toEqual(["burger-drake-grease-spit", "burger-drake-bun-bash"]);
    const corn = opponentById(fowlHarvestOpponents, "cornquacker-s5-34");
    expect(corn.abilityIds).toEqual(["cornquacker-husk-lash", "cornquacker-cob-peck"]);
  });

  it("authors approved Boss kits with specials before Basic and combat priorities", async () => {
    const { fowlHarvestOpponentAbilities, fowlHarvestOpponents } = await import(
      "./fowl-harvest-opponents"
    );

    expect(abilityById(fowlHarvestOpponentAbilities, "the-fryer-flash-fry")).toMatchObject({
      name: "Flash Fry",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 800,
      recoveryMs: 800,
      cooldownMs: 11_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "fire", coefficient: 1 },
        { kind: "apply-status", statusId: "scalded" },
      ],
    });
    expect(abilityById(fowlHarvestOpponentAbilities, "the-fryer-pressure-burst")).toMatchObject({
      name: "Pressure Burst",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 650,
      recoveryMs: 800,
      cooldownMs: 14_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "fire", coefficient: 0.65 },
        { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
      ],
    });
    expect(abilityById(fowlHarvestOpponentAbilities, "the-fryer-grease-peck")).toMatchObject({
      name: "Grease Peck",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 450,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(fowlHarvestOpponentAbilities, "scarequack-harrowing-gaze")).toMatchObject({
      name: "Harrowing Gaze",
      slot: "core",
      targeting: { kind: "party" },
      windUpMs: 500,
      recoveryMs: 700,
      cooldownMs: 12_000,
      effects: [{ kind: "apply-status", statusId: "shaken" }],
    });
    expect(abilityById(fowlHarvestOpponentAbilities, "scarequack-stakefall")).toMatchObject({
      name: "Stakefall",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 800,
      recoveryMs: 800,
      cooldownMs: 14_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.85 },
        { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
      ],
    });
    expect(abilityById(fowlHarvestOpponentAbilities, "scarequack-crooked-peck")).toMatchObject({
      name: "Crooked Peck",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 450,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(fowlHarvestOpponentAbilities, "the-combine-redline-overdrive")).toMatchObject({
      name: "Redline Overdrive",
      slot: "core",
      targeting: { kind: "self" },
      windUpMs: 400,
      recoveryMs: 600,
      cooldownMs: 14_000,
      validWhile: "status-absent",
      effects: [{ kind: "apply-status", statusId: "overdrive" }],
    });
    expect(abilityById(fowlHarvestOpponentAbilities, "the-combine-reaping-pass")).toMatchObject({
      name: "Reaping Pass",
      slot: "core",
      targeting: { kind: "all-opponents" },
      windUpMs: 900,
      recoveryMs: 800,
      cooldownMs: 12_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 1 },
        { kind: "apply-status", statusId: "riven" },
      ],
    });
    expect(abilityById(fowlHarvestOpponentAbilities, "the-combine-thresher-bite")).toMatchObject({
      name: "Thresher Bite",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      windUpMs: 500,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(opponentById(fowlHarvestOpponents, "the-fryer").abilityIds).toEqual([
      "the-fryer-flash-fry",
      "the-fryer-pressure-burst",
      "the-fryer-grease-peck",
    ]);
    expect(opponentById(fowlHarvestOpponents, "scarequack").abilityIds).toEqual([
      "scarequack-harrowing-gaze",
      "scarequack-stakefall",
      "scarequack-crooked-peck",
    ]);
    expect(opponentById(fowlHarvestOpponents, "the-combine").abilityIds).toEqual([
      "the-combine-redline-overdrive",
      "the-combine-reaping-pass",
      "the-combine-thresher-bite",
    ]);
  });

  it("keeps new ordinary families, flags, and sprite keys on spec", async () => {
    const { fowlHarvestOpponents } = await import("./fowl-harvest-opponents");

    for (const id of NEW_OPPONENT_IDS) {
      const opponent = opponentById(fowlHarvestOpponents, id);
      expect(opponent.boss).toBe(false);
      expect(opponent.family).toBe(opponent.spriteKey);
      expect(NEW_FOWL_FAMILIES).toContain(opponent.spriteKey);
    }
  });

  it("reuses shipped stat blocks for new families without per-family variation", async () => {
    const { fowlHarvestOpponents } = await import("./fowl-harvest-opponents");

    const burgerS4 = opponentById(fowlHarvestOpponents, "burger-drake-s4-27a").base;
    const cornS5 = opponentById(fowlHarvestOpponents, "cornquacker-s5-34").base;
    const burgerS6 = opponentById(fowlHarvestOpponents, "burger-drake-s6-33").base;
    const cornS6 = opponentById(fowlHarvestOpponents, "cornquacker-s6-33").base;

    for (const id of [
      "milkshake-mallard-s4-27",
      "milkshake-mallard-s4-20",
      "balewaddle-s4-26",
      "pie-widgeon-s4-20",
    ]) {
      expect(opponentById(fowlHarvestOpponents, id).base).toBe(burgerS4);
    }

    for (const id of [
      "milkshake-mallard-s5-20",
      "balewaddle-s5-33",
      "balewaddle-s5-20",
      "pie-widgeon-s5-33",
      "pie-widgeon-s5-20",
    ]) {
      expect(opponentById(fowlHarvestOpponents, id).base).toBe(cornS5);
    }

    expect(opponentById(fowlHarvestOpponents, "milkshake-mallard-s6-32").base).toBe(burgerS6);
    expect(opponentById(fowlHarvestOpponents, "pie-widgeon-s6-26").base).toBe(burgerS6);

    for (const id of ["balewaddle-s6-32", "balewaddle-s6-26"]) {
      expect(opponentById(fowlHarvestOpponents, id).base).toBe(cornS6);
    }
  });

  it("authors approved kits for new families with core before basic and cooldown slots on spec", async () => {
    const { fowlHarvestOpponentAbilities, fowlHarvestOpponents } = await import(
      "./fowl-harvest-opponents"
    );

    expect(abilityById(fowlHarvestOpponentAbilities, "milkshake-mallard-brainfreeze")).toMatchObject({
      name: "Brainfreeze",
      slot: "core",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 470,
      recoveryMs: 690,
      cooldownMs: 8_500,
      effects: [
        { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.9 },
        { kind: "apply-status", statusId: "timeslip" },
      ],
    });
    expect(abilityById(fowlHarvestOpponentAbilities, "milkshake-mallard-straw-jab")).toMatchObject({
      name: "Straw Jab",
      slot: "basic",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 410,
      recoveryMs: 670,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(fowlHarvestOpponentAbilities, "balewaddle-chaff-burst")).toMatchObject({
      name: "Chaff Burst",
      slot: "core",
      classId: "knight",
      targeting: { kind: "all-opponents" },
      windUpMs: 590,
      recoveryMs: 710,
      cooldownMs: 9_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.55 },
        { kind: "apply-status", statusId: "shaken" },
      ],
    });
    expect(abilityById(fowlHarvestOpponentAbilities, "balewaddle-bale-bump")).toMatchObject({
      name: "Bale Bump",
      slot: "basic",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 440,
      recoveryMs: 690,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(fowlHarvestOpponentAbilities, "pie-widgeon-scalding-slice")).toMatchObject({
      name: "Scalding Slice",
      slot: "core",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 460,
      recoveryMs: 680,
      cooldownMs: 8_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "fire", coefficient: 0.85 },
        { kind: "apply-status", statusId: "scalded" },
      ],
    });
    expect(abilityById(fowlHarvestOpponentAbilities, "pie-widgeon-crust-peck")).toMatchObject({
      name: "Crust Peck",
      slot: "basic",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 430,
      recoveryMs: 660,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    for (const ability of fowlHarvestOpponentAbilities.filter((entry) =>
      entry.id.startsWith("milkshake-mallard-") ||
      entry.id.startsWith("balewaddle-") ||
      entry.id.startsWith("pie-widgeon-"),
    )) {
      if (ability.slot === "core") {
        expect(ability.cooldownMs).toBeGreaterThan(0);
      } else {
        expect(ability.cooldownMs).toBe(0);
      }
    }

    expect(opponentById(fowlHarvestOpponents, "milkshake-mallard-s4-27").abilityIds).toEqual([
      "milkshake-mallard-brainfreeze",
      "milkshake-mallard-straw-jab",
    ]);
    expect(opponentById(fowlHarvestOpponents, "balewaddle-s5-33").abilityIds).toEqual([
      "balewaddle-chaff-burst",
      "balewaddle-bale-bump",
    ]);
    expect(opponentById(fowlHarvestOpponents, "pie-widgeon-s6-26").abilityIds).toEqual([
      "pie-widgeon-scalding-slice",
      "pie-widgeon-crust-peck",
    ]);
  });

  it("lists specials before the authored Basic in opponentAbilityCandidates", async () => {
    const { fowlHarvestOpponentAbilities, fowlHarvestOpponents } = await import(
      "./fowl-harvest-opponents"
    );
    const abilitiesById = new Map(
      fowlHarvestOpponentAbilities.map((ability) => [ability.id, ability]),
    );
    const content = {
      ...buildContent(),
      abilities: [...buildContent().abilities, ...fowlHarvestOpponentAbilities],
      opponents: [...buildContent().opponents, ...fowlHarvestOpponents],
    };

    for (const opponent of fowlHarvestOpponents) {
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

  it("is wired into shipped opponents and abilities without validateContent violations", async () => {
    const { fowlHarvestOpponentAbilities, fowlHarvestOpponents } = await import(
      "./fowl-harvest-opponents"
    );
    const assembled = buildContent();

    for (const opponent of fowlHarvestOpponents) {
      expect(assembled.opponents.find((entry) => entry.id === opponent.id)).toEqual(opponent);
    }
    for (const ability of fowlHarvestOpponentAbilities) {
      expect(assembled.abilities.find((entry) => entry.id === ability.id)).toEqual(ability);
    }
    expect(assembled.opponents.length).toBe(shippedOpponents.length);
    expect(
      opponentAbilities.every((ability) => assembled.abilities.some((entry) => entry.id === ability.id)),
    ).toBe(true);
    expect(validateContent(assembled)).toEqual([]);
  });
});
