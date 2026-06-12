import { chromium } from 'playwright';

const ADMIN_URL = process.env.ADMIN_URL || 'http://127.0.0.1:5173';
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword123';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openEditor(page) {
  await page.goto(`${ADMIN_URL}/posts/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  if (page.url().includes('/login')) {
    await page.getByPlaceholder('Enter your username or email').fill(USERNAME);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.goto(`${ADMIN_URL}/posts/new`, { waitUntil: 'domcontentloaded' });
  }

  try {
    await page.waitForSelector('.ProseMirror', { timeout: 15000 });
  } catch {
    const pageText = (await page.locator('body').innerText()).slice(0, 800);
    throw new Error(`Editor did not open at ${page.url()}. Visible page: ${pageText}`);
  }
}

async function setParagraphs(page, paragraphs) {
  await page.locator('.ProseMirror').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(paragraphs[0]);

  for (const paragraph of paragraphs.slice(1)) {
    await page.keyboard.press('Enter');
    await page.keyboard.type(paragraph);
  }
}

async function blockTexts(page) {
  return page.locator('.ProseMirror > *').allTextContents();
}

async function dragBlock(page, sourceIndex, targetIndex, afterTarget) {
  const blocks = page.locator('.ProseMirror > *');
  const source = blocks.nth(sourceIndex);
  const target = blocks.nth(targetIndex);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert(sourceBox && targetBox, 'Source and target blocks must be visible.');

  await page.mouse.move(sourceBox.x + 30, sourceBox.y + sourceBox.height / 2);
  const grip = page.locator('.editor-block-handle-grip');
  await grip.waitFor({ state: 'visible', timeout: 5000 });
  const gripBox = await grip.boundingBox();
  assert(gripBox, 'Block drag grip must be visible.');

  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  const targetPoint = {
    x: targetBox.x + 40,
    y: targetBox.y + (afterTarget ? targetBox.height - 1 : 1),
  };
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 8 });
  const dragState = await page.evaluate(() => ({
    dragging: document.querySelector('.ProseMirror')?.classList.contains('prosemirror-dragging'),
    indicator: document.querySelector('.drag-insertion-indicator')?.getBoundingClientRect().y ?? null,
    indicatorPos: document.querySelector('.drag-insertion-indicator')?.getAttribute('data-position') ?? null,
    indicatorLabel: document.querySelector('.drag-insertion-indicator span')?.textContent ?? null,
    previewText: document.querySelector('.block-drag-preview-text')?.textContent ?? null,
    sourceDimmed: !!document.querySelector('.block-drag-source'),
  }));
  dragState.targetBox = targetBox;
  dragState.targetPoint = targetPoint;
  await page.mouse.up();
  await page.waitForTimeout(150);
  return dragState;
}

async function beginBlockDrag(page, sourceIndex, targetIndex) {
  const blocks = page.locator('.ProseMirror > *');
  const sourceBox = await blocks.nth(sourceIndex).boundingBox();
  const targetBox = await blocks.nth(targetIndex).boundingBox();
  assert(sourceBox && targetBox, 'Drag source and target must be visible.');

  await page.mouse.move(sourceBox.x + 30, sourceBox.y + sourceBox.height / 2);
  const gripBox = await page.locator('.editor-block-handle-grip').boundingBox();
  assert(gripBox, 'Block drag grip must be visible.');
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + 40, targetBox.y + 2, { steps: 6 });
}

async function clickMoveButton(page, blockIndex, direction, label) {
  const blockBox = await page.locator('.ProseMirror > *').nth(blockIndex).boundingBox();
  assert(blockBox, 'Block must be visible before using move controls.');
  await page.mouse.move(blockBox.x + 24, blockBox.y + blockBox.height / 2);
  const button = page.getByRole('button', { name: `Move ${label} ${direction}` });
  await button.waitFor({ state: 'visible', timeout: 5000 });
  const buttonBox = await button.boundingBox();
  assert(buttonBox, 'Move button must be visible.');
  await page.mouse.click(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
  await page.waitForTimeout(120);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
    consoleErrors.push(message.text());
  }
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

try {
  await openEditor(page);
  consoleErrors.length = 0;
  await setParagraphs(page, ['Block A', 'Block B', 'Block C']);

  const downwardDragState = await dragBlock(page, 0, 2, true);
  const downwardTexts = await blockTexts(page);
  assert(
    JSON.stringify(downwardTexts) === JSON.stringify(['Block B', 'Block C', 'Block A']),
    `Dragging the first block below the third block must reorder the document. Drag state: ${JSON.stringify(downwardDragState)}. Blocks: ${JSON.stringify(downwardTexts)}`
  );
  assert(downwardDragState.dragging, 'Drag state must become active after crossing the movement threshold.');
  assert(downwardDragState.sourceDimmed, 'The source block must be visually dimmed while dragging.');
  assert(downwardDragState.previewText === 'Block A', 'Drag preview must summarize the block being moved.');
  assert(downwardDragState.indicatorLabel === 'Drop block here', 'Drop target must have a clear label.');

  await dragBlock(page, 2, 0, false);
  assert(
    JSON.stringify(await blockTexts(page)) === JSON.stringify(['Block A', 'Block B', 'Block C']),
    'Dragging the last block above the first block must reorder the document.'
  );

  await beginBlockDrag(page, 0, 2);
  assert(await page.locator('.block-drag-preview').count() === 1, 'Drag preview must be visible before cancellation.');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.waitForTimeout(100);
  assert(
    JSON.stringify(await blockTexts(page)) === JSON.stringify(['Block A', 'Block B', 'Block C']),
    'Escape must cancel the move without changing document order.'
  );
  assert(await page.locator('.block-drag-preview').count() === 0, 'Drag preview must be removed after cancellation.');
  assert(await page.locator('.block-drag-source').count() === 0, 'Source dimming must be removed after cancellation.');

  await page.setViewportSize({ width: 390, height: 844 });
  await clickMoveButton(page, 1, 'up', 'Paragraph');
  assert(
    JSON.stringify(await blockTexts(page)) === JSON.stringify(['Block B', 'Block A', 'Block C']),
    'Mobile move-up control must reorder the selected block.'
  );
  await clickMoveButton(page, 0, 'down', 'Paragraph');
  assert(
    JSON.stringify(await blockTexts(page)) === JSON.stringify(['Block A', 'Block B', 'Block C']),
    'Mobile move-down control must reorder the selected block.'
  );

  await page.setViewportSize({ width: 1100, height: 620 });
  await setParagraphs(page, Array.from({ length: 32 }, (_, index) => `Long block ${index + 1}`));
  const firstLongBlock = page.locator('.ProseMirror > *').nth(0);
  await firstLongBlock.scrollIntoViewIfNeeded();
  const firstLongBox = await firstLongBlock.boundingBox();
  assert(firstLongBox, 'Long-document source block must be visible.');
  await page.mouse.move(firstLongBox.x + 30, firstLongBox.y + firstLongBox.height / 2);
  const longGripBox = await page.locator('.editor-block-handle-grip').boundingBox();
  assert(longGripBox, 'Long-document grip must be visible.');
  const scrollBefore = await page.locator('.admin-content-viewport').evaluate((element) => element.scrollTop);
  await page.mouse.move(longGripBox.x + longGripBox.width / 2, longGripBox.y + longGripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(520, 608, { steps: 8 });
  await page.waitForTimeout(550);
  const scrollAfter = await page.locator('.admin-content-viewport').evaluate((element) => element.scrollTop);
  assert(scrollAfter > scrollBefore, 'Dragging near the lower viewport edge must auto-scroll the workspace.');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  assert(await page.locator('.block-drag-preview').count() === 0, 'Auto-scroll drag preview must clean up after Escape.');

  assert(await page.locator('.drag-insertion-indicator').count() === 0, 'Drop indicator must be removed after dropping.');
  assert(consoleErrors.length === 0, `Editor must not log console errors: ${consoleErrors.join(' | ')}`);
  console.log('Block drag UX browser checks passed (preview, reorder, cancel, and mobile controls).');
} finally {
  await browser.close();
}
