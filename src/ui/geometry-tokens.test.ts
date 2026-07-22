import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BATTLEFIELD_HEIGHT,
  STATUS_LINE_HEIGHT,
  TILE_HEIGHT,
  TILE_WIDTH,
} from "./battle-tile-layout";
import { DOCK_HEIGHT, DOCK_WIDTH } from "./dock-geometry";

const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "../styles.css");

/** Geometry custom properties that must stay in lockstep with the TS constants. */
export const GEOMETRY_TOKEN_NAMES = [
  "--tile-width",
  "--tile-height",
  "--status-line-height",
  "--battlefield-height",
  "--dock-width",
  "--dock-height",
] as const;

export type GeometryTokenName = (typeof GEOMETRY_TOKEN_NAMES)[number];

export type GeometryTokenMap = Record<GeometryTokenName, string>;

export type GeometryPxConstants = {
  tileWidth: number;
  tileHeight: number;
  statusLineHeight: number;
  battlefieldHeight: number;
  dockWidth: number;
  dockHeight: number;
};

const TOKEN_TO_CONSTANT: Record<GeometryTokenName, keyof GeometryPxConstants> = {
  "--tile-width": "tileWidth",
  "--tile-height": "tileHeight",
  "--status-line-height": "statusLineHeight",
  "--battlefield-height": "battlefieldHeight",
  "--dock-width": "dockWidth",
  "--dock-height": "dockHeight",
};

/** Parse the first `:root { … }` block and return declared geometry custom properties. */
export function parseRootGeometryTokens(css: string): Partial<GeometryTokenMap> {
  const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
  const body = rootMatch?.[1];
  if (body === undefined) {
    return {};
  }
  const tokens: Partial<GeometryTokenMap> = {};
  for (const name of GEOMETRY_TOKEN_NAMES) {
    const propertyMatch = body.match(new RegExp(`${name}\\s*:\\s*([^;]+)\\s*;`));
    const value = propertyMatch?.[1]?.trim();
    if (value !== undefined) {
      tokens[name] = value;
    }
  }
  return tokens;
}

/** Return mismatch descriptions when CSS tokens disagree with the given px constants. */
export function geometryTokenMismatches(
  tokens: Partial<GeometryTokenMap>,
  constants: GeometryPxConstants,
): string[] {
  const mismatches: string[] = [];
  for (const name of GEOMETRY_TOKEN_NAMES) {
    const actual = tokens[name];
    const expected = `${constants[TOKEN_TO_CONSTANT[name]]}px`;
    if (actual === undefined) {
      mismatches.push(`${name}: missing from :root`);
      continue;
    }
    if (actual !== expected) {
      mismatches.push(`${name}: expected ${expected}, got ${actual}`);
    }
  }
  return mismatches;
}

const LIVE_CONSTANTS: GeometryPxConstants = {
  tileWidth: TILE_WIDTH,
  tileHeight: TILE_HEIGHT,
  statusLineHeight: STATUS_LINE_HEIGHT,
  battlefieldHeight: BATTLEFIELD_HEIGHT,
  dockWidth: DOCK_WIDTH,
  dockHeight: DOCK_HEIGHT,
};

describe("geometry CSS custom properties", () => {
  it("keeps each :root geometry token equal to its TS constant", () => {
    const css = readFileSync(stylesPath, "utf8");
    const tokens = parseRootGeometryTokens(css);
    expect(geometryTokenMismatches(tokens, LIVE_CONSTANTS)).toEqual([]);
  });

  it("rejects a TILE_WIDTH that disagrees with --tile-width", () => {
    // Guard proof: a drifted TS constant must fail the mismatch check.
    const css = readFileSync(stylesPath, "utf8");
    const tokens = parseRootGeometryTokens(css);
    const drifted: GeometryPxConstants = {
      ...LIVE_CONSTANTS,
      tileWidth: TILE_WIDTH + 1,
    };
    expect(geometryTokenMismatches(tokens, drifted)).toEqual([
      `--tile-width: expected ${TILE_WIDTH + 1}px, got ${TILE_WIDTH}px`,
    ]);
  });
});
