// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import { mountOfflineSummary, summarizeOfflineProgress } from "./offline-summary";

describe("summarizeOfflineProgress", () => {
  it("matches snapshot deltas for XP and Drops", () => {
    const engine = createEngine(fixtureContent, undefined, 42);
    engine.advanceBy(1);
    const before = engine.snapshot();
    const events = engine.advanceBy(30_000);
    const after = engine.snapshot();

    const summary = summarizeOfflineProgress(events, before, after, fixtureContent, 30_000, false);
    const totalXpGain = summary.characterGains.reduce((sum, gain) => sum + gain.xpGained, 0);
    const xpDelta = Object.values(after.progression.characterXp).reduce(
      (sum, xp, index) => sum + xp - (Object.values(before.progression.characterXp)[index] ?? 0),
      0,
    );
    expect(totalXpGain).toBe(xpDelta);
    expect(summary.drops.length).toBe(
      after.progression.armory.length - before.progression.armory.length,
    );
  });
});

describe("mountOfflineSummary", () => {
  it("is dismissable with the Continue button and Escape", () => {
    const root = document.createElement("main");
    const mount = mountOfflineSummary(root, {
      awayMs: 120_000,
      capped: false,
      stagesCleared: 1,
      characterGains: [{ classId: "knight", xpGained: 10, levelsGained: 0, levelAfter: 1 }],
      drops: [{ dropId: 1, label: "Test Blade (i1)", unseen: true }],
    });

    expect(root.querySelector(".offline-summary")).not.toBeNull();
    expect(root.querySelector('[data-unseen="true"]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>(".offline-summary-dismiss")?.click();
    expect(root.querySelector(".offline-summary")).toBeNull();

    mountOfflineSummary(root, {
      awayMs: 60_000,
      capped: true,
      stagesCleared: 0,
      characterGains: [],
      drops: [],
    });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root.querySelector(".offline-summary")).toBeNull();
    mount.dismiss();
  });
});
