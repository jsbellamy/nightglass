import { describe, expect, it } from "vitest";
import { createEngine } from "./engine";
import { buildContent } from "../data";
import {
  stageTwoFiveOpponentDropSnapshot,
  stageTwoFiveOpponentStressSnapshot,
} from "../../e2e/helpers/snapshots";

describe("e2e stage-two drop snapshot", () => {
  it("awards a drop within one pump step from pre-knocked Opponents", () => {
    const content = buildContent();
    const snapshot = stageTwoFiveOpponentDropSnapshot();
    expect(snapshot.attempt?.encounter).toBe(2);
    const engine = createEngine(content, snapshot, 42);
    const events = engine.advanceBy(250);
    expect(events.some((event) => event.type === "drop-awarded")).toBe(true);
  });

  it("stress snapshot is encounter two with five living Opponents", () => {
    const snapshot = stageTwoFiveOpponentStressSnapshot();
    expect(snapshot.attempt?.stage).toBe(2);
    expect(snapshot.attempt?.encounter).toBe(2);
    expect(
      snapshot.attempt?.combatants.filter((combatant) => combatant.side === "opponent").length,
    ).toBe(5);
  });
});
