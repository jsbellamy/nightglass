import { describe, expect, it } from "vitest";
import type { AbilityDef, OpponentDef } from "../core/types";
import { opponentAbilityCandidates } from "../core/combat";
import { validateContent } from "../core/validate-content";
import { buildContent } from "./index";
import { opponentAbilities, opponents as shippedOpponents } from "./opponents";

const EXPECTED_OPPONENT_IDS = [
  "brambling-1-7",
  "lanternmoth-1-6",
  "huskbeetle-1-5",
  "dewsnail-1-5",
  "brambling-2-7",
  "brambling-2-6",
  "lanternmoth-2-7",
  "huskbeetle-2-6",
  "dewsnail-2-6",
  "brambling-3-8",
  "lanternmoth-3-8",
  "huskbeetle-3-8",
  "dewsnail-3-8",
] as const;

const MOONBERRY_FAMILIES = ["brambling", "lanternmoth", "huskbeetle", "dewsnail"] as const;

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
  const match = /-(\d+)$/.exec(id);
  if (!match) {
    throw new Error(`cannot parse xp from opponent id ${id}`);
  }
  return Number(match[1]);
}

function pipcapStatsForStage(stage: 1 | 2 | 3): OpponentDef["base"] {
  const pipcapId = stage === 1 ? "pipcap-1-7a" : stage === 2 ? "pipcap-2-8a" : "pipcap-3-8";
  const pipcap = shippedOpponents.find((entry) => entry.id === pipcapId);
  if (!pipcap) {
    throw new Error(`missing pipcap reference ${pipcapId}`);
  }
  return pipcap.base;
}

describe("Moonberry Opponents", () => {
  it("exports every Stage roster id with xpAward matching its suffix", async () => {
    const { moonberryOpponents } = await import("./moonberry-opponents");

    expect(moonberryOpponents.map((entry) => entry.id)).toEqual([...EXPECTED_OPPONENT_IDS]);
    for (const opponent of moonberryOpponents) {
      expect(opponent.xpAward).toBe(xpFromOpponentId(opponent.id));
    }
  });

  it("keeps ordinary families, flags, and sprite keys on spec", async () => {
    const { moonberryOpponents } = await import("./moonberry-opponents");

    for (const id of EXPECTED_OPPONENT_IDS) {
      const opponent = opponentById(moonberryOpponents, id);
      expect(opponent.boss).toBe(false);
      expect(opponent.family).toBe(opponent.spriteKey);
      expect(MOONBERRY_FAMILIES).toContain(opponent.spriteKey);
    }
  });

  it("reuses Pipcap stat blocks per Stage without per-family variation", async () => {
    const { moonberryOpponents } = await import("./moonberry-opponents");

    const expectStats = (id: string, base: OpponentDef["base"]) => {
      expect(opponentById(moonberryOpponents, id).base).toEqual(base);
    };

    const stage1 = pipcapStatsForStage(1);
    for (const id of ["brambling-1-7", "lanternmoth-1-6", "huskbeetle-1-5", "dewsnail-1-5"]) {
      expectStats(id, stage1);
    }

    const stage2 = pipcapStatsForStage(2);
    for (const id of [
      "brambling-2-7",
      "brambling-2-6",
      "lanternmoth-2-7",
      "huskbeetle-2-6",
      "dewsnail-2-6",
    ]) {
      expectStats(id, stage2);
    }

    const stage3 = pipcapStatsForStage(3);
    for (const id of ["brambling-3-8", "lanternmoth-3-8", "huskbeetle-3-8", "dewsnail-3-8"]) {
      expectStats(id, stage3);
    }
  });

  it("authors approved kits with core before basic and cooldown slots on spec", async () => {
    const { moonberryOpponentAbilities, moonberryOpponents } = await import("./moonberry-opponents");

    expect(abilityById(moonberryOpponentAbilities, "brambling-thorn-lash")).toMatchObject({
      name: "Thorn Lash",
      slot: "core",
      classId: "knight",
      targeting: { kind: "all-opponents" },
      windUpMs: 550,
      recoveryMs: 700,
      cooldownMs: 9_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.6 },
        { kind: "apply-status", statusId: "riven" },
      ],
    });
    expect(abilityById(moonberryOpponentAbilities, "brambling-briar-jab")).toMatchObject({
      name: "Briar Jab",
      slot: "basic",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 420,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(moonberryOpponentAbilities, "lanternmoth-dazzle")).toMatchObject({
      name: "Dazzle",
      slot: "core",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 480,
      recoveryMs: 680,
      cooldownMs: 8_000,
      effects: [
        { kind: "damage", channel: "elemental", element: "light", coefficient: 0.9 },
        { kind: "apply-status", statusId: "shaken" },
      ],
    });
    expect(abilityById(moonberryOpponentAbilities, "lanternmoth-wing-cuff")).toMatchObject({
      name: "Wing Cuff",
      slot: "basic",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 400,
      recoveryMs: 650,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(moonberryOpponentAbilities, "huskbeetle-shell-slam")).toMatchObject({
      name: "Shell Slam",
      slot: "core",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 600,
      recoveryMs: 750,
      cooldownMs: 9_000,
      effects: [
        { kind: "damage", channel: "physical", coefficient: 1.3 },
        { kind: "apply-status", statusId: "exposed" },
      ],
    });
    expect(abilityById(moonberryOpponentAbilities, "huskbeetle-mandible-nip")).toMatchObject({
      name: "Mandible Nip",
      slot: "basic",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 430,
      recoveryMs: 660,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    expect(abilityById(moonberryOpponentAbilities, "dewsnail-dew-spray")).toMatchObject({
      name: "Dew Spray",
      slot: "core",
      classId: "knight",
      targeting: { kind: "all-opponents" },
      windUpMs: 560,
      recoveryMs: 720,
      cooldownMs: 9_500,
      effects: [
        { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.7 },
        { kind: "apply-status", statusId: "scalded" },
      ],
    });
    expect(abilityById(moonberryOpponentAbilities, "dewsnail-rasp")).toMatchObject({
      name: "Rasp",
      slot: "basic",
      classId: "knight",
      targeting: { kind: "closest-opponent" },
      windUpMs: 450,
      recoveryMs: 700,
      cooldownMs: 0,
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    });

    for (const ability of moonberryOpponentAbilities) {
      if (ability.slot === "core") {
        expect(ability.cooldownMs).toBeGreaterThan(0);
      } else {
        expect(ability.cooldownMs).toBe(0);
      }
    }

    expect(opponentById(moonberryOpponents, "brambling-1-7").abilityIds).toEqual([
      "brambling-thorn-lash",
      "brambling-briar-jab",
    ]);
    expect(opponentById(moonberryOpponents, "lanternmoth-2-7").abilityIds).toEqual([
      "lanternmoth-dazzle",
      "lanternmoth-wing-cuff",
    ]);
    expect(opponentById(moonberryOpponents, "huskbeetle-3-8").abilityIds).toEqual([
      "huskbeetle-shell-slam",
      "huskbeetle-mandible-nip",
    ]);
    expect(opponentById(moonberryOpponents, "dewsnail-1-5").abilityIds).toEqual([
      "dewsnail-dew-spray",
      "dewsnail-rasp",
    ]);
  });

  it("lists core before basic in opponentAbilityCandidates", async () => {
    const { moonberryOpponentAbilities, moonberryOpponents } = await import("./moonberry-opponents");
    const abilitiesById = new Map(
      moonberryOpponentAbilities.map((ability) => [ability.id, ability]),
    );
    const assembled = {
      ...buildContent(),
      abilities: [...buildContent().abilities, ...moonberryOpponentAbilities],
      opponents: [...buildContent().opponents, ...moonberryOpponents],
    };

    for (const opponent of moonberryOpponents) {
      const candidates = opponentAbilityCandidates(assembled, opponent, abilitiesById);
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
    const { moonberryOpponentAbilities, moonberryOpponents } = await import("./moonberry-opponents");
    const assembled = buildContent();

    for (const opponent of moonberryOpponents) {
      expect(assembled.opponents.find((entry) => entry.id === opponent.id)).toEqual(opponent);
    }
    for (const ability of moonberryOpponentAbilities) {
      expect(assembled.abilities.find((entry) => entry.id === ability.id)).toEqual(ability);
    }
    expect(
      opponentAbilities.every((ability) => assembled.abilities.some((entry) => entry.id === ability.id)),
    ).toBe(true);
    expect(validateContent(assembled)).toEqual([]);
  });
});
