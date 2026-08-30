# Salesforce Education Cloud Student Payment E2E Test Plan

## Application Overview

End-to-end Playwright coverage for Salesforce Education Cloud student financial processing. Tests use the existing JWT Bearer External Client App authentication through sessionManager.loginAsAdmin() and performBrowserLogin(), then navigate through the Salesforce UI using accessible role-based locators. The admin workflow creates or reuses a uniquely identified Person Account, provisions community access, creates orders and products, activates orders, verifies billing schedules, generates and posts invoices, creates Academic Orders, impersonates the student into Experience Cloud, completes Stripe test payments, and validates Payment, Payment Application, Payment Invoice Line, and final Student Financial balances. TC02 uses the TC01 account and executes two isolated order-to-payment cycles.

## Test Scenarios

### 1. TC01 Full E2E - New Person Account and Full Payment

**Seed:** `tests/seed.spec.ts`

#### 1.1. TC01 creates a new student and completes a full invoice payment

**File:** `tests/tc01_full_e2e_student_payment.spec.js`

**Steps:**
  1. At the start of the test, call sessionManager.loginAsAdmin(), then performBrowserLogin() using the JWT External Client App session. Wait for the Salesforce Lightning shell to be ready.
    - expect: The administrator is authenticated without an MFA prompt.
    - expect: The Salesforce application shell is visible.
    - expect: No authentication or session error is shown.
  2. Use the App Launcher button to open the app picker, select the Student Financials app, and wait for the app to load.
    - expect: Student Financials is the active Salesforce app.
    - expect: The app navigation shell is visible.
  3. Click the button named "Show Navigation Menu", choose Accounts from the menu, and wait for the Accounts list.
    - expect: The Accounts list is displayed.
    - expect: Navigation used the visible application controls and role-based locators, with no direct object URL navigation.
  4. Click the button named "New". In the record type dialog, choose the Person Account option and click the button named "Next".
    - expect: The Person Account creation form is displayed.
    - expect: The selected record type is Person Account.
  5. Fill the form using accessible labels for First Name, Last Name, Email, Phone, Institute ID, and required Billing Address fields. Generate a unique student identity for this run, for example a timestamp or UUID suffix, while retaining the configured institute identifier ACME_UNI.
    - expect: All required fields contain the unique test data.
    - expect: Institute ID is ACME_UNI.
    - expect: No field-level validation error is visible.
  6. Click the form button named "Save" and wait for the account record page and success toast.
    - expect: A Person Account is created.
    - expect: The account page identifies the unique student.
    - expect: The record type is Person Account and Institute ID is ACME_UNI.
    - expect: The saved name, email, phone, and required address values are present.
  7. On the account record, click the button named "Show more actions", choose "Enable Customer User", and wait for the community-user form.
    - expect: The Enable Customer User form is displayed for the created Person Account.
    - expect: The student account/contact context is preserved.
  8. Fill the community user fields with a unique username and unique email. Select Customer Community Plus for User License and EDC Community User for Profile using accessible combobox/label locators, then save and confirm the OK dialog.
    - expect: The community user is created successfully.
    - expect: The user is associated with the created Person Account/contact.
    - expect: The configured license and profile are shown.
    - expect: The confirmation dialog can be dismissed with the button named "OK".
  9. Open the created community user from the account/user relationship, open Permission Set Group Assignments, choose edit, assign the Student permission set group, and save.
    - expect: The Student permission set group is assigned.
    - expect: The user is active and remains associated with the correct student.
    - expect: No permission assignment validation error is shown.
  10. Use the Student Financials app's "Show Navigation Menu" button to select Orders, then click "New".
    - expect: The Orders list is displayed before creation.
    - expect: The Order form is displayed after clicking New.
  11. Fill the Order form using role-based labels: Account = the unique Person Account, Order Start Date = current date, Effective Date = current date, Price Book = the configured/current ACME University price book, Bill To Contact = the student contact, Billing Address = the first matching student address option, Shipping Address = the first matching student address option, and Status = Draft. Save the order.
    - expect: The Order is saved and associated with the new Person Account.
    - expect: The selected price book, contact, dates, addresses, and Draft status are displayed.
    - expect: A unique order identifier is available for later assertions.
  12. On the Order record, open Related, select Order Products, click "Add Product", choose Tuition Fee, enter Quantity 1, verify Unit Price 10000, and save.
    - expect: One Order Product is created.
    - expect: Product is Tuition Fee, quantity is 1, unit price is 10000, and total is 10000.
    - expect: The Order Product references the created Order and selected Price Book.
  13. Change the Order Status to Activated using the record edit control or status action, save, and wait for processing to finish.
    - expect: The Order status is Activated.
    - expect: No activation validation error is shown.
  14. Open the Order's Related tab and inspect Billing Schedules.
    - expect: A Billing Schedule exists for the activated Order.
    - expect: It references the correct Order and Order Product.
    - expect: Its amount is 10000, billing date is populated, and status is the configured generated status.
    - expect: If no Billing Schedule is generated, fail this test at this checkpoint and report the configuration defect; do not continue to invoice assertions.
  15. From the Order, execute the configured Generate Invoice action using its visible button/menu action, wait for completion, then use Show Navigation Menu to open Invoices and locate the invoice related to this Order.
    - expect: An Invoice is generated for the correct account and Order.
    - expect: The Invoice Number, Invoice Date, Due Date, total amount 10000, and outstanding balance 10000 are populated.
    - expect: Amount Paid is 0 before payment.
  16. Open the generated Invoice, execute the configured Post Invoice action, confirm if prompted, and wait for the status update.
    - expect: Invoice status changes to Posted.
    - expect: Invoice Lines exist and include Tuition Fee with quantity 1 and amount 10000.
    - expect: The posted invoice retains the correct student, Order, Billing Schedule, total, and outstanding balance.
  17. Use Show Navigation Menu to open Academic Orders, click New, and create an Academic Order referencing the created student/account, created Order, Last Order reference where required, academic year 2025-2026, academic term Fall 2026, and available financial information. Save it.
    - expect: The Academic Order is created successfully.
    - expect: Student, Person Account, academic year, academic term, Last Order, and Order/financial references are populated correctly.
  18. Return to the saved Person Account through Salesforce UI, use the account action named "Login to Experience as User", and wait for the Experience Cloud site.
    - expect: The student Experience Cloud session opens successfully.
    - expect: The student sees the Student Financial experience, not the administrator-only Salesforce shell.
  19. Open Student Financial using the visible site navigation, locate the posted invoice, and verify the displayed student name, invoice number, invoice amount 10000, paid amount 0, balance 10000, due date, and available "Pay Now" action.
    - expect: The invoice displayed belongs to the impersonated student.
    - expect: The outstanding balance matches the posted invoice.
    - expect: Pay Now is available for the full outstanding amount.
  20. Click "Pay Now" and verify the payment page/component receives the full outstanding amount of 10000. Enter valid Stripe test payment details, submit the payment, and wait for the gateway result.
    - expect: The payment flow opens for the correct invoice.
    - expect: Amount to Pay is exactly 10000.
    - expect: Stripe reports a successful test payment and a success notification/reference is displayed.
    - expect: No payment amount mismatch or validation error occurs.
  21. Return to the Student Financial view and/or Salesforce financial records, locate the new Payment, and inspect its related Payment Applications and Payment Invoice Lines.
    - expect: Payment exists for the correct student/account and invoice.
    - expect: Payment amount is 10000, status is the configured Successful/Posted state, payment date is current, and gateway reference is populated when configured.
    - expect: Payment Application exists with applied amount 10000.
    - expect: Payment Invoice Line references the correct Payment, Invoice, Invoice Line, Tuition Fee product, quantity 1, and amount/applied amount 10000.
  22. Refresh Student Financial and verify the final invoice state after processing completes.
    - expect: Invoice amount remains 10000.
    - expect: Paid amount is 10000.
    - expect: Outstanding balance is 0.
    - expect: The UI shows Paid/Fully Paid or the configured equivalent status.
    - expect: The test data identifiers are unique and can be used by TC02.

### 2. TC02 Existing Person Account - Two Independent Payment Cycles

**Seed:** `tests/seed.spec.ts`

#### 2.1. TC02 reuses the TC01 student and completes two separate order-to-payment cycles

**File:** `tests/tc02_existing_person_payment.spec.js`

**Steps:**
  1. At the start of the test, call sessionManager.loginAsAdmin(), then performBrowserLogin() through the JWT External Client App session and wait for Salesforce.
    - expect: The administrator is authenticated without MFA.
    - expect: The Salesforce Lightning shell is ready.
  2. Open App Launcher, select Student Financials, click "Show Navigation Menu", choose Accounts, and search the Accounts list for the unique Person Account produced by TC01.
    - expect: The existing Person Account is found through the UI.
    - expect: The account is a Person Account and is associated with the intended student.
    - expect: If the unique TC01 account is absent, fail with a clear prerequisite error rather than silently creating a different account.
  3. Open the existing account and confirm community access/user association before beginning the payment cycles.
    - expect: The existing student has an active community user associated with the correct account/contact.
    - expect: The Student permission set group and configured community profile/license are present.
  4. For Scenario A, use Show Navigation Menu to open Orders, click New, and create a Draft Order for the existing Person Account with current dates, the configured price book, student Bill To Contact, matching billing/shipping addresses, and unique cycle data.
    - expect: Order A is created for the existing Person Account in Draft status.
    - expect: Order A has a unique identifier and correct account, dates, price book, contact, and addresses.
  5. Open Order A Related, add one Summer Tuition  Order Product at quantity 1 and unit price 121, save, activate Order A, and inspect Related > Billing Schedules.
    - expect: Order A is Activated.
    - expect: Its Order Product is correct and total is 121.
    - expect: A Billing Schedule exists with the correct Order/Product relationship, amount, billing date, and generated status.
    - expect: Missing schedule fails Scenario A before invoice processing.
  6. Generate and post the invoice for Order A through visible Salesforce actions, then validate the posted invoice and Invoice Line.
    - expect: Invoice A is related to the existing student and Order A.
    - expect: Invoice A is Posted, totals 121, starts with amount paid 0 and balance 121.
    - expect: The Summer Tuition Invoice Line has quantity 1 and amount 121.
  7. Create Academic Order A through the Academic Orders navigation menu, referencing the existing student/account, academic year 2025-2026, Fall 2026, Order A/Last Order, and financial information.
    - expect: Academic Order A is saved with all required student, academic, order, and financial references.
  8. Impersonate the existing student from the account with "Login to Experience as User", navigate to Student Financial, select Invoice A, click Pay Now, confirm amount 10000, and complete a successful Stripe test payment.
    - expect: The Experience Cloud session is the existing student.
    - expect: Invoice A is the selected invoice.
    - expect: Amount to Pay is exactly 10000.
    - expect: Stripe payment A succeeds and a success/reference is shown.
  9. Validate Payment A, its Payment Application, and Payment Invoice Line, then refresh Student Financial.
    - expect: Payment A is linked to the existing account and Invoice A, amount 10000, successful/posted, current payment date, and gateway reference where configured.
    - expect: Applied amount is 10000 and Payment Invoice Line points to Invoice A and its Tuition Fee line.
    - expect: Invoice A paid amount is 10000 and balance is 0.
  10. Log back in as administrator using sessionManager.loginAsAdmin() and performBrowserLogin(), then navigate via App Launcher > Student Financials > Show Navigation Menu > Orders. Create Order B for the same existing Person Account with a distinct cycle identifier and the same configured product/price.
    - expect: The admin session is restored without MFA.
    - expect: Order B is distinct from Order A and belongs to the same existing Person Account.
    - expect: Order B begins in Draft with correct order fields.
  11. Add one Tuition Fee product to Order B, activate it, and validate its Billing Schedule before generating an invoice.
    - expect: Order B is Activated.
    - expect: Order B has one Tuition Fee product at quantity 1 and total 10000.
    - expect: A separate Billing Schedule B exists and references Order B.
    - expect: Missing schedule fails Scenario B before invoice processing.
  12. Generate and post Invoice B, then validate that it is distinct from Invoice A and has the correct posted financial values.
    - expect: Invoice B references Order B and the same existing student.
    - expect: Invoice B is Posted with total 10000, amount paid 0, balance 10000, and a Tuition Fee Invoice Line.
    - expect: Invoice A remains associated with Scenario A and is not overwritten.
  13. Create Academic Order B with the existing student/account, academic year 2025-2026, Fall 2026, and Order B/Last Order references.
    - expect: Academic Order B is distinct from Academic Order A and has the correct financial/order references.
  14. Impersonate the same student, navigate to Student Financial, locate Invoice B, click Pay Now, verify amount 10000, and complete a successful Stripe test payment.
    - expect: Invoice B is displayed for the same student.
    - expect: Amount to Pay is exactly 10000.
    - expect: Payment B succeeds independently of Payment A.
  15. Validate Payment B, Payment Application B, and Payment Invoice Line B, and confirm they reference Invoice B, Order B, and the correct Tuition Fee line rather than Scenario A records.
    - expect: Payment B is linked to Invoice B and the existing account.
    - expect: Payment B amount and applied amount are 10000.
    - expect: Payment Invoice Line B references Invoice B, its Invoice Line, Tuition Fee, quantity 1, and applied amount 10000.
    - expect: Payment A and its relationships remain unchanged.
  16. Refresh Student Financial and validate both completed cycles and security boundaries.
    - expect: Invoice A and Invoice B each show paid amount 10000 and balance 0.
    - expect: Both payments are visible only to the correct student.
    - expect: A different student's invoice/payment is not accessible from the student session.
    - expect: Admin-only Salesforce functionality is unavailable to the student.
    - expect: No duplicate or cross-linked Payment Applications or Payment Invoice Lines exist.
