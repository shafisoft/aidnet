import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Load .env.local (no dotenv dep in devDeps) so API-contract helpers in
// tests/e2e/lib/api.ts see NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY.
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const AUTH_DIR = 'tests/e2e/.auth'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Workers must be 1: several specs share the single seeded system admin
  // and the /admin/org-requests review list, so parallel workers race on
  // each other's pending requests.
  workers: process.env.CI ? 1 : 1,
  reporter: 'html',
  timeout: 60000,
  // Ensures required seed data (auth users, demo org, campaigns, plans) exists
  // before the auth.setup project logs in and before any spec runs.
  globalSetup: './tests/e2e/global-setup.mjs',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Authenticates all roles once; writes storage states used by specs.
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'] },
    },
    {
      // Mobile coverage is scoped to genuinely mobile-specific behavior
      // (responsive layout). The 20 other specs are viewport-agnostic user
      // journeys already exercised on chromium; re-running all of them under
      // Chrome mobile emulation exhausts machine memory ~test 140 and silently
      // drops the tail as "did not run" (dead tests). Scoping to responsive
      // keeps every scheduled mobile test runnable and meaningful.
      name: 'Mobile Chrome',
      dependencies: ['setup'],
      testMatch: /tests\/e2e\/responsive\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      dependencies: ['setup'],
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    // serve@14 pinned: newer majors 308-redirect trailing-slash URLs,
    // which breaks the static export (trailingSlash:true) pages.
    command: 'npx -y serve@14 out -l 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
