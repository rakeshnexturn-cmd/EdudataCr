# SALESFORCE EDUCATION CLOUD — END-TO-END STUDENT PAYMENT FLOW

### OBJECTIVE
Validate the complete student financial lifecycle:

Person Account → Community User → Price Book → Academic Year/Interval
→ Order → Order Product → Billing Schedule → Invoice
→ Academic Order → Experience Cloud → Student Financial
→ Payment → Payment Application → Payment Invoice Lines

### TEST DATA
Student Name: Test Student
Institute ID: ACME_UNI
Account Record Type: Person Account
Academic Year: 2026–2027
Academic Term: Fall 2026
Product: Tuition Fee
Quantity: 1
Unit Price: 10,000
Payment: Full invoice amount

## PHASE 1 — CREATE STUDENT / PERSON ACCOUNT

### STEP 1 — CREATE PERSON ACCOUNT
1. Login to Salesforce as an administrator.
2. Navigate to Accounts.
3. Click New.
4. Select the Person Account record type.
5. Enter all mandatory student information.
6. Enter Institute ID = ACME_UNI.
7. Enter other mandatory fields:
- First Name
- Last Name
- Email
- Phone
- Billing Address
- 8. Save the record.

### EXPECTED RESULT
- Person Account is successfully created.
- Account has the correct Person Account record type.
- Institute ID is saved as ACME_UNI.
- Student information is available on the Person Account.

### QA VALIDATION
- [ ] Person Account created
- [ ] Correct Record Type
- [ ] Institute ID = ACME_UNI
- [ ] First Name populated
- [ ] Last Name populated
- [ ] Email populated
- [ ] Required address fields populated
- [ ] No validation errors

## PHASE 2 — ENABLE STUDENT COMMUNITY ACCESS

### STEP 2 — ENABLE PERSON ACCOUNT FOR COMMUNITY
1. Open the newly created Person Account.
2. Click on "Show more actions" button(dropdown)
3. Click on "Enable Customer User"
4. Enter required information for the community user:
- Username -- any randomized username for testing
- Email-- any randomized email for testing
- Profile (select "Customer Community Plus" from "*User License")  and select "EDC Community User" from "Profile"
5. Save the community user.
6. Click on "OK"


### EXPECTED RESULT
A community user is created and associated with the student's Person Account/Contact.

### STEP 3 — ASSIGN PERMISSION SETS
1. Open the newly created community user.
2. Go tp the Permission Set Group Assignments, edit and assign the required permission set groups for the student.
3. Assign the "Student" permission set group.
6. Save.

### VALIDATION
- [ ] User is active
- [ ] User is associated with the correct student
- [ ] Correct profile/license
- [ ] Required permission sets assigned
- [ ] User can authenticate to Experience Cloud
## PHASE 3 — CREATE ORDER

### STEP 4 — CREATE ORDER
1. Navigate to Orders.
2. Click New.
3. Create the Order for the student.
4. Populate all required fields.

Important fields:
- Account  -Search and select the recently created person account
- Order Start Date
- Effective Date
- Price Book
- Bill To Contact - Search and select the recently created person account
- Billing Address - Search ABC and choose 1st option
- Shipping Address - Search ABC and choose 1st option
- Status

Example:
Account: Test Student
Price Book: ACME University 2026–2027
Order Start Date: Current Date
Effective Date: Current Date
Bill To Contact:  Test Student
Billing Address: Student Address
Shipping Address: Student Address
Status: Draft

5. Save the Order.

### EXPECTED RESULT
Order is successfully created and associated with the student.

### STEP 8 — VALIDATE ORDER
Open the Order and verify:

- [ ] Correct student Account
- [ ] Correct Price Book
- [ ] Correct Bill To Contact
- [ ] Correct Billing Address
- [ ] Correct Shipping Address
- [ ] Correct Order dates
- [ ] Order has the expected initial status

## PHASE 4 — ADD PRODUCT TO ORDER

### STEP 9 — ADD ORDER PRODUCT
1. Open the Order.
2. Navigate to Related.
3. Open Order Products.
4. Click Add Product.
5. Select Product = Summer Tuition
6. Enter Quantity = 1.
7. Verify the price.
8. Save.

Example:
Product: Summer Tuition
Quantity: 1
Unit Price: 10,000
Total: 10,000

### EXPECTED RESULT
Order Product is created successfully.

### STEP 10 — VALIDATE ORDER PRODUCT
Open the Order Product and verify:

- [ ] Correct Product
- [ ] Quantity = 1
- [ ] Correct Unit Price
- [ ] Correct Total Amount
- [ ] Correct Order
- [ ] Correct Price Book
- [ ] Required financial fields populated

## PHASE 5 — ACTIVATE ORDER

### STEP 11 — ACTIVATE ORDER
1. Open the Order.
2. Change Status to Activated.
3. Save.

### EXPECTED RESULT
Order status changes to Activated.

### STEP 12 — VALIDATE BILLING SCHEDULE
1. Open the Order.
2. Navigate to Related.
3. Look for Billing Schedules.
4. Verify the Billing Schedule has been generated.

Validate:
- [ ] Billing Schedule exists
- [ ] Related Order is correct
- [ ] Amount is correct
- [ ] Billing Date is correct
- [ ] Status is correct
- [ ] Product/Order Product relationship is correct

### EXPECTED RESULT
Billing Schedule is successfully generated for the activated Order.

### IMPORTANT QA CHECKPOINT
If the Order is activated but no Billing Schedule is generated, stop the flow
and log a defect/configuration issue before continuing.

## PHASE 6 — GENERATE INVOICE

### STEP 13 — GENERATE INVOICE
1. From the Order execute the configured process to generate the Invoice.
2. Wait for processing to complete.
3. Navigate to Invoices.
4. Find the Invoice associated with the Order.

### EXPECTED RESULT
Invoice is generated successfully.

### STEP 14 — VALIDATE INVOICE
Open the Invoice and verify:

- Invoice Number
- Account
- Order
- Billing Schedule
- Invoice Date
- Due Date
- Total Amount
- Balance/Due Amount
- Status

Example:
Invoice Amount = 10,000
Amount Paid = 0
Outstanding Balance = 10,000

### EXPECTED RESULT
Invoice is generated with the correct amount and student association.

## PHASE 8 — POST INVOICE

### STEP 15 — POST INVOICE
1. Open the generated Invoice.
2. Perform the configured Post Invoice action.
3. Confirm the operation.

### EXPECTED RESULT
Invoice status changes to the expected Posted status.

### STEP 16 — VALIDATE POSTED INVOICE
Verify:

- [ ] Invoice is Posted
- [ ] Invoice Number exists
- [ ] Student Account is correct
- [ ] Order is correct
- [ ] Invoice amount is correct
- [ ] Outstanding balance is correct
- [ ] Invoice Lines exist

Open Invoice Lines and verify:

Product = Tuition Fee
Quantity = 1
Amount = 10,000

## PHASE 9 — CREATE ACADEMIC ORDER

### STEP 17 — CREATE ACADEMIC ORDER USING LAST ORDER
1. Open Academic Orders.
2. Create the Academic Order.
3. Use/reference the previously created Last Order.
4. Associate the appropriate:
- Student
- Account
- Academic Year - must be 2025-2026
- Order
- Financial information
5. Save.

### EXPECTED RESULT
Academic Order is successfully created.

### STEP 18 — VALIDATE ACADEMIC ORDER
Open the Academic Order and verify:

- [ ] Student is correct
- [ ] Person Account is correct
- [ ] Academic Year is correct
- [ ] Academic Term is correct
- [ ] Last Order is correct
- [ ] Financial/Order information is populated
- [ ] Related invoice/financial information is available where applicable

## PHASE 10 — EXPERIENCE CLOUD LOGIN

### STEP 19 — LOGIN AS STUDENT
1. Open the Student Person account in Salesforce.
2. Click on the "Login to Experience as User" button to log in as the student to the Experience Cloud site.


### EXPECTED RESULT
Student successfully logs into the Experience Site.

### SECURITY VALIDATION
- [ ] Student can see their own records
- [ ] Student cannot see another student's invoice
- [ ] Student cannot see another student's payment
- [ ] Student cannot access admin-only functionality

## PHASE 11 — STUDENT FINANCIAL

### STEP 20 — NAVIGATE TO STUDENT FINANCIAL
1. Open Student Financial.
2. Locate the student's financial information.
3. Verify the invoice generated earlier.

Expected display:
Invoice: INV-XXXX
Amount Due: 10,000
Paid: 0
Balance: 10,000
Pay Now button available

VALIDATE
- [ ] Student name
- [ ] Invoice number
- [ ] Invoice amount
- [ ] Outstanding balance
- [ ] Due date
- [ ] Payment status

## PHASE 12 — PAY NOW

### STEP 21 — CLICK PAY NOW
1. Click Pay Now.
2. Verify the payment component/page opens.
3. Verify the correct amount is passed to the payment flow.

Example:
Invoice Amount: 10,000
Amount to Pay: 10,000

### CRITICAL VALIDATION
The payment amount must match the outstanding invoice balance.

## PHASE 13 — COMPLETE PAYMENT

### STEP 22 — ENTER PAYMENT DETAILS
1. Enter valid payment details according to the configured payment gateway/test environment.
2. Submit the payment.
3. Wait for the payment gateway response.

### EXPECTED RESULT
- Payment is successfully processed.
- Payment success message/notification is displayed to the student.
- Payment gateway reference is generated where applicable.

## PHASE 14 — VALIDATE PAYMENT

### STEP 23 — VALIDATE PAYMENT RECORD
1. Return to Salesforce.
2. Navigate to the student's payment/financial records.
3. Locate the newly created Payment.

Verify:

Payment: Created
Student/Account: Test Student
Amount: 10,000
Payment Status: Successful/Posted as configured
Payment Date: Current Date
Payment Reference: Gateway reference
Invoice: Correct Invoice

### EXPECTED RESULT
Payment record is successfully created and associated with the correct student/invoice.

## PHASE 15 — VALIDATE PAYMENT APPLICATION

### STEP 24 — VALIDATE PAYMENT AGAINST INVOICE
1. Open the Payment.
2. Check the related payment/application records.
3. Verify that the payment has been applied to the correct invoice.

Expected relationship:

Student
   ↓
Invoice
   ↓
Payment
   ↓
Payment Application
   ↓
Invoice

Example:
Invoice Amount = 10,000
Payment Amount = 10,000
Applied Amount = 10,000
Remaining Balance = 0

### EXPECTED RESULT
Payment is correctly applied to the intended invoice.

## PHASE 16 — VALIDATE PAYMENT INVOICE LINES

### STEP 25 — VALIDATE PAYMENT INVOICE LINES
Open the relevant Payment Invoice Lines.

Verify:

- [ ] Invoice is correct
- [ ] Payment is correct
- [ ] Invoice Line is correct
- [ ] Applied Amount is correct
- [ ] Product is correct
- [ ] Quantity is correct
- [ ] Amount is correct

Expected relationship:

Payment
   |
   └── Payment Invoice Line
          |
          ├── Invoice = INV-XXXX
          ├── Invoice Line = Tuition Fee
          ├── Applied Amount = 10,000
          └── Product = Tuition Fee

## PHASE 17 — FINAL VALIDATION

### STEP 26 — VERIFY STUDENT FINANCIAL BALANCE
1. Return to Experience Site.
2. Navigate to Student Financial.
3. Verify the invoice balance after payment.

### BEFORE PAYMENT
Invoice Amount = 10,000
Paid Amount = 0
Outstanding Balance = 10,000

### AFTER SUCCESSFUL FULL PAYMENT
Invoice Amount = 10,000
Paid Amount = 10,000
Outstanding Balance = 0

### EXPECTED RESULT
The Student Financial UI displays the appropriate Paid/Fully Paid status
according to the configured Salesforce implementation.


We need to Implement the 2 test cases here - 
## TC01 Flow (Full E2E — New Account)
1. Login as admin
2. Navigate to Accounts list (via UI buttons)
3. Create Person Account (New → Person Account → Next → Fill form → Save)
4. Enable Community User (assign permissions)
5. Create Order → Add Product → Activate Order
6. Generate Invoice → Post Invoice
7. Create Academic Order
8. Impersonate student on Experience Site
9. Navigate to Student Financial → Pay Now
10. Complete Stripe payment
11. Validate payment records and balance

## TC02 Flow (Existing Account — Multiple Payments)
Same as TC01 but uses existing Person Account from TC01. Runs two payment scenarios (A and B) with separate Order → Invoice → Payment cycles.


## Existing Files
- `pages/LoginPage.js` — JWT auth login
- `pages/AccountPage.js` — Person Account creation (needs rebuild)
- `pages/OrderPage.js` — Order creation
- `pages/InvoicePage.js` — Invoice posting
- `pages/AcademicOrderPage.js` — Academic Order creation
- `pages/ExperienceSitePage.js` — Community impersonation
- `pages/StudentFinancialPage.js` — Stripe payment
- `pages/CommunityUserPage.js` — Community user setup
- `utils/session-manager.js` — JWT auth
- `utils/test-data.js` — Test data from .env
- `utils/helpers.js` — Utility functions
- `tests/tc01_full_e2e_student_payment.spec.js` — TC01
- `tests/tc02_existing_person_payment.spec.js` — TC02
- `playwright.config.js` — Config (3 projects: setup, tc01, tc02)
