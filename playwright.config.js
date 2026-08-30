// HEALED: Resolve browsers from the deployed app bundle on Render.
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // HEALED: JWT frontdoor authentication and Lightning bootstrap can exceed Playwright's 30-second default.
  timeout: 120000,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: process.env.SF_BASE_URL,
    headless: process.env.HEADLESS !== 'false',
    // HEALED: Match a 14-inch laptop viewport and keep Salesforce list controls in view.
    viewport: { width: 1366, height: 768 },
    actionTimeout: 30000,
    navigationTimeout: 60000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    slowMo: parseInt(process.env.SLOW_MO || '0'),
      permissions: [],
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'tc01_full_e2e',
      testMatch: /tc01.*\.spec\.js/,
      dependencies: ['setup'],
    },
    {
      name: 'tc02_existing_person',
      testMatch: /tc02.*\.spec\.js/,
      dependencies: ['setup'],
    },
  ],
});
