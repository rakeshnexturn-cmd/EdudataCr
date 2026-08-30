const { expect } = require('@playwright/test');
require('dotenv').config();
const TestData = require('../utils/test-data');
const Helpers = require('../utils/helpers');

class AccountPage {
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    // Wait for Lightning UI to render (not networkidle — SF has background connections)
    // Wait for a Salesforce-specific element that proves the page rendered
    console.log('[AccountPage] Waiting for Lightning UI to render...');
    try {
      await this.page.locator('.appLauncher, button[title="App Launcher"], .slds-context-bar, .oneAppNavBucket').first()
        .waitFor({ state: 'visible', timeout: 30000 });
      console.log('[AccountPage] Lightning UI rendered');
    } catch {
      console.log('[AccountPage] Lightning UI not found, waiting more...');
      await this.page.waitForTimeout(10000);
    }

    // Dismiss any error dialogs
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(1000);

    const activeApp = this.page.getByRole('heading', { name: 'Student Financials' }).first();
    if (!await activeApp.isVisible({ timeout: 3000 }).catch(() => false)) {
      await Helpers.navigateToApp(this.page, 'Student Financials');
    }

    // Step 3: Click Show Navigation Menu (hamburger button)
    console.log('[AccountPage] Looking for Show Navigation Menu...');
    const navMenuBtn = this.page.locator('button[title="Show Navigation Menu"]');
    const navVisible = await navMenuBtn.isVisible({ timeout: 10000 }).catch(() => false);
    console.log(`[AccountPage] Show Navigation Menu visible: ${navVisible}`);

    if (navVisible) {
      await navMenuBtn.click({ force: true });
      await this.page.waitForTimeout(2000);

      // Step 4: Click "Accounts" in the navigation menu
      const accountsMenuItem = this.page.locator('[role="menuitem"]:has-text("Accounts")').first();
      if (await accountsMenuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[AccountPage] Clicking Accounts in menu...');
        await accountsMenuItem.click({ force: true });
        await this.page.waitForTimeout(5000);
      }
    } else {
      console.log('[AccountPage] Show Navigation Menu NOT found');
    }

    // HEALED: Salesforce renders Table as exact popup text instead of option/menuitem.
    const listDisplay = this.page.getByRole('button', { name: 'Select list display' }).first();
    await expect(listDisplay).toBeVisible({ timeout: 10000 });
    await listDisplay.click();
    const tableOption = this.page.getByText('Table', { exact: true }).first();
    await expect(tableOption).toBeVisible({ timeout: 5000 });
    await tableOption.click();
    await this.page.waitForTimeout(2000);

    console.log(`[AccountPage] URL: ${this.page.url()}`);
  }

  async clickNew() {
    // HEALED: The live list exposes New directly or after expanding Show more actions.
    const newButton = this.page.getByRole('button', { name: /^new$/i }).first();
    if (!await newButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const actions = this.page.getByRole('button', { name: 'Show more actions' }).first();
      await expect(actions).toBeVisible({ timeout: 10000 });
      await actions.click();
    }
    await expect(newButton).toBeVisible({ timeout: 10000 });
    await newButton.click();
    await this.page.waitForTimeout(5000);
  }

  async selectPersonAccountRecordType() {
    // Step 7: Select Person Account (the 6th record type)
    // Use the specific value for Person Account record type
    const personAccountRadio = this.page.locator('xpath=//input[@value="012f60000030z8KAAQ"]').first();
    if (await personAccountRadio.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[AccountPage] Selecting Person Account by value...');
      await personAccountRadio.click({ force: true });
      await this.page.waitForTimeout(1000);
    } else {
      // Fallback: click the label containing "Person Account" text
      const personLabel = this.page.locator('xpath=//label[contains(., "Person Account")]').first();
      if (await personLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[AccountPage] Selecting Person Account by label text...');
        await personLabel.click({ force: true });
        await this.page.waitForTimeout(1000);
      } else {
        throw new Error('Person Account record type not found');
      }
    }

    // Step 8: Click Next
    const nextBtn = this.page.locator('xpath=//span[contains(text(),"Next")]').first();
    if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[AccountPage] Clicking Next...');
      await nextBtn.click({ force: true });
      await this.page.waitForTimeout(8000);
    } else {
      throw new Error('Next button not found');
    }

    console.log(`[AccountPage] URL after Next: ${this.page.url()}`);
  }

  async fillAccountDetails(data = {}) {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);

    // HEALED: Person Account forms expose separate accessible First Name and Last Name fields.
    const firstName = this.page.getByRole('textbox', { name: 'First Name' });
    await expect(firstName).toBeVisible({ timeout: 10000 });
    await firstName.fill(data.firstName || TestData.student.firstName);
    const lastName = this.page.getByRole('textbox', { name: 'Last Name' });
    await lastName.fill(data.lastName || TestData.student.lastName);

    const email = this.page.getByRole('textbox', { name: 'Email' });
    if (await email.isVisible({ timeout: 3000 }).catch(() => false)) {
      await email.fill(data.email || TestData.student.email);
    }

    // Fill Phone
    const phoneInput = this.page.locator('input[name="Phone"]');
    if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await phoneInput.fill(data.phone || TestData.student.phone);
    }

    // Fill Website
    const websiteInput = this.page.locator('input[name="Website"]');
    if (await websiteInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await websiteInput.fill('https://www.test.edu');
    }

    // Fill Institution Code
    const instInput = this.page.locator('input[name="Institution_Code__c"]');
    if (await instInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await instInput.fill(TestData.institute.id);
    }

    // Fill Billing Address
    await this.fillAddress('Billing');
    await this.fillAddress('Shipping');
  }

  async fillAddress(type) {
    const prefix = type.toLowerCase();
    const streetInput = this.page.locator(`input[name="street"]`).nth(type === 'Billing' ? 0 : 1);
    const cityInput = this.page.locator(`input[name="city"]`).nth(type === 'Billing' ? 0 : 1);
    const postalInput = this.page.locator(`input[name="postalCode"]`).nth(type === 'Billing' ? 0 : 1);
    const countryInput = this.page.locator(`input[name="country"]`).nth(type === 'Billing' ? 0 : 1);

    if (await streetInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await streetInput.fill(TestData.billing.street || '123 Test Street');
    }
    if (await cityInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cityInput.fill(TestData.billing.city || 'Test City');
    }
    if (await postalInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await postalInput.fill(TestData.billing.postalCode || '12345');
    }
    if (await countryInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await countryInput.fill(TestData.billing.country || 'US');
    }
  }

  async save() {
    // Step 9: Click Save button
    const saveBtn = this.page.locator('button[name="SaveEdit"]');
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[AccountPage] Clicking Save...');
      await saveBtn.click();
      await this.page.waitForTimeout(5000);
    } else {
      throw new Error('Save button not found');
    }

    // Wait for navigation to record page
    try {
      await this.page.waitForURL(/\/view/, { timeout: 15000 });
    } catch {
      console.log('[AccountPage] No URL change after save');
    }
    await this.page.waitForTimeout(3000);
    console.log(`[AccountPage] URL after save: ${this.page.url()}`);
  }

  async verifyAccountCreated(lastName = TestData.student.lastName) {
    // HEALED: Generic Salesforce header selectors match the list-view header as well as the record title.
    const titleLocator = this.page.getByText(new RegExp(`${lastName}$`, 'i')).last();
    await expect(titleLocator).toBeVisible({ timeout: 15000 });
    const title = await titleLocator.textContent();
    expect(title).toContain(lastName);
  }

  async openByName(accountName) {
    await this.navigate();
    const search = this.page.getByRole('searchbox').first();
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.fill(accountName);
    const result = this.page.getByRole('link', { name: new RegExp(accountName, 'i') }).first();
    await expect(result).toBeVisible({ timeout: 15000 });
    // HEALED: Split view can leave the list URL after a link click; direct navigation opens the stable Account record page.
    const accountHref = await result.getAttribute('href');
    if (!accountHref) {
      await result.click({ force: true });
    } else {
      await this.page.goto(new URL(accountHref, this.page.url()).toString(), {
        waitUntil: 'commit',
        timeout: 60000,
      });
    }
    await expect(this.page.getByRole('link', { name: new RegExp(accountName, 'i') }).last()).toBeVisible({ timeout: 30000 });
  }

  async getAccountName() {
    // HEALED: Read the record title instead of the duplicate Recently Viewed header.
    const title = this.page.getByText(new RegExp(`${TestData.student.lastName}$`, 'i')).last();
    await expect(title).toBeVisible({ timeout: 15000 });
    return await title.textContent();
  }

  async getAccountId() {
    const url = this.page.url();
    const match = url.match(/\/([a-zA-Z0-9]{18})\//);
    return match ? match[1] : null;
  }
}

module.exports = AccountPage;
