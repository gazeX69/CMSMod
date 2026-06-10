# Next Agent Handoff Prompt: ModernCMS Architecture & Continuity

You are taking over development of the **ModernCMS** monorepo workspace.

Before touching code or executing build/test commands, you MUST read the following continuity and architecture compliance records to avoid breaking core boundaries.

---

## 1. Mandatory Handoff Documents to Read First
1. [ACTIVE_PHASE.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ACTIVE_PHASE.md): Defines active development scope.
2. [LOCK_INDEX.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/LOCK_INDEX.md): Lists all 16 architecture locks by priority.
3. [ARCHITECTURE_COMPLIANCE.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ARCHITECTURE_COMPLIANCE.md): Audits compliance status across locks.
4. [VIOLATIONS.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/VIOLATIONS.md): Catalog of verified/potential violations.
5. [DEFERRED_PHASES.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/DEFERRED_PHASES.md): Features intentionally postponed to prevent scope drift.

---

## 2. Current Active Phase
* **Phase 4: Hook-Based Plugin System** (Milestone).
* **Allowed Work**: Stubbing hook registries, dynamic route registrations, dynamic loader configurations, and implementing SEO basic plugin placeholders.
* **Forbidden Work**: No database schema additions/removals; no marketplace UI; no dynamic theme engines; no version control commands (`git add`, `git commit`, `git push`, etc.).

---

## 3. Files Created / Modified in the Current Turn
The following continuity files were added under the `docs/` folder:
* [ACTIVE_PHASE.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ACTIVE_PHASE.md)
* [LOCK_INDEX.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/LOCK_INDEX.md)
* [ARCHITECTURE_COMPLIANCE.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ARCHITECTURE_COMPLIANCE.md)
* [VIOLATIONS.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/VIOLATIONS.md)
* [DEFERRED_PHASES.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/DEFERRED_PHASES.md)

The following files were updated to align with the new continuity framework:
* [PROJECT_STATE.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/PROJECT_STATE.md)
* [CURRENT_STATUS.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/CURRENT_STATUS.md)
* [KNOWN_ISSUES.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/KNOWN_ISSUES.md)

---

## 4. Key Architectural Violations to Remediate (VERIFIED)
* **V-001 (Centralized Migrations)**: Migrations are built under `apps/api/drizzle/migrations` instead of individual plugin folders.
* **V-002 (Settings Key Naming)**: Media Library settings keys are snake_case instead of dot notation (e.g. `media_max_upload_size_mb` vs `media.max_upload_size`).
* **V-003 (SQL Settings Queries)**: Media Library queries settings tables directly instead of using a unified SDK Settings API.
* **V-004 (Event System)**: The Core platform lacks a Sync/Async Event Bus.
* **V-005 (Granular Permissions)**: Custom permissions bypass database mapping tables.

---

## 5. Next Recommended Step
Begin building the Hooks Manager (Actions and Filters engine) inside `packages/core/src/plugin/hooks.ts` and export it in `@modern-cms/core` to resolve the core Hook System setup. Ensure that during settings hooks registration, you resolve the key naming formats (V-002) and wrap database setting transactions into a clean Settings SDK helper (V-003).

---

## 6. Constraints & What Must NOT Be Touched
* **Locked Architecture Docs**: Under no circumstances rewrite or modify any `_LOCK_V1.md` files in `docs/`.
* **Utility CSS**: Keep components styled using custom Vanilla CSS. Do not inject utility CSS systems like Tailwind CSS.
* **Git Restrictions**: Do NOT run version control commands. All git actions must be executed manually by human engineers.
* **Stream Rejections**: Rejection logic in uploads must drain active multipart streams using `data.file.resume()` to prevent client socket hangs.
