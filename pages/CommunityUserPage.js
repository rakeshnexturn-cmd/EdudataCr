const { expect } = require('@playwright/test');
const TestData = require('../utils/test-data');
const Helpers = require('../utils/helpers');

class CommunityUserPage {
  constructor(page) {
    this.page = page;
    this.username = null;
  }

  async findVisualforceFrame(label) {
    // HEALED: Visualforce loads asynchronously, so poll all live frames instead of scanning once.
    let matchingFrame;
    await expect.poll(async () => {
      for (const candidate of this.page.frames()) {
        const field = candidate.getByRole('textbox', { name: label });
        if (await field.isVisible({ timeout: 1000 }).catch(() => false)) {
          matchingFrame = candidate;
          return true;
        }
      }
      return false;
    }, { timeout: 30000 }).toBe(true);
    if (matchingFrame) {
      return matchingFrame;
    }
    throw new Error(`Visualforce iframe containing ${label} was not found`);
  }

  async enableCommunityUser(accountName, data = {}) {
    // HEALED: Open the Person Account action menu; community access is an account action.
    const actions = this.page.getByRole('button', { name: /show more actions|^actions$/i }).last();
    await expect(actions).toBeVisible({ timeout: 10000 });
    await actions.click();
    const enableUser = this.page.getByRole('menuitem', { name: /enable customer user|log in to experience/i }).first();
    await expect(enableUser).toBeVisible({ timeout: 10000 });
    await enableUser.click();
    await this.page.waitForTimeout(2000);

    await this.fillUserDetails(data);
  }

  async fillUserDetails(data = {}) {
    // HEALED: Select the Visualforce iframe by its form label, not its changing frame order.
    const userFrame = await this.findVisualforceFrame(/^\*\s*Username$/i);
    await expect(userFrame.getByRole('textbox', { name: /^\*\s*Username$/i })).toBeVisible({ timeout: 15000 });
    const usernameInput = userFrame.getByRole('textbox', { name: /^\*\s*Username$/i });
    if (await usernameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const uniqueUsername = data.username || TestData.credentials.communityUser || 
        `student.${Date.now()}@${TestData.institute.id.toLowerCase()}.com`;
      this.username = uniqueUsername;
      await usernameInput.fill(uniqueUsername);
    }

    const emailInput = userFrame.getByRole('textbox', { name: /^\*\s*Email$/i });
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(data.email || TestData.student.email);
    }

    // HEALED: Option IDs vary by org; select the visible configured license/profile labels.
    await userFrame.locator('#user_license_id').selectOption({ label: 'Customer Community Plus' });
    await userFrame.locator('#Profile').selectOption({ label: 'EDC Community User' });

    const saveBtn = userFrame.getByRole('row', { name: /User Edit Cancel Save/i })
      .locator('input[name="save"]');
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(4000);

    // HEALED: Dismiss Salesforce's optional post-save confirmation before Setup navigation.
    const okButton = userFrame.getByRole('button', { name: /^ok$/i }).first();
    if (await okButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await okButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async assignPermissionSets() {
    // HEALED: Find the user detail iframe by its Permission Set Group Assignments link.
    const frames = this.page.locator('iframe');
    let userFrame;
    for (let index = 0; index < await frames.count(); index++) {
      const candidate = frames.nth(index).contentFrame();
      if (await candidate.getByRole('link', { name: /Permission Set Group Assignments\[0\]/i }).isVisible({ timeout: 3000 }).catch(() => false)) {
        userFrame = candidate;
        break;
      }
    }
    if (!userFrame) {
      throw new Error('User detail Visualforce iframe was not found');
    }
    const permSetLink = userFrame.getByRole('link', { name: /Permission Set Group Assignments\[0\]/i });
    await expect(permSetLink).toBeVisible({ timeout: 15000 });
    await permSetLink.click();
    const editButton = userFrame.getByRole('row', { name: 'Permission Set Group' })
      .locator('input[name="editPermSetAssignments"]');
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await editButton.click();

    const assignmentFrame = await this.findVisualforceFrame('Available Permission Set');
    await expect(assignmentFrame.getByRole('combobox', { name: 'Available Permission Set' })).toBeVisible({ timeout: 15000 });
    await assignmentFrame.getByRole('combobox', { name: 'Available Permission Set' }).selectOption('0PSf6000008fSRy');
    await assignmentFrame.getByRole('link', { name: 'Add', exact: true }).click();
    await assignmentFrame.locator('input[name="thePage:theForm:thePageBlock:j_id37:bottom:save"]').click();
    await assignmentFrame.getByRole('button', { name: 'Continue' }).click();
    await this.page.waitForTimeout(3000);
  }

  async verifyUserActive() {
    // HEALED: Verify the created community user and its Active status on Setup Users.
    if (this.username) {
      await expect(this.page.getByText(this.username, { exact: true }).first()).toBeVisible({ timeout: 15000 });
    }
    await expect(this.page.getByText('Active', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  }
}

module.exports = CommunityUserPage;






