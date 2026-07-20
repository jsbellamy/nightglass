import type { Snapshot } from "../core/snapshot";
import type { ClassId, Content } from "../core/types";
import type { TileCommand } from "./bus";
import { bindPressable } from "./keyboard";
import { CLASS_LABELS, combatantForClass, levelFor } from "./snapshot-view";

const FORMATION_SLOTS = ["Front", "Middle", "Back"] as const;

export interface PartySurface {
  render(snapshot: Snapshot | null): void;
  destroy(): void;
}

export interface PartySurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
}

function effectiveParty(snapshot: Snapshot): {
  members: [ClassId, ClassId, ClassId];
  reserve: ClassId;
} {
  const pending = snapshot.progression.pendingParty;
  if (pending) {
    return { members: pending.members, reserve: pending.reserve };
  }
  return {
    members: snapshot.progression.party,
    reserve: snapshot.progression.reserve,
  };
}

function effectiveFormation(snapshot: Snapshot): [ClassId, ClassId, ClassId] {
  const pending = snapshot.pendingEdits.find((edit) => edit.kind === "formation");
  if (pending?.kind === "formation") {
    return pending.order;
  }
  return snapshot.progression.party;
}

function combatHealth(snapshot: Snapshot, classId: ClassId): { health: number; maxHealth: number } | null {
  const combatant = combatantForClass(snapshot, classId);
  if (!combatant) {
    return null;
  }
  return { health: combatant.health, maxHealth: combatant.maxHealth };
}

function swapFormationOrder(
  order: [ClassId, ClassId, ClassId],
  slotIndex: number,
  direction: "up" | "down",
): [ClassId, ClassId, ClassId] {
  const next = [...order] as [ClassId, ClassId, ClassId];
  const target = direction === "up" ? slotIndex - 1 : slotIndex + 1;
  if (target < 0 || target >= next.length) {
    return order;
  }
  const current = next[slotIndex]!;
  next[slotIndex] = next[target]!;
  next[target] = current;
  return next;
}

function swapPartyMember(
  members: [ClassId, ClassId, ClassId],
  reserve: ClassId,
  classId: ClassId,
): { members: [ClassId, ClassId, ClassId]; reserve: ClassId } {
  const index = members.indexOf(classId);
  if (index === -1) {
    return { members, reserve };
  }
  const nextMembers = [...members] as [ClassId, ClassId, ClassId];
  nextMembers[index] = reserve;
  return { members: nextMembers, reserve: classId };
}

export function mountPartySurface(
  root: HTMLElement,
  options: PartySurfaceOptions,
): PartySurface {
  const { content } = options;
  root.classList.add("party-surface");

  function render(snapshot: Snapshot | null): void {
    root.replaceChildren();
    if (!snapshot) {
      const empty = document.createElement("p");
      empty.className = "surface-empty";
      empty.textContent = "No Snapshot yet.";
      root.append(empty);
      return;
    }

    const title = document.createElement("h2");
    title.className = "dock-surface-title";
    title.textContent = "Party";
    root.append(title);

    const hasFormationPending = snapshot.pendingEdits.some((edit) => edit.kind === "formation");
    const hasPartyPending = snapshot.progression.pendingParty !== null;

    if (hasFormationPending) {
      const marker = document.createElement("p");
      marker.className = "pending-marker pending-wave";
      marker.dataset["pendingKind"] = "formation";
      marker.textContent = "Applies at next Wave";
      root.append(marker);
    }

    if (hasPartyPending) {
      const marker = document.createElement("p");
      marker.className = "pending-marker pending-attempt";
      marker.dataset["pendingKind"] = "party";
      marker.textContent = "Applies next Attempt";
      root.append(marker);
    }

    const { members, reserve } = effectiveParty(snapshot);
    const formation = effectiveFormation(snapshot);

    const formationSection = document.createElement("section");
    formationSection.className = "party-formation";
    formationSection.setAttribute("aria-label", "Formation");

    const formationHeading = document.createElement("h3");
    formationHeading.className = "surface-section-title";
    formationHeading.textContent = "Formation";
    formationSection.append(formationHeading);

    formation.forEach((classId, slotIndex) => {
      const slot = document.createElement("article");
      slot.className = "formation-slot character-card";
      slot.dataset["slot"] = String(slotIndex);

      const slotLabel = document.createElement("p");
      slotLabel.className = "slot-label";
      slotLabel.textContent = FORMATION_SLOTS[slotIndex] ?? "Slot";

      const name = document.createElement("p");
      name.className = "character-name";
      name.textContent = CLASS_LABELS[classId];

      const level = document.createElement("p");
      level.className = "character-level";
      level.textContent = `Level ${levelFor(snapshot, content, classId)}`;

      const health = combatHealth(snapshot, classId);
      if (health) {
        const healthLine = document.createElement("p");
        healthLine.className = "character-health";
        healthLine.textContent = `Health ${health.health}/${health.maxHealth}`;
        slot.append(slotLabel, name, level, healthLine);
      } else {
        slot.append(slotLabel, name, level);
      }

      const controls = document.createElement("div");
      controls.className = "formation-controls";

      const moveUp = document.createElement("button");
      moveUp.type = "button";
      moveUp.className = "formation-action focus-ring";
      moveUp.dataset["formationAction"] = "move-up";
      moveUp.dataset["slot"] = String(slotIndex);
      moveUp.textContent = "Move up";
      moveUp.disabled = slotIndex === 0;
      bindPressable(moveUp, () => {
        options.onCommand?.({
          cmd: "setFormation",
          args: [swapFormationOrder(formation, slotIndex, "up")],
        });
      });

      const moveDown = document.createElement("button");
      moveDown.type = "button";
      moveDown.className = "formation-action focus-ring";
      moveDown.dataset["formationAction"] = "move-down";
      moveDown.dataset["slot"] = String(slotIndex);
      moveDown.textContent = "Move down";
      moveDown.disabled = slotIndex === formation.length - 1;
      bindPressable(moveDown, () => {
        options.onCommand?.({
          cmd: "setFormation",
          args: [swapFormationOrder(formation, slotIndex, "down")],
        });
      });

      controls.append(moveUp, moveDown);
      slot.append(controls);
      formationSection.append(slot);
    });

    root.append(formationSection);

    const reserveSection = document.createElement("section");
    reserveSection.className = "party-reserve";
    reserveSection.setAttribute("aria-label", "Reserve");

    const reserveHeading = document.createElement("h3");
    reserveHeading.className = "surface-section-title";
    reserveHeading.textContent = "Reserve";
    reserveSection.append(reserveHeading);

    const reserveNote = document.createElement("p");
    reserveNote.className = "reserve-note";
    reserveNote.textContent = "Earns 50% XP";
    reserveSection.append(reserveNote);

    const reserveCard = document.createElement("article");
    reserveCard.className = "character-card reserve-card";

    const reserveName = document.createElement("p");
    reserveName.className = "character-name";
    reserveName.textContent = CLASS_LABELS[reserve];

    const reserveLevel = document.createElement("p");
    reserveLevel.className = "character-level";
    reserveLevel.textContent = `Level ${levelFor(snapshot, content, reserve)}`;
    reserveCard.append(reserveName, reserveLevel);
    reserveSection.append(reserveCard);

    const rosterHeading = document.createElement("h3");
    rosterHeading.className = "surface-section-title";
    rosterHeading.textContent = "Party swaps";
    reserveSection.append(rosterHeading);

    for (const classId of members) {
      const swapButton = document.createElement("button");
      swapButton.type = "button";
      swapButton.className = "party-swap focus-ring";
      swapButton.dataset["partySwap"] = classId;
      swapButton.textContent = `Swap ${CLASS_LABELS[classId]} with Reserve`;
      bindPressable(swapButton, () => {
        const swapped = swapPartyMember(members, reserve, classId);
        options.onCommand?.({
          cmd: "setParty",
          args: [swapped.members, swapped.reserve],
        });
      });
      reserveSection.append(swapButton);
    }

    root.append(reserveSection);
  }

  return {
    render,
    destroy() {
      root.replaceChildren();
      root.classList.remove("party-surface");
    },
  };
}
