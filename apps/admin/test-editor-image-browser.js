import { chromium } from 'playwright';

const ADMIN_URL = process.env.ADMIN_URL || 'http://127.0.0.1:5173';
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword123';

async function openEditor(page) {
  await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Enter your username or email').fill(USERNAME);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.locator('button').filter({ hasText: 'New Post' }).click();
  await page.waitForURL('**/posts', { timeout: 10000 });
  await page.locator('main').getByRole('button', { name: 'New Article' }).click();
}

async function insertExternalImage(page, url) {
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.getByRole('button', { name: 'Insert Image' }).click();
  await page.getByRole('button', { name: 'URL' }).click();
  await page.getByPlaceholder('Enter image URL (https://...)').fill(url);
  const insertButtons = await page.getByRole('button', { name: 'Insert' }).all();
  await insertButtons[0].click();
  await page.waitForSelector('.external-image-node-view img', { timeout: 10000 });
}

async function insertMediaLibraryImage(page) {
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.getByRole('button', { name: 'Insert Image' }).click();
  await page.getByRole('button', { name: 'Media Library' }).click();
  await page.waitForSelector('.media-card img', { timeout: 10000 });
  await page.locator('.media-card img').first().click();
  await page.locator('.media-picker-footer').getByRole('button', { name: 'Insert' }).click();
  await page.waitForSelector('.media-node-view img', { timeout: 10000 });
}

async function measureImage(page, selector) {
  return page.evaluate((selector) => {
    const wrapper = document.querySelector(selector);
    const img = wrapper?.querySelector('img');
    const wrapperRect = wrapper?.getBoundingClientRect();
    const imageRect = img?.getBoundingClientRect();

    return {
      wrapperWidth: Math.round(wrapperRect?.width ?? 0),
      imageWidth: Math.round(imageRect?.width ?? 0),
      imageHeight: Math.round(imageRect?.height ?? 0),
      imageCount: document.querySelectorAll(`${selector} img`).length,
      hasMediaUuid: !!document.querySelector(`${selector}[data-media-uuid]`),
      hasExternalSrc: !!document.querySelector(`${selector}[data-external-image-src]`),
      bodyText: document.querySelector('.ProseMirror')?.innerText ?? '',
    };
  }, selector);
}

async function resizeSelectedImage(page, selector, deltaX) {
  await page.locator(`${selector} img`).click();
  await page.waitForSelector('button[aria-label="Resize image"]', { timeout: 5000 });
  const handle = page.locator('button[aria-label="Resize image"]').first();
  const box = await handle.boundingBox();

  if (!box) {
    throw new Error('Resize handle is not visible.');
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + deltaX, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertResizeAndTyping(page, selector, expectedIdentity) {
  await resizeSelectedImage(page, selector, -180);
  const afterSmall = await measureImage(page, selector);

  await resizeSelectedImage(page, selector, 260);
  const afterLarge = await measureImage(page, selector);

  assert(afterSmall.imageCount === 1, `${selector} must still exist after shrinking.`);
  assert(afterLarge.imageCount === 1, `${selector} must still exist after enlarging.`);
  assert(Math.abs(afterSmall.wrapperWidth - afterSmall.imageWidth) <= 6, `${selector} wrapper and image must shrink together.`);
  assert(Math.abs(afterLarge.wrapperWidth - afterLarge.imageWidth) <= 6, `${selector} wrapper and image must enlarge together.`);
  assert(afterSmall.wrapperWidth < afterLarge.wrapperWidth, `${selector} must resize to a larger width after drag.`);

  if (expectedIdentity === 'media') {
    assert(afterLarge.hasMediaUuid, 'MediaNode must keep data-media-uuid identity.');
    assert(!afterLarge.hasExternalSrc, 'MediaNode must not store external src identity.');
  } else {
    assert(afterLarge.hasExternalSrc, 'ExternalImageNode must keep external src identity.');
    assert(!afterLarge.hasMediaUuid, 'ExternalImageNode must not store data-media-uuid identity.');
  }

  await page.locator(`${selector} img`).click();
  await page.keyboard.insertText(`text after ${expectedIdentity}`);
  await page.waitForTimeout(300);
  const afterTyping = await measureImage(page, selector);

  assert(afterTyping.imageCount === 1, `${selector} must survive typing after selection.`);
  assert(afterTyping.bodyText.includes(`text after ${expectedIdentity}`), `${selector} must place typed text after image.`);

  return { afterSmall, afterLarge, afterTyping };
}

async function assertSaveReloadPersistence(page, selector, title) {
  const beforeSave = await measureImage(page, selector);

  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Back to Articles' }).click();
  await page.waitForTimeout(1000);
  await page.getByText(title, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('tr').filter({ hasText: title }).getByRole('button', { name: 'Edit' }).click();
  await page.waitForSelector(`${selector} img`, { timeout: 10000 });

  const afterReload = await measureImage(page, selector);
  assert(afterReload.imageCount === 1, `${selector} must exist after save/reload.`);
  assert(Math.abs(beforeSave.wrapperWidth - afterReload.wrapperWidth) <= 2, `${selector} width must persist after save/reload.`);

  return { beforeSave, afterReload };
}

async function runExternalScenario(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await openEditor(page);
  const title = `External image regression ${Date.now()}`;
  await page.getByPlaceholder('Enter article title...').fill(title);
  await insertExternalImage(page, 'https://picsum.photos/seed/cmsc-regression-external/800/500');
  const resizeTyping = await assertResizeAndTyping(page, '.external-image-node-view', 'external');
  const persistence = await assertSaveReloadPersistence(page, '.external-image-node-view', title);
  await page.close();
  return { resizeTyping, persistence };
}

async function runMediaScenario(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await openEditor(page);
  const title = `Media image regression ${Date.now()}`;
  await page.getByPlaceholder('Enter article title...').fill(title);
  await insertMediaLibraryImage(page);
  const resizeTyping = await assertResizeAndTyping(page, '.media-node-view', 'media');
  const persistence = await assertSaveReloadPersistence(page, '.media-node-view', title);
  await page.close();
  return { resizeTyping, persistence };
}

async function runTallExternalScenario(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await openEditor(page);
  await insertExternalImage(page, 'https://picsum.photos/seed/cmsc-regression-tall/400/900');
  const before = await measureImage(page, '.external-image-node-view');
  await resizeSelectedImage(page, '.external-image-node-view', 260);
  const afterLarge = await measureImage(page, '.external-image-node-view');

  assert(afterLarge.wrapperWidth > before.wrapperWidth, 'Tall external image must enlarge.');
  assert(Math.abs(afterLarge.wrapperWidth - afterLarge.imageWidth) <= 6, 'Tall external image wrapper and image must enlarge together.');
  assert(afterLarge.imageHeight > before.imageHeight, 'Tall external image height must scale with width.');

  await page.close();
  return { before, afterLarge };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const result = {
      external: await runExternalScenario(browser),
      media: await runMediaScenario(browser),
      tallExternal: await runTallExternalScenario(browser),
    };

    console.log(JSON.stringify(result, null, 2));
    console.log('Editor image browser regression lock passed.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`Editor image browser regression lock failed: ${error.message}`);
  process.exit(1);
});
