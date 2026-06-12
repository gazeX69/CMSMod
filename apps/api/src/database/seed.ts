import { db } from './client.js';
import { contents, navigationItems, roles, settings, users, userRoles, plugins } from './schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  assignAllPermissionsToRole,
  registerCorePermissions,
} from '../permissions/permissionService.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function seed() {
  console.log('Seeding default data...');
  try {
    // 1. Seed Roles
    const defaultRoles = [
      { name: 'Admin', description: 'Administrator with full access' },
      { name: 'Editor', description: 'Editor with content control' },
      { name: 'Author', description: 'Author who can publish content' },
    ];

    const rolesMap: Record<string, number> = {};

    for (const role of defaultRoles) {
      const existing = await db.select().from(roles).where(eq(roles.name, role.name)).limit(1);
      if (existing.length === 0) {
        const [result] = await db.insert(roles).values(role);
        // Note: For mysql2, insert returns an array where the first element contains metadata like insertId
        const insertedId = (result as any).insertId;
        rolesMap[role.name] = insertedId;
        console.log(`Role '${role.name}' created with ID ${insertedId}.`);
      } else {
        rolesMap[role.name] = existing[0].id;
        console.log(`Role '${role.name}' already exists with ID ${existing[0].id}.`);
      }
    }

    // 2a. Seed Core Permissions and grant them to Admin.
    await registerCorePermissions();
    await assignAllPermissionsToRole('Admin');

    // 2. Seed Settings
    const defaultSettings = [
      {
        key: 'site_name',
        value: 'Modern CMS',
        description: 'The name of the website',
        group: 'general',
        type: 'string',
        isPublic: true,
      },
      {
        key: 'system.site_name',
        value: 'Modern CMS',
        description: 'Public site name',
        group: 'system',
        type: 'string',
        isPublic: true,
      },
      {
        key: 'system.site_description',
        value: 'A plugin-first application platform',
        description: 'Public site description',
        group: 'system',
        type: 'string',
        isPublic: true,
      },
      {
        key: 'system.site_url',
        value: 'http://localhost:5174',
        description: 'Public site URL',
        group: 'system',
        type: 'string',
        isPublic: true,
      },
      {
        key: 'theme.active',
        value: 'default',
        description: 'Active public theme id',
        group: 'theme',
        type: 'string',
        isPublic: true,
      },
      {
        key: 'public.homepage_slug',
        value: 'home',
        description: 'Slug used by the public homepage resolver',
        group: 'public',
        type: 'string',
        isPublic: true,
      },
      {
        key: 'site_description',
        value: 'A modern dynamic CMS built on Fastify & React',
        description: 'Brief description of the website',
        group: 'general',
        type: 'string',
        isPublic: true,
      },
      {
        key: 'site_url',
        value: 'http://localhost:5173',
        description: 'The URL of the frontend website',
        group: 'general',
        type: 'string',
        isPublic: true,
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await db.select().from(settings).where(eq(settings.key, setting.key)).limit(1);
      if (existing.length === 0) {
        await db.insert(settings).values(setting);
        console.log(`Setting '${setting.key}' created.`);
      } else {
        console.log(`Setting '${setting.key}' already exists.`);
      }
    }

    // 2b. Seed Public Website starter content and navigation.
    let homePageUuid: string;
    const existingHome = await db.select().from(contents).where(eq(contents.slug, 'home')).limit(1);
    if (existingHome.length === 0) {
      homePageUuid = crypto.randomUUID();
      await db.insert(contents).values({
        uuid: homePageUuid,
        title: 'Home',
        slug: 'home',
        type: 'page',
        status: 'published',
        authorId: null,
        excerpt: 'Welcome to a plugin-first ModernCMS website.',
        body: '<p>This page is rendered by the Public Website Ecosystem using Content Engine data, active theme templates, navigation, settings, and media resolution.</p>',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Published starter content 'home' created with UUID ${homePageUuid}.`);
    } else {
      homePageUuid = existingHome[0].uuid;
      console.log("Starter content 'home' already exists.");
    }

    // Seed homepage settings based on the generated UUID
    const existingTarget = await db.select().from(settings).where(eq(settings.key, 'site.homepage_target')).limit(1);
    if (existingTarget.length === 0) {
      await db.insert(settings).values({
        key: 'site.homepage_target',
        value: homePageUuid,
        description: 'Active homepage content UUID',
        group: 'site',
        type: 'string',
        isPublic: true,
      });
      console.log(`Setting 'site.homepage_target' created with value ${homePageUuid}.`);
    } else {
      console.log("Setting 'site.homepage_target' already exists.");
    }

    const existingMode = await db.select().from(settings).where(eq(settings.key, 'site.homepage_mode')).limit(1);
    if (existingMode.length === 0) {
      await db.insert(settings).values({
        key: 'site.homepage_mode',
        value: 'single',
        description: 'Homepage rendering mode (single page or collection list)',
        group: 'site',
        type: 'string',
        isPublic: true,
      });
      console.log("Setting 'site.homepage_mode' created.");
    } else {
      console.log("Setting 'site.homepage_mode' already exists.");
    }

    const existingPostsTarget = await db.select().from(settings).where(eq(settings.key, 'site.posts_page_target')).limit(1);
    if (existingPostsTarget.length === 0) {
      await db.insert(settings).values({
        key: 'site.posts_page_target',
        value: '',
        description: 'Active posts page content UUID when homepage displays a static page',
        group: 'site',
        type: 'string',
        isPublic: true,
      });
      console.log("Setting 'site.posts_page_target' created.");
    } else {
      console.log("Setting 'site.posts_page_target' already exists.");
    }

    const existingPostsPerPage = await db.select().from(settings).where(eq(settings.key, 'site.posts_per_page')).limit(1);
    if (existingPostsPerPage.length === 0) {
      await db.insert(settings).values({
        key: 'site.posts_per_page',
        value: '10',
        description: 'Number of posts to display per page on collection list',
        group: 'site',
        type: 'string',
        isPublic: true,
      });
      console.log("Setting 'site.posts_per_page' created.");
    } else {
      console.log("Setting 'site.posts_per_page' already exists.");
    }
    const existingPermalink = await db.select().from(settings).where(eq(settings.key, 'site.permalink_structure')).limit(1);
    if (existingPermalink.length === 0) {
      await db.insert(settings).values({
        key: 'site.permalink_structure',
        value: '/posts/%postname%/',
        description: 'Permalink structure for articles/posts',
        group: 'site',
        type: 'string',
        isPublic: true,
      });
      console.log("Setting 'site.permalink_structure' created.");
    } else {
      console.log("Setting 'site.permalink_structure' already exists.");
    }



    const defaultNavigation = [
      { label: 'Home', url: '/', location: 'primary', sortOrder: 0 },
      { label: 'Search', url: '/search', location: 'primary', sortOrder: 10 },
      { label: 'Home', url: '/', location: 'footer', sortOrder: 0 },
    ];

    for (const item of defaultNavigation) {
      const existing = await db
        .select()
        .from(navigationItems)
        .where(eq(navigationItems.url, item.url))
        .limit(20);

      if (existing.some((nav) => nav.location === item.location && nav.label === item.label)) {
        console.log(`Navigation '${item.location}:${item.label}' already exists.`);
        continue;
      }

      await db.insert(navigationItems).values({
        ...item,
        target: '_self',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Navigation '${item.location}:${item.label}' created.`);
    }

    // 3. Seed Default Admin User (Idempotent)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@moderncms.local';
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';

    // Check if the admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, adminUsername)).limit(1);
    const existingAdminEmail = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

    if (existingAdmin.length === 0 && existingAdminEmail.length === 0) {
      console.log('Admin user not found. Bootstrapping admin user...');
      const passwordHash = bcrypt.hashSync(adminPassword, 10);

      const [userResult] = await db.insert(users).values({
        username: adminUsername,
        email: adminEmail,
        passwordHash: passwordHash,
        status: 'active',
      });

      const adminUserId = (userResult as any).insertId;
      console.log(`Admin user created with ID ${adminUserId}.`);

      // Assign Admin role to the newly created user
      const adminRoleId = rolesMap['Admin'];
      if (adminRoleId) {
        await db.insert(userRoles).values({
          userId: adminUserId,
          roleId: adminRoleId,
        });
        console.log(`Role 'Admin' assigned to user ID ${adminUserId}.`);
      } else {
        console.error("Could not find 'Admin' role ID. Skipping role assignment.");
      }
    } else {
      console.log('Admin user already exists. Skipping admin user seed.');
    }

    // 4. Seed Plugins (Idempotent)
    const defaultPlugins = [
      {
        key: 'media-library',
        name: 'Media Library',
        version: '1.0.0',
        type: 'first-party-plugin',
        status: 'ACTIVE',
        description: 'First-party Media Library plugin providing explorer, management, and media upload features.',
        installedAt: new Date(),
        activatedAt: new Date(),
      },
      {
        key: 'contact-form',
        name: 'Contact Form',
        version: '1.0.0',
        type: 'first-party-plugin',
        status: 'DISCOVERED',
        description: 'Enables creation of customizable contact forms and lead capture.',
        installedAt: new Date(),
      },
      {
        key: 'gallery',
        name: 'Gallery',
        version: '1.0.0',
        type: 'first-party-plugin',
        status: 'DISCOVERED',
        description: 'Displays beautiful responsive image galleries on pages and posts.',
        installedAt: new Date(),
      },
      {
        key: 'seo-basic',
        name: 'Basic SEO',
        version: '1.0.0',
        type: 'first-party-plugin',
        status: 'DISCOVERED',
        description: 'Provides basic metadata and sitemap generation features.',
        installedAt: new Date(),
      },
    ];

    for (const plugin of defaultPlugins) {
      const existing = await db.select().from(plugins).where(eq(plugins.key, plugin.key)).limit(1);
      if (existing.length === 0) {
        await db.insert(plugins).values(plugin);
        console.log(`Plugin '${plugin.key}' seeded.`);
      } else {
        console.log(`Plugin '${plugin.key}' already exists in DB.`);
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
