import {
  applyStatModifiers,
  healAmount,
  powerForStats,
  rawDamageFromEffect,
} from "../core/combat";
import type { CombatActionState } from "../core/snapshot";
import { talentStatModifiers, type ClassTalentState } from "../core/talents";
import type {
  AbilityDef,
  AbilityEffect,
  BaseStats,
  ClassKitDef,
  StatModifiers,
} from "../core/types";

export function characterBaseStats(
  classKit: ClassKitDef,
  talentState: ClassTalentState,
  equipmentMods: StatModifiers[] = [],
): BaseStats {
  return applyStatModifiers(classKit.base, [
    ...talentStatModifiers(talentState, classKit),
    ...equipmentMods,
  ]);
}

export interface AbilityRawDisplay {
  kind: "damage" | "heal";
  value: number;
  channel?: "physical" | "elemental";
}

export function abilityRawDisplay(
  ability: AbilityDef,
  stats: BaseStats,
): AbilityRawDisplay | null {
  for (const effect of ability.effects) {
    if (effect.kind === "damage") {
      const channel = effect.channel ?? "physical";
      return {
        kind: "damage",
        value: rawDamageFromEffect(powerForStats(stats, channel), effect),
        channel,
      };
    }
    if (effect.kind === "heal") {
      return {
        kind: "heal",
        value: healAmount(powerForStats(stats, "elemental"), effect),
      };
    }
  }
  return null;
}

export function formatAbilityRawLine(display: AbilityRawDisplay | null): string | null {
  if (!display) {
    return null;
  }
  if (display.kind === "damage") {
    return `${display.value} damage`;
  }
  return `${display.value} heal`;
}

export function formatAbilityTimings(ability: AbilityDef): string {
  const cooldown =
    ability.cooldownMs > 0 ? `${ability.cooldownMs}ms` : "none";
  return `Wind-up ${ability.windUpMs}ms · Recovery ${ability.recoveryMs}ms · Cooldown ${cooldown}`;
}

export function cooldownRemainingMs(readyAtMs: number, simNowMs: number): number {
  return Math.max(0, readyAtMs - simNowMs);
}

export function formatCooldownState(readyAtMs: number, simNowMs: number): string {
  const remaining = cooldownRemainingMs(readyAtMs, simNowMs);
  if (remaining <= 0) {
    return "Ready";
  }
  return `${remaining}ms remaining`;
}

export function actionCyclePhase(
  action: CombatActionState,
  simNowMs: number,
): "Wind-up" | "Impact" | "Recovery" | null {
  if (simNowMs < action.impactAtMs) {
    return "Wind-up";
  }
  if (!action.impactResolved) {
    return "Impact";
  }
  if (simNowMs < action.endsAtMs) {
    return "Recovery";
  }
  return null;
}

export function formatStatModifierPerRank(modifier: StatModifiers): string {
  const parts: string[] = [];
  if (modifier.percent?.maxHealth) {
    parts.push(`+${Math.round(modifier.percent.maxHealth * 100)}% Max Health`);
  }
  if (modifier.percent?.physicalPower) {
    parts.push(`+${Math.round(modifier.percent.physicalPower * 100)}% Physical`);
  }
  if (modifier.percent?.elementalPower) {
    parts.push(`+${Math.round(modifier.percent.elementalPower * 100)}% Elemental`);
  }
  if (modifier.flat?.maxHealth) {
    parts.push(`+${modifier.flat.maxHealth} Max Health`);
  }
  if (modifier.flat?.physical) {
    parts.push(`+${modifier.flat.physical} Physical`);
  }
  if (modifier.flat?.elemental) {
    parts.push(`+${modifier.flat.elemental} Elemental`);
  }
  if (modifier.flat?.armor) {
    parts.push(`+${modifier.flat.armor} Armor`);
  }
  if (modifier.flat?.elementalResistance) {
    parts.push(`+${modifier.flat.elementalResistance} Elemental Resistance`);
  }
  return parts.join(", ");
}

export function formatStatTalentDelta(
  modifier: StatModifiers,
  ranks: number,
): string | null {
  if (ranks <= 0) {
    return null;
  }
  const parts: string[] = [];
  if (modifier.percent?.maxHealth) {
    parts.push(`+${Math.round(modifier.percent.maxHealth * ranks * 100)}% Max Health`);
  }
  if (modifier.percent?.physicalPower) {
    parts.push(`+${Math.round(modifier.percent.physicalPower * ranks * 100)}% Physical`);
  }
  if (modifier.percent?.elementalPower) {
    parts.push(`+${Math.round(modifier.percent.elementalPower * ranks * 100)}% Elemental`);
  }
  if (modifier.flat?.maxHealth) {
    parts.push(`+${modifier.flat.maxHealth * ranks} Max Health`);
  }
  if (modifier.flat?.physical) {
    parts.push(`+${modifier.flat.physical * ranks} Physical`);
  }
  if (modifier.flat?.elemental) {
    parts.push(`+${modifier.flat.elemental * ranks} Elemental`);
  }
  if (modifier.flat?.armor) {
    parts.push(`+${modifier.flat.armor * ranks} Armor`);
  }
  if (modifier.flat?.elementalResistance) {
    parts.push(`+${modifier.flat.elementalResistance * ranks} Elemental Resistance`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

export function primaryEffectKind(effects: AbilityEffect[]): "damage" | "heal" | "other" {
  for (const effect of effects) {
    if (effect.kind === "damage") {
      return "damage";
    }
    if (effect.kind === "heal") {
      return "heal";
    }
  }
  return "other";
}
