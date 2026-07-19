// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as battleTile from "./battle-tile";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
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
import { mountTileShell } from "../main";

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
      content: fixtureContent,
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
    const engine = createEngine(fixtureContent, undefined, DEFAULT_LOOT_SEED, () => 0);
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
      content: fixtureContent,
      now: () => nowMs,
      storage,
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
      content: fixtureContent,
      storage,
      mountTile: (tileRoot, options) => mountTileShell(tileRoot, options),
    });
    vi.advanceTimersByTime(AUTOSAVE_MS);
    const raw = storage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("mute");
    expect(parsed).not.toHaveProperty("volume");
    expect(parsed).toHaveProperty("progression");
    booted.dispose();
  });
});

describe("offline loot equivalence", () => {
  it("consumes the same loot stream for live stepping and one offline advanceBy", () => {
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
    runOfflineBoot(offline, fullContent, savedAt, liveMs);
    const offlineArmory = offline.snapshot().progression.armory;

    expect(offlineArmory.map((drop) => drop.dropId)).toEqual(
      liveArmory.map((drop) => drop.dropId),
    );
    expect(offlineArmory).toEqual(liveArmory);
  });
});

describe("offline progress CI timing budget", () => {
  it("advances real content by the full 8h cap in under 2s wall time", () => {
    const engine = createEngine(fullContent, undefined, DEFAULT_LOOT_SEED);
    engine.advanceBy(1);
    const start = performance.now();
    engine.advanceBy(OFFLINE_CAP_MS);
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
