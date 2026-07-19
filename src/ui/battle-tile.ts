import { opponentCombatants, partyCombatants } from "../core/combat";
import type { EngineEvent } from "../core/events";
import type { CombatantState, Snapshot } from "../core/snapshot";
import type { Content, StageDef } from "../core/types";
import { createPresentation, type Presentation } from "./presentation";
import { resolveSprite } from "./sprites";

export const STATUS_LINE_HEIGHT = 24;
export const BATTLEFIELD_HEIGHT = 86;
export const TILE_WIDTH = 480;
export const TILE_HEIGHT = 112;

const FORMATION_ORDER = ["back", "middle", "front"] as const;

type FormationSlot = (typeof FORMATION_ORDER)[number];

export interface BattleTileMountOptions {
  reducedMotion?: boolean;
}

export interface BattleTile {
  render(snapshot: Snapshot): void;
  applyEvents(events: EngineEvent[], snapshot?: Snapshot): void;
  destroy(): void;
}

interface CombatantLookup {
  spriteKeyFor(combatant: CombatantState): string;
  isBoss(combatant: CombatantState): boolean;
}

function formationSlotFromEntityId(entityId: string): FormationSlot {
  const slot = entityId.split(":")[2];
  if (slot === "front" || slot === "middle" || slot === "back") {
    return slot;
  }
  return "back";
}

function opponentIndexFromEntityId(entityId: string): number {
  const index = Number(entityId.split(":")[2]);
  return Number.isFinite(index) ? index : 0;
}

function stageDefFor(content: Content, stageId: 1 | 2 | 3): StageDef | undefined {
  return content.stages.find((stage) => stage.id === stageId);
}

/** Interim #59: muted night-garden gradients until backdrop asset slice lands. */
const BACKDROP_GRADIENTS: Record<string, string> = {
  "backdrop-1":
    "linear-gradient(180deg, #1a1428 0%, #24304a 38%, #2f4a3a 72%, #1a2820 100%)",
  "backdrop-2":
    "linear-gradient(180deg, #141228 0%, #2a2448 40%, #3a2f52 70%, #1e1828 100%)",
  "backdrop-3":
    "linear-gradient(180deg, #101420 0%, #1e2840 35%, #3a2850 68%, #182028 100%)",
  "fixture-meadow":
    "linear-gradient(180deg, #1a1428 0%, #24304a 38%, #2f4a3a 72%, #1a2820 100%)",
};

function backdropGradient(backdropKey: string): string {
  return (
    BACKDROP_GRADIENTS[backdropKey] ??
    BACKDROP_GRADIENTS["backdrop-1"]!
  );
}

function healthFillPercent(health: number, maxHealth: number): number {
  if (maxHealth <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((health / maxHealth) * 100)));
}

function stageWaveLabel(snapshot: Snapshot, content: Content): string {
  const attempt = snapshot.attempt;
  if (!attempt) {
    return "No Attempt";
  }
  const stage = stageDefFor(content, attempt.stage);
  const stageName = stage?.name ?? `Stage ${attempt.stage}`;
  const waveLabel = attempt.encounter === 3 ? "Boss" : `Wave ${attempt.encounter}`;
  return `${stageName} · ${waveLabel}`;
}

function createCombatantLookup(content: Content): CombatantLookup {
  const opponentsById = new Map(content.opponents.map((opponent) => [opponent.id, opponent]));
  return {
    spriteKeyFor(combatant) {
      if (combatant.side === "party") {
        return combatant.defId;
      }
      const opponent = opponentsById.get(combatant.defId);
      return opponent?.spriteKey ?? "pipcap";
    },
    isBoss(combatant) {
      if (combatant.side !== "opponent") {
        return false;
      }
      const opponent = opponentsById.get(combatant.defId);
      return opponent?.boss ?? false;
    },
  };
}

function ensureCombatantElement(
  container: HTMLElement,
  combatant: CombatantState,
  lookup: CombatantLookup,
): HTMLElement {
  let element = container.querySelector<HTMLElement>(`[data-entity-id="${combatant.entityId}"]`);
  if (element) {
    return element;
  }

  const sprite = resolveSprite(lookup.spriteKeyFor(combatant));
  const isParty = combatant.side === "party";
  const formationSlot = isParty ? formationSlotFromEntityId(combatant.entityId) : null;
  const opponentIndex = isParty ? null : opponentIndexFromEntityId(combatant.entityId);

  element = document.createElement("div");
  element.className = [
    "combatant",
    isParty ? "party" : "opponent",
    isParty ? "facing-right" : "facing-left",
    formationSlot ? `formation-${formationSlot}` : "",
    opponentIndex !== null ? `opponent-slot-${opponentIndex}` : "",
    opponentIndex !== null && opponentIndex >= 4 ? "opponent-stress" : "",
  ]
    .filter(Boolean)
    .join(" ");
  element.dataset["entityId"] = combatant.entityId;

  const stack = document.createElement("div");
  stack.className = "combatant-stack";

  const markLayer = document.createElement("div");
  markLayer.className = "layer layer-mark";
  markLayer.setAttribute("aria-hidden", "true");

  const bodyLayer = document.createElement("div");
  bodyLayer.className = "layer layer-body";

  const image = document.createElement("img");
  image.className = "combatant-sprite";
  image.src = sprite.url;
  image.width = sprite.width;
  image.height = sprite.height;
  image.alt = "";
  image.draggable = false;
  image.style.imageRendering = "pixelated";
  bodyLayer.append(image);

  if (sprite.interimLabel) {
    const label = document.createElement("span");
    label.className = "interim-sprite-label";
    label.textContent = sprite.interimLabel;
    bodyLayer.append(label);
  }

  const effectLayer = document.createElement("div");
  effectLayer.className = "layer layer-effect";
  effectLayer.setAttribute("aria-hidden", "true");

  stack.append(markLayer, bodyLayer, effectLayer);

  const healthBar = document.createElement("div");
  healthBar.className = "health-bar";
  const healthFill = document.createElement("div");
  healthFill.className = "health-fill";
  const healthText = document.createElement("span");
  healthText.className = "health-text";
  healthBar.append(healthFill, healthText);

  if (lookup.isBoss(combatant)) {
    element.classList.add("boss-combatant");
    element.append(stack);
  } else {
    element.append(stack, healthBar);
  }
  container.append(element);
  return element;
}

function updateCombatantElement(
  element: HTMLElement,
  combatant: CombatantState,
  lookup: CombatantLookup,
): void {
  const fill = element.querySelector<HTMLElement>(".health-fill");
  const text = element.querySelector<HTMLElement>(".health-text");
  const percent = healthFillPercent(combatant.health, combatant.maxHealth);
  if (fill) {
    fill.style.width = `${percent}%`;
    fill.dataset["healthPercent"] = String(percent);
  }
  if (text) {
    text.textContent = `${combatant.health}/${combatant.maxHealth}`;
  }
  element.classList.toggle("knocked-out", combatant.knockedOut);
  element.classList.toggle("boss-combatant", lookup.isBoss(combatant));
}

function syncCombatants(
  container: HTMLElement,
  combatants: CombatantState[],
  lookup: CombatantLookup,
): void {
  const seen = new Set<string>();
  for (const combatant of combatants) {
    seen.add(combatant.entityId);
    const element = ensureCombatantElement(container, combatant, lookup);
    updateCombatantElement(element, combatant, lookup);
  }
  for (const element of [...container.querySelectorAll<HTMLElement>(".combatant")]) {
    if (!seen.has(element.dataset["entityId"] ?? "")) {
      element.remove();
    }
  }
}

function updateBossBar(root: HTMLElement, boss: CombatantState | undefined): void {
  const bar = root.querySelector<HTMLElement>(".boss-health-bar");
  if (!bar) {
    return;
  }
  if (!boss) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const fill = bar.querySelector<HTMLElement>(".boss-health-fill");
  const text = bar.querySelector<HTMLElement>(".boss-health-text");
  const percent = healthFillPercent(boss.health, boss.maxHealth);
  if (fill) {
    fill.style.width = `${percent}%`;
    fill.dataset["healthPercent"] = String(percent);
  }
  if (text) {
    text.textContent = `${boss.health}/${boss.maxHealth}`;
  }
}

export function mountBattleTile(
  root: HTMLElement,
  content: Content,
  options: BattleTileMountOptions = {},
): BattleTile {
  const lookup = createCombatantLookup(content);

  root.classList.add("battle-tile", "tile-shell");
  root.setAttribute("aria-label", "Battle Tile");

  const statusLine = document.createElement("header");
  statusLine.className = "status-line";

  const dockToggle = document.createElement("button");
  dockToggle.type = "button";
  dockToggle.className = "status-button dock-toggle";
  dockToggle.setAttribute("aria-label", "Open Management Dock");
  dockToggle.textContent = "☰";

  const mutePlaceholder = document.createElement("button");
  mutePlaceholder.type = "button";
  mutePlaceholder.className = "status-button mute-placeholder";
  mutePlaceholder.setAttribute("aria-label", "Mute audio");
  mutePlaceholder.textContent = "🔇";
  mutePlaceholder.disabled = true;

  const dragRegion = document.createElement("span");
  dragRegion.className = "status-drag-region";
  dragRegion.dataset["tauriDragRegion"] = "";

  const stageWaveText = document.createElement("span");
  stageWaveText.className = "stage-wave-text";

  statusLine.append(dockToggle, mutePlaceholder, dragRegion, stageWaveText);

  const battlefield = document.createElement("section");
  battlefield.className = "battlefield";
  battlefield.setAttribute("aria-label", "Battlefield");

  const backdrop = document.createElement("div");
  backdrop.className = "battlefield-backdrop";

  const partyZone = document.createElement("div");
  partyZone.className = "party-zone";

  const effectLane = document.createElement("div");
  effectLane.className = "effect-lane";
  effectLane.setAttribute("aria-hidden", "true");

  const opponentZone = document.createElement("div");
  opponentZone.className = "opponent-zone";

  const bossHealthBar = document.createElement("div");
  bossHealthBar.className = "boss-health-bar";
  bossHealthBar.hidden = true;
  const bossFill = document.createElement("div");
  bossFill.className = "boss-health-fill";
  const bossText = document.createElement("span");
  bossText.className = "boss-health-text";
  bossHealthBar.append(bossFill, bossText);

  const feedbackLayer = document.createElement("div");
  feedbackLayer.className = "feedback-layer";
  feedbackLayer.setAttribute("aria-hidden", "true");

  battlefield.append(backdrop, partyZone, effectLane, opponentZone, bossHealthBar, feedbackLayer);
  root.append(statusLine, battlefield);

  const presentation: Presentation = createPresentation({
    battlefield,
    effectLane,
    feedbackLayer,
    content,
    reducedMotion: options.reducedMotion ?? false,
  });

  let lastSnapshot: Snapshot | null = null;

  function render(snapshot: Snapshot): void {
    lastSnapshot = snapshot;
    stageWaveText.textContent = stageWaveLabel(snapshot, content);

    const attempt = snapshot.attempt;
    if (!attempt) {
      partyZone.replaceChildren();
      opponentZone.replaceChildren();
      bossHealthBar.hidden = true;
      return;
    }

    const stage = stageDefFor(content, attempt.stage);
    const backdropKey = stage?.backdropKey ?? "backdrop-1";
    battlefield.dataset["backdropKey"] = backdropKey;
    backdrop.style.background = backdropGradient(backdropKey);

    const party = partyCombatants(attempt.combatants).sort((left, right) => {
      const leftSlot = FORMATION_ORDER.indexOf(formationSlotFromEntityId(left.entityId));
      const rightSlot = FORMATION_ORDER.indexOf(formationSlotFromEntityId(right.entityId));
      return leftSlot - rightSlot;
    });
    const opponents = opponentCombatants(attempt.combatants);
    const boss = opponents.find((combatant) => lookup.isBoss(combatant));

    syncCombatants(partyZone, party, lookup);
    syncCombatants(opponentZone, opponents, lookup);
    updateBossBar(battlefield, boss);
    battlefield.classList.toggle("opponent-stress-layout", opponents.length >= 5);
    presentation.render(snapshot.simNowMs, snapshot);
  }

  function applyEvents(events: EngineEvent[], snapshot?: Snapshot): void {
    const activeSnapshot = snapshot ?? lastSnapshot;
    if (!activeSnapshot) {
      return;
    }
    lastSnapshot = activeSnapshot;
    for (const event of events) {
      if (event.type === "impact") {
        for (const result of event.results) {
          const selector = `[data-entity-id="${result.targetId}"] .health-fill`;
          const fill = root.querySelector<HTMLElement>(selector);
          if (!fill || !activeSnapshot.attempt) {
            continue;
          }
          const combatant = activeSnapshot.attempt.combatants.find(
            (entry) => entry.entityId === result.targetId,
          );
          if (!combatant) {
            continue;
          }
          combatant.health = result.healthAfter;
          const percent = healthFillPercent(combatant.health, combatant.maxHealth);
          fill.style.width = `${percent}%`;
          fill.dataset["healthPercent"] = String(percent);
          const text = root.querySelector<HTMLElement>(
            `[data-entity-id="${result.targetId}"] .health-text`,
          );
          if (text) {
            text.textContent = `${combatant.health}/${combatant.maxHealth}`;
          }
        }
      }
    }
    presentation.applyEvents(events, activeSnapshot);
    presentation.render(activeSnapshot.simNowMs, activeSnapshot);
  }

  return {
    render,
    applyEvents,
    destroy() {
      presentation.destroy();
      root.replaceChildren();
      root.classList.remove("battle-tile", "tile-shell");
      lastSnapshot = null;
    },
  };
}
