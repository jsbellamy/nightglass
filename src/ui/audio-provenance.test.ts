import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import provenance from "../../assets-raw/audio-provenance.json";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("audio provenance", () => {
  it("records CC0 entries with SHA-256 digests matching committed audio bytes", () => {
    for (const entry of provenance.files) {
      expect(entry.license.toLowerCase()).toContain("cc0");
      const bytes = readFileSync(join(repoRoot, entry.path));
      const digest = createHash("sha256").update(bytes).digest("hex");
      expect(digest).toBe(entry.sha256);
    }
  });
});
