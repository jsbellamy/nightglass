import { equipmentModifiersForLoadout } from "../core/equipment";
import type { Snapshot } from "../core/snapshot";
import type { ClassTalentState } from "../core/talents";
import type { AbilityDef, ClassId, ClassKitDef, Content } from "../core/types";
import {
  abilityRawDisplay,
  actionCyclePhase,
  characterBaseStats,
  cooldownRemainingMs,
  formatAbilityRawLine,
  formatAbilityTimings,
  formatCooldownState,
} from "./ability-format";
import type { TileCommand } from "./bus";

const CLASS_LABELS: Record<ClassId, string> = {
  knight: "Knight",
  wizard: "Wizard",
  priest: "Priest",
  hunter: "Hunter",
};

export interface LoadoutSurface {
  render(snapshot: Snapshot | null): void;
  destroy(): void;
}

export interface LoadoutSurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
}

function abilityById(content: Content, abilityId: string): AbilityDef | undefined {
  return content.abilities.find((ability) => ability.id === abilityId);
}

function classKitFor(content: Content, classId: ClassId): ClassKitDef {
  const classKit = content.classes.find((entry) => entry.id === classId);
  if (!classKit) {
    throw new Error(`Missing Class Kit ${classId}`);
  }
  return classKit;
}

function effectiveTalentState(snapshot: Snapshot, classId: ClassId): ClassTalentState {
  const pending = snapshot.pendingEdits.find(
    (edit) => edit.kind === "talent" && edit.classId === classId,
  );
  if (pending?.kind === "talent") {
    return {
      statRanks: { ...pending.statRanks },
      abilityTalentId: pending.abilityTalentId,
    };
  }
  return structuredClone(snapshot.progression.talents[classId]!);
}

function appliedLoadout(snapshot: Snapshot, classId: ClassId): [string, string, string] {
  return [...snapshot.progression.loadouts[classId]!] as [string, string, string];
}

function effectiveLoadout(snapshot: Snapshot, classId: ClassId): [string, string, string] {
  const pending = snapshot.pendingEdits.find(
    (edit) => edit.kind === "loadout" && edit.classId === classId,
  );
  if (pending?.kind === "loadout") {
    return [...pending.loadout] as [string, string, string];
  }
  return appliedLoadout(snapshot, classId);
}

function unlockableAbilityIds(
  classKit: ClassKitDef,
  talentState: ClassTalentState,
): string[] {
  const ids = [classKit.basicAbilityId, ...classKit.coreAbilityIds];
  if (talentState.abilityTalentId) {
    ids.push(talentState.abilityTalentId);
  }
  return ids;
}

function rosterClassIds(snapshot: Snapshot): ClassId[] {
  const { party, reserve } = snapshot.progression;
  return [...party, reserve];
}

function combatantForClass(snapshot: Snapshot, classId: ClassId) {
  return snapshot.attempt?.combatants.find(
    (combatant) => combatant.side === "party" && combatant.defId === classId,
  );
}

function newlyInsertedAbilities(
  applied: [string, string, string],
  pending: [string, string, string],
): Set<string> {
  const previous = new Set(applied);
  return new Set(pending.filter((abilityId) => !previous.has(abilityId)));
}

export function mountLoadoutSurface(
  root: HTMLElement,
  options: LoadoutSurfaceOptions,
): LoadoutSurface {
  const { content } = options;
  root.classList.add("loadout-surface");

  function renderAbilityCard(
    container: HTMLElement,
    ability: AbilityDef,
    stats: ReturnType<typeof characterBaseStats>,
    snapshot: Snapshot,
    classId: ClassId,
    slotIndex: number | "basic",
    activationDelayPending: boolean,
  ): void {
    const card = document.createElement("article");
    card.className = "ability-card";
    card.dataset["abilityId"] = ability.id;
    if (slotIndex !== "basic") {
      card.dataset["loadoutSlot"] = String(slotIndex);
    }

    const name = document.createElement("p");
    name.className = "ability-name";
    name.textContent = ability.name;
    card.append(name);

    const raw = formatAbilityRawLine(abilityRawDisplay(ability, stats));
    if (raw) {
      const rawLine = document.createElement("p");
      rawLine.className = "ability-raw";
      rawLine.dataset["rawResult"] = "true";
      rawLine.textContent = raw;
      card.append(rawLine);
    }

    const timings = document.createElement("p");
    timings.className = "ability-timings";
    timings.textContent = formatAbilityTimings(ability);
    card.append(timings);

    if (activationDelayPending && ability.cooldownMs > 0) {
      const delay = document.createElement("p");
      delay.className = "activation-delay";
      delay.dataset["activationDelay"] = "true";
      delay.textContent = "Activation Delay: starts on full cooldown";
      card.append(delay);
    }

    const combatant = combatantForClass(snapshot, classId);
    if (combatant && snapshot.attempt && slotIndex !== "basic" && !activationDelayPending) {
      const readyAt = combatant.cooldownReadyAtMs[ability.id] ?? 0;
      const cooldown = document.createElement("p");
      cooldown.className = "ability-cooldown";
      cooldown.dataset["cooldownTelemetry"] = "true";
      cooldown.textContent = formatCooldownState(readyAt, snapshot.simNowMs);
      cooldown.dataset["remainingMs"] = String(cooldownRemainingMs(readyAt, snapshot.simNowMs));
      card.append(cooldown);
    }

    container.append(card);
  }

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
    title.textContent = "Loadout";
    root.append(title);

    const orderNote = document.createElement("p");
    orderNote.className = "loadout-order-note";
    orderNote.textContent = "Slot 1 is checked first for the first valid Ability.";
    root.append(orderNote);

    for (const classId of rosterClassIds(snapshot)) {
      const classKit = classKitFor(content, classId);
      const talentState = effectiveTalentState(snapshot, classId);
      const equipmentLoadout = snapshot.attempt?.equipmentLoadouts[classId] ?? {};
      const equipmentMods = equipmentModifiersForLoadout(
        equipmentLoadout,
        snapshot.progression.armory,
        content,
      );
      const stats = characterBaseStats(classKit, talentState, equipmentMods);
      const applied = appliedLoadout(snapshot, classId);
      const loadout = effectiveLoadout(snapshot, classId);
      const hasPending = snapshot.pendingEdits.some(
        (edit) => edit.kind === "loadout" && edit.classId === classId,
      );
      const inserted = hasPending ? newlyInsertedAbilities(applied, loadout) : new Set<string>();

      const section = document.createElement("section");
      section.className = "loadout-character";
      section.dataset["classId"] = classId;

      const heading = document.createElement("h3");
      heading.className = "surface-section-title";
      heading.textContent = CLASS_LABELS[classId];
      section.append(heading);

      if (hasPending) {
        const marker = document.createElement("p");
        marker.className = "pending-marker pending-wave";
        marker.dataset["pendingKind"] = "loadout";
        marker.textContent = "Applies at next Wave";
        section.append(marker);
      }

      const combatant = combatantForClass(snapshot, classId);
      if (combatant?.action) {
        const phase = actionCyclePhase(combatant.action, snapshot.simNowMs);
        if (phase) {
          const cycle = document.createElement("p");
          cycle.className = "action-cycle-phase";
          cycle.dataset["actionCycleTelemetry"] = "true";
          cycle.textContent = `Action Cycle: ${phase} (${combatant.action.abilityId})`;
          section.append(cycle);
        }
      }

      const basicAbility = abilityById(content, classKit.basicAbilityId);
      if (basicAbility) {
        const basicSection = document.createElement("div");
        basicSection.className = "basic-attack";
        basicSection.setAttribute("aria-label", "Basic attack fallback");

        const basicLabel = document.createElement("p");
        basicLabel.className = "slot-label";
        basicLabel.textContent = "Basic attack (fallback)";
        basicSection.append(basicLabel);

        renderAbilityCard(basicSection, basicAbility, stats, snapshot, classId, "basic", false);
        section.append(basicSection);
      }

      const slots = document.createElement("div");
      slots.className = "loadout-slots";

      loadout.forEach((abilityId, slotIndex) => {
        const ability = abilityById(content, abilityId);
        if (!ability) {
          return;
        }

        const slot = document.createElement("div");
        slot.className = "loadout-slot";
        slot.dataset["slot"] = String(slotIndex);

        const slotLabel = document.createElement("p");
        slotLabel.className = "slot-label";
        slotLabel.textContent = `Slot ${slotIndex + 1}`;
        slot.append(slotLabel);

        renderAbilityCard(
          slot,
          ability,
          stats,
          snapshot,
          classId,
          slotIndex,
          inserted.has(abilityId),
        );

        const select = document.createElement("select");
        select.className = "loadout-assign focus-ring";
        select.dataset["loadoutAssign"] = String(slotIndex);
        select.dataset["classId"] = classId;
        select.setAttribute("aria-label", `Assign Ability to slot ${slotIndex + 1} for ${CLASS_LABELS[classId]}`);

        const currentOption = document.createElement("option");
        currentOption.value = abilityId;
        currentOption.textContent = ability.name;
        currentOption.selected = true;
        select.append(currentOption);

        const unlocked = unlockableAbilityIds(classKit, talentState);
        for (const candidateId of unlocked) {
          if (candidateId === abilityId) {
            continue;
          }
          const candidate = abilityById(content, candidateId);
          if (!candidate) {
            continue;
          }
          const duplicateIndex = loadout.indexOf(candidateId);
          const option = document.createElement("option");
          option.value = candidateId;
          option.textContent = candidate.name;
          if (duplicateIndex !== -1 && duplicateIndex !== slotIndex) {
            option.disabled = true;
            option.textContent = `${candidate.name} (already slotted)`;
          }
          select.append(option);
        }

        select.addEventListener("change", () => {
          const nextAbilityId = select.value;
          if (nextAbilityId === abilityId) {
            return;
          }
          const nextLoadout = [...loadout] as [string, string, string];
          nextLoadout[slotIndex] = nextAbilityId;
          options.onCommand?.({
            cmd: "setLoadout",
            args: [classId, nextLoadout],
          });
        });

        slot.append(select);
        slots.append(slot);
      });

      section.append(slots);
      root.append(section);
    }
  }

  return {
    render,
    destroy() {
      root.replaceChildren();
      root.classList.remove("loadout-surface");
    },
  };
}

export function unlockableAbilityIdsForClass(
  classKit: ClassKitDef,
  talentState: ClassTalentState,
): string[] {
  return unlockableAbilityIds(classKit, talentState);
}

export { effectiveLoadout, effectiveTalentState };
