# Architecture Lock Index

This document maps all 16 architecture lock files in the repository. Priorities determine which rules override others in case of conflict during implementation.

---

## Priority 1: Strategic Direction & Boundaries
These documents define the core identity of ModernCMS and are the absolute source of truth.

1. [PRODUCT_VISION_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/PRODUCT_VISION_LOCK_V1.md)
   * *Status*: VERIFIED LOCKED
   * *Scope*: Core platform philosophy; dictates that the Core remains minimal and business features exist solely in plugins.
2. [DOMAIN_BOUNDARY_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/DOMAIN_BOUNDARY_LOCK_V1.md)
   * *Status*: VERIFIED LOCKED
   * *Scope*: Strict partition boundaries between Core Platform, Plugin Layer, and Application Layer.

---

## Priority 2: Extension Framework Contracts
These documents define the extension boundaries and import regulations that developers must conform to.

3. [PLUGIN_PLATFORM_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/PLUGIN_PLATFORM_LOCK_V1.md)
   * *Status*: VERIFIED LOCKED
   * *Scope*: Architectural requirements for dynamic plugin installation, activation, and removal states.
4. [PLUGIN_RUNTIME_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/PLUGIN_RUNTIME_LOCK_V1.md)
   * *Status*: VERIFIED LOCKED
   * *Scope*: Sandboxing, route registration, menu injection, and execution contracts.
5. [SDK_ARCHITECTURE_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/SDK_ARCHITECTURE_LOCK_V1.md)
   * *Status*: VERIFIED LOCKED
   * *Scope*: Official SDK boundaries. Bans direct internal imports between plugins and Core.

---

## Priority 3: Core Subsystems & Engines
These documents define the database, authorization, settings, and media handling layers.

6. [MEDIA_ASSET_PLATFORM_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/MEDIA_ASSET_PLATFORM_LOCK_V1.md)
   * *Status*: VERIFIED LOCKED
   * *Scope*: Media resource references using UUID, dynamic URL resolution, soft-deletes (Trash), and force-deletes.
7. [DATABASE_ARCHITECTURE_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/DATABASE_ARCHITECTURE_LOCK_V1.md)
   * *Status*: VERIFIED LOCKED
   * *Scope*: Database schemas, migration workflows, logical foreign key references, and tenant support.
8. [PLUGIN_DATABASE_OWNERSHIP_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/PLUGIN_DATABASE_OWNERSHIP_LOCK_V1.md)
   * *Status*: VERIFIED LOCKED
   * *Scope*: Partitioning rules for database tables; plugin ownership, migration isolation, and clean vs keep data uninstalls.
9. [API_ARCHITECTURE_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/API_ARCHITECTURE_LOCK_V1.md)
   * *Status*: VERIFIED LOCKED
   * *Scope*: API endpoint namespaces (`/api/{plugin-id}/*`), authorization hooks, and pagination standards.
10. [EVENT_SYSTEM_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/EVENT_SYSTEM_LOCK_V1.md)
    * *Status*: VERIFIED LOCKED
    * *Scope*: Synch/Async communication bus and naming schemas (`resource.action`).
11. [PERMISSION_SYSTEM_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/PERMISSION_SYSTEM_LOCK_V1.md)
    * *Status*: VERIFIED LOCKED
    * *Scope*: Roles, user mapping, authorization checkpoints, and permission namespaces.
12. [SETTINGS_SYSTEM_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/SETTINGS_SYSTEM_LOCK_V1.md)
    * *Status*: VERIFIED LOCKED
    * *Scope*: Unified configurations, namespace settings (`scope.key`), and API get/set wrappers.
13. [CONTENT_ENGINE_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/CONTENT_ENGINE_LOCK_V1.md)
    * *Status*: VERIFIED LOCKED
    * *Scope*: Universal content schema models, revision tracking, categories/tags taxonomy, and publishing state machines.
14. [ADMIN_PANEL_ARCHITECTURE_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ADMIN_PANEL_ARCHITECTURE_LOCK_V1.md)
    * *Status*: VERIFIED LOCKED
    * *Scope*: Shell application components: sidebar, topbar, plugin hosting layout, and notifications.

---

## Priority 4: Ecosystem & Extensions
These documents define visual styles, template loading, and remote package marketplaces.

15. [MARKETPLACE_ARCHITECTURE_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/MARKETPLACE_ARCHITECTURE_LOCK_V1.md)
    * *Status*: VERIFIED LOCKED
    * *Scope*: Online/Offline package installations, license checking, updates, and upgrade/downgrade rollbacks.
16. [THEME_SYSTEM_LOCK_V1.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/THEME_SYSTEM_LOCK_V1.md)
    * *Status*: VERIFIED LOCKED
    * *Scope*: Public visual rendering, design tokens, asset folders, and template decoupling.
