import { describe, expect, it } from "vitest";
import type { ClassId } from "./types";
import {
  FORMATION_SLOT_BY_INDEX,
  opponentEntityId,
  parseEntityId,
  partyEntityId,
} from "./entity-id";

const CLASS_IDS: ClassId[] = ["knight", "wizard", "priest", "hunter"];

describe("Party combatant identity", () => {
  it("preserves save-compatible ids for each formation slot", () => {
    expect(partyEntityId("knight", 0)).toBe("party:knight:front");
    expect(partyEntityId("wizard", 1)).toBe("party:wizard:middle");
    expect(partyEntityId("priest", 2)).toBe("party:priest:back");
  });

  it("recovers Class and formation index for every Class and slot", () => {
    for (const classId of CLASS_IDS) {
      for (let formationIndex = 0; formationIndex < FORMATION_SLOT_BY_INDEX.length; formationIndex += 1) {
        const id = partyEntityId(classId, formationIndex);
        const parsed = parseEntityId(id);
        expect(parsed).toEqual({ side: "party", classId, formationIndex });
      }
    }
  });
});

describe("Opponent combatant identity", () => {
  it("preserves save-compatible ids for encounter wave and index", () => {
    expect(opponentEntityId("1", 0)).toBe("opp:1:0");
    expect(opponentEntityId("3", 2)).toBe("opp:3:2");
  });

  it("recovers encounter segment and opponent index", () => {
    const id = opponentEntityId("2", 1);
    expect(parseEntityId(id)).toEqual({ side: "opponent", defId: "2", index: 1 });
  });
});

describe("Malformed combatant identity", () => {
  it("rejects ids that do not match the persisted encoding", () => {
    expect(() => parseEntityId("not-an-entity")).toThrow();
    expect(() => parseEntityId("party:knight")).toThrow();
    expect(() => parseEntityId("opp:1")).toThrow();
  });
});
