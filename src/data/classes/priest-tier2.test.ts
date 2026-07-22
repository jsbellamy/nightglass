import { describe, expect, it } from "vitest";
import type { AbilityDef, TalentTierDef } from "../../core/types";
import { isRegisteredIconKey } from "../../ui/icons";
import { buildClassKitSlice, buildContent } from "../index";
import { statuses } from "../statuses";
import {
  priestAbilities,
  priestClass,
  priestTier2,
  priestTier2Abilities,
} from "./priest";

const EXPECTED_PRIEST_TIER2_ABILITIES: AbilityDef[] = [
  {
    id: "benediction",
    name: "Benediction",
    classId: "priest",
    slot: "talent",
    iconKey: "benediction",
    targeting: { kind: "party" },
    effects: [
      { kind: "heal", coefficient: 1.2 },
      { kind: "apply-status", statusId: "inspired" },
    ],
    windUpMs: 700,
    recoveryMs: 700,
    cooldownMs: 15_000,
    validWhile: "any-ally-missing-health",
  },
  {
    id: "dawn-ascendant",
    name: "Dawn Ascendant",
    classId: "priest",
    slot: "talent",
    iconKey: "dawn-ascendant",
    targeting: { kind: "first-knocked-out-ally" },
    effects: [
      { kind: "revive", coefficient: 2.5 },
      { kind: "apply-status", statusId: "sheltered" },
    ],
    windUpMs: 1_200,
    recoveryMs: 800,
    cooldownMs: 22_000,
  },
];

const EXPECTED_PRIEST_TIER2: TalentTierDef = {
  statRow: [
    {
      id: "battle-liturgy",
      name: "Battle Liturgy",
      perRank: { flat: { armor: 4 } },
      maxRanks: 5,
      iconKey: "battle-liturgy",
    },
    {
      id: "sunwarding",
      name: "Sunwarding",
      perRank: { flat: { elementalResistance: 4 } },
      maxRanks: 5,
      iconKey: "sunwarding",
    },
  ],
  abilityRow: ["benediction", "dawn-ascendant"],
};

const PRIEST_TIER2_ICON_KEYS = [
  "battle-liturgy",
  "sunwarding",
  "benediction",
  "dawn-ascendant",
] as const;

function statusIds(): Set<string> {
  return new Set(statuses.map((status) => status.id));
}

describe("Priest Talent Tier 2 inactive content", () => {
  it("exports Benediction and Dawn Ascendant with approved ids, targeting, effects, and tuning", () => {
    expect(priestTier2Abilities).toEqual(EXPECTED_PRIEST_TIER2_ABILITIES);
  });

  it("exports Battle Liturgy and Sunwarding as five-rank Stat Talents with matching icon keys", () => {
    expect(priestTier2).toEqual(EXPECTED_PRIEST_TIER2);
    for (const statTalent of priestTier2.statRow) {
      expect(statTalent.maxRanks).toBe(5);
      expect(statTalent.iconKey).toBe(statTalent.id);
    }
  });

  it("references Inspired and Sheltered from the shipped Status slice", () => {
    const ids = statusIds();
    for (const ability of priestTier2Abilities) {
      for (const effect of ability.effects) {
        if (effect.kind === "apply-status" && effect.statusId !== undefined) {
          expect(ids.has(effect.statusId)).toBe(true);
        }
      }
    }
    expect(ids.has("inspired")).toBe(true);
    expect(ids.has("sheltered")).toBe(true);
  });

  it("keeps Tier 2 out of shipped Class Kit abilities and Priest talents until activation", () => {
    const shippedAbilityIds = new Set(buildClassKitSlice().abilities.map((ability) => ability.id));
    const tier2AbilityIds = priestTier2.abilityRow;
    for (const abilityId of tier2AbilityIds) {
      expect(shippedAbilityIds.has(abilityId)).toBe(false);
      expect(priestAbilities.some((ability) => ability.id === abilityId)).toBe(false);
    }

    const content = buildContent();
    const priest = content.classes.find((entry) => entry.id === "priest");
    expect(priest).toBeDefined();
    expect(priest?.talentTiers).toBeUndefined();
    expect(priestClass.talentTiers).toBeUndefined();
    expect(priest?.talents).toEqual(priestClass.talents);
    for (const statId of priestTier2.statRow.map((stat) => stat.id)) {
      expect(priest?.talents.statRow.some((stat) => stat.id === statId)).toBe(false);
    }
    for (const abilityId of tier2AbilityIds) {
      expect(priest?.talents.abilityRow.includes(abilityId)).toBe(false);
    }
  });

  it("does not register Tier 2 Priest talent icon keys in the runtime icon registry", () => {
    for (const iconKey of PRIEST_TIER2_ICON_KEYS) {
      expect(isRegisteredIconKey(iconKey)).toBe(false);
    }
  });
});
