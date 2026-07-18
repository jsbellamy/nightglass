// PROTOTYPE — portable headless logic for validating the Simulation Engine boundary.

const SNAPSHOT_VERSION = 1;
const WAVE_TRANSITION_MS = 2_000;

const PARTY_DEFINITIONS = [
  {
    id: "knight",
    name: "Knight",
    position: "front",
    maxHealth: 180,
    armor: 30,
    elementalResistance: 12,
    basicDamage: 14,
    ability: { id: "shield-strike", cooldownMs: 3_000, damage: 32 },
  },
  {
    id: "wizard",
    name: "Wizard",
    position: "middle",
    maxHealth: 100,
    armor: 10,
    elementalResistance: 24,
    basicDamage: 16,
    ability: { id: "ember-burst", cooldownMs: 4_000, damage: 42 },
  },
  {
    id: "priest",
    name: "Priest",
    position: "back",
    maxHealth: 125,
    armor: 15,
    elementalResistance: 20,
    basicDamage: 13,
    ability: { id: "mend", cooldownMs: 5_000, healing: 35 },
  },
];

function opponentDefinitions(stage, wave) {
  if (wave === 3) {
    return [
      {
        id: `s${stage}-boss`,
        name: `Thorn Guardian ${stage}`,
        maxHealth: 150 + stage * 30,
        armor: 18 + stage * 2,
        elementalResistance: 14 + stage * 2,
        basicDamage: 19 + stage * 2,
      },
    ];
  }

  return Array.from({ length: wave }, (_, index) => ({
    id: `s${stage}-w${wave}-foe${index + 1}`,
    name: `Brambleling ${index + 1}`,
    maxHealth: 50 + stage * 12,
    armor: 8 + stage * 2,
    elementalResistance: 8 + stage * 2,
    basicDamage: 10 + stage * 2,
  }));
}

function makePartyActor(definition) {
  return {
    ...structuredClone(definition),
    side: "party",
    health: definition.maxHealth,
    knockedOut: false,
    action: null,
    cooldowns: {},
  };
}

function makeOpponentActor(definition, order) {
  return {
    ...structuredClone(definition),
    side: "opponent",
    order,
    health: definition.maxHealth,
    knockedOut: false,
    action: null,
    cooldowns: {},
  };
}

export function createSimulation(seed = 0x5090) {
  const state = {
    version: SNAPSHOT_VERSION,
    nowMs: 0,
    rngState: seed >>> 0,
    nextEventSequence: 1,
    nextAttemptId: 1,
    progression: {
      currentStage: 1,
      unlockedStage: 1,
      stageClears: 0,
      characterXp: 0,
      drops: [],
    },
    attempt: null,
  };

  const events = [];
  startFreshAttempt(state, events, "new-game");
  return { state, events };
}

export function snapshot(state) {
  return structuredClone(state);
}

export function restoreSnapshot(value) {
  if (value?.version !== SNAPSHOT_VERSION) {
    throw new Error(`Unsupported Snapshot version: ${value?.version}`);
  }
  return structuredClone(value);
}

function emit(state, events, type, detail = {}) {
  events.push({
    sequence: state.nextEventSequence++,
    atMs: state.nowMs,
    type,
    ...detail,
  });
}

function startFreshAttempt(state, events, reason) {
  state.attempt = {
    id: state.nextAttemptId++,
    stage: state.progression.currentStage,
    wave: 1,
    phase: "combat",
    transitionEndsAtMs: null,
    party: PARTY_DEFINITIONS.map(makePartyActor),
    opponents: opponentDefinitions(state.progression.currentStage, 1).map(
      makeOpponentActor,
    ),
  };
  emit(state, events, "stage-attempt-started", {
    attemptId: state.attempt.id,
    stage: state.attempt.stage,
    reason,
  });
  emit(state, events, "wave-started", { wave: 1 });
  chooseActions(state, events);
}

function living(actors) {
  return actors.filter((actor) => !actor.knockedOut);
}

function closestPartyMember(attempt) {
  return living(attempt.party)[0] ?? null;
}

function closestOpponent(attempt) {
  return living(attempt.opponents)[0] ?? null;
}

function lowestHealthPartyMember(attempt) {
  return living(attempt.party)
    .filter((actor) => actor.health < actor.maxHealth)
    .sort(
      (left, right) =>
        left.health / left.maxHealth - right.health / right.maxHealth,
    )[0] ?? null;
}

function actorById(attempt, id) {
  return [...attempt.party, ...attempt.opponents].find((actor) => actor.id === id);
}

function choosePartyAction(state, actor) {
  const readyAt = actor.cooldowns[actor.ability.id] ?? 0;
  if (actor.id === "priest") {
    const healTarget = lowestHealthPartyMember(state.attempt);
    if (
      healTarget &&
      healTarget.health / healTarget.maxHealth <= 0.65 &&
      readyAt <= state.nowMs
    ) {
      return {
        abilityId: actor.ability.id,
        kind: "healing",
        targetId: healTarget.id,
        rawValue: actor.ability.healing,
        cooldownMs: actor.ability.cooldownMs,
        windupMs: 300,
        recoveryMs: 700,
      };
    }
  } else if (readyAt <= state.nowMs) {
    const target = closestOpponent(state.attempt);
    return {
      abilityId: actor.ability.id,
      kind: actor.id === "wizard" ? "elemental-damage" : "physical-damage",
      targetId: target?.id,
      rawValue: actor.ability.damage,
      cooldownMs: actor.ability.cooldownMs,
      windupMs: actor.id === "wizard" ? 600 : 500,
      recoveryMs: actor.id === "wizard" ? 800 : 700,
    };
  }

  return {
    abilityId: "basic-attack",
    kind: actor.id === "wizard" ? "elemental-damage" : "physical-damage",
    targetId: closestOpponent(state.attempt)?.id,
    rawValue: actor.basicDamage,
    cooldownMs: 0,
    windupMs: 400,
    recoveryMs: 600,
  };
}

function chooseOpponentAction(state, actor) {
  return {
    abilityId: "basic-attack",
    kind: "physical-damage",
    targetId: closestPartyMember(state.attempt)?.id,
    rawValue: actor.basicDamage,
    cooldownMs: 0,
    windupMs: 700,
    recoveryMs: 800,
  };
}

function chooseActions(state, events) {
  if (state.attempt.phase !== "combat") return;

  for (const actor of [...state.attempt.party, ...state.attempt.opponents]) {
    if (actor.knockedOut || actor.action) continue;
    const action =
      actor.side === "party"
        ? choosePartyAction(state, actor)
        : chooseOpponentAction(state, actor);
    if (!action.targetId) continue;
    actor.action = {
      ...action,
      impactAtMs: state.nowMs + action.windupMs,
      recoveryEndsAtMs: null,
    };
    emit(state, events, "action-started", {
      actorId: actor.id,
      abilityId: action.abilityId,
      targetId: action.targetId,
      impactAtMs: actor.action.impactAtMs,
    });
  }
}

function mitigationFor(action, target) {
  return action.kind === "elemental-damage"
    ? target.elementalResistance
    : target.armor;
}

function finalDamage(rawValue, mitigation) {
  return Math.max(1, Math.floor((rawValue * 100) / (100 + mitigation)));
}

function revalidateTarget(state, action, actor) {
  const target = actorById(state.attempt, action.targetId);
  if (target && !target.knockedOut) return target;
  if (action.kind === "healing") return lowestHealthPartyMember(state.attempt);
  return actor.side === "party"
    ? closestOpponent(state.attempt)
    : closestPartyMember(state.attempt);
}

function resolveImpacts(state, events) {
  const actors = [...state.attempt.party, ...state.attempt.opponents];
  const due = actors.filter(
    (actor) =>
      actor.action?.impactAtMs === state.nowMs &&
      actor.action.recoveryEndsAtMs === null,
  );
  if (due.length === 0) return;

  const changes = [];
  for (const actor of due) {
    const action = actor.action;
    const target = revalidateTarget(state, action, actor);
    if (action.cooldownMs > 0) {
      actor.cooldowns[action.abilityId] = state.nowMs + action.cooldownMs;
    }
    actor.action.recoveryEndsAtMs = state.nowMs + action.recoveryMs;
    if (!target) {
      emit(state, events, "impact", {
        actorId: actor.id,
        abilityId: action.abilityId,
        outcome: "no-valid-target",
      });
      continue;
    }

    const amount =
      action.kind === "healing"
        ? Math.min(action.rawValue, target.maxHealth - target.health)
        : finalDamage(action.rawValue, mitigationFor(action, target));
    changes.push({
      target,
      delta: action.kind === "healing" ? amount : -amount,
    });
    emit(state, events, "impact", {
      actorId: actor.id,
      abilityId: action.abilityId,
      targetId: target.id,
      kind: action.kind,
      amount,
    });
  }

  for (const change of changes) {
    change.target.health = Math.max(
      0,
      Math.min(change.target.maxHealth, change.target.health + change.delta),
    );
  }

  for (const actor of actors) {
    if (!actor.knockedOut && actor.health === 0) {
      actor.knockedOut = true;
      if (actor.action?.recoveryEndsAtMs === null) actor.action = null;
      emit(state, events, "knockout", { actorId: actor.id });
    }
  }

  if (living(state.attempt.opponents).length === 0) {
    if (state.attempt.wave === 3) {
      clearStage(state, events);
    } else {
      state.attempt.phase = "wave-transition";
      state.attempt.transitionEndsAtMs = state.nowMs + WAVE_TRANSITION_MS;
      emit(state, events, "wave-ended", { wave: state.attempt.wave });
    }
  } else if (living(state.attempt.party).length === 0) {
    emit(state, events, "party-defeat", { stage: state.attempt.stage });
    startFreshAttempt(state, events, "retry");
  }
}

function completeRecoveries(state) {
  for (const actor of [...state.attempt.party, ...state.attempt.opponents]) {
    if (actor.action?.recoveryEndsAtMs === state.nowMs) actor.action = null;
  }
}

function nextRandom(state) {
  let value = state.rngState || 1;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rngState = value >>> 0;
  return state.rngState;
}

function clearStage(state, events) {
  const clearedStage = state.attempt.stage;
  const roll = nextRandom(state);
  const drop = {
    id: `drop-${state.progression.drops.length + 1}`,
    sourceStage: clearedStage,
    rarity: ["common", "uncommon", "rare"][roll % 3],
  };
  state.progression.stageClears += 1;
  state.progression.characterXp += 100 * clearedStage;
  state.progression.unlockedStage = Math.min(
    3,
    Math.max(state.progression.unlockedStage, clearedStage + 1),
  );
  state.progression.currentStage = Math.min(3, clearedStage + 1);
  state.progression.drops.push(drop);
  emit(state, events, "drop-awarded", drop);
  emit(state, events, "stage-cleared", { stage: clearedStage });
  startFreshAttempt(state, events, "stage-clear");
}

function finishWaveTransition(state, events) {
  if (
    state.attempt.phase !== "wave-transition" ||
    state.attempt.transitionEndsAtMs !== state.nowMs
  ) {
    return;
  }
  state.attempt.wave += 1;
  state.attempt.phase = "combat";
  state.attempt.transitionEndsAtMs = null;
  state.attempt.opponents = opponentDefinitions(
    state.attempt.stage,
    state.attempt.wave,
  ).map(makeOpponentActor);
  emit(state, events, "wave-started", { wave: state.attempt.wave });
}

function nextBoundaryMs(state) {
  const boundaries = [];
  if (state.attempt.transitionEndsAtMs !== null) {
    boundaries.push(state.attempt.transitionEndsAtMs);
  }
  for (const actor of [...state.attempt.party, ...state.attempt.opponents]) {
    if (actor.action?.recoveryEndsAtMs != null) {
      boundaries.push(actor.action.recoveryEndsAtMs);
    } else if (actor.action?.impactAtMs !== undefined) {
      boundaries.push(actor.action.impactAtMs);
    }
  }
  return boundaries.length > 0 ? Math.min(...boundaries) : null;
}

export function advanceBy(state, durationMs) {
  const events = [];
  const targetMs = state.nowMs + durationMs;

  while (true) {
    chooseActions(state, events);
    const boundaryMs = nextBoundaryMs(state);
    if (boundaryMs === null || boundaryMs > targetMs) break;
    state.nowMs = boundaryMs;
    resolveImpacts(state, events);
    completeRecoveries(state);
    finishWaveTransition(state, events);
    chooseActions(state, events);
  }

  state.nowMs = targetMs;
  return events;
}

export function runOffline(state, requestedMs, capMs = 60_000) {
  const before = snapshot(state.progression);
  const simulatedMs = Math.min(requestedMs, capMs);
  advanceBy(state, simulatedMs);
  const summary = {
    requestedMs,
    simulatedMs,
    stageClears: state.progression.stageClears - before.stageClears,
    characterXp: state.progression.characterXp - before.characterXp,
    drops: state.progression.drops.length - before.drops.length,
  };
  const events = [];
  emit(state, events, "offline-progress-applied", summary);
  startFreshAttempt(state, events, "offline-return");
  return { summary, events };
}

function stable(value) {
  return JSON.stringify(value);
}

export function verifyEquivalentAdvancement(seed = 0x5090, durationMs = 30_000) {
  const fine = createSimulation(seed);
  const fineEvents = [...fine.events];
  for (let elapsed = 0; elapsed < durationMs; elapsed += 100) {
    fineEvents.push(...advanceBy(fine.state, Math.min(100, durationMs - elapsed)));
  }

  const accelerated = createSimulation(seed);
  const acceleratedEvents = [
    ...accelerated.events,
    ...advanceBy(accelerated.state, durationMs),
  ];

  const reloaded = createSimulation(seed);
  const reloadEvents = [...reloaded.events, ...advanceBy(reloaded.state, 13_700)];
  const encoded = JSON.stringify(snapshot(reloaded.state));
  reloaded.state = restoreSnapshot(JSON.parse(encoded));
  reloadEvents.push(...advanceBy(reloaded.state, durationMs - 13_700));

  return {
    durationMs,
    snapshotsMatch:
      stable(snapshot(fine.state)) === stable(snapshot(accelerated.state)) &&
      stable(snapshot(fine.state)) === stable(snapshot(reloaded.state)),
    presentationEventsMatch:
      stable(fineEvents) === stable(acceleratedEvents) &&
      stable(fineEvents) === stable(reloadEvents),
    finalStage: fine.state.progression.currentStage,
    stageClears: fine.state.progression.stageClears,
    eventCount: fineEvents.length,
  };
}
