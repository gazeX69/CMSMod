const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const artifactsDir = 'C:\\Users\\gaze\\.gemini\\antigravity\\brain\\41ab25e3-1154-4ff4-b95a-df942f8bfdca';

  // Automatically accept any dialogs (like window.confirm for user deletion)
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

    // Check that admin can access Users view
    console.log('Navigating to Users page...');
    const usersNav = await page.$('a:has-text("Users"), li:has-text("Users")');
    if (usersNav) {
      await usersNav.click();
    } else {
      await page.goto('http://127.0.0.1:5173/users', { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(2000);
    console.log('On page:', page.url());
    await page.screenshot({ path: path.join(artifactsDir, 'admin-users-list.png') });

    // Pre-test cleanup: delete existing editor_user / author_user if they are still there from a previous run
    console.log('Checking for existing test users to clean up...');
    for (const username of ['editor_user', 'author_user']) {
      const row = page.locator('tr', { hasText: username });
      const count = await row.count();
      if (count > 0) {
        console.log(`Found existing ${username}, deleting...`);
        await row.locator('button:has-text("Delete")').click();
        await page.waitForTimeout(2000);
      }
    }

    // 2. Create Editor User
    console.log('Creating Editor user...');
    await page.click('button:has-text("Add New User")');
    await page.waitForSelector('.modal-content');

    await page.fill('input[placeholder="Username"]', 'editor_user');
    await page.fill('input[placeholder="Email address"]', 'editor@local.com');
    await page.fill('input[placeholder="Password"]', 'editorpassword123');
    
    // Select role "Editor"
    await page.selectOption('select:has(option:has-text("Editor"))', { label: 'Editor' });
    await page.click('button:has-text("Save User")');
    await page.waitForTimeout(2000);
    console.log('Saved Editor user.');

    // 3. Create Author User
    console.log('Creating Author user...');
    await page.click('button:has-text("Add New User")');
    await page.waitForSelector('.modal-content');

    await page.fill('input[placeholder="Username"]', 'author_user');
    await page.fill('input[placeholder="Email address"]', 'author@local.com');
    await page.fill('input[placeholder="Password"]', 'authorpassword123');
    
    // Select role "Author"
    await page.selectOption('select:has(option:has-text("Author"))', { label: 'Author' });
    await page.click('button:has-text("Save User")');
    await page.waitForTimeout(2000);
    console.log('Saved Author user.');
    await page.screenshot({ path: path.join(artifactsDir, 'admin-users-list-after.png') });

    // 4. Logout
    console.log('Logging out...');
    await page.click('.btn-logout-header');
    await page.waitForTimeout(2000);
    console.log('Logged out. Current URL:', page.url());

    // 5. Log in as Editor User
    console.log('Logging in as Editor user...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#usernameOrEmail', 'editor_user');
    await page.fill('input[type="password"]', 'editorpassword123');
    await page.click('.btn-login');
    await page.waitForTimeout(3000);
    console.log('Logged in as Editor. URL:', page.url());
    await page.screenshot({ path: path.join(artifactsDir, 'editor-dashboard.png') });

    // 6. Verify menu filtering for Editor (should hide Themes, Menus, Users, Settings)
    const themesVisible = await page.isVisible('a:has-text("Themes"), li:has-text("Themes")');
    const usersVisible = await page.isVisible('a:has-text("Users"), li:has-text("Users")');
    const settingsVisible = await page.isVisible('a:has-text("Settings"), li:has-text("Settings")');
    console.log('Editor Sidebar Visibility check - Themes:', themesVisible, '| Users:', usersVisible, '| Settings:', settingsVisible);
    if (themesVisible || usersVisible || settingsVisible) {
      throw new Error('Menu filtering failed! Themes, Users, or Settings visible to Editor.');
    }

    // 7. Verify frontend view guards for Editor (going directly to /users should show Access Denied)
    console.log('Testing frontend route guard for /users...');
    await page.goto('http://127.0.0.1:5173/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactsDir, 'editor-users-forbidden.png') });
    const accessDeniedVisible = await page.isVisible('h3:has-text("Akses Ditolak")');
    console.log('Access Denied screen visible?', accessDeniedVisible);
    if (!accessDeniedVisible) {
      throw new Error('Frontend route guard failed! Editor accessed /users without Access Denied view.');
    }

    // 8. Test backend security (GET /api/users should return 403)
    console.log('Testing backend route security (GET /api/users)...');
    const apiRes = await context.request.get('http://127.0.0.1:4000/api/users');
    console.log('Backend API users response status:', apiRes.status());
    if (apiRes.status() !== 403) {
      throw new Error(`Backend security failed! GET /api/users returned status ${apiRes.status()} instead of 403.`);
    }
    console.log('Backend security check passed!');

    // 9. Clean up: Logout, Log back in as admin, delete test users
    console.log('Logging out Editor...');
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    await page.click('.btn-logout-header');
    await page.waitForTimeout(2000);

    console.log('Logging in as Admin to clean up...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    await page.fill('#usernameOrEmail', 'admin');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('.btn-login');
    await page.waitForTimeout(3000);

    await page.goto('http://127.0.0.1:5173/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Delete editor_user
    console.log('Deleting editor_user...');
    const editorRow = page.locator('tr', { hasText: 'editor_user' });
    await editorRow.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);

    // Delete author_user
    console.log('Deleting author_user...');
    const authorRow = page.locator('tr', { hasText: 'author_user' });
    await authorRow.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);

    console.log('Cleanup complete. Verifying list is clean...');
    await page.screenshot({ path: path.join(artifactsDir, 'admin-users-list-after-cleanup.png') });
    console.log('Test PASSED successfully!');

  } catch (err) {
    console.error('Test FAILED:', err);
    await page.screenshot({ path: path.join(artifactsDir, 'test-error.png') });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
