import { defineConfig, devices } from '@playwright/test';

// Team Gamma γ3 — Playwright config.
// Two projects: default-motion + reduced-motion. The accessibility CI gate
// runs every test in BOTH projects so we never ship a regression that only
// affects one motion mode.

const PORT = Number(process.env.MARKETING_PORT ?? 5175);
const BASE_URL = process.env.MARKETING_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/a11y',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    colorScheme: 'dark',
  },
  projects: [
    {
      name: 'chromium-default-motion',
      use: {
        ...devices['Desktop Chrome'],
        // Default browser motion behavior (no override).
        contextOptions: { reducedMotion: 'no-preference' },
      },
    },
    {
      name: 'chromium-reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        // Force `prefers-reduced-motion: reduce` so all axe scans + keyboard
        // checks run against the reduced-motion code path.
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
  ],
  webServer: {
    // Run from the repo root so the workspace flag resolves; CI may also pass
    // PLAYWRIGHT_SKIP_WEBSERVER=1 to reuse an already-running dev server.
    command: process.env.PLAYWRIGHT_WEB_COMMAND ?? 'npm run -w marketing dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
