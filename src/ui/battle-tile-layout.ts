import layoutJson from "../assets/sprites/layout.json";
import type { CombatantState } from "../core/snapshot";

/** Battle Tile outer geometry — shared by the tile renderer and evidence harness. */
export const STATUS_LINE_HEIGHT = 24;
export const BATTLEFIELD_HEIGHT = 86;
export const TILE_WIDTH = 480;
export const TILE_HEIGHT = 112;

const FORMATION_ORDER = ["back", "middle", "front"] as const;

export type FormationSlot = (typeof FORMATION_ORDER)[number];

export interface CombatantAnchorInput {
  combatant: CombatantState;
  formationSlot: FormationSlot | null;
  opponentIndex: number | null;
  isBoss: boolean;
  opponentStressLayout: boolean;
}

const LAYOUT = layoutJson;

export function footAnchorXForCombatant(input: CombatantAnchorInput): number {
  const { combatant, formationSlot, opponentIndex, isBoss, opponentStressLayout } = input;
  if (combatant.side === "party") {
    if (!formationSlot) {
      throw new Error("Party combatant requires a formation slot");
    }
    const slotIndex = FORMATION_ORDER.indexOf(formationSlot);
    const anchors = LAYOUT.anchors_x.party;
    const anchor = anchors[slotIndex];
    if (anchor === undefined) {
      throw new Error(`No party anchor for formation slot ${formationSlot}`);
    }
    return anchor;
  }
  if (isBoss) {
    return LAYOUT.anchors_x.boss[0]!;
  }
  if (opponentIndex === null) {
    throw new Error("Opponent combatant requires an index");
  }
  const useStress =
    opponentStressLayout && opponentIndex === 4
      ? LAYOUT.anchors_x.ordinary_opponent_stress
      : LAYOUT.anchors_x.ordinary_opponent;
  const anchor = useStress[opponentIndex];
  if (anchor === undefined) {
    throw new Error(`No opponent anchor for index ${opponentIndex}`);
  }
  return anchor;
}
