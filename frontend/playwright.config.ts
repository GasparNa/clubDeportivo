import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  reporter: [["list"], ["html", { outputFolder: "playwright-report" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 20000,
    isMobile: false,
    video: "retain-on-failure",
    trace: "retain-on-failure",

  },

  // ===== Projects =====
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});