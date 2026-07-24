import { describe, expect, it } from "vitest";
import { isAbilityValid } from "../core/combat";
import type { AbilityDef, ClassKitDef, StatusEffectDef } from "../core/types";
import type { CombatantState } from "../core/snapshot";
import { talentTierDefs } from "../core/talents";
import { validateContent } from "../core/validate-content";
import {
  REVIEWED_CLASS_BASES,
  REVIEWED_CLASS_KIT_ABILITIES,
  REVIEWED_STATUSES,
  REVIEWED_XP_THRESHOLDS,
} from "./fixtures/class-kit-number-contract";
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

  it("ships no behaviorless Abilities, Status Effects, or Stat Talents", () => {
    expect(validateContent(content)).toEqual([]);
  });

  it("authored selectable Abilities and Stat Talents use iconKey equal to id", () => {
    for (const classKit of content.classes) {
      for (const tier of talentTierDefs(classKit)) {
        for (const statTalent of tier.statRow) {
          expect(statTalent.iconKey).toBe(statTalent.id);
        }
        for (const abilityId of tier.abilityRow) {
          const ability = abilityById(abilityId);
          expect(ability.iconKey).toBe(ability.id);
        }
      }
      const basic = abilityById(classKit.basicAbilityId);
      expect(basic.iconKey).toBe(basic.id);
      for (const coreId of classKit.coreAbilityIds) {
        const core = abilityById(coreId);
        expect(core.iconKey).toBe(core.id);
      }
    }
  });

  it("ships 44 Class Abilities: 4 basics, 16 Core, 24 Ability Talents", () => {
    const classAbilities = buildClassKitSlice().abilities;
    expect(classAbilities).toHaveLength(44);
    expect(classAbilities.filter((ability) => ability.slot === "basic")).toHaveLength(4);
    expect(classAbilities.filter((ability) => ability.slot === "core")).toHaveLength(16);
    expect(classAbilities.filter((ability) => ability.slot === "talent")).toHaveLength(24);
  });

  it("assembles ordered Talent Tiers for every Class", () => {
    for (const classKit of content.classes) {
      expect(classKit.talentTiers).toHaveLength(2);
      const tiers = talentTierDefs(classKit);
      expect(tiers).toHaveLength(3);
      for (const tier of tiers) {
        expect(tier.statRow).toHaveLength(2);
        expect(tier.abilityRow).toHaveLength(2);
      }
    }
  });

  it("ships Ability Talents per Class across all Talent Tiers", () => {
    for (const classKit of content.classes) {
      const talentAbilityIds = talentTierDefs(classKit).flatMap((tier) => tier.abilityRow);
      expect(talentAbilityIds).toHaveLength(6);
      for (const abilityId of talentAbilityIds) {
        const ability = abilityById(abilityId);
        expect(ability.classId).toBe(classKit.id);
        expect(ability.slot).toBe("talent");
      }
    }
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
      expect.arrayContaining([
        "braced",
        "guarded",
        "warded",
        "inspired",
        "sheltered",
        "overdrive",
      ]),
    );
    expect(buffs.filter((status) =>
      ["braced", "guarded", "warded", "inspired", "sheltered", "overdrive"].includes(
        status.id,
      ),
    )).toHaveLength(6);
    expect(debuffs.map((status) => status.id).sort()).toEqual(
      ["corroded", "exposed", "riven", "scalded", "scorched", "shaken", "timeslip", "tolling"],
    );
    expect(stuns).toHaveLength(1);
    expect(stuns[0]?.id).toBe("stun");
    expect(content.abilities.some((ability) =>
      ability.effects.some((effect) => effect.kind === "apply-status" && effect.stunMs !== undefined),
    )).toBe(true);
  });
});

describe("Class Kit number contract", () => {
  it("Ability coefficients, Wind-up, Recovery, and cooldowns match the reviewed contract", () => {
    expect(REVIEWED_CLASS_KIT_ABILITIES).toHaveLength(28);
    const reviewedIds = new Set(REVIEWED_CLASS_KIT_ABILITIES.map((ability) => ability.id));
    const tierOneAbilities = classKit.abilities.filter((ability) => reviewedIds.has(ability.id));
    expect(sortById(tierOneAbilities)).toEqual(sortById(REVIEWED_CLASS_KIT_ABILITIES));
  });

  it("Status Effect durations and modifiers match the reviewed contract", () => {
    expect(REVIEWED_STATUSES).toHaveLength(13);
    for (const expected of REVIEWED_STATUSES) {
      expect(statusById(expected.id, classKit.statuses)).toEqual(expected);
    }
  });

  it("Level 1 bases and default Ability Loadouts match the reviewed contract", () => {
    expect(content.classes).toHaveLength(4);
    expect(REVIEWED_CLASS_BASES).toHaveLength(4);
    for (const expected of REVIEWED_CLASS_BASES) {
      const shipped = classById(expected.id);
      expect(shipped.base).toEqual(expected.base);
      expect(shipped.defaultLoadout).toEqual(expected.defaultLoadout);
    }
  });

  it("Character XP thresholds match the reviewed contract", () => {
    expect(classKit.xpThresholds).toEqual([...REVIEWED_XP_THRESHOLDS]);
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
