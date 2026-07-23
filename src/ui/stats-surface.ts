import type { ReadonlySnapshot } from "../core/snapshot";
import {
  characterStatBreakdown,
  statsDifferFromCommittedCombat,
  type CharacterStatBreakdownLine,
  type ModifierContribution,
} from "../core/stat-breakdown";
import { levelFromXp } from "../core/xp";
import type { ClassId, Content } from "../core/types";
import type { EngineLegalityView } from "./engine-legality";
import { EMPTY_ENGINE_LEGALITY } from "./engine-legality";
import { CLASS_LABELS, effectiveTalentState, levelFor, spentTalentPoints } from "./snapshot-view";
import { el, mountSurfaceShell, pendingMarker } from "./surface-shell";

export interface StatsSurface {
  render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void;
  destroy(): void;
}

export interface StatsSurfaceOptions {
  content: Content;
  /** The Character the picker has selected. Read at render time, not mount time. */
  getSelectedClassId(): ClassId | null;
}

function formatSignedFlat(value: number): string {
  if (value === 0) {
    return "+0";
  }
  return value > 0 ? `+${value}` : String(value);
}

function formatSignedPercent(decimal: number): string {
  const percent = Math.round(decimal * 100);
  if (percent === 0) {
    return "+0%";
  }
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}

function formatSourceContribution(
  label: "Base" | "Equip" | "Talent",
  contribution: ModifierContribution | number,
): string | null {
  if (typeof contribution === "number") {
    return `${label} ${contribution}`;
  }
  const parts: string[] = [];
  if (contribution.flat !== 0) {
    parts.push(`${formatSignedFlat(contribution.flat)} flat`);
  }
  if (contribution.percent !== 0) {
    parts.push(formatSignedPercent(contribution.percent));
  }
  if (parts.length === 0) {
    return null;
  }
  return `${label} ${parts.join(" ")}`;
}

export function formatStatSourceLine(line: CharacterStatBreakdownLine): string {
  const segments = [
    formatSourceContribution("Base", line.base),
    formatSourceContribution("Equip", line.equipment),
    formatSourceContribution("Talent", line.talents),
  ].filter((segment): segment is string => segment !== null);
  return segments.join(" · ");
}

function characterXpLabel(
  snapshot: ReadonlySnapshot,
  content: Content,
  classId: ClassId,
): string {
  const xp = snapshot.progression.characterXp[classId] ?? 0;
  const thresholds = content.xpThresholds;
  const level = levelFromXp(xp, thresholds);
  if (level >= thresholds.length) {
    return "Max Level";
  }
  const ceiling = thresholds[level]!;
  return `${xp} / ${ceiling} XP toward Level ${level + 1}`;
}

function renderStatRow(line: CharacterStatBreakdownLine): HTMLElement {
  return el(
    "div",
    {
      class: "stats-row",
      data: { statKey: line.key },
    },
    [
      el("div", { class: "stats-row-heading" }, [
        el("span", { class: "stats-label", text: line.label }),
        el("span", { class: "stats-total", data: { statTotal: "true" }, text: String(line.total) }),
      ]),
      el("p", {
        class: "stats-sources",
        data: { statSources: "true" },
        text: formatStatSourceLine(line),
      }),
    ],
  );
}

export function mountStatsSurface(root: HTMLElement, options: StatsSurfaceOptions): StatsSurface {
  const { content } = options;

  const shell = mountSurfaceShell(root, "stats-surface", {
    reconcile: true,
    title: "Stats",
    body(snapshot) {
      const classId = options.getSelectedClassId()!;
      const level = levelFor(snapshot, content, classId);
      const talentState = effectiveTalentState(snapshot, classId);
      const points = Math.max(0, level - spentTalentPoints(talentState));
      const lines = characterStatBreakdown(snapshot, content, classId);
      const showPending = statsDifferFromCommittedCombat(snapshot, content, classId);

      const sectionChildren: HTMLElement[] = [
        el("h3", {
          class: "surface-section-title",
          text: `${CLASS_LABELS[classId]} · Level ${level}`,
        }),
        el("p", {
          class: "stats-xp",
          data: { statsXp: "true" },
          text: characterXpLabel(snapshot, content, classId),
        }),
        el("p", {
          class: "stats-talent-points",
          data: { statsTalentPoints: "true" },
          text: `${points} Talent Point${points === 1 ? "" : "s"} available`,
        }),
      ];

      if (showPending) {
        const marker = pendingMarker();
        marker.dataset["pendingKind"] = "stats";
        sectionChildren.push(marker);
      }

      sectionChildren.push(
        el("div", { class: "stats-table", data: { statsTable: "true" } }, lines.map(renderStatRow)),
      );

      return [el("section", { class: "stats-character", data: { classId } }, sectionChildren)];
    },
  });

  return {
    render(snapshot, legality = EMPTY_ENGINE_LEGALITY) {
      shell.render(snapshot, legality);
    },
    destroy: () => shell.destroy(),
  };
}
