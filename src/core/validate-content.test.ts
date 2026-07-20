import { describe, expect, it } from "vitest";
import { buildContent } from "../data";
import { validateContent } from "./validate-content";
import { fixtureContent } from "./testing/fixture-content";
import type { Content, OpponentDef } from "./types";

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
      "equipmentBases defines 2 entries, expected exactly 12",
    );
  });

  it('rejects a wave with a "large" opponent alongside others', () => {
    const largeGrunt: OpponentDef = {
      ...fixtureContent.opponents[0]!,
      id: "fixture-large-grunt",
      size: "large",
    };
    const content: Content = {
      ...fixtureContent,
      opponents: [...fixtureContent.opponents, largeGrunt],
      stages: [
        {
          ...fixtureContent.stages[0]!,
          waves: [
            { opponents: ["fixture-large-grunt", "fixture-stunner"] },
            fixtureContent.stages[0]!.waves[1]!,
          ],
        },
      ],
    };

    expect(validateContent(content, { fixture: true })).toContain(
      'stage 1 wave 1 has a "large" opponent "fixture-large-grunt" alongside 1 other opponent(s); large opponents must be solo',
    );
  });

  it('allows a solo "large" opponent wave and multi-opponent waves of smaller tiers', () => {
    const largeBoss: OpponentDef = {
      ...fixtureContent.opponents[1]!,
      size: "large",
    };
    const smallGrunt: OpponentDef = {
      ...fixtureContent.opponents[0]!,
      id: "fixture-small-grunt",
      size: "small",
    };
    const content: Content = {
      ...fixtureContent,
      opponents: [
        smallGrunt,
        largeBoss,
        fixtureContent.opponents[2]!,
      ],
      stages: [
        {
          ...fixtureContent.stages[0]!,
          waves: [
            { opponents: ["fixture-small-grunt", "fixture-stunner"] },
            { opponents: ["fixture-small-grunt"] },
          ],
          boss: { opponents: ["fixture-boss"] },
        },
      ],
    };

    const violations = validateContent(content, { fixture: true });
    expect(violations).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/"large" opponent/),
      ]),
    );
  });

  it("returns [] for shipped Content assembled from data modules", () => {
    expect(validateContent(buildContent())).toEqual([]);
  });
});
