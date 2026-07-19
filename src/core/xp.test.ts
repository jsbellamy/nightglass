import { describe, expect, it } from "vitest";
import { awardXp, levelFromXp, reserveXpAward } from "./xp";

const THRESHOLDS = [0, 100, 250, 450, 650, 850];

describe("levelFromXp", () => {
  it("maps cumulative thresholds to Levels 1–6 from issue #5", () => {
    expect(levelFromXp(0, THRESHOLDS)).toBe(1);
    expect(levelFromXp(99, THRESHOLDS)).toBe(1);
    expect(levelFromXp(100, THRESHOLDS)).toBe(2);
    expect(levelFromXp(250, THRESHOLDS)).toBe(3);
    expect(levelFromXp(449, THRESHOLDS)).toBe(3);
    expect(levelFromXp(450, THRESHOLDS)).toBe(4);
    expect(levelFromXp(650, THRESHOLDS)).toBe(5);
    expect(levelFromXp(850, THRESHOLDS)).toBe(6);
    expect(levelFromXp(9999, THRESHOLDS)).toBe(6);
  });
});

describe("reserveXpAward", () => {
  it("awards floor(50%) of the opponent xpAward to the Reserve", () => {
    expect(reserveXpAward(20)).toBe(10);
    expect(reserveXpAward(60)).toBe(30);
    expect(reserveXpAward(15)).toBe(7);
  });
});

describe("awardXp", () => {
  it("crosses level-up at exact thresholds without rolling back earned XP", () => {
    const at99 = awardXp(99, 1, THRESHOLDS);
    expect(at99.totalXp).toBe(100);
    expect(at99.previousLevel).toBe(1);
    expect(at99.newLevel).toBe(2);

    const stage1Clear = awardXp(0, 100, THRESHOLDS);
    expect(stage1Clear.newLevel).toBe(2);
  });
});
