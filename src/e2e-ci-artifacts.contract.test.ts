import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("E2E CI artifact transport", () => {
  it("keeps native-1× serial Chromium execution policy in Playwright config", () => {
    const playwrightConfig = readFileSync(path.join(repoRoot, "playwright.config.ts"), "utf8");

    expect(playwrightConfig).toMatch(/workers: 1/);
    expect(playwrightConfig).toMatch(/fullyParallel: false/);
    expect(playwrightConfig).toMatch(/retries: 0/);
    expect(playwrightConfig).toMatch(/name: "chromium"/);
    expect(playwrightConfig).toMatch(/deviceScaleFactor: 1/);
    expect(playwrightConfig).toMatch(/viewport: null/);
  });

  it("retains trace, video, and failure screenshots on failure only", () => {
    const playwrightConfig = readFileSync(path.join(repoRoot, "playwright.config.ts"), "utf8");

    expect(playwrightConfig).toMatch(/trace: "retain-on-failure"/);
    expect(playwrightConfig).toMatch(/video: "retain-on-failure"/);
    expect(playwrightConfig).toMatch(/screenshot: "only-on-failure"/);
  });

  it("always uploads review scenes and uploads failure diagnostics separately", () => {
    const ci = readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
    const e2eJob = ci.slice(ci.indexOf("  e2e:"));

    expect(e2eJob).toContain("npm run test:evidence");
    expect(e2eJob).toMatch(/name: e2e-review-scenes/);
    expect(e2eJob).toMatch(/path: e2e-screenshots\//);
    expect(e2eJob).toMatch(/if: \$\{\{ !cancelled\(\) \}\}/);

    const failureUploadSections = e2eJob.split("if: failure()");
    expect(failureUploadSections.length).toBeGreaterThanOrEqual(3);

    expect(e2eJob).toMatch(/name: e2e-playwright-report/);
    expect(e2eJob).toMatch(/path: playwright-report\//);
    expect(e2eJob).toMatch(/name: e2e-test-results/);
    expect(e2eJob).toMatch(/path: test-results\//);

    expect(e2eJob).not.toMatch(/name: e2e-screenshots/);
  });
});
