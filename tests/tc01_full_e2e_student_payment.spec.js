const { test, expect } = require('@playwright/test');
const sessionManager = require('../utils/session-manager');
const TestData = require('../utils/test-data');
const AccountPage = require('../pages/AccountPage');
const CommunityUserPage = require('../pages/CommunityUserPage');
const OrderPage = require('../pages/OrderPage');
const InvoicePage = require('../pages/InvoicePage');
const AcademicOrderPage = require('../pages/AcademicOrderPage');
const ExperienceSitePage = require('../pages/ExperienceSitePage');
const StudentFinancialPage = require('../pages/StudentFinancialPage');

const uniqueData = () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return { suffix, firstName: `${TestData.student.firstName}${suffix}`, lastName: TestData.student.lastName, email: `student.${suffix}@acmeuni.edu` };
};

test.describe('TC01 Full E2E - New Person Account and Full Payment', () => {
  test('creates a new student and completes a full invoice payment', async ({ page }) => {
    const data = uniqueData();
    const session = await sessionManager.loginAsAdmin();
    await sessionManager.performBrowserLogin(page, session, TestData.urls.base);

    const account = new AccountPage(page);
    const community = new CommunityUserPage(page);
    const order = new OrderPage(page);
    const invoice = new InvoicePage(page);
    const academicOrder = new AcademicOrderPage(page);
    const experience = new ExperienceSitePage(page);
    const financial = new StudentFinancialPage(page);

    await test.step('Open Student Financials and Accounts through visible navigation', async () => {
      await account.navigate();
      await expect(page.getByRole('heading', { name: /accounts/i }).first()).toBeVisible();
    });
    await test.step('Create a unique Person Account', async () => {
      await account.clickNew();
      await account.selectPersonAccountRecordType();
      await account.fillAccountDetails(data);
      await account.save();
      await account.verifyAccountCreated(data.lastName);
    });
    const accountName = await account.getAccountName();

    await test.step('Enable community access and assign Student permissions', async () => {
      await community.enableCommunityUser(accountName, data);
      await community.assignPermissionSets();
      await community.verifyUserActive();
    });
    await test.step('Create, activate, and validate the Order', async () => {
      await order.navigate();
      await order.clickNew();
      await order.fillOrderDetails(accountName);
      await order.save();
      await order.addProduct();
      await order.activateOrder();
      await expect(await order.verifyBillingSchedule()).toBeTruthy();
    });
    const orderNumber = await order.getOrderNumber();
    await test.step('Generate and post the Invoice', async () => {
      await order.generateInvoice();
      await invoice.navigateToInvoiceFromOrder();
      await invoice.verifyInvoiceDetails(accountName);
      await invoice.postInvoice();
      await invoice.verifyInvoicePosted();
      await invoice.verifyInvoiceLines();
    });
    const invoiceNumber = await invoice.getInvoiceNumber();
    await test.step('Create and validate the Academic Order', async () => {
      await academicOrder.navigate();
      await academicOrder.clickNew();
      await academicOrder.fillAcademicOrderDetails(orderNumber);
      await academicOrder.save();
    });
    await test.step('Impersonate student and pay the full balance with Stripe', async () => {
      await account.openByName(accountName);
      await expect(await experience.impersonateFromPersonAccount(page)).toBeTruthy();
      await experience.navigateToStudentFinancial();
      await experience.verifyStudentFinancialPage();
      await expect(await experience.getAmountDue()).toMatch(/10/);
      await experience.clickPayNow();
      await financial.completeStripePayment();
      await financial.verifyPaymentSuccess();
    });
    await test.step('Validate payment records and final balance', async () => {
      await financial.validatePaymentRecord(invoiceNumber, accountName);
      await financial.validatePaymentApplication();
      await financial.validatePaymentInvoiceLines(invoiceNumber);
      await financial.verifyInvoiceBalanceZero();
    });
  });
});