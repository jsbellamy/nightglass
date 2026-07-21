import type { ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content } from "../core/types";
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

function renderRankPips(container: HTMLElement, rank: number, maxRanks: number): void {
  const pipNodes = [];
  for (let index = 0; index < maxRanks; index += 1) {
    pipNodes.push(
      el("span", {
        class: index < rank ? "talent-pip filled" : "talent-pip",
        text: index < rank ? "●" : "○",
      }),
    );
  }
  container.append(
    el("div", {
      class: "talent-rank-pips",
      aria: { label: `${rank} of ${maxRanks} ranks` },
    }, pipNodes),
  );
}

export function mountTalentsSurface(
  root: HTMLElement,
  options: TalentsSurfaceOptions,
): TalentsSurface {
  const { content } = options;
  let currentLegality: EngineLegalityView;

  const shell = mountSurfaceShell(root, "talents-surface", {
    title: "Talents",
    body(snapshot) {
      const legality = currentLegality;
      const classId = options.getSelectedClassId()!;
      const classKit = classKitFor(content, classId);
      const talentState = effectiveTalentState(snapshot, classId);
      const level = levelFor(snapshot, content, classId);
      const hasPending = snapshot.pendingEdits.some(
        (edit) => edit.kind === "talent" && edit.classId === classId,
      );
      const points = availableTalentPoints(snapshot, classId, content);

      const statCards = classKit.talents.statRow.map((statTalent) => {
        const rank = talentState.statRanks[statTalent.id] ?? 0;
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

        const card = el("article", { class: "talent-card", data: { talentId: statTalent.id } }, [
          el("p", { class: "talent-name", text: statTalent.name }),
          el("p", {
            class: "talent-per-rank",
            text: `${formatStatModifierPerRank(statTalent.perRank)} per rank`,
          }),
          delta
            ? el("p", { class: "talent-stat-delta", data: { statDelta: "true" }, text: delta })
            : null,
        ]);

        renderRankPips(card, rank, statTalent.maxRanks);
        card.append(el("div", { class: "talent-controls" }, [allocate, deallocate]));
        return card;
      });

      const abilityCards = classKit.talents.abilityRow.map((abilityId) => {
        const ability = content.abilities.find((entry) => entry.id === abilityId);
        const selected = talentState.abilityTalentId === abilityId;

        const controls = el("div", { class: "talent-controls" });
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
          controls.append(pick);
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
          controls.append(remove);
        }

        return el("article", {
          class: "talent-card ability-talent-card",
          data: { talentId: abilityId },
        }, [
          el("p", { class: "talent-name", text: ability?.name ?? abilityId }),
          selected && abilityTalentSlotted(snapshot, classId, abilityId)
            ? el("p", {
                class: "talent-loadout-warning",
                data: { loadoutWarning: "true" },
                text: "Slotted in Loadout — removing this talent will replace it there",
              })
            : null,
          controls,
        ]);
      });

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
        el("h4", { class: "talent-row-title", text: "Stat Row" }),
        el("div", { class: "talent-stat-row" }, statCards),
        el("h4", { class: "talent-row-title", text: "Ability Row" }),
        el("p", {
          class: "talent-gate-note",
          text:
            totalStatPoints(talentState.statRanks) >= 5
              ? "Ability Row unlocked"
              : "Spend 5 Stat Row points to unlock the Ability Row",
        }),
        el("div", { class: "talent-ability-row" }, abilityCards),
      );

      return [
        el("section", { class: "talents-character", data: { classId } }, sectionChildren),
      ];
    },
  });

  return {
    render(snapshot, legality) {
      currentLegality = legality;
      shell.render(snapshot);
    },
    destroy: () => shell.destroy(),
  };
}

export { availableTalentPoints };
