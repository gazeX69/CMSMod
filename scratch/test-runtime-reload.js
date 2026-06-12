import { buildApp } from '../apps/api/dist/app.js';
import { db } from '../apps/api/dist/database/client.js';
import { plugins } from '../apps/api/dist/database/schema.js';
import { eq } from 'drizzle-orm';
import { activatePlugin, deactivatePlugin } from '../apps/api/dist/plugins/pluginLifecycleService.js';

async function runTest() {
  const app = buildApp();
  await app.ready();

  console.log('--- STARTING DYNAMIC RUNTIME RELOAD INTEGRATION TEST ---');

  // 1. Deactivate comments plugin
  console.log('Deactivating comments plugin...');
  await deactivatePlugin('comments');

  // Verify status in DB
  const [commentsPluginInactive] = await db.select().from(plugins).where(eq(plugins.key, 'comments')).limit(1);
  console.log('Database status of comments plugin:', commentsPluginInactive.status);

  // Send request to /api/comments/admin - should be 403 Forbidden (requireActive check blocks it)
  const resInactive = await app.inject({
    method: 'GET',
    url: '/api/comments/admin',
    headers: {
      cookie: 'modern_cms_session=test-session-id' // dummy session to pass requireAuth and hit requireActive
    }
  });
  console.log('Response status when inactive:', resInactive.statusCode);
  console.log('Response body when inactive:', resInactive.body);

  // 2. Now, activate the plugin dynamically passing the 'app' instance
  console.log('Activating comments plugin dynamically...');
  await activatePlugin('comments', app);

  // Verify status in DB
  const [commentsPluginActive] = await db.select().from(plugins).where(eq(plugins.key, 'comments')).limit(1);
  console.log('Database status of comments plugin:', commentsPluginActive.status);

  // Send request to /api/comments/admin - should be 401 Unauthorized (since it's a dummy session, but the route is ACTIVE and resolves!)
  const resActive = await app.inject({
    method: 'GET',
    url: '/api/comments/admin',
    headers: {
      cookie: 'modern_cms_session=test-session-id'
    }
  });
  console.log('Response status when active:', resActive.statusCode);
  console.log('Response body when active:', resActive.body);

  if (resInactive.statusCode === 403 && resActive.statusCode === 401) {
    console.log('TEST PASSED SUCCESSFULLY!');
  } else {
    console.error('TEST FAILED!');
    process.exitCode = 1;
  }

  // Restore active status for user convenience
  await activatePlugin('comments', app);

  await app.close();
}

runTest().catch((err) => {
  console.error('Test threw an error:', err);
  process.exit(1);
});
