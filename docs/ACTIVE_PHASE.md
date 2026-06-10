# Active Phase: Phase 4 — Hook-Based Plugin System

This document locks the scope of the active development phase. Every assertion is validated against the repository state.

---

## 1. Current Phase Details

### Statement 1.1: The active phase is Phase 4: Hook-Based Plugin System
* **Classification**: `VERIFIED`
* **File Path**: [docs/ROADMAP.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ROADMAP.md#L45-L55)
* **Evidence**: Roadmap marks Phase 4 as "Hook-Based Plugin System".
* **Reason**: Confirms alignment with the master project schedule.

### Statement 1.2: The phase goal is establishing hooks runtime infrastructure (Actions & Filters)
* **Classification**: `VERIFIED`
* **File Path**: [docs/ROADMAP.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ROADMAP.md#L47-L51)
* **Evidence**: Roadmap details Hook Manager creation and hook insertions inside core routes.
* **Reason**: Defines the main milestone parameters for the current development phase.

---

## 2. Allowed Work

### Statement 2.1: Defining Hook contracts, registry types, and interfaces
* **Classification**: `VERIFIED`
* **File Path**: [packages/plugin-sdk/src/index.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/packages/plugin-sdk/src/index.ts)
* **Evidence**: Plugin SDK acts as the official registry contract interface.
* **Reason**: Necessary to establish type safety for plugin hooks.

### Statement 2.2: Creating HooksManager classes
* **Classification**: `VERIFIED`
* **File Path**: [packages/core/src/plugin/index.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/packages/core/src/plugin/index.ts)
* **Evidence**: The core contains the stubbed `PluginKernel` which is the designated class for lifecycle management.
* **Reason**: Required to host registered hooks inside the Core framework package.

### Statement 2.3: Injecting hook-triggering placeholders inside API routes
* **Classification**: `VERIFIED`
* **File Path**: [apps/api/src/app.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/apps/api/src/app.ts#L74-L122)
* **Evidence**: Dynamic plugin loader handles the integration check loops.
* **Reason**: Core routes must execute hooks before saving or rendering views.

### Statement 2.4: Resolving path parameters for active plugins dynamically
* **Classification**: `VERIFIED`
* **File Path**: [apps/api/src/app.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/apps/api/src/app.ts#L77-L95)
* **Evidence**: Core routes check `plugins` table status and locate manifests inside `plugins/`.
* **Reason**: Core must load active plugin endpoints on boot.

---

## 3. Forbidden Work

### Statement 3.1: Database schema table modifications are forbidden
* **Classification**: `VERIFIED`
* **File Path**: [docs/DEVELOPMENT_RULES.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/DEVELOPMENT_RULES.md#L7-L23)
* **Evidence**: Boundaries restrict changes to Core structures during Phase 1/Phase 4 stabilization.
* **Reason**: Schema drifts during active phases create schema mismatches.

### Statement 3.2: Adding heavy backend services (Docker/Redis) is forbidden
* **Classification**: `VERIFIED`
* **File Path**: [docs/DEVELOPMENT_RULES.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/DEVELOPMENT_RULES.md#L19-L23)
* **Evidence**: Core requires standard Node.js and local MySQL setup without heavy services.
* **Reason**: Ensures simple local installation dependencies.

### Statement 3.3: Version control operations (git stage, commit, push) are forbidden
* **Classification**: `VERIFIED`
* **File Path**: [docs/DEVELOPMENT_RULES.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/DEVELOPMENT_RULES.md#L37-L49)
* **Evidence**: Caution rules strictly prohibit AI assistants from modifying version control.
* **Reason**: Maintains human review integrity over changes.

### Statement 3.4: Writing Theme Engine layout parsers is forbidden
* **Classification**: `VERIFIED`
* **File Path**: [docs/ROADMAP.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ROADMAP.md#L41)
* **Evidence**: Public theme rendering is part of Phase 3, but the generic theme hook integrations are scheduled in later hook phases.
* **Reason**: Isolates development task focus.

---

## 4. Exit Criteria

### Statement 4.1: Workspace projects compile cleanly
* **Classification**: `VERIFIED`
* **File Path**: [package.json](file:///c:/Users/gaze/Documents/cobacoba/CMSC/package.json#L8)
* **Evidence**: Monorepo pnpm build scripts compile all packages cleanly.
* **Reason**: Ensures no compile-time errors block downstream tasks.

### Statement 4.2: Server registers active plugins dynamically on startup
* **Classification**: `VERIFIED`
* **File Path**: [apps/api/src/app.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/apps/api/src/app.ts#L84-L122)
* **Evidence**: Core boot parses status field from Drizzle schemas and imports entry files.
* **Reason**: Verification check for plugin runtime loading.

### Statement 4.3: Hook registries allow dynamic sync/async callback executions
* **Classification**: `POTENTIAL`
* **File Path**: [packages/core/src/plugin/index.ts](file:///c:/Users/gaze/Documents/cobacoba/CMSC/packages/core/src/plugin/index.ts)
* **Evidence**: Backend class is still a skeleton. Dynamic trigger tests have not been executed.
* **Reason**: Execution logic is pending setup.
