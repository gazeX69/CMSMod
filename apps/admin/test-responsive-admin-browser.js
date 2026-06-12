import { chromium } from 'playwright';

const ADMIN_URL = process.env.ADMIN_URL || 'http://127.0.0.1:5173';
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword123';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(page) {
  await page.goto(`${ADMIN_URL}/posts/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  if (!page.url().includes('/login')) return;

  await page.getByPlaceholder('Enter your username or email').fill(USERNAME);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

async function layoutState(page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector('.admin-sidebar')?.getBoundingClientRect();
    const menu = document.querySelector('.mobile-menu-button');
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      sidebarX: sidebar?.x ?? null,
      sidebarWidth: sidebar?.width ?? null,
      menuDisplay: menu ? getComputedStyle(menu).display : null,
      contentWidth: document.querySelector('.admin-content-viewport')?.clientWidth ?? null,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await login(page);
  await page.goto(`${ADMIN_URL}/posts/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.article-editor-panel', { timeout: 10000 });

  const mobile = await layoutState(page);
  assert(mobile.documentWidth === mobile.viewportWidth, 'Mobile admin must not overflow the viewport.');
  assert(mobile.sidebarX < 0, 'Mobile sidebar must start closed as an off-canvas drawer.');
  assert(mobile.menuDisplay !== 'none', 'Mobile navigation button must be visible.');
  assert(mobile.contentWidth === mobile.viewportWidth, 'Mobile workspace must use the full viewport width.');

  const editorState = await page.evaluate(() => ({
    columns: getComputedStyle(document.querySelector('.editor-layout-container')).gridTemplateColumns.split(' ').length,
    editorWidth: document.querySelector('.article-editor-panel')?.getBoundingClientRect().width ?? 0,
    inspectorWidth: document.querySelector('.editor-sidebar-panel')?.getBoundingClientRect().width ?? 0,
  }));
  assert(editorState.columns === 1, 'Mobile editor must use one grid column.');
  assert(editorState.editorWidth <= 390, 'Mobile editor must fit inside the viewport.');
  assert(editorState.inspectorWidth <= 390, 'Mobile inspector must fit inside the viewport.');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.admin-sidebar', { timeout: 10000 });

  const desktop = await layoutState(page);
  assert(desktop.documentWidth === desktop.viewportWidth, 'Desktop admin must not overflow the viewport.');
  assert(desktop.sidebarX === 0, 'Desktop sidebar must remain visible.');
  assert(desktop.sidebarWidth >= 76, 'Desktop sidebar must preserve its stable width.');
  assert(desktop.menuDisplay === 'none', 'Mobile navigation button must be hidden on desktop.');

  console.log('Responsive admin browser checks passed (390px mobile and 1440px desktop).');
} finally {
  await browser.close();
}
