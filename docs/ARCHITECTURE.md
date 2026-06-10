# Modern CMS Architecture

This document describes the high-level architecture, directory layout, and design decisions of the Modern CMS.

---

## 1. System Overview

Modern CMS is a headless and template-driven Content Management System built using a **TypeScript** monorepo structure. It is designed to be lightweight, modular, and extremely fast, serving as a modern alternative to traditional systems.

### Core Technology Stack

- **Runtime**: Node.js (v20+)
- **Package Manager**: pnpm workspaces
- **Backend API**: Fastify (high performance web framework)
- **Frontend Admin**: React + Vite (Vanilla CSS custom UI)
- **Database (Default)**: MySQL/MariaDB (configured via Drizzle ORM)
- **Compilation**: Strict TypeScript

---

## 2. Directory Layout

The workspace is structured as a pnpm monorepo to maintain separate layers of concerns:

```
modern-cms/
├── apps/
│   ├── api/          # Fastify server providing core system capabilities
│   └── admin/        # React + Vite admin dashboard console
├── packages/
│   ├── core/         # Core business logic (content management, RBAC, theme loading)
│   ├── shared/       # Shared interfaces, validators, and types
│   └── sdk/          # Plugin and theme developer SDK definitions
├── plugins/          # Extension points (seo-basic, contact-form, gallery, etc.)
├── themes/           # Layouts and static assets (default)
├── storage/          # Local media, caching, log, and temp storage files
└── docs/             # Technical documentation and specifications
```

---

## 3. High-Level Component Interactions

As depicted in the application architecture, the system operates on two distinct pathways:

### Admin Console Pathway
1. **Admin/Editor** interacts with the **React + Vite Admin Panel** (running on port `5173`).
2. The Admin Panel fetches resources and sends administrative requests to the **Fastify CMS Core API** (running on port `4000`).
3. The API acts as the controller, coordinating with subsystems:
   - **Content Engine**: Manages posts, pages, and metadata.
   - **Auth + RBAC**: Handles authentication and role-based permissions.
   - **Settings Manager**: Accesses site configuration values.
   - **Media Manager**: Reads/writes file assets to **Local Storage** (`storage/media`).
4. Subsystems query the **MySQL / MariaDB** database to persist state.

### Visitor Render Pathway
1. **Public Visitor** requests a site route (e.g. `/artikel/contoh`).
2. The request hits the **Public Site Router** in the Fastify backend.
3. The server checks the **Page Cache** (`storage/cache`).
   - *Cache Hit*: Serves the cached HTML directly (instant delivery).
   - *Cache Miss*: Resolves the route by pulling content from the database.
4. **Theme Renderer** loads the active theme layout via the **Theme Manager** and parses HTML templates.
5. **Plugin Kernel** injects hooks, custom blocks, and shortcodes into the content block.
6. The HTML is rendered, saved to the **Page Cache**, and served to the user.

---

## 4. Extension Model

Modern CMS features a strict, decoupled system for extending layout and behavior:

### Theme System
Themes are purely template-based and static, located inside the `themes/` workspace.
- Configured by a `theme.json` file declaring the name, version, and page templates (`layout.html`, `home.html`, `page.html`, `post.html`).
- Themes do not run custom database migrations or backend logic; they are consumers of variables injected by the core rendering engine.

### Plugin Lifecycle
Plugins are modular packages located under the `plugins/` workspace. They go through a strict lifecycle:
1. **Install/Upload**: Plugin files are written to the workspace.
2. **Read Manifest**: The system validates the `plugin.json` manifest.
3. **Compatibility Check**: Compares semantic versioning compatibility against the running CMS core version.
4. **Permission Scope Audit**: Inspects what core services the plugin requests access to.
5. **Run Migrations**: The plugin executes database schema migrations if defined.
6. **Register hooks**: Plugs callbacks into API hooks, admin dashboard extension views, or custom public blocks.
7. **Activation**: Plugin is flagged active and loaded into memory at startup.
