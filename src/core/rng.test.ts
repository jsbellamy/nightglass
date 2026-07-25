import { describe, expect, it } from "vitest";
import { initialCombatRngState, initialLootRngState } from "./rng";

describe("initialCombatRngState", () => {
  it("derives a state distinct from initialLootRngState for several seeds including undefined", () => {
    for (const seed of [undefined, 0, 1, 42, 0x5090, 0xdeadbeef]) {
      expect(initialCombatRngState(seed)).not.toBe(initialLootRngState(seed));
    }
  });
});
