import type { PumpController } from "./pump";

export interface TileShell extends PumpController {
  startPump(): void;
  destroy(): void;
}
