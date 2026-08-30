const { expect } = require('@playwright/test');
const TestData = require('../utils/test-data');
const Helpers = require('../utils/helpers');

class StudentFinancialPage {
  constructor(page) {
    this.page = page;
  }

  async completeStripePayment() {
    await this.page.waitForTimeout(3000);

    const stripeFrame = this.page.frameLocator('iframe[name*="stripe"], iframe[src*="stripe"], iframe[title*="payment" i]').first();
    
    if (await stripeFrame.locator('input[name="cardnumber"], input[autocomplete="cc-number"]').isVisible({ timeout: 15000 }).catch(() => false)) {
      await this.fillStripeCard(stripeFrame);
    } else {
      await this.fillStripeDirect();
    }
  }

  async fillStripeCard(frame) {
    const cardInput = frame.locator('input[name="cardnumber"], input[autocomplete="cc-number"]').first();
    await cardInput.click();
    await cardInput.fill(TestData.stripe.cardNumber);

    const expiryInput = frame.locator('input[name="exp-date"], input[autocomplete="cc-exp"]').first();
    await expiryInput.click();
    await expiryInput.fill(TestData.stripe.expiry);

    const cvvInput = frame.locator('input[name="cvc"], input[autocomplete="cc-csc"]').first();
    await cvvInput.click();
    await cvvInput.fill(TestData.stripe.cvv);

    const submitBtn = frame.locator('button[type="submit"], button[name="submit"]').first();
    await submitBtn.click();
    await this.page.waitForTimeout(5000);
  }

  async fillStripeDirect() {
    const cardNumberInput = this.page.locator('input[name="cardnumber"], input[autocomplete="cc-number"], input[placeholder*="card" i]').first();
    if (await cardNumberInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await cardNumberInput.click();
      await cardNumberInput.fill(TestData.stripe.cardNumber);

      const expiryInput = this.page.locator('input[name="exp-date"], input[autocomplete="cc-exp"], input[placeholder*="MM/YY" i]').first();
      await expiryInput.click();
      await expiryInput.fill(TestData.stripe.expiry);

      const cvvInput = this.page.locator('input[name="cvc"], input[autocomplete="cc-csc"], input[placeholder*="CVV" i]').first();
      await cvvInput.click();
      await cvvInput.fill(TestData.stripe.cvv);

      const submitBtn = this.page.getByRole('button', { name: /pay|submit|confirm/i }).first();
      await submitBtn.click();
      await this.page.waitForTimeout(5000);
    }
  }

  async verifyPaymentSuccess() {
    const successMessage = this.page.locator('.slds-alert__content:has-text("success"), .slds-notify:has-text("success"), [class*="success"], text=/success/i').first();
    await expect(successMessage).toBeVisible({ timeout: 30000 });
  }

  async validatePaymentRecord() {
    await Helpers.navigateToObject(this.page, 'Payments');
    
    const recentPayment = this.page.locator('table tbody tr, .slds-table tbody tr').first();
    await expect(recentPayment).toBeVisible({ timeout: 10000 });
    
    const paymentText = await recentPayment.textContent();
    expect(paymentText.toLowerCase()).toContain(TestData.student.lastName.toLowerCase());
    
    return paymentText;
  }

  async validatePaymentInvoiceLines() {
    const invoiceLinesTab = this.page.getByRole('tab', { name: /invoice line|payment.*line/i }).first();
    if (await invoiceLinesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await invoiceLinesTab.click();
      await this.page.waitForTimeout(2000);
    }

    const linesTable = this.page.locator('table, .slds-table, lightning-datatable');
    await expect(linesTable).toBeVisible({ timeout: 10000 });
    
    const lineItem = linesTable.locator('tr, [role="row"]').first();
    return await lineItem.textContent();
  }

  async verifyInvoiceBalanceZero() {
    const balanceField = this.page.locator('.slds-form-element:has-text("Balance") .slds-form-element__static, .slds-form-element:has-text("Outstanding") .slds-form-element__static').first();
    if (await balanceField.isVisible({ timeout: 10000 }).catch(() => false)) {
      const balance = await balanceField.textContent();
      const numericBalance = parseFloat(balance.replace(/[^0-9.]/g, ''));
      expect(numericBalance).toBe(0);
    }
  }

  async validatePaymentApplication() {
    const paymentAppTab = this.page.getByRole('tab', { name: /payment application|applied/i }).first();
    if (await paymentAppTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await paymentAppTab.click();
      await this.page.waitForTimeout(2000);
    }

    const appTable = this.page.locator('table, .slds-table');
    if (await appTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      const appRow = appTable.locator('tr, [role="row"]').first();
      return await appRow.textContent();
    }
    return null;
  }
}

module.exports = StudentFinancialPage;
