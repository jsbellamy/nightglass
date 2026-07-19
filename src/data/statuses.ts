import type { StatusEffectDef } from "../core/types";

/** Shared status definitions transcribed from issue #7. */
export const statuses: StatusEffectDef[] = [
  {
    id: "braced",
    name: "Braced",
    kind: "buff",
    durationMs: 5000,
    modifiers: { flat: { armor: 50 } },
  },
  {
    id: "guarded",
    name: "Guarded",
    kind: "buff",
    durationMs: 6000,
    modifiers: { flat: { armor: 15, elementalResistance: 15 } },
  },
  {
    id: "warded",
    name: "Warded",
    kind: "buff",
    durationMs: 6000,
    modifiers: { flat: { elementalResistance: 20 } },
  },
  {
    id: "inspired",
    name: "Inspired",
    kind: "buff",
    durationMs: 8000,
    modifiers: { percent: { physicalPower: 0.2, elementalPower: 0.2 } },
  },
  {
    id: "sheltered",
    name: "Sheltered",
    kind: "buff",
    durationMs: 6000,
    modifiers: { flat: { armor: 25, elementalResistance: 30 } },
  },
  {
    id: "hold-the-line",
    name: "Hold the Line",
    kind: "buff",
    durationMs: 6000,
    modifiers: { flat: { armor: 60, elementalResistance: 30 } },
  },
  {
    id: "exposed",
    name: "Exposed",
    kind: "debuff",
    durationMs: 6000,
    modifiers: { flat: { armor: -20, elementalResistance: -20 } },
  },
  {
    id: "riven",
    name: "Riven",
    kind: "debuff",
    durationMs: 6000,
    modifiers: { flat: { armor: -20 } },
  },
  {
    id: "stun",
    name: "Stun",
    kind: "stun",
    durationMs: 1000,
  },
];
