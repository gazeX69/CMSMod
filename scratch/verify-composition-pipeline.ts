import { db } from '../apps/api/src/database/client.js';
import { contents } from '../apps/api/src/database/schema.js';
import { renderContentPage } from '../apps/api/src/public/publicWebsiteService.js';
import { publicContentCompositionPipeline, publicAssetRegistry } from '../apps/api/src/public/PublicExtensionRegistries.js';
import type { CompositionContext } from '@modern-cms/plugin-sdk';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const blockType = 'test-block';
const testBlockId = 'block-123';
let blockContextReceived: CompositionContext | null = null;
let filterContextReceived: CompositionContext | null = null;

// Register block renderer
publicContentCompositionPipeline.blocks.register(
  'test-plugin',
  blockType,
  async (blockId, context) => {
    blockContextReceived = context;
    return `<div class="rendered-test-block" data-id="${blockId}">[RENDERED_BLOCK_CONTENT]</div>`;
  }
);

// Register content filter
publicContentCompositionPipeline.filters.register(
  'test-plugin',
  {
    id: 'test-filter',
    priority: 10,
    filter: async (html, context) => {
      filterContextReceived = context;
      return html.replace('[RENDERED_BLOCK_CONTENT]', '[RENDERED_BLOCK_CONTENT_AND_FILTERED]');
    }
  }
);

async function main() {
  console.log('--- STARTING COMPOSITION PIPELINE VERIFICATION ---');

  const testPostUuid = crypto.randomUUID();
  const testSlug = `pipeline-test-${Date.now()}`;

  await db.insert(contents).values({
    uuid: testPostUuid,
    title: 'Pipeline Test Post',
    slug: testSlug,
    type: 'article',
    status: 'published',
    body: `Before block <cms-block type="${blockType}" id="${testBlockId}"></cms-block> After block`,
    publishedAt: new Date(),
  });

  console.log(`Created test post with slug: ${testSlug}`);

  console.log('\n--- TESTING PAGE RENDER ---');
  const rendered = await renderContentPage(testSlug, {}, {
    mode: 'public',
    request: {
      method: 'GET',
      path: `/${testSlug}`,
      query: { testQueryParam: 'hello' },
      headers: { 'user-agent': 'test-runner' }
    }
  });

  console.log('Page rendered successfully.');

  // Assert block was rendered and filter was applied
  const expectedContent = `Before block <div class="rendered-test-block" data-id="${testBlockId}">[RENDERED_BLOCK_CONTENT_AND_FILTERED]</div> After block`;
  if (!rendered.html.includes(expectedContent)) {
    console.error('Rendered HTML:\n', rendered.html);
    throw new Error(`Verification failed: Expected content "${expectedContent}" not found in rendered output.`);
  }
  console.log('[OK] Block was rendered and content filter was executed in order.');

  // Assert context was correctly received by block renderer
  if (!blockContextReceived) {
    throw new Error('Verification failed: Block renderer did not receive CompositionContext.');
  }
  if (blockContextReceived.contentUuid !== testPostUuid) {
    throw new Error(`Verification failed: Expected contentUuid "${testPostUuid}", got "${blockContextReceived.contentUuid}"`);
  }
  if (blockContextReceived.mode !== 'public') {
    throw new Error(`Verification failed: Expected mode "public", got "${blockContextReceived.mode}"`);
  }
  if (!blockContextReceived.request || blockContextReceived.request.query?.testQueryParam !== 'hello') {
    throw new Error(`Verification failed: request context was not forwarded correctly to block renderer.`);
  }
  console.log('[OK] Block renderer received correct CompositionContext.');

  // Assert context was correctly received by content filter
  if (!filterContextReceived) {
    throw new Error('Verification failed: Content filter did not receive CompositionContext.');
  }
  if (filterContextReceived.contentUuid !== testPostUuid) {
    throw new Error(`Verification failed: Expected contentUuid "${testPostUuid}" in filter, got "${filterContextReceived.contentUuid}"`);
  }
  if (filterContextReceived.mode !== 'public') {
    throw new Error(`Verification failed: Expected mode "public" in filter, got "${filterContextReceived.mode}"`);
  }
  console.log('[OK] Content filter received correct CompositionContext.');

  console.log('\n--- TESTING ASSET REGISTRY ---');
  publicAssetRegistry.register('test-plugin', 'js/test-asset.js', 'console.log("hello test");', 'application/javascript');
  const resolved = publicAssetRegistry.resolve('test-plugin', 'js/test-asset.js');
  if (!resolved || resolved.content !== 'console.log("hello test");' || resolved.mimeType !== 'application/javascript') {
    throw new Error('Verification failed: Dynamic asset registry did not resolve the registered asset correctly.');
  }
  console.log('[OK] Asset registry successfully stored and resolved asset.');

  publicAssetRegistry.unregisterOwner('test-plugin');
  const resolvedAfterClean = publicAssetRegistry.resolve('test-plugin', 'js/test-asset.js');
  if (resolvedAfterClean) {
    throw new Error('Verification failed: Dynamic asset registry did not clean up assets correctly after unregisterOwner.');
  }
  console.log('[OK] Asset registry successfully cleaned up assets on unregister.');

  // Clean up database
  await db.delete(contents).where(eq(contents.uuid, testPostUuid));
  console.log('Cleaned up test post.');

  console.log('\n--- ALL VERIFICATION PASSED ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
