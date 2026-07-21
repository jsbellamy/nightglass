import type { ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content } from "../core/types";
import type { TileCommand } from "./bus";
import { bindPressable } from "./keyboard";
import { CLASS_LABELS, levelFor } from "./snapshot-view";
import { el, mountSurfaceShell, pendingMarker } from "./surface-shell";

const FORMATION_SLOTS = ["Front", "Middle", "Back"] as const;

export interface PartySurface {
  render(snapshot: ReadonlySnapshot | null): void;
  destroy(): void;
}

export interface PartySurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
  /** The Character the picker has selected. Read at render time, not mount time. */
  getSelectedClassId(): ClassId | null;
}

function effectiveParty(snapshot: ReadonlySnapshot): {
  members: [ClassId, ClassId, ClassId];
  reserve: ClassId;
} {
  const pending = snapshot.progression.pendingParty;
  if (pending) {
    return { members: pending.members, reserve: pending.reserve };
  }
  return {
    members: snapshot.progression.party,
    reserve: snapshot.progression.reserve,
  };
}

function effectiveFormation(snapshot: ReadonlySnapshot): [ClassId, ClassId, ClassId] {
  const pending = snapshot.pendingEdits.find((edit) => edit.kind === "formation");
  if (pending?.kind === "formation") {
    return pending.order;
  }
  return snapshot.progression.party;
}

function swapFormationOrder(
  order: [ClassId, ClassId, ClassId],
  slotIndex: number,
  direction: "up" | "down",
): [ClassId, ClassId, ClassId] {
  const next = [...order] as [ClassId, ClassId, ClassId];
  const target = direction === "up" ? slotIndex - 1 : slotIndex + 1;
  if (target < 0 || target >= next.length) {
    return order;
  }
  const current = next[slotIndex]!;
  next[slotIndex] = next[target]!;
  next[target] = current;
  return next;
}

export function mountPartySurface(
  root: HTMLElement,
  options: PartySurfaceOptions,
): PartySurface {
  const { content } = options;

  const shell = mountSurfaceShell(root, "party-surface", {
    title: "Party",
    body(snapshot) {
      const selectedClassId = options.getSelectedClassId()!;
      const hasFormationPending = snapshot.pendingEdits.some((edit) => edit.kind === "formation");
      const hasPartyPending = snapshot.progression.pendingParty !== null;

      const { members, reserve } = effectiveParty(snapshot);
      const formation = effectiveFormation(snapshot);
      const selectedPartyIndex = members.indexOf(selectedClassId);
      const selectedIsReserve = selectedClassId === reserve;

      const formationSlots = formation.map((classId, slotIndex) => {
        const isSelected = classId === selectedClassId;

        const moveUp = el("button", {
          class: "formation-action focus-ring",
          data: { formationAction: "move-up", slot: String(slotIndex) },
          props: { type: "button", disabled: slotIndex === 0 },
          text: "Move up",
        });
        bindPressable(moveUp, () => {
          options.onCommand?.({
            cmd: "setFormation",
            args: [swapFormationOrder(formation, slotIndex, "up")],
          });
        });

        const moveDown = el("button", {
          class: "formation-action focus-ring",
          data: { formationAction: "move-down", slot: String(slotIndex) },
          props: { type: "button", disabled: slotIndex === formation.length - 1 },
          text: "Move down",
        });
        bindPressable(moveDown, () => {
          options.onCommand?.({
            cmd: "setFormation",
            args: [swapFormationOrder(formation, slotIndex, "down")],
          });
        });

        const slotData: Record<string, string> = { slot: String(slotIndex) };
        if (isSelected) {
          slotData["formationSelected"] = "true";
        }

        return el("article", { class: "formation-slot character-card", data: slotData }, [
          el("p", { class: "slot-label", text: FORMATION_SLOTS[slotIndex] ?? "Slot" }),
          el("p", { class: "character-name", text: CLASS_LABELS[classId] }),
          el("p", {
            class: "character-level",
            text: `Level ${levelFor(snapshot, content, classId)}`,
          }),
          el("div", { class: "formation-controls" }, [moveUp, moveDown]),
        ]);
      });

      const formationSection = el(
        "section",
        { class: "party-formation", aria: { label: "Formation" } },
        [
          el("h3", { class: "surface-section-title", text: "Formation" }),
          ...formationSlots,
        ],
      );

      const swapButtons: HTMLElement[] = [];
      if (selectedIsReserve) {
        for (let slotIndex = 0; slotIndex < members.length; slotIndex += 1) {
          const member = members[slotIndex]!;
          const swapButton = el("button", {
            class: "party-swap focus-ring",
            data: { partySwapSlot: String(slotIndex) },
            props: { type: "button" },
            text: `Swap into ${FORMATION_SLOTS[slotIndex]} (${CLASS_LABELS[member]})`,
          });
          bindPressable(swapButton, () => {
            const current = effectiveParty(snapshot);
            const nextMembers = [...current.members] as [ClassId, ClassId, ClassId];
            nextMembers[slotIndex] = selectedClassId;
            options.onCommand?.({
              cmd: "setParty",
              args: [nextMembers, current.members[slotIndex]!],
            });
          });
          swapButtons.push(swapButton);
        }
      } else if (selectedPartyIndex !== -1) {
        const swapButton = el("button", {
          class: "party-swap focus-ring",
          data: { partySwap: selectedClassId },
          props: { type: "button" },
          text: `Swap with Reserve (${CLASS_LABELS[reserve]})`,
        });
        bindPressable(swapButton, () => {
          const current = effectiveParty(snapshot);
          const index = current.members.indexOf(selectedClassId);
          if (index === -1) {
            return;
          }
          const nextMembers = [...current.members] as [ClassId, ClassId, ClassId];
          nextMembers[index] = current.reserve;
          options.onCommand?.({
            cmd: "setParty",
            args: [nextMembers, selectedClassId],
          });
        });
        swapButtons.push(swapButton);
      }

      const reserveChildren: (HTMLElement | null)[] = [
        el("h3", { class: "surface-section-title", text: "Reserve" }),
      ];
      if (selectedIsReserve) {
        reserveChildren.push(el("p", { class: "reserve-note", text: "Earns 50% XP" }));
      }
      reserveChildren.push(
        el("article", { class: "character-card reserve-card" }, [
          el("p", { class: "character-name", text: CLASS_LABELS[reserve] }),
          el("p", {
            class: "character-level",
            text: `Level ${levelFor(snapshot, content, reserve)}`,
          }),
        ]),
        el("h3", { class: "surface-section-title", text: "Party swaps" }),
        ...swapButtons,
      );

      const reserveSection = el(
        "section",
        { class: "party-reserve", aria: { label: "Reserve" } },
        reserveChildren,
      );

      const body: (HTMLElement | null)[] = [];

      if (hasFormationPending) {
        const marker = pendingMarker();
        marker.dataset["pendingKind"] = "formation";
        body.push(marker);
      }

      if (hasPartyPending) {
        body.push(
          el("p", {
            class: "pending-marker pending-attempt",
            data: { pendingKind: "party" },
            text: "Applies next Attempt",
          }),
        );
      }

      body.push(formationSection, reserveSection);
      return body;
    },
  });

  return {
    render: (snapshot) => shell.render(snapshot),
    destroy: () => shell.destroy(),
  };
}
