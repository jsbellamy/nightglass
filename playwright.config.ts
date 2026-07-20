import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  use: {
    baseURL: "http://127.0.0.1:4173",
    // Native-1× rendering is itself an acceptance criterion.
    deviceScaleFactor: 1,
    viewport: null,
  },
  webServer: {
    command: "npm run build:evidence && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
