import { chromium } from 'playwright';

const ADMIN_URL = process.env.ADMIN_URL || 'http://127.0.0.1:5173';
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword123';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

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

async function insertExternalImage(page) {
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.getByRole('button', { name: 'Insert Image' }).click();
  await page.getByRole('button', { name: 'URL' }).click();
  await page.getByPlaceholder('Enter image URL (https://...)').fill('https://picsum.photos/seed/property-panel-mvp-external/800/500');
  const insertButtons = await page.getByRole('button', { name: 'Insert' }).all();
  await insertButtons[0].click();
  await page.waitForSelector('.external-image-node-view img', { timeout: 10000 });
}

async function insertMediaImage(page) {
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.getByRole('button', { name: 'Insert Image' }).click();
  await page.getByRole('button', { name: 'Media Library' }).click();
  await page.waitForSelector('.media-card img', { timeout: 10000 });
  await page.locator('.media-card img').first().click();
  await page.locator('.media-picker-footer').getByRole('button', { name: 'Insert' }).click();
  await page.waitForSelector('.media-node-view img', { timeout: 10000 });
}

async function selectImage(page, selector) {
  await page.locator(`${selector} img`).click();
  await page.waitForSelector('.property-panel-host', { timeout: 5000 });
}

async function fillPanelField(page, label, value) {
  const field = page.locator('.property-panel-host').getByLabel(label, { exact: true });
  await field.fill(String(value));
}

async function saveReloadAndSelect(page, title, selector) {
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Back to Articles' }).click();
  await page.waitForTimeout(1000);
  await page.getByText(title, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('tr').filter({ hasText: title }).getByRole('button', { name: 'Edit' }).click();
  await page.waitForSelector(`${selector} img`, { timeout: 10000 });
  await selectImage(page, selector);
}

async function readImageState(page, selector) {
  return page.evaluate((selector) => {
    const wrapper = document.querySelector(selector);
    const img = wrapper?.querySelector('img');
    const rect = img?.getBoundingClientRect();

    return {
      imageWidth: Math.round(rect?.width ?? 0),
      alt: img?.getAttribute('alt') || '',
      title: img?.getAttribute('title') || '',
      caption: wrapper?.querySelector('figcaption')?.textContent || '',
      widthValue: document.querySelector('.property-panel-host input[id$="-width"]')?.value || '',
      altValue: document.querySelector('.property-panel-host input[id$="-alt"]')?.value || '',
      captionValue: document.querySelector('.property-panel-host input[id$="-caption"]')?.value || '',
      titleValue: document.querySelector('.property-panel-host input[id$="-title"]')?.value || '',
    };
  }, selector);
}

async function runMediaScenario(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await openEditor(page);
  const title = `Media property panel ${Date.now()}`;
  await page.getByPlaceholder('Enter article title...').fill(title);
  await insertMediaImage(page);
  await selectImage(page, '.media-node-view');

  const initial = await readImageState(page, '.media-node-view');
  await fillPanelField(page, 'Width', 234);
  await fillPanelField(page, 'Alt Text', 'Media panel alt');
  await fillPanelField(page, 'Caption', 'Media panel caption');
  await page.waitForTimeout(500);
  const edited = await readImageState(page, '.media-node-view');

  assert(edited.imageWidth >= 230 && edited.imageWidth <= 238, 'Media panel width must update rendered image.');
  assert(edited.alt === 'Media panel alt', 'Media panel alt must update image alt.');
  assert(edited.caption === 'Media panel caption', 'Media panel caption must render.');

  await saveReloadAndSelect(page, title, '.media-node-view');
  const reloaded = await readImageState(page, '.media-node-view');

  assert(reloaded.widthValue === '234', 'Media panel width must persist after reload.');
  assert(reloaded.altValue === 'Media panel alt', 'Media panel alt must persist after reload.');
  assert(reloaded.captionValue === 'Media panel caption', 'Media panel caption must persist after reload.');

  await page.close();
  return { initial, edited, reloaded };
}

async function runExternalScenario(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await openEditor(page);
  const title = `External property panel ${Date.now()}`;
  await page.getByPlaceholder('Enter article title...').fill(title);
  await insertExternalImage(page);
  await selectImage(page, '.external-image-node-view');

  const initial = await readImageState(page, '.external-image-node-view');
  await fillPanelField(page, 'Width', 345);
  await fillPanelField(page, 'Alt Text', 'External panel alt');
  await fillPanelField(page, 'Title', 'External panel title');
  await page.waitForTimeout(500);
  const edited = await readImageState(page, '.external-image-node-view');

  assert(edited.imageWidth >= 341 && edited.imageWidth <= 349, 'External panel width must update rendered image.');
  assert(edited.alt === 'External panel alt', 'External panel alt must update image alt.');
  assert(edited.title === 'External panel title', 'External panel title must update image title.');

  await saveReloadAndSelect(page, title, '.external-image-node-view');
  const reloaded = await readImageState(page, '.external-image-node-view');

  assert(reloaded.widthValue === '345', 'External panel width must persist after reload.');
  assert(reloaded.altValue === 'External panel alt', 'External panel alt must persist after reload.');
  assert(reloaded.titleValue === 'External panel title', 'External panel title must persist after reload.');

  await page.close();
  return { initial, edited, reloaded };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const result = {
      media: await runMediaScenario(browser),
      external: await runExternalScenario(browser),
    };
    console.log(JSON.stringify(result, null, 2));
    console.log('Image property panel browser checks passed.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`Image property panel browser checks failed: ${error.message}`);
  process.exit(1);
});
