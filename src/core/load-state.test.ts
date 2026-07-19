import { describe, expect, it, vi } from "vitest";
import { createEngine, SCHEMA_VERSION } from "./engine";
import { parseStoredSave, SAVE_SCHEMA_VERSION } from "./load-state";
import { content as testContent } from "../data";

const LOOT_SEED = 42;

describe("parseStoredSave", () => {
  it("corrupt JSON logs once and starts a fresh game", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const parsed = parseStoredSave("{not-json", testContent);
    expect(parsed.kind).toBe("fresh");
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("schemaVersion mismatch recovers durable progression and discards the in-flight Attempt", () => {
    const engine = createEngine(testContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const saved = engine.snapshot();
    saved.schemaVersion = SAVE_SCHEMA_VERSION + 99;
    saved.progression.unlockedStage = 2;
    saved.attempt = saved.attempt
      ? { ...saved.attempt, encounter: 2, stage: 2 }
      : null;

    const parsed = parseStoredSave(JSON.stringify(saved), testContent);
    expect(parsed.kind).toBe("tolerant");
    if (parsed.kind !== "tolerant") {
      return;
    }
    expect(parsed.snapshot.progression.unlockedStage).toBe(2);
    expect(parsed.snapshot.attempt).toBeNull();
    expect(parsed.snapshot.pendingEdits).toEqual([]);

    const restored = createEngine(testContent, parsed.snapshot, LOOT_SEED);
    expect(restored.snapshot().attempt).toMatchObject({ stage: 2, encounter: 1 });
  });

  it("exact-version restore keeps the in-flight Attempt", () => {
    const engine = createEngine(testContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const saved = engine.snapshot();
    saved.attempt = saved.attempt ? { ...saved.attempt, encounter: 2 } : null;
    expect(saved.schemaVersion).toBe(SCHEMA_VERSION);

    const parsed = parseStoredSave(JSON.stringify(saved), testContent);
    expect(parsed.kind).toBe("exact");
    if (parsed.kind !== "exact") {
      return;
    }
    expect(parsed.snapshot.attempt?.encounter).toBe(2);

    const restored = createEngine(testContent, parsed.snapshot, LOOT_SEED);
    expect(restored.snapshot().attempt?.encounter).toBe(2);
  });
});
