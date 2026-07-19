import type { DamageChannel } from "../core/types";

export const DAMAGE_MERGE_WINDOW_MS = 250;

export type DamageResultKind = "damage" | "heal";

export interface DamageNumberInput {
  targetId: string;
  kind: DamageResultKind;
  channel?: DamageChannel;
  amount: number;
  atMs: number;
}

export interface MergedDamageNumber {
  targetId: string;
  kind: DamageResultKind;
  channel?: DamageChannel;
  amount: number;
  atMs: number;
  mergedCount: number;
}

export function damageNumberClass(input: Pick<DamageNumberInput, "kind" | "channel">): string {
  if (input.kind === "heal") {
    return "damage-number heal";
  }
  if (input.channel === "elemental") {
    return "damage-number elemental";
  }
  return "damage-number physical";
}

export function formatDamageNumber(amount: number, kind: DamageResultKind): string {
  if (kind === "heal") {
    return `+${amount}`;
  }
  return String(amount);
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
    if (
      prior &&
      prior.targetId === entry.targetId &&
      prior.kind === entry.kind &&
      (prior.channel ?? null) === (entry.channel ?? null) &&
      entry.atMs - prior.atMs <= windowMs
    ) {
      prior.amount += entry.amount;
      prior.atMs = entry.atMs;
      prior.mergedCount += 1;
      continue;
    }
    merged.push({
      targetId: entry.targetId,
      kind: entry.kind,
      ...(entry.channel !== undefined ? { channel: entry.channel } : {}),
      amount: entry.amount,
      atMs: entry.atMs,
      mergedCount: 1,
    });
  }

  return merged;
}
