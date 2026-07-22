import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import type { EngineEvent } from "../core/events";
import { rollDrop, tierForItemLevel } from "../core/equipment";
import { initialLootRngState } from "../core/rng";
import type { Snapshot } from "../core/snapshot";
import { driveBy, scenario } from "../core/testing/scenario";
import { validateContent, ENCOUNTER_BUDGETS } from "../core/validate-content";
import { levelFromXp } from "../core/xp";
import type { AbilityDef, OpponentDef, StageDef, StageId } from "../core/types";
import { buildContent, XP_THRESHOLDS } from "./index";
import { fowlHarvestOpponents } from "./fowl-harvest-opponents";
import { fowlHarvestStages } from "./fowl-harvest-stages";
import { opponentAbilities } from "./opponents";

const LOOT_SEED = 42;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const SMOKE_MAX_MS = 5 * 60 * 1000;

const content = buildContent();

const MOONBERRY_STAGE_NAMES = [
  "Orchard Understory",
  "Moonlit Bramble",
  "Nightbloom Terrace",
] as const;

const MOONBERRY_OPPONENT_IDS = [
  "pipcap-1-7a",
  "pipcap-1-7b",
  "pipcap-1-6",
  "pipcap-1-5",
  "pipcap-2-8a",
  "pipcap-2-8b",
  "pipcap-2-7a",
  "pipcap-2-7b",
  "pipcap-2-6",
  "pipcap-3-8",
  "boss-1",
  "boss-2",
  "boss-3",
] as const;

const FOWL_SPRITE_KEYS = [
  "burger-drake",
  "cornquacker",
  "the-fryer",
  "scarequack",
  "the-combine",
] as const;

const FOWL_BACKDROP_KEYS = ["last-stop-diner", "crooked-cornfield", "harvest-yard"] as const;

const FOWL_OPPONENT_IDS = new Set(fowlHarvestOpponents.map((entry) => entry.id));

function abilityById(id: string): AbilityDef {
  const ability = content.abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing ability ${id}`);
  }
  return ability;
}

function opponentById(id: string): OpponentDef {
  const opponent = content.opponents.find((entry) => entry.id === id);
  if (!opponent) {
    throw new Error(`missing opponent ${id}`);
  }
  return opponent;
}

function stageById(id: StageId): StageDef {
  const stage = content.stages.find((entry) => entry.id === id);
  if (!stage) {
    throw new Error(`missing stage ${id}`);
  }
  return stage;
}

function sumEncounterXp(stage: StageDef): number {
  const sumWave = (opponentIds: string[]) =>
    opponentIds.reduce((total, opponentId) => total + opponentById(opponentId).xpAward, 0);
  return (
    sumWave(stage.waves[0]!.opponents) +
    sumWave(stage.waves[1]!.opponents) +
    sumWave(stage.boss.opponents)
  );
}

function advanceUntil(
  engine: ReturnType<typeof createEngine>,
  predicate: (events: EngineEvent[]) => boolean,
  maxMs: number,
  stepMs = 1,
): EngineEvent[] {
  const events: EngineEvent[] = [];
  for (let ms = 0; ms < maxMs; ms += stepMs) {
    events.push(...engine.advanceBy(stepMs));
    if (predicate(events)) {
      return events;
    }
  }
  throw new Error(`condition not met within ${maxMs}ms`);
}

function savedAtBossEncounter(stage: StageId): Snapshot {
  const saved = scenario(content)
    .atStage(stage)
    .atEncounter(3)
    .withOpponentsAtOneHealth()
    .build();
  saved.lootRngState = LOOT_SEED;
  return saved;
}

function driveUntilStageCleared(
  engine: ReturnType<typeof createEngine>,
  stage: StageId,
): EngineEvent[] {
  const events: EngineEvent[] = [];
  let elapsed = 0;
  while (elapsed < SMOKE_MAX_MS) {
    events.push(...driveBy(engine, 1, 1));
    if (events.some((event) => event.type === "stage-cleared" && event.stage === stage)) {
      return events;
    }
    elapsed += 1;
  }
  throw new Error(`Stage ${stage} never cleared within ${SMOKE_MAX_MS}ms`);
}

describe("assembled Stage content", () => {
  it("passes validateContent with exact encounter XP budgets for Stages 1–6", () => {
    expect(validateContent(content)).toEqual([]);
    for (const stage of content.stages) {
      const budget = ENCOUNTER_BUDGETS[stage.id as keyof typeof ENCOUNTER_BUDGETS];
      expect(budget).toBeDefined();
    }
  });

  it("defines six contiguous Stages with Moonberry 1–3 unchanged and Fowl 4–6 appended", () => {
    expect(content.stages).toHaveLength(6);
    expect(content.stages.map((stage) => stage.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(content.stages.slice(0, 3).map((stage) => stage.name)).toEqual([...MOONBERRY_STAGE_NAMES]);
    expect(content.stages.slice(0, 3).map((stage) => stage.backdropKey)).toEqual([
      "backdrop-1",
      "backdrop-2",
      "backdrop-3",
    ]);
    expect(content.stages.slice(0, 3).map((stage) => stage.rarityOdds)).toEqual([
      [55, 35, 9, 1],
      [40, 40, 17, 3],
      [25, 45, 24, 6],
    ]);
    expect(content.stages.slice(3)).toEqual(fowlHarvestStages);
  });

  it("preserves Moonberry opponents and thresholds 1–6 ahead of Fowl expansion", () => {
    const fowlIds = new Set(fowlHarvestOpponents.map((entry) => entry.id));
    const moonberryOpponents = content.opponents.filter((entry) => !fowlIds.has(entry.id));
    expect(moonberryOpponents.map((entry) => entry.id)).toEqual([...MOONBERRY_OPPONENT_IDS]);
    expect(XP_THRESHOLDS.slice(0, 6)).toEqual([0, 100, 250, 450, 650, 850]);
    expect(content.xpThresholds.slice(0, 6)).toEqual([0, 100, 250, 450, 650, 850]);
  });

  it("reuses one Pipcap family for Moonberry Waves and three distinct Moonberry Bosses", () => {
    const moonberry = content.opponents.filter((opponent) =>
      MOONBERRY_OPPONENT_IDS.includes(opponent.id as (typeof MOONBERRY_OPPONENT_IDS)[number]),
    );
    const ordinary = moonberry.filter((opponent) => !opponent.boss);
    const bosses = moonberry.filter((opponent) => opponent.boss);

    expect(ordinary.length).toBeGreaterThan(0);
    expect(new Set(ordinary.map((opponent) => opponent.family))).toEqual(new Set(["pipcap"]));
    expect(new Set(ordinary.map((opponent) => opponent.spriteKey))).toEqual(new Set(["pipcap"]));

    expect(bosses).toHaveLength(3);
    expect(bosses.map((boss) => boss.id)).toEqual(["boss-1", "boss-2", "boss-3"]);
    expect(bosses.map((boss) => boss.spriteKey)).toEqual(["boss-1", "boss-2", "boss-3"]);
    expect(bosses.every((boss) => boss.boss)).toBe(true);
  });

  it("aggregates Fowl rosters with pinned encounter XP totals for Stages 4–6", () => {
    expect(sumEncounterXp(stageById(4))).toBe(400);
    expect(sumEncounterXp(stageById(5))).toBe(500);
    expect(sumEncounterXp(stageById(6))).toBe(650);

    const stage4 = stageById(4);
    expect(
      stage4.waves[0]!.opponents.reduce((sum, id) => sum + opponentById(id).xpAward, 0),
    ).toBe(80);
    expect(
      stage4.waves[1]!.opponents.reduce((sum, id) => sum + opponentById(id).xpAward, 0),
    ).toBe(80);
    expect(stage4.boss.opponents.reduce((sum, id) => sum + opponentById(id).xpAward, 0)).toBe(240);
  });

  it("gives every Moonberry Boss a telegraphed sweep with Wind-up at least 1200ms", () => {
    const sweepIds = ["boss-1-sweep", "boss-2-sweep", "boss-3-sweep"];
    for (const id of sweepIds) {
      const sweep = abilityById(id);
      expect(sweep.targeting).toEqual({ kind: "all-opponents" });
      expect(sweep.windUpMs).toBeGreaterThanOrEqual(1200);
      expect(sweep.cooldownMs).toBeGreaterThan(0);
    }
    expect(opponentAbilities.filter((ability) => ability.id.endsWith("-sweep"))).toHaveLength(3);
  });

  it("reaches Level 9 at 2000 XP after a clean Stage 1–6 clear and Level 12 after three Stage 6 farms", () => {
    const cleanRunXp = content.stages.reduce((total, stage) => total + sumEncounterXp(stage), 0);
    expect(cleanRunXp).toBe(2000);
    expect(levelFromXp(cleanRunXp, content.xpThresholds)).toBe(9);

    const afterFarms = cleanRunXp + sumEncounterXp(stageById(6)) * 3;
    expect(levelFromXp(afterFarms, content.xpThresholds)).toBe(12);
    expect(content.xpThresholds[8]).toBe(2000);
    expect(content.xpThresholds[9]).toBe(2600);
    expect(content.xpThresholds[10]).toBe(3250);
    expect(content.xpThresholds[11]).toBe(3950);
  });

  it("unlocks Stage 4 on the first Stage 3 clear and repeats Stage 6 after a Stage 6 clear", () => {
    let engine = createEngine(content, savedAtBossEncounter(3), LOOT_SEED);
    driveUntilStageCleared(engine, 3);
    let snap = engine.snapshot();
    expect(snap.progression.unlockedStage).toBe(4);
    expect(snap.attempt?.stage).toBe(4);

    engine = createEngine(content, savedAtBossEncounter(6), LOOT_SEED);
    const events = driveUntilStageCleared(engine, 6);
    snap = engine.snapshot();
    expect(events.some((event) => event.type === "stage-cleared" && event.stage === 6)).toBe(true);
    expect(snap.progression.unlockedStage).toBe(6);
    expect(snap.attempt?.stage).toBe(6);
    expect(snap.attempt?.encounter).toBe(1);
  });

  it("rolls Stage 4/5/6 Drops at Item Levels 4/5/6 with Equipment Tiers III/III/IV", () => {
    const seed = initialLootRngState(LOOT_SEED);
    for (const stageId of [4, 5, 6] as const) {
      const stage = stageById(stageId);
      expect(tierForItemLevel(stageId)).toBe(stageId === 6 ? 4 : 3);
      const rolled = rollDrop({
        content,
        stage,
        itemLevel: stageId,
        lootRng: { state: seed },
        dropId: stageId,
        awardedAtMs: 100,
        uncommonFloor: true,
      });
      expect(rolled.drop.itemLevel).toBe(stageId);
      const base = content.equipmentBases.find((entry) => entry.id === rolled.drop.baseId);
      expect(base?.tier).toBe(tierForItemLevel(stageId));
    }
  });

  it("declares every Fowl sprite key and backdrop key used by shipped Stages 4–6", () => {
    const fowlOpponents = content.opponents.filter((entry) => FOWL_OPPONENT_IDS.has(entry.id));
    expect(new Set(fowlOpponents.map((entry) => entry.spriteKey))).toEqual(new Set(FOWL_SPRITE_KEYS));
    for (const stage of content.stages.filter((entry) => entry.id >= 4)) {
      expect(FOWL_BACKDROP_KEYS).toContain(stage.backdropKey);
    }
  });

  it("clears Stage 1 and reaches Level 2 within ten simulated minutes", () => {
    const engine = createEngine(content, undefined, LOOT_SEED);
    engine.advanceBy(1);

    const events = advanceUntil(
      engine,
      (batch) => batch.some((event) => event.type === "stage-cleared" && event.stage === 1),
      TEN_MINUTES_MS,
    );

    expect(engine.snapshot().simNowMs).toBeLessThanOrEqual(TEN_MINUTES_MS);
    expect(events.some((event) => event.type === "stage-cleared" && event.stage === 1)).toBe(
      true,
    );

    const snap = engine.snapshot();
    expect(snap.progression.party).toEqual(["knight", "wizard", "priest"]);
    expect(snap.progression.reserve).toBe("hunter");
    expect(snap.progression.characterXp.knight).toBeGreaterThanOrEqual(100);
    expect(
      levelFromXp(snap.progression.characterXp.knight, content.xpThresholds),
    ).toBeGreaterThanOrEqual(2);
    expect(events.some((event) => event.type === "level-up" && event.classId === "knight")).toBe(
      true,
    );
  });

  it("proves Stage 4 is viable after the first Stage 3 clear under default tuning", () => {
    const engine = createEngine(content, savedAtBossEncounter(4), LOOT_SEED);
    const events = driveUntilStageCleared(engine, 4);
    expect(events.some((event) => event.type === "stage-cleared" && event.stage === 4)).toBe(true);
  });

  it("allows Party Defeat at Stage 3 with the default untalented Party", () => {
    const boot = createEngine(content, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.unlockedStage = 3;

    const engine = createEngine(content, saved, LOOT_SEED);
    engine.selectStage(3);

    const events = advanceUntil(
      engine,
      (batch) => batch.some((event) => event.type === "party-defeat"),
      TEN_MINUTES_MS,
    );

    expect(events.some((event) => event.type === "party-defeat" && event.stage === 3)).toBe(
      true,
    );
  });

  it("keeps Stage 6 as a meaningful frontier for the default untalented Party", () => {
    const engine = createEngine(content, savedAtBossEncounter(6), LOOT_SEED);
    const events = advanceUntil(
      engine,
      (batch) =>
        batch.some(
          (event) => event.type === "party-defeat" || event.type === "stage-cleared",
        ),
      SMOKE_MAX_MS,
    );
    const cleared = events.some((event) => event.type === "stage-cleared" && event.stage === 6);
    const defeated = events.some((event) => event.type === "party-defeat" && event.stage === 6);
    expect(cleared || defeated).toBe(true);
    if (cleared) {
      expect(engine.snapshot().progression.unlockedStage).toBe(6);
    }
  });
});
