import { describe, expect, it } from "vitest";
import { isAbilityValid } from "../core/combat";
import type { AbilityDef, ClassKitDef, StatusEffectDef } from "../core/types";
import type { CombatantState } from "../core/snapshot";
import { validateContent } from "../core/validate-content";
import {
  ISSUE_7_ABILITIES,
  ISSUE_7_CLASS_BASES,
  ISSUE_7_STATUSES,
  ISSUE_7_XP_THRESHOLDS,
} from "./fixtures/issue-7-ability-contract";
import { buildClassKitSlice, buildContent } from "./index";

const content = buildContent();
const classKit = buildClassKitSlice();

function abilityById(id: string): AbilityDef {
  const ability = content.abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing ability ${id}`);
  }
  return ability;
}

function classById(id: ClassKitDef["id"]): ClassKitDef {
  const classKitEntry = content.classes.find((entry) => entry.id === id);
  if (!classKitEntry) {
    throw new Error(`missing class ${id}`);
  }
  return classKitEntry;
}

function statusById(id: string, statuses: StatusEffectDef[]): StatusEffectDef {
  const status = statuses.find((entry) => entry.id === id);
  if (!status) {
    throw new Error(`missing status ${id}`);
  }
  return status;
}

function sortById<T extends { id: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.id.localeCompare(b.id));
}

describe("assembled Class Kit content", () => {
  it("passes validateContent with fixture stubs for sibling slices", () => {
    expect(validateContent(content, { fixture: true })).toEqual([]);
  });

  it("ships 28 Class Abilities: 4 basics, 16 Core, 8 Ability Talents", () => {
    const classAbilities = buildClassKitSlice().abilities;
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
});

describe("Class Kit number contract", () => {
  it("matches reviewed Ability coefficients, Wind-up, Recovery, and cooldowns for every Class Kit Ability", () => {
    expect(ISSUE_7_ABILITIES).toHaveLength(28);
    expect(sortById(classKit.abilities)).toEqual(sortById(ISSUE_7_ABILITIES));
  });

  it("matches reviewed Status Effect durations and modifiers", () => {
    expect(ISSUE_7_STATUSES).toHaveLength(9);
    for (const expected of ISSUE_7_STATUSES) {
      expect(statusById(expected.id, classKit.statuses)).toEqual(expected);
    }
  });

  it("matches reviewed Level 1 bases and default Ability Loadouts for every Class", () => {
    expect(content.classes).toHaveLength(4);
    expect(ISSUE_7_CLASS_BASES).toHaveLength(4);
    for (const expected of ISSUE_7_CLASS_BASES) {
      const shipped = classById(expected.id);
      expect(shipped.base).toEqual(expected.base);
      expect(shipped.defaultLoadout).toEqual(expected.defaultLoadout);
    }
  });

  it("matches reviewed Character XP thresholds", () => {
    expect(classKit.xpThresholds).toEqual([...ISSUE_7_XP_THRESHOLDS]);
  });
});

describe("Hold the Line validity gate", () => {
  it("is invalid at full health and valid below 50%", () => {
    const ability = abilityById("hold-the-line");
    const knight: CombatantState = {
      entityId: "party:knight:front",
      side: "party",
      defId: "knight",
      health: 180,
      maxHealth: 180,
      knockedOut: false,
      action: null,
      cooldownReadyAtMs: {},
      statuses: [],
    };
    expect(isAbilityValid(ability, knight, [knight])).toBe(false);

    knight.health = 89;
    expect(isAbilityValid(ability, knight, [knight])).toBe(true);
  });
});
