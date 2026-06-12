import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { requirePermission } from '../hooks/permissions.js';
import {
  discoverThemes,
  activateTheme,
  deactivateTheme,
  getThemeDetail,
  getActiveThemeId,
} from '../themes/themeService.js';
import {
  loadSchema,
  getSettings as getThemeSettings,
  saveSettings as saveThemeSettings,
  exportSettings,
  importSettings,
  resetSettings,
} from '../themes/themeSettingsService.js';

export async function themesRoutes(app: FastifyInstance) {
  const requireThemesManage = requirePermission('themes.manage');

  // GET /admin/themes - List all themes
  app.get('/admin/themes', { preHandler: requireThemesManage }, async (request, reply) => {
    try {
      const themes = await discoverThemes();
      const activeThemeId = await getActiveThemeId();
      return { themes, activeThemeId };
    } catch (error) {
      app.log.error(error, 'Error fetching themes');
      reply.status(500);
      return { error: 'Failed to retrieve themes' };
    }
  });

  // GET /admin/themes/:id - Get theme detail
  app.get('/admin/themes/:id', { preHandler: requireThemesManage }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const theme = await getThemeDetail(id);
      if (!theme) {
        reply.status(404);
        return { error: 'Theme not found' };
      }
      return { theme };
    } catch (error) {
      app.log.error(error, 'Error fetching theme detail');
      reply.status(500);
      return { error: 'Failed to retrieve theme' };
    }
  });

  // POST /admin/themes/:id/activate - Activate theme
  app.post('/admin/themes/:id/activate', { preHandler: requireThemesManage }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      return await activateTheme(id);
    } catch (error) {
      app.log.error(error, 'Error activating theme');
      reply.status(400);
      return { error: error instanceof Error ? error.message : 'Failed to activate theme' };
    }
  });

  // POST /admin/themes/deactivate - Deactivate current theme
  app.post('/admin/themes/deactivate', { preHandler: requireThemesManage }, async (request, reply) => {
    try {
      return await deactivateTheme();
    } catch (error) {
      app.log.error(error, 'Error deactivating theme');
      reply.status(500);
      return { error: 'Failed to deactivate theme' };
    }
  });

  // POST /admin/themes/scan - Force re-scan
  app.post('/admin/themes/scan', { preHandler: requireThemesManage }, async (request, reply) => {
    try {
      const themes = await discoverThemes();
      return { success: true, count: themes.length, themes };
    } catch (error) {
      app.log.error(error, 'Error scanning themes');
      reply.status(500);
      return { error: 'Failed to scan themes' };
    }
  });

  // GET /admin/themes/:id/screenshot - Serve screenshot image
  app.get('/admin/themes/:id/screenshot', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const theme = await getThemeDetail(id);
      if (!theme) {
        reply.status(404);
        return { error: 'Theme not found' };
      }

      // Look for screenshot file
      const screenshotFile = theme.manifest.screenshot || 'screenshot.png';
      const screenshotPath = path.resolve(theme.path, screenshotFile);

      // Security: ensure path is within theme directory
      const normalizedThemePath = path.normalize(theme.path);
      const normalizedScreenshotPath = path.normalize(screenshotPath);
      if (!normalizedScreenshotPath.startsWith(normalizedThemePath)) {
        reply.status(403);
        return { error: 'Invalid screenshot path' };
      }

      if (!fs.existsSync(normalizedScreenshotPath)) {
        reply.status(404);
        return { error: 'Screenshot not found' };
      }

      const stream = fs.createReadStream(normalizedScreenshotPath);
      const ext = path.extname(normalizedScreenshotPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };
      reply.type(mimeTypes[ext] || 'image/png');
      return reply.send(stream);
    } catch (error) {
      app.log.error(error, 'Error serving screenshot');
      reply.status(500);
      return { error: 'Failed to serve screenshot' };
    }
  });

  // ───────────────────────────────────────────────
  // Theme Settings API (Schema-Driven)
  // ───────────────────────────────────────────────

  // GET /admin/themes/:id/settings — Get schema + current values + regions
  app.get('/admin/themes/:id/settings', { preHandler: requireThemesManage }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const schema = loadSchema(id);
      const values = await getThemeSettings(id);
      const theme = await getThemeDetail(id);
      const regions = theme?.manifest?.regions || {};
      return { schema, values, regions };
    } catch (error) {
      app.log.error(error, 'Error fetching theme settings');
      reply.status(error instanceof Error && error.message.includes('not found') ? 404 : 500);
      return { error: error instanceof Error ? error.message : 'Failed to retrieve theme settings' };
    }
  });

  // PUT /admin/themes/:id/settings — Save settings (section-level persistence)
  app.put('/admin/themes/:id/settings', { preHandler: requireThemesManage }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    try {
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        reply.status(400);
        return { error: 'Request body must be a settings object keyed by section' };
      }
      await saveThemeSettings(id, body);
      return { success: true };
    } catch (error) {
      app.log.error(error, 'Error saving theme settings');
      reply.status(400);
      return { error: error instanceof Error ? error.message : 'Failed to save theme settings' };
    }
  });

  // POST /admin/themes/:id/settings/export — Export settings with metadata
  app.post('/admin/themes/:id/settings/export', { preHandler: requireThemesManage }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const exported = await exportSettings(id);
      return exported;
    } catch (error) {
      app.log.error(error, 'Error exporting theme settings');
      reply.status(500);
      return { error: error instanceof Error ? error.message : 'Failed to export theme settings' };
    }
  });

  // POST /admin/themes/:id/settings/import — Import settings with validation
  app.post('/admin/themes/:id/settings/import', { preHandler: requireThemesManage }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    try {
      if (!body || typeof body !== 'object') {
        reply.status(400);
        return { error: 'Request body must be a valid theme settings export object' };
      }
      const result = await importSettings(id, body);
      return result;
    } catch (error) {
      app.log.error(error, 'Error importing theme settings');
      reply.status(400);
      return { error: error instanceof Error ? error.message : 'Failed to import theme settings' };
    }
  });

  // POST /admin/themes/:id/settings/reset — Reset to schema defaults
  app.post('/admin/themes/:id/settings/reset', { preHandler: requireThemesManage }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      await resetSettings(id);
      return { success: true };
    } catch (error) {
      app.log.error(error, 'Error resetting theme settings');
      reply.status(500);
      return { error: error instanceof Error ? error.message : 'Failed to reset theme settings' };
    }
  });
}
