// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId } from "../core/types";
import { buildContent } from "../data";
import { mountCharacterPicker } from "./character-picker";
import {
  CLASS_LABELS,
  combatantForClass,
  effectiveFormation,
  rosterClassIds,
} from "./snapshot-view";

const POSITION_BY_INDEX = ["front", "middle", "back"] as const;
const content = buildContent();
const LOOT_SEED = 42;

describe("Character picker", () => {
  it("renders one chip per Roster Character in Front/Middle/Back/Reserve order", () => {
    const root = document.createElement("div");
    const picker = mountCharacterPicker(root, {
      content: fixtureContent,
      onSelect: () => undefined,
    });
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = engine.snapshot();
    const roster = rosterClassIds(snapshot);

    picker.render(snapshot, roster[0]!);

    const chips = [...root.querySelectorAll<HTMLElement>("[data-character-chip]")];
    expect(root.querySelector(".character-picker")).not.toBeNull();
    expect(root.querySelector('[role="tablist"]')).not.toBeNull();
    expect(chips.map((chip) => chip.dataset["characterChip"])).toEqual(roster);
    expect(chips).toHaveLength(4);

    picker.destroy();
  });

  it("shows Class label, Level N, and position badge for each chip", () => {
    const root = document.createElement("div");
    const picker = mountCharacterPicker(root, {
      content: fixtureContent,
      onSelect: () => undefined,
    });
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = engine.snapshot();
    const roster = rosterClassIds(snapshot);

    picker.render(snapshot, roster[0]!);

    const chips = [...root.querySelectorAll<HTMLElement>("[data-character-chip]")];
    expect(chips).toHaveLength(roster.length);
    for (const [index, classId] of roster.entries()) {
      const chip = chips[index]!;
      expect(chip.dataset["characterChip"]).toBe(classId);
      expect(chip.querySelector(".character-chip-name")?.textContent).toBe(CLASS_LABELS[classId]);
      expect(chip.querySelector(".character-chip-level")?.textContent).toMatch(/^Level \d+$/);
      const expectedPosition = index < 3 ? POSITION_BY_INDEX[index]! : "reserve";
      expect(
        chip.querySelector<HTMLElement>(".character-chip-position")?.dataset["pickerPosition"],
      ).toBe(expectedPosition);
      expect(chip?.querySelector(".character-chip-position")?.textContent).toMatch(
        /^(Front|Middle|Back|Reserve)$/,
      );
    }

    picker.destroy();
  });

  it("never renders Character chip health, including during a Stage Attempt", () => {
    const root = document.createElement("div");
    const picker = mountCharacterPicker(root, {
      content: fixtureContent,
      onSelect: () => undefined,
    });
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = engine.snapshot();
    const partyFront = snapshot.progression.party[0]!;

    picker.render(snapshot, partyFront);

    const combatant = combatantForClass(snapshot, partyFront);
    expect(combatant).toBeDefined();
    expect(root.querySelector(".character-chip-health")).toBeNull();
    expect(root.querySelector(".character-chip-health-fill")).toBeNull();

    const idle = structuredClone(snapshot);
    idle.attempt = null;
    picker.render(idle, partyFront);
    expect(root.querySelector(".character-chip-health")).toBeNull();

    picker.destroy();
  });

  it("renders an empty state and throws nothing when the Snapshot is null", () => {
    const root = document.createElement("div");
    const picker = mountCharacterPicker(root, {
      content: fixtureContent,
      onSelect: () => undefined,
    });

    expect(() => picker.render(null, "knight")).not.toThrow();
    expect(root.querySelector(".character-picker")).not.toBeNull();
    expect(root.querySelectorAll("[data-character-chip]")).toHaveLength(0);

    picker.destroy();
  });

  it("marks the selected chip with aria-selected and roving tabindex", () => {
    const root = document.createElement("div");
    const picker = mountCharacterPicker(root, {
      content: fixtureContent,
      onSelect: () => undefined,
    });
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = engine.snapshot();
    const [selected] = rosterClassIds(snapshot);

    picker.render(snapshot, selected!);

    const chips = [...root.querySelectorAll<HTMLElement>("[data-character-chip]")];
    expect(chips).toHaveLength(rosterClassIds(snapshot).length);
    for (const chip of chips) {
      const isSelected = chip.dataset["characterChip"] === selected;
      expect(chip.getAttribute("aria-selected")).toBe(isSelected ? "true" : "false");
      expect(chip.tabIndex).toBe(isSelected ? 0 : -1);
    }

    picker.destroy();
  });

  it("activates a chip by click and by Enter", () => {
    const root = document.createElement("div");
    const onSelect = vi.fn();
    const picker = mountCharacterPicker(root, {
      content: fixtureContent,
      onSelect,
    });
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = engine.snapshot();
    const roster = rosterClassIds(snapshot);
    const target = roster[2]!;

    picker.render(snapshot, roster[0]!);
    root.querySelector<HTMLElement>(`[data-character-chip="${target}"]`)?.click();
    expect(onSelect).toHaveBeenCalledWith(target);

    onSelect.mockClear();
    const chip = root.querySelector<HTMLElement>(`[data-character-chip="${roster[1]!}"]`);
    chip?.focus();
    chip?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith(roster[1]!);

    picker.destroy();
  });

  it("moves selection with ArrowDown/ArrowUp wrapping and Home/End", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = engine.snapshot();
    const roster = rosterClassIds(snapshot);
    let selected = roster[0]!;
    const onSelect = vi.fn((classId: ClassId) => {
      selected = classId;
      picker.render(snapshot, selected);
    });
    const picker = mountCharacterPicker(root, {
      content: fixtureContent,
      onSelect,
    });

    picker.render(snapshot, selected);

    const first = root.querySelector<HTMLElement>(`[data-character-chip="${roster[0]!}"]`);
    first?.focus();
    first?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(roster[1]!);
    expect(
      root.querySelector<HTMLElement>(`[data-character-chip="${roster[1]!}"]`)?.tabIndex,
    ).toBe(0);
    expect(document.activeElement).toBe(
      root.querySelector(`[data-character-chip="${roster[1]!}"]`),
    );

    onSelect.mockClear();
    const second = root.querySelector<HTMLElement>(`[data-character-chip="${roster[1]!}"]`);
    second?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(roster[0]!);

    onSelect.mockClear();
    const atFirst = root.querySelector<HTMLElement>(`[data-character-chip="${roster[0]!}"]`);
    atFirst?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(roster[3]!);

    onSelect.mockClear();
    const last = root.querySelector<HTMLElement>(`[data-character-chip="${roster[3]!}"]`);
    last?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(roster[0]!);

    onSelect.mockClear();
    const home = root.querySelector<HTMLElement>(`[data-character-chip="${roster[0]!}"]`);
    home?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(roster[3]!);
    expect(document.activeElement).toBe(
      root.querySelector(`[data-character-chip="${roster[3]!}"]`),
    );

    root.remove();
    picker.destroy();
  });

  it("issues setFormation when Move down / Move up swap adjacent Formation slots", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const picker = mountCharacterPicker(root, {
      content,
      onSelect: () => undefined,
      onCommand: (command) => commands.push(command),
    });
    const engine = createEngine(content, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const party = snapshot.progression.party;

    picker.render(snapshot, party[0]!);

    expect(
      root.querySelector<HTMLButtonElement>('[data-formation-action="move-up"][data-slot="0"]')
        ?.disabled,
    ).toBe(true);
    expect(
      root.querySelector<HTMLButtonElement>('[data-formation-action="move-down"][data-slot="2"]')
        ?.disabled,
    ).toBe(true);
    expect(root.querySelector('[data-formation-action][data-slot="3"]')).toBeNull();

    root
      .querySelector<HTMLButtonElement>('[data-formation-action="move-down"][data-slot="1"]')
      ?.click();

    expect(commands).toEqual([
      {
        cmd: "setFormation",
        args: [[party[0], party[2], party[1]]],
      },
    ]);

    commands.length = 0;
    root
      .querySelector<HTMLButtonElement>('[data-formation-action="move-up"][data-slot="1"]')
      ?.click();
    expect(commands).toEqual([
      {
        cmd: "setFormation",
        args: [[party[1], party[0], party[2]]],
      },
    ]);

    picker.destroy();
  });

  it("shows Swap with Reserve on the selected Party row only", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const picker = mountCharacterPicker(root, {
      content,
      onSelect: () => undefined,
      onCommand: (command) => commands.push(command),
    });
    const engine = createEngine(content, undefined, LOOT_SEED);
    const { party, reserve } = engine.snapshot().progression;

    picker.render(engine.snapshot(), party[0]!);
    expect(root.querySelector(".character-picker-swaps")).toBeNull();
    expect(root.querySelectorAll(".party-swap")).toHaveLength(1);
    expect(
      root.querySelector(`[data-character-chip="${party[0]}"]`)
        ?.closest(".character-picker-row")
        ?.querySelector(".party-swap"),
    ).not.toBeNull();
    root.querySelector<HTMLButtonElement>(`[data-party-swap="${party[0]}"]`)?.click();

    expect(commands).toEqual([
      {
        cmd: "setParty",
        args: [[reserve, party[1], party[2]], party[0]],
      },
    ]);

    picker.destroy();
  });

  it("shows → Front/Middle/Back on the selected Reserve row only", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const picker = mountCharacterPicker(root, {
      content,
      onSelect: () => undefined,
      onCommand: (command) => commands.push(command),
    });
    const engine = createEngine(content, undefined, LOOT_SEED);
    const { party, reserve } = engine.snapshot().progression;

    picker.render(engine.snapshot(), reserve);
    expect(root.querySelectorAll(".party-swap")).toHaveLength(3);
    expect(
      root.querySelector(`[data-character-chip="${reserve}"]`)
        ?.closest(".character-picker-row")
        ?.querySelectorAll(".party-swap"),
    ).toHaveLength(3);
    root.querySelector<HTMLButtonElement>('[data-party-swap-slot="1"]')?.click();

    expect(commands).toEqual([
      {
        cmd: "setParty",
        args: [[party[0], reserve, party[2]], party[1]],
      },
    ]);

    picker.destroy();
  });

  it("orders chips by pending formation and shows next-Wave pending marker", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const picker = mountCharacterPicker(root, {
      content,
      onSelect: () => undefined,
      onCommand: (command) => {
        if (command.cmd === "setFormation") {
          engine.setFormation(command.args[0]);
        }
      },
    });
    const snapshot = engine.snapshot();
    const party = snapshot.progression.party;

    picker.render(snapshot, party[0]!);
    root
      .querySelector<HTMLButtonElement>('[data-formation-action="move-down"][data-slot="0"]')
      ?.click();
    picker.render(engine.snapshot(), party[0]!);

    const order = effectiveFormation(engine.snapshot());
    expect(order).toEqual([party[1], party[0], party[2]]);
    expect(
      [...root.querySelectorAll<HTMLElement>("[data-character-chip]")].map(
        (chip) => chip.dataset["characterChip"],
      ),
    ).toEqual([...order, snapshot.progression.reserve]);
    expect(root.querySelector('[data-pending-kind="formation"]')?.textContent).toMatch(
      /next Wave/i,
    );
    expect(root.querySelector(".party-surface")).toBeNull();

    picker.destroy();
  });

  it("orders chips by pendingParty and shows next-Attempt pending marker", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const picker = mountCharacterPicker(root, {
      content,
      onSelect: () => undefined,
      onCommand: (command) => {
        if (command.cmd === "setParty") {
          engine.setParty(command.args[0], command.args[1]);
        }
      },
    });
    const { party, reserve } = engine.snapshot().progression;

    picker.render(engine.snapshot(), party[0]!);
    root.querySelector<HTMLButtonElement>(`[data-party-swap="${party[0]}"]`)?.click();
    picker.render(engine.snapshot(), reserve);

    expect(
      [...root.querySelectorAll<HTMLElement>("[data-character-chip]")].map(
        (chip) => chip.dataset["characterChip"],
      ),
    ).toEqual([reserve, party[1], party[2], party[0]]);
    expect(root.querySelector('[data-pending-kind="party"]')?.textContent).toMatch(
      /next Attempt/i,
    );

    picker.destroy();
  });

  it("orders chips by pendingParty over a stale formation pending without duplicates", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const picker = mountCharacterPicker(root, {
      content,
      onSelect: () => undefined,
      onCommand: (command) => {
        if (command.cmd === "setFormation") {
          engine.setFormation(command.args[0]);
        }
        if (command.cmd === "setParty") {
          engine.setParty(command.args[0], command.args[1]);
        }
      },
    });
    const { party, reserve } = engine.snapshot().progression;

    picker.render(engine.snapshot(), party[0]!);
    root
      .querySelector<HTMLButtonElement>('[data-formation-action="move-down"][data-slot="0"]')
      ?.click();
    picker.render(engine.snapshot(), party[0]!);
    root.querySelector<HTMLButtonElement>(`[data-party-swap="${party[0]}"]`)?.click();
    picker.render(engine.snapshot(), party[0]!);

    const chips = [...root.querySelectorAll<HTMLElement>("[data-character-chip]")].map(
      (chip) => chip.dataset["characterChip"],
    );
    expect(chips).toEqual([reserve, party[1], party[2], party[0]]);
    expect(new Set(chips).size).toBe(4);
    expect(root.querySelector("[data-formation-action]")).toBeNull();
    expect(root.querySelector('[data-pending-kind="formation"]')).not.toBeNull();
    expect(root.querySelector('[data-pending-kind="party"]')).not.toBeNull();

    picker.destroy();
  });

  it("composes consecutive Reserve swaps against pendingParty", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const engine = createEngine(content, undefined, LOOT_SEED);
    const { party, reserve } = engine.snapshot().progression;
    let selected: ClassId = party[0]!;
    const picker = mountCharacterPicker(root, {
      content,
      onSelect: (classId) => {
        selected = classId;
      },
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "setParty") {
          engine.setParty(command.args[0], command.args[1]);
        }
      },
    });

    picker.render(engine.snapshot(), selected);
    root.querySelector<HTMLButtonElement>(`[data-party-swap="${party[0]}"]`)?.click();
    selected = party[1]!;
    picker.render(engine.snapshot(), selected);
    root.querySelector<HTMLButtonElement>(`[data-party-swap="${party[1]}"]`)?.click();

    expect(commands).toEqual([
      { cmd: "setParty", args: [[reserve, party[1], party[2]], party[0]] },
      { cmd: "setParty", args: [[reserve, party[0], party[2]], party[1]] },
    ]);

    picker.destroy();
  });

  it("publishes Formation and Reserve commands from activatable controls", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const engine = createEngine(content, undefined, LOOT_SEED);
    const party = engine.snapshot().progression.party;
    const picker = mountCharacterPicker(root, {
      content,
      onSelect: () => undefined,
      onCommand: (command) => {
        commands.push(command);
      },
    });

    picker.render(engine.snapshot(), party[0]!);
    root
      .querySelector<HTMLButtonElement>('[data-formation-action="move-down"][data-slot="0"]')
      ?.click();
    expect(commands.some((command) => (command as { cmd: string }).cmd === "setFormation")).toBe(
      true,
    );

    root.querySelector<HTMLButtonElement>("[data-party-swap]")?.click();
    expect(commands.some((command) => (command as { cmd: string }).cmd === "setParty")).toBe(true);

    picker.destroy();
  });

  it("destroys the picker and clears the root", () => {
    const root = document.createElement("div");
    const picker = mountCharacterPicker(root, {
      content: fixtureContent,
      onSelect: () => undefined,
    });
    const engine = createEngine(fixtureContent, undefined, 3);
    picker.render(engine.snapshot(), engine.snapshot().progression.party[0]!);

    picker.destroy();
    expect(root.querySelector(".character-picker")).toBeNull();
  });
});
