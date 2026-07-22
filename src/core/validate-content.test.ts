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
});
