import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "apps/server/.env.test") });

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./playwright/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun dev:server",
      url: "http://localhost:3001/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: process.env.DATABASE_URL!,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
        CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
      },
    },
    {
      command: "bun dev:client",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
