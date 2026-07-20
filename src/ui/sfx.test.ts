// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { EngineEvent } from "../core/events";
import { opponentEntityId } from "../core/entity-id";
import { PUMP_INTERVAL_MS } from "./pump";
import { SAVE_KEY } from "./boot";
import {
  AUDIO_PREFS_KEY,
  CUE_IDS,
  MAX_CUES_PER_RELEASE,
  createSfx,
  type PlayableAudio,
  type SfxDeps,
} from "./sfx";

function createAudioStub() {
  const instances: PlayableAudio[] = [];
  const createAudio = vi.fn((src: string): PlayableAudio => {
    const audio: PlayableAudio = {
      src,
      volume: 1,
      loop: false,
      currentTime: 0,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
    };
    instances.push(audio);
    return audio;
  });
  return { createAudio, instances };
}

function storageStub(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    snapshot: () => Object.fromEntries(map),
  };
}

function impactEvent(
  atMs: number,
  results: Extract<EngineEvent, { type: "impact" }>["results"],
): EngineEvent {
  return {
    seq: 1,
    atMs,
    type: "impact",
    entityId: "party:knight:front",
    abilityId: "fixture-strike",
    results,
  };
}

function defaultDeps(overrides: Partial<SfxDeps> = {}): SfxDeps {
  return { storage: storageStub(), ...overrides };
}

function playedCount(instances: PlayableAudio[]): number {
  return instances.filter((audio) => vi.mocked(audio.play).mock.calls.length > 0).length;
}

describe("Presentation-event SFX", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts default-muted with no playback on Presentation Events", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.handleEvents([
      impactEvent(1_000, [
        {
          targetId: "opp:1:0",
          kind: "damage",
          channel: "physical",
          amount: 3,
          healthAfter: 7,
        },
      ]),
    ]);
    sfx.releaseDueTo(1_000);
    expect(instances).toHaveLength(0);
    expect(sfx.getPrefs().muted).toBe(true);
  });

  it("does not call play until releaseDueTo", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    sfx.handleEvents([
      impactEvent(1_000, [
        {
          targetId: "opp:1:0",
          kind: "damage",
          channel: "physical",
          amount: 3,
          healthAfter: 7,
        },
      ]),
    ]);
    expect(playedCount(instances)).toBe(0);
    sfx.releaseDueTo(1_000);
    expect(playedCount(instances)).toBe(1);
  });

  it("plays the physical impact cue when unmuted", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    sfx.handleEvents([
      impactEvent(1_000, [
        {
          targetId: "opp:1:0",
          kind: "damage",
          channel: "physical",
          amount: 3,
          healthAfter: 7,
        },
      ]),
    ]);
    sfx.releaseDueTo(1_000);
    expect(instances.some((audio) => audio.src.includes(CUE_IDS["impact-physical"]))).toBe(true);
    expect(instances.find((audio) => audio.src.includes(CUE_IDS["impact-physical"]))?.play).toHaveBeenCalled();
  });

  it("selects elemental vs physical impact cues per damage channel", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    sfx.handleEvents([
      impactEvent(1_000, [
        {
          targetId: "opp:1:0",
          kind: "damage",
          channel: "elemental",
          amount: 2,
          healthAfter: 8,
        },
      ]),
    ]);
    sfx.releaseDueTo(1_000);
    expect(instances.some((audio) => audio.src.includes(CUE_IDS["impact-elemental"]))).toBe(true);
  });

  it("de-dupes same-timestamp impact cues to one play per damage channel", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    const batch = Array.from({ length: 5 }, (_, index) =>
      impactEvent(2_000, [
        {
          targetId: opponentEntityId("1", index),
          kind: "damage",
          channel: "physical",
          amount: 1,
          healthAfter: 9 - index,
        },
      ]),
    );
    sfx.handleEvents(batch);
    sfx.releaseDueTo(2_000);
    const physicalPlayCalls = instances
      .filter((audio) => audio.src.includes(CUE_IDS["impact-physical"]))
      .reduce((count, audio) => count + vi.mocked(audio.play).mock.calls.length, 0);
    expect(physicalPlayCalls).toBe(1);
  });

  it("wires knockout, wave-started, stage-cleared, and party-defeat cues", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    const baseAtMs = 1_000;
    const events: EngineEvent[] = [
      { seq: 1, atMs: baseAtMs, type: "wave-started", stage: 1, encounter: 1, boss: false },
      { seq: 2, atMs: baseAtMs + 10, type: "knockout", entityId: "opp:1:0" },
      { seq: 3, atMs: baseAtMs + 20, type: "stage-cleared", stage: 1 },
      { seq: 4, atMs: baseAtMs + 30, type: "party-defeat", stage: 1 },
    ];
    sfx.handleEvents(events);
    sfx.releaseDueTo(baseAtMs + 30);
    for (const cue of [
      "wave-started",
      "knockout",
      "stage-cleared",
      "party-defeat",
    ] as const) {
      const plays = instances
        .filter((audio) => audio.src.includes(CUE_IDS[cue]))
        .reduce((count, audio) => count + vi.mocked(audio.play).mock.calls.length, 0);
      expect(plays).toBeGreaterThan(0);
    }
  });

  it("releaseDueTo plays due cues in ascending atMs order", () => {
    const playedCues: string[] = [];
    const createAudio = vi.fn((src: string): PlayableAudio => {
      const audio: PlayableAudio = {
        src,
        volume: 1,
        loop: false,
        currentTime: 0,
        play: vi.fn().mockImplementation(async () => {
          if (src.includes(CUE_IDS["wave-started"])) {
            playedCues.push("wave-started");
          } else if (src.includes(CUE_IDS["drop-awarded"])) {
            playedCues.push("drop-awarded");
          } else if (src.includes(CUE_IDS.knockout)) {
            playedCues.push("knockout");
          }
        }),
        pause: vi.fn(),
      };
      return audio;
    });
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    sfx.handleEvents([
      { seq: 3, atMs: 300, type: "knockout", entityId: "opp:1:0" },
      { seq: 1, atMs: 100, type: "wave-started", stage: 1, encounter: 1, boss: false },
      { seq: 2, atMs: 200, type: "drop-awarded", dropId: 1 },
    ]);
    sfx.releaseDueTo(300);
    expect(playedCues).toEqual(["wave-started", "drop-awarded", "knockout"]);
    sfx.releaseDueTo(300);
    expect(playedCues).toEqual(["wave-started", "drop-awarded", "knockout"]);
  });

  it("releaseDueTo skips cues with atMs after nowMs", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    sfx.handleEvents([{ seq: 1, atMs: 2_000, type: "knockout", entityId: "opp:1:0" }]);
    sfx.releaseDueTo(1_000);
    expect(playedCount(instances)).toBe(0);
    sfx.releaseDueTo(2_000);
    expect(playedCount(instances)).toBe(1);
  });

  it("plays each queued cue exactly once across repeated releaseDueTo calls", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    sfx.handleEvents([{ seq: 1, atMs: 500, type: "knockout", entityId: "opp:1:0" }]);
    sfx.releaseDueTo(500);
    sfx.releaseDueTo(500);
    sfx.releaseDueTo(1_000);
    const knockoutPlays = instances
      .filter((audio) => audio.src.includes(CUE_IDS.knockout))
      .reduce((sum, audio) => sum + vi.mocked(audio.play).mock.calls.length, 0);
    expect(knockoutPlays).toBe(1);
  });

  it("drops cues more than PUMP_INTERVAL_MS behind nowMs at release", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    sfx.handleEvents([{ seq: 1, atMs: 0, type: "knockout", entityId: "opp:1:0" }]);
    const nowMs = PUMP_INTERVAL_MS + 1;
    sfx.releaseDueTo(nowMs);
    expect(playedCount(instances)).toBe(0);
  });

  it(`plays at most ${MAX_CUES_PER_RELEASE} cues per releaseDueTo and drops the rest`, () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    const events: EngineEvent[] = Array.from({ length: 8 }, (_, index) => ({
      seq: index + 1,
      atMs: 1_000,
      type: "knockout" as const,
      entityId: `opp:1:${index}`,
    }));
    sfx.handleEvents(events);
    sfx.releaseDueTo(1_000);
    expect(playedCount(instances)).toBe(MAX_CUES_PER_RELEASE);
    sfx.releaseDueTo(1_000);
    expect(playedCount(instances)).toBe(MAX_CUES_PER_RELEASE);
  });

  it("round-trips audio prefs in nightglass-audio-v1 without touching the save key", () => {
    const storage = storageStub({ [SAVE_KEY]: '{"schemaVersion":1}' });
    const { createAudio } = createAudioStub();
    const sfx = createSfx({ storage, createAudio });
    sfx.setMuted(false);
    sfx.setVolume(0.42);
    const raw = storage.snapshot()[AUDIO_PREFS_KEY];
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ muted: false, volume: 0.42 });
    expect(storage.snapshot()[SAVE_KEY]).toBe('{"schemaVersion":1}');
    const reloaded = createSfx({ storage, createAudio });
    expect(reloaded.getPrefs()).toEqual({ muted: false, volume: 0.42 });
  });

  it("stops the ambient loop when the document becomes hidden", () => {
    const { createAudio, instances } = createAudioStub();
    const doc = document.implementation.createHTMLDocument("test");
    Object.defineProperty(doc, "hidden", { value: false, configurable: true });
    const sfx = createSfx(defaultDeps({ createAudio, document: doc }));
    sfx.mountStatusControls();
    sfx.setMuted(false);
    const ambient = instances.find((audio) => audio.src.includes(CUE_IDS["ambient-night-garden"]));
    expect(ambient?.loop).toBe(true);
    expect(ambient?.play).toHaveBeenCalled();

    Object.defineProperty(doc, "hidden", { value: true, configurable: true });
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(ambient?.pause).toHaveBeenCalled();
  });

  it("plays one impact cue per channel for a same-timestamp batch", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    sfx.handleEvents([
      impactEvent(3_000, [
        {
          targetId: "opp:1:0",
          kind: "damage",
          channel: "physical",
          amount: 1,
          healthAfter: 9,
        },
        {
          targetId: "opp:1:1",
          kind: "damage",
          channel: "elemental",
          amount: 1,
          healthAfter: 9,
        },
      ]),
    ]);
    sfx.releaseDueTo(3_000);
    const physicalPlays = instances
      .filter((audio) => audio.src.includes(CUE_IDS["impact-physical"]))
      .reduce((count, audio) => count + vi.mocked(audio.play).mock.calls.length, 0);
    const elementalPlays = instances
      .filter((audio) => audio.src.includes(CUE_IDS["impact-elemental"]))
      .reduce((count, audio) => count + vi.mocked(audio.play).mock.calls.length, 0);
    expect(physicalPlays).toBe(1);
    expect(elementalPlays).toBe(1);
  });

  it("reuses a bounded pool of audio elements for repeated plays", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    for (let index = 0; index < 20; index += 1) {
      sfx.handleEvents([
        { seq: index, atMs: index * 10, type: "knockout", entityId: "opp:1:0" },
      ]);
      sfx.releaseDueTo(index * 10);
    }
    const knockoutInstances = instances.filter((audio) => audio.src.includes(CUE_IDS.knockout));
    expect(knockoutInstances.length).toBeLessThanOrEqual(4);
    expect(createAudio.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it("resets currentTime to 0 before play on a reused element", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    for (let index = 0; index < 4; index += 1) {
      sfx.handleEvents([
        { seq: index, atMs: index * 10, type: "knockout", entityId: "opp:1:0" },
      ]);
      sfx.releaseDueTo(index * 10);
    }
    const firstPlayed = instances.find((audio) => vi.mocked(audio.play).mock.calls.length > 0);
    expect(firstPlayed).toBeDefined();
    firstPlayed!.currentTime = 42;
    sfx.handleEvents([{ seq: 99, atMs: 100, type: "knockout", entityId: "opp:1:0" }]);
    sfx.releaseDueTo(100);
    expect(firstPlayed!.currentTime).toBe(0);
  });

  it("clearing via destroy prevents later releaseDueTo playback", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    sfx.handleEvents([{ seq: 1, atMs: 100, type: "knockout", entityId: "opp:1:0" }]);
    sfx.destroy();
    sfx.releaseDueTo(100);
    expect(playedCount(instances)).toBe(0);
  });

  it("toggles mute from the status-line control with keyboard", () => {
    const { createAudio } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    const controls = sfx.mountStatusControls();
    const muteButton = controls.querySelector<HTMLButtonElement>(".audio-mute-toggle");
    expect(muteButton).not.toBeNull();
    muteButton!.focus();
    muteButton!.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(sfx.getPrefs().muted).toBe(false);
    muteButton!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(sfx.getPrefs().muted).toBe(true);
  });
});
