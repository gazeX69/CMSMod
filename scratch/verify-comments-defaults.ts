import { db } from '../apps/api/src/database/client.js';
import { contents, contentMetadata, settings } from '../apps/api/src/database/schema.js';
import { renderContentPage } from '../apps/api/src/public/publicWebsiteService.js';
import { themeSlotRegistry } from '../apps/api/src/plugins/ThemeSlotRegistry.js';
import { activatePlugin, syncPluginsFromDisk } from '../apps/api/src/plugins/pluginLifecycleService.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import commentsRoutes from '../plugins/comments/server/routes.js';

async function main() {
  console.log('--- STARTING COMMENTS DEFAULTS VERIFICATION ---');

  // 1. Sync plugins and ensure comments is active
  console.log('Activating comments plugin...');
  await syncPluginsFromDisk();
  await activatePlugin('comments');
  console.log('[OK] Comments plugin activated.');

  // 2. Initialize comments routes with mock App and SDK
  console.log('Registering Comments Slot Resolver...');
  const mockApp: any = {
    addHook: () => {},
    post: () => {},
    get: () => {},
    put: () => {},
    delete: () => {},
    patch: () => {},
    log: {
      info: console.log,
      error: console.error,
      warn: console.warn,
    }
  };

  const mockSdk: any = {
    database: { orm: db },
    requireActive: () => {},
    auth: { requireUser: () => {} },
    permissions: {
      can: () => true,
    },
    settings: {
      getWithFallback: async (key: string, fallback: string) => {
        const rows = await db
          .select()
          .from(settings)
          .where(eq(settings.key, key))
          .limit(1);
        return rows[0] ? rows[0].value : fallback;
      }
    },
    content: {
      getByUuid: async (uuid: string) => {
        const rows = await db.select().from(contents).where(eq(contents.uuid, uuid)).limit(1);
        return rows[0] || null;
      },
      metadata: {
        registerDefinition: () => {},
        get: async (contentUuid: string) => {
          const rows = await db
            .select()
            .from(contentMetadata)
            .where(
              and(
                eq(contentMetadata.contentUuid, contentUuid),
                eq(contentMetadata.ownerPlugin, 'comments')
              )
            );
          return rows.map(r => ({ key: `${r.ownerPlugin}.${r.metaKey}`, value: r.valueJson === 'true' || r.valueJson === 'false' ? JSON.parse(r.valueJson) : r.valueJson }));
        },
        set: async (contentUuid: string, entries: any[]) => {
          for (const entry of entries) {
            const valJson = JSON.stringify(entry.value);
            const existing = await db
              .select()
              .from(contentMetadata)
              .where(
                and(
                  eq(contentMetadata.contentUuid, contentUuid),
                  eq(contentMetadata.ownerPlugin, 'comments'),
                  eq(contentMetadata.metaKey, entry.key)
                )
              )
              .limit(1);

            if (existing[0]) {
              await db
                .update(contentMetadata)
                .set({ valueJson: valJson })
                .where(eq(contentMetadata.id, existing[0].id));
            } else {
              await db.insert(contentMetadata).values({
                contentUuid,
                ownerPlugin: 'comments',
                metaKey: entry.key,
                valueJson: valJson,
                valueType: typeof entry.value,
                visibility: 'public',
              });
            }
          }
        }
      }
    },
    publicSlots: {
      register: (slot: string, resolver: any) => {
        themeSlotRegistry.register(slot, resolver);
      }
    }
  };

  await commentsRoutes(mockApp, { sdk: mockSdk });
  console.log('[OK] Comments slot resolver registered.');

  // Create UIDs
  const pageUuid = crypto.randomUUID();
  const articleUuid = crypto.randomUUID();
  const slugPage = `comments-default-page-${Date.now()}`;
  const slugArticle = `comments-default-article-${Date.now()}`;

  // 3. Insert test page and article (no metadata override)
  await db.insert(contents).values({
    uuid: pageUuid,
    title: 'Default Page Comments Disabled',
    slug: slugPage,
    type: 'page',
    status: 'published',
    body: 'BODY_PAGE {{ comments }}',
    publishedAt: new Date(),
  });

  await db.insert(contents).values({
    uuid: articleUuid,
    title: 'Default Article Comments Enabled',
    slug: slugArticle,
    type: 'article',
    status: 'published',
    body: 'BODY_ARTICLE {{ comments }}',
    publishedAt: new Date(),
  });

  // Verify default behavior (Page: comments disabled, Article: comments enabled)
  console.log('\n--- TESTING DEFAULT COMMENTS ON PAGE (Default: disabled) ---');
  const renderedPage = await renderContentPage(slugPage);
  if (renderedPage.html.includes('id="comments-section"')) {
    throw new Error('Verification failed: Page has comments enabled by default, expected disabled!');
  }
  console.log('[OK] Page correctly has comments disabled by default.');

  console.log('\n--- TESTING DEFAULT COMMENTS ON ARTICLE (Default: enabled) ---');
  const renderedArticle = await renderContentPage(slugArticle);
  if (!renderedArticle.html.includes('id="comments-section"')) {
    throw new Error('Verification failed: Article has comments disabled by default, expected enabled!');
  }
  console.log('[OK] Article correctly has comments enabled by default.');

  // 4. Test explicit metadata overrides
  console.log('\n--- TESTING OVERRIDE: ENABLE COMMENTS ON PAGE ---');
  await mockSdk.content.metadata.set(pageUuid, [{ key: 'enabled', value: true }]);
  const renderedPageEnabled = await renderContentPage(slugPage);
  if (!renderedPageEnabled.html.includes('id="comments-section"')) {
    throw new Error('Verification failed: Page override to enable comments did not work!');
  }
  console.log('[OK] Page comments successfully enabled via override.');

  console.log('\n--- TESTING OVERRIDE: DISABLE COMMENTS ON ARTICLE ---');
  await mockSdk.content.metadata.set(articleUuid, [{ key: 'enabled', value: false }]);
  const renderedArticleDisabled = await renderContentPage(slugArticle);
  if (renderedArticleDisabled.html.includes('id="comments-section"')) {
    throw new Error('Verification failed: Article override to disable comments did not work!');
  }
  console.log('[OK] Article comments successfully disabled via override.');

  // 5. Clean up
  console.log('\nCleaning up database entries...');
  await db.delete(contents).where(eq(contents.uuid, pageUuid));
  await db.delete(contents).where(eq(contents.uuid, articleUuid));
  await db.delete(contentMetadata).where(eq(contentMetadata.contentUuid, pageUuid));
  await db.delete(contentMetadata).where(eq(contentMetadata.contentUuid, articleUuid));
  console.log('[OK] Cleanup complete.');

  console.log('\n--- ALL COMMENTS DEFAULTS VERIFICATION PASSED ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
