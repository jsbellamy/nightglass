import { describe, expect, it } from "vitest";
import type { ClassId } from "./types";
import {
  FORMATION_SLOT_BY_INDEX,
  opponentEntityId,
  parseEntityId,
  partyEntityId,
} from "./entity-id";

const CLASS_IDS: ClassId[] = ["knight", "wizard", "priest", "hunter"];

describe("entity-id format stability", () => {
  it("emits the legacy party strings unchanged", () => {
    expect(partyEntityId("knight", 0)).toBe("party:knight:front");
    expect(partyEntityId("wizard", 1)).toBe("party:wizard:middle");
    expect(partyEntityId("priest", 2)).toBe("party:priest:back");
  });

  it("emits the legacy opponent strings unchanged", () => {
    expect(opponentEntityId("1", 0)).toBe("opp:1:0");
    expect(opponentEntityId("3", 2)).toBe("opp:3:2");
  });
});

describe("entity-id round-trip", () => {
  it("recovers class and formation index for every ClassId and slot", () => {
    for (const classId of CLASS_IDS) {
      for (let formationIndex = 0; formationIndex < FORMATION_SLOT_BY_INDEX.length; formationIndex += 1) {
        const id = partyEntityId(classId, formationIndex);
        const parsed = parseEntityId(id);
        expect(parsed).toEqual({ side: "party", classId, formationIndex });
      }
    }
  });

  it("recovers encounter segment and index for opponents", () => {
    const id = opponentEntityId("2", 1);
    expect(parseEntityId(id)).toEqual({ side: "opponent", defId: "2", index: 1 });
  });
});

describe("parseEntityId", () => {
  it("throws on a malformed id", () => {
    expect(() => parseEntityId("not-an-entity")).toThrow();
    expect(() => parseEntityId("party:knight")).toThrow();
    expect(() => parseEntityId("opp:1")).toThrow();
  });
});
