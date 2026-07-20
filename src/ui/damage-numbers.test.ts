import { describe, expect, it } from "vitest";
import {
  DAMAGE_MERGE_WINDOW_MS,
  damageNumberClass,
  formatDamageNumber,
  mergeDamageNumbers,
} from "./damage-numbers";

describe("damage numbers", () => {
  it("tints physical, elemental, and heal channels distinctly", () => {
    expect(damageNumberClass({ kind: "damage", channel: "physical" })).toBe(
      "damage-number physical",
    );
    expect(damageNumberClass({ kind: "damage", channel: "elemental" })).toBe(
      "damage-number elemental",
    );
    expect(damageNumberClass({ kind: "heal" })).toBe("damage-number heal");
  });

  it("prefixes healing with a green plus", () => {
    expect(formatDamageNumber(12, "heal")).toBe("+12");
    expect(formatDamageNumber(8, "damage")).toBe("8");
  });

  it("merges same-target hits inside the 250ms window", () => {
    const merged = mergeDamageNumbers([
      { targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 4, atMs: 1000 },
      { targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 6, atMs: 1180 },
      { targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 3, atMs: 1450 },
    ]);

    expect(merged).toEqual([
      {
        targetId: "opp:1:0",
        kind: "damage",
        channel: "physical",
        amount: 10,
        atMs: 1180,
        stableAtMs: 1000,
        mergedCount: 2,
      },
      {
        targetId: "opp:1:0",
        kind: "damage",
        channel: "physical",
        amount: 3,
        atMs: 1450,
        stableAtMs: 1450,
        mergedCount: 1,
      },
    ]);
    expect(DAMAGE_MERGE_WINDOW_MS).toBe(250);
  });

  it("does not merge across channels or targets", () => {
    const merged = mergeDamageNumbers([
      { targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 4, atMs: 1000 },
      { targetId: "opp:1:1", kind: "damage", channel: "physical", amount: 5, atMs: 1100 },
      { targetId: "opp:1:0", kind: "damage", channel: "elemental", amount: 7, atMs: 1150 },
    ]);

    expect(merged).toHaveLength(3);
  });
});
