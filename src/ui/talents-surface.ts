import type { ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content, StatTalentDef, TalentTierDef } from "../core/types";
import { formatAbilityDescription, formatStatTalentDelta } from "./ability-format";
import type { TileCommand } from "./bus";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";
import { bindPressable } from "./keyboard";
import { createEquipmentIconElement } from "./icons";
import {
  CLASS_LABELS,
  characterStatsFor,
  classKitFor,
  effectiveLoadout,
  effectiveTalentState,
  formatStatModifierPerRank,
  levelFor,
  spentTalentPoints,
  talentTierDefs,
  totalStatPoints,
  type ClassTalentState,
  type TierTalentState,
} from "./snapshot-view";
import { el, mountSurfaceShell, pendingMarker } from "./surface-shell";

export interface TalentsSurface {
  render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void;
  destroy(): void;
}

export interface TalentsSurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
  /** The Character the picker has selected. Read at render time, not mount time. */
  getSelectedClassId(): ClassId | null;
}

function spentInTier(tierState: TierTalentState): number {
  return totalStatPoints(tierState.statRanks) + (tierState.abilityTalentId ? 1 : 0);
}

function isTalentTierUnlocked(talentState: ClassTalentState, tierIndex: number): boolean {
  if (tierIndex === 0) {
    return true;
  }
  const previous = talentState.tierStates[tierIndex - 1];
  return previous !== undefined && spentInTier(previous) >= 6;
}

function availableTalentPoints(snapshot: ReadonlySnapshot, classId: ClassId, content: Content): number {
  const level = levelFor(snapshot, content, classId);
  const talentState = effectiveTalentState(snapshot, classId);
  return Math.max(0, level - spentTalentPoints(talentState));
}

function abilityTalentSlotted(snapshot: ReadonlySnapshot, classId: ClassId, abilityId: string): boolean {
  const loadout = effectiveLoadout(snapshot, classId);
  return loadout.includes(abilityId);
}

export function mountTalentsSurface(
  root: HTMLElement,
  options: TalentsSurfaceOptions,
): TalentsSurface {
  const { content } = options;
  let shell!: ReturnType<typeof mountSurfaceShell>;

  function appendTalentCellIcon(cell: HTMLElement, iconKey: string, name: string): void {
    const face = el("span", { class: "talent-cell-face" });
    const wrap = el("span", {
      class: "equipment-icon-content",
      aria: { hidden: "true" },
    });
    wrap.append(createEquipmentIconElement(iconKey, "content", { ariaLabel: `${name} icon` }));
    face.append(wrap);
    cell.prepend(face);
  }

  function renderStatCell(statTalent: StatTalentDef, rank: number): HTMLElement {
    const selected = shell.getSelection() === statTalent.id;
    const cell = el("button", {
      class: selected ? "talent-cell focus-ring selected" : "talent-cell focus-ring",
      data: { talentId: statTalent.id },
      props: { type: "button", title: statTalent.name },
      aria: {
        label: `${statTalent.name}, ${rank} of ${statTalent.maxRanks} ranks`,
      },
    }, [
      el("span", {
        class: "talent-rank-badge",
        text: `${rank}/${statTalent.maxRanks}`,
      }),
    ]);
    appendTalentCellIcon(cell, statTalent.iconKey, statTalent.name);
    bindPressable(cell, () => {
      shell.setSelection(statTalent.id);
    });
    cell.addEventListener("focus", () => {
      if (shell.getSelection() === statTalent.id) {
        return;
      }
      shell.setSelection(statTalent.id);
      root
        .querySelector<HTMLElement>(`.talent-cell[data-talent-id="${statTalent.id}"]`)
        ?.focus();
    });
    return cell;
  }

  function renderAbilityCell(
    abilityId: string,
    abilityName: string,
    iconKey: string,
    chosen: boolean,
  ): HTMLElement {
    const selected = shell.getSelection() === abilityId;
    const classes = ["talent-cell", "ability-talent-cell", "focus-ring"];
    if (selected) {
      classes.push("selected");
    }
    if (chosen) {
      classes.push("talent-cell--chosen");
    }
    const cell = el("button", {
      class: classes.join(" "),
      data: { talentId: abilityId },
      props: { type: "button", title: abilityName },
      aria: { label: abilityName },
    }, [
      el("span", {
        class: chosen ? "talent-ability-mark talent-ability-mark--chosen" : "talent-ability-mark",
        text: chosen ? "✓" : "",
        aria: { hidden: "true" },
      }),
    ]);
    appendTalentCellIcon(cell, iconKey, abilityName);
    bindPressable(cell, () => {
      shell.setSelection(abilityId);
    });
    cell.addEventListener("focus", () => {
      if (shell.getSelection() === abilityId) {
        return;
      }
      shell.setSelection(abilityId);
      root
        .querySelector<HTMLElement>(`.talent-cell[data-talent-id="${abilityId}"]`)
        ?.focus();
    });
    return cell;
  }

  function renderStatDetail(
    classId: ClassId,
    statTalent: StatTalentDef,
    rank: number,
    legality: EngineLegalityView,
  ): HTMLElement[] {
    const delta = formatStatTalentDelta(statTalent.perRank, rank);

    const allocate = el("button", {
      class: "talent-allocate focus-ring",
      data: {
        talentAction: "allocate",
        talentId: statTalent.id,
        classId,
      },
      props: {
        type: "button",
        disabled: !legality.canAllocateTalent(classId, statTalent.id),
      },
      text: "Add point",
    });
    bindPressable(allocate, () => {
      options.onCommand?.({ cmd: "allocateTalent", args: [classId, statTalent.id] });
    });

    const deallocate = el("button", {
      class: "talent-deallocate focus-ring",
      data: {
        talentAction: "deallocate",
        talentId: statTalent.id,
        classId,
      },
      props: {
        type: "button",
        disabled: !legality.canDeallocateTalent(classId, statTalent.id),
      },
      text: "Remove point",
    });
    bindPressable(deallocate, () => {
      options.onCommand?.({ cmd: "deallocateTalent", args: [classId, statTalent.id] });
    });

    const children: HTMLElement[] = [
      el("p", { class: "talent-name", text: statTalent.name }),
      el("p", {
        class: "talent-per-rank",
        text: `${formatStatModifierPerRank(statTalent.perRank)} per rank`,
      }),
    ];
    if (delta) {
      children.push(
        el("p", { class: "talent-stat-delta", data: { statDelta: "true" }, text: delta }),
      );
    }
    children.push(el("div", { class: "talent-detail-actions" }, [allocate, deallocate]));
    return children;
  }

  function renderAbilityDetail(
    snapshot: ReadonlySnapshot,
    classId: ClassId,
    abilityId: string,
    abilityName: string,
    selected: boolean,
    legality: EngineLegalityView,
  ): HTMLElement[] {
    const ability = content.abilities.find((entry) => entry.id === abilityId);
    const stats = characterStatsFor(snapshot, content, classId);
    const children: HTMLElement[] = [
      el("p", { class: "talent-name", text: abilityName }),
    ];

    if (ability) {
      children.push(
        el("p", {
          class: "ability-description",
          data: { abilityDescription: "true" },
          text: formatAbilityDescription(ability, stats, content.statuses),
        }),
      );
    }

    if (selected && abilityTalentSlotted(snapshot, classId, abilityId)) {
      children.push(
        el("p", {
          class: "talent-loadout-warning",
          data: { loadoutWarning: "true" },
          text: "Slotted in Loadout — removing this talent will replace it there",
        }),
      );
    }

    const actions = el("div", { class: "talent-detail-actions" });
    if (!selected) {
      const pick = el("button", {
        class: "talent-pick focus-ring",
        data: {
          talentAction: "allocate",
          talentId: abilityId,
          classId,
        },
        props: {
          type: "button",
          disabled: !legality.canAllocateTalent(classId, abilityId),
        },
        text: "Choose",
      });
      bindPressable(pick, () => {
        options.onCommand?.({ cmd: "allocateTalent", args: [classId, abilityId] });
      });
      actions.append(pick);
    } else {
      const remove = el("button", {
        class: "talent-remove focus-ring",
        data: {
          talentAction: "deallocate",
          talentId: abilityId,
          classId,
        },
        props: {
          type: "button",
          disabled: !legality.canDeallocateTalent(classId, abilityId),
        },
        text: "Remove",
      });
      bindPressable(remove, () => {
        options.onCommand?.({ cmd: "deallocateTalent", args: [classId, abilityId] });
      });
      actions.append(remove);
    }
    children.push(actions);
    return children;
  }

  function renderTalentTierSection(
    tierIndex: number,
    tierDef: TalentTierDef,
    tierState: TierTalentState,
    talentState: ClassTalentState,
    multiTier: boolean,
  ): HTMLElement {
    const statCells = tierDef.statRow.map((statTalent) => {
      const rank = tierState.statRanks[statTalent.id] ?? 0;
      return renderStatCell(statTalent, rank);
    });

    const abilityCells = tierDef.abilityRow.map((abilityId) => {
      const ability = content.abilities.find((entry) => entry.id === abilityId);
      const chosen = tierState.abilityTalentId === abilityId;
      return renderAbilityCell(
        abilityId,
        ability?.name ?? abilityId,
        ability?.iconKey ?? abilityId,
        chosen,
      );
    });

    const statPointsInTier = totalStatPoints(tierState.statRanks);
    const tierChildren: HTMLElement[] = [];

    if (multiTier) {
      tierChildren.push(
        el("h3", {
          class: "talent-tier-title",
          text: `Talent Tier ${tierIndex + 1}`,
        }),
      );
    }

    if (tierIndex > 0 && !isTalentTierUnlocked(talentState, tierIndex)) {
      tierChildren.push(
        el("p", {
          class: "talent-tier-gate-note",
          data: { talentTierGate: "true" },
          text: "Spend 6 points in Talent Tier 1 to unlock Talent Tier 2",
        }),
      );
    }

    tierChildren.push(
      el("h4", { class: "talent-row-title", text: "Stat Row" }),
      el("div", { class: "talent-stat-row" }, statCells),
      el("h4", { class: "talent-row-title", text: "Ability Row" }),
      el("p", {
        class: "talent-gate-note",
        text:
          statPointsInTier >= 5
            ? "Ability Row unlocked"
            : "Spend 5 Stat Row points to unlock the Ability Row",
      }),
      el("div", { class: "talent-ability-row" }, abilityCells),
    );

    return el(
      "section",
      {
        class: "talent-tier-section",
        data: { talentTier: String(tierIndex + 1) },
      },
      tierChildren,
    );
  }

  shell = mountSurfaceShell(root, "talents-surface", {
    reconcile: true,
    title: "Talents",
    selection: true,
    body(snapshot, legality) {
      const classId = options.getSelectedClassId()!;

      const classKit = classKitFor(content, classId);
      const talentState = effectiveTalentState(snapshot, classId);
      const tierDefs = talentTierDefs(classKit);
      const level = levelFor(snapshot, content, classId);
      const hasPending = snapshot.pendingEdits.some(
        (edit) => edit.kind === "talent" && edit.classId === classId,
      );
      const points = availableTalentPoints(snapshot, classId, content);

      const knownIds = new Set<string>(
        tierDefs.flatMap((tierDef) => [
          ...tierDef.statRow.map((talent) => talent.id),
          ...tierDef.abilityRow,
        ]),
      );
      const selectedTalentId = shell.getSelection();
      if (selectedTalentId !== null && !knownIds.has(selectedTalentId)) {
        shell.setSelection(null);
      }
      const activeSelection = shell.getSelection();

      const multiTier = tierDefs.length > 1;
      const tierSections = tierDefs.map((tierDef, tierIndex) =>
        renderTalentTierSection(
          tierIndex,
          tierDef,
          talentState.tierStates[tierIndex]!,
          talentState,
          multiTier,
        ),
      );

      const grid = el("div", { class: "talent-grid" }, tierSections);

      const detail = el("aside", {
        class: "talent-detail",
        data: { talentDetail: "true" },
        aria: { label: "Talent detail" },
      });

      if (activeSelection === null) {
        detail.append(
          el("p", {
            class: "surface-empty",
            text: "Select a Talent",
          }),
        );
      } else {
        const statTalent = tierDefs
          .flatMap((tierDef) => tierDef.statRow)
          .find((talent) => talent.id === activeSelection);
        if (statTalent) {
          let rank = 0;
          for (const tier of talentState.tierStates) {
            if (statTalent.id in tier.statRanks) {
              rank = tier.statRanks[statTalent.id] ?? 0;
              break;
            }
          }
          for (const child of renderStatDetail(classId, statTalent, rank, legality)) {
            detail.append(child);
          }
        } else {
          const abilityId = activeSelection;
          const ability = content.abilities.find((entry) => entry.id === abilityId);
          const chosenTier = talentState.tierStates.find(
            (tier) => tier.abilityTalentId === abilityId,
          );
          const chosen = chosenTier !== undefined;
          for (const child of renderAbilityDetail(
            snapshot,
            classId,
            abilityId,
            ability?.name ?? abilityId,
            chosen,
            legality,
          )) {
            detail.append(child);
          }
        }
      }

      const sectionChildren: (HTMLElement | null)[] = [
        el("h3", {
          class: "surface-section-title",
          text: `${CLASS_LABELS[classId]} · Level ${level}`,
        }),
        el("p", {
          class: "talent-points",
          data: { talentPoints: "true" },
          text: `${points} Talent Point${points === 1 ? "" : "s"} available`,
        }),
      ];

      if (hasPending) {
        const marker = pendingMarker();
        marker.dataset["pendingKind"] = "talent";
        sectionChildren.push(marker);
      }

      sectionChildren.push(
        el("div", { class: "talent-panes" }, [grid, detail]),
      );

      return [
        el("section", { class: "talents-character", data: { classId } }, sectionChildren),
      ];
    },
  });

  return {
    render(snapshot, legality = EMPTY_ENGINE_LEGALITY) {
      shell.render(snapshot, legality);
    },
    destroy: () => shell.destroy(),
  };
}

export { availableTalentPoints };
