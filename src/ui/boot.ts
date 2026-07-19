import { createEngine, type Engine } from "../core/engine";
import type { EngineEvent } from "../core/events";
import { parseStoredSave, type ParsedSave } from "../core/load-state";
import type { Snapshot } from "../core/snapshot";
import type { Content } from "../core/types";
import { mountTileShell, type TileShell, type TileShellOptions } from "../main";
import {
  mountOfflineSummary,
  summarizeOfflineProgress,
  type OfflineSummary,
} from "./offline-summary";

export const SAVE_KEY = "nightglass-save-v1";
export const AUTOSAVE_MS = 10_000;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const MIN_OFFLINE_MS = 60_000;
export const DEFAULT_LOOT_SEED = 42;

export interface BootDeps {
  content: Content;
  now?: () => number;
  storage?: Pick<Storage, "getItem" | "setItem">;
  mountTile?: (root: HTMLElement, options: TileShellOptions) => TileShell;
}

export interface BootResult {
  engine: Engine;
  shell: TileShell;
  offlineSummary: OfflineSummary | null;
  parsedSave: ParsedSave;
  dispose(): void;
}

export function readSave(storage: Pick<Storage, "getItem"> = localStorage): string | null {
  return storage.getItem(SAVE_KEY);
}

export function persistSave(engine: Engine, storage: Pick<Storage, "setItem"> = localStorage): void {
  storage.setItem(SAVE_KEY, JSON.stringify(engine.snapshot()));
}

export function computeOfflineMs(savedAtMs: number | undefined, nowMs: number): number {
  if (savedAtMs === undefined || !Number.isFinite(savedAtMs)) {
    return 0;
  }
  return Math.max(0, Math.min(nowMs - savedAtMs, OFFLINE_CAP_MS));
}

export interface OfflineBootResult {
  events: EngineEvent[];
  summary: OfflineSummary | null;
}

export function runOfflineBoot(
  engine: Engine,
  content: Content,
  savedAtMs: number | undefined,
  nowMs: number,
): OfflineBootResult {
  const offlineMs = computeOfflineMs(savedAtMs, nowMs);
  if (offlineMs < MIN_OFFLINE_MS) {
    return { events: [], summary: null };
  }

  const before = engine.snapshot();
  const events = engine.advanceBy(offlineMs);
  const afterAdvance = engine.snapshot();
  const capped = nowMs - (savedAtMs ?? nowMs) > OFFLINE_CAP_MS;
  const summary = summarizeOfflineProgress(
    events,
    before,
    afterAdvance,
    content,
    offlineMs,
    capped,
  );
  engine.beginFreshAttempt();
  return { events, summary };
}

export function bootTile(root: HTMLElement, deps: BootDeps): BootResult {
  const now = deps.now ?? (() => Date.now());
  const storage = deps.storage ?? localStorage;
  const mountTile = deps.mountTile ?? mountTileShell;
  const bootNow = now();

  const parsedSave = parseStoredSave(readSave(storage), deps.content);
  const savedSnapshot =
    parsedSave.kind === "fresh" ? undefined : (parsedSave.snapshot as Snapshot);

  const engine = createEngine(
    deps.content,
    savedSnapshot,
    savedSnapshot ? undefined : DEFAULT_LOOT_SEED,
    now,
  );

  const savedAtMs = savedSnapshot?.savedAtMs;
  const { summary: offlineSummary } = runOfflineBoot(engine, deps.content, savedAtMs, bootNow);

  const shell = mountTile(root, {
    engine,
    content: deps.content,
    onBeforeUnload: () => persistSave(engine, storage),
  });

  let summaryMount = offlineSummary ? mountOfflineSummary(root, offlineSummary) : null;

  const autosaveTimer = setInterval(() => {
    persistSave(engine, storage);
  }, AUTOSAVE_MS);

  return {
    engine,
    shell,
    offlineSummary,
    parsedSave,
    dispose() {
      clearInterval(autosaveTimer);
      summaryMount?.dismiss();
      summaryMount = null;
      shell.destroy();
    },
  };
}
