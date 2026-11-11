import { defineConfig, devices } from "@playwright/test";

/**
 * MiniStore E2E configuration.
 *
 * Prerequisites (the webServer block does NOT migrate or seed):
 *   cd api
 *   uv run alembic upgrade head
 *   uv run python -m app.seed
 *
 * Then, from `web/`:
 *   npx playwright install chromium
 *   npm run e2e
 *
 * Set `E2E_BASE_URL` to test an already-running deployment. When it is set,
 * Playwright still starts the local servers unless they are already listening
 * on the configured ports (reuseExistingServer is enabled outside CI).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  // The smoke suite shares one seeded SQLite database and creates real sales /
  // products, so run files serially by default. Opt into parallelism only with
  // a database that is safe for concurrent writers.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "uv run uvicorn app.main:app --port 8000",
      cwd: "../api",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npm run dev",
      cwd: ".",
      url: "http://127.0.0.1:3000/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
