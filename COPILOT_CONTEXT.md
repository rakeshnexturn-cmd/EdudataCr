# Salesforce Education Cloud E2E Automation — Copilot Context

## Project Overview
Playwright (JavaScript) automation framework for Salesforce Education Cloud E2E Student Payment Flow. Two test cases: TC01 (full new account creation) and TC02 (reuse existing account for multiple payments).

## Critical Findings — Salesforce Lightning SPA Behavior

### Navigation Rules
- **NEVER use `page.goto()` for Salesforce Lightning URLs** — the SPA intercepts all direct URL navigation
- **All navigation must go through UI buttons** (App Launcher, Navigation Menu, tabs, etc.)
- **`storageState` is unreliable** — Lightning sessions don't persist properly. Each test must login fresh using `sessionManager.loginAsAdmin()` + `sessionManager.performBrowserLogin()`

### Working Navigation Flow (Verified)
```
1. Login via sessionManager.performBrowserLogin() → lands on a record page
2. Wait for Lightning UI: page.locator('.appLauncher').waitFor({ visible: true, timeout: 30000 })
3. Click "Show Navigation Menu" button (hamburger icon)
4. Click "Accounts" in the menu (role="menuitem")
5. Click "Accounts" tab (a[title="Accounts"])
6. Click "New" div element: xpath=//div[contains(text(),"New")]
7. Record type selector opens with 7 options
8. Select Person Account: xpath=//input[@value="012f60000030z8KAAQ"]
9. Click Next: xpath=//span[contains(text(),"Next")]
10. Fill form fields → Save: button[name="SaveEdit"]
```

### Key Selectors
| Element | Selector | Notes |
|---------|----------|-------|
| App Launcher | `button[title="App Launcher"]` | Nine dots icon |
| Nav Menu | `button[title="Show Navigation Menu"]` | Hamburger icon |
| Accounts Menu Item | `[role="menuitem"]:has-text("Accounts")` | In dropdown menu |
| Accounts Tab | `a[title="Accounts"]` | Top navigation tab |
| New Button (List View) | `xpath=//div[contains(text(),"New")]` | **div, NOT button** |
| Record Type Radio | `xpath=//input[@value="012f60000030z8KAAQ"]` | Person Account |
| Next Button | `xpath=//span[contains(text(),"Next")]` | In record type modal |
| Save Button | `button[name="SaveEdit"]` | Footer of create form |
| Cancel Button | `button[name="CancelEdit"]` | Footer of create form |
| Close Tab | `button[title="Close Tab"]` | To clean up tabs |
| Error Dialog Close | `button[title="Cancel and close"]` | Dismiss errors |

### Record Types (Account Object)
- Household (`012f60000030z8NAAQ`)
- Business Account (`012f60000030z8OAAQ`)
- College (`012f60000030z8LAAQ`)
- Exam (`012f60000030z8PAAQ`)
- Military (`012f60000030z8wAAA`)
- **Person Account (`012f60000030z8KAAQ`)** ← Use this
- Secondary School (`012f60000030z8MAAQ`)

### Person Account Create Form Fields
- `input[name="Name"]` — Account Name (required)
- `input[name="Phone"]` — Phone
- `input[name="Fax"]` — Fax
- `input[name="Website"]` — Website
- `input[name="Institution_Code__c"]` — Institution Code
- Billing Address: `input[name="street"]`, `input[name="city"]`, `input[name="postalCode"]`, `input[name="country"]` (first set)
- Shipping Address: same fields (second set)

## Auth Setup
- **JWT Bearer Flow** via External Client App (bypasses MFA)
- Certificate: `certs/private-key.pem`
- Execution User: `rakesh.sharma@nexturn.com.edc`
- Session: `utils/session-manager.js` handles JWT + frontdoor.jsp
- Each test MUST call `sessionManager.loginAsAdmin()` + `performBrowserLogin()` at start

## Test Data (from .env)
- Student: Test Student, test.student@acmeuni.edu, 5551234567
- Institute: ACME_UNI
- Product: Tuition Fee, qty 1, $10,000
- Stripe: 4242424242424242, 12/30, 123
- Billing Address Search: ABC

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

## Environment
- Platform: Windows, Node.js
- Browser: Chromium (headless: false, viewport: 1280x800)
- Salesforce: Summer '26, My Domain: nexturninc2
- App: Student Financials
