import { db } from '../apps/api/src/database/client.js';
import { contents } from '../apps/api/src/database/schema.js';
import { contactForms, contactSubmissions } from '../plugins/contact-form/server/schema.js';
import { renderContentPage } from '../apps/api/src/public/publicWebsiteService.js';
import { activatePlugin, migratePlugin } from '../apps/api/src/plugins/pluginLifecycleService.js';
import { publicContentCompositionPipeline, publicAssetRegistry } from '../apps/api/src/public/PublicExtensionRegistries.js';
import contactFormRoutes from '../plugins/contact-form/server/routes.js';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

async function main() {
  console.log('--- STARTING CONTACT FORM INTEGRATION VERIFICATION ---');

  // 1. Run migrations & Ensure plugin is active
  console.log('Running plugin migrations...');
  try {
    await migratePlugin('contact-form');
    console.log('[OK] Migrations applied.');
  } catch (err: any) {
    console.warn('Note on migration:', err.message);
  }

  console.log('Activating contact-form plugin...');
  try {
    await activatePlugin('contact-form');
    console.log('[OK] Plugin contact-form activated.');
  } catch (err: any) {
    console.warn('Note on activation:', err.message);
  }

  // 1.2 Setup Mock app and sdk to register Block Renderer and Content Filter dynamically
  console.log('Registering Block Renderer and Content Filter dynamically...');
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
    publicAssets: {
      register: (path: string, content: any, mimeType: string) => {
        publicAssetRegistry.register('contact-form', path, content, mimeType);
      }
    },
    publicDocument: {
      registerContributor: () => {}
    },
    publicContent: {
      registerBlockRenderer: (type: string, renderer: any) => {
        publicContentCompositionPipeline.blocks.register('contact-form', type, renderer);
      },
      registerContentFilter: (id: string, filter: any, priority?: number) => {
        publicContentCompositionPipeline.filters.register('contact-form', { id, filter, priority });
      }
    }
  };

  await contactFormRoutes(mockApp, { sdk: mockSdk });
  console.log('[OK] Routes registered.');

  // 2. Insert test Contact Form
  const formUuid = crypto.randomUUID();
  console.log(`Inserting test Contact Form with UUID: ${formUuid}`);

  const testSchema = {
    version: 1,
    fields: [
      { name: 'name', type: 'text', label: 'Your Name', required: true },
      { name: 'email', type: 'email', label: 'Your Email', required: true },
      { name: 'message', type: 'textarea', label: 'Message', required: false }
    ]
  };

  await db.insert(contactForms).values({
    uuid: formUuid,
    title: 'Verification Test Form',
    fieldsSchemaJson: JSON.stringify(testSchema),
    submitButtonText: 'Send Verification Message',
    successMessage: 'Verification successful!',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 3. Create a test page containing both shortcode and block tag
  const testPageUuid = crypto.randomUUID();
  const testSlug = `contact-form-test-${Date.now()}`;
  console.log(`Creating test page with slug: ${testSlug}`);

  const pageBody = `
    <h2>Test Shortcode</h2>
    [Contact_Form-${formUuid}]

    <h2>Test Block</h2>
    <cms-block type="contact-form" id="${formUuid}"></cms-block>
  `;

  await db.insert(contents).values({
    uuid: testPageUuid,
    title: 'Contact Form Test Page',
    slug: testSlug,
    type: 'page',
    status: 'published',
    body: pageBody,
    publishedAt: new Date(),
  });

  // 4. Render the page and inspect output
  console.log('\n--- RENDERING PAGE ---');
  const rendered = await renderContentPage(testSlug, {}, {
    mode: 'public',
    request: {
      method: 'GET',
      path: `/${testSlug}`,
      query: {},
      headers: { 'user-agent': 'test-runner' }
    }
  });

  console.log('Page rendered. Analyzing output HTML...');

  // Check if BOTH the shortcode and block tag were replaced by forms
  const formTagCount = (rendered.html.match(/class="cms-contact-form"/g) || []).length;
  const formUuidCount = (rendered.html.match(new RegExp(`data-form-uuid="${formUuid}"`, 'g')) || []).length;

  console.log(`Found ${formTagCount} cms-contact-form form tags.`);
  console.log(`Found ${formUuidCount} matches of data-form-uuid="${formUuid}".`);

  if (formTagCount !== 2 || formUuidCount !== 2) {
    console.error('Rendered HTML:\n', rendered.html);
    throw new Error(`Verification failed: Expected exactly 2 rendered form tags and 2 data-form-uuid matching the test form. Got ${formTagCount} tags and ${formUuidCount} uuid references.`);
  }

  console.log('[OK] Both the Shortcode and cms-block rendered the contact form correctly!');

  // Check for specific form elements
  if (!rendered.html.includes('name="name"') || !rendered.html.includes('name="email"') || !rendered.html.includes('name="message"')) {
    throw new Error('Verification failed: Rendered form markup is missing fields (name, email, or message).');
  }
  if (!rendered.html.includes('Send Verification Message')) {
    throw new Error('Verification failed: Rendered form markup is missing custom submitButtonText.');
  }
  console.log('[OK] Form markup contains all configured fields and submit button text.');

  // Check honeypot field inclusion
  if (!rendered.html.includes('name="website_url"') || !rendered.html.includes('display: none !important;')) {
    throw new Error('Verification failed: Honeypot field (website_url) is missing or visible.');
  }
  console.log('[OK] Honeypot spam protection input is present and hidden.');

  // 5. Clean up
  console.log('\nCleaning up test database entries...');
  await db.delete(contents).where(eq(contents.uuid, testPageUuid));
  await db.delete(contactForms).where(eq(contactForms.uuid, formUuid));
  console.log('[OK] Test database entries cleaned up.');

  console.log('\n--- ALL VERIFICATION PASSED ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
