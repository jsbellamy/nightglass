import {
  healAmount,
  powerForStats,
  rawDamageFromEffect,
} from "../core/combat";
import type { CombatActionState } from "../core/snapshot";
import type {
  AbilityDef,
  AbilityEffect,
  BaseStats,
  StatModifiers,
} from "../core/types";

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

export interface StatLine {
  label: string;
  value: string;
}

function formatSignedStatAmount(amount: number, asPercent: boolean): string {
  const rounded = asPercent ? Math.round(amount) : amount;
  if (rounded === 0) {
    return asPercent ? "+0%" : "+0";
  }
  const prefix = rounded > 0 ? `+${rounded}` : String(rounded);
  return asPercent ? `${prefix}%` : prefix;
}

/** One walk over StatModifiers. `ranks` multiplies both flat and percent entries. */
export function statLines(modifier: StatModifiers, ranks = 1): StatLine[] {
  const lines: StatLine[] = [];
  if (modifier.percent?.maxHealth) {
    lines.push({
      label: "Max Health",
      value: formatSignedStatAmount(modifier.percent.maxHealth * ranks * 100, true),
    });
  }
  if (modifier.percent?.physicalPower) {
    lines.push({
      label: "Physical",
      value: formatSignedStatAmount(modifier.percent.physicalPower * ranks * 100, true),
    });
  }
  if (modifier.percent?.elementalPower) {
    lines.push({
      label: "Elemental",
      value: formatSignedStatAmount(modifier.percent.elementalPower * ranks * 100, true),
    });
  }
  if (modifier.flat?.maxHealth) {
    lines.push({
      label: "Max Health",
      value: formatSignedStatAmount(modifier.flat.maxHealth * ranks, false),
    });
  }
  if (modifier.flat?.physical) {
    lines.push({
      label: "Physical",
      value: formatSignedStatAmount(modifier.flat.physical * ranks, false),
    });
  }
  if (modifier.flat?.elemental) {
    lines.push({
      label: "Elemental",
      value: formatSignedStatAmount(modifier.flat.elemental * ranks, false),
    });
  }
  if (modifier.flat?.armor) {
    lines.push({
      label: "Armor",
      value: formatSignedStatAmount(modifier.flat.armor * ranks, false),
    });
  }
  if (modifier.flat?.elementalResistance) {
    lines.push({
      label: "Elemental Resistance",
      value: formatSignedStatAmount(modifier.flat.elementalResistance * ranks, false),
    });
  }
  return lines;
}

export function formatStatModifierPerRank(modifier: StatModifiers): string {
  return statLines(modifier)
    .map((line) => `${line.value} ${line.label}`)
    .join(", ");
}

export function formatStatTalentDelta(
  modifier: StatModifiers,
  ranks: number,
): string | null {
  if (ranks <= 0) {
    return null;
  }
  const joined = statLines(modifier, ranks)
    .map((line) => `${line.value} ${line.label}`)
    .join(", ");
  return joined.length > 0 ? joined : null;
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
