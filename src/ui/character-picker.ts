import type { ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content } from "../core/types";
import { bindPressable } from "./keyboard";
import {
  CLASS_LABELS,
  levelFor,
  rosterClassIds,
} from "./snapshot-view";
import { bindScrollOverflowAffordance, el } from "./surface-shell";

const POSITION_LABELS = ["Front", "Middle", "Back"] as const;
const POSITION_KEYS = ["front", "middle", "back"] as const;

export interface CharacterPicker {
  render(snapshot: ReadonlySnapshot | null, selected: ClassId): void;
  destroy(): void;
}

export interface CharacterPickerOptions {
  content: Content;
  onSelect(classId: ClassId): void;
}

export function mountCharacterPicker(
  root: HTMLElement,
  options: CharacterPickerOptions,
): CharacterPicker {
  const picker = el("div", {
    class: "character-picker",
    aria: { label: "Character picker" },
    props: { role: "tablist" },
  });
  root.append(picker);
  const unbindOverflow = bindScrollOverflowAffordance(picker);

  let chipOrder: ClassId[] = [];

  function selectAt(index: number): void {
    const classId = chipOrder[index];
    if (!classId) {
      return;
    }
    options.onSelect(classId);
  }

  function onChipKeydown(event: KeyboardEvent, classId: ClassId): void {
    const index = chipOrder.indexOf(classId);
    if (index < 0 || chipOrder.length === 0) {
      return;
    }
    const last = chipOrder.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      selectAt((index + 1) % chipOrder.length);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      selectAt((index - 1 + chipOrder.length) % chipOrder.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      selectAt(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectAt(last);
    }
  }

  function renderChips(snapshot: ReadonlySnapshot, selected: ClassId): void {
    const restoreFocus = picker.contains(document.activeElement);
    chipOrder = rosterClassIds(snapshot);
    const chips = chipOrder.map((classId, index) => {
      const isSelected = classId === selected;
      const positionKey = index < 3 ? POSITION_KEYS[index]! : "reserve";
      const positionLabel = index < 3 ? POSITION_LABELS[index]! : "Reserve";

      const chip = el(
        "button",
        {
          class: "character-picker-chip focus-ring",
          data: { characterChip: classId },
          props: {
            type: "button",
            role: "tab",
            tabIndex: isSelected ? 0 : -1,
          },
        },
        [
          el("span", { class: "character-chip-name", text: CLASS_LABELS[classId] }),
          el("span", {
            class: "character-chip-level",
            text: `Level ${levelFor(snapshot, options.content, classId)}`,
          }),
          el("span", {
            class: "character-chip-position",
            data: { pickerPosition: positionKey },
            text: positionLabel,
          }),
        ],
      );
      chip.setAttribute("aria-selected", isSelected ? "true" : "false");

      bindPressable(chip, () => options.onSelect(classId));
      chip.addEventListener("keydown", (event) => onChipKeydown(event, classId));
      return chip;
    });

    picker.replaceChildren(...chips);

    if (restoreFocus) {
      picker
        .querySelector<HTMLElement>(`[data-character-chip="${selected}"]`)
        ?.focus();
    }
  }

  return {
    render(snapshot, selected) {
      if (!snapshot) {
        chipOrder = [];
        picker.replaceChildren();
        return;
      }
      renderChips(snapshot, selected);
    },
    destroy() {
      unbindOverflow();
      chipOrder = [];
      picker.remove();
    },
  };
}
