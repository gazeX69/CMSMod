import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { and, eq, desc, sql, gte } from 'drizzle-orm';
import crypto from 'crypto';
import { contactForms, contactSubmissions } from './schema.js';

export default async function contactFormRoutes(
  app: FastifyInstance,
  options: { sdk: any }
) {
  const { sdk } = options;
  const db = sdk.database.orm;
  const requireAuth = sdk.auth.requireUser;
  const apiBase = (process.env.VITE_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');

  // Ensure plugin is active for these routes
  app.addHook('onRequest', (request, reply) => sdk.requireActive(request, reply));

  // 1. Helper for Permissions
  function requirePermission(permissionKey: string) {
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

  // 2. Register Client-side JS Runtime Asset
  const jsContent = `
    document.addEventListener('submit', async (event) => {
      const form = event.target;
      if (!form.classList.contains('cms-contact-form')) return;
      event.preventDefault();

      const formUuid = form.getAttribute('data-form-uuid');
      if (!formUuid) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      // Extract all form values
      const formData = new FormData(form);
      const submittedData = {};
      let honeypotFilled = false;
      for (const [key, value] of formData.entries()) {
        if (key === 'website_url') {
          if (value) honeypotFilled = true;
          continue;
        }
        submittedData[key] = value;
      }

      // Check if alert box already exists, if not create it
      let alertBox = form.querySelector('.cms-form-alert');
      if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.className = 'cms-form-alert';
        alertBox.style.padding = '0.75rem';
        alertBox.style.borderRadius = '6px';
        alertBox.style.marginTop = '1rem';
        alertBox.style.fontSize = '0.9rem';
        alertBox.style.fontWeight = '500';
        form.appendChild(alertBox);
      }

      alertBox.style.display = 'none';

      try {
        const response = await fetch('${apiBase}/api/contact-form/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            formUuid,
            submittedData,
            website_url: honeypotFilled ? 'spam' : ''
          })
        });

        const result = await response.json();
        if (response.ok && result.ok) {
          alertBox.style.background = 'rgba(16, 185, 129, 0.1)';
          alertBox.style.border = '1px solid rgba(16, 185, 129, 0.2)';
          alertBox.style.color = '#10b981';
          alertBox.innerText = result.message || 'Pesan Anda telah berhasil dikirim!';
          alertBox.style.display = 'block';
          form.reset();
        } else {
          alertBox.style.background = 'rgba(239, 68, 68, 0.1)';
          alertBox.style.border = '1px solid rgba(239, 68, 68, 0.2)';
          alertBox.style.color = '#ef4444';
          alertBox.innerText = result.error || 'Terjadi kesalahan saat mengirim pesan.';
          alertBox.style.display = 'block';
        }
      } catch (err) {
        console.error('Submit form error:', err);
        alertBox.style.background = 'rgba(239, 68, 68, 0.1)';
        alertBox.style.border = '1px solid rgba(239, 68, 68, 0.2)';
        alertBox.style.color = '#ef4444';
        alertBox.innerText = 'Gagal mengirim pesan. Silakan periksa koneksi Anda.';
        alertBox.style.display = 'block';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  `;

  try {
    sdk.publicAssets.register('js/runtime.js', jsContent, 'application/javascript');
  } catch (err) {
    app.log.error(err, '[contact-form] Failed to register public assets');
  }

  // 3. Register public document script contributor
  try {
    sdk.publicDocument.registerContributor({
      id: 'contact-form-runtime',
      priority: 10,
      contribute: async () => ({
        scripts: [
          {
            key: 'contact-form-runtime-js',
            src: `${apiBase}/api/public/assets/contact-form/js/runtime.js`,
            defer: true,
          },
        ],
      }),
    });
  } catch (err) {
    app.log.error(err, '[contact-form] Failed to register document contributor');
  }

  async function renderFormHtml(formUuid: string): Promise<string> {
    try {
      const rows = await db
        .select()
        .from(contactForms)
        .where(and(eq(contactForms.uuid, formUuid), sql`${contactForms.deletedAt} IS NULL`))
        .limit(1);

      if (rows.length === 0) {
        return `<!-- Contact Form ${formUuid} not found or deleted -->`;
      }

      const form = rows[0];
      let schemaObj: { fields?: any[] } = {};
      try {
        schemaObj = JSON.parse(form.fieldsSchemaJson);
      } catch {
        return `<!-- Contact Form ${formUuid} has invalid fields schema -->`;
      }

      const fields = schemaObj.fields || [];
      let fieldsHtml = '';

      for (const field of fields) {
        const requiredAttr = field.required ? 'required' : '';
        const requiredStar = field.required ? ' *' : '';
        const placeholderAttr = field.placeholder ? `placeholder="${field.placeholder}"` : '';

        if (field.type === 'textarea') {
          fieldsHtml += `
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
              <label style="font-weight: 600; font-size: 0.9rem; color: var(--text-color, #1f2937);">${field.label}${requiredStar}</label>
              <textarea name="${field.name}" ${requiredAttr} ${placeholderAttr} style="width: 100%; padding: 0.6rem; border: 1px solid var(--border, #d1d5db); border-radius: 6px; background: var(--bg, #ffffff); color: var(--text, #111827); min-height: 100px; resize: vertical; font-family: inherit; font-size: 0.9rem; outline: none;"></textarea>
            </div>
          `;
        } else if (field.type === 'select') {
          const optionsHtml = (field.options || [])
            .map((opt: any) => `<option value="${opt.value}">${opt.label}</option>`)
            .join('');
          fieldsHtml += `
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
              <label style="font-weight: 600; font-size: 0.9rem; color: var(--text-color, #1f2937);">${field.label}${requiredStar}</label>
              <select name="${field.name}" ${requiredAttr} style="width: 100%; padding: 0.6rem; border: 1px solid var(--border, #d1d5db); border-radius: 6px; background: var(--bg, #ffffff); color: var(--text, #111827); font-family: inherit; font-size: 0.9rem; outline: none;">
                ${optionsHtml}
              </select>
            </div>
          `;
        } else {
          fieldsHtml += `
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
              <label style="font-weight: 600; font-size: 0.9rem; color: var(--text-color, #1f2937);">${field.label}${requiredStar}</label>
              <input type="${field.type || 'text'}" name="${field.name}" ${requiredAttr} ${placeholderAttr} style="width: 100%; padding: 0.6rem; border: 1px solid var(--border, #d1d5db); border-radius: 6px; background: var(--bg, #ffffff); color: var(--text, #111827); font-family: inherit; font-size: 0.9rem; outline: none;" />
            </div>
          `;
        }
      }

      return `
        <form class="cms-contact-form" data-form-uuid="${form.uuid}" style="width: 100%; max-width: 600px; padding: 2rem; border: 1px solid var(--border, rgba(0,0,0,0.08)); border-radius: 12px; background: var(--card-bg, #ffffff); color: var(--text-color, #1f2937); font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box;">
          <input type="text" name="website_url" style="display: none !important;" tabIndex="-1" autocomplete="off" />
          ${fieldsHtml}
          <button type="submit" style="cursor: pointer; width: 100%; padding: 0.75rem; background: var(--primary, #6366f1); color: #ffffff; border: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            ${form.submitButtonText || 'Submit'}
          </button>
        </form>
      `;
    } catch (err) {
      app.log.error(err, `[contact-form] Failed to render contact-form block: ${formUuid}`);
      return `<!-- Contact Form ${formUuid} failed to render -->`;
    }
  }

  // 4. Register Block Renderer for public forms
  try {
    sdk.publicContent.registerBlockRenderer('contact-form', async (formUuid: string) => {
      return renderFormHtml(formUuid);
    });
  } catch (err) {
    app.log.error(err, '[contact-form] Failed to register block renderer');
  }

  // 4b. Register Content Filter for shortcodes [Contact_Form-UUID]
  try {
    sdk.publicContent.registerContentFilter('contact-form-shortcode', async (html: string) => {
      const regex = /\[Contact_Form-([a-fA-F0-9-]+)\]/gi;
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(html)) !== null) {
        matches.push(match[1]);
      }

      if (matches.length === 0) {
        return html;
      }

      const uniqueUuids = Array.from(new Set(matches));
      const renderedForms = new Map<string, string>();

      await Promise.all(
        uniqueUuids.map(async (uuid) => {
          const rendered = await renderFormHtml(uuid);
          renderedForms.set(uuid.toLowerCase(), rendered);
        })
      );

      return html.replace(/\[Contact_Form-([a-fA-F0-9-]+)\]/gi, (match, uuid) => {
        return renderedForms.get(uuid.toLowerCase()) || match;
      });
    }, 10);
  } catch (err) {
    app.log.error(err, '[contact-form] Failed to register content filter');
  }

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  // POST /submit - Public form submission
  app.post('/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    const { formUuid, submittedData, website_url } = request.body as any;

    if (!formUuid || !submittedData) {
      reply.status(400).send({ ok: false, error: 'Required fields missing' });
      return;
    }

    try {
      // 1. Retrieve Form details
      const formRows = await db
        .select()
        .from(contactForms)
        .where(and(eq(contactForms.uuid, formUuid), sql`${contactForms.deletedAt} IS NULL`))
        .limit(1);

      if (formRows.length === 0) {
        reply.status(404).send({ ok: false, error: 'Contact Form not found' });
        return;
      }

      const form = formRows[0];

      // 2. Honeypot check
      if (website_url) {
        // Honeypot field filled -> likely a spam bot. Return fake success.
        app.log.warn(`[contact-form] Honeypot triggered for form ${formUuid}`);
        const defaultMsg = await sdk.settings.getWithFallback('contact-form.default_success_message', 'Terima kasih, pesan Anda telah terkirim!');
        return { ok: true, message: form.successMessage || defaultMsg };
      }

      // 3. Throttling rate limit check
      const ip = request.ip;
      const rateLimitSetting = await sdk.settings.getWithFallback('contact-form.max_submissions_per_hour', '60');
      const maxSubmissions = parseInt(rateLimitSetting, 10) || 60;

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSubmissions = await db
        .select({ count: sql<number>`count(*)` })
        .from(contactSubmissions)
        .where(
          and(
            eq(contactSubmissions.ipAddress, ip),
            gte(contactSubmissions.createdAt, oneHourAgo)
          )
        );

      const count = recentSubmissions[0]?.count || 0;
      if (count >= maxSubmissions) {
        reply.status(429).send({ ok: false, error: 'Rate limit exceeded. Please try again later.' });
        return;
      }

      // 4. Save Submission
      const submissionUuid = crypto.randomUUID();
      const userAgent = request.headers['user-agent'] || null;

      await db.insert(contactSubmissions).values({
        uuid: submissionUuid,
        formUuid,
        submittedDataJson: JSON.stringify(submittedData),
        ipAddress: ip,
        userAgent,
        status: 'new',
        createdAt: new Date(),
      });

      // 5. Emit Event
      await sdk.events.emit('contact-form.submitted', {
        formUuid,
        submissionUuid,
        data: submittedData,
      });

      const defaultMsg = await sdk.settings.getWithFallback('contact-form.default_success_message', 'Terima kasih, pesan Anda telah terkirim!');
      return { ok: true, message: form.successMessage || defaultMsg };
    } catch (err: any) {
      app.log.error(err, '[contact-form] Failed to process public submission');
      reply.status(500).send({ ok: false, error: 'Internal server error' });
    }
  });

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  // GET /admin/forms - List all forms (Admin)
  app.get(
    '/admin/forms',
    { preHandler: [requireAuth, requirePermission('contact-form.read')] },
    async (request, reply) => {
      try {
        const items = await db
          .select()
          .from(contactForms)
          .where(sql`${contactForms.deletedAt} IS NULL`)
          .orderBy(desc(contactForms.createdAt));

        return { ok: true, items };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );

  // POST /admin/forms - Create new form (Admin)
  app.post(
    '/admin/forms',
    { preHandler: [requireAuth, requirePermission('contact-form.create')] },
    async (request: any, reply) => {
      const { title, fieldsSchemaJson, emailNotifications, successMessage, submitButtonText } = request.body || {};

      if (!title || !fieldsSchemaJson) {
        reply.status(400).send({ ok: false, error: 'Title and fields schema are required' });
        return;
      }

      try {
        const uuid = crypto.randomUUID();
        const payload = {
          uuid,
          title,
          fieldsSchemaJson,
          emailNotifications: emailNotifications || null,
          successMessage: successMessage || null,
          submitButtonText: submitButtonText || 'Submit',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.insert(contactForms).values(payload);

        // Emit Event
        await sdk.events.emit('contact-form.created', { formUuid: uuid, title });

        return { ok: true, item: payload };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );

  // PUT /admin/forms/:uuid - Update form (Admin)
  app.put(
    '/admin/forms/:uuid',
    { preHandler: [requireAuth, requirePermission('contact-form.update')] },
    async (request: any, reply) => {
      const { uuid } = request.params;
      const { title, fieldsSchemaJson, emailNotifications, successMessage, submitButtonText } = request.body || {};

      if (!title || !fieldsSchemaJson) {
        reply.status(400).send({ ok: false, error: 'Title and fields schema are required' });
        return;
      }

      try {
        const existing = await db
          .select()
          .from(contactForms)
          .where(and(eq(contactForms.uuid, uuid), sql`${contactForms.deletedAt} IS NULL`))
          .limit(1);

        if (existing.length === 0) {
          reply.status(404).send({ ok: false, error: 'Form not found' });
          return;
        }

        await db
          .update(contactForms)
          .set({
            title,
            fieldsSchemaJson,
            emailNotifications: emailNotifications || null,
            successMessage: successMessage || null,
            submitButtonText: submitButtonText || 'Submit',
            updatedAt: new Date(),
          })
          .where(eq(contactForms.uuid, uuid));

        // Emit Event
        await sdk.events.emit('contact-form.updated', { formUuid: uuid, title });

        return { ok: true };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );

  // DELETE /admin/forms/:uuid - Soft delete form (Admin)
  app.delete(
    '/admin/forms/:uuid',
    { preHandler: [requireAuth, requirePermission('contact-form.delete')] },
    async (request, reply) => {
      const { uuid } = request.params as any;

      try {
        const existing = await db
          .select()
          .from(contactForms)
          .where(and(eq(contactForms.uuid, uuid), sql`${contactForms.deletedAt} IS NULL`))
          .limit(1);

        if (existing.length === 0) {
          reply.status(404).send({ ok: false, error: 'Form not found' });
          return;
        }

        await db
          .update(contactForms)
          .set({ deletedAt: new Date() })
          .where(eq(contactForms.uuid, uuid));

        return { ok: true };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );

  // GET /admin/submissions - List all submissions (Admin)
  app.get(
    '/admin/submissions',
    { preHandler: [requireAuth, requirePermission('contact-form.submissions.read')] },
    async (request: any, reply) => {
      const { formUuid } = request.query;

      try {
        let query = db
          .select({
            id: contactSubmissions.id,
            uuid: contactSubmissions.uuid,
            formUuid: contactSubmissions.formUuid,
            submittedDataJson: contactSubmissions.submittedDataJson,
            metadataJson: contactSubmissions.metadataJson,
            status: contactSubmissions.status,
            ipAddress: contactSubmissions.ipAddress,
            userAgent: contactSubmissions.userAgent,
            createdAt: contactSubmissions.createdAt,
          })
          .from(contactSubmissions)
          .where(sql`${contactSubmissions.deletedAt} IS NULL`);

        if (formUuid) {
          query = query.where(and(eq(contactSubmissions.formUuid, formUuid), sql`${contactSubmissions.deletedAt} IS NULL`));
        }

        const items = await query.orderBy(desc(contactSubmissions.createdAt));
        return { ok: true, items };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );

  // PATCH /admin/submissions/:id/status - Update submission status (Admin)
  app.patch(
    '/admin/submissions/:id/status',
    { preHandler: [requireAuth, requirePermission('contact-form.submissions.read')] },
    async (request: any, reply) => {
      const { id } = request.params;
      const { status } = request.body || {};

      if (!status || !['new', 'read', 'replied', 'archived', 'spam'].includes(status)) {
        reply.status(400).send({ ok: false, error: 'Invalid workflow status' });
        return;
      }

      const numId = parseInt(id, 10);
      if (isNaN(numId)) {
        reply.status(400).send({ ok: false, error: 'Invalid submission ID' });
        return;
      }

      try {
        const existing = await db
          .select()
          .from(contactSubmissions)
          .where(and(eq(contactSubmissions.id, numId), sql`${contactSubmissions.deletedAt} IS NULL`))
          .limit(1);

        if (existing.length === 0) {
          reply.status(404).send({ ok: false, error: 'Submission not found' });
          return;
        }

        await db
          .update(contactSubmissions)
          .set({ status })
          .where(eq(contactSubmissions.id, numId));

        return { ok: true };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );

  // DELETE /admin/submissions/:id - Soft delete submission (Admin)
  app.delete(
    '/admin/submissions/:id',
    { preHandler: [requireAuth, requirePermission('contact-form.submissions.delete')] },
    async (request, reply) => {
      const { id } = request.params as any;
      const numId = parseInt(id, 10);
      if (isNaN(numId)) {
        reply.status(400).send({ ok: false, error: 'Invalid submission ID' });
        return;
      }

      try {
        const existing = await db
          .select()
          .from(contactSubmissions)
          .where(and(eq(contactSubmissions.id, numId), sql`${contactSubmissions.deletedAt} IS NULL`))
          .limit(1);

        if (existing.length === 0) {
          reply.status(404).send({ ok: false, error: 'Submission not found' });
          return;
        }

        await db
          .update(contactSubmissions)
          .set({ deletedAt: new Date() })
          .where(eq(contactSubmissions.id, numId));

        return { ok: true };
      } catch (err: any) {
        reply.status(500).send({ ok: false, error: err.message });
      }
    }
  );
}
