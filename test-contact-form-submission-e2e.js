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
    const formTitle = `E2E Submit Form ${uniqueId}`;
    const pageTitle = `E2E Submit Page ${uniqueId}`;
    const pageSlug = `e2e-submit-page-${uniqueId}`;

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

    // 2. Ensure Contact Form plugin is active
    console.log('Checking Contact Form plugin status...');
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
    }

    // 3. Go to Contact Form Manager and create a new form
    console.log('Navigating to Contact Form page...');
    await page.goto('http://127.0.0.1:5173/contact-form', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Creating a new form...');
    const newFormBtn = page.locator('button:has-text("New Form"), button:has-text("Create First Form")');
    await newFormBtn.first().click();
    await page.waitForTimeout(1000);

    await page.fill('input[placeholder="e.g. Formulir Kontak Hubungi Kami"]', formTitle);
    await page.fill('input[placeholder="Submit"]', 'Kirim Pesan');
    await page.click('button:has-text("Save Form")');
    await page.waitForTimeout(2000);

    // 4. Retrieve newly created form's UUID
    console.log('Retrieving form UUID from the list table...');
    const formRow = page.locator(`tr:has-text("${formTitle}")`);
    const codeTag = formRow.locator('code');
    const codeText = await codeTag.innerText();
    console.log('Embed tag code text:', codeText);

    const match = codeText.match(/id="([^"]+)"/);
    if (!match) {
      throw new Error(`Failed to parse form UUID from: ${codeText}`);
    }
    const formUuid = match[1];
    console.log('Found Form UUID:', formUuid);

    // 5. Create a new Page containing the shortcode
    console.log('Navigating to Pages page...');
    await page.goto('http://127.0.0.1:5173/pages', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Creating a new page to host the form...');
    await page.click('button:has-text("New Page")');
    await page.waitForTimeout(1000);

    await page.fill('input[placeholder="Enter page title..."]', pageTitle);
    await page.waitForTimeout(500);

    console.log('Inserting shortcode into editor...');
    await page.fill('.ProseMirror', `[Contact_Form-${formUuid}]`);
    await page.waitForTimeout(1000);

    console.log('Publishing the page...');
    await page.click('button:has-text("Publish Page")');
    await page.waitForTimeout(3000);

    // 6. Navigate to the published page on the public website (port 5174)
    const publicPageUrl = `http://127.0.0.1:5174/${pageSlug}`;
    console.log(`Navigating to public website page: ${publicPageUrl}`);
    await page.goto(publicPageUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 7. Verify the form exists and fill it
    console.log('Verifying the rendered contact form...');
    const formLocator = page.locator('form.cms-contact-form');
    if (await formLocator.count() === 0) {
      throw new Error('The contact form was not rendered on the public website page!');
    }

    console.log('Filling form inputs...');
    await page.fill('input[name="name"]', 'Playwright E2E Tester');
    await page.fill('input[name="email"]', 'tester@playwright.com');
    await page.fill('textarea[name="message"]', 'Halo, ini adalah pesan tes E2E otomatis dari Playwright.');
    await page.waitForTimeout(500);

    console.log('Submitting the form...');
    await page.click('form.cms-contact-form button[type="submit"]');
    await page.waitForTimeout(2000);

    // 8. Verify submission success banner on public page
    console.log('Checking for submission success alert...');
    const alertBox = page.locator('.cms-form-alert');
    await alertBox.waitFor({ state: 'visible', timeout: 5000 });
    const alertText = await alertBox.innerText();
    console.log('Success Alert Message:', alertText);

    if (!alertText.includes('terkirim') && !alertText.includes('success')) {
      throw new Error(`Submission failed! Alert text: ${alertText}`);
    }
    console.log('[OK] Form submitted successfully from public page!');

    // 9. Go back to Admin Panel and verify it is received in Inbox
    console.log('Navigating back to Admin Dashboard to check submissions inbox...');
    await page.goto('http://127.0.0.1:5173/contact-form', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Switching to Submissions Inbox tab...');
    await page.click('button:has-text("Submissions Inbox")');
    await page.waitForTimeout(2000);

    // Verify our submission is in the inbox list
    console.log('Verifying submission in the inbox table...');
    const submissionRow = page.locator('tr').filter({ hasText: 'tester@playwright.com' });
    const submissionCount = await submissionRow.count();
    console.log(`Found ${submissionCount} submission row(s) for tester@playwright.com`);

    if (submissionCount === 0) {
      throw new Error('Form submission was NOT found in the Admin Submissions Inbox!');
    }
    console.log('[OK] Form submission was successfully received and is visible in the Admin Inbox.');

    // 10. Clean up - Delete the created page
    console.log('Cleaning up: Navigating to Pages list to delete the test page...');
    await page.goto('http://127.0.0.1:5173/pages', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const adminPageRow = page.locator(`tr:has-text("${pageTitle}")`);
    await adminPageRow.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);
    console.log('[OK] Test page deleted.');

    // Clean up - Delete the created form
    console.log('Cleaning up: Navigating to Contact Forms to delete the test form...');
    await page.goto('http://127.0.0.1:5173/contact-form', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const adminFormRow = page.locator(`tr:has-text("${formTitle}")`);
    await adminFormRow.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);
    console.log('[OK] Test form deleted.');

    console.log('\n========================================================');
    console.log('CONTACT FORM SUBMISSION E2E TEST PASSED SUCCESSFULLY!');
    console.log('========================================================\n');

  } catch (err) {
    console.error('Contact Form Submission E2E Test FAILED:', err);
    await page.screenshot({ path: path.join(artifactsDir, 'contact-form-submission-error.png') });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
