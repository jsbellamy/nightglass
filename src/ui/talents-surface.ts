import type { Snapshot } from "../core/snapshot";
import {
  allocateTalentPoint,
  deallocateTalentPoint,
  spentTalentPoints,
  totalStatPoints,
  type ClassTalentState,
} from "../core/talents";
import type { ClassId, ClassKitDef, Content } from "../core/types";
import {
  formatStatModifierPerRank,
  formatStatTalentDelta,
} from "./ability-format";
import type { TileCommand } from "./bus";
import { bindPressable } from "./keyboard";
import {
  CLASS_LABELS,
  classKitFor,
  effectiveLoadout,
  effectiveTalentState,
  levelFor,
  rosterClassIds,
} from "./snapshot-view";

export interface TalentsSurface {
  render(snapshot: Snapshot | null): void;
  destroy(): void;
}

export interface TalentsSurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
}

function availableTalentPoints(snapshot: Snapshot, classId: ClassId, content: Content): number {
  const level = levelFor(snapshot, content, classId);
  const talentState = effectiveTalentState(snapshot, classId);
  return Math.max(0, level - spentTalentPoints(talentState));
}

function canAllocateStat(
  talentState: ClassTalentState,
  classKit: ClassKitDef,
  talentId: string,
  level: number,
): boolean {
  try {
    const draft = structuredClone(talentState);
    allocateTalentPoint(draft, classKit, talentId, level);
    return true;
  } catch {
    return false;
  }
}

function canDeallocateStat(
  talentState: ClassTalentState,
  classKit: ClassKitDef,
  talentId: string,
  level: number,
): boolean {
  try {
    const draft = structuredClone(talentState);
    deallocateTalentPoint(draft, classKit, talentId, level);
    return true;
  } catch {
    return false;
  }
}

function abilityTalentSlotted(snapshot: Snapshot, classId: ClassId, abilityId: string): boolean {
  const loadout = effectiveLoadout(snapshot, classId);
  return loadout.includes(abilityId);
}

function renderRankPips(container: HTMLElement, rank: number, maxRanks: number): void {
  const pips = document.createElement("div");
  pips.className = "talent-rank-pips";
  pips.setAttribute("aria-label", `${rank} of ${maxRanks} ranks`);
  for (let index = 0; index < maxRanks; index += 1) {
    const pip = document.createElement("span");
    pip.className = index < rank ? "talent-pip filled" : "talent-pip";
    pip.textContent = index < rank ? "●" : "○";
    pips.append(pip);
  }
  container.append(pips);
}

export function mountTalentsSurface(
  root: HTMLElement,
  options: TalentsSurfaceOptions,
): TalentsSurface {
  const { content } = options;
  root.classList.add("talents-surface");

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
    title.textContent = "Talents";
    root.append(title);

    for (const classId of rosterClassIds(snapshot)) {
      const classKit = classKitFor(content, classId);
      const talentState = effectiveTalentState(snapshot, classId);
      const level = levelFor(snapshot, content, classId);
      const hasPending = snapshot.pendingEdits.some(
        (edit) => edit.kind === "talent" && edit.classId === classId,
      );

      const section = document.createElement("section");
      section.className = "talents-character";
      section.dataset["classId"] = classId;

      const heading = document.createElement("h3");
      heading.className = "surface-section-title";
      heading.textContent = `${CLASS_LABELS[classId]} · Level ${level}`;
      section.append(heading);

      const pointsLine = document.createElement("p");
      pointsLine.className = "talent-points";
      pointsLine.dataset["talentPoints"] = "true";
      pointsLine.textContent = `${availableTalentPoints(snapshot, classId, content)} Talent Points available`;
      section.append(pointsLine);

      if (hasPending) {
        const marker = document.createElement("p");
        marker.className = "pending-marker pending-wave";
        marker.dataset["pendingKind"] = "talent";
        marker.textContent = "Applies at next Wave";
        section.append(marker);
      }

      const statHeading = document.createElement("h4");
      statHeading.className = "talent-row-title";
      statHeading.textContent = "Stat Row";
      section.append(statHeading);

      const statRow = document.createElement("div");
      statRow.className = "talent-stat-row";

      for (const statTalent of classKit.talents.statRow) {
        const rank = talentState.statRanks[statTalent.id] ?? 0;
        const card = document.createElement("article");
        card.className = "talent-card";
        card.dataset["talentId"] = statTalent.id;

        const name = document.createElement("p");
        name.className = "talent-name";
        name.textContent = statTalent.name;
        card.append(name);

        const perRank = document.createElement("p");
        perRank.className = "talent-per-rank";
        perRank.textContent = `${formatStatModifierPerRank(statTalent.perRank)} per rank`;
        card.append(perRank);

        const delta = formatStatTalentDelta(statTalent.perRank, rank);
        if (delta) {
          const deltaLine = document.createElement("p");
          deltaLine.className = "talent-stat-delta";
          deltaLine.dataset["statDelta"] = "true";
          deltaLine.textContent = delta;
          card.append(deltaLine);
        }

        renderRankPips(card, rank, statTalent.maxRanks);

        const controls = document.createElement("div");
        controls.className = "talent-controls";

        const allocate = document.createElement("button");
        allocate.type = "button";
        allocate.className = "talent-allocate focus-ring";
        allocate.dataset["talentAction"] = "allocate";
        allocate.dataset["talentId"] = statTalent.id;
        allocate.dataset["classId"] = classId;
        allocate.textContent = "Add point";
        allocate.disabled = !canAllocateStat(talentState, classKit, statTalent.id, level);
        bindPressable(allocate, () => {
          options.onCommand?.({ cmd: "allocateTalent", args: [classId, statTalent.id] });
        });

        const deallocate = document.createElement("button");
        deallocate.type = "button";
        deallocate.className = "talent-deallocate focus-ring";
        deallocate.dataset["talentAction"] = "deallocate";
        deallocate.dataset["talentId"] = statTalent.id;
        deallocate.dataset["classId"] = classId;
        deallocate.textContent = "Remove point";
        deallocate.disabled = !canDeallocateStat(talentState, classKit, statTalent.id, level);
        bindPressable(deallocate, () => {
          options.onCommand?.({ cmd: "deallocateTalent", args: [classId, statTalent.id] });
        });

        controls.append(allocate, deallocate);
        card.append(controls);
        statRow.append(card);
      }

      section.append(statRow);

      const abilityHeading = document.createElement("h4");
      abilityHeading.className = "talent-row-title";
      abilityHeading.textContent = "Ability Row";
      section.append(abilityHeading);

      const gateNote = document.createElement("p");
      gateNote.className = "talent-gate-note";
      gateNote.textContent =
        totalStatPoints(talentState.statRanks) >= 5
          ? "Ability Row unlocked"
          : "Spend 5 Stat Row points to unlock the Ability Row";
      section.append(gateNote);

      const abilityRow = document.createElement("div");
      abilityRow.className = "talent-ability-row";

      for (const abilityId of classKit.talents.abilityRow) {
        const ability = content.abilities.find((entry) => entry.id === abilityId);
        const selected = talentState.abilityTalentId === abilityId;
        const card = document.createElement("article");
        card.className = "talent-card ability-talent-card";
        card.dataset["talentId"] = abilityId;

        const name = document.createElement("p");
        name.className = "talent-name";
        name.textContent = ability?.name ?? abilityId;
        card.append(name);

        if (selected && abilityTalentSlotted(snapshot, classId, abilityId)) {
          const warning = document.createElement("p");
          warning.className = "talent-loadout-warning";
          warning.dataset["loadoutWarning"] = "true";
          warning.textContent = "Slotted in Loadout — removing this talent will replace it there";
          card.append(warning);
        }

        const controls = document.createElement("div");
        controls.className = "talent-controls";

        if (!selected) {
          const pick = document.createElement("button");
          pick.type = "button";
          pick.className = "talent-pick focus-ring";
          pick.dataset["talentAction"] = "allocate";
          pick.dataset["talentId"] = abilityId;
          pick.dataset["classId"] = classId;
          pick.textContent = "Choose";
          pick.disabled = !canAllocateStat(talentState, classKit, abilityId, level);
          bindPressable(pick, () => {
            options.onCommand?.({ cmd: "allocateTalent", args: [classId, abilityId] });
          });
          controls.append(pick);
        } else {
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "talent-remove focus-ring";
          remove.dataset["talentAction"] = "deallocate";
          remove.dataset["talentId"] = abilityId;
          remove.dataset["classId"] = classId;
          remove.textContent = "Remove";
          remove.disabled = !canDeallocateStat(talentState, classKit, abilityId, level);
          bindPressable(remove, () => {
            options.onCommand?.({ cmd: "deallocateTalent", args: [classId, abilityId] });
          });
          controls.append(remove);
        }

        card.append(controls);
        abilityRow.append(card);
      }

      section.append(abilityRow);
      root.append(section);
    }
  }

  return {
    render,
    destroy() {
      root.replaceChildren();
      root.classList.remove("talents-surface");
    },
  };
}

export {
  availableTalentPoints,
  canAllocateStat,
  canDeallocateStat,
};
