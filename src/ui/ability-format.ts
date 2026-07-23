import type { CombatActionState } from "../core/snapshot";
import type {
  AbilityDef,
  AbilityEffect,
  AbilityTargeting,
  BaseStats,
  DamageChannel,
  Element,
  StatModifiers,
  StatusEffectDef,
} from "../core/types";
import { previewEffectRaw, statLines, statusIdForValidity } from "./snapshot-view";

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

function statusMap(statuses: readonly StatusEffectDef[]): Map<string, StatusEffectDef> {
  return new Map(statuses.map((status) => [status.id, status]));
}

export function formatDurationMs(durationMs: number): string {
  const seconds = durationMs / 1000;
  if (Number.isInteger(seconds)) {
    return `${seconds}s`;
  }
  const rounded = Math.round(seconds * 10) / 10;
  return `${rounded}s`;
}

const ELEMENT_LABEL: Record<Element, string> = {
  fire: "Fire",
  frost: "Frost",
  lightning: "Lightning",
  light: "Light",
};

function damageTypeLabel(channel: DamageChannel, element?: Element): string {
  if (channel === "physical") {
    return "Physical Damage";
  }
  if (element) {
    return `${ELEMENT_LABEL[element]} Elemental Damage`;
  }
  return "Elemental Damage";
}

function targetPhrase(targeting: AbilityTargeting): string {
  switch (targeting.kind) {
    case "closest-opponent":
      return "the closest Opponent";
    case "all-opponents":
      return "all Opponents";
    case "self":
      return "yourself";
    case "party":
      return "your Party";
    case "lowest-health-ally":
      return "the lowest-health Party Member";
    case "first-knocked-out-ally":
      return "the first Knocked Out Party Member";
    default:
      return "the target";
  }
}

function targetObjectPronoun(targeting: AbilityTargeting): string {
  switch (targeting.kind) {
    case "all-opponents":
      return "them";
    case "self":
      return "yourself";
    case "party":
      return "your Party";
    default:
      return "it";
  }
}

function modifierSummary(modifiers: StatModifiers | undefined): string | null {
  if (!modifiers) {
    return null;
  }
  const joined = statLines(modifiers)
    .map((line) => `${line.value} ${line.label}`)
    .join(" and ");
  return joined.length > 0 ? joined : null;
}

function validWhilePrefix(
  ability: AbilityDef,
  statuses: readonly StatusEffectDef[],
): string {
  if (!ability.validWhile) {
    return "";
  }
  if (ability.validWhile === "below-half-health") {
    return "While below 50% Health, ";
  }
  if (ability.validWhile === "any-ally-missing-health") {
    return "While any Party Member is missing Health, ";
  }
  const statusId = statusIdForValidity(ability);
  if (!statusId) {
    return "";
  }
  const status = statusMap(statuses).get(statusId);
  const name = status?.name ?? statusId;
  return `While you lack ${name}, `;
}

function rawDamageValue(effect: AbilityEffect, stats: BaseStats): number | null {
  if (effect.kind !== "damage") {
    return null;
  }
  return previewEffectRaw(effect, stats);
}

function formatDamageClause(
  values: number[],
  channel: DamageChannel,
  element: Element | undefined,
  targeting: AbilityTargeting,
  compact: boolean,
): string {
  const joined = compact
    ? values.join(" + ")
    : values.length > 1
      ? values.join(" then ")
      : String(values[0]);
  const typeLabel = damageTypeLabel(channel, element);
  if (compact) {
    return `${joined} ${typeLabel}`;
  }
  return `Deal ${joined} ${typeLabel} to ${targetPhrase(targeting)}`;
}

function formatHealClause(
  amount: number,
  targeting: AbilityTargeting,
  compact: boolean,
): string {
  if (compact) {
    return `${amount} Healing`;
  }
  return `Heal ${targetPhrase(targeting)} for ${amount} Health`;
}

function formatReviveClause(
  amount: number,
  targeting: AbilityTargeting,
  compact: boolean,
): string {
  if (compact) {
    return `Revive with ${amount} Health`;
  }
  return `Revive ${targetPhrase(targeting)} with ${amount} Health`;
}

function formatTickClause(
  status: StatusEffectDef,
  stats: BaseStats,
  compact: boolean,
): string | null {
  if (!status.tickEveryMs || !status.tickEffect) {
    return null;
  }
  const tickRaw = previewEffectRaw(status.tickEffect, stats);
  if (tickRaw === null) {
    return null;
  }
  const channel = status.tickEffect.channel ?? "elemental";
  const typeLabel = damageTypeLabel(channel, status.tickEffect.element);
  const cadence = formatDurationMs(status.tickEveryMs);
  if (compact) {
    return `${tickRaw} ${typeLabel} every ${cadence}`;
  }
  return `dealing ${tickRaw} ${typeLabel} every ${cadence}`;
}

function formatApplyStatusClause(
  effect: AbilityEffect,
  ability: AbilityDef,
  stats: BaseStats,
  statuses: readonly StatusEffectDef[],
  compact: boolean,
): string | null {
  if (effect.kind !== "apply-status" || !effect.statusId) {
    return null;
  }
  const status = statusMap(statuses).get(effect.statusId);
  if (!status) {
    return null;
  }
  const durationMs = effect.stunMs ?? status.durationMs;
  const duration = formatDurationMs(durationMs);

  if (status.kind === "stun" || effect.stunMs !== undefined) {
    const stunDuration = formatDurationMs(effect.stunMs ?? status.durationMs);
    if (compact) {
      return `Stun ${stunDuration}`;
    }
    return `Stun ${targetObjectPronoun(ability.targeting)} for ${stunDuration}`;
  }

  const mods = modifierSummary(status.modifiers);
  const tick = formatTickClause(status, stats, compact);
  const targeting = ability.targeting;

  if (compact) {
    const parts: string[] = [];
    if (mods) {
      parts.push(`${mods} for ${duration}`);
    } else if (tick) {
      parts.push(`${tick} for ${duration}`);
    } else {
      parts.push(`${status.name} for ${duration}`);
    }
    return parts.join(", ");
  }

  const grantVerb =
    targeting.kind === "self"
      ? "grant yourself"
      : targeting.kind === "party"
        ? "grant your Party"
        : `apply ${status.name} to ${targetPhrase(targeting)}`;

  const detailParts: string[] = [];
  if (mods) {
    detailParts.push(mods);
  }
  if (tick) {
    detailParts.push(tick);
  }
  const detail = detailParts.length > 0 ? `: ${detailParts.join(", ")}` : "";

  if (targeting.kind === "self" || targeting.kind === "party") {
    return `${grantVerb} ${status.name} for ${duration}${detail}`;
  }
  return `${grantVerb} for ${duration}${detail}`;
}

function formatAbilityMechanics(
  ability: AbilityDef,
  stats: BaseStats,
  statuses: readonly StatusEffectDef[],
  compact: boolean,
): string {
  const prefix = compact ? "" : validWhilePrefix(ability, statuses);
  const compactPrefix = compact ? validWhilePrefix(ability, statuses) : "";
  const clauses: string[] = [];
  let index = 0;

  while (index < ability.effects.length) {
    const effect = ability.effects[index]!;
    if (effect.kind === "damage") {
      const channel = effect.channel ?? "physical";
      const element = effect.element;
      const values: number[] = [];
      while (index < ability.effects.length) {
        const current = ability.effects[index]!;
        if (current.kind !== "damage") {
          break;
        }
        const currentChannel = current.channel ?? "physical";
        if (currentChannel !== channel || current.element !== element) {
          break;
        }
        const raw = rawDamageValue(current, stats);
        if (raw !== null) {
          values.push(raw);
        }
        index += 1;
      }
      if (values.length > 0) {
        clauses.push(formatDamageClause(values, channel, element, ability.targeting, compact));
      }
      continue;
    }

    if (effect.kind === "heal") {
      const amount = previewEffectRaw(effect, stats);
      if (amount !== null) {
        clauses.push(formatHealClause(amount, ability.targeting, compact));
      }
      index += 1;
      continue;
    }

    if (effect.kind === "revive") {
      const amount = previewEffectRaw(effect, stats);
      if (amount !== null) {
        clauses.push(formatReviveClause(amount, ability.targeting, compact));
      }
      index += 1;
      continue;
    }

    if (effect.kind === "apply-status") {
      const clause = formatApplyStatusClause(effect, ability, stats, statuses, compact);
      if (clause) {
        clauses.push(clause);
      }
      index += 1;
      continue;
    }

    index += 1;
  }

  const body = clauses.join(compact ? " + " : " and ");
  if (compact) {
    return `${compactPrefix}${body}`;
  }
  return `${prefix}${body}`;
}

export function formatAbilityDescription(
  ability: AbilityDef,
  stats: BaseStats,
  statuses: readonly StatusEffectDef[],
): string {
  return `${ability.name}: ${formatAbilityMechanics(ability, stats, statuses, false)}`;
}

export function formatAbilityChoiceLabel(
  ability: AbilityDef,
  stats: BaseStats,
  statuses: readonly StatusEffectDef[],
): string {
  return `${ability.name} — ${formatAbilityMechanics(ability, stats, statuses, true)}`;
}
