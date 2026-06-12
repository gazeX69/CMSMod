const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const artifactsDir = 'C:\\Users\\gaze\\.gemini\\antigravity\\brain\\0484bd4c-a1ec-40c7-9cc6-abe5df3d66ff';

  // Automatically accept window.confirm dialogs (like page deletion)
  page.on('dialog', async dialog => {
    console.log(`Accepting dialog: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    const uniqueId = Date.now();
    const pageTitle = `Test Playwright Page ${uniqueId}`;
    const editedPageTitle = `Test Playwright Page Edited ${uniqueId}`;

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

    // 2. Go to Pages Content Manager
    console.log('Navigating to Pages...');
    try {
      const isCollapsed = await page.evaluate(() => {
        const accordion = document.querySelector('div[title="Pages"]');
        if (!accordion) return false;
        const subItem = document.querySelector('button[title="All Pages"]');
        return !subItem || subItem.getBoundingClientRect().height === 0;
      });

      if (isCollapsed) {
        console.log('Expanding Pages accordion in sidebar...');
        await page.click('div[title="Pages"]');
        await page.waitForTimeout(500);
      }
      
      const allPagesBtn = await page.$('button[title="All Pages"]');
      if (allPagesBtn && (await allPagesBtn.isVisible())) {
        console.log('Clicking "All Pages" sub-menu item...');
        await allPagesBtn.click();
      } else {
        console.log('Sidebar button not visible, doing direct navigation to /pages...');
        await page.goto('http://127.0.0.1:5173/pages', { waitUntil: 'networkidle' });
      }
    } catch (e) {
      console.log('Sidebar navigation failed, trying direct URL navigation...', e.message);
      await page.goto('http://127.0.0.1:5173/pages', { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(2000);
    console.log('On page:', page.url());
    await page.screenshot({ path: path.join(artifactsDir, 'admin-pages-list-initial.png') });

    // Verify Heading says "Pages"
    const heading = await page.locator('.view-header-with-action h2').innerText();
    console.log('Heading text:', heading);
    if (heading !== 'Pages') {
      throw new Error(`Expected heading "Pages", but got "${heading}"`);
    }

    // 3. Create a new Page
    console.log('Clicking "New Page"...');
    await page.click('button:has-text("New Page")');
    await page.waitForTimeout(1000);
    console.log('New page editor URL:', page.url());

    // Enter title
    console.log(`Entering title: ${pageTitle}`);
    await page.fill('input[placeholder="Enter page title..."]', pageTitle);
    await page.waitForTimeout(1000);

    // Enter body content in Tiptap
    console.log('Entering page body content...');
    await page.fill('.ProseMirror', 'This is a test page created by Playwright automated verification.');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(artifactsDir, 'admin-pages-editor-filled.png') });

    // Click Publish Page
    console.log('Publishing page...');
    await page.click('button:has-text("Publish Page")');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(artifactsDir, 'admin-pages-after-publish.png') });

    // Check for success alert
    const successBox = page.locator('.login-error-box').filter({ hasText: 'Page published successfully' });
    const successMsg = await successBox.innerText();
    console.log('Success notification message:', successMsg);

    // 4. Return to list view
    console.log('Returning to list view...');
    await page.click('button:has-text("Pages")');
    await page.waitForTimeout(2000);
    console.log('Back on list page:', page.url());
    await page.screenshot({ path: path.join(artifactsDir, 'admin-pages-list-updated.png') });

    // Verify the page is listed
    const pageRow = page.locator(`tr:has-text("${pageTitle}")`);
    const rowCount = await pageRow.count();
    console.log(`Matching rows count for "${pageTitle}":`, rowCount);
    if (rowCount === 0) {
      throw new Error('Created page is not visible in the table list!');
    }

    // 5. Edit the Page
    console.log('Clicking edit on the page...');
    await pageRow.locator('button:has-text("Edit")').click();
    await page.waitForTimeout(2000);
    console.log('Editing URL:', page.url());

    // Modify title
    console.log(`Modifying page title to: ${editedPageTitle}`);
    await page.fill('input[placeholder="Enter page title..."]', editedPageTitle);
    await page.waitForTimeout(1000);

    // Save modifications
    console.log('Saving modifications...');
    await page.click('button:has-text("Publish Page")');
    await page.waitForTimeout(3000);
    
    // Check update success message
    const updateBox = page.locator('.login-error-box').filter({ hasText: 'Page published successfully' });
    const updateMsg = await updateBox.innerText();
    console.log('Update notification message:', updateMsg);

    // 6. Go back to list and check if title is updated
    console.log('Returning to list view to verify edit...');
    await page.click('button:has-text("Pages")');
    await page.waitForTimeout(2000);

    const editedPageRow = page.locator(`tr:has-text("${editedPageTitle}")`);
    const editedCount = await editedPageRow.count();
    console.log('Matching rows count for edited page:', editedCount);
    if (editedCount === 0) {
      throw new Error('Edited page is not visible in the table list!');
    }

    // 7. Delete the Page
    console.log('Deleting the page...');
    await editedPageRow.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);
    console.log('Page deleted successfully.');

    // 8. Verify it is removed
    const finalCount = await page.locator(`tr:has-text("${editedPageTitle}")`).count();
    console.log('Matching rows count after delete:', finalCount);
    if (finalCount > 0) {
      throw new Error('Page was not deleted from the table list!');
    }

    console.log('Pages CRUD Universal Content Manager tests PASSED successfully!');

  } catch (err) {
    console.error('Pages CRUD Test FAILED:', err);
    await page.screenshot({ path: path.join(artifactsDir, 'pages-crud-test-error.png') });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
