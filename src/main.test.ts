// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { mountTileShell, TILE_HEIGHT, TILE_WIDTH } from "./main";

describe("Battle Tile shell", () => {
  it("mounts an empty 480×112 tile shell on the root element", () => {
    const root = document.createElement("main");
    mountTileShell(root);

    expect(root.classList.contains("tile-shell")).toBe(true);
    expect(root.getAttribute("aria-label")).toBe("Battle Tile");
    expect(TILE_WIDTH).toBe(480);
    expect(TILE_HEIGHT).toBe(112);
  });
});
