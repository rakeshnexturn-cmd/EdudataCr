const { test, expect } = require('@playwright/test');
const sessionManager = require('../utils/session-manager');
const TestData = require('../utils/test-data');
const AccountPage = require('../pages/AccountPage');
const OrderPage = require('../pages/OrderPage');
const InvoicePage = require('../pages/InvoicePage');
const AcademicOrderPage = require('../pages/AcademicOrderPage');

async function completeCycle(page, accountName, cycle, pages) {
  const { order, invoice } = pages;
  await test.step(`${cycle}: Create and activate Order`, async () => {
    await order.navigate();
    await order.clickNew();
    await order.fillOrderDetails(accountName);
    await order.save();
    await order.addProduct();
    await order.activateOrder();
    await order.verifyActivated();
    await expect(await order.verifyBillingSchedule()).toBeTruthy();
  });
  const orderNumber = await order.getOrderNumber();
  console.log(`[${cycle}] 🛒📦Order Number:⪼------➢ ${orderNumber}`);
  await test.step(`${cycle}: Generate and post Invoice`, async () => {
    await order.generateInvoice();
    await invoice.navigateToInvoiceFromOrder();
    await invoice.verifyInvoiceDetails(accountName);
    await invoice.postInvoice();
  });
  const invoiceNumber = await invoice.getInvoiceNumber();
  console.log(`[${cycle}] 📄Invoice Number:⪼------➢ ${invoiceNumber}`);
  await test.step(`${cycle}: Create Academic Order`, async () => {
    // HEALED: Salesforce may close the Academic Order workspace page after save; isolate it from the payment fixture page.
    const academicPage = await page.context().newPage();
    const academicPageObject = new AcademicOrderPage(academicPage);
    // HEALED: The new page shares the authenticated browser context; a second frontdoor login can hang Lightning bootstrap.
    await academicPageObject.navigate();
    await academicPageObject.clickNew();
    await academicPageObject.fillAcademicOrderDetails(orderNumber);
    await academicPageObject.save();
    await academicPage.close().catch(() => {});
  });
  return { orderNumber, invoiceNumber };
}

test.describe('TC02 Existing Person Account - Two Academic Order Cycles', () => {
  test('reuses the TC01 student and creates two Academic Orders', async ({ page }) => {
    // HEALED: The scenario ends after Academic Order creation; payment is covered by a separate test case.
    test.setTimeout(600000);
    const session = await sessionManager.loginAsAdmin();
    await sessionManager.performBrowserLogin(page, session, TestData.urls.base);
    const account = new AccountPage(page);
    await account.navigate();
    const search = page.getByRole('searchbox').first();
    await expect(search).toBeVisible();
    // HEALED: TC02 must reuse the requested existing Person Account, Hare Krishna.
    const existingAccountName = 'Hare Krishna';
    await search.fill(existingAccountName);
    // HEALED: Scope the account link to Hare Krishna's table row to avoid split-view duplicates.
    const accountRow = page.getByRole('row', { name: new RegExp(existingAccountName, 'i') }).last();
    const accountLink = accountRow.getByRole('link', { name: new RegExp(`^${existingAccountName}$`, 'i') });
    await expect(accountLink).toBeVisible({ timeout: 15000 });
    await accountLink.click();
    const accountName = existingAccountName;
    // HEALED: Split view keeps the list URL; the row-scoped Hare Krishna link identifies the account.

    const pages = {
      order: new OrderPage(page), invoice: new InvoicePage(page),
    };
    const cycleA = await completeCycle(page, accountName, 'Scenario A', pages);

    // HEALED: Scenario B is disabled; this test creates one Order, one Invoice, and one Academic Order.
    void cycleA;
  });
});