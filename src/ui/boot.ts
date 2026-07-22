import { parseStoredSave } from "../core/load-state";
import type { Snapshot } from "../core/snapshot";
import type { Content } from "../core/types";
import { createEngine, type Engine } from "./snapshot-view";
import {
  mountOfflineSummary,
  summarizeOfflineProgress,
  type OfflineSummary,
} from "./offline-summary";
import { assertRegisteredEquipmentIcons } from "./icons";
import type { TileShell } from "./tile-shell-types";

export const SAVE_KEY = "nightglass-save-v1";
export const AUTOSAVE_MS = 10_000;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const MIN_OFFLINE_MS = 60_000;
export const DEFAULT_LOOT_SEED = 42;

export interface BootTileMountOptions {
  engine?: Engine;
  content?: Content;
  onBeforeUnload?: () => void;
  deferPump?: boolean;
}

export interface BootDeps {
  content: Content;
  now?: () => number;
  storage?: Pick<Storage, "getItem" | "setItem">;
  mountTile: (root: HTMLElement, options: BootTileMountOptions) => TileShell;
}

export interface BootResult {
  shell: TileShell;
  dispose(): void;
}

function readSave(storage: Pick<Storage, "getItem">): string | null {
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
    return { summary: null };
  }

  const before = engine.snapshot();
  const events = engine.advanceOffline(offlineMs);
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
  return { summary };
}

export function bootTile(root: HTMLElement, deps: BootDeps): BootResult {
  assertRegisteredEquipmentIcons(deps.content);
  const now = deps.now ?? (() => Date.now());
  const storage = deps.storage ?? localStorage;
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

  const shell = deps.mountTile(root, {
    engine,
    content: deps.content,
    deferPump: true,
    onBeforeUnload: () => persistSave(engine, storage),
  });

  let summaryMount = offlineSummary ? mountOfflineSummary(root, offlineSummary) : null;

  shell.startPump();

  const autosaveTimer = setInterval(() => {
    persistSave(engine, storage);
  }, AUTOSAVE_MS);

  return {
    shell,
    dispose() {
      clearInterval(autosaveTimer);
      summaryMount?.dismiss();
      summaryMount = null;
      shell.destroy();
    },
  };
}
