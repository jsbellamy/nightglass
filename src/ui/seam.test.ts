import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const UI_DIR = fileURLToPath(new URL(".", import.meta.url));

/** One-line reason per file; names the slice that removes the exception. */
export const UI_CORE_VALUE_IMPORT_ALLOWLIST: Record<string, string> = {
  "presentation.ts":
    "Presentation owns event-to-effect mapping (docs/agents/code-style.md §Layout); data import removed by presentation-effects slice",
  "battle-tile.ts":
    "Combatant iteration helpers until battle-tile snapshot-view slice (#158)",
  "equipment-format.ts": "Core stat math imports narrowed by stat-derivation slice (#159)",
  "ability-format.ts": "Core combat math imports narrowed by stat-derivation slice (#159)",
  "loadout-surface.ts":
    "equipmentModifiersForLoadout / characterStats removed by loadout stat-derivation slice (#159)",
  "armory-surface.ts":
    "dropStatModifiers / snapshotEquipmentLoadouts removed by armory stat-derivation slice (#159)",
  "offline-summary.ts": "levelFromXp moves behind snapshot-view in offline-summary slice (#163)",
  "boot.ts": "Composition root owns Engine wiring until shell/bootstrap slice (#163)",
  "sprites.ts":
    "MONSTER_FRAMES tier dimensions until sprite registry moves behind snapshot-view or a UI-local tier table slice",
};

const VALUE_IMPORT_PATTERN =
  /^\s*import\s+(?!type\b)(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+["'](\.\.\/core\/|\.\.\/data\/)/;

export function findDisallowedCoreValueImports(
  source: string,
  relativePath: string,
): string[] {
  if (relativePath === "snapshot-view.ts") {
    return [];
  }
  if (relativePath in UI_CORE_VALUE_IMPORT_ALLOWLIST) {
    return [];
  }
  const violations: string[] = [];
  for (const line of source.split("\n")) {
    if (VALUE_IMPORT_PATTERN.test(line)) {
      violations.push(line.trim());
    }
  }
  return violations;
}

function listUiSourceFiles(): string[] {
  return readdirSync(UI_DIR)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .sort();
}

describe("UI layering seam", () => {
  it("allows only snapshot-view and the documented allowlist to value-import core/data", () => {
    const offenders: string[] = [];
    for (const file of listUiSourceFiles()) {
      const source = readFileSync(join(UI_DIR, file), "utf8");
      const violations = findDisallowedCoreValueImports(source, file);
      if (violations.length > 0) {
        offenders.push(`${file}:\n  ${violations.join("\n  ")}`);
      }
    }
    expect(offenders, offenders.join("\n\n")).toEqual([]);
  });

  it("documents a one-line removal slice for every allowlist entry", () => {
    for (const [file, reason] of Object.entries(UI_CORE_VALUE_IMPORT_ALLOWLIST)) {
      expect(reason.length, file).toBeGreaterThan(10);
      expect(reason, file).toMatch(/slice|legality|presentation|code-style/i);
    }
  });

  it("rejects a fresh surface value-importing the Engine", () => {
  // Guard proof: a hypothetical surface that imports createEngine must fail.
    const fixture = `import { createEngine } from "../core/engine";\n`;
    expect(findDisallowedCoreValueImports(fixture, "hypothetical-surface.ts")).toEqual([
      'import { createEngine } from "../core/engine";',
    ]);
  });
});
