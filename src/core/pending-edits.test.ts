import { describe, expect, it } from "vitest";
import { createDefaultProgression } from "./load-state";
import {
  effectiveTalentState,
  rosterClassIds,
  unlockableAbilityIds,
} from "./pending-edits";
import type { Snapshot } from "./snapshot";
import { emptyTalentState } from "./talents";
import { fixtureContent } from "./testing/fixture-content";

const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;

function baseSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    schemaVersion: 1,
    savedAtMs: 0,
    simNowMs: 0,
    lootRngState: 0,
    nextEventSeq: 1,
    nextAttemptId: 1,
    nextDropId: 1,
    progression: createDefaultProgression(fixtureContent),
    attempt: null,
    pendingEdits: [],
    ...overrides,
  };
}

describe("effectiveTalentState", () => {
  it("returns the pending Talent allocation when a talent Pending Edit exists for that Class", () => {
    const snapshot = baseSnapshot({
      pendingEdits: [
        {
          kind: "talent",
          classId: "knight",
          statRanks: { "k-fortitude": 3, "k-swordcraft": 2 },
          abilityTalentId: "k-hold-line",
        },
      ],
    });

    expect(effectiveTalentState(snapshot, "knight")).toEqual({
      statRanks: { "k-fortitude": 3, "k-swordcraft": 2 },
      abilityTalentId: "k-hold-line",
      tierStates: [
        {
          statRanks: { "k-fortitude": 3, "k-swordcraft": 2 },
          abilityTalentId: "k-hold-line",
        },
      ],
    });
  });

  it("merges Tier 2 pending edits without aliasing applied or pending tier state", () => {
    const applied = createDefaultProgression(fixtureContent).talents.knight!;
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        talents: {
          ...createDefaultProgression(fixtureContent).talents,
          knight: {
            ...applied,
            tierStates: [
              applied.tierStates[0]!,
              { statRanks: { "k2-fortitude": 0, "k2-swordcraft": 0 }, abilityTalentId: null },
            ],
          },
        },
      },
      pendingEdits: [
        {
          kind: "talent",
          classId: "knight",
          statRanks: applied.statRanks,
          abilityTalentId: applied.abilityTalentId,
          tierStates: [
            applied.tierStates[0]!,
            { statRanks: { "k2-fortitude": 2, "k2-swordcraft": 0 }, abilityTalentId: null },
          ],
        },
      ],
    });

    const result = effectiveTalentState(snapshot, "knight");
    expect(result.tierStates[1]!.statRanks["k2-fortitude"]).toBe(2);
    result.tierStates[1]!.statRanks["k2-fortitude"] = 99;
    const pending = snapshot.pendingEdits[0];
    expect(pending?.kind === "talent" && pending.tierStates?.[1]?.statRanks["k2-fortitude"]).toBe(2);
    expect(result.tierStates[1]!.statRanks["k2-fortitude"]).toBe(99);
  });

  it("returns a structural clone of the applied Talent state when no talent Pending Edit exists", () => {
    const snapshot = baseSnapshot();
    const applied = snapshot.progression.talents.knight!;
    applied.statRanks["k-fortitude"] = 2;
    applied.tierStates[0]!.statRanks["k-fortitude"] = 2;

    const result = effectiveTalentState(snapshot, "knight");
    expect(result).toEqual(applied);
    expect(result).not.toBe(applied);

    result.statRanks["k-fortitude"] = 99;
    expect(snapshot.progression.talents.knight!.statRanks["k-fortitude"]).toBe(2);
  });
});

describe("rosterClassIds", () => {
  it("returns pending Party membership when pendingParty is set", () => {
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        pendingParty: {
          members: ["hunter", "priest", "wizard"],
          reserve: "knight",
        },
      },
      pendingEdits: [
        {
          kind: "formation",
          order: ["wizard", "knight", "priest"],
        },
      ],
    });

    expect(rosterClassIds(snapshot)).toEqual(["hunter", "priest", "wizard", "knight"]);
  });

  it("returns Formation order followed by Reserve when pendingParty is not set", () => {
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        pendingParty: null,
      },
      pendingEdits: [
        {
          kind: "formation",
          order: ["priest", "wizard", "knight"],
        },
      ],
    });

    expect(rosterClassIds(snapshot)).toEqual(["priest", "wizard", "knight", "hunter"]);
  });
});

describe("unlockableAbilityIds", () => {
  it("returns basic and Core ability ids when no Ability Talent is allocated", () => {
    expect(unlockableAbilityIds(knightKit, emptyTalentState(knightKit))).toEqual([
      "knight-basic",
      "k-shield-brace",
      "k-sweep",
      "k-rally",
      "k-pommel",
    ]);
  });

  it("includes the unlocked Ability Talent when one is allocated", () => {
    const talentState = emptyTalentState(knightKit);
    talentState.abilityTalentId = "k-hold-line";
    talentState.tierStates[0]!.abilityTalentId = "k-hold-line";

    expect(unlockableAbilityIds(knightKit, talentState)).toEqual([
      "knight-basic",
      "k-shield-brace",
      "k-sweep",
      "k-rally",
      "k-pommel",
      "k-hold-line",
    ]);
  });
});
