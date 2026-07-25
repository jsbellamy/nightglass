import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DAMAGE_MERGE_WINDOW_MS,
  damageNumberClass,
  formatDamageNumber,
  mergeDamageNumbers,
} from "./damage-numbers";

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "../styles.css");

function parseRuleValue(css: string, selector: string, property: string): string | undefined {
  const escaped = selector.replace(/\./g, "\\.");
  const match = css.match(new RegExp(`${escaped}\\s*\\{[^}]*${property}\\s*:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

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

  it("appends the critical class and exclamation glyph for critical damage", () => {
    expect(damageNumberClass({ kind: "damage", channel: "physical", crit: true })).toBe(
      "damage-number physical critical",
    );
    expect(formatDamageNumber(47, "damage", true)).toBe("47!");
  });

  it("never marks healing as critical", () => {
    expect(damageNumberClass({ kind: "heal", crit: true })).toBe("damage-number heal");
    expect(formatDamageNumber(12, "heal", true)).toBe("+12");
  });

  it("raises critical font size and weight above the base damage-number rule", () => {
    const css = readFileSync(stylesPath, "utf8");
    const baseSize = Number.parseFloat(parseRuleValue(css, ".damage-number", "font-size") ?? "0");
    const critSize = Number.parseFloat(
      parseRuleValue(css, ".damage-number.critical", "font-size") ?? "0",
    );
    const baseWeight = Number.parseInt(parseRuleValue(css, ".damage-number", "font-weight") ?? "0", 10);
    const critWeight = Number.parseInt(
      parseRuleValue(css, ".damage-number.critical", "font-weight") ?? "0",
      10,
    );
    expect(critSize).toBeGreaterThan(baseSize);
    expect(critWeight).toBeGreaterThan(baseWeight);
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

  it("merges a critical hit with an ordinary hit inside the merge window as critical", () => {
    const merged = mergeDamageNumbers([
      { targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 4, atMs: 1000, crit: true },
      { targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 6, atMs: 1180 },
    ]);

    expect(merged).toEqual([
      {
        targetId: "opp:1:0",
        kind: "damage",
        channel: "physical",
        amount: 10,
        atMs: 1180,
        crit: true,
        stableAtMs: 1000,
        mergedCount: 2,
      },
    ]);
  });

  it("keeps critical and ordinary hits separate when they share a timestamp", () => {
    const merged = mergeDamageNumbers([
      { targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 4, atMs: 1000, crit: true },
      { targetId: "opp:1:0", kind: "damage", channel: "physical", amount: 6, atMs: 1000 },
    ]);

    expect(merged).toEqual([
      {
        targetId: "opp:1:0",
        kind: "damage",
        channel: "physical",
        amount: 4,
        atMs: 1000,
        crit: true,
        stableAtMs: 1000,
        mergedCount: 1,
      },
      {
        targetId: "opp:1:0",
        kind: "damage",
        channel: "physical",
        amount: 6,
        atMs: 1000,
        stableAtMs: 1000,
        mergedCount: 1,
      },
    ]);
  });
});
