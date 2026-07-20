import { describe, expect, it } from "vitest";
import type {
  AbilityDef,
  AffixBandDef,
  ClassKitDef,
  Content,
  EquipmentBaseDef,
  OpponentDef,
  StageDef,
  StatusEffectDef,
} from "./types";
import { fixtureContent } from "./testing/fixture-content";
import { validateContent } from "./validate-content";

describe("domain content types", () => {
  it("fixture Content satisfies the Content interface at compile time", () => {
    const content: Content = fixtureContent;
    expect(content.classes).toHaveLength(3);
  });

  it("carries load-bearing field names from the content contract", () => {
    const ability: AbilityDef = fixtureContent.abilities[0]!;
    expect(ability).toMatchObject({
      windUpMs: expect.any(Number),
      recoveryMs: expect.any(Number),
      cooldownMs: expect.any(Number),
    });

    const classKit: ClassKitDef = fixtureContent.classes[0]!;
    expect(classKit).toMatchObject({
      basicAbilityId: expect.any(String),
      coreAbilityIds: expect.any(Array),
      defaultLoadout: expect.any(Array),
    });

    const opponent: OpponentDef = fixtureContent.opponents[0]!;
    expect(opponent).toMatchObject({
      size: "medium",
      xpAward: expect.any(Number),
      spriteKey: expect.any(String),
    });

    const stage: StageDef = fixtureContent.stages[0]!;
    expect(stage).toMatchObject({
      rarityOdds: expect.any(Array),
      backdropKey: expect.any(String),
    });

    const equipment: EquipmentBaseDef = fixtureContent.equipmentBases[0]!;
    expect(equipment).toMatchObject({
      guaranteed: expect.any(Object),
      iconKey: expect.any(String),
    });

    const affix: AffixBandDef = fixtureContent.affixBands[0]!;
    expect(affix.tier1).toHaveLength(2);
    expect(affix.tier2).toHaveLength(2);

    const status: StatusEffectDef = fixtureContent.statuses[0]!;
    expect(status.durationMs).toBeGreaterThan(0);
  });

  it("imports fixture Content from a test that exercises validation", () => {
    expect(validateContent(fixtureContent, { fixture: true })).toEqual([]);
  });
});
