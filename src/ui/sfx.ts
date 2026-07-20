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
const POOL_SIZE_PER_CUE = 4;

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

export interface SfxDeps {
  storage?: Pick<Storage, "getItem" | "setItem">;
  document?: Document;
  createAudio?: (src: string) => PlayableAudio;
}

interface QueuedCue {
  atMs: number;
  cue: SfxCueId;
}

interface PoolEntry {
  audio: PlayableAudio;
  lastStartedAt: number;
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
): { atMs: number; cue: SfxCueId }[] {
  const queued: { atMs: number; cue: SfxCueId }[] = [];
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

export function createSfx(deps: SfxDeps = {}): SfxController {
  const storage = deps.storage ?? localStorage;
  const doc = deps.document ?? document;
  const createAudio =
    deps.createAudio ??
    ((src: string) => {
      const audio = new Audio(src);
      return audio;
    });

  let prefs = readPrefs(storage);
  let ambient: PlayableAudio | null = null;
  let controlsRoot: HTMLElement | null = null;
  let popoverOpen = false;
  let onDocumentClick: ((event: MouseEvent) => void) | null = null;
  const cueQueue: QueuedCue[] = [];
  const pools = new Map<SfxCueId, PoolEntry[]>();
  let playGeneration = 0;

  function applyVolume(audio: PlayableAudio): void {
    audio.volume = prefs.muted ? 0 : prefs.volume;
  }

  function persistPrefs(): void {
    writePrefs(storage, prefs);
  }

  function acquirePooledAudio(cue: SfxCueId): PlayableAudio {
    let pool = pools.get(cue);
    if (!pool) {
      pool = Array.from({ length: POOL_SIZE_PER_CUE }, () => ({
        audio: createAudio(CUE_URLS[cue]),
        lastStartedAt: -1,
      }));
      pools.set(cue, pool);
    }
    let chosen = pool[0]!;
    for (const entry of pool) {
      if (entry.lastStartedAt < chosen.lastStartedAt) {
        chosen = entry;
      }
    }
    chosen.lastStartedAt = ++playGeneration;
    chosen.audio.currentTime = 0;
    return chosen.audio;
  }

  function playCue(cue: SfxCueId): void {
    if (prefs.muted) {
      return;
    }
    const audio = acquirePooledAudio(cue);
    applyVolume(audio);
    void audio.play();
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
      ambient.loop = true;
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
      syncAmbient();
      const muteButton = controlsRoot?.querySelector<HTMLButtonElement>(".audio-mute-toggle");
      if (muteButton) {
        updateMuteButton(muteButton);
      }
    },

    setVolume(volume: number): void {
      prefs = { ...prefs, volume: clampVolume(volume) };
      persistPrefs();
      if (ambient) {
        applyVolume(ambient);
      }
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
        this.setVolume(volume);
        slider.setAttribute("aria-valuenow", slider.value);
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
    },
  };
}
