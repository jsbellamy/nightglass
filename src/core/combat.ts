import type {
  AbilityDef,
  AbilityEffect,
  AbilityTargeting,
  BaseStats,
  ClassKitDef,
  Content,
  DamageChannel,
  OpponentDef,
} from "./types";
import type { CombatantState } from "./snapshot";

/** Interim basic-attack-only combat — replaced by issue #36. */

export function powerForStats(stats: BaseStats, channel: DamageChannel): number {
  const base = channel === "physical" ? stats.physical : stats.elemental;
  return Math.floor(base * 1);
}

export function mitigateDamage(raw: number, mitigation: number): number {
  const clamped = Math.max(0, mitigation);
  return Math.max(1, Math.floor((raw * 100) / (100 + clamped)));
}

export function mitigationForChannel(stats: BaseStats, channel: DamageChannel): number {
  return channel === "physical" ? stats.armor : stats.elementalResistance;
}

export function rawDamageFromEffect(
  power: number,
  effect: AbilityEffect,
): number {
  const coefficient = effect.coefficient ?? 1;
  return Math.floor(power * coefficient);
}

export function partyBasicAbility(content: Content, classKit: ClassKitDef): AbilityDef {
  const ability = content.abilities.find((entry) => entry.id === classKit.basicAbilityId);
  if (!ability) {
    throw new Error(`Missing basic ability ${classKit.basicAbilityId} for ${classKit.id}`);
  }
  return ability;
}

export function opponentBasicAbility(
  content: Content,
  opponent: OpponentDef,
): AbilityDef {
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

export function selectTarget(
  targeting: AbilityTargeting,
  actor: CombatantState,
  combatants: CombatantState[],
): CombatantState | null {
  const livingParty = livingCombatants(partyCombatants(combatants));
  const livingOpponents = livingCombatants(opponentCombatants(combatants));

  switch (targeting.kind) {
    case "closest-opponent":
      return actor.side === "party" ? (livingOpponents[0] ?? null) : (livingParty[0] ?? null);
    case "lowest-health-ally": {
      const allies = actor.side === "party" ? livingParty : livingOpponents;
      return (
        allies
          .filter((ally) => ally.health < ally.maxHealth)
          .sort(
            (left, right) =>
              left.health / left.maxHealth - right.health / right.maxHealth,
          )[0] ?? null
      );
    }
    default:
      return null;
  }
}

export function revalidateTarget(
  targeting: AbilityTargeting,
  actor: CombatantState,
  combatants: CombatantState[],
  originalTargetId: string | undefined,
): CombatantState | null {
  if (originalTargetId) {
    const original = combatantById(combatants, originalTargetId);
    if (original && !original.knockedOut) {
      return original;
    }
  }
  return selectTarget(targeting, actor, combatants);
}
