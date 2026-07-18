// PROTOTYPE — throwaway terminal shell. The portable logic lives in simulation.mjs.
import readline from "node:readline";
import {
  advanceBy,
  createSimulation,
  restoreSnapshot,
  runOffline,
  snapshot,
  verifyEquivalentAdvancement,
} from "./simulation.mjs";

const bold = "\x1b[1m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";

let simulation = createSimulation();
let recentEvents = [...simulation.events];
let saveSlot = null;
let notice = "Fresh deterministic Stage Attempt created.";

function seconds(ms) {
  return `${(ms / 1_000).toFixed(2)}s`;
}

function actorLine(actor) {
  const phase = actor.knockedOut
    ? "KO"
    : actor.action?.recoveryEndsAtMs != null
      ? `recover→${seconds(actor.action.recoveryEndsAtMs)}`
      : actor.action
        ? `${actor.action.abilityId}→${seconds(actor.action.impactAtMs)}`
        : "ready";
  return `${actor.id.padEnd(14)} ${String(actor.health).padStart(3)}/${String(actor.maxHealth).padEnd(3)}  ${phase}`;
}

function eventLine(event) {
  const detail = Object.entries(event)
    .filter(([key]) => !["sequence", "atMs", "type"].includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  return `${String(event.sequence).padStart(3)} ${seconds(event.atMs).padStart(7)} ${event.type}${detail ? `  ${detail}` : ""}`;
}

function render() {
  const state = simulation.state;
  const attempt = state.attempt;
  console.clear();
  console.log(`${bold}SIMULATION BOUNDARY — THROWAWAY PROTOTYPE${reset}`);
  console.log(`${dim}${notice}${reset}\n`);
  console.log(`${bold}Persistent Snapshot${reset}`);
  console.log(`version              ${state.version}`);
  console.log(`simulation time      ${seconds(state.nowMs)}`);
  console.log(`rng state            ${state.rngState}`);
  console.log(`next event / attempt ${state.nextEventSequence} / ${state.nextAttemptId}`);
  console.log(`stage / unlocked     ${state.progression.currentStage} / ${state.progression.unlockedStage}`);
  console.log(`clears / xp / drops  ${state.progression.stageClears} / ${state.progression.characterXp} / ${state.progression.drops.length}`);
  console.log(`save slot            ${saveSlot ? "occupied" : "empty"}\n`);
  console.log(`${bold}Stage Attempt${reset}`);
  console.log(`id / stage / wave    ${attempt.id} / ${attempt.stage} / ${attempt.wave}`);
  console.log(`phase                ${attempt.phase}${attempt.transitionEndsAtMs ? ` until ${seconds(attempt.transitionEndsAtMs)}` : ""}`);
  for (const actor of attempt.party) console.log(actorLine(actor));
  for (const actor of attempt.opponents) console.log(actorLine(actor));
  console.log(`\n${bold}Recent Presentation Events${reset}`);
  for (const event of recentEvents.slice(-8)) console.log(eventLine(event));
  console.log(`\n${bold}[t]${reset}${dim} +0.25s live  ${reset}${bold}[f]${reset}${dim} +10s accelerated  ${reset}${bold}[s]${reset}${dim} save  ${reset}${bold}[l]${reset}${dim} reload${reset}`);
  console.log(`${bold}[o]${reset}${dim} 60s offline  ${reset}${bold}[v]${reset}${dim} verify equivalence  ${reset}${bold}[r]${reset}${dim} reset  ${reset}${bold}[q]${reset}${dim} quit${reset}`);
}

function advance(durationMs, label) {
  recentEvents.push(...advanceBy(simulation.state, durationMs));
  notice = `${label}; the Engine used the same boundary-driven advance function.`;
}

function handle(key) {
  switch (key) {
    case "t":
      advance(250, "Advanced live time by 0.25s");
      break;
    case "f":
      advance(10_000, "Advanced accelerated time by 10s");
      break;
    case "s":
      saveSlot = JSON.stringify(snapshot(simulation.state));
      notice = "Serialized the complete versioned Snapshot into the in-memory save slot.";
      break;
    case "l":
      if (saveSlot) {
        simulation.state = restoreSnapshot(JSON.parse(saveSlot));
        recentEvents = [];
        notice = "Restored the save slot. Event sequence and scheduled phases continued.";
      } else {
        notice = "Save slot is empty; press [s] first.";
      }
      break;
    case "o": {
      const result = runOffline(simulation.state, 60_000);
      recentEvents = result.events;
      notice = `Offline summary: +${result.summary.characterXp} XP, +${result.summary.drops} Drops, ${result.summary.stageClears} clears; visible combat restarted fresh.`;
      break;
    }
    case "v": {
      const result = verifyEquivalentAdvancement();
      notice = `30s proof: Snapshots ${result.snapshotsMatch ? "MATCH" : "DIFFER"}; events ${result.presentationEventsMatch ? "MATCH" : "DIFFER"}; ${result.eventCount} events compared.`;
      break;
    }
    case "r":
      simulation = createSimulation();
      recentEvents = [...simulation.events];
      saveSlot = null;
      notice = "Prototype reset to the same seed and initial Snapshot.";
      break;
    case "q":
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      return false;
  }
  render();
  return true;
}

render();
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on("keypress", (input, key) => {
  if (key?.ctrl && key.name === "c") handle("q");
  else handle(input.toLowerCase());
});
