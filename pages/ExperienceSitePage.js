const { expect } = require('@playwright/test');
const TestData = require('../utils/test-data');
const Helpers = require('../utils/helpers');

class ExperienceSitePage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Impersonate student from the Person Account page.
   * Uses the "Log in to Experience as User" action from the dropdown menu.
   *
   * This is the ONLY way to access the Experience Site — no separate login.
   * The admin is already authenticated (via OAuth2), so clicking this button
   * creates a session as the student without any MFA prompt.
   */
  async impersonateFromPersonAccount(page) {
    console.log('[ExperienceSitePage] Looking for impersonation button...');

    // Click the action dropdown (the small arrow/dots button in the page header)
    const moreActionsBtn = page.locator(
      'button[title="Show More"], ' +
      'button.slds-button_icon[aria-label*="more" i], ' +
      '.forceActionsDock button:last-child, ' +
      'button[title="Show actions"]'
    ).first();

    if (await moreActionsBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await moreActionsBtn.click();
      await page.waitForTimeout(1500);
    }

    // Find and click "Log in to Experience as User"
    const impersonateOptions = [
      'Log in to Experience as User',
      'Log in as User',
      'Login as Experience User',
      'Log in to Experience',
    ];

    for (const option of impersonateOptions) {
      const btn = page.getByRole('menuitem', { name: new RegExp(option, 'i') }).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[ExperienceSitePage] Found: "${option}" — clicking...`);
        await btn.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(5000);

        // Verify we're on the Experience Site
        const currentUrl = page.url();
        if (currentUrl.includes('force.com') || currentUrl.includes('experience') ||
            currentUrl.includes('sfsites') || currentUrl.includes('community')) {
          console.log('[ExperienceSitePage] Successfully impersonated on Experience Site');
          return true;
        }
      }
    }

    // Fallback: try finding via text content
    const allMenuItems = page.locator('[role="menuitem"], [role="option"], a, button');
    const count = await allMenuItems.count();
    for (let i = 0; i < count; i++) {
      const text = await allMenuItems.nth(i).textContent().catch(() => '');
      if (text.toLowerCase().includes('log in to experience') ||
          text.toLowerCase().includes('log in as')) {
        await allMenuItems.nth(i).click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(5000);
        console.log('[ExperienceSitePage] Impersonation triggered via fallback');
        return true;
      }
    }

    console.error('[ExperienceSitePage] Could not find impersonation option');
    return false;
  }

  /**
   * Navigate to Student Financial section on the Experience Site.
   */
  async navigateToStudentFinancial() {
    const navItems = ['Student Financial', 'Financial', 'My Financial', 'Billing'];
    
    for (const item of navItems) {
      const navLink = this.page.getByRole('link', { name: new RegExp(item, 'i') }).first();
      if (await navLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await navLink.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(2000);
        console.log(`[ExperienceSitePage] Navigated to: ${item}`);
        return;
      }
    }

    // Fallback: scan all navigation links
    const allLinks = this.page.locator('nav a, .slds-nav-vertical a, [role="navigation"] a');
    const count = await allLinks.count();
    for (let i = 0; i < count; i++) {
      const text = await allLinks.nth(i).textContent().catch(() => '');
      if (text.toLowerCase().includes('financial') || text.toLowerCase().includes('billing')) {
        await allLinks.nth(i).click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(2000);
        console.log(`[ExperienceSitePage] Navigated to: ${text.trim()}`);
        return;
      }
    }
  }

  async viewInvoice() {
    const invoiceTable = this.page.locator('table, .slds-table, lightning-datatable');
    await expect(invoiceTable).toBeVisible({ timeout: 10000 });
    const invoiceRow = invoiceTable.locator('tr, [role="row"]').first();
    return await invoiceRow.textContent();
  }

  async clickPayNow() {
    const payNowBtn = this.page.getByRole('button', { name: /pay now|pay/i }).first();
    await expect(payNowBtn).toBeVisible({ timeout: 10000 });
    await payNowBtn.click();
    await this.page.waitForTimeout(3000);
  }

  async getAmountDue() {
    const amountDue = this.page.locator(
      '.slds-form-element:has-text("Amount Due") .slds-form-element__static, ' +
      '.slds-form-element:has-text("Balance") .slds-form-element__static'
    ).first();
    if (await amountDue.isVisible({ timeout: 5000 }).catch(() => false)) {
      return await amountDue.textContent();
    }
    return null;
  }

  async verifyStudentFinancialPage() {
    const pageContent = await this.page.content();
    const hasInvoice = pageContent.toLowerCase().includes('invoice') ||
                       pageContent.toLowerCase().includes('amount');
    expect(hasInvoice).toBeTruthy();
  }
}

module.exports = ExperienceSitePage;
