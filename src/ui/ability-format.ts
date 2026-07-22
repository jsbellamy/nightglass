import type { CombatActionState } from "../core/snapshot";
import type {
  AbilityDef,
  AbilityEffect,
  StatModifiers,
} from "../core/types";
import { statLines } from "./snapshot-view";

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
