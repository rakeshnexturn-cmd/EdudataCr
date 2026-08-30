const { expect } = require('@playwright/test');
require('dotenv').config();

const Helpers = {
  async navigateToApp(page, appName) {
    // HEALED: Use the App Launcher search so Salesforce app selection is role-based.
    let appLauncherButton = page.locator('[title="App Launcher"]').first();
    if (await appLauncherButton.count() === 0) {
      appLauncherButton = page.getByRole('button', { name: /App Launcher/i }).first();
    }
    await expect(appLauncherButton).toBeVisible({ timeout: 20000 });
    await appLauncherButton.click({ timeout: 10000 });

    const appSearchInput = page.getByPlaceholder(/search apps and items...|search/i).first();
    await expect(appSearchInput).toBeVisible({ timeout: 20000 });
    await appSearchInput.fill(appName, { timeout: 5000 });

    await page.waitForTimeout(500);
    const appOption = page.getByRole('option', { name: new RegExp(`^${appName}$`, 'i') }).first();
    await expect(appOption).toBeVisible({ timeout: 20000 });
    await appOption.click({ timeout: 10000 });
    await this.waitForSalesforceLoad(page);
  },

  async waitForSalesforceLoad(page) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  },

  async clickQuickAction(page, actionName) {
    const button = page.getByRole('button', { name: new RegExp(actionName, 'i') });
    await button.first().click();
    await page.waitForTimeout(1000);
  },

  async selectRecordType(page, recordTypeName) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Try clicking the label text for the record type (more reliable than radio button)
    const label = page.locator(`label:has-text("${recordTypeName}")`).first();
    if (await label.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`[Helpers] Clicking record type label: ${recordTypeName}`);
      await label.click({ force: true });
      await page.waitForTimeout(1000);
    } else {
      // Fallback: click the radio button
      const option = page.getByRole('radio', { name: new RegExp(recordTypeName, 'i') });
      if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[Helpers] Clicking record type radio: ${recordTypeName}`);
        await option.click({ force: true });
        await page.waitForTimeout(1000);
      } else {
        // Last resort: click any element containing the text
        const textEl = page.locator(`text="${recordTypeName}"`).first();
        if (await textEl.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log(`[Helpers] Clicking record type text: ${recordTypeName}`);
          await textEl.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }
    }
    
    // Click Next button
    const nextBtn = page.getByRole('button', { name: /next/i });
    if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[Helpers] Clicking Next button...');
      await nextBtn.click();
      await page.waitForTimeout(3000);
    }
  },

  async fillLightningInput(page, label, value) {
    const field = page.locator(`lightning-input[field-label="${label}"] input, 
      lightning-textarea[field-label="${label}"] textarea,
      .slds-form-element:has-text("${label}") input,
      .slds-form-element:has-text("${label}") textarea`).first();
    if (await field.isVisible({ timeout: 5000 }).catch(() => false)) {
      await field.clear();
      await field.fill(value);
    }
  },

  async selectLookupField(page, label, searchValue) {
    const lookupContainer = page.locator(`lightning-grouped-combobox, 
      lightning-record-picker,
      .slds-combobox:has-text("${label}"),
      .slds-form-element:has-text("${label}")`).first();
    
    const input = lookupContainer.locator('input').first();
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await input.click();
      await input.fill(searchValue);
      await page.waitForTimeout(2000);
      
      const option = page.getByRole('option', { name: new RegExp(searchValue, 'i') }).first();
      if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
        await option.click();
      }
      await page.waitForTimeout(500);
    }
  },

  async fillAddressField(page, label, searchValue) {
    const addressSection = page.locator(`.slds-form-element:has-text("${label}")`).first();
    const searchInput = addressSection.locator('input[placeholder*="search" i], input[placeholder*="Search" i], input').first();
    
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.fill(searchValue);
      await page.waitForTimeout(2000);
      
      const suggestion = page.getByRole('option').first();
      if (await suggestion.isVisible({ timeout: 5000 }).catch(() => false)) {
        await suggestion.click();
      }
      await page.waitForTimeout(500);
    }
  },

  async saveRecord(page) {
    const safePageUrl = () => {
      try {
        return page && typeof page.url === 'function' ? page.url() : '(page unavailable)';
      } catch {
        return '(page unavailable)';
      }
    };

    const saveBtn = page.getByRole('button', { name: /^save$/i }).first();
    try {
      await saveBtn.click({ timeout: 10000 });
      console.log('[Helpers] Save button clicked');
    } catch (e) {
      console.log('[Helpers] Save button click failed:', e.message.split('\n')[0]);
      return;
    }

    try {
      await page.waitForURL(/\/view$|\/edit$|\/list/, { timeout: 15000 });
      console.log('[Helpers] Navigation detected after save');
    } catch {
      console.log('[Helpers] No navigation detected, waiting...');
    }

    try {
      if (typeof page.isClosed === 'function' && page.isClosed()) {
        console.log('[Helpers] Page closed after save. Skipping extra wait.');
        return;
      }
      await page.waitForTimeout(3000);
      console.log(`[Helpers] After save, URL: ${safePageUrl()}`);
    } catch (error) {
      console.log('[Helpers] Save wait skipped because page was closed or unavailable:', error.message.split('\n')[0]);
    }
  },

  async toastMessage(page) {
    const toast = page.locator('.slds-notify__title, .slds-alert__content, [data-aura-rendered-by] .toastMessage');
    await toast.first().waitFor({ state: 'visible', timeout: 15000 });
    return await toast.first().textContent();
  },

  async navigateToObject(page, objectName) {
    const launcher = page.getByRole('button', { name: 'App Launcher' }).first();
    const activeApp = page.getByRole('heading', { name: 'Student Financials' }).first();
    // HEALED: Do not reopen the App Launcher when already inside Student Financials.
    if (!await activeApp.isVisible({ timeout: 3000 }).catch(() => false) &&
      await launcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await launcher.click();
      const appLink = page.getByRole('link', { name: /Student Financials/i }).first();
      if (await appLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await appLink.click();
      }
      await page.keyboard.press('Escape');
    }

    const navButton = page.getByRole('button', { name: 'Show Navigation Menu' }).first();
    await expect(navButton).toBeVisible({ timeout: 15000 });
    // HEALED: Lightning can drop the first menu click while split-view tabs are settling.
    await navButton.click({ force: true });
    // HEALED: Lightning renders navigation entries as menuitems, links, or exact text by view.
    const namePattern = new RegExp(`^${objectName}$`, 'i');
    const menuItem = page.getByRole('menuitem', { name: namePattern }).first();
    const navLink = page.getByRole('link', { name: namePattern }).first();
    const navText = page.getByText(objectName, { exact: true }).first();
    // HEALED: Retry the menu click when Lightning drops it during workspace-tab updates.
    let menuOpened = false;
    for (let attempt = 0; attempt < 3 && !menuOpened; attempt++) {
      if (attempt > 0) {
        await navButton.click({ force: true });
      }
      menuOpened = await expect.poll(async () =>
        await menuItem.isVisible().catch(() => false) ||
        await navLink.isVisible().catch(() => false) ||
        await navText.isVisible().catch(() => false),
      { timeout: 4000 }).toBeTruthy().then(() => true).catch(() => false);
    }
    expect(menuOpened).toBeTruthy();
    if (await menuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuItem.click();
    } else if (await navLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await navLink.click();
    } else {
      await expect(navText).toBeVisible({ timeout: 5000 });
      await navText.click();
    }
    await expect(page.getByRole('heading', { name: new RegExp(objectName, 'i') }).first()).toBeVisible({ timeout: 15000 });
  },

  async waitForSpinner(page) {
    try {
      await page.locator('.slds-spinner, .spinner, [class*="loading"]').first()
        .waitFor({ state: 'hidden', timeout: 30000 });
    } catch {
      // spinner not found or already hidden
    }
  },

  async clickRelatedTab(page, tabName) {
    const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
    await tab.first().click();
    await page.waitForTimeout(2000);
  },

  async clickButton(page, buttonName) {
    const btn = page.getByRole('button', { name: new RegExp(buttonName, 'i') }).first();
    await btn.click();
    await page.waitForTimeout(2000);
  },

  async selectComboBox(page, label, value) {
    const combo = page.locator(`lightning-combobox, .slds-combobox:has-text("${label}")`).first();
    const trigger = combo.locator('button, [role="combobox"]').first();
    
    if (await trigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trigger.click();
      await page.waitForTimeout(500);
      
      const option = page.getByRole('option', { name: new RegExp(value, 'i') }).first();
      await option.click();
      await page.waitForTimeout(500);
    }
  },

  async verifyFieldValue(page, label, expectedValue) {
    const field = page.locator(`.slds-form-element:has-text("${label}")`).first();
    const valueEl = field.locator('.slds-form-element__static, span, .test-id__field-value').first();
    const text = await valueEl.textContent();
    expect(text.trim()).toContain(expectedValue);
  },

  async goToRecordPage(page, objectName, recordName) {
    await this.navigateToObject(page, objectName);
    await page.getByRole('link', { name: recordName }).first().click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  },

  async searchAndGetResult(page, searchTerm) {
    const globalSearch = page.locator('input[placeholder*="Search" i], input.slds-input[title="Search"]');
    await globalSearch.first().click();
    await globalSearch.first().fill(searchTerm);
    await page.waitForTimeout(2000);
    
    const result = page.getByRole('option', { name: new RegExp(searchTerm, 'i') }).first();
    if (await result.isVisible({ timeout: 5000 }).catch(() => false)) {
      await result.click();
      await page.waitForLoadState('domcontentloaded');
    }
  },
};

module.exports = Helpers;
