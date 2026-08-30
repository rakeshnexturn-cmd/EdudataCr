const { expect } = require('@playwright/test');
const TestData = require('../utils/test-data');
const sessionManager = require('../utils/session-manager');

class LoginPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Login as admin using OAuth2 (Client Credentials Flow).
   * Completely bypasses MFA — no verification code needed.
   * Injects session into browser via frontdoor.jsp.
   */
  async loginAsAdmin() {
    console.log('[LoginPage] Authenticating via OAuth2 (MFA bypass)...');
    const sessionData = await sessionManager.loginAsAdmin();
    await sessionManager.performBrowserLogin(this.page, sessionData, TestData.urls.base);
    console.log('[LoginPage] Admin login complete');
  }

  /**
   * Navigate to Experience Site and impersonate the student
   * via "Log in to Experience as User" on the Person Account page.
   *
   * This is the ONLY way to access the community — no separate login.
   */
  async impersonateStudentFromAccountPage(accountPageUrl) {
    console.log('[LoginPage] Navigating to Person Account for impersonation...');
    await this.page.goto(accountPageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForTimeout(2000);

    // Click the action dropdown menu
    const dropdownBtn = this.page.locator('button[title="Show More"], button[slds-button_icon-name="utilitydown"]').first();
    if (await dropdownBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await dropdownBtn.click();
      await this.page.waitForTimeout(1000);
    }

    // Click "Log in to Experience as User"
    const impersonateBtn = this.page.getByRole('menuitem', { name: /log in to experience|log in as/i }).first();
    if (await impersonateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await impersonateBtn.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(5000);
      console.log('[LoginPage] Impersonating student on Experience Site');
      return true;
    }

    console.log('[LoginPage] Could not find impersonation button');
    return false;
  }

  /**
   * Navigate directly to the Experience Site and log in with student credentials.
   * Used when impersonation is not available.
   */
  async loginAsStudent() {
    console.log('[LoginPage] Logging into Experience Site as student...');
    await this.page.goto(TestData.urls.community, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.page.waitForTimeout(3000);
  }

  async verifyLoginSuccess() {
    await this.page.waitForTimeout(3000);

    const url = this.page.url();
    console.log(`[LoginPage] Current URL: ${url}`);

    // If we're NOT on a login page, we're logged in
    if (!url.includes('/login') && !url.includes('/Login') && !url.includes('login.salesforce.com')) {
      console.log('[LoginPage] Login verified — not on login page');
      return;
    }

    // Fallback: check for any Salesforce UI element
    await expect(
      this.page.locator('#username').first()
    ).not.toBeVisible({ timeout: 10000 });
  }

  async isMfaPage() {
    return await this.page.locator('text=Verify Your Identity, text=Verification Code')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
  }
}

module.exports = LoginPage;
