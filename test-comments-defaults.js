const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const artifactsDir = 'C:\\Users\\gaze\\.gemini\\antigravity\\brain\\0484bd4c-a1ec-40c7-9cc6-abe5df3d66ff';

  // Automatically accept window.confirm dialogs
  page.on('dialog', async dialog => {
    console.log(`Accepting dialog: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    // 1. Go to Login / Admin
    console.log('Navigating to Admin Dashboard...');
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    console.log('Current URL:', page.url());

    if (page.url().includes('login')) {
      console.log('Logging in as Admin...');
      await page.fill('#usernameOrEmail', 'admin');
      await page.fill('input[type="password"]', 'adminpassword123');
      await page.click('.btn-login');
      // Wait for SPA state change to transition URL out of login page
      await page.waitForFunction(() => !window.location.pathname.includes('login'), { timeout: 10000 });
      console.log('Logged in. Current URL:', page.url());
    }

    // 2. Navigate to Comments Page
    console.log('Navigating to Comments page...');
    await page.goto('http://127.0.0.1:5173/comments', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 3. Open Settings Modal
    console.log('Opening Comments Settings Modal...');
    await page.click('button:has-text("Pengaturan")');
    await page.waitForTimeout(1000);

    // 4. Verify checkboxes exist
    const pageCheckbox = page.locator('#default-enabled-page');
    const articleCheckbox = page.locator('#default-enabled-article');

    const pageCheckboxCount = await pageCheckbox.count();
    const articleCheckboxCount = await articleCheckbox.count();
    console.log(`Found ${pageCheckboxCount} default-enabled-page checkbox(es).`);
    console.log(`Found ${articleCheckboxCount} default-enabled-article checkbox(es).`);

    if (pageCheckboxCount === 0 || articleCheckboxCount === 0) {
      throw new Error('Comments default settings checkboxes are missing in the Settings modal!');
    }

    // 5. Toggle checkboxes
    const initialPageChecked = await pageCheckbox.isChecked();
    const initialArticleChecked = await articleCheckbox.isChecked();
    console.log(`Initial checkbox states - Page: ${initialPageChecked}, Article: ${initialArticleChecked}`);

    console.log('Toggling both settings...');
    await pageCheckbox.setChecked(!initialPageChecked);
    await page.waitForTimeout(200);
    await articleCheckbox.setChecked(!initialArticleChecked);
    await page.waitForTimeout(200);

    // 6. Save changes
    console.log('Saving settings changes...');
    await page.click('button:has-text("Simpan Perubahan")');
    await page.waitForTimeout(2000);

    // Check for success alert
    const successBox = page.locator('.login-error-box').filter({ hasText: 'Pengaturan modul komentar berhasil disimpan' });
    const successMsg = await successBox.innerText();
    console.log('Success notification message:', successMsg);

    // 7. Verify changes saved successfully
    console.log('Re-opening Settings Modal to verify saved state...');
    await page.click('button:has-text("Pengaturan")');
    await page.waitForTimeout(1000);

    const savedPageChecked = await pageCheckbox.isChecked();
    const savedArticleChecked = await articleCheckbox.isChecked();
    console.log(`Saved checkbox states - Page: ${savedPageChecked}, Article: ${savedArticleChecked}`);

    if (savedPageChecked === initialPageChecked || savedArticleChecked === initialArticleChecked) {
      throw new Error('Checkbox state toggling was not successfully saved!');
    }
    console.log('[OK] Comments default settings toggles saved and verified successfully.');

    // 8. Revert to standard defaults (Page: unchecked, Article: checked)
    console.log('Reverting settings back to standard defaults...');
    await pageCheckbox.setChecked(false);
    await page.waitForTimeout(200);
    await articleCheckbox.setChecked(true);
    await page.waitForTimeout(200);
    await page.click('button:has-text("Simpan Perubahan")');
    await page.waitForTimeout(2000);

    console.log('Comments defaults E2E tests PASSED successfully!');

  } catch (err) {
    console.error('Comments Defaults Test FAILED:', err);
    await page.screenshot({ path: path.join(artifactsDir, 'comments-defaults-test-error.png') });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
