// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import type { Engine } from "../core/engine";
import type { EngineEvent } from "../core/events";
import { applyTileCommand } from "../main";
import type { TileCommand, TileCommandName } from "./bus";

const SAMPLE_COMMANDS = [
  { cmd: "selectStage", args: [1] },
  {
    cmd: "setParty",
    args: [["knight", "priest", "wizard"], "hunter"],
  },
  { cmd: "setFormation", args: [["knight", "priest", "wizard"]] },
  { cmd: "setLoadout", args: ["knight", ["a", "b", "c"]] },
  { cmd: "allocateTalent", args: ["knight", "talent-a"] },
  { cmd: "deallocateTalent", args: ["knight", "talent-a"] },
  { cmd: "equip", args: [1, "knight", "weapon"] },
  { cmd: "unequip", args: ["knight", "weapon"] },
  { cmd: "discard", args: [[1, 2]] },
  { cmd: "setLocked", args: [1, true] },
  { cmd: "markSeen", args: [[1, 2]] },
] as const satisfies readonly TileCommand[];

type SampledCommand = (typeof SAMPLE_COMMANDS)[number];
type Assert<T extends true> = T;
type _EveryDispatchableCommandSampled = Assert<
  [TileCommandName] extends [SampledCommand["cmd"]]
    ? [SampledCommand["cmd"]] extends [TileCommandName]
      ? true
      : false
    : false
>;
void (0 as unknown as _EveryDispatchableCommandSampled);

function createStubEngine(): Engine {
  return {
    advanceBy: vi.fn(() => []),
    advanceOffline: vi.fn(() => []),
    snapshot: vi.fn(),
    beginFreshAttempt: vi.fn(() => []),
    selectStage: vi.fn(
      (): EngineEvent[] => [
        { seq: 1, atMs: 0, type: "stage-attempt-started", stage: 1, attemptId: 1 },
      ],
    ),
    setLoadout: vi.fn(),
    setFormation: vi.fn(),
    allocateTalent: vi.fn(),
    deallocateTalent: vi.fn(),
    canAllocateTalent: vi.fn(() => false),
    canDeallocateTalent: vi.fn(() => false),
    setParty: vi.fn(),
    equip: vi.fn(),
    canEquip: vi.fn(() => false),
    unequip: vi.fn(),
    setLocked: vi.fn(),
    markSeen: vi.fn(),
    discard: vi.fn(),
  };
}

describe("applyTileCommand", () => {
  it("dispatches every TileCommand variant to the matching Engine method with positional args", () => {
    const engine = createStubEngine();

    for (const command of SAMPLE_COMMANDS) {
      vi.clearAllMocks();
      applyTileCommand(engine, command);

      const method = engine[command.cmd] as ReturnType<typeof vi.fn>;
      expect(method).toHaveBeenCalledTimes(1);
      expect(method.mock.calls[0]).toEqual(command.args);
    }
  });

  it("returns EngineEvent[] from selectStage and [] from void commands", () => {
    const engine = createStubEngine();
    const stageEvents: EngineEvent[] = [
      { seq: 1, atMs: 0, type: "stage-attempt-started", stage: 2, attemptId: 1 },
    ];
    vi.mocked(engine.selectStage).mockReturnValue(stageEvents);

    expect(applyTileCommand(engine, { cmd: "selectStage", args: [2] })).toBe(stageEvents);
    expect(applyTileCommand(engine, { cmd: "setParty", args: [["knight", "priest", "wizard"], "hunter"] })).toEqual(
      [],
    );
    expect(applyTileCommand(engine, { cmd: "markSeen", args: [[1]] })).toEqual([]);
  });
});
