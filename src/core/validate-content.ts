import type {
  AbilityEffect,
  AffixId,
  ClassId,
  Content,
  EquipmentBaseDef,
  EquipmentTier,
  OpponentDef,
  StatModifiers,
  StatusEffectDef,
  TalentTierDef,
} from "./types";

/** Per-Stage Character XP encounter budgets from issue #5 / vertical-slice-spec §7. */
export const ENCOUNTER_BUDGETS = {
  1: { waves: [20, 20], boss: 60 },
  2: { waves: [30, 30], boss: 90 },
  3: { waves: [40, 40], boss: 120 },
  4: { waves: [80, 80], boss: 240 },
  5: { waves: [100, 100], boss: 300 },
  6: { waves: [130, 130], boss: 390 },
  7: { waves: [160, 160], boss: 480 },
  8: { waves: [190, 190], boss: 570 },
  9: { waves: [260, 260], boss: 900 },
  10: { waves: [], boss: 1500 },
} as const;

type BudgetedStageId = keyof typeof ENCOUNTER_BUDGETS;

function encounterBudgetFor(stageId: number): (typeof ENCOUNTER_BUDGETS)[BudgetedStageId] | undefined {
  if (Object.prototype.hasOwnProperty.call(ENCOUNTER_BUDGETS, stageId)) {
    return ENCOUNTER_BUDGETS[stageId as BudgetedStageId];
  }
  return undefined;
}

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

export function statModifiersHaveEffect(modifiers: StatModifiers | undefined): boolean {
  if (!modifiers) {
    return false;
  }
  if (modifiers.flat) {
    for (const value of Object.values(modifiers.flat)) {
      if (value !== undefined && value !== 0) {
        return true;
      }
    }
  }
  if (modifiers.percent) {
    for (const value of Object.values(modifiers.percent)) {
      if (value !== undefined && value !== 0) {
        return true;
      }
    }
  }
  return false;
}

export function abilityEffectHasEffect(effect: AbilityEffect): boolean {
  switch (effect.kind) {
    case "damage":
    case "heal":
    case "revive":
      return effect.coefficient === undefined || effect.coefficient > 0;
    case "apply-status":
      return effect.statusId !== undefined && effect.statusId.length > 0;
  }
}

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
    if (!statModifiersHaveEffect(statTalent.perRank)) {
      violations.push(
        `class "${classKit.id}" ${tierLabel} stat talent "${statTalent.id}" perRank has no gameplay effect`,
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
   * When true, relaxes full-game cardinality checks (12 Equipment Bases, six
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
  for (const status of content.statuses) {
    violations.push(...validateStatusDuration(status));
    violations.push(...validateStatusBehavior(status));
    violations.push(...validateStatusTickSchedule(status));
  }
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

    if (ability.effects.length === 0) {
      violations.push(`ability "${ability.id}" must declare at least one effect`);
    }

    for (const effect of ability.effects) {
      violations.push(...validateAbilityEffect(ability.id, effect));
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
    violations.push(...duplicateTalentIdsAcrossTiers(classKit));

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

    const budget = encounterBudgetFor(stage.id);
    if (!budget) {
      violations.push(`stage ${stage.id} has no authored encounter budget`);
    } else {
      if (stage.waves.length !== budget.waves.length) {
        violations.push(
          `stage ${stage.id} has ${stage.waves.length} waves, expected ${budget.waves.length}`,
        );
      } else {
        for (let waveIndex = 0; waveIndex < stage.waves.length; waveIndex += 1) {
          const waveLabel = `wave ${waveIndex + 1}`;
          violations.push(
            ...waveBudgetViolations(
              stage.id,
              waveLabel,
              stage.waves[waveIndex]!,
              budget.waves[waveIndex]!,
              opponentIds,
              content,
            ),
          );
        }
      }
      violations.push(
        ...waveBudgetViolations(stage.id, "boss", stage.boss, budget.boss, opponentIds, content),
      );
    }

    for (let waveIndex = 0; waveIndex < stage.waves.length; waveIndex += 1) {
      violations.push(
        ...bossSoloWaveViolations(
          stage.id,
          `wave ${waveIndex + 1}`,
          stage.waves[waveIndex]!,
          opponentById,
        ),
      );
    }
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
    if (content.stages.length !== 10) {
      violations.push(`Content defines ${content.stages.length} stages, expected exactly 10`);
    }
    violations.push(...shippedStageContiguityViolations(content.stages));

    violations.push(...equipmentBaseCardinalityViolations(content.equipmentBases));
    violations.push(...affixBandTierViolations(content.affixBands, content.equipmentBases));
  }

  return violations;
}

function shippedStageContiguityViolations(stages: Content["stages"]): string[] {
  const violations: string[] = [];
  const orderedIds = [...stages].map((stage) => stage.id).sort((left, right) => left - right);
  for (let index = 0; index < orderedIds.length; index += 1) {
    const expectedId = index + 1;
    const actualId = orderedIds[index];
    if (actualId !== expectedId) {
      violations.push(
        `Content stages are not contiguous from 1: expected Stage ${expectedId}, found Stage ${actualId ?? "none"}`,
      );
      return violations;
    }
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

function validateAbilityEffect(abilityId: string, effect: AbilityEffect): string[] {
  const violations: string[] = [];
  switch (effect.kind) {
    case "damage":
    case "heal":
    case "revive":
      if (effect.coefficient !== undefined && effect.coefficient <= 0) {
        violations.push(
          `ability "${abilityId}" ${effect.kind} effect coefficient must be greater than 0`,
        );
      }
      break;
    case "apply-status":
      if (!effect.statusId || effect.statusId.length === 0) {
        violations.push(
          `ability "${abilityId}" apply-status effect must declare a non-empty statusId`,
        );
      }
      break;
  }
  return violations;
}

function validateStatusDuration(status: StatusEffectDef): string[] {
  if (!Number.isInteger(status.durationMs) || status.durationMs <= 0) {
    return [`status "${status.id}" durationMs must be a positive integer`];
  }
  return [];
}

function statusHasValidTickEffect(status: StatusEffectDef): boolean {
  if (status.tickEveryMs === undefined || status.tickEffect === undefined) {
    return false;
  }
  if (!Number.isInteger(status.tickEveryMs) || status.tickEveryMs <= 0) {
    return false;
  }
  const tickEffect = status.tickEffect;
  if (!abilityEffectHasEffect(tickEffect)) {
    return false;
  }
  return validateStatusTickEffect(status.id, tickEffect).length === 0;
}

function validateStatusBehavior(status: StatusEffectDef): string[] {
  if (status.kind === "stun") {
    return [];
  }
  if (status.kind !== "buff" && status.kind !== "debuff") {
    return [];
  }
  if (statModifiersHaveEffect(status.modifiers) || statusHasValidTickEffect(status)) {
    return [];
  }
  return [
    `status "${status.id}" must declare a non-zero modifier or a valid tick effect`,
  ];
}

function validateStatusTickSchedule(status: StatusEffectDef): string[] {
  const violations: string[] = [];
  const hasTickEvery = status.tickEveryMs !== undefined;
  const hasTickEffect = status.tickEffect !== undefined;

  if (hasTickEvery !== hasTickEffect) {
    violations.push(
      `status "${status.id}" must declare both tickEveryMs and tickEffect, or neither`,
    );
    return violations;
  }

  if (!hasTickEvery || status.tickEveryMs === undefined || !status.tickEffect) {
    return violations;
  }

  if (!Number.isInteger(status.tickEveryMs) || status.tickEveryMs <= 0) {
    violations.push(`status "${status.id}" tickEveryMs must be a positive integer`);
  }

  violations.push(...validateStatusTickEffect(status.id, status.tickEffect));
  return violations;
}

function validateStatusTickEffect(statusId: string, effect: AbilityEffect): string[] {
  const violations: string[] = [];
  if (effect.kind !== "damage") {
    violations.push(`status "${statusId}" tickEffect must be damage`);
    return violations;
  }
  if (effect.channel !== "physical" && effect.channel !== "elemental") {
    violations.push(`status "${statusId}" tickEffect damage must declare a channel`);
  }
  if (effect.coefficient !== undefined && effect.coefficient <= 0) {
    violations.push(`status "${statusId}" tickEffect damage coefficient must be greater than 0`);
  }
  return violations;
}

function duplicateTalentIdsAcrossTiers(classKit: Content["classes"][number]): string[] {
  const violations: string[] = [];
  const tierDefs: { label: string; def: TalentTierDef }[] = [
    { label: "talents", def: classKit.talents },
    ...(classKit.talentTiers?.map((def, tierIndex) => ({
      label: `talentTiers[${tierIndex}]`,
      def,
    })) ?? []),
  ];
  const seen = new Map<string, string>();

  for (const { label, def } of tierDefs) {
    for (const statTalent of def.statRow) {
      const prior = seen.get(statTalent.id);
      if (prior) {
        violations.push(
          `class "${classKit.id}" talent id "${statTalent.id}" is duplicated across ${prior} and ${label}`,
        );
      } else {
        seen.set(statTalent.id, label);
      }
    }
    for (const abilityId of def.abilityRow) {
      const prior = seen.get(abilityId);
      if (prior) {
        violations.push(
          `class "${classKit.id}" talent id "${abilityId}" is duplicated across ${prior} and ${label}`,
        );
      } else {
        seen.set(abilityId, label);
      }
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
