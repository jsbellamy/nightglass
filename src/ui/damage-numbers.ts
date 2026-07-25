import type { DamageChannel } from "../core/types";

export const DAMAGE_MERGE_WINDOW_MS = 250;

export type DamageResultKind = "damage" | "heal";

export interface DamageNumberInput {
  targetId: string;
  kind: DamageResultKind;
  channel?: DamageChannel;
  amount: number;
  atMs: number;
  crit?: boolean;
}

export interface MergedDamageNumber {
  targetId: string;
  kind: DamageResultKind;
  channel?: DamageChannel;
  amount: number;
  atMs: number;
  crit?: boolean;
  /** First impact time in a merge group — stable DOM key for the presentation lifetime. */
  stableAtMs: number;
  mergedCount: number;
}

export function damageNumberClass(
  input: Pick<DamageNumberInput, "kind" | "channel" | "crit">,
): string {
  const classes = ["damage-number"];
  if (input.kind === "heal") {
    classes.push("heal");
  } else if (input.channel === "elemental") {
    classes.push("elemental");
  } else {
    classes.push("physical");
  }
  if (input.kind !== "heal" && input.crit) {
    classes.push("critical");
  }
  return classes.join(" ");
}

export function formatDamageNumber(
  amount: number,
  kind: DamageResultKind,
  crit?: boolean,
): string {
  if (kind === "heal") {
    return `+${amount}`;
  }
  const text = String(amount);
  return crit ? `${text}!` : text;
}

/** Merge same-target results inside the window; later rows absorb earlier ones. */
export function mergeDamageNumbers(
  entries: DamageNumberInput[],
  windowMs = DAMAGE_MERGE_WINDOW_MS,
): MergedDamageNumber[] {
  const sorted = [...entries].sort((left, right) => left.atMs - right.atMs);
  const merged: MergedDamageNumber[] = [];

  for (const entry of sorted) {
    const prior = merged[merged.length - 1];
    const sameTimestampCritMismatch =
      prior &&
      entry.atMs === prior.atMs &&
      Boolean(prior.crit) !== Boolean(entry.crit);
    if (
      prior &&
      prior.targetId === entry.targetId &&
      prior.kind === entry.kind &&
      (prior.channel ?? null) === (entry.channel ?? null) &&
      entry.atMs - prior.atMs <= windowMs &&
      !sameTimestampCritMismatch
    ) {
      prior.amount += entry.amount;
      prior.atMs = entry.atMs;
      if (Boolean(prior.crit) || Boolean(entry.crit)) {
        prior.crit = true;
      }
      prior.mergedCount += 1;
      continue;
    }
    merged.push({
      targetId: entry.targetId,
      kind: entry.kind,
      ...(entry.channel !== undefined ? { channel: entry.channel } : {}),
      amount: entry.amount,
      atMs: entry.atMs,
      ...(entry.crit ? { crit: true } : {}),
      stableAtMs: entry.atMs,
      mergedCount: 1,
    });
  }

  return merged;
}
