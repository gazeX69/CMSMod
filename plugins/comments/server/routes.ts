import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CommentService } from './services/CommentService.js';
import { commentableRegistry } from './contracts/CommentableRegistry.js';
import { and, eq, desc, sql } from 'drizzle-orm';
import { comments } from './schema.js';

export default async function commentsRoutes(
  app: FastifyInstance,
  options: { sdk: any }
) {
  const { sdk } = options;
  const db = sdk.database.orm;
  const requireAuth = sdk.auth.requireUser;
  const commentService = new CommentService(db, sdk);
  app.addHook('onRequest', (request, reply) => sdk.requireActive(request, reply));

  // Register content metadata definition
  try {
    sdk.content.metadata.registerDefinition({
      key: 'enabled',
      type: 'boolean',
      visibility: 'public',
      defaultValue: true,
      description: 'Enable comments for this content',
    });
  } catch (err) {
    app.log.error(err, '[comments] Failed to register content metadata definition');
  }

  // Register theme slot resolvers
  {
    const resolveSlot = async (targetUuid: string): Promise<string> => {
      // 1. Check global comments enabled via SDK settings
      const enabled = await sdk.settings.getWithFallback('comments.enabled', 'true');
      if (enabled !== 'true') return '';

      // 1b. Fetch target content details to determine type (page vs article)
      let contentType = 'article';
      try {
        const content = await sdk.content.getByUuid(targetUuid);
        if (content && content.type) {
          contentType = content.type;
        }
      } catch (err) {
        app.log.error(err, `[comments] Failed to fetch content details for target: ${targetUuid}`);
      }

      // 1c. Check post-level comments enabled via content metadata
      let isCommentsEnabled = true;
      try {
        const metadataList = await sdk.content.metadata.get(targetUuid, { visibility: 'public' });
        const commentsEnabledMeta = metadataList.find((m: any) => m.key === 'comments.enabled');
        if (commentsEnabledMeta !== undefined) {
          isCommentsEnabled = commentsEnabledMeta.value === true || commentsEnabledMeta.value === 'true';
        } else {
          // Fall back to defaults based on type
          if (contentType === 'page') {
            const defaultPageEnabled = await sdk.settings.getWithFallback('comments.default_enabled_page', 'false');
            isCommentsEnabled = defaultPageEnabled === 'true';
          } else {
            const defaultArticleEnabled = await sdk.settings.getWithFallback('comments.default_enabled_article', 'true');
            isCommentsEnabled = defaultArticleEnabled === 'true';
          }
        }
      } catch (err) {
        app.log.error(err, `[comments] Failed to fetch content metadata for target: ${targetUuid}`);
      }

      if (!isCommentsEnabled) {
        return '';
      }

      const allowGuest = await sdk.settings.getWithFallback('comments.allow_guest', 'true');
      const maxDepthSetting = await sdk.settings.getWithFallback('comments.max_depth', '3');
      const maxDepth = parseInt(maxDepthSetting, 10) || 3;

      // 2. Fetch comments list
      let list: any[] = [];
      try {
        const query = db
          .select({
            id: comments.id,
            uuid: comments.uuid,
            parentCommentUuid: comments.parentCommentUuid,
            authorId: comments.authorId,
            guestName: comments.guestName,
            guestEmail: comments.guestEmail,
            body: comments.body,
            createdAt: comments.createdAt,
            status: comments.status,
            targetType: comments.targetType,
            targetUuid: comments.targetUuid,
          })
          .from(comments);

        list = await query
          .where(
            and(
              eq(comments.targetType, 'content'),
              eq(comments.targetUuid, targetUuid),
              eq(comments.status, 'approved')
            )
          )
          .orderBy(desc(comments.createdAt));
      } catch (err) {
        app.log.error(err, `[comments] Failed to query comments for target: ${targetUuid}`);
        return '<div class="comments-error" style="color: var(--accent-danger, #ef4444); padding: 1rem; border: 1px dashed rgba(239, 68, 68, 0.2); border-radius: 8px; text-align: center; margin-top: 2rem;">Gagal memuat diskusi komentar.</div>';
      }

      // Fetch author names for comments with authorId
      const authorIds = Array.from(new Set(list.filter(c => c.authorId).map(c => c.authorId)));
      const authorMap = new Map<number, string>();
      if (authorIds.length > 0) {
        try {
          const queryStr = `SELECT id, username FROM users WHERE id IN (${authorIds.join(',')})`;
          const [usersList] = await db.execute(sql.raw(queryStr));
          if (Array.isArray(usersList)) {
            for (const u of usersList) {
              authorMap.set(Number(u.id), String(u.username));
            }
          }
        } catch (err) {
          app.log.error(err, '[comments] Failed to fetch author names');
        }
      }

      // 3. Build HTML tree helper
      const buildHtmlTree = (parentUuid: string | null, depth: number): string => {
        const levelComments = list.filter(c => c.parentCommentUuid === parentUuid);
        levelComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (levelComments.length === 0) return '';

        let html = `<ul class="comment-list depth-${depth}" style="list-style: none; padding-left: ${depth > 1 ? '1.5rem' : '0'}; margin: 0; display: flex; flex-direction: column; gap: 1rem;">`;
        
        for (const c of levelComments) {
          const authorName = c.authorId ? authorMap.get(c.authorId) : null;
          const name = authorName || c.guestName || 'Anonim';
          const date = new Date(c.createdAt).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const avatarLetter = name.charAt(0).toUpperCase();
          const repliesHtml = depth < maxDepth ? buildHtmlTree(c.uuid, depth + 1) : '';

          html += `
            <li class="comment-item" id="comment-${c.uuid}" style="border-left: ${depth > 1 ? '2px solid var(--border, rgba(0,0,0,0.08))' : 'none'}; padding-left: ${depth > 1 ? '1rem' : '0'}; margin-top: 0.5rem;">
              <div class="comment-card" style="background: var(--surface-color, var(--card-bg, #f8fafc)); border: 1px solid var(--border, rgba(0,0,0,0.08)); border-radius: 12px; padding: 1.25rem; display: flex; gap: 1rem;">
                <div class="comment-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-color, var(--primary, #8b5cf6)), var(--accent-color, var(--accent, #ec4899))); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; flex-shrink: 0; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(139, 92, 246, 0.15);">
                  ${avatarLetter}
                </div>
                <div class="comment-content" style="flex-grow: 1;">
                  <div class="comment-meta" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                    <span class="comment-author" style="font-weight: 600; color: var(--text-color, var(--text, #0f172a)); font-size: 0.95rem;">${name}</span>
                    <span class="comment-date" style="color: var(--text-muted, #6b7280); font-size: 0.75rem;">${date}</span>
                  </div>
                  <div class="comment-text" style="color: var(--text-color, var(--text, #334155)); font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap;">${c.body}</div>
                  
                  <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.75rem;">
                    <button class="comment-reply-btn" onclick="toggleReplyForm('${c.uuid}')" style="background: none; border: none; color: var(--primary-color, var(--primary, #8b5cf6)); font-size: 0.8rem; cursor: pointer; padding: 0; font-weight: 600; display: flex; align-items: center; gap: 0.25rem; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-reply" style="transform: scaleX(-1);"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                      Balas
                    </button>
                  </div>

                  <!-- Inline Reply Form Container -->
                  <div id="reply-form-${c.uuid}" style="margin-top: 1rem; display: none;">
                    <form class="comment-reply-form" onsubmit="submitCommentForm(event, '${c.uuid}')" style="display: flex; flex-direction: column; gap: 0.75rem; background: var(--bg-color, var(--bg, #ffffff)); border: 1px solid var(--border, rgba(0,0,0,0.12)); border-radius: 8px; padding: 1rem;">
                      <div style="font-weight: 600; font-size: 0.8rem; color: var(--primary-color, var(--primary, #8b5cf6));">Balas Komentar</div>
                      ${allowGuest === 'true' ? `
                      <div class="guest-info-fields" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <input type="text" name="guestName" placeholder="Nama Anda *" required style="flex-grow: 1; min-width: 150px; background: var(--bg-color, var(--bg, #ffffff)); border: 1px solid var(--border, rgba(0,0,0,0.15)); border-radius: 6px; padding: 0.4rem 0.6rem; color: var(--text-color, var(--text, #1e293b)); font-size: 0.8rem; outline: none;" />
                        <input type="email" name="guestEmail" placeholder="Email Anda *" required style="flex-grow: 1; min-width: 150px; background: var(--bg-color, var(--bg, #ffffff)); border: 1px solid var(--border, rgba(0,0,0,0.15)); border-radius: 6px; padding: 0.4rem 0.6rem; color: var(--text-color, var(--text, #1e293b)); font-size: 0.8rem; outline: none;" />
                      </div>
                      ` : ''}
                      <textarea name="body" placeholder="Tulis balasan Anda..." required style="min-height: 60px; background: var(--bg-color, var(--bg, #ffffff)); border: 1px solid var(--border, rgba(0,0,0,0.15)); border-radius: 6px; padding: 0.5rem; color: var(--text-color, var(--text, #1e293b)); font-size: 0.85rem; resize: vertical; outline: none;"></textarea>
                      <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button type="button" onclick="toggleReplyForm('${c.uuid}')" style="background: none; border: 1px solid var(--border, rgba(0,0,0,0.15)); border-radius: 4px; padding: 0.25rem 0.75rem; color: var(--text-muted, #6b7280); font-size: 0.8rem; cursor: pointer;">Batal</button>
                        <button type="submit" style="background: var(--primary-color, var(--primary, #8b5cf6)); border: none; border-radius: 4px; padding: 0.25rem 0.75rem; color: white; font-size: 0.8rem; font-weight: 600; cursor: pointer;">Kirim</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              ${repliesHtml}
            </li>
          `;
        }
        
        html += '</ul>';
        return html;
      };

      const commentsCount = list.length;
      const rootCommentsHtml = buildHtmlTree(null, 1);
      const apiBase = (process.env.VITE_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');

      return `
        <div id="comments-section" class="comments-section" style="margin-top: 4rem; border-top: 1px solid var(--border, rgba(0,0,0,0.08)); padding-top: 2rem; color: var(--text-color, var(--text, #1e293b)); font-family: system-ui, -apple-system, sans-serif;">
          <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-color, var(--text, #0f172a));">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Diskusi (${commentsCount})
          </h3>

          <!-- Status Notification Box -->
          <div id="comment-status-alert" style="display: none; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.9rem;"></div>

          <!-- Main Comment Form -->
          <form id="main-comment-form" onsubmit="submitCommentForm(event, null)" style="display: flex; flex-direction: column; gap: 1rem; background: var(--surface-color, var(--card-bg, #f8fafc)); border: 1px solid var(--border, rgba(0,0,0,0.08)); border-radius: 12px; padding: 1.5rem; margin-bottom: 2.5rem;">
            <h4 style="margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--text-color, var(--text, #0f172a));">Bagikan Pikiran Anda</h4>
            ${allowGuest === 'true' ? `
            <div class="guest-info-fields" style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 0.25rem; min-width: 200px;">
                <label style="font-size: 0.75rem; color: var(--text-muted, #6b7280); font-weight: 600;">Nama Lengkap *</label>
                <input type="text" name="guestName" placeholder="Contoh: Budi Santoso" required style="background: var(--bg-color, var(--bg, #ffffff)); border: 1px solid var(--border, rgba(0,0,0,0.15)); border-radius: 6px; padding: 0.5rem; color: var(--text-color, var(--text, #1e293b)); font-size: 0.85rem; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--primary-color, var(--primary, #8b5cf6))'" onblur="this.style.borderColor='var(--border, rgba(0,0,0,0.15))'" />
              </div>
              <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 0.25rem; min-width: 200px;">
                <label style="font-size: 0.75rem; color: var(--text-muted, #6b7280); font-weight: 600;">Alamat Email *</label>
                <input type="email" name="guestEmail" placeholder="Contoh: budi@gmail.com" required style="background: var(--bg-color, var(--bg, #ffffff)); border: 1px solid var(--border, rgba(0,0,0,0.15)); border-radius: 6px; padding: 0.5rem; color: var(--text-color, var(--text, #1e293b)); font-size: 0.85rem; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--primary-color, var(--primary, #8b5cf6))'" onblur="this.style.borderColor='var(--border, rgba(0,0,0,0.15))'" />
              </div>
            </div>
            ` : ''}
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <label style="font-size: 0.75rem; color: var(--text-muted, #6b7280); font-weight: 600;">Komentar *</label>
              <textarea name="body" placeholder="Tulis komentar berkualitas..." required style="min-height: 100px; background: var(--bg-color, var(--bg, #ffffff)); border: 1px solid var(--border, rgba(0,0,0,0.15)); border-radius: 6px; padding: 0.75rem; color: var(--text-color, var(--text, #1e293b)); font-size: 0.9rem; resize: vertical; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--primary-color, var(--primary, #8b5cf6))'" onblur="this.style.borderColor='var(--border, rgba(0,0,0,0.15))'"></textarea>
            </div>
            <button type="submit" style="background: var(--primary-color, var(--primary, #8b5cf6)); border: none; border-radius: 6px; padding: 0.6rem 1.5rem; color: white; font-weight: 600; font-size: 0.9rem; cursor: pointer; align-self: flex-start; transition: all 0.2s; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);" onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-1px)';" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">
              Kirim Komentar
            </button>
          </form>

          <!-- Comments Tree -->
          <div class="comments-list-wrapper" style="display: flex; flex-direction: column; gap: 1.5rem;">
            ${commentsCount === 0 ? `
              <div style="text-align: center; padding: 3rem; color: var(--text-muted, #6b7280); font-style: italic; border: 1px dashed var(--border, rgba(0,0,0,0.1)); border-radius: 12px;">
                Jadilah yang pertama untuk memulai diskusi!
              </div>
            ` : rootCommentsHtml}
          </div>
        </div>

        <!-- Client-side script handling forms dynamically -->
        <script>
          function toggleReplyForm(uuid) {
            const formDiv = document.getElementById('reply-form-' + uuid);
            if (formDiv.style.display === 'none') {
              formDiv.style.display = 'block';
              const textarea = formDiv.querySelector('textarea');
              if (textarea) textarea.focus();
            } else {
              formDiv.style.display = 'none';
            }
          }

          async function submitCommentForm(event, parentUuid) {
            event.preventDefault();
            const form = event.target;
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            
            submitBtn.disabled = true;
            submitBtn.innerText = 'Mengirim...';

            const alertBox = document.getElementById('comment-status-alert');
            alertBox.style.display = 'none';

            const formData = new FormData(form);
            const payload = {
              targetType: 'content',
              targetUuid: '${targetUuid}',
              body: formData.get('body'),
            };

            if (formData.has('guestName')) {
              payload.guestName = formData.get('guestName');
              payload.guestEmail = formData.get('guestEmail');
            }

            let endpoint = '${apiBase}/api/comments/';
            if (parentUuid) {
              endpoint = '${apiBase}/api/comments/' + parentUuid.trim() + '/reply';
            }

            try {
              const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              });

              const data = await res.json();
              if (res.ok && data.ok) {
                form.reset();
                alertBox.style.background = 'rgba(16, 185, 129, 0.1)';
                alertBox.style.border = '1px solid rgba(16, 185, 129, 0.2)';
                alertBox.style.color = '#10b981';
                
                if (data.comment.status === 'pending') {
                  alertBox.innerText = 'Terima kasih! Komentar Anda telah terkirim dan sedang menunggu persetujuan moderasi.';
                } else {
                  alertBox.innerText = 'Komentar berhasil dipublikasikan!';
                  setTimeout(() => { window.location.reload(); }, 1000);
                }
                alertBox.style.display = 'block';
                alertBox.scrollIntoView({ behavior: 'smooth' });
              } else {
                throw new Error(data.error || 'Terjadi kesalahan');
              }
            } catch (err) {
              console.error(err);
              alertBox.style.background = 'rgba(239, 68, 68, 0.1)';
              alertBox.style.border = '1px solid rgba(239, 68, 68, 0.2)';
              alertBox.style.color = '#ef4444';
              alertBox.innerText = err.message || 'Gagal mengirimkan komentar. Silakan coba lagi.';
              alertBox.style.display = 'block';
            } finally {
              submitBtn.disabled = false;
              submitBtn.innerText = originalText;
            }
          }
        </script>
      `;
    };

    sdk.publicSlots.register('comments', resolveSlot);
    sdk.publicSlots.register('discussion', resolveSlot);
  }

  // Register core 'content' validator
  commentableRegistry.register('content', {
      isEnabled: async (uuid: string) => {
        try {
          const content = await sdk.content.getByUuid(uuid, { includeBody: false });
          return content?.status === 'published';
        } catch (err) {
          app.log.error(err, `[comments] Failed to validate content target: ${uuid}`);
          return false;
        }
      },
      getTitle: async (uuid: string) => {
        try {
          const content = await sdk.content.getByUuid(uuid, { includeBody: false });
          return content?.title || `content (${uuid})`;
        } catch {
          return `content (${uuid})`;
        }
      }
    });

  async function requireActiveComments(request: FastifyRequest, reply: FastifyReply) {
    return sdk.requireActive(request, reply);
  }

  function requireCommentsPermission(permissionKey: string) {
    return async (request: any, reply: any) => {
      const userId = request.user?.id;
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

  // GET /target/:type/:uuid - Get comments tree (Public)
  app.get(
    '/target/:type/:uuid',
    { preHandler: [requireActiveComments] },
    async (request: any, reply) => {
      const { type, uuid } = request.params;
      try {
        const tree = await commentService.getCommentsForTarget(type, uuid);
        return { ok: true, items: tree };
      } catch (err: any) {
        reply.status(400).send({ ok: false, error: err.message });
      }
    }
  );

  // POST / - Create a comment (Public/Auth)
  app.post(
    '/',
    { preHandler: [requireActiveComments] },
    async (request: any, reply) => {
      const { targetType, targetUuid, body, guestName, guestEmail, parentCommentUuid } = request.body || {};
      const authorId = request.user?.id || null;

      try {
        const comment = await commentService.createComment({
          targetType,
          targetUuid,
          parentCommentUuid,
          body,
          authorId,
          guestName,
          guestEmail
        });
        return { ok: true, comment };
      } catch (err: any) {
        reply.status(400).send({ ok: false, error: err.message });
      }
    }
  );

  // POST /:uuid/reply - Reply to a comment (Public/Auth)
  app.post(
    '/:uuid/reply',
    { preHandler: [requireActiveComments] },
    async (request: any, reply) => {
      const { uuid } = request.params;
      const { targetType, targetUuid, body, guestName, guestEmail } = request.body || {};
      const authorId = request.user?.id || null;

      try {
        const comment = await commentService.createComment({
          targetType,
          targetUuid,
          parentCommentUuid: uuid,
          body,
          authorId,
          guestName,
          guestEmail
        });
        return { ok: true, comment };
      } catch (err: any) {
        reply.status(400).send({ ok: false, error: err.message });
      }
    }
  );

  // GET /admin/metadata/:contentUuid - Fetch comments.enabled metadata for a content (Admin)
  app.get(
    '/admin/metadata/:contentUuid',
    { preHandler: [requireAuth, requireActiveComments, requireCommentsPermission('comments.read')] },
    async (request: any, reply) => {
      const { contentUuid } = request.params;
      try {
        const metadata = await sdk.content.metadata.get(contentUuid, { visibility: 'admin' });
        const commentsEnabled = metadata.find((m: any) => m.key === 'comments.enabled');
        return {
          ok: true,
          enabled: commentsEnabled ? commentsEnabled.value === true || commentsEnabled.value === 'true' : null
        };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );

  // PUT /admin/metadata/:contentUuid - Save comments.enabled metadata for a content (Admin)
  app.put(
    '/admin/metadata/:contentUuid',
    { preHandler: [requireAuth, requireActiveComments, requireCommentsPermission('comments.update')] },
    async (request: any, reply) => {
      const { contentUuid } = request.params;
      const { enabled } = request.body || {};
      if (enabled === undefined) {
        reply.status(400).send({ ok: false, error: 'enabled parameter is required' });
        return;
      }
      try {
        await sdk.content.metadata.set(contentUuid, [
          { key: 'enabled', value: enabled }
        ]);
        return { ok: true };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );

  // GET /admin - Fetch all comments for admin moderation
  app.get(
    '/admin',
    { preHandler: [requireAuth, requireActiveComments, requireCommentsPermission('comments.moderate')] },
    async (request: any, reply) => {
      try {
        const list = await commentService.getAllCommentsForAdmin();

        // Fetch author names for comments with authorId
        const authorIds = Array.from(new Set(list.filter((c: any) => c.authorId).map((c: any) => c.authorId)));
        const authorMap = new Map<number, string>();
        if (authorIds.length > 0) {
          try {
            const queryStr = `SELECT id, username FROM users WHERE id IN (${authorIds.join(',')})`;
            const [usersList] = await db.execute(sql.raw(queryStr));
            if (Array.isArray(usersList)) {
              for (const u of usersList) {
                authorMap.set(Number(u.id), String(u.username));
              }
            }
          } catch (err) {
            app.log.error(err, '[comments] Failed to fetch author names for admin');
          }
        }

        // Fetch target content titles and slugs
        const targetUuids = Array.from(new Set(list.filter((c: any) => c.targetType === 'content').map((c: any) => c.targetUuid)));
        const targetMap = new Map<string, { title: string; slug: string; type: string }>();
        if (targetUuids.length > 0) {
          try {
            const formattedUuids = targetUuids.map(uuid => `'${uuid}'`).join(',');
            const queryStr = `SELECT uuid, title, slug, type FROM contents WHERE uuid IN (${formattedUuids})`;
            const [contentsList] = await db.execute(sql.raw(queryStr));
            if (Array.isArray(contentsList)) {
              for (const item of contentsList) {
                targetMap.set(String(item.uuid), {
                  title: String(item.title),
                  slug: String(item.slug),
                  type: String(item.type),
                });
              }
            }
          } catch (err) {
            app.log.error(err, '[comments] Failed to fetch target content info for admin');
          }
        }

        const populatedList = [];
        for (const c of list) {
          let targetTitle = `${c.targetType} (${c.targetUuid})`;
          let targetUrl = null;

          if (c.targetType === 'content') {
            const targetInfo = targetMap.get(c.targetUuid);
            if (targetInfo) {
              targetTitle = targetInfo.title;
              try {
                targetUrl = await sdk.content.resolvePermalink(c.targetUuid);
              } catch (err) {
                targetUrl = `/${targetInfo.slug}`;
              }
            }
          }

          populatedList.push({
            ...c,
            authorName: c.authorId ? authorMap.get(c.authorId) : undefined,
            targetTitle,
            targetUrl
          });
        }

        return { ok: true, items: populatedList };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );

  // PATCH /:uuid/status - Moderate comment status (Admin)
  app.patch(
    '/:uuid/status',
    { preHandler: [requireAuth, requireActiveComments, requireCommentsPermission('comments.moderate')] },
    async (request: any, reply) => {
      const { uuid } = request.params;
      const { status } = request.body || {};

      if (!status || !['approved', 'rejected', 'spam'].includes(status)) {
        reply.status(400).send({ ok: false, error: 'Invalid moderation status' });
        return;
      }

      try {
        const result = await commentService.moderateComment(uuid, status);
        return result;
      } catch (err: any) {
        reply.status(400).send({ ok: false, error: err.message });
      }
    }
  );

  // DELETE /:uuid - Delete comment permanently (Admin)
  app.delete(
    '/:uuid',
    { preHandler: [requireAuth, requireActiveComments, requireCommentsPermission('comments.delete')] },
    async (request: any, reply) => {
      const { uuid } = request.params;
      try {
        const result = await commentService.deleteComment(uuid);
        return result;
      } catch (err: any) {
        reply.status(400).send({ ok: false, error: err.message });
      }
    }
  );
}
