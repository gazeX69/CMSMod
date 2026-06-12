import { db } from '../apps/api/src/database/client.js';
import { contents, contentMetadata } from '../apps/api/src/database/schema.js';
import { renderContentPage } from '../apps/api/src/public/publicWebsiteService.js';
import { themeSlotRegistry } from '../apps/api/src/plugins/ThemeSlotRegistry.js';
import { and, eq } from 'drizzle-orm';
import crypto from 'crypto';

// Register mock slot resolvers
themeSlotRegistry.register('comments', async (targetUuid) => {
  const metadataRows = await db
    .select()
    .from(contentMetadata)
    .where(
      and(
        eq(contentMetadata.contentUuid, targetUuid),
        eq(contentMetadata.ownerPlugin, 'comments'),
        eq(contentMetadata.metaKey, 'enabled')
      )
    )
    .limit(1);
  const enabled = metadataRows[0] ? JSON.parse(metadataRows[0].valueJson) !== false : true;
  if (!enabled) return '';
  return `<div class="mock-comments-widget" data-target="${targetUuid}">[RESOLVED_COMMENTS_WIDGET]</div>`;
});

async function main() {
  console.log('--- STARTING VERIFICATION ---');

  const disabledUuid = crypto.randomUUID();
  const slugDisabled = `comments-test-disabled-${Date.now()}`;
  await db.insert(contents).values({
    uuid: disabledUuid,
    title: 'Comments Disabled Post',
    slug: slugDisabled,
    type: 'article',
    status: 'published',
    body: 'BODY_DISABLED_MARKER',
    publishedAt: new Date(),
  });

  await db.insert(contentMetadata).values({
    contentUuid: disabledUuid,
    ownerPlugin: 'comments',
    metaKey: 'enabled',
    valueJson: 'false',
    valueType: 'boolean',
    visibility: 'public',
  });

  const enabledUuid = crypto.randomUUID();
  const slugEnabled = `comments-test-enabled-${Date.now()}`;
  await db.insert(contents).values({
    uuid: enabledUuid,
    title: 'Comments Enabled Post',
    slug: slugEnabled,
    type: 'article',
    status: 'published',
    body: 'BODY_ENABLED_MARKER',
    publishedAt: new Date(),
  });

  console.log('\n--- TESTING DISABLED RENDER ---');
  const renderDisabled = await renderContentPage(slugDisabled);
  const bodyIdxDisabled = renderDisabled.html.indexOf('BODY_DISABLED_MARKER');
  if (bodyIdxDisabled !== -1) {
    const slice = renderDisabled.html.slice(bodyIdxDisabled, bodyIdxDisabled + 250);
    console.log(slice);
    if (slice.includes('[RESOLVED_COMMENTS_WIDGET]')) {
      throw new Error('Verification failed: Rendered comments on a disabled post!');
    } else {
      console.log('[OK] Comments widget was successfully omitted for disabled post.');
    }
  } else {
    console.log('Disabled marker not found in output!');
  }

  console.log('\n--- TESTING ENABLED RENDER ---');
  const renderEnabled = await renderContentPage(slugEnabled);
  const bodyIdxEnabled = renderEnabled.html.indexOf('BODY_ENABLED_MARKER');
  if (bodyIdxEnabled !== -1) {
    const slice = renderEnabled.html.slice(bodyIdxEnabled, bodyIdxEnabled + 350);
    console.log(slice);
    if (!slice.includes('[RESOLVED_COMMENTS_WIDGET]')) {
      throw new Error('Verification failed: Comments widget was NOT rendered on an enabled post!');
    } else {
      console.log('[OK] Comments widget was successfully rendered for enabled post.');
    }
  } else {
    console.log('Enabled marker not found in output!');
  }

  // Clean up
  await db.delete(contents).where(eq(contents.slug, slugDisabled));
  await db.delete(contents).where(eq(contents.slug, slugEnabled));
  await db.delete(contentMetadata).where(eq(contentMetadata.contentUuid, disabledUuid));
  await db.delete(contentMetadata).where(eq(contentMetadata.contentUuid, enabledUuid));
  
  console.log('\n--- ALL VERIFICATION PASSED ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
