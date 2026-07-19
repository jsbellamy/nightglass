import { describe, expect, it } from "vitest";
import type { AbilityDef, ClassKitDef } from "../core/types";
import { validateContent } from "../core/validate-content";
import { buildContent } from "./index";

const content = buildContent();

function abilityById(id: string): AbilityDef {
  const ability = content.abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing ability ${id}`);
  }
  return ability;
}

function classById(id: ClassKitDef["id"]): ClassKitDef {
  const classKit = content.classes.find((entry) => entry.id === id);
  if (!classKit) {
    throw new Error(`missing class ${id}`);
  }
  return classKit;
}

describe("assembled Class Kit content", () => {
  it("passes validateContent with fixture stubs for sibling slices", () => {
    expect(validateContent(content, { fixture: true })).toEqual([]);
  });

  it("declares all four Classes with Level 1 bases from issue #7", () => {
    expect(content.classes).toHaveLength(4);
    expect(classById("knight").base).toEqual({
      maxHealth: 180,
      physical: 14,
      elemental: 4,
      armor: 30,
      elementalResistance: 12,
    });
    expect(classById("wizard").base).toEqual({
      maxHealth: 100,
      physical: 4,
      elemental: 16,
      armor: 10,
      elementalResistance: 24,
    });
    expect(classById("priest").base).toEqual({
      maxHealth: 125,
      physical: 5,
      elemental: 13,
      armor: 15,
      elementalResistance: 20,
    });
    expect(classById("hunter").base).toEqual({
      maxHealth: 120,
      physical: 15,
      elemental: 6,
      armor: 16,
      elementalResistance: 14,
    });
  });

  it("ships 28 Class Abilities: 4 basics, 16 Core, 8 Ability Talents", () => {
    const classAbilities = content.abilities.filter((ability) =>
      ["knight", "wizard", "priest", "hunter"].includes(ability.classId),
    );
    expect(classAbilities).toHaveLength(28);
    expect(classAbilities.filter((ability) => ability.slot === "basic")).toHaveLength(4);
    expect(classAbilities.filter((ability) => ability.slot === "core")).toHaveLength(16);
    expect(classAbilities.filter((ability) => ability.slot === "talent")).toHaveLength(8);
  });

  it("requires every non-basic Ability cooldown above zero", () => {
    for (const ability of content.abilities) {
      if (ability.slot !== "basic") {
        expect(ability.cooldownMs).toBeGreaterThan(0);
      }
    }
  });

  it("defines five buff statuses, two debuffs, and stun handling", () => {
    const buffs = content.statuses.filter((status) => status.kind === "buff");
    const debuffs = content.statuses.filter((status) => status.kind === "debuff");
    const stuns = content.statuses.filter((status) => status.kind === "stun");
    expect(buffs.map((status) => status.id)).toEqual(
      expect.arrayContaining(["braced", "guarded", "warded", "inspired", "sheltered"]),
    );
    expect(buffs.filter((status) =>
      ["braced", "guarded", "warded", "inspired", "sheltered"].includes(status.id),
    )).toHaveLength(5);
    expect(debuffs.map((status) => status.id).sort()).toEqual(["exposed", "riven"]);
    expect(stuns).toHaveLength(1);
    expect(stuns[0]?.id).toBe("stun");
    expect(content.abilities.some((ability) =>
      ability.effects.some((effect) => effect.kind === "apply-status" && effect.stunMs !== undefined),
    )).toBe(true);
  });

  it("pins default loadouts from issue #7", () => {
    expect(classById("knight").defaultLoadout).toEqual([
      "shield-brace",
      "rallying-guard",
      "sweeping-arc",
    ]);
    expect(classById("wizard").defaultLoadout).toEqual([
      "prism-ward",
      "frost-lance",
      "cinder-bloom",
    ]);
    expect(classById("priest").defaultLoadout).toEqual([
      "dawn-recall",
      "mending-light",
      "war-hymn",
    ]);
    expect(classById("hunter").defaultLoadout).toEqual([
      "barbed-arrow",
      "pinpoint-shot",
      "split-volley",
    ]);
  });

  it("pins xpThresholds in assembled Content", () => {
    expect(content.xpThresholds).toEqual([0, 100, 250, 450, 650, 850]);
  });
});

describe("spot-check Ability transcription", () => {
  it("pins Heartseeker field-by-field", () => {
    expect(abilityById("heartseeker")).toEqual({
      id: "heartseeker",
      name: "Heartseeker",
      classId: "hunter",
      slot: "talent",
      targeting: { kind: "closest-opponent" },
      effects: [{ kind: "damage", channel: "physical", coefficient: 2.8 }],
      windUpMs: 850,
      recoveryMs: 650,
      cooldownMs: 13000,
    });
  });

  it("pins Steel Cut field-by-field", () => {
    expect(abilityById("steel-cut")).toEqual({
      id: "steel-cut",
      name: "Steel Cut",
      classId: "knight",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
      windUpMs: 350,
      recoveryMs: 650,
      cooldownMs: 0,
    });
  });

  it("pins Frost Lance field-by-field", () => {
    expect(abilityById("frost-lance")).toEqual({
      id: "frost-lance",
      name: "Frost Lance",
      classId: "wizard",
      slot: "core",
      targeting: { kind: "closest-opponent" },
      effects: [{ kind: "damage", channel: "elemental", element: "frost", coefficient: 1.8 }],
      windUpMs: 800,
      recoveryMs: 600,
      cooldownMs: 8000,
    });
  });

  it("pins Dawn Recall field-by-field", () => {
    expect(abilityById("dawn-recall")).toEqual({
      id: "dawn-recall",
      name: "Dawn Recall",
      classId: "priest",
      slot: "core",
      targeting: { kind: "first-knocked-out-ally" },
      effects: [{ kind: "revive", coefficient: 2 }],
      windUpMs: 1200,
      recoveryMs: 800,
      cooldownMs: 20000,
    });
  });
});
