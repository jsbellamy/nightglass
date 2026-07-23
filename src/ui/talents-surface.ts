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
import { mountMechanicalPopoverController } from "./mechanical-popover";

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

function statCascadeBlockedMessage(
  talentState: ClassTalentState,
  tierIndex: number,
  talentId: string,
  legality: EngineLegalityView,
  classId: ClassId,
): string | null {
  const tierState = talentState.tierStates[tierIndex];
  if (!tierState) {
    return null;
  }
  const rank = tierState.statRanks[talentId] ?? 0;
  if (rank <= 0 || legality.canDeallocateTalent(classId, talentId)) {
    return null;
  }
  for (let laterTier = tierIndex + 1; laterTier < talentState.tierStates.length; laterTier += 1) {
    const later = talentState.tierStates[laterTier];
    if (later && spentInTier(later) > 0) {
      return `Clear all Talent Tier ${laterTier + 1} points before reducing Talent Tier ${tierIndex + 1}`;
    }
  }
  if (
    tierState.abilityTalentId &&
    totalStatPoints(tierState.statRanks) <= 5
  ) {
    return "Remove the Ability Talent before reducing the Stat Row below five points";
  }
  return null;
}

export function mountTalentsSurface(
  root: HTMLElement,
  options: TalentsSurfaceOptions,
): TalentsSurface {
  const { content } = options;
  let shell!: ReturnType<typeof mountSurfaceShell>;
  let openPopoverTalentId: string | null = null;
  let openPopoverFill: (() => string) | null = null;

  const detailPopover = el("div", {
    class: "talent-detail-popover",
    data: { talentPopover: "true", surfaceRetain: "true" },
    props: { hidden: true },
  });
  detailPopover.style.pointerEvents = "none";
  detailPopover.tabIndex = -1;

  const popoverController = mountMechanicalPopoverController({
    popover: detailPopover,
    bounds: root,
  });

  const treeHost = el("div", {
    class: "talent-tree-host",
    data: { surfaceRetain: "true" },
  });
  treeHost.append(detailPopover);

  function hideDetailPopover(): void {
    popoverController.hide();
    detailPopover.replaceChildren();
    delete detailPopover.dataset["talentId"];
    openPopoverTalentId = null;
    openPopoverFill = null;
    for (const node of root.querySelectorAll<HTMLElement>("[aria-describedby^='talent-desc-']")) {
      node.removeAttribute("aria-describedby");
    }
  }

  function popoverDescribedByTarget(group: HTMLElement): HTMLElement | null {
    return (
      group.querySelector<HTMLElement>(".talent-cell") ??
      group.querySelector<HTMLElement>("[data-talent-action]")
    );
  }

  function fillStatPopover(statTalent: StatTalentDef, rank: number): string {
    const descId = `talent-desc-${statTalent.id}`;
    detailPopover.replaceChildren();
    detailPopover.id = descId;
    detailPopover.append(
      el("p", { class: "talent-popover-name", text: statTalent.name }),
      el("p", {
        class: "talent-popover-rank",
        text: `${rank} of ${statTalent.maxRanks} ranks`,
      }),
      el("p", {
        class: "talent-per-rank",
        text: `${formatStatModifierPerRank(statTalent.perRank)} per rank`,
      }),
    );
    const delta = formatStatTalentDelta(statTalent.perRank, rank);
    if (delta) {
      detailPopover.append(
        el("p", { class: "talent-stat-delta", data: { statDelta: "true" }, text: delta }),
      );
    }
    return descId;
  }

  function fillAbilityPopover(
    snapshot: ReadonlySnapshot,
    classId: ClassId,
    abilityId: string,
    abilityName: string,
    chosen: boolean,
    warnings: string[],
  ): string {
    const descId = `talent-desc-${abilityId}`;
    const ability = content.abilities.find((entry) => entry.id === abilityId);
    const stats = characterStatsFor(snapshot, content, classId);
    detailPopover.replaceChildren();
    detailPopover.id = descId;
    detailPopover.append(el("p", { class: "talent-popover-name", text: abilityName }));
    if (ability) {
      detailPopover.append(
        el("p", {
          class: "ability-description",
          data: { abilityDescription: "true" },
          text: formatAbilityDescription(ability, stats, content.statuses),
        }),
      );
    }
    if (chosen && abilityTalentSlotted(snapshot, classId, abilityId)) {
      detailPopover.append(
        el("p", {
          class: "talent-loadout-warning",
          data: { loadoutWarning: "true" },
          text: "Slotted in Loadout — removing this talent will replace it there",
        }),
      );
    }
    for (const warning of warnings) {
      detailPopover.append(
        el("p", {
          class: "talent-tile-warning",
          data: { talentCascadeBlocked: "true" },
          text: warning,
        }),
      );
    }
    return descId;
  }

  function showPopoverForGroup(
    group: HTMLElement,
    fill: () => string,
    talentId: string,
  ): void {
    detailPopover.dataset["talentId"] = talentId;
    openPopoverTalentId = talentId;
    openPopoverFill = fill;
    const descId = fill();
    const focusTarget = popoverDescribedByTarget(group);
    focusTarget?.setAttribute("aria-describedby", descId);
    popoverController.show(group);
  }

  function bindTalentPopover(
    group: HTMLElement,
    talentId: string,
    fill: () => string,
  ): void {
    const open = () => {
      showPopoverForGroup(group, fill, talentId);
    };
    const maybeClose = () => {
      if (group.matches(":hover") || group.contains(document.activeElement)) {
        return;
      }
      if (detailPopover.dataset["talentId"] === talentId) {
        hideDetailPopover();
      }
    };
    group.addEventListener("mouseenter", open);
    group.addEventListener("mouseleave", maybeClose);
    group.addEventListener("focusin", open);
    group.addEventListener("focusout", maybeClose);
    if (openPopoverTalentId === talentId) {
      openPopoverFill = fill;
    }
  }

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

  function renderActionButton(
    classId: ClassId,
    talentId: string,
    action: "allocate" | "deallocate",
    label: string,
    disabled: boolean,
  ): HTMLButtonElement {
    const button = el("button", {
      class: "talent-tile-action focus-ring",
      data: {
        talentAction: action,
        talentId,
        classId,
      },
      props: { type: "button", disabled },
      text: action === "allocate" ? "+" : "−",
      aria: { label: label },
    });
    bindPressable(button, () => {
      options.onCommand?.({
        cmd: action === "allocate" ? "allocateTalent" : "deallocateTalent",
        args: [classId, talentId],
      });
    });
    return button;
  }

  function renderStatTile(
    snapshot: ReadonlySnapshot,
    classId: ClassId,
    tierIndex: number,
    statTalent: StatTalentDef,
    rank: number,
    talentState: ClassTalentState,
    tierLocked: boolean,
    legality: EngineLegalityView,
  ): HTMLElement {
    const canAllocate = !tierLocked && legality.canAllocateTalent(classId, statTalent.id);
    const canDeallocate = !tierLocked && legality.canDeallocateTalent(classId, statTalent.id);
    const cascadeMessage = statCascadeBlockedMessage(
      talentState,
      tierIndex,
      statTalent.id,
      legality,
      classId,
    );

    const info = el("button", {
      class: "talent-cell talent-cell--stat-face focus-ring",
      data: { talentId: statTalent.id },
      props: { type: "button", disabled: tierLocked, tabIndex: tierLocked ? -1 : 0 },
      aria: {
        label: `${statTalent.name}, ${rank} of ${statTalent.maxRanks} ranks`,
      },
    });
    appendTalentCellIcon(info, statTalent.iconKey, statTalent.name);

    const minus = renderActionButton(
      classId,
      statTalent.id,
      "deallocate",
      `Remove one rank from ${statTalent.name}`,
      !canDeallocate,
    );
    minus.classList.add("talent-stepper-btn", "talent-stepper-btn--minus");
    const plus = renderActionButton(
      classId,
      statTalent.id,
      "allocate",
      `Add one rank to ${statTalent.name}`,
      !canAllocate,
    );
    plus.classList.add("talent-stepper-btn", "talent-stepper-btn--plus");

    const stepper = el("div", {
      class: "talent-rank-stepper",
      data: { talentRankStepper: "true" },
    }, [
      minus,
      el("span", {
        class: "talent-rank-stepper-value",
        text: `${rank}/${statTalent.maxRanks}`,
        aria: { hidden: "true" },
      }),
      plus,
    ]);

    const group = el("div", {
      class: "talent-tile talent-stat-compact",
      data: { talentGroup: "true", talentId: statTalent.id },
    }, [
      el("div", { class: "talent-stat-compact-row" }, [
        info,
        el("div", { class: "talent-stat-compact-text" }, [
          el("span", { class: "talent-name", text: statTalent.name }),
          el("span", {
            class: "talent-stat-per-rank-summary",
            text: formatStatModifierPerRank(statTalent.perRank),
          }),
        ]),
        stepper,
      ]),
    ]);

    group.setAttribute("role", "group");

    if (cascadeMessage) {
      group.append(
        el("p", {
          class: "talent-tile-warning",
          data: { talentCascadeBlocked: "true" },
          text: cascadeMessage,
        }),
      );
    } else if (!canAllocate && rank < statTalent.maxRanks && !tierLocked) {
      const points = availableTalentPoints(snapshot, classId, content);
      if (points === 0) {
        group.append(
          el("p", {
            class: "talent-tile-warning",
            data: { talentCascadeBlocked: "true" },
            text: "No Talent Points available",
          }),
        );
      }
    }

    bindTalentPopover(group, statTalent.id, () =>
      fillStatPopover(statTalent, rank),
    );
    return group;
  }

  function renderAbilityTile(
    snapshot: ReadonlySnapshot,
    classId: ClassId,
    tierIndex: number,
    abilityId: string,
    abilityName: string,
    iconKey: string,
    chosen: boolean,
    tierState: TierTalentState,
    talentState: ClassTalentState,
    tierLocked: boolean,
    legality: EngineLegalityView,
  ): HTMLElement {
    const infoClasses = ["talent-cell", "ability-talent-cell", "focus-ring"];
    if (chosen) {
      infoClasses.push("talent-cell--chosen");
    }
    const info = el("button", {
      class: infoClasses.join(" "),
      data: { talentId: abilityId },
      props: { type: "button", disabled: tierLocked, tabIndex: tierLocked ? -1 : 0 },
      aria: { label: abilityName },
    }, [
      el("span", {
        class: chosen ? "talent-ability-mark talent-ability-mark--chosen" : "talent-ability-mark",
        text: chosen ? "✓" : "",
        aria: { hidden: "true" },
      }),
    ]);
    appendTalentCellIcon(info, iconKey, abilityName);

    const warnings: string[] = [];
    const allocateBlocked = !legality.canAllocateTalent(classId, abilityId);
    if (!chosen && allocateBlocked && !tierLocked) {
      if (!isTalentTierUnlocked(talentState, tierIndex)) {
        warnings.push("Allocate all six Talent Tier 1 points to unlock Talent Tier 2");
      } else if (totalStatPoints(tierState.statRanks) < 5) {
        warnings.push("Spend 5 Stat Row points to unlock the Ability Row");
      } else if (availableTalentPoints(snapshot, classId, content) === 0) {
        warnings.push("No Talent Points available");
      }
    }

    const action = chosen
      ? renderActionButton(
          classId,
          abilityId,
          "deallocate",
          `Clear ${abilityName}`,
          !legality.canDeallocateTalent(classId, abilityId),
        )
      : renderActionButton(
          classId,
          abilityId,
          "allocate",
          `Choose ${abilityName}`,
          tierLocked || allocateBlocked,
        );
    action.classList.add("talent-ability-compact-action");

    const group = el("div", {
      class: "talent-tile talent-tile--ability talent-ability-compact",
      data: { talentGroup: "true", talentId: abilityId },
    }, [
      el("div", { class: "talent-ability-compact-row" }, [
        info,
        el("span", { class: "talent-name", text: abilityName }),
        action,
      ]),
    ]);
    group.setAttribute("role", "group");

    for (const warning of warnings) {
      group.append(
        el("p", {
          class: "talent-tile-warning",
          data: { talentCascadeBlocked: "true" },
          text: warning,
        }),
      );
    }

    bindTalentPopover(group, abilityId, () =>
      fillAbilityPopover(snapshot, classId, abilityId, abilityName, chosen, warnings),
    );
    return group;
  }

  function renderTalentTierSection(
    snapshot: ReadonlySnapshot,
    classId: ClassId,
    tierIndex: number,
    tierDef: TalentTierDef,
    tierState: TierTalentState,
    talentState: ClassTalentState,
    multiTier: boolean,
    legality: EngineLegalityView,
  ): HTMLElement {
    const tierLocked = !isTalentTierUnlocked(talentState, tierIndex);
    const statTiles = tierDef.statRow.map((statTalent) => {
      const rank = tierState.statRanks[statTalent.id] ?? 0;
      return renderStatTile(
        snapshot,
        classId,
        tierIndex,
        statTalent,
        rank,
        talentState,
        tierLocked,
        legality,
      );
    });

    const abilityTiles = tierDef.abilityRow.map((abilityId) => {
      const ability = content.abilities.find((entry) => entry.id === abilityId);
      const chosen = tierState.abilityTalentId === abilityId;
      return renderAbilityTile(
        snapshot,
        classId,
        tierIndex,
        abilityId,
        ability?.name ?? abilityId,
        ability?.iconKey ?? abilityId,
        chosen,
        tierState,
        talentState,
        tierLocked,
        legality,
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

    if (tierIndex > 0 && tierLocked) {
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
      el("div", { class: "talent-stat-row" }, statTiles),
      el("h4", { class: "talent-row-title", text: "Ability Row" }),
      el("p", {
        class: "talent-gate-note",
        text:
          statPointsInTier >= 5
            ? "Ability Row unlocked"
            : "Spend 5 Stat Row points to unlock the Ability Row",
      }),
      el("div", { class: "talent-ability-row" }, abilityTiles),
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

      const multiTier = tierDefs.length > 1;
      const tierSections = tierDefs.map((tierDef, tierIndex) =>
        renderTalentTierSection(
          snapshot,
          classId,
          tierIndex,
          tierDef,
          talentState.tierStates[tierIndex]!,
          talentState,
          multiTier,
          legality,
        ),
      );

      const scroll =
        treeHost.querySelector<HTMLElement>(".talent-tree-scroll") ??
        el("div", { class: "talent-tree-scroll" });
      scroll.replaceChildren(...tierSections);
      if (!scroll.parentElement) {
        treeHost.replaceChildren(detailPopover, scroll);
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

      sectionChildren.push(treeHost);

      return [
        el("section", { class: "talents-character", data: { classId } }, sectionChildren),
      ];
    },
  });

  return {
    render(snapshot, legality = EMPTY_ENGINE_LEGALITY) {
      shell.render(snapshot, legality);
      if (!openPopoverTalentId || !snapshot || !openPopoverFill) {
        return;
      }
      const group = root.querySelector<HTMLElement>(
        `[data-talent-group="true"][data-talent-id="${openPopoverTalentId}"]`,
      );
      if (!group) {
        hideDetailPopover();
        return;
      }
      detailPopover.dataset["talentId"] = openPopoverTalentId;
      const descId = openPopoverFill();
      popoverDescribedByTarget(group)?.setAttribute("aria-describedby", descId);
      popoverController.show(group);
    },
    destroy: () => {
      hideDetailPopover();
      popoverController.destroy();
      shell.destroy();
    },
  };
}

export { availableTalentPoints };
