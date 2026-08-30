const { expect } = require('@playwright/test');
const TestData = require('../utils/test-data');
const Helpers = require('../utils/helpers');

class AcademicOrderPage {
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    // HEALED: A dedicated page starts at about:blank, whose URL origin is null.
    const currentUrl = this.page.url();
    const baseUrl = currentUrl.startsWith('http') ? new URL(currentUrl).origin : TestData.urls.base;
    await this.page.goto(`${baseUrl}/lightning/o/AcademicOrder/list?filterName=__Recent`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await expect(this.page.getByRole('heading', { name: /academic orders/i }).first()).toBeVisible({ timeout: 20000 });
  }

  async clickNew() {
    const newButton = this.page.locator('a[title="New"], button').filter({ hasText: /^new$/i }).first();
    await expect(newButton).toBeVisible({ timeout: 20000 });
    await expect(newButton).toBeEnabled({ timeout: 20000 });
    // HEALED: Lightning workspace overlays can block Playwright's pointer click on this anchor after list navigation.
    await newButton.dispatchEvent('click');
    await expect(this.page.getByRole('heading', { name: /new academic order/i }).first()).toBeVisible({ timeout: 30000 });
  }

  async fillAcademicOrderDetails(orderNumber) {
    const objectPicker = this.page.locator('lightning-base-combobox').first().locator('button').first();
    await expect(objectPicker).toBeVisible({ timeout: 20000 });
    await objectPicker.click({ force: true });

    const academicYearOption = this.page.getByText('Academic Year', { exact: true }).last();
    await expect(academicYearOption).toBeVisible({ timeout: 20000 });
    await academicYearOption.click();

    const academicInterval = this.page.getByRole('combobox', { name: /academic interval/i }).first();
    await expect(academicInterval).toBeVisible({ timeout: 20000 });
    await academicInterval.click();
    await academicInterval.fill('2025-2026');

    // HEALED: Typing the interval value leaves the required picklist invalid until its role=option result is selected.
    const intervalValue = this.page.getByRole('option', { name: '2025-2026', exact: true }).first();
    if (await intervalValue.isVisible({ timeout: 5000 }).catch(() => false)) {
      await intervalValue.click();
    } else {
      // HEALED: Some Lightning renders expose the picklist result as exact visible text without role=option.
      const intervalText = this.page.getByText('2025-2026', { exact: true }).last();
      await expect(intervalText).toBeVisible({ timeout: 20000 });
      await intervalText.click({ force: true });
    }

    const orderInput = this.page.getByRole('combobox', { name: /^order$/i }).first();
    await expect(orderInput).toBeVisible({ timeout: 20000 });
    await orderInput.evaluate((el) => {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.focus();
    });
    await orderInput.click({ force: true });
    await orderInput.fill(orderNumber, { force: true });

        // HEALED: Salesforce renders the matching lookup record as a semantic option containing the order and account name.
        const orderOption = this.page.getByRole('option', { name: new RegExp(`^${orderNumber}\\b`, 'i') }).first();
        await expect(orderOption).toBeVisible({ timeout: 20000 });
        await orderOption.click();
  }

  async save() {
    // HEALED: Scope Save to the visible Academic Order workspace button; the first generic Save can be hidden behind Lightning overlays.
    const saveButton = this.page.locator('button:visible').filter({ hasText: /^save$/i }).last();
    await expect(saveButton).toBeVisible({ timeout: 20000 });
    await saveButton.click({ force: true });
    // HEALED: Do not swallow save failures; wait for the form to close or expose a success toast.
    await expect(this.page.getByRole('heading', { name: /new academic order/i }).first())
      .toBeHidden({ timeout: 30000 });
  }
}

module.exports = AcademicOrderPage;
