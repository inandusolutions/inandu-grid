import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the `grid-app` demo — drives the real, built demo app (not a mock/harness) in a
 * real browser via Playwright, exercising `inandu-grid` the way a consumer's app actually would.
 * Complements the Karma/Jasmine unit specs (`inandu-grid.component.spec.ts`), which construct the
 * component directly through TestBed — these instead click/type against the rendered page, so they
 * catch things unit tests structurally can't (real drag-and-drop gestures, actual browser focus/
 * keyboard event dispatch, CSS actually being loaded and applied).
 *
 * `webServer` starts `npm start` (which itself runs `ng build inandu-grid && ng serve` — see
 * package.json) and waits for it to answer before running any test; `reuseExistingServer` skips
 * that startup in local dev if a server is already listening on `url` (CI always starts fresh).
 * Port 4202 is deliberately non-default (4200) so this doesn't collide with a `ng serve` a
 * developer already has running locally.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4202',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Builds the library first — the demo resolves the `@inandu-solutions/grid-angular` import from
    // `dist/inandu-grid` (see CONTRIBUTING.md's build-order note), which doesn't exist on a clean checkout/CI.
    command: 'npx ng build inandu-grid && npx ng serve --port 4202',
    url: 'http://localhost:4202',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
