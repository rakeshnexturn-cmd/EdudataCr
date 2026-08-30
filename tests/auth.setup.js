const { test: setup } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const TestData = require('../utils/test-data');

const adminAuthFile = 'tests/.auth/admin.json';

/**
 * Seed Test: Authenticates as admin via OAuth2 Client Credentials Flow.
 * Saves storageState at Account list view so TC01 starts at the right place.
 */
setup('authenticate as admin', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.loginAsAdmin();
  await loginPage.verifyLoginSuccess();

  // Navigate to Account list view so storageState is saved at the right place
  const domain = process.env.SF_BASE_URL.replace('.my.salesforce.com', '.lightning.force.com');
  const accountListUrl = `${domain}/lightning/o/Account/list?filterName=__Recent`;

  // Wait for Lightning UI to be ready
  try {
    await page.locator('.appLauncher, button[title="App Launcher"]').first()
      .waitFor({ state: 'visible', timeout: 30000 });
    console.log('[Setup] Lightning UI ready');
  } catch {
    console.log('[Setup] Lightning UI wait timeout, continuing...');
  }

  // Navigate to Accounts list using window.location
  await page.evaluate((url) => { window.location.href = url; }, accountListUrl);
  await page.waitForLoadState('load');
  await page.waitForTimeout(5000);

  // If SPA didn't navigate, try show navigation menu
  if (!page.url().includes('/Account/list')) {
    console.log('[Setup] Direct nav failed, trying nav menu...');
    const navMenuBtn = page.locator('button[title="Show Navigation Menu"]');
    if (await navMenuBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await navMenuBtn.click({ force: true });
      await page.waitForTimeout(2000);
      const accountsMenuItem = page.locator('[role="menuitem"]:has-text("Accounts")').first();
      if (await accountsMenuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await accountsMenuItem.click({ force: true });
        await page.waitForTimeout(5000);
      }
    }
  }

  console.log(`[Setup] Final URL: ${page.url()}`);
  await page.context().storageState({ path: adminAuthFile });
  console.log('[Setup] Admin session saved');
});
