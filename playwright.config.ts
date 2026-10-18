import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import { execSync } from "node:child_process";

// S'assure que les 3 builds de test sont présents
if (
  !fs.existsSync(".agents/state/test-builds/local/index.html") ||
  !fs.existsSync(".agents/state/test-builds/cloud/index.html") ||
  !fs.existsSync(".agents/state/test-builds/cloud-unconfigured/index.html")
) {
  execSync("node scripts/prepare-test-builds.mjs", { stdio: "inherit" });
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: [
    {
      command: "npx serve .agents/state/test-builds/local --listen 4173",
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npx serve .agents/state/test-builds/cloud --listen 4174",
      port: 4174,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npx serve .agents/state/test-builds/cloud-unconfigured --listen 4175",
      port: 4175,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
