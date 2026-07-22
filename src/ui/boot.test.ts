// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as battleTile from "./battle-tile";
import { createEngine } from "../core/engine";
import { content as fullContent } from "../data";
import {
  AUTOSAVE_MS,
  bootTile,
  computeOfflineMs,
  DEFAULT_LOOT_SEED,
  MIN_OFFLINE_MS,
  OFFLINE_CAP_MS,
  runOfflineBoot,
  SAVE_KEY,
} from "./boot";
import { mountOfflineSummary } from "./offline-summary";
import type { Snapshot } from "../core/snapshot";

import { mountTileShell } from "../main";

const SNAPSHOT_KEYS: (keyof Snapshot)[] = [
  "schemaVersion",
  "savedAtMs",
  "simNowMs",
  "lootRngState",
  "nextEventSeq",
  "nextAttemptId",
  "nextDropId",
  "progression",
  "attempt",
  "pendingEdits",
];

function assertSnapshotOnlyPayload(parsed: Record<string, unknown>): void {
  const keys = Object.keys(parsed).sort();
  expect(keys).toEqual([...SNAPSHOT_KEYS].sort());
}

describe("computeOfflineMs", () => {
  it("clamps offline duration to the 8h cap", () => {
    const savedAt = 0;
    const now = OFFLINE_CAP_MS + 60_000;
    expect(computeOfflineMs(savedAt, now)).toBe(OFFLINE_CAP_MS);
  });
});

describe("bootTile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("autosaves on interval and on pagehide", () => {
    const storage = createMemoryStorage();
    const root = document.createElement("main");
    const booted = bootTile(root, {
      content: fullContent,
      now: () => 1_000,
      storage,
      mountTile: (tileRoot, options) => mountTileShell(tileRoot, options),
    });

    vi.advanceTimersByTime(AUTOSAVE_MS);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();

    window.dispatchEvent(new Event("pagehide"));
    const afterHide = storage.getItem(SAVE_KEY);
    expect(afterHide).not.toBeNull();
    expect(JSON.parse(afterHide!)).toMatchObject({ schemaVersion: 1 });

    booted.dispose();
  });

  it("pre-mount ordering keeps offline Presentation Events away from tile handlers", () => {
    const storage = createMemoryStorage();
    const engine = createEngine(fullContent, undefined, DEFAULT_LOOT_SEED, () => 0);
    engine.advanceBy(1);
    const saved = engine.snapshot();
    saved.savedAtMs = 0;
    storage.setItem(SAVE_KEY, JSON.stringify(saved));

    const applyEvents = vi.fn();
    vi.spyOn(battleTile, "mountBattleTile").mockReturnValue({
      render: vi.fn(),
      applyEvents,
      destroy: vi.fn(),
    });

    const root = document.createElement("main");
    const nowMs = MIN_OFFLINE_MS + 5_000;
    const booted = bootTile(root, {
      content: fullContent,
      now: () => nowMs,
      storage,
      mountTile: (tileRoot, options) => mountTileShell(tileRoot, options),
    });
    booted.shell.stop();

    expect(applyEvents).not.toHaveBeenCalled();
    booted.dispose();
    vi.restoreAllMocks();
  });

  it("save JSON contains only Snapshot fields (no audio prefs)", () => {
    const storage = createMemoryStorage();
    storage.setItem("nightglass-mute", "true");
    const root = document.createElement("main");
    const booted = bootTile(root, {
      content: fullContent,
      storage,
      mountTile: (tileRoot, options) => mountTileShell(tileRoot, options),
    });
    vi.advanceTimersByTime(AUTOSAVE_MS);
    const raw = storage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as Record<string, unknown>;
    assertSnapshotOnlyPayload(parsed);
    booted.dispose();
  });
});

describe("offline boot", () => {
  it("awards no equipment during runOfflineBoot while live advanceBy still gains loot", () => {
    const now = () => 0;
    const live = createEngine(fullContent, undefined, DEFAULT_LOOT_SEED, now);
    live.advanceBy(1);
    const liveMs = 120_000;
    for (let elapsed = 0; elapsed < liveMs; elapsed += 250) {
      live.advanceBy(250);
    }
    const liveArmory = live.snapshot().progression.armory;

    const offlineSeed = createEngine(fullContent, undefined, DEFAULT_LOOT_SEED, now);
    offlineSeed.advanceBy(1);
    const savedAt = 0;
    const saved = offlineSeed.snapshot();
    saved.savedAtMs = savedAt;
    const offline = createEngine(fullContent, saved, undefined, () => liveMs);
    const armoryBefore = offline.snapshot().progression.armory.length;
    const { summary } = runOfflineBoot(offline, fullContent, savedAt, liveMs);
    const offlineArmory = offline.snapshot().progression.armory;

    expect(liveArmory.length).toBeGreaterThan(armoryBefore);
    expect(offlineArmory.length).toBe(armoryBefore);
    expect(summary?.drops ?? []).toEqual([]);
  });

  it("renders an offline summary without a Drops section for an 8-hour span", () => {
    const engine = createEngine(fullContent, undefined, DEFAULT_LOOT_SEED, () => 0);
    engine.advanceBy(1);
    const saved = engine.snapshot();
    saved.savedAtMs = 0;
    const offline = createEngine(fullContent, saved, undefined, () => OFFLINE_CAP_MS);
    const { summary } = runOfflineBoot(offline, fullContent, 0, OFFLINE_CAP_MS);
    expect(summary).not.toBeNull();
    expect(summary!.drops).toEqual([]);

    const root = document.createElement("main");
    mountOfflineSummary(root, summary!);
    expect(root.querySelector(".offline-summary-drops-title")).toBeNull();
    expect(root.querySelector(".offline-summary-drops")).toBeNull();
  });
});

describe("offline progress CI timing budget", () => {
  it("advances real content by the full 8h cap in under 2s wall time", () => {
    const engine = createEngine(fullContent, undefined, DEFAULT_LOOT_SEED);
    engine.advanceBy(1);
    const start = performance.now();
    engine.advanceOffline(OFFLINE_CAP_MS);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}
