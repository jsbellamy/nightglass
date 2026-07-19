import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const capabilitiesDir = join(here, "../../src-tauri/capabilities");

interface CapabilityManifest {
  permissions: string[];
}

interface AccountedPermissions {
  permissions: Record<string, { need: string; since: string }>;
}

describe("capability least-privilege accounting", () => {
  it("accounts for every permission in the capability manifest (and no extras)", () => {
    const manifest = JSON.parse(
      readFileSync(join(capabilitiesDir, "default.json"), "utf8"),
    ) as CapabilityManifest;
    const accounted = JSON.parse(
      readFileSync(join(capabilitiesDir, "accounted.json"), "utf8"),
    ) as AccountedPermissions;

    const inManifest = [...manifest.permissions].sort();
    const inAccounted = Object.keys(accounted.permissions).sort();
    expect(inAccounted).toEqual(inManifest);

    for (const id of inManifest) {
      const entry = accounted.permissions[id];
      if (!entry) {
        throw new Error(`missing accounting entry for ${id}`);
      }
      expect(entry.need.trim().length, `${id} need`).toBeGreaterThan(0);
      expect(entry.since.trim().length, `${id} since`).toBeGreaterThan(0);
    }
  });
});
