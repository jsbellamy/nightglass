import type { ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content, StatTalentDef } from "../core/types";
import {
  formatStatModifierPerRank,
  formatStatTalentDelta,
} from "./ability-format";
import type { TileCommand } from "./bus";
import type { EngineLegalityView } from "./engine-legality";
import { bindPressable } from "./keyboard";
import {
  CLASS_LABELS,
  classKitFor,
  effectiveLoadout,
  effectiveTalentState,
  levelFor,
} from "./snapshot-view";
import { el, mountSurfaceShell, pendingMarker } from "./surface-shell";

export interface TalentsSurface {
  render(snapshot: ReadonlySnapshot | null, legality: EngineLegalityView): void;
  destroy(): void;
}

export interface TalentsSurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
  /** The Character the picker has selected. Read at render time, not mount time. */
  getSelectedClassId(): ClassId | null;
}

function totalStatPoints(statRanks: Record<string, number>): number {
  return Object.values(statRanks).reduce((sum, rank) => sum + rank, 0);
}

function spentTalentPoints(talentState: ReturnType<typeof effectiveTalentState>): number {
  return totalStatPoints(talentState.statRanks) + (talentState.abilityTalentId ? 1 : 0);
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
  let currentLegality: EngineLegalityView;
  let lastSnapshot: ReadonlySnapshot | null = null;
  let selectedTalentId: string | null = null;
  let lastClassId: ClassId | null = null;

  function rerender(): void {
    if (lastSnapshot) {
      shell.render(lastSnapshot);
    }
  }

  function selectTalent(talentId: string): void {
    selectedTalentId = talentId;
    rerender();
  }

  function renderStatCell(statTalent: StatTalentDef, rank: number): HTMLElement {
    const selected = selectedTalentId === statTalent.id;
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
    bindPressable(cell, () => {
      selectTalent(statTalent.id);
    });
    cell.addEventListener("focus", () => {
      if (selectedTalentId === statTalent.id) {
        return;
      }
      selectTalent(statTalent.id);
      root
        .querySelector<HTMLElement>(`.talent-cell[data-talent-id="${statTalent.id}"]`)
        ?.focus();
    });
    return cell;
  }

  function renderAbilityCell(
    abilityId: string,
    abilityName: string,
    chosen: boolean,
  ): HTMLElement {
    const selected = selectedTalentId === abilityId;
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
    bindPressable(cell, () => {
      selectTalent(abilityId);
    });
    cell.addEventListener("focus", () => {
      if (selectedTalentId === abilityId) {
        return;
      }
      selectTalent(abilityId);
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
    const children: HTMLElement[] = [
      el("p", { class: "talent-name", text: abilityName }),
    ];

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

  const shell = mountSurfaceShell(root, "talents-surface", {
    title: "Talents",
    body(snapshot) {
      const legality = currentLegality;
      const classId = options.getSelectedClassId()!;
      if (lastClassId !== null && lastClassId !== classId) {
        selectedTalentId = null;
      }
      lastClassId = classId;

      const classKit = classKitFor(content, classId);
      const talentState = effectiveTalentState(snapshot, classId);
      const level = levelFor(snapshot, content, classId);
      const hasPending = snapshot.pendingEdits.some(
        (edit) => edit.kind === "talent" && edit.classId === classId,
      );
      const points = availableTalentPoints(snapshot, classId, content);

      const knownIds = new Set<string>([
        ...classKit.talents.statRow.map((talent) => talent.id),
        ...classKit.talents.abilityRow,
      ]);
      if (selectedTalentId !== null && !knownIds.has(selectedTalentId)) {
        selectedTalentId = null;
      }

      const statCells = classKit.talents.statRow.map((statTalent) => {
        const rank = talentState.statRanks[statTalent.id] ?? 0;
        return renderStatCell(statTalent, rank);
      });

      const abilityCells = classKit.talents.abilityRow.map((abilityId) => {
        const ability = content.abilities.find((entry) => entry.id === abilityId);
        const chosen = talentState.abilityTalentId === abilityId;
        return renderAbilityCell(abilityId, ability?.name ?? abilityId, chosen);
      });

      const grid = el("div", { class: "talent-grid" }, [
        el("h4", { class: "talent-row-title", text: "Stat Row" }),
        el("div", { class: "talent-stat-row" }, statCells),
        el("h4", { class: "talent-row-title", text: "Ability Row" }),
        el("p", {
          class: "talent-gate-note",
          text:
            totalStatPoints(talentState.statRanks) >= 5
              ? "Ability Row unlocked"
              : "Spend 5 Stat Row points to unlock the Ability Row",
        }),
        el("div", { class: "talent-ability-row" }, abilityCells),
      ]);

      const detail = el("aside", {
        class: "talent-detail",
        data: { talentDetail: "true" },
        aria: { label: "Talent detail" },
      });

      if (selectedTalentId === null) {
        detail.append(
          el("p", {
            class: "surface-empty",
            text: "Select a Talent",
          }),
        );
      } else {
        const statTalent = classKit.talents.statRow.find(
          (talent) => talent.id === selectedTalentId,
        );
        if (statTalent) {
          const rank = talentState.statRanks[statTalent.id] ?? 0;
          for (const child of renderStatDetail(classId, statTalent, rank, legality)) {
            detail.append(child);
          }
        } else {
          const abilityId = selectedTalentId;
          const ability = content.abilities.find((entry) => entry.id === abilityId);
          const chosen = talentState.abilityTalentId === abilityId;
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
    render(snapshot, legality) {
      currentLegality = legality;
      lastSnapshot = snapshot;
      shell.render(snapshot);
    },
    destroy: () => shell.destroy(),
  };
}

export { availableTalentPoints };
