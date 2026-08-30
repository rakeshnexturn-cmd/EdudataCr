---
name: locators
description: >
  Locator strategy guide for Salesforce Lightning. Covers priority order,
  SF-specific patterns, anti-patterns, and how to fix element-not-found errors.
---

# Locators Skill — SF Agentic Framework

## Priority Order
```
1. page.getByRole('button', { name: 'New' })
2. page.getByLabel('First Name')
3. page.getByPlaceholder('Search...')
4. page.getByText('text', { exact: true })
5. page.locator('[aria-label="..."]')
6. page.locator('.toastMessage')   ← ONLY allowed CSS class
```
Never use: CSS classes, XPath with IDs, data-aura-*, data-component-id

## Common SF Locators
```js
// Buttons
page.getByRole('button', { name: 'New' })
page.getByRole('button', { name: 'Save' })
page.getByRole('button', { name: 'Edit' })
page.getByRole('button', { name: 'Convert' })

// Nav
page.getByRole('link', { name: 'Leads' })
page.locator('[title="App Launcher"]')

// Form fields
page.getByLabel('First Name') / page.getByLabel('Company')
page.getByLabel('Stage')       // picklist
page.getByLabel('Close Date')  // date MM/DD/YYYY
page.getByLabel('Account Name') // lookup

// Picklist — try A first
// A: page.getByLabel('Stage').selectOption('Needs Analysis')
// B: page.getByLabel('Stage').click() then page.getByRole('option', { name: 'Needs Analysis' }).click()

// Lookup
await page.getByLabel('Account Name').fill('Acme Corp');
await page.waitForTimeout(600);
await page.getByRole('option', { name: 'Acme Corp' }).first().click();

// Modal — always scope
const dialog = page.getByRole('dialog');
await dialog.waitFor({ state: 'visible' });
await dialog.getByLabel('First Name').fill('value');

// Toast
page.locator('.toastMessage')

// List view
page.getByRole('button', { name: /Select a List View/i })
page.getByRole('option', { name: 'All Leads' })
```

## Fix: Multiple Elements Match
```js
await page.getByRole('button', { name: 'Edit' }).first().click();
await page.getByText('Close Date', { exact: true }).click();
const detailPane = page.locator('.slds-card').first();
await detailPane.getByRole('button', { name: 'Edit' }).click();
```

## Fix: Element Not Found
```js
// 1. Scope to dialog
await page.getByRole('dialog').getByLabel('First Name').fill('x');
// 2. Wait for visible
await page.getByRole('button', { name: 'New' }).waitFor({ state: 'visible' });
// 3. Try alternate role
page.getByRole('combobox', { name: 'Stage' })
page.getByRole('textbox', { name: 'Company' })
// 4. Use playwright-cli snapshot to see actual element refs
```

## Date Fields (SF needs MM/DD/YYYY)
```js
import { getDatePlusDays } from '../utils/locator-utils.js';
await page.getByLabel('Close Date').fill(getDatePlusDays(30));
```
