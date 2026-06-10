# Known Issues: ModernCMS

This document catalogs open bugs, technical debt, incomplete migrations, and validation gaps within the ModernCMS project.

---

## 1. Issue: Core packages are stubbed/empty
* **Impact**: Subsystems like Permissions, Content, Plugin Lifecycle, and Themes do not expose production business logic; their index files are basic class declarations or simple consoles.
* **Root Cause**: Phase 1 monorepo setup initialized the project folders but core logic is still handled directly in Fastify route endpoints instead of being imported from `@modern-cms/core`.
* **Suggested Fix**: Refactor current controller routes, auth hooks, and site render engines to use unified logic structures defined and compiled inside `packages/core`.

---

## 2. Issue: Hardcoded Conversation ID in Playwright Test Script
* **Impact**: Running the editor test suite (`node test-editor.js`) fails with directory errors if the folder is checked out on a clean machine without the exact system conversation ID path.
* **Root Cause**: Line 7 of `test-editor.js` hardcodes the `artifactsDir` string value:
  `const artifactsDir = 'C:\\Users\\gaze\\.gemini\\antigravity\\brain\\c8c84ac6-7ee2-499d-a93a-025ce4ed3b06';`
* **Suggested Fix**: Modify the script to read the artifact output path from an environment variable (e.g. `process.env.ARTIFACTS_DIR`) or make it resolve relative to the current workspace root.

---

## 3. Issue: Skeleton Plugins without Logic or Views
* **Impact**: Seeding plugins installs `contact-form`, `gallery`, and `seo-basic` plugin records, but activating them results in silent warnings or failures since they contain only `plugin.json` configurations and empty folders.
* **Root Cause**: They are placeholder templates intended for Phase 4 validation.
* **Suggested Fix**: Implement core logic and view registrations inside the corresponding plugin directories once the Hook Engine is online.

---

## 4. Architectural Violations (VERIFIED)
The following verified architectural gaps are tracked in [VIOLATIONS.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/VIOLATIONS.md):
* **V-001**: Centered database migrations inside `apps/api` instead of plugin directories.
* **V-002**: Media settings naming keys bypass `scope.key` dot notation.
* **V-003**: Settings queries bypass unified SDK APIs in favor of direct SQL queries.
* **V-004**: Lack of central Event Bus to trigger upload/publish notifications.
* **V-005**: Permissions check bypasses database mapping tables.
* **V-006**: Media Library route namespace bypasses `/api/{plugin-id}/*` prefix format.
