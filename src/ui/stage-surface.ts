import type { ReadonlySnapshot } from "../core/snapshot";
import type { Content } from "../core/types";
import type { TileCommand } from "./bus";
import { bindPressable } from "./keyboard";
import { el, mountSurfaceShell } from "./surface-shell";

export interface StageSurface {
  render(snapshot: ReadonlySnapshot | null): void;
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
  let pendingStage: 1 | 2 | 3 | null = null;

  function clearConfirm(): void {
    pendingStage = null;
    root.querySelector(".stage-confirm")?.remove();
  }

  function renderConfirm(stageId: 1 | 2 | 3): void {
    clearConfirm();
    const yes = el("button", {
      class: "stage-confirm-yes focus-ring",
      data: { stageConfirm: "yes" },
      props: { type: "button" },
      text: "Confirm",
    });
    bindPressable(yes, () => {
      options.onCommand?.({ cmd: "selectStage", args: [stageId] });
      clearConfirm();
    });

    const no = el("button", {
      class: "stage-confirm-no focus-ring",
      data: { stageConfirm: "no" },
      props: { type: "button" },
      text: "Cancel",
    });
    bindPressable(no, () => {
      clearConfirm();
    });

    const confirm = el(
      "div",
      {
        class: "stage-confirm",
        props: { role: "region" },
        aria: { label: "Confirm Stage selection" },
      },
      [
        el("p", {
          class: "stage-confirm-copy",
          text: "Abandons the current Attempt; earned XP and Drops are kept. Continue?",
        }),
        el("div", { class: "stage-confirm-actions" }, [yes, no]),
      ],
    );

    root.append(confirm);
    yes.focus();
  }

  const shell = mountSurfaceShell(root, "stage-surface", {
    title: "Stage",
    showTitle: false,
    body(snapshot) {
      const attempt = snapshot.attempt;

      const positionText = attempt
        ? `Current Attempt: Stage ${attempt.stage}, ${encounterLabel(attempt.encounter)}, ${attempt.phase}`
        : "No active Attempt";

      const rows = options.content.stages.map((stageDef) => {
        const stageId = stageDef.id;
        const unlocked = stageId <= snapshot.progression.unlockedStage;
        const isCurrent = attempt?.stage === stageId;

        const row = el("button", {
          class: "stage-row focus-ring",
          data: { stageId: String(stageId) },
          props: {
            type: "button",
            disabled: !unlocked,
            role: "listitem",
          },
          aria: { disabled: unlocked ? "false" : "true" },
        }, [
          el("span", { class: "stage-name", text: stageDef.name }),
          !unlocked
            ? el("span", {
                class: "stage-lock-glyph",
                props: { ariaHidden: true },
                text: "🔒",
              })
            : null,
          isCurrent ? el("span", { class: "stage-current-label", text: "Current" }) : null,
        ]);

        if (unlocked) {
          bindPressable(row, () => {
            pendingStage = stageId;
            render(snapshot);
          });
        }

        return row;
      });

      const policyCopy =
        attempt?.phase === "defeat-hold"
          ? "After Party Defeat, Retry restarts this Stage automatically. Retreat is selecting a lower unlocked Stage."
          : "Retry restarts the current Stage after Party Defeat. Retreat is selecting a lower unlocked Stage (floor: Stage 1).";

      return [
        el("p", { class: "attempt-position", text: positionText }),
        el("div", { class: "stage-list", props: { role: "list" } }, rows),
        el("section", { class: "failure-policy", aria: { label: "Failure Policy" } }, [
          el("h3", { class: "surface-section-title", text: "Failure Policy" }),
          el("p", { class: "failure-policy-copy", text: policyCopy }),
        ]),
      ];
    },
  });

  function render(snapshot: ReadonlySnapshot | null): void {
    const confirmStage = pendingStage;
    shell.render(snapshot);
    pendingStage = confirmStage;
    if (snapshot && pendingStage !== null) {
      renderConfirm(pendingStage);
    }
  }

  return {
    render,
    destroy() {
      pendingStage = null;
      shell.destroy();
    },
  };
}
