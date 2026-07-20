import type { EngineEvent } from "../core/events";
import type { DamageChannel } from "../core/types";
import ambientNightGardenUrl from "../assets/audio/ambient-night-garden.ogg";
import dropAwardedUrl from "../assets/audio/drop-awarded.ogg";
import impactElementalUrl from "../assets/audio/impact-elemental.ogg";
import impactPhysicalUrl from "../assets/audio/impact-physical.ogg";
import knockoutUrl from "../assets/audio/knockout.ogg";
import partyDefeatUrl from "../assets/audio/party-defeat.ogg";
import stageClearedUrl from "../assets/audio/stage-cleared.ogg";
import waveStartedUrl from "../assets/audio/wave-started.ogg";
import { PUMP_INTERVAL_MS } from "./pump";

export const AUDIO_PREFS_KEY = "nightglass-audio-v1";

export const MAX_CUES_PER_RELEASE = 4;

const ONE_SHOT_CUE_IDS = [
  "impact-physical",
  "impact-elemental",
  "knockout",
  "wave-started",
  "stage-cleared",
  "party-defeat",
  "drop-awarded",
] as const;

export type OneShotSfxCueId = (typeof ONE_SHOT_CUE_IDS)[number];

export interface AudioPrefs {
  muted: boolean;
  volume: number;
}

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  muted: true,
  volume: 0.75,
};

export const CUE_IDS = {
  "impact-physical": "impact-physical",
  "impact-elemental": "impact-elemental",
  knockout: "knockout",
  "wave-started": "wave-started",
  "stage-cleared": "stage-cleared",
  "party-defeat": "party-defeat",
  "drop-awarded": "drop-awarded",
  "ambient-night-garden": "ambient-night-garden",
} as const;

export type SfxCueId = keyof typeof CUE_IDS;

const CUE_URLS: Record<SfxCueId, string> = {
  "impact-physical": impactPhysicalUrl,
  "impact-elemental": impactElementalUrl,
  knockout: knockoutUrl,
  "wave-started": waveStartedUrl,
  "stage-cleared": stageClearedUrl,
  "party-defeat": partyDefeatUrl,
  "drop-awarded": dropAwardedUrl,
  "ambient-night-garden": ambientNightGardenUrl,
};

export interface PlayableAudio {
  src: string;
  volume: number;
  loop: boolean;
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
}

export interface CuePlayer {
  /** Starts background decode of every cue. Called once during createSfx. */
  preload(): void;
  /** Plays `cue` at `volume` (0..1). No-op if that cue is not decoded yet. */
  play(cue: OneShotSfxCueId, volume: number): void;
  /** Releases decoded buffers and closes the audio context. */
  destroy(): void;
}

export interface SfxDeps {
  storage?: Pick<Storage, "getItem" | "setItem">;
  document?: Document;
  /** Ambient loop only. Cues no longer use this. */
  createAudio?: (src: string) => PlayableAudio;
  createCuePlayer?: () => CuePlayer;
}

interface QueuedCue {
  atMs: number;
  cue: OneShotSfxCueId;
}

export interface SfxController {
  /** Queues cues from a tick's events, keyed by each event's atMs. Does not play them. */
  handleEvents(events: EngineEvent[]): void;
  /** Plays every queued cue with atMs <= nowMs, in atMs order, then drops them. */
  releaseDueTo(nowMs: number): void;
  getPrefs(): AudioPrefs;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  toggleMuted(): void;
  mountStatusControls(): HTMLElement;
  destroy(): void;
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return DEFAULT_AUDIO_PREFS.volume;
  }
  return Math.min(1, Math.max(0, volume));
}

function readPrefs(storage: Pick<Storage, "getItem">): AudioPrefs {
  const raw = storage.getItem(AUDIO_PREFS_KEY);
  if (!raw) {
    return { ...DEFAULT_AUDIO_PREFS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      muted: parsed.muted ?? DEFAULT_AUDIO_PREFS.muted,
      volume: clampVolume(parsed.volume ?? DEFAULT_AUDIO_PREFS.volume),
    };
  } catch {
    return { ...DEFAULT_AUDIO_PREFS };
  }
}

function writePrefs(storage: Pick<Storage, "setItem">, prefs: AudioPrefs): void {
  storage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs));
}

function impactChannelsForEvent(event: Extract<EngineEvent, { type: "impact" }>): DamageChannel[] {
  const channels = new Set<DamageChannel>();
  for (const result of event.results) {
    if (result.kind !== "damage") {
      continue;
    }
    channels.add(result.channel ?? "physical");
  }
  return [...channels];
}

function cuesForEvent(
  event: EngineEvent,
  impactKeys: Set<string>,
): { atMs: number; cue: OneShotSfxCueId }[] {
  const queued: { atMs: number; cue: OneShotSfxCueId }[] = [];
  switch (event.type) {
    case "impact": {
      for (const channel of impactChannelsForEvent(event)) {
        const key = `${event.atMs}:${channel}`;
        if (impactKeys.has(key)) {
          continue;
        }
        impactKeys.add(key);
        queued.push({
          atMs: event.atMs,
          cue: channel === "physical" ? "impact-physical" : "impact-elemental",
        });
      }
      break;
    }
    case "knockout":
      queued.push({ atMs: event.atMs, cue: "knockout" });
      break;
    case "wave-started":
      queued.push({ atMs: event.atMs, cue: "wave-started" });
      break;
    case "stage-cleared":
      queued.push({ atMs: event.atMs, cue: "stage-cleared" });
      break;
    case "party-defeat":
      queued.push({ atMs: event.atMs, cue: "party-defeat" });
      break;
    case "drop-awarded":
      queued.push({ atMs: event.atMs, cue: "drop-awarded" });
      break;
    default:
      break;
  }
  return queued;
}

interface DefaultCuePlayer extends CuePlayer {
  resumeIfSuspended(): Promise<void>;
}

function createDefaultCuePlayer(): DefaultCuePlayer {
  let ctx: AudioContext | null = null;
  const buffers = new Map<OneShotSfxCueId, AudioBuffer>();

  function getContext(): AudioContext {
    if (!ctx) {
      ctx = new AudioContext();
    }
    return ctx;
  }

  return {
    preload(): void {
      for (const cue of ONE_SHOT_CUE_IDS) {
        const url = CUE_URLS[cue];
        void fetch(url)
          .then((response) => response.arrayBuffer())
          .then((arrayBuffer) => getContext().decodeAudioData(arrayBuffer))
          .then((buffer) => {
            buffers.set(cue, buffer);
          })
          .catch(() => {
            /* skip failed decode */
          });
      }
    },

    play(cue: OneShotSfxCueId, volume: number): void {
      const buffer = buffers.get(cue);
      if (!buffer || !ctx) {
        return;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    },

    async resumeIfSuspended(): Promise<void> {
      if (ctx?.state === "suspended") {
        await ctx.resume();
      }
    },

    destroy(): void {
      buffers.clear();
      if (ctx) {
        void ctx.close();
        ctx = null;
      }
    },
  };
}

function isDefaultCuePlayer(player: CuePlayer): player is DefaultCuePlayer {
  return "resumeIfSuspended" in player;
}

export function createSfx(deps: SfxDeps = {}): SfxController {
  const storage = deps.storage ?? localStorage;
  const doc = deps.document ?? document;
  const createAudio =
    deps.createAudio ??
    ((src: string) => {
      const audio = new Audio(src);
      return audio;
    });
  const cuePlayer = deps.createCuePlayer?.() ?? createDefaultCuePlayer();

  let prefs = readPrefs(storage);
  let ambient: PlayableAudio | null = null;
  let controlsRoot: HTMLElement | null = null;
  let popoverOpen = false;
  let onDocumentClick: ((event: MouseEvent) => void) | null = null;
  const cueQueue: QueuedCue[] = [];

  cuePlayer.preload();

  function applyVolume(audio: PlayableAudio): void {
    audio.volume = prefs.muted ? 0 : prefs.volume;
  }

  function persistPrefs(): void {
    writePrefs(storage, prefs);
  }

  function applyVolumePreference(volume: number): void {
    prefs = { ...prefs, volume: clampVolume(volume) };
    if (ambient) {
      applyVolume(ambient);
    }
  }

  function playCue(cue: OneShotSfxCueId): void {
    if (prefs.muted) {
      return;
    }
    cuePlayer.play(cue, prefs.volume);
  }

  function stopAmbient(): void {
    if (!ambient) {
      return;
    }
    ambient.pause();
    ambient.currentTime = 0;
  }

  function startAmbient(): void {
    if (prefs.muted || doc.hidden || !controlsRoot) {
      stopAmbient();
      return;
    }
    if (!ambient) {
      ambient = createAudio(CUE_URLS["ambient-night-garden"]);
      ambient.loop = false;
    }
    applyVolume(ambient);
    void ambient.play();
  }

  function syncAmbient(): void {
    if (prefs.muted || doc.hidden) {
      stopAmbient();
      return;
    }
    startAmbient();
  }

  function updateMuteButton(button: HTMLButtonElement): void {
    button.textContent = prefs.muted ? "🔇" : "🔊";
    button.setAttribute("aria-label", prefs.muted ? "Unmute audio" : "Mute audio");
    button.setAttribute("aria-pressed", prefs.muted ? "true" : "false");
  }

  function closePopover(popover: HTMLElement): void {
    popover.hidden = true;
    popoverOpen = false;
  }

  function onVisibilityChange(): void {
    syncAmbient();
  }

  doc.addEventListener("visibilitychange", onVisibilityChange);

  function dropStaleCues(nowMs: number): void {
    const staleBefore = nowMs - PUMP_INTERVAL_MS;
    for (let index = cueQueue.length - 1; index >= 0; index -= 1) {
      if (cueQueue[index]!.atMs < staleBefore) {
        cueQueue.splice(index, 1);
      }
    }
  }

  return {
    handleEvents(events: EngineEvent[]): void {
      const impactKeys = new Set<string>();
      for (const event of events) {
        cueQueue.push(...cuesForEvent(event, impactKeys));
      }
    },

    releaseDueTo(nowMs: number): void {
      dropStaleCues(nowMs);

      const due: QueuedCue[] = [];
      for (let index = cueQueue.length - 1; index >= 0; index -= 1) {
        const entry = cueQueue[index]!;
        if (entry.atMs <= nowMs) {
          due.push(entry);
          cueQueue.splice(index, 1);
        }
      }

      due.sort((left, right) => left.atMs - right.atMs);

      const toPlay = due.slice(0, MAX_CUES_PER_RELEASE);
      for (const entry of toPlay) {
        playCue(entry.cue);
      }
    },

    getPrefs(): AudioPrefs {
      return { ...prefs };
    },

    setMuted(muted: boolean): void {
      prefs = { ...prefs, muted };
      persistPrefs();
      if (!muted && isDefaultCuePlayer(cuePlayer)) {
        void cuePlayer.resumeIfSuspended();
      }
      syncAmbient();
      const muteButton = controlsRoot?.querySelector<HTMLButtonElement>(".audio-mute-toggle");
      if (muteButton) {
        updateMuteButton(muteButton);
      }
    },

    setVolume(volume: number): void {
      applyVolumePreference(volume);
      persistPrefs();
    },

    toggleMuted(): void {
      this.setMuted(!prefs.muted);
    },

    mountStatusControls(): HTMLElement {
      if (controlsRoot) {
        return controlsRoot;
      }

      const root = doc.createElement("div");
      root.className = "audio-controls";

      const muteButton = doc.createElement("button");
      muteButton.type = "button";
      muteButton.className = "status-button audio-mute-toggle focus-ring";
      updateMuteButton(muteButton);

      const volumeToggle = doc.createElement("button");
      volumeToggle.type = "button";
      volumeToggle.className = "status-button audio-volume-toggle focus-ring";
      volumeToggle.setAttribute("aria-label", "Audio volume");
      volumeToggle.setAttribute("aria-haspopup", "dialog");
      volumeToggle.textContent = "▾";

      const popover = doc.createElement("div");
      popover.className = "audio-volume-popover";
      popover.hidden = true;
      popover.setAttribute("role", "dialog");
      popover.setAttribute("aria-label", "Master volume");

      const label = doc.createElement("label");
      label.className = "audio-volume-label";
      label.textContent = "Volume";

      const slider = doc.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "100";
      slider.step = "1";
      slider.className = "audio-volume-slider focus-ring";
      slider.value = String(Math.round(prefs.volume * 100));
      slider.setAttribute("aria-valuemin", "0");
      slider.setAttribute("aria-valuemax", "100");
      slider.setAttribute("aria-valuenow", slider.value);

      label.append(slider);
      popover.append(label);

      function togglePopover(): void {
        popoverOpen = !popoverOpen;
        popover.hidden = !popoverOpen;
        if (popoverOpen) {
          slider.focus();
        }
      }

      muteButton.addEventListener("click", () => {
        this.toggleMuted();
      });
      muteButton.addEventListener("keydown", (event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          this.toggleMuted();
        }
      });

      volumeToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        togglePopover();
      });
      volumeToggle.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        togglePopover();
      });

      muteButton.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        togglePopover();
      });

      slider.addEventListener("input", () => {
        const volume = Number(slider.value) / 100;
        applyVolumePreference(volume);
        slider.setAttribute("aria-valuenow", slider.value);
      });

      slider.addEventListener("change", () => {
        persistPrefs();
      });

      onDocumentClick = (event: MouseEvent) => {
        if (!popoverOpen) {
          return;
        }
        const target = event.target;
        if (target instanceof Node && root.contains(target)) {
          return;
        }
        closePopover(popover);
      };
      doc.addEventListener("click", onDocumentClick);

      root.append(muteButton, volumeToggle, popover);
      controlsRoot = root;
      syncAmbient();
      return root;
    },

    destroy(): void {
      doc.removeEventListener("visibilitychange", onVisibilityChange);
      if (onDocumentClick) {
        doc.removeEventListener("click", onDocumentClick);
        onDocumentClick = null;
      }
      cueQueue.length = 0;
      stopAmbient();
      ambient = null;
      controlsRoot = null;
      cuePlayer.destroy();
    },
  };
}
