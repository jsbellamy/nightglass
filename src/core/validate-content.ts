import type { AffixId, ClassId, Content, EquipmentBaseDef, EquipmentTier, OpponentDef, TalentTierDef } from "./types";

/** Per-Stage Character XP encounter budgets from issue #5 / vertical-slice-spec §7. */
export const ENCOUNTER_BUDGETS = {
  1: { wave1: 20, wave2: 20, boss: 60 },
  2: { wave1: 30, wave2: 30, boss: 90 },
  3: { wave1: 40, wave2: 40, boss: 120 },
} as const;

const ALL_AFFIX_IDS: AffixId[] = [
  "flat-physical",
  "percent-physical-power",
  "flat-elemental",
  "percent-elemental-power",
  "flat-max-health",
  "percent-max-health",
  "flat-armor",
  "flat-elemental-resistance",
];

const CLASS_IDS: ClassId[] = ["knight", "wizard", "priest", "hunter"];

function validateTalentTier(
  classKit: Content["classes"][number],
  tierDef: TalentTierDef,
  tierLabel: string,
  abilityById: Map<string, Content["abilities"][number]>,
  violations: string[],
): void {
  if (tierDef.statRow.length !== 2) {
    violations.push(`class "${classKit.id}" ${tierLabel} must declare exactly two Stat Talents`);
  }
  for (const statTalent of tierDef.statRow) {
    if (statTalent.maxRanks !== 5) {
      violations.push(
        `class "${classKit.id}" ${tierLabel} stat talent "${statTalent.id}" must have maxRanks 5`,
      );
    }
  }
  if (tierDef.abilityRow.length !== 2) {
    violations.push(`class "${classKit.id}" ${tierLabel} must declare exactly two Ability Talents`);
  }
  for (const talentId of tierDef.abilityRow) {
    const talent = abilityById.get(talentId);
    if (!talent) {
      violations.push(`class "${classKit.id}" ${tierLabel} abilityId "${talentId}" not found`);
    } else if (talent.slot !== "talent" || talent.classId !== classKit.id) {
      violations.push(`class "${classKit.id}" ${tierLabel} abilityId "${talentId}" is invalid`);
    }
  }
}

export interface ValidateContentOptions {
  /**
   * When true, relaxes full-game cardinality checks (12 Equipment Bases, three
   * Stages). Fixture Content for engine tests uses this; shipped content does not.
   */
  fixture?: boolean;
}

/**
 * Validates Content once at the construction seam. Pure and aggregate: collects
 * every violation so authors can fix them in one pass. Returns [] when valid.
 */
export function validateContent(
  content: Content,
  options: ValidateContentOptions = {},
): string[] {
  const violations: string[] = [];
  const fixture = options.fixture === true;

  const abilityById = indexById(content.abilities);
  const statusIds = new Set(content.statuses.map((s) => s.id));
  const opponentIds = new Set(content.opponents.map((o) => o.id));
  const opponentById = new Map(content.opponents.map((entry) => [entry.id, entry]));
  const classIds = new Set(content.classes.map((c) => c.id));

  violations.push(...duplicateIds(content.abilities, "abilities"));
  violations.push(...duplicateIds(content.classes, "classes"));
  violations.push(...duplicateIds(content.opponents, "opponents"));
  violations.push(...duplicateIds(content.stages, "stages"));
  violations.push(...duplicateIds(content.statuses, "statuses"));
  violations.push(...duplicateIds(content.equipmentBases, "equipmentBases"));
  violations.push(...duplicateIds(content.affixBands, "affixBands"));

  for (const ability of content.abilities) {
    if (ability.slot !== "basic" && ability.cooldownMs <= 0) {
      violations.push(
        `ability "${ability.id}" slot "${ability.slot}" must have cooldownMs > 0`,
      );
    }

    if (!classIds.has(ability.classId)) {
      violations.push(
        `ability "${ability.id}" classId "${ability.classId}" does not resolve to a Class`,
      );
    }

    for (const effect of ability.effects) {
      if (effect.kind === "apply-status" && effect.statusId && !statusIds.has(effect.statusId)) {
        violations.push(
          `ability "${ability.id}" effect references unknown status "${effect.statusId}"`,
        );
      }
    }
  }

  for (const classKit of content.classes) {
    const basic = abilityById.get(classKit.basicAbilityId);
    if (!basic) {
      violations.push(
        `class "${classKit.id}" basicAbilityId "${classKit.basicAbilityId}" not found`,
      );
    } else if (basic.slot !== "basic" || basic.classId !== classKit.id) {
      violations.push(`class "${classKit.id}" basicAbilityId "${classKit.basicAbilityId}" is invalid`);
    }

    const coreIds = new Set(classKit.coreAbilityIds);
    if (coreIds.size !== classKit.coreAbilityIds.length) {
      violations.push(`class "${classKit.id}" coreAbilityIds must be four distinct ids`);
    }
    if (classKit.coreAbilityIds.length !== 4) {
      violations.push(`class "${classKit.id}" must declare exactly four Core Abilities`);
    }
    for (const coreId of classKit.coreAbilityIds) {
      const core = abilityById.get(coreId);
      if (!core) {
        violations.push(`class "${classKit.id}" coreAbilityId "${coreId}" not found`);
      } else if (core.slot !== "core" || core.classId !== classKit.id) {
        violations.push(`class "${classKit.id}" coreAbilityId "${coreId}" is invalid`);
      }
    }

    validateTalentTier(classKit, classKit.talents, "talents", abilityById, violations);
    if (classKit.talentTiers) {
      classKit.talentTiers.forEach((tierDef, tierIndex) => {
        validateTalentTier(
          classKit,
          tierDef,
          `talentTiers[${tierIndex}]`,
          abilityById,
          violations,
        );
      });
    }

    const talentAbilityIds = [
      ...classKit.talents.abilityRow,
      ...(classKit.talentTiers?.flatMap((tier) => tier.abilityRow) ?? []),
    ];

    const unlockable = new Set([...classKit.coreAbilityIds, ...talentAbilityIds]);
    const loadoutIds = new Set(classKit.defaultLoadout);
    if (loadoutIds.size !== classKit.defaultLoadout.length) {
      violations.push(`class "${classKit.id}" defaultLoadout must contain three distinct ids`);
    }
    for (const loadoutId of classKit.defaultLoadout) {
      if (!unlockable.has(loadoutId)) {
        violations.push(
          `class "${classKit.id}" defaultLoadout id "${loadoutId}" is not an unlockable Ability`,
        );
      }
    }
  }

  for (const opponent of content.opponents) {
    for (const abilityId of opponent.abilityIds) {
      if (!abilityById.has(abilityId)) {
        violations.push(`opponent "${opponent.id}" abilityId "${abilityId}" not found`);
      }
    }
  }

  for (const stage of content.stages) {
    const oddsSum = stage.rarityOdds.reduce((sum, odd) => sum + odd, 0);
    if (oddsSum !== 100) {
      violations.push(
        `stage ${stage.id} rarityOdds sum to ${oddsSum}, expected 100`,
      );
    }

    const budget =
      stage.id === 1 || stage.id === 2 || stage.id === 3
        ? ENCOUNTER_BUDGETS[stage.id]
        : undefined;
    if (!budget) {
      violations.push(`stage ${stage.id} has no authored encounter budget`);
    } else {
      violations.push(
        ...waveBudgetViolations(stage.id, "wave 1", stage.waves[0], budget.wave1, opponentIds, content),
      );
      violations.push(
        ...waveBudgetViolations(stage.id, "wave 2", stage.waves[1], budget.wave2, opponentIds, content),
      );
      violations.push(
        ...waveBudgetViolations(stage.id, "boss", stage.boss, budget.boss, opponentIds, content),
      );
    }

    violations.push(
      ...bossSoloWaveViolations(stage.id, "wave 1", stage.waves[0], opponentById),
    );
    violations.push(
      ...bossSoloWaveViolations(stage.id, "wave 2", stage.waves[1], opponentById),
    );
    violations.push(
      ...bossSoloWaveViolations(stage.id, "boss", stage.boss, opponentById),
    );

    for (const [waveIndex, wave] of stage.waves.entries()) {
      if (wave.opponents.length === 0) {
        violations.push(`stage ${stage.id} wave ${waveIndex + 1} has no opponents`);
      }
      for (const opponentId of wave.opponents) {
        if (!opponentIds.has(opponentId)) {
          violations.push(
            `stage ${stage.id} wave ${waveIndex + 1} references unknown opponent "${opponentId}"`,
          );
        }
      }
    }

    if (stage.boss.opponents.length === 0) {
      violations.push(`stage ${stage.id} boss encounter has no opponents`);
    }
    for (const opponentId of stage.boss.opponents) {
      if (!opponentIds.has(opponentId)) {
        violations.push(`stage ${stage.id} boss references unknown opponent "${opponentId}"`);
      }
    }
  }

  const affixIds = new Set(content.affixBands.map((band) => band.id));
  for (const affixId of ALL_AFFIX_IDS) {
    if (!affixIds.has(affixId)) {
      violations.push(`affixBands missing AffixId "${affixId}"`);
    }
  }

  if (!fixture) {
    if (content.stages.length !== 3) {
      violations.push(`Content defines ${content.stages.length} stages, expected exactly 3`);
    }

    violations.push(...equipmentBaseCardinalityViolations(content.equipmentBases));
    violations.push(...affixBandTierViolations(content.affixBands, content.equipmentBases));
  }

  return violations;
}

function waveBudgetViolations(
  stageId: number,
  label: string,
  wave: { opponents: string[] },
  expectedBudget: number,
  opponentIds: Set<string>,
  content: Content,
): string[] {
  if (wave.opponents.length === 0) {
    return [];
  }

  let sum = 0;
  for (const opponentId of wave.opponents) {
    if (!opponentIds.has(opponentId)) {
      continue;
    }
    const opponent = content.opponents.find((entry) => entry.id === opponentId);
    if (opponent) {
      sum += opponent.xpAward;
    }
  }

  if (sum !== expectedBudget) {
    return [
      `stage ${stageId} ${label} xpAward sum is ${sum}, expected ${expectedBudget}`,
    ];
  }
  return [];
}

function bossSoloWaveViolations(
  stageId: number,
  waveLabel: string,
  wave: { opponents: string[] },
  opponentById: Map<string, OpponentDef>,
): string[] {
  if (wave.opponents.length <= 1) {
    return [];
  }

  const violations: string[] = [];
  for (const opponentId of wave.opponents) {
    const opponent = opponentById.get(opponentId);
    if (opponent?.boss) {
      violations.push(
        `stage ${stageId} ${waveLabel} has a Boss "${opponentId}" alongside ${wave.opponents.length - 1} other opponent(s); a wave with a Boss must contain exactly one Opponent`,
      );
    }
  }
  return violations;
}

function authoredEquipmentTiers(bases: EquipmentBaseDef[]): EquipmentTier[] {
  const present = new Set(bases.map((base) => base.tier));
  return ([1, 2, 3, 4] as const).filter((tier) => present.has(tier));
}

function affixBandTierViolations(
  bands: Content["affixBands"],
  equipmentBases: EquipmentBaseDef[],
): string[] {
  const violations: string[] = [];
  const authoredTiers = authoredEquipmentTiers(equipmentBases);

  for (const tier of authoredTiers) {
    if (tier < 3) {
      continue;
    }
    const field = tier === 3 ? "tier3" : "tier4";
    for (const affixId of ALL_AFFIX_IDS) {
      const band = bands.find((entry) => entry.id === affixId);
      if (!band || band[field] === undefined) {
        violations.push(
          `affixBands missing Equipment Tier ${tier} band for AffixId "${affixId}"`,
        );
      }
    }
  }

  return violations;
}

function equipmentBaseCardinalityViolations(bases: EquipmentBaseDef[]): string[] {
  const violations: string[] = [];
  const authoredTiers = authoredEquipmentTiers(bases);

  if (authoredTiers.length === 0) {
    violations.push("equipmentBases defines 0 entries, expected at least 6");
    return violations;
  }

  const expectedTotal = authoredTiers.length * 6;
  if (bases.length !== expectedTotal) {
    violations.push(
      `equipmentBases defines ${bases.length} entries, expected exactly ${expectedTotal}`,
    );
  }

  for (const tier of authoredTiers) {
    const tierBases = bases.filter((base) => base.tier === tier);
    if (tierBases.length !== 6) {
      violations.push(`equipmentBases tier ${tier} defines ${tierBases.length} entries, expected 6`);
    }

    for (const classId of CLASS_IDS) {
      const weapon = tierBases.find(
        (base) => base.slot === "weapon" && base.weaponClass === classId,
      );
      if (!weapon) {
        violations.push(`equipmentBases tier ${tier} missing weapon for Class "${classId}"`);
      }
    }

    if (!tierBases.some((base) => base.slot === "armor" && base.weaponClass === undefined)) {
      violations.push(`equipmentBases tier ${tier} missing universal Armor Equipment base`);
    }

    if (!tierBases.some((base) => base.slot === "charm" && base.weaponClass === undefined)) {
      violations.push(`equipmentBases tier ${tier} missing universal Charm base`);
    }
  }

  return violations;
}

function indexById<T extends { id: string }>(entries: T[]): Map<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function duplicateIds(entries: { id: string | number }[], collectionName: string): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const id = String(entry.id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const messages: string[] = [];
  for (const [id, count] of counts) {
    if (count > 1) {
      messages.push(`${collectionName} contains ${count} entries with id "${id}"`);
    }
  }
  return messages;
}
