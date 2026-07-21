import type { DropInstance, ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, EquipmentSlotId } from "../core/types";
import type { EngineLegalityView } from "./engine-legality";
import type { DockSurfaceMountOptions } from "./dock";
import {
  equipmentBaseForDrop,
  formatAffix,
  formatGuaranteedStat,
  SLOT_LABELS,
} from "./equipment-format";
import { createEquipmentIconElement } from "./icons";
import { bindPressable } from "./keyboard";
import { mountLoadoutSurface } from "./loadout-surface";
import { mountPartySurface } from "./party-surface";
import { el } from "./surface-shell";
import { mountTalentsSurface } from "./talents-surface";

const SLOTS: EquipmentSlotId[] = ["weapon", "armor", "charm"];

export interface CharacterSurface {
  render(snapshot: ReadonlySnapshot | null, legality: EngineLegalityView): void;
  destroy(): void;
}

function equippedDrop(
  armory: readonly DropInstance[],
  classId: ClassId,
  slot: EquipmentSlotId,
): DropInstance | undefined {
  return armory.find(
    (drop) => drop.assignedTo?.classId === classId && drop.assignedTo.slot === slot,
  );
}

function renderEquipmentSection(
  section: HTMLElement,
  snapshot: ReadonlySnapshot,
  options: DockSurfaceMountOptions,
): void {
  const classId = options.getSelectedClassId();
  section.replaceChildren();

  if (classId === null) {
    return;
  }

  const group = el("div", {
    class: "character-equipment",
    props: { role: "group" },
    aria: { label: "Equipment" },
  });

  group.append(
    el("p", {
      class: "armory-attempt-note",
      data: { nextAttemptNote: "true" },
      text: "Equipment changes apply from the next Stage Attempt.",
    }),
  );

  for (const slot of SLOTS) {
    const drop = equippedDrop(snapshot.progression.armory, classId, slot);
    const filled = drop !== undefined;
    const row = el("div", {
      class: filled
        ? `equipment-slot-row rarity-${drop.rarity}`
        : "equipment-slot-row",
      data: {
        equipmentSlot: slot,
        slotFilled: filled ? "true" : "false",
      },
    });

    row.append(el("span", { class: "equipment-slot-label", text: SLOT_LABELS[slot] }));

    if (drop) {
      const base = equipmentBaseForDrop(drop, options.content);
      const iconWrap = el("span", {
        class: "equipment-icon-content",
        aria: { label: `${base.name} icon` },
      });
      iconWrap.append(createEquipmentIconElement(base.iconKey, "content"));
      row.append(iconWrap);

      const titles = el("div", { class: "equipment-slot-titles" });
      titles.append(el("p", { class: "equipment-name", text: base.name }));
      titles.append(
        el("p", {
          class: "equipment-meta",
          text: `Tier ${base.tier} · Item Level ${drop.itemLevel}`,
        }),
      );
      titles.append(
        el("p", { class: "equipment-guaranteed", text: formatGuaranteedStat(base) }),
      );
      if (drop.affixes.length > 0) {
        const affixList = el("ul", { class: "equipment-affix-list" });
        for (const affix of drop.affixes) {
          affixList.append(el("li", { text: formatAffix(affix) }));
        }
        titles.append(affixList);
      }
      row.append(titles);
    } else {
      // Leading space keeps row textContent from reading as the Armory "WeaponEmpty" defect.
      row.append(el("span", { class: "equipment-slot-empty", text: " Empty" }));
    }

    const actions = el("div", { class: "equipment-slot-actions" });
    const browse = el("button", {
      class: "equipment-slot-browse focus-ring",
      data: { browseSlot: slot },
      props: { type: "button" },
      text: filled ? "Swap" : "Choose",
    });
    bindPressable(browse, () => {
      options.requestTab("armory", { kind: "browse-slot", classId, slot });
    });
    actions.append(browse);

    if (drop) {
      const unequip = el("button", {
        class: "equipment-slot-unequip focus-ring",
        data: { unequipSlot: slot },
        props: { type: "button" },
        text: "Unequip",
      });
      bindPressable(unequip, () => {
        options.onCommand({ cmd: "unequip", args: [classId, slot] });
      });
      actions.append(unequip);
    }

    row.append(actions);
    group.append(row);
  }

  section.append(group);
}

export function mountCharacterSurface(
  root: HTMLElement,
  options: DockSurfaceMountOptions,
): CharacterSurface {
  root.classList.add("character-surface");

  const partySection = document.createElement("section");
  partySection.className = "character-section";
  partySection.dataset["characterSection"] = "party";

  const equipmentSection = document.createElement("section");
  equipmentSection.className = "character-section";
  equipmentSection.dataset["characterSection"] = "equipment";

  const loadoutSection = document.createElement("section");
  loadoutSection.className = "character-section";
  loadoutSection.dataset["characterSection"] = "loadout";

  const talentsSection = document.createElement("section");
  talentsSection.className = "character-section";
  talentsSection.dataset["characterSection"] = "talents";

  root.append(partySection, equipmentSection, loadoutSection, talentsSection);

  const party = mountPartySurface(partySection, options);
  const loadout = mountLoadoutSurface(loadoutSection, options);
  const talents = mountTalentsSurface(talentsSection, options);

  return {
    render(snapshot, legality) {
      party.render(snapshot);
      if (snapshot) {
        renderEquipmentSection(equipmentSection, snapshot, options);
      } else {
        equipmentSection.replaceChildren();
      }
      loadout.render(snapshot);
      talents.render(snapshot, legality);
    },
    destroy() {
      party.destroy();
      loadout.destroy();
      talents.destroy();
      root.replaceChildren();
      root.classList.remove("character-surface");
    },
  };
}
