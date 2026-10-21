import { defineConfig, devices } from "@playwright/test"

// E2E runs its own backend + frontend on their own ports and its own database
// (togena_e2e), so it never touches the dev servers (3050/4050) or worktree
// slots (3050+10N). Rules for writing tests: docs/E2E.md.
const backendPort = Number(process.env.E2E_BACKEND_PORT ?? 4190)
const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? 3190)
const backendUrl = `http://localhost:${backendPort}`
const frontendUrl = `http://localhost:${frontendPort}`
const isCi = !!process.env.CI

export default defineConfig({
  testDir: "./tests",
  // Tests share one seeded database: run them one after another.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: isCi
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendUrl,
    // English UI: the browser language decides on the first visit.
    locale: "en-GB",
    timezoneId: "Europe/Prague",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Only tests tagged @mobile run here — the flows participants use on a phone.
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      // Resets togena_e2e, migrates, seeds, then starts the built backend.
      command: "node scripts/start-backend.mjs",
      url: `${backendUrl}/api/health`,
      timeout: 240_000,
      reuseExistingServer: false,
      stdout: "pipe",
      env: {
        E2E_BACKEND_PORT: String(backendPort),
        E2E_FRONTEND_URL: frontendUrl,
      },
    },
    {
      // A production build of the frontend pointed at the E2E backend.
      command: `pnpm --filter frontend exec vite build --outDir build-e2e && pnpm --filter frontend exec vite preview --outDir build-e2e --port ${frontendPort} --strictPort`,
      url: frontendUrl,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: `${backendUrl}/api`,
        VITE_BETTER_AUTH_URL: backendUrl,
      },
    },
  ],
})
