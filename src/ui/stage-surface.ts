import type { Snapshot } from "../core/snapshot";
import type { Content } from "../core/types";
import type { TileCommand } from "./bus";
import { bindPressable } from "./keyboard";

export interface StageSurface {
  render(snapshot: Snapshot | null): void;
  destroy(): void;
}

export interface StageSurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
}

function encounterLabel(encounter: 1 | 2 | 3): string {
  if (encounter === 3) {
    return "Boss";
  }
  return `Wave ${encounter}`;
}

export function mountStageSurface(
  root: HTMLElement,
  options: StageSurfaceOptions,
): StageSurface {
  root.classList.add("stage-surface");
  let pendingStage: 1 | 2 | 3 | null = null;

  function clearConfirm(): void {
    pendingStage = null;
    root.querySelector(".stage-confirm")?.remove();
  }

  function renderConfirm(stageId: 1 | 2 | 3): void {
    clearConfirm();
    const confirm = document.createElement("div");
    confirm.className = "stage-confirm";
    confirm.setAttribute("role", "region");
    confirm.setAttribute("aria-label", "Confirm Stage selection");

    const copy = document.createElement("p");
    copy.className = "stage-confirm-copy";
    copy.textContent =
      "Abandons the current Attempt; earned XP and Drops are kept. Continue?";

    const actions = document.createElement("div");
    actions.className = "stage-confirm-actions";

    const yes = document.createElement("button");
    yes.type = "button";
    yes.className = "stage-confirm-yes focus-ring";
    yes.dataset["stageConfirm"] = "yes";
    yes.textContent = "Confirm";
    bindPressable(yes, () => {
      options.onCommand?.({ cmd: "selectStage", args: [stageId] });
      clearConfirm();
    });

    const no = document.createElement("button");
    no.type = "button";
    no.className = "stage-confirm-no focus-ring";
    no.dataset["stageConfirm"] = "no";
    no.textContent = "Cancel";
    bindPressable(no, () => {
      clearConfirm();
    });

    actions.append(yes, no);
    confirm.append(copy, actions);
    root.append(confirm);
    yes.focus();
  }

  function render(snapshot: Snapshot | null): void {
    const confirmStage = pendingStage;
    root.replaceChildren();
    pendingStage = confirmStage;

    if (!snapshot) {
      const empty = document.createElement("p");
      empty.className = "surface-empty";
      empty.textContent = "No Snapshot yet.";
      root.append(empty);
      return;
    }

    const title = document.createElement("h2");
    title.className = "dock-surface-title";
    title.textContent = "Stage";
    root.append(title);

    const attempt = snapshot.attempt;
    const position = document.createElement("p");
    position.className = "attempt-position";
    if (attempt) {
      position.textContent = `Current Attempt: Stage ${attempt.stage}, ${encounterLabel(
        attempt.encounter,
      )}, ${attempt.phase}`;
    } else {
      position.textContent = "No active Attempt";
    }
    root.append(position);

    const list = document.createElement("div");
    list.className = "stage-list";
    list.setAttribute("role", "list");

    for (const stageDef of options.content.stages) {
      const stageId = stageDef.id;
      const unlocked = stageId <= snapshot.progression.unlockedStage;
      const isCurrent = attempt?.stage === stageId;

      const row = document.createElement("button");
      row.type = "button";
      row.className = "stage-row focus-ring";
      row.dataset["stageId"] = String(stageId);
      row.setAttribute("role", "listitem");
      row.disabled = !unlocked;
      row.setAttribute("aria-disabled", unlocked ? "false" : "true");

      const name = document.createElement("span");
      name.className = "stage-name";
      name.textContent = stageDef.name;

      row.append(name);

      if (!unlocked) {
        const lock = document.createElement("span");
        lock.className = "stage-lock-glyph";
        lock.setAttribute("aria-hidden", "true");
        lock.textContent = "🔒";
        row.append(lock);
      }

      if (isCurrent) {
        const current = document.createElement("span");
        current.className = "stage-current-label";
        current.textContent = "Current";
        row.append(current);
      }

      if (unlocked) {
        bindPressable(row, () => {
          pendingStage = stageId;
          render(snapshot);
        });
      }

      list.append(row);
    }

    root.append(list);

    const policy = document.createElement("section");
    policy.className = "failure-policy";
    policy.setAttribute("aria-label", "Failure Policy");

    const policyTitle = document.createElement("h3");
    policyTitle.className = "surface-section-title";
    policyTitle.textContent = "Failure Policy";
    policy.append(policyTitle);

    const policyCopy = document.createElement("p");
    policyCopy.className = "failure-policy-copy";
    if (attempt?.phase === "defeat-hold") {
      policyCopy.textContent =
        "After Party Defeat, Retry restarts this Stage automatically. Retreat is selecting a lower unlocked Stage.";
    } else {
      policyCopy.textContent =
        "Retry restarts the current Stage after Party Defeat. Retreat is selecting a lower unlocked Stage (floor: Stage 1).";
    }
    policy.append(policyCopy);
    root.append(policy);

    if (pendingStage !== null) {
      renderConfirm(pendingStage);
    }
  }

  return {
    render,
    destroy() {
      pendingStage = null;
      root.replaceChildren();
      root.classList.remove("stage-surface");
    },
  };
}
