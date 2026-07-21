import { equipmentModifiersForLoadout } from "../core/equipment";
import { characterStats } from "../core/stats";
import type { ReadonlySnapshot } from "../core/snapshot";
import type { AbilityDef, ClassId, Content } from "../core/types";
import {
  abilityRawDisplay,
  formatAbilityRawLine,
  formatAbilityTimings,
} from "./ability-format";
import type { TileCommand } from "./bus";
import {
  appliedLoadout,
  CLASS_LABELS,
  classKitFor,
  effectiveLoadout,
  effectiveTalentState,
  unlockableAbilityIds,
} from "./snapshot-view";
import { el, mountSurfaceShell, pendingMarker } from "./surface-shell";

export interface LoadoutSurface {
  render(snapshot: ReadonlySnapshot | null): void;
  destroy(): void;
}

export interface LoadoutSurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
  /** The Character the picker has selected. Read at render time, not mount time. */
  getSelectedClassId(): ClassId | null;
}

function abilityById(content: Content, abilityId: string): AbilityDef | undefined {
  return content.abilities.find((ability) => ability.id === abilityId);
}

function newlyInsertedAbilities(
  applied: [string, string, string],
  pending: [string, string, string],
): Set<string> {
  const previous = new Set(applied);
  return new Set(pending.filter((abilityId) => !previous.has(abilityId)));
}

function renderAbilityCard(
  ability: AbilityDef,
  stats: ReturnType<typeof characterStats>,
  slotIndex: number | "basic",
  activationDelayPending: boolean,
): HTMLElement {
  const cardChildren = [el("p", { class: "ability-name", text: ability.name })];

  const raw = formatAbilityRawLine(abilityRawDisplay(ability, stats));
  if (raw) {
    cardChildren.push(
      el("p", { class: "ability-raw", data: { rawResult: "true" }, text: raw }),
    );
  }

  cardChildren.push(
    el("p", { class: "ability-timings", text: formatAbilityTimings(ability) }),
  );

  if (activationDelayPending && ability.cooldownMs > 0) {
    cardChildren.push(
      el("p", {
        class: "activation-delay",
        data: { activationDelay: "true" },
        text: "Activation Delay: starts on full cooldown",
      }),
    );
  }

  const cardData: Record<string, string> = { abilityId: ability.id };
  if (slotIndex !== "basic") {
    cardData["loadoutSlot"] = String(slotIndex);
  }

  return el("article", { class: "ability-card", data: cardData }, cardChildren);
}

export function mountLoadoutSurface(
  root: HTMLElement,
  options: LoadoutSurfaceOptions,
): LoadoutSurface {
  const { content } = options;

  const shell = mountSurfaceShell(root, "loadout-surface", {
    title: "Loadout",
    body(snapshot) {
      const classId = options.getSelectedClassId()!;
      const sections: HTMLElement[] = [
        el("p", {
          class: "loadout-order-note",
          text: "Slot 1 is checked first for the first valid Ability.",
        }),
      ];

      const classKit = classKitFor(content, classId);
      const talentState = effectiveTalentState(snapshot, classId);
      const equipmentLoadout = snapshot.attempt?.equipmentLoadouts[classId] ?? {};
      const equipmentMods = equipmentModifiersForLoadout(
        equipmentLoadout,
        snapshot.progression.armory,
        content,
      );
      const stats = characterStats(classKit, talentState, equipmentMods);
      const applied = appliedLoadout(snapshot, classId);
      const loadout = effectiveLoadout(snapshot, classId);
      const hasPending = snapshot.pendingEdits.some(
        (edit) => edit.kind === "loadout" && edit.classId === classId,
      );
      const inserted = hasPending ? newlyInsertedAbilities(applied, loadout) : new Set<string>();

      const sectionChildren: (HTMLElement | false)[] = [
        el("h3", { class: "surface-section-title", text: CLASS_LABELS[classId] }),
      ];

      if (hasPending) {
        const marker = pendingMarker();
        marker.dataset["pendingKind"] = "loadout";
        sectionChildren.push(marker);
      }

      const basicAbility = abilityById(content, classKit.basicAbilityId);
      if (basicAbility) {
        sectionChildren.push(
          el(
            "div",
            { class: "basic-attack", aria: { label: "Basic attack fallback" } },
            [
              el("p", { class: "slot-label", text: "Basic attack (fallback)" }),
              renderAbilityCard(basicAbility, stats, "basic", false),
            ],
          ),
        );
      }

      const slotElements: HTMLElement[] = [];

      loadout.forEach((abilityId, slotIndex) => {
        const ability = abilityById(content, abilityId);
        if (!ability) {
          return;
        }

        const optionElements = [
          el("option", {
            props: { value: abilityId, selected: true },
            text: ability.name,
          }),
        ];

        const unlocked = unlockableAbilityIds(classKit, talentState);
        for (const candidateId of unlocked) {
          if (candidateId === abilityId) {
            continue;
          }
          const candidate = abilityById(content, candidateId);
          if (!candidate) {
            continue;
          }
          const duplicateIndex = loadout.indexOf(candidateId);
          const disabled = duplicateIndex !== -1 && duplicateIndex !== slotIndex;
          optionElements.push(
            el("option", {
              props: {
                value: candidateId,
                disabled,
              },
              text: disabled
                ? `${candidate.name} (already slotted)`
                : candidate.name,
            }),
          );
        }

        const select = el("select", {
          class: "loadout-assign focus-ring",
          data: {
            loadoutAssign: String(slotIndex),
            classId,
          },
          aria: {
            label: `Assign Ability to slot ${slotIndex + 1} for ${CLASS_LABELS[classId]}`,
          },
        }, optionElements);

        select.addEventListener("change", () => {
          const nextAbilityId = select.value;
          if (nextAbilityId === abilityId) {
            return;
          }
          const nextLoadout = [...loadout] as [string, string, string];
          nextLoadout[slotIndex] = nextAbilityId;
          options.onCommand?.({
            cmd: "setLoadout",
            args: [classId, nextLoadout],
          });
        });

        slotElements.push(
          el("div", { class: "loadout-slot", data: { slot: String(slotIndex) } }, [
            el("p", { class: "slot-label", text: `Slot ${slotIndex + 1}` }),
            renderAbilityCard(
              ability,
              stats,
              slotIndex,
              inserted.has(abilityId),
            ),
            select,
          ]),
        );
      });

      sectionChildren.push(el("div", { class: "loadout-slots" }, slotElements));

      sections.push(
        el("section", { class: "loadout-character", data: { classId } }, sectionChildren),
      );

      return sections;
    },
  });

  return {
    render: (snapshot) => shell.render(snapshot),
    destroy: () => shell.destroy(),
  };
}
