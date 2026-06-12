import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ADMIN_URL = process.env.ADMIN_URL || 'http://127.0.0.1:5173';
const API_URL = process.env.API_URL || 'http://127.0.0.1:4000';
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword123';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(page) {
  await page.goto(`${ADMIN_URL}/posts/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  if (!page.url().includes('/login')) return;
  await page.getByPlaceholder('Enter your username or email').fill(USERNAME);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

async function adminFetch(page, path, options = {}) {
  return page.evaluate(async ({ apiUrl, path, options }) => {
    const response = await fetch(`${apiUrl}${path}`, {
      credentials: 'include',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, data: text ? JSON.parse(text) : null };
  }, { apiUrl: API_URL, path, options });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const suffix = Date.now();
const slug = `publish-race-${suffix}`;
const title = `Publish Race ${suffix}`;
let articleId = null;
const here = dirname(fileURLToPath(import.meta.url));

try {
  await login(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.route('**/api/posts', async (route) => {
    if (route.request().method() === 'POST') await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });

  await page.goto(`${ADMIN_URL}/posts/new`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Enter article title...').fill(title);
  await page.locator('.ProseMirror').fill('First published body');

  await page.waitForTimeout(2050);
  const publish = page.getByRole('button', { name: 'Publish Article' });
  const firstPublishResponse = page.waitForResponse((response) =>
    response.url().includes('/api/posts/') && response.request().method() === 'PUT'
  );
  await publish.click();
  assert((await firstPublishResponse).ok(), 'The publish request following autosave must succeed.');
  await page.getByText('Article published successfully!').waitFor({ state: 'visible', timeout: 15000 });

  const posts = await adminFetch(page, '/api/posts');
  const created = posts.data.find((post) => post.slug === slug);
  assert(created, 'One publish click must create the article even while autosave is in flight.');
  articleId = created.id;
  assert(created.status === 'published', `Created article must be published, got ${created.status}.`);

  const firstPublic = await context.request.get(`${API_URL}/api/public/render?path=/${slug}`);
  const firstRender = await firstPublic.json();
  assert(firstPublic.ok() && firstRender.html.includes('First published body'), 'First publish must immediately appear publicly.');

  await page.locator('.ProseMirror').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' updated once');
  const secondPublishResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/posts/${articleId}`) && response.request().method() === 'PUT'
  );
  await publish.click();
  assert((await secondPublishResponse).ok(), 'The update publish request must succeed on its first click.');
  await page.getByText('Article published successfully!').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(4500);

  const updated = await adminFetch(page, `/api/posts/${articleId}`);
  assert(updated.ok, 'Updated article must remain readable in admin.');
  assert(updated.data.status === 'published', `Autosave after republish must preserve published status, got ${updated.data.status}.`);
  assert(updated.data.body.includes('updated once'), 'One republish click must persist the updated body.');

  const secondPublic = await context.request.get(`${API_URL}/api/public/render?path=/${slug}`);
  const secondRender = await secondPublic.json();
  assert(secondPublic.ok() && secondRender.html.includes('updated once'), 'Updated article must remain public after one republish click.');

  const imageBody = `${updated.data.body}<img src="https://example.com/alignment-test.png" width="120" data-align="right" alt="Alignment test">`;
  const imageUpdate = await adminFetch(page, `/api/posts/${articleId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: updated.data.title,
      slug: updated.data.slug,
      excerpt: updated.data.excerpt || '',
      body: imageBody,
      status: 'published',
      categoryIds: updated.data.categoryIds || [],
      tagIds: updated.data.tagIds || [],
    }),
  });
  assert(imageUpdate.ok, 'Alignment fixture update must succeed.');

  const alignedPublic = await context.request.get(`${API_URL}/api/public/render?path=/${slug}`);
  const alignedRender = await alignedPublic.json();
  assert(alignedPublic.ok() && alignedRender.html.includes('data-align="right"'), 'Public renderer must preserve image alignment attributes.');

  const publicPage = await context.newPage();
  await publicPage.setContent(alignedRender.html);
  await publicPage.addStyleTag({ content: readFileSync(join(here, '../public/src/styles.css'), 'utf8') });
  const image = publicPage.locator('img[data-align="right"]');
  await image.waitFor({ state: 'attached', timeout: 10000 });
  const alignment = await image.evaluate((element) => {
    const imageRect = element.getBoundingClientRect();
    const bodyRect = element.closest('.body').getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      marginLeft: Number.parseFloat(style.marginLeft),
      rightGap: Math.abs(bodyRect.right - imageRect.right),
    };
  });
  assert(alignment.marginLeft > 0, 'Right-aligned public image must receive automatic left margin.');
  assert(alignment.rightGap < 2, `Right-aligned public image must touch the content right edge; gap was ${alignment.rightGap}.`);

  console.log('Publish race/update and public image alignment browser checks passed.');
} finally {
  if (articleId) await adminFetch(page, `/api/posts/${articleId}`, { method: 'DELETE' }).catch(() => {});
  await browser.close();
}
