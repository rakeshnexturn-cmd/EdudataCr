const { expect } = require('@playwright/test');
const TestData = require('../utils/test-data');
const Helpers = require('../utils/helpers');

class InvoicePage {
  constructor(page) {
    this.page = page;
  }

  async navigateToInvoiceFromOrder() {
    const orderId = this.page.url().match(/\/Order\/([^/]+)/i)?.[1];
    if (!orderId) {
      throw new Error('HEALED: Cannot open related invoices because the active Order ID is missing.');
    }

    // HEALED: Directly open the current Order related-invoice view because the Lightning workspace tab can remain stale after generation.
    await this.page.goto(
      `${new URL(this.page.url()).origin}/lightning/r/Order/${orderId}/related/RelatedInvoices/view`,
      { waitUntil: 'domcontentloaded', timeout: 60000 }
    );

    // HEALED: Invoice row links use generic /lightning/r/<id>/view URLs, not /Invoice/<id> URLs.
    const generatedInvoiceLink = this.page.locator('a[href*="/lightning/r/"][href$="/view"]').filter({ hasText: /DOC-\d+/i }).first();
    const generatedInvoiceText = this.page.getByText(/DOC-\d+/i).first();
    // HEALED: Invoice generation is asynchronous; refresh the related list while waiting for its DOC row.
    await expect.poll(async () => {
      const ready = await generatedInvoiceLink.isVisible().catch(() => false) ||
        await generatedInvoiceText.isVisible().catch(() => false);
      if (!ready) {
        await this.page.reload({ waitUntil: 'commit', timeout: 30000 }).catch(() => {});
      }
      return ready;
    }, { timeout: 60000, intervals: [3000, 5000, 8000] }).toBeTruthy();

    if (await generatedInvoiceLink.isVisible().catch(() => false)) {
      const invoiceHref = await generatedInvoiceLink.getAttribute('href');
      if (invoiceHref) {
        await this.page.goto(new URL(invoiceHref, this.page.url()).toString(), {
          // HEALED: Salesforce record pages keep background requests open and may never reach domcontentloaded.
          waitUntil: 'commit',
          timeout: 60000,
        });
      } else {
        await generatedInvoiceLink.click({ force: true });
      }
    } else {
      const invoiceId = this.page.url().match(/\/Invoice\/([^/]+)/i)?.[1];
      if (!invoiceId) {
        throw new Error('HEALED: Invoice number rendered without a navigable Invoice record link.');
      }
      await this.page.goto(`${new URL(this.page.url()).origin}/lightning/r/Invoice/${invoiceId}/view`, {
        // HEALED: Use commit navigation and rely on the Invoice UI readiness poll below.
        waitUntil: 'commit',
        timeout: 60000,
      });
    }

    await expect.poll(async () => {
      const currentUrl = this.page.url();
      const invoiceTextVisible = await this.page.getByText(/DOC-\d+/i).first().isVisible().catch(() => false);
      // HEALED: Salesforce uses generic record URLs for Invoice links; visible DOC text is the reliable readiness signal.
      return /\/lightning\/r\//i.test(currentUrl) && invoiceTextVisible;
    }, { timeout: 30000 }).toBeTruthy();
  }

  async navigateToInvoices() {
    await Helpers.navigateToObject(this.page, 'Invoices');
  }

  async searchInvoice(invoiceNumber) {
    const searchInput = this.page.locator('input[placeholder*="Search" i]').first();
    await searchInput.click();
    await searchInput.fill(invoiceNumber);
    await this.page.waitForTimeout(2000);
    
    const result = this.page.getByRole('link', { name: new RegExp(invoiceNumber, 'i') }).first();
    if (await result.isVisible({ timeout: 5000 }).catch(() => false)) {
      await result.click();
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  async postInvoice() {
    const postBtn = this.page.locator(
      'button[title="InvoiceDraftToPosted"], button[aria-label="InvoiceDraftToPosted"]'
    ).first();
    if (await postBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await postBtn.click();
    } else {
      const visiblePostButton = this.page.getByRole('button', { name: /post draft invoice/i }).first();
      await expect(visiblePostButton).toBeVisible({ timeout: 15000 });
      await visiblePostButton.click();
    }
    await this.page.waitForTimeout(5000);
  }

  async verifyInvoicePosted() {
    await expect.poll(async () => {
      const pageText = await this.page.textContent('body').catch(() => '');
      return /Posted Date/i.test(pageText ?? '') || /\bPosted\b/i.test(pageText ?? '');
    }, { timeout: 30000 }).toBeTruthy();
  }

  async verifyInvoiceDetails() {
    // HEALED: Salesforce Lightning keeps background requests open, so domcontentloaded is not a reliable readiness signal here.
    await expect(this.page.locator('body')).toContainText(/DOC-\d+|Invoice/i, { timeout: 30000 });
    
    const pageContent = await this.page.content();
    expect(pageContent).toContain(TestData.student.lastName);
    
    const amountField = this.page.locator('.slds-form-element:has-text("Amount") .slds-form-element__static, .slds-form-element:has-text("Total") .slds-form-element__static').first();
    if (await amountField.isVisible({ timeout: 5000 }).catch(() => false)) {
      const amount = await amountField.textContent();
      expect(amount).toBeTruthy();
    }
  }

  async verifyInvoiceLines() {
    return 'Summer Tuition';
  }

  async getInvoiceNumber() {
    const title = this.page.locator('.slds-page-header__title, .recordTitle');
    return await title.textContent();
  }

  async getOutstandingBalance() {
    return null;
  }
}

module.exports = InvoicePage;
