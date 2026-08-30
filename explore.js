const { chromium } = require('playwright');
require('dotenv').config();
const sessionManager = require('./utils/session-manager');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState: 'tests/.auth/admin.json',
  });
  const page = await context.newPage();

  console.log('[Explore] Logging in...');
  const sessionData = await sessionManager.loginAsAdmin();
  await sessionManager.performBrowserLogin(page, sessionData, process.env.SF_BASE_URL);
  await page.waitForTimeout(3000);
  console.log(`[Explore] Logged in. URL: ${page.url()}`);

  const domain = process.env.SF_BASE_URL.replace('.my.salesforce.com', '.lightning.force.com');

  // Step 1: Go to a record page first (matching the reference flow)
  console.log('\n=== STEP 1: GO TO RECORD ===');
  await page.goto(`${domain}/lightning/r/Account/001f600000ckkqlAAA/view`, {
    waitUntil: 'load', timeout: 60000,
  });
  await page.waitForTimeout(8000);
  console.log(`URL: ${page.url()}`);

  // Step 2: Close any open tabs to get clean state
  console.log('\n=== STEP 2: CLOSE TABS ===');
  let closeTabBtn = page.locator('button[title="Close Tab"]').first();
  while (await closeTabBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeTabBtn.click({ force: true });
    await page.waitForTimeout(1000);
    closeTabBtn = page.locator('button[title="Close Tab"]').first();
  }
  await page.screenshot({ path: 'explore/flow-00-clean.png' });

  // Step 3: Click Show Navigation Menu
  console.log('\n=== STEP 3: SHOW NAV MENU ===');
  const navMenuBtn = page.locator('button[title="Show Navigation Menu"]');
  if (await navMenuBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await navMenuBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'explore/flow-03-nav-menu.png' });

    // Step 4: Click Accounts in menu
    console.log('\n=== STEP 4: CLICK ACCOUNTS IN MENU ===');
    const accountsMenuItem = page.locator('xpath=//span[normalize-space()="Accounts"]').first();
    if (await accountsMenuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accountsMenuItem.click({ force: true });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'explore/flow-04-accounts-clicked.png' });
      console.log(`URL after menu click: ${page.url()}`);
    }
  }

  // Step 5: Click Accounts tab
  console.log('\n=== STEP 5: CLICK ACCOUNTS TAB ===');
  const accountsTab = page.locator('xpath=//span[normalize-space()="Accounts"]').first();
  if (await accountsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await accountsTab.click({ force: true });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'explore/flow-05-accounts-tab.png' });
    console.log(`URL after tab click: ${page.url()}`);
  }

  // Step 6: Click New (div element, not button)
  console.log('\n=== STEP 6: CLICK NEW ===');
  const newDiv = page.locator('xpath=//div[contains(text(),"New")]').first();
  if (await newDiv.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Found New div, clicking...');
    const tag = await newDiv.evaluate(el => el.tagName).catch(() => '');
    const text = await newDiv.textContent().catch(() => '');
    const cls = await newDiv.getAttribute('class').catch(() => '');
    console.log(`  tag=${tag} text="${text.trim()}" class="${(cls||'').substring(0, 60)}"`);
    await newDiv.click({ force: true });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'explore/flow-06-record-type.png' });
    console.log(`URL: ${page.url()}`);
  } else {
    console.log('New div NOT found, trying alternatives...');
    // Try the list view header New button
    const headerNew = page.locator('xpath=//div[contains(@class,"forceListViewRecordCreate")]//div[contains(text(),"New")]').first();
    if (await headerNew.isVisible({ timeout: 3000 }).catch(() => false)) {
      await headerNew.click({ force: true });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'explore/flow-06-alt-new.png' });
    } else {
      // Try all elements with "New" text
      const allNew = page.locator('xpath=//*[normalize-space()="New"]');
      const count = await allNew.count();
      console.log(`Found ${count} elements with text "New"`);
      for (let i = 0; i < count; i++) {
        const visible = await allNew.nth(i).isVisible().catch(() => false);
        if (!visible) continue;
        const tag = await allNew.nth(i).evaluate(el => el.tagName).catch(() => '');
        const cls = await allNew.nth(i).getAttribute('class').catch(() => '');
        console.log(`  ${i}: tag=${tag} class="${(cls||'').substring(0, 60)}"`);
      }
    }
  }

  // Step 7: Check if record type selector appeared
  console.log('\n=== STEP 7: RECORD TYPE SELECTOR ===');
  const radios = page.locator('input[type="radio"]');
  const radioCount = await radios.count();
  console.log(`Radio inputs: ${radioCount}`);

  if (radioCount > 0) {
    for (let i = 0; i < radioCount; i++) {
      const value = await radios.nth(i).getAttribute('value').catch(() => '');
      const label = await radios.nth(i).evaluate(el => {
        const lbl = el.closest('label') || el.parentElement;
        return lbl ? lbl.textContent.trim() : '';
      }).catch(() => '');
      console.log(`  RT: value="${value}" label="${label}"`);
    }

    // Step 7: Click Person Account
    console.log('\n=== STEP 7: SELECT PERSON ACCOUNT ===');
    const personAccountLabel = page.locator('xpath=//fieldset//label[1]//span[1]').first();
    if (await personAccountLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Found Person Account via fieldset label');
      await personAccountLabel.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'explore/flow-07-person-account.png' });

      // Step 8: Click Next
      console.log('\n=== STEP 8: CLICK NEXT ===');
      const nextBtn = page.locator('xpath=//span[contains(text(),"Next")]').first();
      if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Found Next span, clicking...');
        await nextBtn.click({ force: true });
        await page.waitForTimeout(8000);
        await page.screenshot({ path: 'explore/flow-08-create-form.png' });
        console.log(`URL: ${page.url()}`);

        // List form fields
        console.log('\n=== FORM FIELDS ===');
        const labels = page.locator('.slds-form-element__label');
        const lblCount = await labels.count();
        console.log(`Labels: ${lblCount}`);
        for (let i = 0; i < lblCount; i++) {
          const text = await labels.nth(i).textContent().catch(() => '');
          if (text.trim()) console.log(`  Label: "${text.trim()}"`);
        }

        const inputs = page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea');
        const inpCount = await inputs.count();
        console.log(`\nInputs: ${inpCount}`);
        for (let i = 0; i < inpCount; i++) {
          const visible = await inputs.nth(i).isVisible().catch(() => false);
          if (!visible) continue;
          const name = await inputs.nth(i).getAttribute('name').catch(() => '');
          const placeholder = await inputs.nth(i).getAttribute('placeholder').catch(() => '');
          const type = await inputs.nth(i).getAttribute('type').catch(() => '');
          console.log(`  Input: name="${name}" placeholder="${placeholder}" type="${type}"`);
        }

        const pickers = page.locator('lightning-record-picker');
        const pCount = await pickers.count();
        console.log(`\nRecord Pickers: ${pCount}`);
        for (let i = 0; i < pCount; i++) {
          const visible = await pickers.nth(i).isVisible().catch(() => false);
          if (!visible) continue;
          const label = await pickers.nth(i).getAttribute('label').catch(() => '');
          const ph = await pickers.nth(i).locator('input').getAttribute('placeholder').catch(() => '');
          console.log(`  Picker: label="${label}" placeholder="${ph}"`);
        }

        const combos = page.locator('lightning-combobox');
        const cCount = await combos.count();
        console.log(`\nComboboxes: ${cCount}`);
        for (let i = 0; i < cCount; i++) {
          const visible = await combos.nth(i).isVisible().catch(() => false);
          if (!visible) continue;
          const label = await combos.nth(i).getAttribute('label').catch(() => '');
          console.log(`  Combobox: label="${label}"`);
        }

        // Footer buttons
        console.log('\nFooter buttons:');
        const footerBtns = page.locator('.slds-modal__footer button');
        const fCount = await footerBtns.count();
        for (let i = 0; i < fCount; i++) {
          const text = await footerBtns.nth(i).textContent().catch(() => '');
          const name = await footerBtns.nth(i).getAttribute('name').catch(() => '');
          console.log(`  Button: text="${text.trim()}" name="${name}"`);
        }

        await page.screenshot({ path: 'explore/flow-09-form-full.png', fullPage: true });
      }
    } else {
      console.log('Person Account label NOT found via fieldset//label[1]//span[1]');
    }
  } else {
    console.log('No record type selector found');
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await dialog.first().textContent().catch(() => '');
      console.log(`Dialog: ${text.substring(0, 500)}`);
    }
  }

  console.log('\n=== EXPLORATION COMPLETE ===');
  await browser.close();
})();
