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
    const uniqueId = Date.now();
    const formTitle = `Playwright Contact Form ${uniqueId}`;
    const editedFormTitle = `Playwright Contact Form Edited ${uniqueId}`;

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

    // 2. Activate Plugin if not already active
    console.log('Navigating to Plugins page...');
    await page.goto('http://127.0.0.1:5173/plugins', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const pluginRow = page.locator('tr:has-text("Contact Form")');
    const toggleButton = pluginRow.locator('button');
    const buttonText = await toggleButton.innerText();
    console.log('Contact Form plugin action button text:', buttonText);

    if (buttonText.includes('Activate')) {
      console.log('Activating Contact Form plugin...');
      await toggleButton.click();
      await page.waitForTimeout(3000); // wait for activation / migrations
    } else {
      console.log('Contact Form plugin is already Active/Inactive.');
    }

    // 3. Go to Contact Form Manager
    console.log('Navigating to Contact Form page...');
    await page.goto('http://127.0.0.1:5173/contact-form', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 4. Click "New Form" or "Create First Form"
    const newFormBtn = page.locator('button:has-text("New Form"), button:has-text("Create First Form")');
    console.log('Clicking New Form...');
    await newFormBtn.first().click();
    await page.waitForTimeout(1000);

    // 5. Fill Form settings
    console.log(`Entering form title: ${formTitle}`);
    await page.fill('input[placeholder="e.g. Formulir Kontak Hubungi Kami"]', formTitle);
    await page.fill('input[placeholder="Defaults to setting message if empty"]', 'Terima kasih, pesan Anda berhasil terkirim!');
    await page.fill('input[placeholder="Submit"]', 'Kirim Pesan');
    await page.waitForTimeout(1000);

    // Click Save Form
    console.log('Saving Form...');
    await page.click('button:has-text("Save Form")');
    await page.waitForTimeout(2000);

    // Verify it is listed in the table
    const formRow = page.locator(`tr:has-text("${formTitle}")`);
    const rowCount = await formRow.count();
    console.log(`Matching rows count for "${formTitle}":`, rowCount);
    if (rowCount === 0) {
      throw new Error('Created contact form is not visible in the list table!');
    }

    // 6. Edit the form
    console.log('Editing the form...');
    await formRow.locator('button:has-text("Edit")').click();
    await page.waitForTimeout(1000);

    console.log(`Updating form title to: ${editedFormTitle}`);
    await page.fill('input[placeholder="e.g. Formulir Kontak Hubungi Kami"]', editedFormTitle);
    await page.waitForTimeout(500);

    console.log('Saving modified form...');
    await page.click('button:has-text("Save Form")');
    await page.waitForTimeout(2000);

    // Verify edited form is in list
    const editedFormRow = page.locator(`tr:has-text("${editedFormTitle}")`);
    const editedRowCount = await editedFormRow.count();
    console.log(`Matching rows count for edited form:`, editedRowCount);
    if (editedRowCount === 0) {
      throw new Error('Edited contact form is not visible in the list table!');
    }

    // 7. Delete the form
    console.log('Deleting the form...');
    await editedFormRow.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);

    // Verify it is gone
    const finalCount = await page.locator(`tr:has-text("${editedFormTitle}")`).count();
    console.log('Matching rows count after delete:', finalCount);
    if (finalCount > 0) {
      throw new Error('Contact form was not deleted from the list table!');
    }

    console.log('Contact Form CRUD dashboard tests PASSED successfully!');

  } catch (err) {
    console.error('Contact Form CRUD Test FAILED:', err);
    await page.screenshot({ path: path.join(artifactsDir, 'contact-form-test-error.png') });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
