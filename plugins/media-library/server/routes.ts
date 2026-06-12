import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, isNull, isNotNull, like, desc, asc, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { mediaFiles } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mediaStorageDir = path.resolve(__dirname, '../../../storage/media');
const thumbBaseDir = path.join(mediaStorageDir, 'thumbnails');

// Set ffmpeg binary path for video thumbnail generation
// Set ffmpeg binary path for video thumbnail generation
if (ffmpegPath) {
  // Gunakan 'as unknown as string' untuk memaksa TypeScript menerima path ini
  ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}

/**
 * Best-effort image thumbnail generator.
 * Returns relative path to generated thumbnail, or null on failure.
 * Thumbnails stored in separate thumbnails/ directory.
 */
async function generateImageThumbnail(
  originalAbsPath: string,
  relativeDir: string,
  baseName: string
): Promise<string | null> {
  try {
    const thumbDir = path.join(thumbBaseDir, relativeDir);
    fs.mkdirSync(thumbDir, { recursive: true });
    const thumbFilename = `${baseName}-thumb.webp`;
    const thumbAbsPath = path.join(thumbDir, thumbFilename);

    await sharp(originalAbsPath)
      .resize({ width: 400 })
      .webp({ quality: 80 })
      .toFile(thumbAbsPath);

    return path.join('thumbnails', relativeDir, thumbFilename).replace(/\\/g, '/');
  } catch (err) {
    console.warn('[media-library] Image thumbnail generation failed:', err);
    return null;
  }
}

/**
 * Best-effort video thumbnail generator.
 * Extracts frame at 1 second, converts to webp.
 * Returns relative path to generated thumbnail, or null on failure.
 */
async function generateVideoThumbnail(
  originalAbsPath: string,
  relativeDir: string,
  baseName: string
): Promise<string | null> {
  try {
    if (!ffmpegPath) {
      console.warn('[media-library] ffmpeg-static path not available, skipping video thumbnail');
      return null;
    }

    const thumbDir = path.join(thumbBaseDir, relativeDir);
    fs.mkdirSync(thumbDir, { recursive: true });
    const tempPngFilename = `${baseName}-thumb-temp.png`;
    const tempPngPath = path.join(thumbDir, tempPngFilename);
    const thumbFilename = `${baseName}-thumb.webp`;
    const thumbAbsPath = path.join(thumbDir, thumbFilename);

    // Extract frame at 1 second using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(originalAbsPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .screenshots({
          count: 1,
          timestamps: ['1'],
          filename: tempPngFilename,
          folder: thumbDir,
          size: '400x?'
        });
    });

    // Convert extracted frame to webp using sharp
    if (fs.existsSync(tempPngPath)) {
      await sharp(tempPngPath)
        .webp({ quality: 80 })
        .toFile(thumbAbsPath);
      // Clean up temp PNG
      try { fs.unlinkSync(tempPngPath); } catch (_) { /* ignore cleanup errors */ }
    } else {
      return null;
    }

    return path.join('thumbnails', relativeDir, thumbFilename).replace(/\\/g, '/');
  } catch (err) {
    console.warn('[media-library] Video thumbnail generation failed:', err);
    return null;
  }
}

const MEDIA_MIME_GROUPS: Record<string, string[]> = {
  images: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ],
  documents: [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/ogg',
  ],
  archives: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/x-7z-compressed',
  ],
};

const DEFAULT_MEDIA_ALLOWED_GROUPS = 'images,documents,audio,video';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function readMediaAttributes(source: string) {
  const attrs: Record<string, string> = {};
  source.replace(/([\w-]+)=["']([^"']*)["']/g, (_match, key, value) => {
    attrs[key] = value;
    return _match;
  });
  return attrs;
}

export function renderPublicMediaBlock(attributeSource: string) {
  const attrs = readMediaAttributes(attributeSource);
  const uuid = attrs['data-media-uuid'];
  if (!uuid) return '<!-- Invalid media block -->';
  const mime = attrs['data-mime-type'] || 'application/octet-stream';
  const label = escapeHtml(attrs['data-title'] || attrs['data-original-name'] || attrs['data-filename'] || 'Media file');
  const caption = attrs['data-caption'] ? `<figcaption>${escapeHtml(attrs['data-caption'])}</figcaption>` : '';
  const display = attrs['data-display'] || 'embed';
  const apiBase = (process.env.VITE_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
  const src = `${apiBase}/api/media/resolve/${encodeURIComponent(uuid)}`;
  const download = `${src}?download=1`;

  if (mime.startsWith('image/')) return `<figure class="cms-media cms-media--image"><img src="${src}" alt="${label}" loading="lazy">${caption}</figure>`;
  if (mime.startsWith('video/')) return `<figure class="cms-media cms-media--video"><video controls preload="metadata" poster="${src}?size=thumb"><source src="${src}" type="${escapeHtml(mime)}"></video>${caption}</figure>`;
  if (mime.startsWith('audio/')) return `<figure class="cms-media cms-media--audio"><strong>${label}</strong><audio controls preload="metadata"><source src="${src}" type="${escapeHtml(mime)}"></audio>${caption}</figure>`;
  if (mime === 'application/pdf' && display === 'embed') return `<figure class="cms-media cms-media--pdf"><object data="${src}" type="application/pdf" style="width:100%;height:min(75vh,760px)"><a href="${download}">Download ${label}</a></object>${caption}</figure>`;
  return `<div class="cms-media cms-media--document"><a href="${download}" download>${label}</a>${caption}</div>`;
}

function normalizeMimeList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function resolveAllowedMimes(groupsValue: string, customMimesValue: string, allowSvg: boolean) {
  const groups = groupsValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const allowed = new Set<string>();

  for (const group of groups) {
    for (const mime of MEDIA_MIME_GROUPS[group] || []) {
      allowed.add(mime);
    }
  }

  for (const mime of normalizeMimeList(customMimesValue)) {
    allowed.add(mime);
  }

  if (allowSvg) {
    allowed.add('image/svg+xml');
  } else {
    allowed.delete('image/svg+xml');
  }

  return Array.from(allowed);
}

export default async function mediaRoutes(
  app: FastifyInstance,
  options: { sdk: any }
) {
  const { sdk } = options;
  const db = sdk.database.orm;
  const requireAuth = sdk.auth.requireUser;
  app.addHook('onRequest', (request, reply) => sdk.requireActive(request, reply));

  sdk.capabilities.registerProvider('media', {
    getByUuid: async (uuid: string) => {
      const rows = await db.select().from(mediaFiles).where(and(eq(mediaFiles.uuid, uuid), isNull(mediaFiles.deletedAt))).limit(1);
      if (!rows[0]) return null;
      const item = rows[0];
      return { uuid: item.uuid, filename: item.filename, originalName: item.originalName, mimeType: item.mimeType, size: item.size, altText: item.altText, caption: item.caption, publicUrl: `/api/media/resolve/${item.uuid}` };
    },
    resolve: async (uuid: string, resolveOptions: Record<string, string> = {}) => `/api/media/resolve/${uuid}${resolveOptions.size ? `?size=${encodeURIComponent(resolveOptions.size)}` : ''}`,
    search: async (query: any = {}) => {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
      const filters: any[] = [isNull(mediaFiles.deletedAt)];
      if (query.mimeType) filters.push(eq(mediaFiles.mimeType, query.mimeType));
      if (query.query) filters.push(or(like(mediaFiles.filename, `%${query.query}%`), like(mediaFiles.originalName, `%${query.query}%`), like(mediaFiles.altText, `%${query.query}%`)));
      const rows = await db.select().from(mediaFiles).where(and(...filters)).orderBy(desc(mediaFiles.createdAt)).limit(limit).offset((page - 1) * limit);
      const totals = await db.select({ value: sql<number>`count(*)` }).from(mediaFiles).where(and(...filters));
      const total = Number(totals[0]?.value || 0);
      return { items: rows.map((item: any) => ({ uuid: item.uuid, filename: item.filename, originalName: item.originalName, mimeType: item.mimeType, size: item.size, altText: item.altText, caption: item.caption, publicUrl: `/api/media/resolve/${item.uuid}` })), page, limit, total, totalPages: Math.ceil(total / limit) };
    },
  }, { version: '1.0.0', mode: 'exclusive' });

  sdk.publicContent.registerContentFilter('render-media-blocks', async (html: string) => {
    return html.replace(/<cms-media\b([^>]*)>(?:<\/cms-media>)?/gi, (_match, attributes) => renderPublicMediaBlock(attributes));
  }, 50);

  async function requireActiveMediaLibrary(request: FastifyRequest, reply: FastifyReply) {
    return sdk.requireActive(request, reply);
  }

  function requireMediaPermission(permissionKey: string) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.id;
      if (!userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const allowed = await sdk.permissions.can(userId, permissionKey);
      if (!allowed) {
        reply.status(403).send({ error: 'Forbidden', permission: permissionKey });
      }
    };
  }

  // GET /admin/settings - Fetch settings
  app.get(
    '/admin/settings',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.read')] },
    async (request, reply) => {
      try {
        const maxSize = await sdk.settings.getWithFallback('media.max_upload_size_mb', '10', ['media_max_upload_size_mb']);
        const allowedGroups = await sdk.settings.getWithFallback('media.allowed_groups', DEFAULT_MEDIA_ALLOWED_GROUPS, ['media_allowed_groups']);
        const customMimes = await sdk.settings.getWithFallback('media.custom_mime_types', '', ['media_custom_mime_types']);
        const organizeByDate = await sdk.settings.getWithFallback('media.organize_by_date', 'true', ['media_organize_by_date']);
        const allowSvg = await sdk.settings.getWithFallback('media.allow_svg_upload', 'false', ['media_allow_svg_upload']);

        return {
          max_upload_size_mb: parseInt(maxSize, 10),
          allowed_groups: allowedGroups.split(',').filter(Boolean),
          custom_mime_types: customMimes,
          organize_by_date: organizeByDate === 'true',
          allow_svg_upload: allowSvg === 'true',
          available_groups: Object.keys(MEDIA_MIME_GROUPS),
        };

      } catch (err) {
        app.log.error(err, 'Failed to fetch media settings');
        reply.status(500);
        return { error: 'Failed to fetch media settings' };
      }
    }
  );

  // PUT /admin/media/settings - Update settings
  app.put(
    '/admin/settings',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.update')] },
    async (request, reply) => {

      
      const {
        max_upload_size_mb,
        allowed_groups,
        custom_mime_types = '',
        organize_by_date,
        allow_svg_upload,
      } = request.body as any;

      if (
        max_upload_size_mb === undefined ||
        !Array.isArray(allowed_groups) ||
        organize_by_date === undefined ||
        allow_svg_upload === undefined
      ) {
        reply.status(400);
        return { error: 'Missing settings fields' };
      }

      const validGroups = allowed_groups.filter((group: string) => MEDIA_MIME_GROUPS[group]);

      if (validGroups.length === 0) {
        reply.status(400);
        return { error: 'At least one valid media category must be enabled' };
      }

      const sizeNum = Number(max_upload_size_mb);
      if (!Number.isFinite(sizeNum) || sizeNum < 1 || sizeNum > 500) {
        reply.status(400);
        return { error: 'Maximum upload size must be between 1 and 500 MB' };
      }

      try {
        await sdk.settings.set('media.max_upload_size_mb', String(sizeNum), { group: 'media', type: 'number', isPublic: true });
        await sdk.settings.set('media.allowed_groups', validGroups.join(','), { group: 'media', type: 'string', isPublic: true });
        await sdk.settings.set('media.custom_mime_types', custom_mime_types.toString(), { group: 'media', type: 'string', isPublic: false });
        await sdk.settings.set('media.organize_by_date', organize_by_date ? 'true' : 'false', { group: 'media', type: 'boolean', isPublic: false });
        await sdk.settings.set('media.allow_svg_upload', allow_svg_upload ? 'true' : 'false', { group: 'media', type: 'boolean', isPublic: false });

        return { ok: true };
      }
      
      catch (err) {
        app.log.error(err, 'Failed to update media settings');
        reply.status(500);
        return { error: 'Failed to update media settings' };
      }
    }
  );

  // GET /admin/media - Retrieve media files list
  app.get(
    '/admin',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.read')] },
    async (request, reply) => {
      const { page = '1', limit = '50', search = '', mimeType = '', sort = 'createdAt_DESC' } = request.query as any;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      try {
        let conditions = [isNull(mediaFiles.deletedAt)];

        if (search) {
          conditions.push(like(mediaFiles.originalName, `%${search}%`));
        }

        if (mimeType) {
          conditions.push(like(mediaFiles.mimeType, `${mimeType}%`));
        }

        const queryCondition = and(...conditions);

        // Sorting mapping
        let orderClause = desc(mediaFiles.createdAt);
        if (sort === 'createdAt_ASC') {
          orderClause = asc(mediaFiles.createdAt);
        } else if (sort === 'filename_ASC') {
          orderClause = asc(mediaFiles.originalName);
        } else if (sort === 'filename_DESC') {
          orderClause = desc(mediaFiles.originalName);
        } else if (sort === 'size_ASC') {
          orderClause = asc(mediaFiles.size);
        } else if (sort === 'size_DESC') {
          orderClause = desc(mediaFiles.size);
        }

        // Fetch data
        const filesList = await db
          .select()
          .from(mediaFiles)
          .where(queryCondition)
          .orderBy(orderClause)
          .limit(limitNum)
          .offset(offset);

        // Fetch total count
        const totalResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(mediaFiles)
          .where(queryCondition);

        const total = totalResult[0]?.count || 0;

        // Map database fields to required API response format
        const items = filesList.map((f: any) => ({
          id: f.id,
          uuid: f.uuid,
          filename: f.filename,
          originalName: f.originalName,
          mimeType: f.mimeType,
          extension: f.extension,
          size: f.size,
          publicUrl: `/api/media/resolve/${f.uuid}`,
          altText: f.altText,
          caption: f.caption,
          createdAt: f.createdAt,
          uploadedBy: f.uploadedBy
        }));

        return {
          ok: true,
          items,
          pagination: {
            total,
            limit: limitNum,
            offset
          }
        };
      } catch (err) {
        app.log.error(err, 'Failed to retrieve media files');
        reply.status(500);
        return { error: 'Failed to retrieve media files' };
      }
    }
  );

  // ==========================================
  // TRASH & RESTORE SYSTEM (FASE P2-C)
  // PASTI DI ATAS ROUTE /:id
  // ==========================================

  // GET /admin/media/trash - Retrieve soft-deleted media files
  app.get(
    '/admin/trash',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.read')] },
    async (request, reply) => {
      try {
        // Ambil data yang deletedAt-nya TIDAK null (ada di tempat sampah)
        const filesList = await db
          .select()
          .from(mediaFiles)
          .where(isNotNull(mediaFiles.deletedAt))
          .orderBy(desc(mediaFiles.deletedAt)); // Urutkan berdasarkan waktu dihapus

        const items = filesList.map((f: any) => ({
          id: f.id,
          uuid: f.uuid,
          filename: f.filename,
          originalName: f.originalName,
          mimeType: f.mimeType,
          size: f.size,
          publicUrl: `/api/media/resolve/${f.uuid}`,
          createdAt: f.createdAt, // Diperlukan agar frontend tidak error
          deletedAt: f.deletedAt,
        }));

        return { ok: true, items };
      } catch (err) {
        app.log.error(err, 'Failed to retrieve trash files');
        reply.status(500);
        return { error: 'Failed to retrieve trash files' };
      }
    }
  );

  // PUT /admin/media/restore/:id - Restore media file from trash
  app.put(
    '/admin/restore/:id',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.delete')] },
    async (request, reply) => {
      const { id } = request.params as any;
      
      try {
        const fileId = parseInt(id, 10);
        
        // Kembalikan deletedAt menjadi null
        await db
          .update(mediaFiles)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(eq(mediaFiles.id, fileId));
        await sdk.events.emit('media.restored', { id: fileId });

        return { ok: true };
      } catch (err) {
        app.log.error(err, 'Failed to restore media file');
        reply.status(500);
        return { error: 'Failed to restore media file' };
      }
    }
  );

  // DELETE /admin/media/force/:id - Permanently delete file (DB & Hardisk)
  app.delete(
    '/admin/force/:id',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.delete')] },
    async (request, reply) => {
      const { id } = request.params as any;

      try {
        const fileId = parseInt(id, 10);
        
        // 1. Cari file di database (pastikan memang ada di trash)
        const existing = await db
          .select()
          .from(mediaFiles)
          .where(and(eq(mediaFiles.id, fileId), isNotNull(mediaFiles.deletedAt)))
          .limit(1);

        if (existing.length === 0) {
          reply.status(404);
          return { error: 'Media file not found in trash' };
        }

        const media = existing[0];
        const targetPath = path.join(mediaStorageDir, media.path);

        // 2. Hapus file fisiknya dari hardisk menggunakan fs.unlinkSync
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }

        // 3. Hapus thumbnail jika ada
        // PERBAIKAN P2-D.1: Hapus Thumbnail File (Audit Clearence)
        if (media.metadataJson) {
          try {
            const meta = JSON.parse(media.metadataJson);
            if (meta.thumbnail && meta.thumbnail.path) {
              const thumbPath = path.join(mediaStorageDir, meta.thumbnail.path);
              if (fs.existsSync(thumbPath)) {
                fs.unlinkSync(thumbPath);
              }
            }
          } catch (e) {
            app.log.error('Failed to parse metadataJson during force delete');
          }
        }

        // 4. Hapus datanya secara permanen dari database
        await db.delete(mediaFiles).where(eq(mediaFiles.id, fileId));
        await sdk.events.emit('media.deleted', {
          id: fileId,
          permanent: true,
        });

        return { ok: true };
      } catch (err) {
        app.log.error(err, 'Failed to permanently delete media file');
        reply.status(500);
        return { error: 'Failed to permanently delete media file' };
      }
    }
  );

  // ==========================================
  // GET /admin/:id - Fetch details
  // ==========================================
  app.get(
    '/admin/:id',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.read')] },
    async (request, reply) => {
      const { id } = request.params as any;
      try {
        const fileId = parseInt(id, 10);
        const existing = await db
          .select()
          .from(mediaFiles)
          .where(and(eq(mediaFiles.id, fileId), isNull(mediaFiles.deletedAt)))
          .limit(1);

        if (existing.length === 0) {
          reply.status(404);
          return { error: 'Media file not found' };
        }

        const f = existing[0];
        return {
          ok: true,
          media: {
            id: f.id,
            uuid: f.uuid,
            filename: f.filename,
            originalName: f.originalName,
            mimeType: f.mimeType,
            extension: f.extension,
            size: f.size,
            publicUrl: `/api/media/resolve/${f.uuid}`,
            altText: f.altText,
            caption: f.caption,
            createdAt: f.createdAt,
            uploadedBy: f.uploadedBy
          }
        };
      } catch (err) {
        app.log.error(err, 'Failed to retrieve media file details');
        reply.status(500);
        return { error: 'Failed to retrieve media file details' };
      }
    }
  );

  // POST /admin/media/upload - Safe multipart upload
  app.post(
    '/admin/upload',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.create')] },
    async (request, reply) => {
      if (!(request as any).isMultipart()) {
        reply.status(400);
        return { error: 'Request is not multipart' };
      }

      try {
        const data = await (request as any).file();
        if (!data) {
          reply.status(400);
          return { error: 'No file uploaded' };
        }

        // Fetch current settings
        const maxSizeMbStr = await sdk.settings.getWithFallback('media.max_upload_size_mb', '10', ['media_max_upload_size_mb']);
        
        const allowedGroupsStr = await sdk.settings.getWithFallback('media.allowed_groups', DEFAULT_MEDIA_ALLOWED_GROUPS, ['media_allowed_groups']);
        const customMimesStr = await sdk.settings.getWithFallback('media.custom_mime_types', '', ['media_custom_mime_types']);
        
        const organizeByDateStr = await sdk.settings.getWithFallback('media.organize_by_date', 'true', ['media_organize_by_date']);
        const allowSvgStr = await sdk.settings.getWithFallback('media.allow_svg_upload', 'false', ['media_allow_svg_upload']);

        const maxSizeBytes = parseInt(maxSizeMbStr, 10) * 1024 * 1024;
        const organizeByDate = organizeByDateStr === 'true';
        const allowSvg = allowSvgStr === 'true';

        const allowedMimes = resolveAllowedMimes(allowedGroupsStr, customMimesStr, allowSvg);
        
        // Handle SVG permission
        const mime = data.mimetype.toLowerCase();
        const originalName = data.filename;
        const ext = path.extname(originalName).toLowerCase();
        const rawExt = ext.replace('.', '');

        // === FUNGSI PENYELAMAT STREAMING ===
        // Jika file ditolak, kita wajib menguras (drain) sisa stream
        // agar koneksi browser tidak stuck dan pesan error bisa terkirim.
        const drainAndReject = async (statusCode: number, errorMessage: string) => {
          try {
            // Kuras (resume) stream sampai habis tanpa menyimpannya
            data.file.resume();
            for await (const _chunk of data.file) { /* do nothing */ }
          } catch (e) {
            // Abaikan error saat menguras
          }
          reply.status(statusCode);
          return { error: errorMessage };
        };

        // Handle SVG permission
        if (mime === 'image/svg+xml' && !allowSvg) {
          return drainAndReject(400, 'Format / file dilarang! Unggahan SVG dinonaktifkan oleh administrator.');
        }

        // Validate allowed MIME type
        if (!allowedMimes.includes(mime)) {
          let suggestedGroup = '';
          for (const [group, mimes] of Object.entries(MEDIA_MIME_GROUPS)) {
            if (mimes.includes(mime)) {
              suggestedGroup = group.charAt(0).toUpperCase() + group.slice(1);
              break;
            }
          }
          const enableHint = suggestedGroup
            ? ` Silakan centang kategori '${suggestedGroup}' di Pengaturan Media terlebih dahulu.`
            : '';
          
          return drainAndReject(400, `Format / file dilarang! Tipe file (${mime}) tidak diizinkan.${enableHint}`);
        }

        // Security check on file extension blocklist
        const blocklistedExtensions = [
          'php', 'phtml', 'phar', 'js', 'mjs', 'cjs', 'html', 'htm',
          'exe', 'bat', 'cmd', 'ps1', 'sh', 'msi', 'com', 'scr',
        ];

        if (blocklistedExtensions.includes(rawExt)) {
          return drainAndReject(400, `Keamanan: Ekstensi berisiko (.${rawExt}) dilarang!`);
        }

        // Ensure target directories exist
        let relativeDir = '';
        if (organizeByDate) {
          const now = new Date();
          const year = now.getFullYear().toString();
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          relativeDir = path.join(year, month);
        }
        
        const targetDir = path.resolve(mediaStorageDir, relativeDir);
        fs.mkdirSync(targetDir, { recursive: true });

        // Generate unique safe name
        const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '');
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const filename = `${base}-${uniqueId}${ext}`;
        const targetPath = path.join(targetDir, filename);

        // Path traversal validation
        if (!targetPath.startsWith(mediaStorageDir)) {
          reply.status(400);
          return { error: 'Access denied: path traversal attempt detected' };
        }

        // Stream and save with size limit check
        let bytesRead = 0;
        let sizeExceeded = false;
        const writeStream = fs.createWriteStream(targetPath);

        try {
          for await (const chunk of data.file) {
            bytesRead += chunk.length;
            if (bytesRead > maxSizeBytes) {
              sizeExceeded = true;
              writeStream.destroy();
              if (fs.existsSync(targetPath)) {
                fs.unlinkSync(targetPath);
              }
              break;
            }
            writeStream.write(chunk);
          }
          writeStream.end();
        } catch (err) {
          writeStream.destroy();
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
          }
          throw err;
        }

        if (sizeExceeded) {
          reply.status(400);
          return { error: `File is too large. Maximum allowed size is ${maxSizeMbStr} MB.` };
        }

        // Insert into database with the expanded fields
        const relativePath = path.join(relativeDir, filename).replace(/\\/g, '/');
        const userId = (request as any).user?.id || null;

        // Base name for thumbnail files (unique filename without extension)
        const thumbBaseName = path.basename(filename, ext);

        // Best-effort thumbnail generation
        let thumbnailRelativePath: string | null = null;
        let thumbnailSource: string | null = null;

        if (mime.startsWith('image/')) {
          try {
            thumbnailRelativePath = await generateImageThumbnail(targetPath, relativeDir, thumbBaseName);
            if (thumbnailRelativePath) thumbnailSource = 'image';
          } catch (err) {
            app.log.warn({ err }, 'Image thumbnail generation failed (best-effort)');
          }
        } else if (mime.startsWith('video/')) {
          try {
            thumbnailRelativePath = await generateVideoThumbnail(targetPath, relativeDir, thumbBaseName);
            if (thumbnailRelativePath) thumbnailSource = 'video';
          } catch (err) {
            app.log.warn({ err }, 'Video thumbnail generation failed (best-effort)');
          }
        }

        // Build metadata — preserve existing fields, add thumbnail if generated
        const metadata: Record<string, any> = {
          originalName,
          size: bytesRead,
          mimeType: mime,
          hash: uniqueId
        };

        if (thumbnailRelativePath && thumbnailSource) {
          metadata.thumbnail = {
            version: 1,
            path: thumbnailRelativePath,
            mimeType: 'image/webp',
            generatedAt: new Date().toISOString(),
            source: thumbnailSource,
          };
        }

        const assetUuid = crypto.randomUUID();
        const publicUrl = `/api/media/resolve/${assetUuid}`;

        const [result] = await db.insert(mediaFiles).values({
          uuid: assetUuid,
          filename,
          originalName,
          mimeType: mime,
          extension: rawExt,
          size: bytesRead,
          path: relativePath,
          publicUrl,
          disk: 'local',
          uploadedBy: userId,
          metadataJson: JSON.stringify(metadata),
        });

        const insertedId = (result as any).insertId;
        await sdk.events.emit('media.uploaded', {
          id: insertedId,
          uuid: assetUuid,
          mimeType: mime,
          size: bytesRead,
        });

        return {
          ok: true,
          media: {
            id: insertedId,
            uuid: assetUuid,
            filename,
            originalName,
            mimeType: mime,
            extension: rawExt,
            size: bytesRead,
            publicUrl,
            createdAt: new Date(),
          },
        };
      } catch (error) {
        app.log.error(error, 'Media upload failed');
        reply.status(500);
        return { error: 'Media upload failed' };
      }
    }
  );

  // PUT /admin/media/:id - Update media metadata
  app.put(
    '/admin/:id',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.update')] },
    async (request, reply) => {
      const { id } = request.params as any;
      const { alt_text, caption, originalName } = request.body as any;

      try {
        const fileId = parseInt(id, 10);
        const existing = await db
          .select()
          .from(mediaFiles)
          .where(and(eq(mediaFiles.id, fileId), isNull(mediaFiles.deletedAt)))
          .limit(1);

        if (existing.length === 0) {
          reply.status(404);
          return { error: 'Media file not found' };
        }

        const updateData: any = {
          updatedAt: new Date()
        };

        if (alt_text !== undefined) updateData.altText = alt_text;
        if (caption !== undefined) updateData.caption = caption;

        // Safe originalName update verification
        if (originalName !== undefined && originalName !== existing[0].originalName) {
          const oldExt = path.extname(existing[0].originalName).toLowerCase();
          const newExt = path.extname(originalName).toLowerCase();
          if (oldExt !== newExt) {
            reply.status(400);
            return { error: 'Cannot change file extension' };
          }
          const cleanName = path.basename(originalName);
          if (cleanName !== originalName || originalName.includes('..') || /[\\/]/.test(originalName)) {
            reply.status(400);
            return { error: 'Invalid original file name' };
          }
          updateData.originalName = originalName;
        }

        await db
          .update(mediaFiles)
          .set(updateData)
          .where(eq(mediaFiles.id, fileId));

        return { ok: true };
      } catch (err) {
        app.log.error(err, 'Failed to update media file metadata');
        reply.status(500);
        return { error: 'Failed to update media file metadata' };
      }
    }
  );

  // DELETE /admin/media/:id - Soft delete media file
  app.delete(
    '/admin/:id',
    { preHandler: [requireAuth, requireActiveMediaLibrary, requireMediaPermission('media.delete')] },
    async (request, reply) => {
      const { id } = request.params as any;

      try {
        const fileId = parseInt(id, 10);
        const existing = await db
          .select()
          .from(mediaFiles)
          .where(and(eq(mediaFiles.id, fileId), isNull(mediaFiles.deletedAt)))
          .limit(1);

        if (existing.length === 0) {
          reply.status(404);
          return { error: 'Media file not found' };
        }

        await db
          .update(mediaFiles)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(mediaFiles.id, fileId));
        await sdk.events.emit('media.deleted', {
          id: fileId,
          permanent: false,
        });

        return { ok: true };
      } catch (err) {
        app.log.error(err, 'Failed to soft delete media file');
        reply.status(500);
        return { error: 'Failed to soft delete media file' };
      }
    }
  );


  // GET /media/resolve/:uuid - Public Media Asset Resolver (TANPA requireAuth)
  // Supports ?size=thumb query to serve thumbnail when available
  // GET /media/resolve/:uuid - Public Media Asset Resolver
  app.get(
    '/resolve/:uuid',
    { preHandler: [requireActiveMediaLibrary] },
    async (request, reply) => {
      const { uuid } = request.params as any;
      const { size, download } = request.query as any;

      try {
        // PERBAIKAN: Hapus isNull(deletedAt) agar Trash View di Admin bisa merender gambar.
        // Keamanan tetap terjaga karena UUID mustahil ditebak.
        const existing = await db
          .select()
          .from(mediaFiles)
          .where(eq(mediaFiles.uuid, uuid))
          .limit(1);

        if (existing.length === 0) {
          reply.status(404);
          return { error: 'Media not found' };
        }

        const media = existing[0];
        
        // Default ke file original
        let targetFilePath = path.join(mediaStorageDir, media.path);
        let mimeToServe = media.mimeType;

        // LOGIKA THUMBNAIL & FALLBACK
        if (size === 'thumb' && media.metadataJson) {
          try {
            const meta = JSON.parse(media.metadataJson);
            if (meta.thumbnail && meta.thumbnail.path) {
              const thumbPath = path.join(mediaStorageDir, meta.thumbnail.path);
              
              // Cek apakah fisik thumbnail eksis. Jika YA, gunakan thumbnail.
              // Jika TIDAK, sistem akan mengabaikan blok ini (Fallback ke original).
              if (fs.existsSync(thumbPath)) {
                targetFilePath = thumbPath;
                mimeToServe = meta.thumbnail.mimeType || 'image/webp';
              }
            }
          } catch (e) {
            app.log.error('Failed to parse metadataJson for thumbnail fallback');
          }
        }

        // Verifikasi final: pastikan file yang terpilih benar-benar ada di hardisk
        if (!fs.existsSync(targetFilePath)) {
          reply.status(404);
          return { error: 'Physical file missing from storage' };
        }

        const stat = fs.statSync(targetFilePath);
        const rangeHeader = request.headers.range;
        const safeFilename = String(media.originalName || media.filename || 'download').replace(/["\r\n]/g, '_');
        reply.header('Accept-Ranges', 'bytes');
        reply.header('Content-Disposition', `${download === '1' ? 'attachment' : 'inline'}; filename="${safeFilename}"`);
        reply.type(mimeToServe);

        if (rangeHeader) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
          if (!match) {
            reply.status(416).header('Content-Range', `bytes */${stat.size}`);
            return reply.send();
          }
          const start = match[1] ? Number(match[1]) : 0;
          const end = match[2] ? Number(match[2]) : stat.size - 1;
          if (start > end || start >= stat.size || end >= stat.size) {
            reply.status(416).header('Content-Range', `bytes */${stat.size}`);
            return reply.send();
          }
          reply.status(206);
          reply.header('Content-Range', `bytes ${start}-${end}/${stat.size}`);
          reply.header('Content-Length', String(end - start + 1));
          return reply.send(fs.createReadStream(targetFilePath, { start, end }));
        }

        reply.header('Content-Length', String(stat.size));
        const stream = fs.createReadStream(targetFilePath);
        return reply.send(stream);

      } catch (err) {
        app.log.error(err, 'Failed to resolve media asset');
        reply.status(500);
        return { error: 'Internal server error during media resolution' };
      }
    }
  );
}
