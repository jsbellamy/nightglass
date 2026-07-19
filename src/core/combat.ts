import type {
  AbilityDef,
  AbilityEffect,
  AbilityTargeting,
  BaseStats,
  ClassKitDef,
  Content,
  DamageChannel,
  OpponentDef,
  StatusEffectDef,
  StatModifiers,
} from "./types";
import type { ActiveStatus, CombatantState } from "./snapshot";

export function applyStatModifiers(
  base: BaseStats,
  modifiers: StatModifiers[],
): BaseStats {
  const flat: Partial<BaseStats> = {};
  const percent = { maxHealth: 0, physicalPower: 0, elementalPower: 0 };

  for (const modifier of modifiers) {
    if (modifier.flat) {
      for (const [key, value] of Object.entries(modifier.flat) as Array<
        [keyof BaseStats, number | undefined]
      >) {
        if (value !== undefined) {
          flat[key] = (flat[key] ?? 0) + value;
        }
      }
    }
    if (modifier.percent) {
      percent.maxHealth += modifier.percent.maxHealth ?? 0;
      percent.physicalPower += modifier.percent.physicalPower ?? 0;
      percent.elementalPower += modifier.percent.elementalPower ?? 0;
    }
  }

  const physical = base.physical + (flat.physical ?? 0);
  const elemental = base.elemental + (flat.elemental ?? 0);
  const maxHealth = base.maxHealth + (flat.maxHealth ?? 0);
  const armor = base.armor + (flat.armor ?? 0);
  const elementalResistance = base.elementalResistance + (flat.elementalResistance ?? 0);

  return {
    maxHealth: Math.floor(maxHealth * (1 + percent.maxHealth)),
    physical: Math.floor(physical * (1 + percent.physicalPower)),
    elemental: Math.floor(elemental * (1 + percent.elementalPower)),
    armor: Math.max(0, armor),
    elementalResistance: Math.max(0, elementalResistance),
  };
}

export function effectiveStats(
  base: BaseStats,
  statuses: ActiveStatus[],
  statusDefs: Map<string, StatusEffectDef>,
): BaseStats {
  const modifiers = statuses
    .map((status) => statusDefs.get(status.statusId)?.modifiers)
    .filter((modifier): modifier is StatModifiers => modifier !== undefined);
  return applyStatModifiers(base, modifiers);
}

export function powerForStats(stats: BaseStats, channel: DamageChannel): number {
  return channel === "physical" ? stats.physical : stats.elemental;
}

export function mitigateDamage(raw: number, mitigation: number): number {
  const clamped = Math.max(0, mitigation);
  return Math.max(1, Math.floor((raw * 100) / (100 + clamped)));
}

export function mitigationForChannel(stats: BaseStats, channel: DamageChannel): number {
  return channel === "physical" ? stats.armor : stats.elementalResistance;
}

export function rawFromCoefficient(power: number, coefficient: number): number {
  return Math.floor(power * coefficient);
}

export function rawDamageFromEffect(power: number, effect: AbilityEffect): number {
  return rawFromCoefficient(power, effect.coefficient ?? 1);
}

export function partyBasicAbility(content: Content, classKit: ClassKitDef): AbilityDef {
  const ability = content.abilities.find((entry) => entry.id === classKit.basicAbilityId);
  if (!ability) {
    throw new Error(`Missing basic ability ${classKit.basicAbilityId} for ${classKit.id}`);
  }
  return ability;
}

export function opponentBasicAbility(content: Content, opponent: OpponentDef): AbilityDef {
  for (const abilityId of opponent.abilityIds) {
    const ability = content.abilities.find((entry) => entry.id === abilityId);
    if (ability?.slot === "basic") {
      return ability;
    }
  }

  return {
    id: `${opponent.id}-basic-interim`,
    name: "Strike",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 400,
    recoveryMs: 600,
    cooldownMs: 0,
  };
}

export function livingCombatants(combatants: CombatantState[]): CombatantState[] {
  return combatants.filter((combatant) => !combatant.knockedOut);
}

export function partyCombatants(combatants: CombatantState[]): CombatantState[] {
  return combatants.filter((combatant) => combatant.side === "party");
}

export function opponentCombatants(combatants: CombatantState[]): CombatantState[] {
  return combatants.filter((combatant) => combatant.side === "opponent");
}

export function combatantById(
  combatants: CombatantState[],
  entityId: string,
): CombatantState | undefined {
  return combatants.find((combatant) => combatant.entityId === entityId);
}

export function isCombatantStunned(
  combatant: CombatantState,
  statusDefs: Map<string, StatusEffectDef>,
): boolean {
  return combatant.statuses.some(
    (status) => statusDefs.get(status.statusId)?.kind === "stun",
  );
}

function alliesForSide(
  actor: CombatantState,
  combatants: CombatantState[],
): CombatantState[] {
  return actor.side === "party" ? partyCombatants(combatants) : opponentCombatants(combatants);
}

function opponentsForSide(
  actor: CombatantState,
  combatants: CombatantState[],
): CombatantState[] {
  return actor.side === "party" ? opponentCombatants(combatants) : partyCombatants(combatants);
}

export function selectClosestOpponent(
  actor: CombatantState,
  combatants: CombatantState[],
): CombatantState | null {
  const living = livingCombatants(opponentsForSide(actor, combatants));
  return living[0] ?? null;
}

export function selectLowestHealthAlly(
  actor: CombatantState,
  combatants: CombatantState[],
): CombatantState | null {
  const allies = alliesForSide(actor, combatants);
  const wounded = allies.filter((ally) => !ally.knockedOut && ally.health < ally.maxHealth);
  if (wounded.length === 0) {
    return null;
  }

  let best = wounded[0]!;
  for (const ally of wounded) {
    const allyPct = ally.health / ally.maxHealth;
    const bestPct = best.health / best.maxHealth;
    if (allyPct < bestPct) {
      best = ally;
    } else if (allyPct === bestPct && allies.indexOf(ally) < allies.indexOf(best)) {
      best = ally;
    }
  }
  return best;
}

export function selectFirstKnockedOutAlly(
  actor: CombatantState,
  combatants: CombatantState[],
): CombatantState | null {
  const allies = alliesForSide(actor, combatants);
  return allies.find((ally) => ally.knockedOut) ?? null;
}

export function resolveTargets(
  targeting: AbilityTargeting,
  actor: CombatantState,
  combatants: CombatantState[],
): CombatantState[] {
  switch (targeting.kind) {
    case "closest-opponent": {
      const target = selectClosestOpponent(actor, combatants);
      return target ? [target] : [];
    }
    case "self":
      return [actor];
    case "all-opponents":
      return livingCombatants(opponentsForSide(actor, combatants));
    case "party":
      return livingCombatants(alliesForSide(actor, combatants));
    case "lowest-health-ally": {
      const target = selectLowestHealthAlly(actor, combatants);
      return target ? [target] : [];
    }
    case "first-knocked-out-ally": {
      const target = selectFirstKnockedOutAlly(actor, combatants);
      return target ? [target] : [];
    }
    default:
      return [];
  }
}

export function selectTarget(
  targeting: AbilityTargeting,
  actor: CombatantState,
  combatants: CombatantState[],
): CombatantState | null {
  return resolveTargets(targeting, actor, combatants)[0] ?? null;
}

export function revalidateTargets(
  targeting: AbilityTargeting,
  actor: CombatantState,
  combatants: CombatantState[],
  originalTargetIds: string[],
): CombatantState[] {
  if (targeting.kind === "all-opponents" || targeting.kind === "party") {
    return resolveTargets(targeting, actor, combatants);
  }

  if (targeting.kind === "first-knocked-out-ally") {
    const original = originalTargetIds[0]
      ? combatantById(combatants, originalTargetIds[0])
      : undefined;
    if (original?.knockedOut) {
      return [original];
    }
    return resolveTargets(targeting, actor, combatants);
  }

  const original = originalTargetIds[0]
    ? combatantById(combatants, originalTargetIds[0])
    : undefined;
  if (original && isTargetValid(targeting, original)) {
    return [original];
  }
  const replacement = selectTarget(targeting, actor, combatants);
  return replacement ? [replacement] : [];
}

export function isTargetValid(
  targeting: AbilityTargeting,
  target: CombatantState,
): boolean {
  switch (targeting.kind) {
    case "closest-opponent":
    case "self":
    case "all-opponents":
    case "party":
      return !target.knockedOut;
    case "lowest-health-ally":
      return !target.knockedOut && target.health < target.maxHealth;
    case "first-knocked-out-ally":
      return target.knockedOut;
    default:
      return false;
  }
}

export function statusIdForValidity(ability: AbilityDef): string | undefined {
  return ability.effects.find((effect) => effect.kind === "apply-status")?.statusId;
}

export function isAbilityValid(
  ability: AbilityDef,
  actor: CombatantState,
  combatants: CombatantState[],
): boolean {
  if (ability.validWhile === "status-absent") {
    const statusId = statusIdForValidity(ability);
    if (statusId && actor.statuses.some((status) => status.statusId === statusId)) {
      return false;
    }
  }
  if (ability.validWhile === "any-ally-missing-health") {
    return alliesForSide(actor, combatants).some(
      (ally) => !ally.knockedOut && ally.health < ally.maxHealth,
    );
  }
  if (ability.validWhile === "below-half-health") {
    return actor.maxHealth > 0 && actor.health / actor.maxHealth < 0.5;
  }
  return true;
}

export function hasValidTarget(
  ability: AbilityDef,
  actor: CombatantState,
  combatants: CombatantState[],
): boolean {
  return resolveTargets(ability.targeting, actor, combatants).length > 0;
}

export function chooseFirstValidAbility(
  candidates: AbilityDef[],
  actor: CombatantState,
  combatants: CombatantState[],
  nowMs: number,
): AbilityDef | null {
  for (const ability of candidates) {
    const readyAt = actor.cooldownReadyAtMs[ability.id] ?? 0;
    if (readyAt > nowMs) {
      continue;
    }
    if (!isAbilityValid(ability, actor, combatants)) {
      continue;
    }
    if (!hasValidTarget(ability, actor, combatants)) {
      continue;
    }
    return ability;
  }
  return null;
}

export function partyAbilityCandidates(
  content: Content,
  classKit: ClassKitDef,
  loadout: [string, string, string],
  abilitiesById: Map<string, AbilityDef>,
): AbilityDef[] {
  const loadoutAbilities = loadout
    .map((abilityId) => abilitiesById.get(abilityId))
    .filter((ability): ability is AbilityDef => ability !== undefined);
  return [...loadoutAbilities, partyBasicAbility(content, classKit)];
}

export function opponentAbilityCandidates(
  content: Content,
  opponent: OpponentDef,
  abilitiesById: Map<string, AbilityDef>,
): AbilityDef[] {
  const authored = opponent.abilityIds
    .map((abilityId) => abilitiesById.get(abilityId))
    .filter((ability): ability is AbilityDef => ability !== undefined);
  const basic = opponentBasicAbility(content, opponent);
  if (!authored.some((ability) => ability.id === basic.id)) {
    return [...authored, basic];
  }
  return authored;
}

export function healAmount(power: number, effect: AbilityEffect): number {
  return rawFromCoefficient(power, effect.coefficient ?? 1);
}

export function clampHeal(currentHealth: number, maxHealth: number, amount: number): number {
  return Math.min(maxHealth, currentHealth + amount);
}

export function shouldApplyStun(
  target: CombatantState,
  opponentDefs: Map<string, OpponentDef>,
): boolean {
  if (target.side !== "opponent") {
    return true;
  }
  const opponent = opponentDefs.get(target.defId);
  return !opponent?.boss;
}
