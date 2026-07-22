import { describe, expect, it } from "vitest";
import { createEngine, SCHEMA_VERSION } from "../engine";
import { createDefaultProgression } from "../load-state";
import { cloneSnapshot, type Snapshot } from "../snapshot";
import type { ClassId } from "../types";
import { fixtureContent } from "./fixture-content";
import { driveBy, scenario } from "./scenario";

describe("scenario builder", () => {
  it("loads a fresh Arrange Snapshot into the Engine without discarding the Stage Attempt", () => {
    const saved = scenario().build();
    expect(saved.schemaVersion).toBe(SCHEMA_VERSION);
    expect(saved.attempt).not.toBeNull();

    const engine = createEngine(fixtureContent, saved);
    const loaded = engine.snapshot();
    expect(loaded.attempt).not.toBeNull();
    expect(loaded.attempt?.stage).toBe(saved.attempt?.stage);
    expect(loaded.attempt?.encounter).toBe(saved.attempt?.encounter);
    expect(loaded.attempt?.id).toBe(saved.attempt?.id);
  });

  it("defaults Arrange to a new-game Progression and Wave 1 Stage Attempt in the fighting Phase", () => {
    const saved = scenario().build();
    const defaults = createDefaultProgression(fixtureContent);
    expect(saved.progression.unlockedStage).toBe(defaults.unlockedStage);
    expect(saved.progression.party).toEqual(defaults.party);
    expect(saved.progression.reserve).toBe(defaults.reserve);
    expect(saved.progression.characterXp).toEqual(defaults.characterXp);
    expect(saved.progression.talents).toEqual(defaults.talents);
    expect(saved.progression.loadouts).toEqual(defaults.loadouts);
    expect(saved.progression.armory).toEqual([]);
    expect(saved.progression.pendingParty).toBeNull();
    expect(saved.attempt?.stage).toBe(1);
    expect(saved.attempt?.encounter).toBe(1);
    expect(saved.attempt?.phase).toBe("fighting");
  });

  it("reaches every Engine seam Snapshot literal Arrange dimension through the builder", () => {
    // Mapping: engine.test.ts line → builder call (arrange dimensions only).
    const cases: {
      line: number;
      label: string;
      build: () => Snapshot;
      expect: {
        stage: 1 | 2 | 3;
        encounter: 1 | 2 | 3;
        party: [ClassId, ClassId, ClassId];
        reserve: ClassId;
        xp?: Partial<Record<ClassId, number>>;
        drops?: number;
        knockedOut?: ClassId[];
      };
    }[] = [
      {
        line: 424,
        label: "Party Defeat retry with XP and Knockouts",
        build: () =>
          scenario()
            .withParty(["knight", "wizard", "knight"], "wizard")
            .withXp("knight", 50)
            .knockedOut("knight")
            .knockedOut("wizard")
            .build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "knight"],
          reserve: "wizard",
          xp: { knight: 50 },
          knockedOut: ["knight", "wizard"],
        },
      },
      {
        line: 555,
        label: "Stage 3 Boss encounter",
        build: () =>
          scenario()
            .atStage(3)
            .atEncounter(3)
            .withParty(["knight", "wizard", "knight"], "wizard")
            .build(),
        expect: {
          stage: 3,
          encounter: 3,
          party: ["knight", "wizard", "knight"],
          reserve: "wizard",
        },
      },
      {
        line: 675,
        label: "Ability cooldown at Impact",
        build: () => scenario().withParty(["knight", "wizard", "priest"], "hunter").build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "hunter",
        },
      },
      {
        line: 766,
        label: "Stun cancels Wind-up",
        build: () => scenario().withParty(["knight", "wizard", "priest"], "hunter").build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "hunter",
        },
      },
      {
        line: 859,
        label: "Stun ignored on Boss",
        build: () =>
          scenario().atEncounter(3).withParty(["knight", "wizard", "priest"], "hunter").build(),
        expect: {
          stage: 1,
          encounter: 3,
          party: ["knight", "wizard", "priest"],
          reserve: "hunter",
        },
      },
      {
        line: 953,
        label: "Status Effect refresh",
        build: () => scenario().withParty(["knight", "wizard", "priest"], "hunter").build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "hunter",
        },
      },
      {
        line: 1045,
        label: "cooldown when retarget fails",
        build: () => scenario().withParty(["knight", "wizard", "priest"], "hunter").build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "hunter",
        },
      },
      {
        line: 1137,
        label: "Healing clamp",
        build: () => scenario().withParty(["priest", "knight", "wizard"], "hunter").build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["priest", "knight", "wizard"],
          reserve: "hunter",
        },
      },
      {
        line: 1228,
        label: "Knockout cancels Wind-up",
        build: () => scenario().withParty(["knight", "wizard", "priest"], "hunter").build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "hunter",
        },
      },
      {
        line: 1328,
        label: "revive first Knocked Out ally",
        build: () =>
          scenario()
            .withParty(["priest", "knight", "wizard"], "hunter")
            .knockedOut("knight")
            .knockedOut("wizard")
            .build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["priest", "knight", "wizard"],
          reserve: "hunter",
          knockedOut: ["knight", "wizard"],
        },
      },
      {
        line: 1423,
        label: "simultaneous lethal Impacts",
        build: () => scenario().withParty(["knight", "wizard", "priest"], "hunter").build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "hunter",
        },
      },
      {
        line: 1551,
        label: "mid-fight damage does not interrupt Wind-up",
        build: () => scenario().build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "knight",
        },
      },
      {
        line: 1694,
        label: "status-expired emission",
        build: () => scenario().build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "knight",
        },
      },
      {
        line: 1786,
        label: "heal kind in impact results",
        build: () => scenario().withParty(["priest", "knight", "wizard"], "knight").build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["priest", "knight", "wizard"],
          reserve: "knight",
        },
      },
      {
        line: 1923,
        label: "Recovery while stunned",
        build: () => scenario().build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "knight",
        },
      },
      {
        line: 2059,
        label: "Character XP party and Reserve shares",
        build: () => scenario().withParty(["knight", "wizard", "priest"], "hunter").build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "hunter",
        },
      },
      {
        line: 2386,
        label: "Equipment stats from next Stage Attempt",
        build: () =>
          scenario().withParty(["knight", "wizard", "priest"], "hunter").withDrops(1).build(),
        expect: {
          stage: 1,
          encounter: 1,
          party: ["knight", "wizard", "priest"],
          reserve: "hunter",
          drops: 1,
        },
      },
    ];

    expect(cases).toHaveLength(17);

    for (const entry of cases) {
      const saved = entry.build();
      expect(saved.attempt, `line ${entry.line}: ${entry.label}`).not.toBeNull();
      expect(saved.attempt!.stage, `line ${entry.line} stage`).toBe(entry.expect.stage);
      expect(saved.attempt!.encounter, `line ${entry.line} encounter`).toBe(
        entry.expect.encounter,
      );
      expect(saved.progression.party, `line ${entry.line} party`).toEqual(entry.expect.party);
      expect(saved.progression.reserve, `line ${entry.line} reserve`).toBe(entry.expect.reserve);

      if (entry.expect.xp) {
        for (const [classId, xp] of Object.entries(entry.expect.xp)) {
          expect(saved.progression.characterXp[classId as keyof typeof saved.progression.characterXp]).toBe(
            xp,
          );
        }
      }

      if (entry.expect.drops !== undefined) {
        expect(saved.progression.armory).toHaveLength(entry.expect.drops);
      }

      if (entry.expect.knockedOut) {
        const knocked = saved.attempt!.combatants
          .filter((combatant) => combatant.side === "party" && combatant.knockedOut)
          .map((combatant) => combatant.defId);
        expect(knocked, `line ${entry.line} knockouts`).toEqual(entry.expect.knockedOut);
      }

      const engine = createEngine(fixtureContent, saved);
      expect(engine.snapshot().attempt, `line ${entry.line} loadable`).not.toBeNull();
    }
  });
});

describe("driveBy", () => {
  it("is chunk-neutral: many small calls match one large call", () => {
    const saved = scenario().withParty(["knight", "wizard", "priest"], "hunter").build();
    const oneMs = createEngine(fixtureContent, cloneSnapshot(saved));
    const chunk = createEngine(fixtureContent, cloneSnapshot(saved));

    const eventsOne = driveBy(oneMs, 4000, 1);
    const eventsChunk = driveBy(chunk, 4000, 4000);

    expect(eventsOne).toEqual(eventsChunk);
    expect(oneMs.snapshot()).toEqual(chunk.snapshot());
  });
});
