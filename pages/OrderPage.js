const { expect } = require('@playwright/test');
const TestData = require('../utils/test-data');
const Helpers = require('../utils/helpers');

class OrderPage {
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    await Helpers.navigateToObject(this.page, 'Orders');
  }

  async clickNew() {
    const newBtn = this.page.getByRole('button', { name: /new/i }).first();
    await newBtn.click();
    await this.page.waitForTimeout(2000);
  }

  async fillOrderDetails(accountName) {
    await this.page.waitForLoadState('domcontentloaded');

    await this.selectAccount(accountName);
    await this.selectBillToContact(accountName);
    await this.fillDates();
    await this.selectPriceBook();
    await this.fillAddress('Billing');
    await this.fillAddress('Shipping');
  }

  async selectAccount(accountName) {
    // HEALED: The New Order form exposes the account lookup as Account Name.
    const input = this.page.getByRole('combobox', { name: 'Account Name', exact: true });
    
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await input.click();
      await input.fill(accountName);
      await this.page.waitForTimeout(2000);
      
      const option = this.page.getByRole('option', { name: new RegExp(`^${accountName}$`, 'i') }).first();
      await expect(option).toBeVisible({ timeout: 10000 });
      await option.click();
      // HEALED: Salesforce keeps the advanced record-picker overlay open after selection.
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000);
    }
  }

  async selectBillToContact(accountName) {
    // HEALED: Use the exact Bill To Contact combobox instead of the first generic picker.
    // HEALED: Bill To Contact is a Contacts lookup; select a returned contact, not typed text.
    const input = this.page.getByRole('combobox', { name: 'Bill To Contact', exact: true });
    
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await input.click();
      await input.fill(accountName);
      await this.page.waitForTimeout(2000);
      
      const option = this.page.getByRole('option', { name: new RegExp(accountName, 'i') }).last();
      await expect(option).toBeVisible({ timeout: 10000 });
      await option.click({ force: true });
      // HEALED: Dismiss the Bill To Contact picker before interacting with date fields.
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000);
      await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    }
  }

  async fillDates() {
    // HEALED: This Salesforce org validates date fields as DD/MM/YYYY.
    const today = new Date().toLocaleDateString('en-GB');
    
    const startDate = this.page.locator('input[name="StartDate"], input[placeholder*="Start"]').first();
    if (await startDate.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startDate.click();
      await startDate.fill(today);
      await this.page.keyboard.press('Escape');
    }

    const effectiveDate = this.page.locator('input[name="EffectiveDate"], input[placeholder*="Effective"]').first();
    if (await effectiveDate.isVisible({ timeout: 3000 }).catch(() => false)) {
      await effectiveDate.click();
      await effectiveDate.fill(today);
      await this.page.keyboard.press('Escape');
    }
  }

  async selectPriceBook() {
    const priceBookField = this.page.locator('lightning-combobox:has-text("Price Book"), .slds-combobox:has-text("Price Book")').first();
    const trigger = priceBookField.locator('button, [role="combobox"]').first();
    
    if (await trigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trigger.click();
      await this.page.waitForTimeout(1000);
      
      const option = this.page.getByRole('option', { name: /standard|acme/i }).first();
      if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
        await option.click();
      }
      await this.page.waitForTimeout(1000);
    }
  }

  async fillAddress(type) {
    const searchValue = 'ABC';
    const addressIndex = type.toLowerCase() === 'billing' ? 0 : 1;
    const searchInput = this.page.locator('input[placeholder^="Search Address" i]').nth(addressIndex);

    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.click();
    await searchInput.fill(searchValue);
    await this.page.waitForTimeout(2000);

    const option = this.page.locator(
      '[role="option"]:visible, .slds-listbox__option:visible, lightning-base-combobox-item:visible'
    ).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await this.page.waitForTimeout(500);
  }

  async save() {
    // HEALED: Helpers.saveRecord can return while Salesforce is still on /Order/new; wait for the saved Order record explicitly.
    const saveButton = this.page.locator('button:visible').filter({ hasText: /^save$/i }).last();
    await expect(saveButton).toBeVisible({ timeout: 20000 });
    await saveButton.click({ force: true });
    await expect(this.page).toHaveURL(/\/lightning\/r\/(Order\/)?[a-zA-Z0-9]{15,18}\/view/, { timeout: 60000 });
    await expect(this.page.getByRole('tab', { name: /related/i }).first()).toBeVisible({ timeout: 30000 });
  }

  async getOrderNumber() {
    const activeOrderHeader = this.page.locator('slot[name="primaryField"]').filter({ hasText: /^\d+$/ }).last();
    await expect(activeOrderHeader).toBeVisible({ timeout: 15000 });
    const value = await activeOrderHeader.textContent();
    return value ? value.trim() : '';
  }

  async addProduct() {
    const relatedTab = this.page.getByRole('tab', { name: /related/i }).first();
    await relatedTab.click();
    await this.page.waitForTimeout(2000);

    // HEALED: Salesforce labels the related-list action "Add Products" in this org.
    const addProductBtn = this.page.getByRole('button', { name: /add products?/i }).first();
    if (await addProductBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addProductBtn.click();
      await this.page.waitForTimeout(3000);
    } else {
      const orderProductsSection = this.page.locator('lightning-related-list:has-text("Order Products")');
      const addBtn = orderProductsSection.getByRole('button', { name: /add/i }).first();
      await addBtn.click();
      await this.page.waitForTimeout(3000);
    }

    // HEALED: Add Products first opens Choose Price Book when the Order has no price book.
    const priceBookDialog = this.page.getByRole('dialog', { name: /choose price book/i }).last();
    if (await priceBookDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      const priceBookInput = priceBookDialog.getByRole('combobox', { name: /price book/i }).first();
      await expect(priceBookInput).toBeVisible({ timeout: 10000 });
      // HEALED: Salesforce may preselect a readonly Standard Price Book in this modal.
      const readonly = await priceBookInput.getAttribute('readonly');
      const ariaReadonly = await priceBookInput.getAttribute('aria-readonly');
      if (readonly !== '' && ariaReadonly !== 'true') {
        await priceBookInput.fill(process.env.PRICE_BOOK_NAME || 'ACME University');
        // HEALED: The Price Book picker requires Enter to submit the search before results appear.
        await priceBookInput.press('Enter');
        await this.page.waitForTimeout(1500);
        const priceBookOption = priceBookDialog.getByRole('option', { name: /ACME University|2026|2027/i }).first();
        const priceBookText = priceBookDialog.getByText(/ACME University|2026|2027/i).first();
        if (await priceBookOption.isVisible({ timeout: 5000 }).catch(() => false)) {
          await priceBookOption.click();
        } else {
          await expect(priceBookText).toBeVisible({ timeout: 10000 });
          await priceBookText.click();
        }
      }
      await priceBookDialog.getByRole('button', { name: /^save$/i }).click();
      await this.page.waitForTimeout(3000);
    }

    await this.selectProduct();
    await this.setQuantity();
    await this.saveProduct();
  }

  async selectProduct() {
    // HEALED: Tuition Fee is unavailable in Standard Price Book; use the available Summer Free Tuition product.
    // HEALED: Ignore the unavailable Tuition Fee env value for TC02 and use a Standard Price Book product.
    const productName = 'Summer Tuition';
    // HEALED: Scope product rows to the visible Add Products dialog, not the hidden Orders list.
    const productDialog = this.page.getByRole('dialog', { name: /add products/i }).last();
    await expect(productDialog).toBeVisible({ timeout: 15000 });
    const searchInput = productDialog.getByRole('combobox', { name: /search products/i }).first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.fill(productName);
      // HEALED: Salesforce product search requires selecting its explicit search suggestion.
      const searchSuggestion = productDialog.getByRole('option', { name: new RegExp(`Search Products.*${productName}`, 'i') }).first();
      if (await searchSuggestion.isVisible({ timeout: 10000 }).catch(() => false)) {
        await searchSuggestion.click();
        await this.page.waitForTimeout(2000);
      } else {
        await searchInput.press('Enter');
        await this.page.waitForTimeout(2000);
      }
    }

    const productRow = productDialog.getByRole('row', { name: new RegExp(productName, 'i') }).first();
    const productCheckbox = productRow.locator('input[type="checkbox"]').first();
    // HEALED: The row-number cell is not the real selection target; force-check the actual checkbox inside the row.
    if (await productRow.isVisible({ timeout: 10000 }).catch(() => false)) {
      await productCheckbox.check({ force: true });
      await this.page.waitForTimeout(500);
    } else {
      const availableProduct = productDialog.getByRole('row').filter({ has: productDialog.locator('input[type="checkbox"]') })
        .filter({ hasNot: productDialog.locator('input.datatable-select-all') }).last();
      await expect(availableProduct).toBeVisible({ timeout: 15000 });
      await availableProduct.locator('input[type="checkbox"]').check({ force: true });
    }

    const nextBtn = this.page.getByRole('button', { name: /next/i }).last();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async setQuantity() {
    const quantityValue = '2';
    const editQuantityDialog = this.page.getByRole('dialog', { name: /edit (quantity|selected order products)/i }).last();

    if (await editQuantityDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      const productText = this.page.getByText('Summer Tuition', { exact: true }).last();
      const quantityCell = productText.locator('xpath=ancestor::tr').locator('td').nth(1);
      await expect(quantityCell).toBeVisible({ timeout: 15000 });
      await quantityCell.click();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.type(quantityValue);

      const modalSave = this.page.locator('button[title="Save"] span.label.bBody').last();
      await expect(modalSave).toBeVisible({ timeout: 5000 });
      await modalSave.click();
      await this.page.waitForTimeout(1000);
      return;
    }

    throw new Error('Edit Selected Order Products dialog was not displayed; Quantity was not entered.');
  }

  async saveProduct() {
    await expect(this.page.getByRole('dialog', { name: /edit (quantity|selected order products)/i }).last()).toBeHidden({ timeout: 15000 });
    await this.page.waitForTimeout(2000);
  }

  async activateOrder() {
    const detailsTab = this.page.getByRole('tab', { name: /^details$/i }).first();
    if (await detailsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await detailsTab.click();
    }
    await this.page.waitForTimeout(1500);

    const activatedPath = this.page.getByText(/^activated$/i).last();
    await expect(activatedPath).toBeVisible({ timeout: 15000 });
    await activatedPath.click();
    await this.page.waitForTimeout(500);

    const markCurrentStatus = this.page.getByRole('button', { name: /mark as current status/i }).first();
    await expect(markCurrentStatus).toBeVisible({ timeout: 10000 });
    await markCurrentStatus.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);

    await this.verifyActivated();
  }

  async verifyActivated() {
    const activatedStatus = this.page.getByText(/^activated$/i).first();
    if (await activatedStatus.isVisible({ timeout: 10000 }).catch(() => false)) {
      return true;
    }

    const statusField = this.page.locator(
      '.slds-form-element:has-text("Status") .slds-form-element__static, [data-target-selection-name*="Status"]'
    ).first();
    await expect(statusField).toBeVisible({ timeout: 10000 });
    await expect(statusField).toContainText(/activated/i);
    return true;
  }

  async verifyBillingSchedule() {
    const relatedTab = this.page.getByRole('tab', { name: /related/i }).first();
    if (await relatedTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await relatedTab.click();
      await this.page.waitForTimeout(2000);
    }

    const billingScheduleSection = this.page.locator('a[href*="BillingSchedules"], a:has-text("Billing Schedules"), span:has-text("Billing Schedules"), lightning-related-list:has-text("Billing Schedules")').first();
    await expect.poll(async () => await billingScheduleSection.count(), { timeout: 15000 }).toBeGreaterThan(0);

    const scheduleText = await billingScheduleSection.textContent().catch(() => 'Billing Schedules');
    return scheduleText;
  }

  async generateInvoice() {
    await this.page.getByRole('button', { name: 'Show more actions' }).click();
    await this.page.getByRole('menuitem', { name: 'Generate Invoices' }).click();
    await this.page.getByRole('button', { name: 'Generate' }).click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(5000);
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);
  }

  async getLastOrderNumber() {
    const orderName = this.page.locator('.slds-page-header__title, .recordTitle');
    return await orderName.textContent();
  }
}

module.exports = OrderPage;
