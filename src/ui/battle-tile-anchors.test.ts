import { describe, expect, it } from "vitest";
import type { CombatantState } from "../core/snapshot";
import { footAnchorXForCombatant } from "./battle-tile-anchors";

function partyCombatant(entityId: string): CombatantState {
  return {
    entityId,
    side: "party",
    defId: "knight",
    health: 100,
    maxHealth: 100,
    knockedOut: false,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
  };
}

function opponentCombatant(entityId: string): CombatantState {
  return {
    entityId,
    side: "opponent",
    defId: "pipcap",
    health: 40,
    maxHealth: 40,
    knockedOut: false,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
  };
}

describe("footAnchorXForCombatant", () => {
  it("resolves party formation anchors from layout.json", () => {
    expect(
      footAnchorXForCombatant({
        combatant: partyCombatant("party:knight:back"),
        formationSlot: "back",
        opponentIndex: null,
        isBoss: false,
        opponentStressLayout: false,
      }),
    ).toBe(24);
    expect(
      footAnchorXForCombatant({
        combatant: partyCombatant("party:wizard:middle"),
        formationSlot: "middle",
        opponentIndex: null,
        isBoss: false,
        opponentStressLayout: false,
      }),
    ).toBe(68);
    expect(
      footAnchorXForCombatant({
        combatant: partyCombatant("party:priest:front"),
        formationSlot: "front",
        opponentIndex: null,
        isBoss: false,
        opponentStressLayout: false,
      }),
    ).toBe(112);
  });

  it("resolves ordinary opponent and stress anchors from layout.json", () => {
    expect(
      footAnchorXForCombatant({
        combatant: opponentCombatant("opp:1:0"),
        formationSlot: null,
        opponentIndex: 0,
        isBoss: false,
        opponentStressLayout: false,
      }),
    ).toBe(312);
    expect(
      footAnchorXForCombatant({
        combatant: opponentCombatant("opp:1:4"),
        formationSlot: null,
        opponentIndex: 4,
        isBoss: false,
        opponentStressLayout: true,
      }),
    ).toBe(452);
  });

  it("resolves boss role anchor from layout.json (contract centre, not slot-0)", () => {
    expect(
      footAnchorXForCombatant({
        combatant: opponentCombatant("opp:3:0"),
        formationSlot: null,
        opponentIndex: 0,
        isBoss: true,
        opponentStressLayout: false,
      }),
    ).toBe(240);
  });
});
