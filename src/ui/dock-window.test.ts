import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("dock window port", () => {
  it("manual-check: dock-no-tile-resize — reads tile geometry without calling tile resize or move APIs", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "dock-window.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/getCurrentWindow\(\)\.set(Position|Size|Fullscreen)/);
    expect(source).not.toMatch(/getCurrentWindow\(\)\.hide\(/);
  });
});
