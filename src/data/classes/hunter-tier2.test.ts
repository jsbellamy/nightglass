import { describe, expect, it } from "vitest";
import { registeredIconKeys } from "../../ui/icons";
import { buildContent } from "../index";
import {
  hunterAbilities,
  hunterClass,
  hunterTier2,
  hunterTier2Abilities,
} from "./hunter";

const TIER2_ABILITY_IDS = ["piercing-rain", "twin-fang"] as const;
const TIER2_ICON_KEYS = [
  "piercing-rain",
  "twin-fang",
  "fletchers-eye",
  "wayfarers-ward",
] as const;

describe("inactive Hunter Talent Tier 2 exports", () => {
  it("defines Fletcher's Eye and Wayfarer's Ward as five-rank Stat Talents with approved icon keys", () => {
    const [fletchersEye, wayfarersWard] = hunterTier2.statRow;
    expect(fletchersEye).toEqual({
      id: "fletchers-eye",
      name: "Fletcher's Eye",
      perRank: { flat: { physical: 2 } },
      maxRanks: 5,
      iconKey: "fletchers-eye",
    });
    expect(wayfarersWard).toEqual({
      id: "wayfarers-ward",
      name: "Wayfarer's Ward",
      perRank: { flat: { elementalResistance: 4 } },
      maxRanks: 5,
      iconKey: "wayfarers-ward",
    });
  });

  it("defines Piercing Rain and Twin Fang as mutually exclusive Ability Talents in the Tier 2 Ability Row", () => {
    expect(hunterTier2.abilityRow).toEqual([...TIER2_ABILITY_IDS]);
    const byId = Object.fromEntries(hunterTier2Abilities.map((ability) => [ability.id, ability]));
    expect(byId["piercing-rain"]).toEqual({
      id: "piercing-rain",
      name: "Piercing Rain",
      classId: "hunter",
      slot: "talent",
      iconKey: "piercing-rain",
      targeting: { kind: "all-opponents" },
      effects: [
        { kind: "damage", channel: "physical", coefficient: 0.85 },
        { kind: "apply-status", statusId: "exposed" },
      ],
      windUpMs: 650,
      recoveryMs: 650,
      cooldownMs: 13_000,
    });
    expect(byId["twin-fang"]).toEqual({
      id: "twin-fang",
      name: "Twin Fang",
      classId: "hunter",
      slot: "talent",
      iconKey: "twin-fang",
      targeting: { kind: "closest-opponent" },
      effects: [
        { kind: "damage", channel: "physical", coefficient: 1.15 },
        { kind: "damage", channel: "physical", coefficient: 1.15 },
      ],
      windUpMs: 800,
      recoveryMs: 650,
      cooldownMs: 13_000,
    });
  });

  it("keeps Tier 2 out of shipped Hunter Class Kit content and icon registration", () => {
    const shippedAbilityIds = hunterAbilities.map((ability) => ability.id);
    for (const abilityId of TIER2_ABILITY_IDS) {
      expect(shippedAbilityIds).not.toContain(abilityId);
    }
    expect(hunterClass.talentTiers).toBeUndefined();
    expect(hunterClass.talents.abilityRow).toEqual(["heartseeker", "moonwire-trap"]);

    const contentAbilityIds = buildContent().abilities.map((ability) => ability.id);
    for (const abilityId of TIER2_ABILITY_IDS) {
      expect(contentAbilityIds).not.toContain(abilityId);
    }

    const registered = new Set(registeredIconKeys());
    for (const iconKey of TIER2_ICON_KEYS) {
      expect(registered.has(iconKey)).toBe(false);
    }
  });
});
