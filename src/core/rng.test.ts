import { describe, expect, it } from "vitest";
import { initialCombatRngState, initialLootRngState } from "./rng";

describe("initialCombatRngState", () => {
  it("derives combat stream state from loot seed via mulberry32Step", () => {
    expect(initialCombatRngState(undefined)).toBe(1_783_097_121);
    expect(initialCombatRngState(0x5090)).toBe(1_783_097_121);
    expect(initialCombatRngState(0x5090)).not.toBe(initialLootRngState(0x5090));
  });
});
