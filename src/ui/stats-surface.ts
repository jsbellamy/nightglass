import type { ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content } from "../core/types";
import type { EngineLegalityView } from "./engine-legality";
import { EMPTY_ENGINE_LEGALITY } from "./engine-legality";
import {
  characterStatBreakdown,
  characterXpProgressLabel,
  statsDifferFromCommittedCombat,
  type CharacterStatBreakdownLine,
  type CharacterStatKey,
  type ModifierContribution,
} from "./snapshot-view";
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

const STAT_GROUPS: ReadonlyArray<{
  id: "vitals" | "offense" | "defense";
  heading: string;
  keys: readonly CharacterStatKey[];
}> = [
  { id: "vitals", heading: "Vitals", keys: ["maxHealth"] },
  { id: "offense", heading: "Offense", keys: ["physical", "elemental"] },
  { id: "defense", heading: "Defense", keys: ["armor", "elementalResistance"] },
];

function renderStatGroup(
  group: (typeof STAT_GROUPS)[number],
  linesByKey: Map<CharacterStatKey, CharacterStatBreakdownLine>,
): HTMLElement {
  const rows = group.keys.map((key) => {
    const line = linesByKey.get(key);
    if (!line) {
      throw new Error(`missing stat line for ${key}`);
    }
    return renderStatRow(line);
  });
  return el("section", { class: "stats-group", data: { statsGroup: group.id } }, [
    el("h4", { class: "stats-group-heading", text: group.heading }),
    el("div", { class: "stats-group-cards" }, rows),
  ]);
}

export function mountStatsSurface(root: HTMLElement, options: StatsSurfaceOptions): StatsSurface {
  const { content } = options;

  const shell = mountSurfaceShell(root, "stats-surface", {
    reconcile: true,
    title: "Stats",
    body(snapshot) {
      const classId = options.getSelectedClassId()!;
      const lines = characterStatBreakdown(snapshot, content, classId);
      const linesByKey = new Map(lines.map((line) => [line.key, line]));
      const showPending = statsDifferFromCommittedCombat(snapshot, content, classId);
      const xpLabel = characterXpProgressLabel(snapshot, content, classId);

      const sectionChildren: HTMLElement[] = [
        el("div", { class: "stats-overview", data: { statsOverview: "true" } }, [
          el("p", { class: "stats-overview-line stats-xp", data: { statsXp: "true" }, text: xpLabel }),
        ]),
      ];

      if (showPending) {
        const marker = pendingMarker();
        marker.dataset["pendingKind"] = "stats";
        sectionChildren.push(marker);
      }

      sectionChildren.push(
        el(
          "div",
          { class: "stats-sheet", data: { statsTable: "true" } },
          STAT_GROUPS.map((group) => renderStatGroup(group, linesByKey)),
        ),
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
