import { describe, expect, it } from "vitest";
import { buildContent } from "../data";
import { validateContent } from "./validate-content";
import { fixtureContent, fourTierFixtureContent } from "./testing/fixture-content";
import type { Content } from "./types";

describe("validateContent", () => {
  it("returns [] for fixture Content with cardinality relaxation", () => {
    expect(validateContent(fixtureContent, { fixture: true })).toEqual([]);
  });

  it("collects every violation instead of stopping at the first", () => {
    const broken: Content = {
      ...fixtureContent,
      abilities: [
        ...fixtureContent.abilities.map((ability) =>
          ability.id === "k-sweep"
            ? { ...ability, cooldownMs: 0 }
            : ability,
        ),
        {
          id: "k-sweep",
          name: "Duplicate Sweep",
          classId: "knight",
          slot: "core",
          targeting: { kind: "all-opponents" },
          effects: [{ kind: "damage", channel: "physical", coefficient: 0.7 }],
          windUpMs: 500,
          recoveryMs: 700,
          cooldownMs: 6000,
        },
      ],
      stages: fixtureContent.stages.map((stage) => ({
        ...stage,
        rarityOdds: [50, 30, 10, 5],
        waves: [{ opponents: [] }, { opponents: ["missing-opponent"] }] as const,
      })),
    };

    const violations = validateContent(broken, { fixture: true });

    expect(violations.length).toBeGreaterThanOrEqual(4);
    expect(violations).toEqual(expect.arrayContaining([
      'ability "k-sweep" slot "core" must have cooldownMs > 0',
      'abilities contains 2 entries with id "k-sweep"',
      "stage 1 rarityOdds sum to 95, expected 100",
      "stage 1 wave 1 has no opponents",
      'stage 1 wave 2 references unknown opponent "missing-opponent"',
    ]));
  });

  it("rejects a Stage whose opponent xpAward sum does not match its authored budget", () => {
    const content: Content = {
      ...fixtureContent,
      opponents: fixtureContent.opponents.map((opponent) =>
        opponent.id === "fixture-grunt" ? { ...opponent, xpAward: 15 } : opponent,
      ),
    };

    expect(validateContent(content, { fixture: true })).toContain(
      "stage 1 wave 1 xpAward sum is 15, expected 20",
    );
  });

  it("requires twelve Equipment Bases outside fixture mode", () => {
    const sparseEquipment = {
      ...fixtureContent,
      equipmentBases: fixtureContent.equipmentBases.slice(0, 2),
    };
    expect(validateContent(sparseEquipment)).toContain(
      "equipmentBases defines 2 entries, expected exactly 6",
    );
  });

  it("accepts production Content with four Equipment Tiers and Tier III/IV Affix bands", () => {
    expect(validateContent(buildContent())).toEqual([]);
  });

  it("accepts a complete four-Tier Equipment catalog with Tier III/IV Affix bands", () => {
    const content: Content = {
      ...buildContent(),
      equipmentBases: fourTierFixtureContent.equipmentBases,
      affixBands: fourTierFixtureContent.affixBands,
    };
    expect(validateContent(content)).toEqual([]);
  });

  it("rejects a four-Tier catalog missing a Tier III weapon base", () => {
    const bases = fourTierFixtureContent.equipmentBases.filter(
      (base) => !(base.tier === 3 && base.slot === "weapon" && base.weaponClass === "knight"),
    );
    const content: Content = {
      ...buildContent(),
      equipmentBases: bases,
      affixBands: fourTierFixtureContent.affixBands,
    };
    expect(validateContent(content)).toContain(
      'equipmentBases tier 3 missing weapon for Class "knight"',
    );
  });

  it("rejects a four-Tier catalog missing Tier IV Affix bands", () => {
    const affixBands = fourTierFixtureContent.affixBands.map(({ tier4: _tier4, ...band }) => band);
    const content: Content = {
      ...buildContent(),
      equipmentBases: fourTierFixtureContent.equipmentBases,
      affixBands,
    };
    expect(validateContent(content)).toContain(
      'affixBands missing Equipment Tier 4 band for AffixId "flat-physical"',
    );
  });

  it("rejects a wave with a Boss alongside other Opponents", () => {
    const content: Content = {
      ...fixtureContent,
      stages: [
        {
          ...fixtureContent.stages[0]!,
          waves: [
            { opponents: ["fixture-boss", "fixture-stunner"] },
            fixtureContent.stages[0]!.waves[1]!,
          ],
        },
      ],
    };

    expect(validateContent(content, { fixture: true })).toContain(
      'stage 1 wave 1 has a Boss "fixture-boss" alongside 1 other opponent(s); a wave with a Boss must contain exactly one Opponent',
    );
  });

  it("rejects a Boss encounter wave that includes companions", () => {
    const content: Content = {
      ...fixtureContent,
      stages: [
        {
          ...fixtureContent.stages[0]!,
          boss: { opponents: ["fixture-boss", "fixture-grunt"] },
        },
      ],
    };

    expect(validateContent(content, { fixture: true })).toContain(
      'stage 1 boss has a Boss "fixture-boss" alongside 1 other opponent(s); a wave with a Boss must contain exactly one Opponent',
    );
  });

  it("allows a solo Boss, solo ordinary Opponents, and multi-opponent waves without a Boss", () => {
    const content: Content = {
      ...fixtureContent,
      stages: [
        {
          ...fixtureContent.stages[0]!,
          waves: [
            { opponents: ["fixture-small-grunt", "fixture-stunner"] },
            { opponents: ["fixture-grunt"] },
          ],
          boss: { opponents: ["fixture-boss"] },
        },
      ],
    };

    const bossRuleViolations = validateContent(content, { fixture: true }).filter((violation) =>
      violation.includes("Boss"),
    );
    expect(bossRuleViolations).toEqual([]);
  });

  it("returns [] for shipped Content assembled from data modules", () => {
    expect(validateContent(buildContent())).toEqual([]);
  });

  it("requires exactly six contiguous shipped Stages", () => {
    const shipped = buildContent();
    expect(validateContent(shipped)).toEqual([]);

    const threeStages = { ...shipped, stages: shipped.stages.slice(0, 3) };
    expect(validateContent(threeStages)).toContain(
      "Content defines 3 stages, expected exactly 6",
    );

    const gap = {
      ...shipped,
      stages: shipped.stages.filter((stage) => stage.id !== 5),
    };
    expect(validateContent(gap)).toContain(
      "Content stages are not contiguous from 1: expected Stage 5, found Stage 6",
    );
  });

  it("rejects Stage 4–6 encounter budgets that diverge from ENCOUNTER_BUDGETS", () => {
    const shipped = buildContent();
    const broken = {
      ...shipped,
      opponents: shipped.opponents.map((opponent) =>
        opponent.id === "burger-drake-s4-20" ? { ...opponent, xpAward: 19 } : opponent,
      ),
    };
    expect(validateContent(broken)).toContain(
      "stage 4 wave 2 xpAward sum is 76, expected 80",
    );
  });

  it("accepts shipped expansion status tick definitions", () => {
    const scorched = buildContent().statuses.find((status) => status.id === "scorched");
    expect(scorched?.tickEveryMs).toBe(1_000);
    expect(validateContent(buildContent())).toEqual([]);
  });

  it("rejects a status with tickEveryMs but no tickEffect", () => {
    const content: Content = {
      ...fixtureContent,
      statuses: [
        ...fixtureContent.statuses,
        {
          id: "bad-tick",
          name: "Bad Tick",
          kind: "debuff",
          durationMs: 1000,
          tickEveryMs: 500,
        },
      ],
    };
    expect(validateContent(content, { fixture: true })).toContain(
      'status "bad-tick" must declare both tickEveryMs and tickEffect, or neither',
    );
  });

  it("rejects a non-positive tickEveryMs interval", () => {
    const content: Content = {
      ...fixtureContent,
      statuses: [
        ...fixtureContent.statuses,
        {
          id: "fast-tick",
          name: "Fast Tick",
          kind: "debuff",
          durationMs: 1000,
          tickEveryMs: 0,
          tickEffect: { kind: "damage", channel: "physical", coefficient: 0.1 },
        },
      ],
    };
    expect(validateContent(content, { fixture: true })).toContain(
      'status "fast-tick" tickEveryMs must be a positive integer',
    );
  });

  it("rejects a tickEffect that is not damage", () => {
    const content: Content = {
      ...fixtureContent,
      statuses: [
        ...fixtureContent.statuses,
        {
          id: "heal-tick",
          name: "Heal Tick",
          kind: "buff",
          durationMs: 1000,
          tickEveryMs: 500,
          tickEffect: { kind: "heal", coefficient: 0.2 },
        },
      ],
    };
    expect(validateContent(content, { fixture: true })).toContain(
      'status "heal-tick" tickEffect must be damage',
    );
  });

  it("rejects duplicate Talent ids across Tier 1 and later Tiers", () => {
    const knight = fixtureContent.classes.find((entry) => entry.id === "knight")!;
    const content: Content = {
      ...fixtureContent,
      classes: fixtureContent.classes.map((classKit) =>
        classKit.id === "knight"
          ? {
              ...knight,
              talentTiers: [
                {
                  ...knight.talents,
                  statRow: [
                    { ...knight.talents.statRow[0]!, id: "k-fortitude" },
                    knight.talents.statRow[1]!,
                  ],
                },
              ],
            }
          : classKit,
      ),
    };

    expect(validateContent(content, { fixture: true })).toContain(
      'class "knight" talent id "k-fortitude" is duplicated across talents and talentTiers[0]',
    );
  });

  it("rejects a later Tier Ability reference that does not resolve", () => {
    const knight = fixtureContent.classes.find((entry) => entry.id === "knight")!;
    const content: Content = {
      ...fixtureContent,
      classes: fixtureContent.classes.map((classKit) =>
        classKit.id === "knight"
          ? {
              ...knight,
              talentTiers: [
                {
                  statRow: [
                    {
                      id: "k2-fortitude",
                      name: "Fortitude II",
                      perRank: { percent: { maxHealth: 0.04 } },
                      maxRanks: 5,
                      iconKey: "k2-fortitude",
                    },
                    {
                      id: "k2-swordcraft",
                      name: "Swordcraft II",
                      perRank: { percent: { physicalPower: 0.04 } },
                      maxRanks: 5,
                      iconKey: "k2-swordcraft",
                    },
                  ],
                  abilityRow: ["k-missing-tier-two", "k-falling-star"],
                },
              ],
            }
          : classKit,
      ),
    };

    expect(validateContent(content, { fixture: true })).toContain(
      'class "knight" talentTiers[0] abilityId "k-missing-tier-two" not found',
    );
  });

  it("reports an Ability with no effects", () => {
    const content: Content = {
      ...fixtureContent,
      abilities: fixtureContent.abilities.map((ability) =>
        ability.id === "k-sweep" ? { ...ability, effects: [] } : ability,
      ),
    };
    expect(validateContent(content, { fixture: true })).toContain(
      'ability "k-sweep" must declare at least one effect',
    );
  });

  it("reports zero or negative damage, heal, and revive coefficients while omitted coefficients stay valid", () => {
    const base = fixtureContent.abilities.find((ability) => ability.id === "k-sweep")!;
    const content: Content = {
      ...fixtureContent,
      abilities: [
        ...fixtureContent.abilities.filter((ability) => ability.id !== "k-sweep"),
        { ...base, id: "k-zero-damage", effects: [{ kind: "damage", channel: "physical", coefficient: 0 }] },
        {
          ...base,
          id: "k-omitted-coeff",
          effects: [{ kind: "damage", channel: "physical" }],
        },
        {
          ...base,
          id: "k-negative-heal",
          classId: "priest",
          effects: [{ kind: "heal", coefficient: -0.1 }],
        },
        {
          ...base,
          id: "k-zero-revive",
          classId: "priest",
          effects: [{ kind: "revive", coefficient: 0 }],
        },
      ],
    };
    const violations = validateContent(content, { fixture: true });
    expect(violations).toEqual(
      expect.arrayContaining([
        'ability "k-zero-damage" damage effect coefficient must be greater than 0',
        'ability "k-negative-heal" heal effect coefficient must be greater than 0',
        'ability "k-zero-revive" revive effect coefficient must be greater than 0',
      ]),
    );
    expect(violations).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("k-omitted-coeff"),
      ]),
    );
  });

  it("reports apply-status without a non-empty statusId and preserves unknown-status errors", () => {
    const base = fixtureContent.abilities.find((ability) => ability.id === "k-sweep")!;
    const content: Content = {
      ...fixtureContent,
      abilities: [
        ...fixtureContent.abilities.filter((ability) => ability.id !== "k-sweep"),
        {
          ...base,
          id: "k-empty-status",
          effects: [{ kind: "apply-status", statusId: "" }],
        },
        {
          ...base,
          id: "k-missing-status",
          effects: [{ kind: "apply-status" }],
        },
        {
          ...base,
          id: "k-unknown-status",
          effects: [{ kind: "apply-status", statusId: "not-a-status" }],
        },
      ],
    };
    const violations = validateContent(content, { fixture: true });
    expect(violations).toEqual(
      expect.arrayContaining([
        'ability "k-empty-status" apply-status effect must declare a non-empty statusId',
        'ability "k-missing-status" apply-status effect must declare a non-empty statusId',
        'ability "k-unknown-status" effect references unknown status "not-a-status"',
      ]),
    );
  });

  it("reports non-positive and non-integer Status Effect durations", () => {
    const content: Content = {
      ...fixtureContent,
      statuses: [
        ...fixtureContent.statuses,
        {
          id: "zero-duration",
          name: "Zero Duration",
          kind: "buff",
          durationMs: 0,
          modifiers: { flat: { armor: 1 } },
        },
        {
          id: "fractional-duration",
          name: "Fractional Duration",
          kind: "stun",
          durationMs: 500.5,
        },
      ],
    };
    const violations = validateContent(content, { fixture: true });
    expect(violations).toEqual(
      expect.arrayContaining([
        'status "zero-duration" durationMs must be a positive integer',
        'status "fractional-duration" durationMs must be a positive integer',
      ]),
    );
  });

  it("reports Buffs and Debuffs with no modifiers or valid tick while Stun stays valid without modifiers", () => {
    const content: Content = {
      ...fixtureContent,
      statuses: [
        ...fixtureContent.statuses,
        {
          id: "empty-buff",
          name: "Empty Buff",
          kind: "buff",
          durationMs: 1000,
        },
        {
          id: "zero-mod-debuff",
          name: "Zero Mod Debuff",
          kind: "debuff",
          durationMs: 1000,
          modifiers: { percent: { maxHealth: 0 } },
        },
        {
          id: "valid-stun",
          name: "Valid Stun",
          kind: "stun",
          durationMs: 800,
        },
      ],
    };
    const violations = validateContent(content, { fixture: true });
    expect(violations).toEqual(
      expect.arrayContaining([
        'status "empty-buff" must declare a non-zero modifier or a valid tick effect',
        'status "zero-mod-debuff" must declare a non-zero modifier or a valid tick effect',
      ]),
    );
    expect(violations).not.toEqual(
      expect.arrayContaining([expect.stringContaining("valid-stun")]),
    );
  });

  it("reports zero-damage status ticks", () => {
    const content: Content = {
      ...fixtureContent,
      statuses: [
        ...fixtureContent.statuses,
        {
          id: "zero-tick",
          name: "Zero Tick",
          kind: "debuff",
          durationMs: 2000,
          tickEveryMs: 1000,
          tickEffect: { kind: "damage", channel: "elemental", element: "fire", coefficient: 0 },
        },
      ],
    };
    expect(validateContent(content, { fixture: true })).toContain(
      'status "zero-tick" tickEffect damage coefficient must be greater than 0',
    );
  });

  it("reports Stat Talents with empty or all-zero perRank modifiers in any Talent Tier", () => {
    const knight = fixtureContent.classes.find((entry) => entry.id === "knight")!;
    const content: Content = {
      ...fixtureContent,
      classes: fixtureContent.classes.map((classKit) =>
        classKit.id === "knight"
          ? {
              ...knight,
              talents: {
                ...knight.talents,
                statRow: [
                  {
                    ...knight.talents.statRow[0]!,
                    id: "k-noop-tier-one",
                    perRank: {},
                  },
                  knight.talents.statRow[1]!,
                ],
              },
              talentTiers: [
                {
                  statRow: [
                    {
                      id: "k-noop-tier-two",
                      name: "Noop II",
                      perRank: { flat: { armor: 0 }, percent: { physicalPower: 0 } },
                      maxRanks: 5,
                      iconKey: "k-noop-tier-two",
                    },
                    knight.talents.statRow[1]!,
                  ],
                  abilityRow: knight.talentTiers?.[0]?.abilityRow ?? knight.talents.abilityRow,
                },
              ],
            }
          : classKit,
      ),
    };
    const violations = validateContent(content, { fixture: true });
    expect(violations).toEqual(
      expect.arrayContaining([
        'class "knight" talents stat talent "k-noop-tier-one" perRank has no gameplay effect',
        'class "knight" talentTiers[0] stat talent "k-noop-tier-two" perRank has no gameplay effect',
      ]),
    );
  });
});
