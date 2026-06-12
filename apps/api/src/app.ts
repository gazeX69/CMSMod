import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SystemInfo } from '@modern-cms/shared';
import { db } from './database/client.js';
import { settings } from './database/schema.js';
import { eq, sql } from 'drizzle-orm';
import { authRoutes } from './routes/auth.js';
import { pagesRoutes } from './routes/pages.js';
import { postsRoutes } from './routes/posts.js';
import { taxonomyRoutes } from './routes/taxonomy.js';
import { pluginsRoutes } from './routes/plugins.js';
import { settingsRoutes } from './routes/settings.js';
import { publicRoutes } from './routes/public.js';
import { loadActivePluginRuntimes } from './plugins/pluginRuntimeLoader.js';
import { syncPluginsFromDisk } from './plugins/pluginLifecycleService.js';
import { getPublicSettings } from './settings/settingsService.js';
import { themesRoutes } from './routes/themes.js';
import { navigationRoutes } from './routes/navigation.js';
import { usersRoutes } from './routes/users.js';
import { initializeRegistry } from './themes/themeRegistry.js';
import { widgetsRoutes } from './routes/widgets.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: true,
  });

  // Register cookie plugin
  app.register(cookie);

  // Configure CORS
  app.register(cors, {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5184',
      'http://127.0.0.1:5184',
      'http://localhost:5185',
      'http://127.0.0.1:5185',
      'http://localhost:5186',
      'http://127.0.0.1:5186',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Register Routes
  app.register(authRoutes, { prefix: '/api' });
  app.register(pagesRoutes, { prefix: '/api' });
  app.register(postsRoutes, { prefix: '/api' });
  app.register(taxonomyRoutes, { prefix: '/api' });
  app.register(settingsRoutes, { prefix: '/api' });
  app.register(themesRoutes, { prefix: '/api' });
  app.register(navigationRoutes, { prefix: '/api' });
  app.register(usersRoutes, { prefix: '/api' });
  app.register(widgetsRoutes, { prefix: '/api' });
  app.register(publicRoutes, { prefix: '/api' });

  // Register plugins and static files asynchronously
  app.register(async (pluginApp) => {
    // 1. Static serving for uploaded files
    const mediaStorageDir = path.resolve(__dirname, '../../../storage/media');
    if (!fs.existsSync(mediaStorageDir)) {
      fs.mkdirSync(mediaStorageDir, { recursive: true });
    }
    pluginApp.register(fastifyStatic, {
      root: mediaStorageDir,
      prefix: '/uploads/',
      decorateReply: false,
    });

    // 2. Multipart support for file uploads
    pluginApp.register(multipart, {
      limits: {
        fieldNameSize: 100,
        fieldSize: 100,
        fields: 10,
        fileSize: 104857600, // 100MB safety ceiling
        files: 1,
      },
    });

    // 3. Register core plugins router
    pluginApp.register(pluginsRoutes, { prefix: '/api' });

    // 4. Runtime-load ACTIVE plugin backend contracts.
    try {
      await syncPluginsFromDisk();
      await loadActivePluginRuntimes(pluginApp);
    } catch (err: any) {
      pluginApp.log.error(err, 'Failed to load dynamic plugins');
    }

    // 5. Initialize theme registry
    try {
      await initializeRegistry();
      pluginApp.log.info('Theme registry initialized');
    } catch (err: any) {
      pluginApp.log.error(err, 'Failed to initialize theme registry');
    }
  });

  // GET /health
  app.get('/health', async (request, reply) => {
    return { status: 'ok' };
  });

  // GET /api/system/info
  app.get('/api/system/info', async (request, reply): Promise<SystemInfo> => {
    const memory = process.memoryUsage();
    return {
      status: 'healthy',
      version: '0.1.0',
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      timestamp: Date.now(),
    };
  });

  // GET /api/database/health
  app.get('/api/database/health', async (request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return { ok: true };
    } catch (err: any) {
      app.log.error('Database health check failed:', err);
      reply.status(500);
      return { ok: false, error: err.message };
    }
  });

  // GET /api/settings
  app.get('/api/settings', async (request, reply) => {
    try {
      return await getPublicSettings();
    } catch (err: any) {
      app.log.error('Failed to fetch settings:', err);
      reply.status(500);
      return { error: 'Failed to retrieve settings' };
    }
  });

  return app;
}
