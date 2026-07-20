// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { EngineEvent } from "../core/events";
import { SAVE_KEY } from "./boot";
import {
  AUDIO_PREFS_KEY,
  CUE_IDS,
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
    expect(instances).toHaveLength(0);
    expect(sfx.getPrefs().muted).toBe(true);
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
    expect(instances.some((audio) => audio.src.includes(CUE_IDS["impact-elemental"]))).toBe(true);
  });

  it("de-dupes same-timestamp impact cues to one play per damage channel", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    const batch = Array.from({ length: 5 }, (_, index) =>
      impactEvent(2_000, [
        {
          targetId: `opp:1:${index}`,
          kind: "damage",
          channel: "physical",
          amount: 1,
          healthAfter: 9 - index,
        },
      ]),
    );
    sfx.handleEvents(batch);
    const physicalPlays = instances.filter((audio) => audio.src.includes(CUE_IDS["impact-physical"]));
    expect(physicalPlays).toHaveLength(1);
  });

  it("wires knockout, wave-started, stage-cleared, party-defeat, and drop-awarded cues", () => {
    const { createAudio, instances } = createAudioStub();
    const sfx = createSfx(defaultDeps({ createAudio }));
    sfx.setMuted(false);
    const events: EngineEvent[] = [
      { seq: 1, atMs: 100, type: "wave-started", stage: 1, encounter: 1, boss: false },
      { seq: 2, atMs: 200, type: "knockout", entityId: "opp:1:0" },
      { seq: 3, atMs: 300, type: "stage-cleared", stage: 1 },
      { seq: 4, atMs: 400, type: "party-defeat", stage: 1 },
      { seq: 5, atMs: 500, type: "drop-awarded", dropId: 1 },
    ];
    sfx.handleEvents(events);
    for (const cue of [
      "wave-started",
      "knockout",
      "stage-cleared",
      "party-defeat",
      "drop-awarded",
    ] as const) {
      expect(instances.some((audio) => audio.src.includes(CUE_IDS[cue]))).toBe(true);
    }
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
    expect(instances.some((audio) => audio.src.includes(CUE_IDS["impact-physical"]))).toBe(true);
    expect(instances.some((audio) => audio.src.includes(CUE_IDS["impact-elemental"]))).toBe(true);
    expect(instances).toHaveLength(2);
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
