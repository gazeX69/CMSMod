# Architectural Violations Register

This document tracks all architectural violations and deviations discovered during the codebase audit.

---

## V-001: Centralized Migration Output Path
* **Lock Document**: [PLUGIN_DATABASE_OWNERSHIP_LOCK_V1](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/PLUGIN_DATABASE_OWNERSHIP_LOCK_V1.md) (Section 9)
* **Classification**: `VERIFIED`
* **File Path**: [apps/api/drizzle.config.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/apps/api/drizzle.config.ts#L15)
* **Evidence**: The migration files for the `media_files` table are output to `apps/api/drizzle/migrations/` instead of the plugin's migration folder.
* **Reason**: Core lacks a Plugin Migration Engine to dynamically compile and execute migrations at runtime installation.
* **Severity**: Medium
* **Resolution Phase**: Plugin Migration Engine phase.

---

## V-002: Settings Key Naming Standard
* **Lock Document**: [SETTINGS_SYSTEM_LOCK_V1](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/SETTINGS_SYSTEM_LOCK_V1.md) (Section 11)
* **Classification**: `VERIFIED`
* **File Path**: [plugins/media-library/server/routes.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/plugins/media-library/server/routes.ts#L242-L246)
* **Evidence**: Configuration keys are registered in DB as `media_max_upload_size_mb` instead of dot namespace notation (e.g. `media.max_upload_size`).
* **Reason**: Media Library plugin was written using snake_case setting keys before the dot-notation standard was finalized in Settings Lock.
* **Severity**: Low
* **Resolution Phase**: Active Phase 4.

---

## V-003: Core Settings Database Queries Bypass
* **Lock Document**: [SETTINGS_SYSTEM_LOCK_V1](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/SETTINGS_SYSTEM_LOCK_V1.md) (Section 10)
* **Classification**: `VERIFIED`
* **File Path**: [plugins/media-library/server/routes.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/plugins/media-library/server/routes.ts#L182-L209)
* **Evidence**: SQL helper queries are used directly on the core settings table: `db.select().from(settingsTable)...` in helper function `getSetting`.
* **Reason**: The SDK lacks a unified `settings.get` / `settings.set` API wrapper for plugins to utilize.
* **Severity**: Medium
* **Resolution Phase**: Active Phase 4.

---

## V-004: Lack of Centered Event System
* **Lock Document**: [EVENT_SYSTEM_LOCK_V1](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/EVENT_SYSTEM_LOCK_V1.md) (Section 23)
* **Classification**: `VERIFIED`
* **File Path**: [apps/api/src/app.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/apps/api/src/app.ts)
* **Evidence**: There is no Event Bus or registry class configured on startup or exposed in the SDK packages.
* **Reason**: The Event System Integration milestone is scheduled for after Phase 4 Hooks.
* **Severity**: High
* **Resolution Phase**: Event System Integration phase.

---

## V-005: Permissions Database Layout & Engine
* **Lock Document**: [PERMISSION_SYSTEM_LOCK_V1](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/PERMISSION_SYSTEM_LOCK_V1.md) (Section 4)
* **Classification**: `POTENTIAL`
* **File Path**: [apps/api/src/database/schema.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/apps/api/src/database/schema.ts)
* **Evidence**: Database contains `roles` and `user_roles` tables, but lacks `permissions` and `role_permissions` schema maps. Route protection relies on role name check hooks.
* **Reason**: Granular permissions engine is deferred to later phases.
* **Severity**: Medium
* **Resolution Phase**: Permission Engine setup phase.

---

## V-006: Media Library API Namespace prefix
* **Lock Document**: [API_ARCHITECTURE_LOCK_V1](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/API_ARCHITECTURE_LOCK_V1.md) (Section 9)
* **Classification**: `POTENTIAL`
* **File Path**: [plugins/media-library/server/routes.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/plugins/media-library/server/routes.ts)
* **Evidence**: Media Library endpoints expose `/api/admin/media/*` instead of `/api/media/*` prefix format.
* **Reason**: Namespace alignment is deferred to Phase 4 API normalization.
* **Severity**: Low
* **Resolution Phase**: Active Phase 4 API normalization.
