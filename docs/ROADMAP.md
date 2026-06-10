# Modern CMS Project Roadmap

This roadmap details the planned development sequence for Modern CMS, moving from foundational setup to production-readiness.

---

## Phase 1: Core Framework Setup (Current)

Establish the monorepo foundation, basic communication channels, and coding frameworks.

- [x] Configure pnpm workspaces structure (`apps/*`, `packages/*`, `plugins/*`, `themes/*`).
- [x] Establish shared type definitions package (`@modern-cms/shared`).
- [x] Create a Fastify API backend with basic health check and CORS setup.
- [x] Design a React/Vite Admin Dashboard displaying real-time API health parameters.
- [x] Write architectural layout guidelines and developer constraints.
- [x] Define placeholders for standard plugins (`seo-basic`, `contact-form`, `gallery`).

---

## Phase 2: Database Layer & Authentication

Establish persistent storage, ORM integration, and access controls.

- [ ] Integrate **Drizzle ORM** pointing to local MySQL/MariaDB database.
- [ ] Write user, session, content (posts/pages), settings, and media schema definitions.
- [ ] Implement database migrations runner scripts (`pnpm db:generate`, `pnpm db:migrate`).
- [ ] Implement **JWT Authentication** and password hashing (bcrypt) inside the Fastify API.
- [ ] Establish Role-Based Access Control (RBAC) levels: `administrator`, `editor`, `author`, `subscriber`.
- [ ] Build Login and User Profile forms in the React Admin panel.

---

## Phase 3: Content Engine & Dynamic Rendering

Develop the content creation workflow and public site generation.

- [ ] Build content editor panel inside the Admin app (supporting Markdown/HTML).
- [ ] Implement CRUD REST routes for posts, pages, and metadata.
- [ ] Create **Media Uploader** that processes multipart files and saves to `storage/media/` with thumbnail generation.
- [ ] Implement public page router on the backend resolving paths dynamically from slugs.
- [ ] Write theme parser that reads templates from the active theme (e.g. `themes/default`) and injects dynamic content.

---

## Phase 4: Hook-Based Plugin System

Unlock extension support by implementing the plugin kernel lifecycle.

- [ ] Create a plugin manifest parser that reads `plugin.json` configurations.
- [ ] Design the **Hooks Manager** supporting Actions (altering flows) and Filters (modifying data arrays).
- [ ] Create hooks inside core routes (e.g., `content:before_save`, `render:head`, `admin:sidebar_menu`).
- [ ] Implement dynamic plugin loading, activation, and deactivation states.
- [ ] Add basic hooks in `plugins/seo-basic` to inject SEO meta tags into layout headers.

---

## Phase 5: Optimization & Production Launch

Add caching layers, finalize documentation, and prepare deployment workflows.

- [ ] Write static HTML cache generator storing output inside `storage/cache/`.
- [ ] Implement cache invalidation policies when content is updated.
- [ ] Secure production API settings (helmet, rate limiting, request validation schemas).
- [ ] Write deployment configurations for Node.js servers.
- [ ] Perform security reviews and database indexing checks.
