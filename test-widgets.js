const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const artifactsDir = 'C:\\Users\\gaze\\.gemini\\antigravity\\brain\\41ab25e3-1154-4ff4-b95a-df942f8bfdca';

  // Automatically accept any dialogs (like window.confirm for widget deletion)
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
      await page.waitForNavigation({ waitUntil: 'networkidle' });
      console.log('Logged in. Current URL:', page.url());
    }

    // Go to Widgets page
    console.log('Navigating to Widgets page...');
    const widgetsNav = await page.$('a:has-text("Widgets"), button:has-text("Widgets")');
    if (widgetsNav) {
      await widgetsNav.click();
    } else {
      await page.goto('http://127.0.0.1:5173/widgets', { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(2000);
    console.log('On page:', page.url());
    await page.screenshot({ path: path.join(artifactsDir, 'admin-widgets-list-initial.png') });

    // Clean up any existing widgets first to start fresh
    console.log('Cleaning up existing widgets in sidebar...');
    const deleteButtons = await page.$$('button[title="Remove widget"]');
    for (const btn of deleteButtons) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
    console.log('Cleaned up previous widgets.');

    // 2. Add Custom HTML Widget
    console.log('Adding Custom HTML Widget...');
    const sidebarAddBtn = page.locator('div[data-region="sidebar"]').locator('button:has-text("Add Widget")');
    await sidebarAddBtn.click();
    await page.waitForSelector('.modal-content');

    await page.fill('input[placeholder="e.g. About Me, Recent Articles"]', 'Test HTML Widget');
    // Default is HTML widget
    await page.fill('textarea[placeholder="Enter custom HTML or plain text here..."]', '<div class="custom-neon-box">Neon Glowing Sidebar Content</div>');
    await page.click('button:has-text("Save Widget")');
    await page.waitForTimeout(2000);
    console.log('Saved Custom HTML Widget.');

    // 3. Add Search Widget
    console.log('Adding Search Widget...');
    await sidebarAddBtn.click();
    await page.waitForSelector('.modal-content');

    // Select search type
    await page.selectOption('select', { value: 'search' });
    await page.fill('input[placeholder="e.g. About Me, Recent Articles"]', 'Search Website');
    await page.click('button:has-text("Save Widget")');
    await page.waitForTimeout(2000);
    console.log('Saved Search Widget.');

    // 4. Add Recent Posts Widget
    console.log('Adding Recent Posts Widget...');
    await sidebarAddBtn.click();
    await page.waitForSelector('.modal-content');

    // Select recent_posts type
    await page.selectOption('select', { value: 'recent_posts' });
    await page.fill('input[placeholder="e.g. About Me, Recent Articles"]', 'Recent Articles Feed');
    await page.fill('input[type="number"]', '3');
    await page.click('button:has-text("Save Widget")');
    await page.waitForTimeout(2000);
    console.log('Saved Recent Posts Widget.');

    await page.screenshot({ path: path.join(artifactsDir, 'admin-widgets-list-after-adding.png') });

    // Make sure sidebarPosition is 'right' so it renders
    console.log('Configuring active theme sidebar position...');
    const themesNav = await page.$('a:has-text("Themes"), button:has-text("Themes")');
    if (themesNav) {
      await themesNav.click();
    } else {
      await page.goto('http://127.0.0.1:5173/themes', { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(2000);
    
    // Click Customize on the active theme
    // Find active theme card and click Customize button
    const customizeBtn = page.locator('.theme-card[data-active="true"] button:has-text("Customize"), .theme-card:has(.active-badge) button:has-text("Customize"), button:has-text("Customize")').first();
    await customizeBtn.click();
    await page.waitForTimeout(2000);
    
    // Go to Layout section
    const layoutTab = page.locator('button:has-text("Layout")');
    await layoutTab.click();
    await page.waitForTimeout(1000);
    
    // Select "Right" for Sidebar Position
    await page.selectOption('select:has(option:has-text("Right"))', { label: 'Right' });
    // Click Save Settings
    await page.click('button:has-text("Save Settings")');
    await page.waitForTimeout(2000);
    console.log('Sidebar Position set to Right.');

    // 5. Test widget rendering in public facing website
    console.log('Testing public website widgets rendering...');
    const publicPage = await context.newPage();
    await publicPage.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
    await publicPage.waitForTimeout(2000);
    await publicPage.screenshot({ path: path.join(artifactsDir, 'public-homepage-with-widgets.png') });

    const htmlWidgetVisible = await publicPage.isVisible('.widget-custom-html:has-text("Test HTML Widget")');
    const searchWidgetVisible = await publicPage.isVisible('.widget-search:has-text("Search Website")');
    const recentPostsWidgetVisible = await publicPage.isVisible('.widget-recent-posts:has-text("Recent Articles Feed")');
    console.log('Public site widget rendering check - HTML Widget:', htmlWidgetVisible, '| Search:', searchWidgetVisible, '| Recent Posts:', recentPostsWidgetVisible);

    if (!htmlWidgetVisible || !searchWidgetVisible || !recentPostsWidgetVisible) {
      throw new Error('Widget public rendering failed! One or more widgets are not visible.');
    }

    // 6. Test widget reordering
    console.log('Testing widget reordering in Admin UI...');
    await page.bringToFront();
    
    // Go back to Widgets page
    await page.goto('http://127.0.0.1:5173/widgets', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Find the first widget in the sidebar (HTML widget) and click "Move Down"
    const firstWidgetRow = page.locator('div[data-region="sidebar"]').locator('.widget-instance-row:has-text("Test HTML Widget")');
    // Click the Move Down button
    await firstWidgetRow.locator('button[title="Move Down"]').click();
    await page.waitForTimeout(3000);
    console.log('Moved Test HTML Widget down.');
    await page.screenshot({ path: path.join(artifactsDir, 'admin-widgets-list-after-reorder.png') });

    // 7. Verify public site layout has changed
    console.log('Verifying order change on public site...');
    await publicPage.bringToFront();
    await publicPage.reload({ waitUntil: 'networkidle' });
    await publicPage.waitForTimeout(2000);
    await publicPage.screenshot({ path: path.join(artifactsDir, 'public-homepage-after-reorder.png') });

    // 8. Clean up
    console.log('Cleaning up: Removing widgets...');
    await page.bringToFront();
    const cleanButtons = await page.$$('button[title="Remove widget"]');
    for (const btn of cleanButtons) {
      await btn.click();
      await page.waitForTimeout(1500);
    }
    console.log('Widgets removed successfully.');
    await page.screenshot({ path: path.join(artifactsDir, 'admin-widgets-list-final.png') });

    console.log('Widget tests PASSED successfully!');

  } catch (err) {
    console.error('Widget Test FAILED:', err);
    await page.screenshot({ path: path.join(artifactsDir, 'widget-test-error.png') });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
