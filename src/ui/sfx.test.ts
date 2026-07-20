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
  type CuePlayer,
  type OneShotSfxCueId,
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

interface CuePlayCall {
  cue: OneShotSfxCueId;
  volume: number;
}

function createCuePlayerStub() {
  const playCalls: CuePlayCall[] = [];
  const players: CuePlayer[] = [];
  const createCuePlayer = vi.fn((): CuePlayer => {
    const player: CuePlayer = {
      preload: vi.fn(),
      play: vi.fn((cue: OneShotSfxCueId, volume: number) => {
        playCalls.push({ cue, volume });
      }),
      destroy: vi.fn(),
    };
    players.push(player);
    return player;
  });
  return { createCuePlayer, playCalls, players };
}

function sfxTestDeps(overrides: Partial<SfxDeps> = {}) {
  const audio = createAudioStub();
  const cue = createCuePlayerStub();
  return {
    ...audio,
    ...cue,
    deps: {
      storage: storageStub(),
      createAudio: audio.createAudio,
      createCuePlayer: cue.createCuePlayer,
      ...overrides,
    } satisfies SfxDeps,
  };
}

function storageStub(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  let setItemCalls = 0;
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      setItemCalls += 1;
      map.set(key, value);
    },
    snapshot: () => Object.fromEntries(map),
    setItemCalls: () => setItemCalls,
    resetSetItemCalls: () => {
      setItemCalls = 0;
    },
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

function cuePlayCount(playCalls: CuePlayCall[], cue: OneShotSfxCueId): number {
  return playCalls.filter((call) => call.cue === cue).length;
}

describe("Presentation-event SFX", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts default-muted with no playback on Presentation Events", () => {
    const { deps, playCalls, createAudio } = sfxTestDeps();
    const sfx = createSfx(deps);
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
    expect(playCalls).toHaveLength(0);
    expect(createAudio).not.toHaveBeenCalled();
    expect(sfx.getPrefs().muted).toBe(true);
  });

  it("does not call play until releaseDueTo", () => {
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
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
    expect(playCalls).toHaveLength(0);
    sfx.releaseDueTo(1_000);
    expect(playCalls).toHaveLength(1);
  });

  it("plays the physical impact cue when unmuted", () => {
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
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
    expect(cuePlayCount(playCalls, "impact-physical")).toBe(1);
  });

  it("selects elemental vs physical impact cues per damage channel", () => {
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
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
    expect(cuePlayCount(playCalls, "impact-elemental")).toBe(1);
  });

  it("de-dupes same-timestamp impact cues to one play per damage channel", () => {
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
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
    expect(cuePlayCount(playCalls, "impact-physical")).toBe(1);
  });

  it("wires knockout, wave-started, stage-cleared, and party-defeat cues", () => {
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
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
      expect(cuePlayCount(playCalls, cue)).toBeGreaterThan(0);
    }
  });

  it("releaseDueTo plays due cues in ascending atMs order", () => {
    const playedCues: OneShotSfxCueId[] = [];
    const createCuePlayer = vi.fn((): CuePlayer => ({
      preload: vi.fn(),
      play: vi.fn((cue: OneShotSfxCueId) => {
        playedCues.push(cue);
      }),
      destroy: vi.fn(),
    }));
    const sfx = createSfx({ storage: storageStub(), createCuePlayer });
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
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
    sfx.setMuted(false);
    sfx.handleEvents([{ seq: 1, atMs: 2_000, type: "knockout", entityId: "opp:1:0" }]);
    sfx.releaseDueTo(1_000);
    expect(playCalls).toHaveLength(0);
    sfx.releaseDueTo(2_000);
    expect(playCalls).toHaveLength(1);
  });

  it("plays each queued cue exactly once across repeated releaseDueTo calls", () => {
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
    sfx.setMuted(false);
    sfx.handleEvents([{ seq: 1, atMs: 500, type: "knockout", entityId: "opp:1:0" }]);
    sfx.releaseDueTo(500);
    sfx.releaseDueTo(500);
    sfx.releaseDueTo(1_000);
    expect(cuePlayCount(playCalls, "knockout")).toBe(1);
  });

  it("drops cues more than PUMP_INTERVAL_MS behind nowMs at release", () => {
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
    sfx.setMuted(false);
    sfx.handleEvents([{ seq: 1, atMs: 0, type: "knockout", entityId: "opp:1:0" }]);
    const nowMs = PUMP_INTERVAL_MS + 1;
    sfx.releaseDueTo(nowMs);
    expect(playCalls).toHaveLength(0);
  });

  it(`plays at most ${MAX_CUES_PER_RELEASE} cues per releaseDueTo and drops the rest`, () => {
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
    sfx.setMuted(false);
    const events: EngineEvent[] = Array.from({ length: 8 }, (_, index) => ({
      seq: index + 1,
      atMs: 1_000,
      type: "knockout" as const,
      entityId: `opp:1:${index}`,
    }));
    sfx.handleEvents(events);
    sfx.releaseDueTo(1_000);
    expect(playCalls).toHaveLength(MAX_CUES_PER_RELEASE);
    sfx.releaseDueTo(1_000);
    expect(playCalls).toHaveLength(MAX_CUES_PER_RELEASE);
  });

  it("round-trips audio prefs in nightglass-audio-v1 without touching the save key", () => {
    const storage = storageStub({ [SAVE_KEY]: '{"schemaVersion":1}' });
    const { createAudio, createCuePlayer } = sfxTestDeps({ storage }).deps;
    const sfx = createSfx({ storage, createAudio, createCuePlayer });
    sfx.setMuted(false);
    sfx.setVolume(0.42);
    const raw = storage.snapshot()[AUDIO_PREFS_KEY];
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ muted: false, volume: 0.42 });
    expect(storage.snapshot()[SAVE_KEY]).toBe('{"schemaVersion":1}');
    const reloaded = createSfx({ storage, createAudio, createCuePlayer });
    expect(reloaded.getPrefs()).toEqual({ muted: false, volume: 0.42 });
  });

  it("stops the ambient loop when the document becomes hidden", () => {
    const { createAudio, instances } = createAudioStub();
    const { createCuePlayer } = createCuePlayerStub();
    const doc = document.implementation.createHTMLDocument("test");
    Object.defineProperty(doc, "hidden", { value: false, configurable: true });
    const sfx = createSfx({ storage: storageStub(), createAudio, createCuePlayer, document: doc });
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
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
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
    expect(cuePlayCount(playCalls, "impact-physical")).toBe(1);
    expect(cuePlayCount(playCalls, "impact-elemental")).toBe(1);
  });

  it("preloads every one-shot cue when createSfx is constructed", () => {
    const { deps, players } = sfxTestDeps();
    createSfx(deps);
    expect(players[0]?.preload).toHaveBeenCalledTimes(1);
  });

  it("does not construct HTMLAudioElement instances for one-shot cues", () => {
    const { deps, createAudio } = sfxTestDeps();
    const sfx = createSfx(deps);
    sfx.setMuted(false);
    for (let index = 0; index < 20; index += 1) {
      sfx.handleEvents([
        { seq: index, atMs: index * 10, type: "knockout", entityId: "opp:1:0" },
      ]);
      sfx.releaseDueTo(index * 10);
    }
    const ambientCalls = createAudio.mock.calls.filter((call) =>
      String(call[0]).includes(CUE_IDS["ambient-night-garden"]),
    );
    expect(createAudio.mock.calls.length).toBe(ambientCalls.length);
  });

  it("clearing via destroy prevents later releaseDueTo playback", () => {
    const { deps, playCalls } = sfxTestDeps();
    const sfx = createSfx(deps);
    sfx.setMuted(false);
    sfx.handleEvents([{ seq: 1, atMs: 100, type: "knockout", entityId: "opp:1:0" }]);
    sfx.destroy();
    sfx.releaseDueTo(100);
    expect(playCalls).toHaveLength(0);
  });

  it("destroy tears down the cue player", () => {
    const { deps, players } = sfxTestDeps();
    const sfx = createSfx(deps);
    sfx.destroy();
    expect(players[0]?.destroy).toHaveBeenCalledTimes(1);
  });

  it("persists volume once when the slider is released, not on each input event", () => {
    const storage = storageStub();
    const { createAudio, createCuePlayer } = sfxTestDeps({ storage }).deps;
    const sfx = createSfx({ storage, createAudio, createCuePlayer });
    const controls = sfx.mountStatusControls();
    const slider = controls.querySelector<HTMLInputElement>(".audio-volume-slider");
    expect(slider).not.toBeNull();
    storage.resetSetItemCalls();

    slider!.value = "40";
    slider!.dispatchEvent(new Event("input", { bubbles: true }));
    slider!.value = "60";
    slider!.dispatchEvent(new Event("input", { bubbles: true }));
    expect(storage.setItemCalls()).toBe(0);

    slider!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(storage.setItemCalls()).toBe(1);
    expect(sfx.getPrefs().volume).toBe(0.6);
  });

  it("toggles mute from the status-line control with keyboard", () => {
    const { deps } = sfxTestDeps();
    const sfx = createSfx(deps);
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
