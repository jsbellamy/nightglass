import type { PumpController } from "./pump";

export interface TileShell extends PumpController {
  startPump(): void;
  /** Wall-clock ms when the cached tick snapshot was taken; 0 when none yet. */
  tickSnapshotAtMs(): number;
  destroy(): void;
}
