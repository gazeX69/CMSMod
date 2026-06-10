# Current Status: ModernCMS

This document defines the exact development status of components and subsystems within ModernCMS.

---

## 1. COMPLETED (VERIFIED)

### Core Infrastructure
* **Monorepo setup**: `pnpm` workspace mapping apps, packages, plugins, and themes.
* **Shared modules**: `@modern-cms/shared` compiled and integrated.
* **TypeScript compilation**: All packages compile successfully using standard config compiler rules.
* **Environment Configuration**: Config parsing via `.env` file for database connections, ports, and admin setup.

### Database Layer
* **Drizzle ORM & MariaDB/MySQL Client**: Fully functional client configuration and generation.
* **Database migrations**: Migration executor script implemented.
* **Seeder script**: Idempotent db:seed script for roles, site settings, default admin user, and plugin records.

### Authentication & RBAC
* **Session Cookie Authentication**: Secured `/api/admin/*` backend handlers.
* **Access Control**: Database models for roles/userRoles. Frontend UI checks authenticated user context.
* **Auth views**: Custom Login page, profile dropdowns, and route syncing.

### Content & Taxonomy Engine
* **REST API controllers**: CRUD endpoint handlers for pages, posts, categories, and tags.
* **Rich Text Editor**: TipTap editor integrated with title ribbon layout inside Admin article view.
* **Taxonomy UI**: Custom Categories and Tags managers built into Admin dashboard.

### Media Library Plugin (Asset Platform)
* **API Handlers**:
  * Safe upload with MIME limits and blocklists (`POST /api/admin/media/upload`).
  * Dynamic path resolution handler (`GET /api/media/resolve/:uuid`).
  * Soft-delete Trash handlers and force-delete physical unlinks.
* **Thumbnail generator**: Image and video thumbnail rendering using `sharp` and `ffmpeg-static`.
* **Admin UI**: Grid explorer layout, upload drop-zones, metadata forms, and Trash settings.
* **Media Picker**: Modal popup allowing insertions of media objects using UUID tags.

---

## 2. IN PROGRESS (VERIFIED)

### Hook-Based Plugin System (Phase 4)
* **Dynamic route loading**: Startup routine loads active plugin routes from the database.
* **Hooks SDK**: Designing Action/Filter event listeners.

---

## 3. BLOCKED
* **None**. No blockers currently exist.

---

## 4. NOT STARTED (VERIFIED)

### Core Hook Interceptors
* Registering backend interception triggers in Core router handlers.
* Integrating front-end extension boundaries in layout viewports.

### Architectural Corrections (Resolving Violations)
* **V-001 (Plugin Migration Engine)**: Implementing dynamic SQL migrations execution from plugin subfolders to avoid centralized build compilation.
* **V-002 (Settings Key Renaming)**: Modifying Media Library keys from snake_case to dot namespace notation (e.g. `media.max_upload_size`).
* **V-003 (SDK Settings API)**: Transitioning raw SQL settings queries to SDK get/set methods.
* **V-004 (Event System)**: Developing a unified Sync/Async Event Bus.
* **V-005 (Permission Tables)**: Creating `permissions` and `role_permissions` schema mappings.

### Skeleton Plugins Completion
* Core features and hook bindings for `gallery`, `contact-form`, and `seo-basic`.

### Phase 5: Optimization & Production Launch
* Page cache handlers (`storage/cache/`) and rate limiting.
