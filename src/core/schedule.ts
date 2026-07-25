/**
 * DueKind declaration order is load-bearing for ADR-0007 determinism: drainAt
 * returns entries sorted by this kind order, then combatant index, then key.
 * Do not reorder without replaying seed-pinned combat tests.
 */
export type DueKind =
  | "phase-end"
  | "initiative-ready"
  | "status-expiry"
  | "status-tick"
  | "action-impact"
  | "action-end";

export interface DueEntry {
  atMs: number;
  kind: DueKind;
  entityId: string;
  /** Status id for status-* kinds; ability id for action-* kinds; else undefined. */
  key?: string;
}

export interface DueQueue {
  schedule(entry: DueEntry): void;
  cancel(entityId: string, kind: DueKind, key?: string): void;
  cancelAllFor(entityId: string): void;
  /** Earliest scheduled time, or null when empty. */
  nextDueMs(): number | null;
  /** All entries at exactly `atMs`, in deterministic order, removed from the queue. */
  drainAt(atMs: number): DueEntry[];
}

const DUE_KIND_ORDER: Record<DueKind, number> = {
  "phase-end": 0,
  "initiative-ready": 1,
  "status-expiry": 2,
  "status-tick": 3,
  "action-impact": 4,
  "action-end": 5,
};

interface StoredDueEntry extends DueEntry {
  combatantIndex: number;
}

function compareEntries(left: StoredDueEntry, right: StoredDueEntry): number {
  if (left.atMs !== right.atMs) {
    return left.atMs - right.atMs;
  }
  const kindDelta = DUE_KIND_ORDER[left.kind] - DUE_KIND_ORDER[right.kind];
  if (kindDelta !== 0) {
    return kindDelta;
  }
  if (left.combatantIndex !== right.combatantIndex) {
    return left.combatantIndex - right.combatantIndex;
  }
  const leftKey = left.key ?? "";
  const rightKey = right.key ?? "";
  return leftKey.localeCompare(rightKey);
}

export interface DueQueueWithIndex extends DueQueue {
  scheduleWithIndex(entry: DueEntry, combatantIndex: number): void;
  clear(): void;
}

export function createDueQueue(): DueQueueWithIndex {
  const entries: StoredDueEntry[] = [];

  function insert(entry: StoredDueEntry): void {
    entries.push(entry);
  }

  function matchesCancel(
    entry: StoredDueEntry,
    entityId: string,
    kind: DueKind,
    key: string | undefined,
  ): boolean {
    if (entry.entityId !== entityId || entry.kind !== kind) {
      return false;
    }
    if (key === undefined) {
      return true;
    }
    return entry.key === key;
  }

  return {
    schedule(entry: DueEntry): void {
      insert({ ...entry, combatantIndex: 0 });
    },

    scheduleWithIndex(entry: DueEntry, combatantIndex: number): void {
      insert({ ...entry, combatantIndex });
    },

    cancel(entityId: string, kind: DueKind, key?: string): void {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (matchesCancel(entries[index]!, entityId, kind, key)) {
          entries.splice(index, 1);
        }
      }
    },

    cancelAllFor(entityId: string): void {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (entries[index]!.entityId === entityId) {
          entries.splice(index, 1);
        }
      }
    },

    nextDueMs(): number | null {
      if (entries.length === 0) {
        return null;
      }
      let min = entries[0]!.atMs;
      for (let index = 1; index < entries.length; index += 1) {
        const atMs = entries[index]!.atMs;
        if (atMs < min) {
          min = atMs;
        }
      }
      return min;
    },

    drainAt(atMs: number): DueEntry[] {
      const due: StoredDueEntry[] = [];
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (entries[index]!.atMs === atMs) {
          due.push(entries[index]!);
          entries.splice(index, 1);
        }
      }
      due.sort(compareEntries);
      return due.map(({ combatantIndex: _combatantIndex, ...entry }) => entry);
    },

    clear(): void {
      entries.length = 0;
    },
  };
}
