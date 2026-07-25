import { describe, expect, it } from "vitest";
import { createDueQueue, type DueEntry } from "./schedule";

describe("DueQueue", () => {
  it("returns null from nextDueMs on an empty queue", () => {
    const queue = createDueQueue();
    expect(queue.nextDueMs()).toBeNull();
    expect(queue.drainAt(0)).toEqual([]);
  });

  it("schedules, cancels by kind and key, and reports the earliest due time", () => {
    const queue = createDueQueue();
    queue.scheduleWithIndex(
      { atMs: 500, kind: "status-expiry", entityId: "a", key: "stun" },
      0,
    );
    queue.scheduleWithIndex(
      { atMs: 300, kind: "action-impact", entityId: "b", key: "basic" },
      1,
    );
    expect(queue.nextDueMs()).toBe(300);

    queue.cancel("b", "action-impact", "basic");
    expect(queue.nextDueMs()).toBe(500);

    const drained = queue.drainAt(500);
    expect(drained).toEqual([
      { atMs: 500, kind: "status-expiry", entityId: "a", key: "stun" },
    ]);
    expect(queue.nextDueMs()).toBeNull();
  });

  it("drains several entries at one atMs in DueKind order, then combatant index, then key", () => {
    const queue = createDueQueue();
    const entries: Array<{ entry: DueEntry; combatantIndex: number }> = [
      { entry: { atMs: 100, kind: "action-end", entityId: "c", key: "b" }, combatantIndex: 2 },
      { entry: { atMs: 100, kind: "status-tick", entityId: "b", key: "dot" }, combatantIndex: 1 },
      { entry: { atMs: 100, kind: "phase-end", entityId: "attempt" }, combatantIndex: 0 },
      { entry: { atMs: 100, kind: "status-expiry", entityId: "a", key: "z" }, combatantIndex: 0 },
      { entry: { atMs: 100, kind: "status-expiry", entityId: "a", key: "a" }, combatantIndex: 0 },
      { entry: { atMs: 100, kind: "initiative-ready", entityId: "d" }, combatantIndex: 3 },
      { entry: { atMs: 100, kind: "action-impact", entityId: "c", key: "x" }, combatantIndex: 2 },
      { entry: { atMs: 200, kind: "action-end", entityId: "late" }, combatantIndex: 0 },
    ];
    for (const { entry, combatantIndex } of entries) {
      queue.scheduleWithIndex(entry, combatantIndex);
    }

    expect(queue.drainAt(100)).toEqual([
      { atMs: 100, kind: "phase-end", entityId: "attempt" },
      { atMs: 100, kind: "initiative-ready", entityId: "d" },
      { atMs: 100, kind: "status-expiry", entityId: "a", key: "a" },
      { atMs: 100, kind: "status-expiry", entityId: "a", key: "z" },
      { atMs: 100, kind: "status-tick", entityId: "b", key: "dot" },
      { atMs: 100, kind: "action-impact", entityId: "c", key: "x" },
      { atMs: 100, kind: "action-end", entityId: "c", key: "b" },
    ]);
    expect(queue.nextDueMs()).toBe(200);
  });

  it("cancelAllFor removes every scheduled moment for an entity", () => {
    const queue = createDueQueue();
    queue.scheduleWithIndex(
      { atMs: 50, kind: "status-tick", entityId: "target", key: "burn" },
      0,
    );
    queue.scheduleWithIndex(
      { atMs: 75, kind: "action-end", entityId: "target", key: "slash" },
      0,
    );
    queue.scheduleWithIndex(
      { atMs: 60, kind: "action-impact", entityId: "other", key: "slash" },
      1,
    );

    queue.cancelAllFor("target");
    expect(queue.nextDueMs()).toBe(60);
    expect(queue.drainAt(60)).toEqual([
      { atMs: 60, kind: "action-impact", entityId: "other", key: "slash" },
    ]);
  });
});
