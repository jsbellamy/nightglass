/**
 * Worked expectations trace to docs/vertical-slice-spec.md §6 (Power formula at
 * L267–268; Level 1 bases via the reviewed contract at L248–249 →
 * class-kit-number-contract.ts). Talent per-rank modifiers come from the
 * fixture Class Kits that mirror shipped content.
 */
import { describe, expect, it } from "vitest";
import { REVIEWED_CLASS_BASES } from "../data/fixtures/class-kit-number-contract";
import { emptyTalentState } from "./talents";
import { characterStats } from "./stats";
import { fixtureContent } from "./testing/fixture-content";
import type { ClassKitDef } from "./types";

const knightContract = REVIEWED_CLASS_BASES.find((entry) => entry.id === "knight")!;
const wizardContract = REVIEWED_CLASS_BASES.find((entry) => entry.id === "wizard")!;
const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;
const wizardKit = fixtureContent.classes.find((entry) => entry.id === "wizard")!;

const twoTierKnight = {
  ...knightKit,
  talentTiers: [
    {
      statRow: [
        {
          id: "k2-fortitude",
          name: "Fortitude II",
          perRank: { percent: { maxHealth: 0.04 } },
          maxRanks: 5 as const,
          iconKey: "k2-fortitude",
        },
        {
          id: "k2-swordcraft",
          name: "Swordcraft II",
          perRank: { percent: { physicalPower: 0.04 } },
          maxRanks: 5 as const,
          iconKey: "k2-swordcraft",
        },
      ],
      abilityRow: ["k2-hold-line", "k2-falling-star"] as [string, string],
    },
  ],
} satisfies ClassKitDef;

describe("Character BaseStats from Class Kit and Talents", () => {
  it("matches reviewed Level 1 Knight bases with no Talents or Equipment", () => {
    const talentState = emptyTalentState(knightKit);
    expect(characterStats(knightKit, talentState)).toEqual(knightContract.base);
  });

  it("derives Knight maxHealth after five Fortitude ranks (spec §6 % on reviewed 180 base)", () => {
    const talentState = emptyTalentState(knightKit);
    talentState.statRanks = { "k-fortitude": 5, "k-swordcraft": 0 };
    talentState.tierStates[0]!.statRanks = { "k-fortitude": 5, "k-swordcraft": 0 };
    const stats = characterStats(knightKit, talentState);
    // floor(180 × (1 + 5 × 0.06)) per vertical-slice-spec.md §6 Power formula
    expect(stats.maxHealth).toBe(234);
    expect(stats.physical).toBe(knightContract.base.physical);
  });

  it("applies flat-then-percent ordering when flat and percentage bonuses target the same statistic", () => {
    const talentState = emptyTalentState(knightKit);
    const stats = characterStats(knightKit, talentState, [
      { flat: { physical: 6 } },
      { percent: { physicalPower: 0.1 } },
    ]);
    // floor((14 + 6) × 1.1) — reviewed Knight physical 14, spec §6 formula
    expect(stats.physical).toBe(22);
  });

  it("aggregates Stat Row modifiers from Tier 1 and Tier 2 into one percent pool", () => {
    const state = emptyTalentState(twoTierKnight);
    state.tierStates[0]!.statRanks = { "k-fortitude": 3, "k-swordcraft": 0 };
    state.tierStates[1]!.statRanks = { "k2-fortitude": 2, "k2-swordcraft": 0 };
    state.statRanks = { ...state.tierStates[0]!.statRanks };
    const stats = characterStats(twoTierKnight, state);
    // floor(180 × (1 + 3×0.06 + 2×0.04)) — spec §6 percent pool sums every rank
    expect(stats.maxHealth).toBe(226);
    expect(stats.physical).toBe(knightContract.base.physical);
  });
});

describe("Character BaseStats with Equipment modifiers", () => {
  it("derives Wizard Power stats from reviewed Level 1 base with mixed Talent ranks", () => {
    const talentState = emptyTalentState(wizardKit);
    talentState.statRanks = { "w-elemental-practice": 3, "w-warding-lore": 2 };
    talentState.tierStates[0]!.statRanks = { "w-elemental-practice": 3, "w-warding-lore": 2 };
    const stats = characterStats(wizardKit, talentState);
    // floor(16 × (1 + 3 × 0.05)) elemental; 24 + 2 × 4 ER flat — wizard base from contract
    expect(stats.elemental).toBe(18);
    expect(stats.elementalResistance).toBe(32);
    expect(stats.maxHealth).toBe(wizardContract.base.maxHealth);
  });
});
