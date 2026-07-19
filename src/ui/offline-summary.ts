import type { EngineEvent } from "../core/events";
import type { DropInstance, Snapshot } from "../core/snapshot";
import type { ClassId, Content } from "../core/types";
import { levelFromXp } from "../core/xp";

export interface OfflineDropSummary {
  dropId: number;
  label: string;
  unseen: boolean;
}

export interface OfflineCharacterGain {
  classId: ClassId;
  xpGained: number;
  levelsGained: number;
  levelAfter: number;
}

export interface OfflineSummary {
  awayMs: number;
  capped: boolean;
  stagesCleared: number;
  characterGains: OfflineCharacterGain[];
  drops: OfflineDropSummary[];
}

export function summarizeOfflineProgress(
  events: EngineEvent[],
  before: Snapshot,
  after: Snapshot,
  content: Content,
  awayMs: number,
  capped: boolean,
): OfflineSummary {
  const stagesCleared = events.filter((event) => event.type === "stage-cleared").length;
  const basesById = new Map(content.equipmentBases.map((base) => [base.id, base.name]));

  const beforeDropIds = new Set(before.progression.armory.map((drop) => drop.dropId));
  const newDrops = after.progression.armory.filter((drop) => !beforeDropIds.has(drop.dropId));

  const characterGains: OfflineCharacterGain[] = content.classes.map((classKit) => {
    const classId = classKit.id;
    const xpBefore = before.progression.characterXp[classId] ?? 0;
    const xpAfter = after.progression.characterXp[classId] ?? 0;
    const levelBefore = levelFromXp(xpBefore, content.xpThresholds);
    const levelAfter = levelFromXp(xpAfter, content.xpThresholds);
    return {
      classId,
      xpGained: xpAfter - xpBefore,
      levelsGained: levelAfter - levelBefore,
      levelAfter,
    };
  });

  return {
    awayMs,
    capped,
    stagesCleared,
    characterGains: characterGains.filter((gain) => gain.xpGained > 0 || gain.levelsGained > 0),
    drops: newDrops.map((drop) => dropSummary(drop, basesById)),
  };
}

function dropSummary(
  drop: DropInstance,
  basesById: Map<string, string>,
): OfflineDropSummary {
  const name = basesById.get(drop.baseId) ?? drop.baseId;
  return {
    dropId: drop.dropId,
    label: `${name} (i${drop.itemLevel})`,
    unseen: !drop.seen,
  };
}

export function formatAwayDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export interface OfflineSummaryMount {
  dismiss(): void;
}

export function mountOfflineSummary(
  root: HTMLElement,
  summary: OfflineSummary,
): OfflineSummaryMount {
  const overlay = document.createElement("div");
  overlay.className = "offline-summary";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Offline progress");

  const card = document.createElement("div");
  card.className = "offline-summary-card";

  const title = document.createElement("h2");
  title.className = "offline-summary-title";
  title.textContent = "While you were away";

  const duration = document.createElement("p");
  duration.className = "offline-summary-duration";
  duration.textContent = `${formatAwayDuration(summary.awayMs)}${
    summary.capped ? " (capped)" : ""
  }`;

  const stats = document.createElement("dl");
  stats.className = "offline-summary-stats";

  const stageRow = document.createElement("div");
  stageRow.className = "offline-summary-row";
  stageRow.innerHTML = `<dt>Stages cleared</dt><dd>${summary.stagesCleared}</dd>`;
  stats.append(stageRow);

  for (const gain of summary.characterGains) {
    const row = document.createElement("div");
    row.className = "offline-summary-row";
    const levelText =
      gain.levelsGained > 0
        ? `+${gain.xpGained} XP, +${gain.levelsGained} Level → ${gain.levelAfter}`
        : `+${gain.xpGained} XP`;
    row.innerHTML = `<dt>${gain.classId}</dt><dd>${levelText}</dd>`;
    stats.append(row);
  }

  card.append(title, duration, stats);

  if (summary.drops.length > 0) {
    const dropsHeading = document.createElement("h3");
    dropsHeading.className = "offline-summary-drops-title";
    dropsHeading.textContent = "Drops";
    card.append(dropsHeading);

    const dropList = document.createElement("ul");
    dropList.className = "offline-summary-drops";
    for (const drop of summary.drops) {
      const item = document.createElement("li");
      const chip = document.createElement("span");
      chip.className = "offline-summary-drop-chip";
      if (drop.unseen) {
        chip.classList.add("offline-summary-drop-chip--unseen");
        chip.setAttribute("data-unseen", "true");
      }
      chip.textContent = drop.label;
      item.append(chip);
      dropList.append(item);
    }
    card.append(dropList);
  }

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "offline-summary-dismiss";
  dismiss.textContent = "Continue";

  card.append(dismiss);
  overlay.append(card);
  root.append(overlay);

  function dismissCard(): void {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      dismissCard();
    }
  }

  dismiss.addEventListener("click", dismissCard);
  document.addEventListener("keydown", onKeyDown);
  dismiss.focus();

  return { dismiss: dismissCard };
}
