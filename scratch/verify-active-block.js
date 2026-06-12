const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console messages from the browser
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[ACTIVE BLOCK VERIFY]')) {
      console.log('  -> ' + text);
    }
  });

  try {
    console.log('1. Navigating to Login Page...');
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    
    if (page.url().includes('login')) {
      console.log('Logging in...');
      await page.fill('#usernameOrEmail', 'admin');
      await page.fill('#password', 'adminpassword123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    console.log('2. Navigating to New Post Editor...');
    await page.goto('http://127.0.0.1:5173/posts/new', { waitUntil: 'networkidle' });
    await page.waitForSelector('.tiptap-editor-wrapper');
    console.log('Editor loaded.');

    // Focus editor
    const editor = await page.locator('.ProseMirror');
    await editor.focus();
    await page.waitForTimeout(500);

    // Let's create blocks using keyboard commands
    console.log('\n--- VERIFYING PARAGRAPH ---');
    await page.keyboard.type('This is a test paragraph.');
    await page.waitForTimeout(500);

    console.log('\n--- VERIFYING HEADING ---');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/heading 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is heading 1.');
    await page.waitForTimeout(500);

    console.log('\n--- VERIFYING BLOCKQUOTE ---');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/quote');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is a blockquote citation.');
    await page.waitForTimeout(500);

    console.log('\n--- VERIFYING CODE BLOCK ---');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Backspace'); // clear characters in blockquote if any
    await page.keyboard.type('/code');
    await page.keyboard.press('Enter');
    await page.keyboard.type('const a = 123;');
    await page.waitForTimeout(500);

    console.log('\n--- VERIFYING LIST ITEM ---');
    // Exit code block
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    // Trigger bullet list by typing asterisk + space
    await page.keyboard.type('* First list item.');
    await page.waitForTimeout(500);

    console.log('\n--- VERIFICATION COMPLETED ---');

  } catch (err) {
    console.error('Error in verification:', err);
  } finally {
    await browser.close();
  }
})();
