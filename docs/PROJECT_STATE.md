# Project State: ModernCMS

This document provides a high-level summary of the project state, goals, architectural topology, development phases, and technical constraints of the ModernCMS ecosystem.

---

## 1. Current Project Goal
The primary objective of **ModernCMS** is to build a minimal, lightweight, modular, and extremely fast headless/template-driven Content Management System using a TypeScript monorepo managed with `pnpm` workspaces. It is designed to prioritize a **Platform-First, Plugin-First, Domain-Driven** architecture where the core platform acts strictly as an infrastructure provider, leaving business features to pluggable extension domains.

---

## 2. Current Architecture Summary
ModernCMS is structured as a pnpm monorepo consisting of:
* **`apps/api/`**: Fastify backend providing Core Platform services:
  * Authentication & Session management (secure cookie-based).
  * Authorization, Users, Roles, and Permission rules (RBAC).
  * Settings Engine & Core Page/Post Taxonomy CRUD.
  * Public Site Rendering & Route resolution.
  * Dynamic Plugin Discovery and Route registering mechanism.
* **`apps/admin/`**: React + Vite frontend dashboard using Custom Vanilla CSS for UI.
* **`packages/core/`**: Central package stub for business logic domain services (Content, Permissions, Plugin lifecycle, and Themes).
* **`packages/plugin-sdk/`**: Type definitions, manifests, and UI contracts representing the plugin architecture interface.
* **`packages/shared/`**: Common types, schemas, and validators shared across both backend and frontend.
* **`plugins/`**: Modular extension packages. Implemented features:
  * **`media-library`**: A fully featured Asset Platform. Implements UUID-based asset reference matching, secure multipart file uploading, automatic alt-text/caption fields, image/video thumbnail generation (using `sharp` and `ffmpeg-static`), soft-deletion with Trash management, and permanent force-deletion disk unlinking.
  * **`seo-basic`**, **`contact-form`**, **`gallery`**: Inactive placeholder skeletons.
* **`themes/`**: Layout designs (e.g., `themes/default`) consumed by the Theme rendering engine.
* **`storage/`**: Local cache, media uploads (`storage/media`), logs, and database files.

---

## 3. Current Completed Phases
* **Phase 1: Core Framework Setup**:
  * pnpm monorepo structure configured.
  * Shared types (`@modern-cms/shared`) established.
  * Fastify API backend with basic health check and CORS.
  * React/Vite Admin Dashboard panel displaying real-time metrics.
* **Phase 2: Database Layer & Authentication**:
  * Drizzle ORM integration targeting MySQL/MariaDB database schemas.
  * Database schema definitions (users, roles, sessions, contents, content_revisions, taxonomy, settings, plugins).
  * JWT-less session cookie authentication and bcrypt password hashing.
  * Role-Based Access Control (RBAC) levels (Admin, Editor, Author, Subscriber).
  * Login, User Profile, and Auth state synchronization in React Admin.
* **Phase 3: Content Engine & Dynamic Rendering**:
  * REST API routes for Pages, Posts, Categories, and Tags CRUD.
  * React Admin forms and manager panels for Articles, Categories, and Tags.
  * TipTap-based rich text editor integration in Admin panel supporting insertion of image assets from the Media Library.
  * Dynamic Plugin system (active plugin routes are dynamically registered on Fastify startup).
  * Media Library Plugin integration supporting UUID resolutions, file uploads, thumbnail generation, trash soft-delete/restore system, and clean permanent force-delete execution.

---

## 4. Current Active Phase
* **Phase 4: Hook-Based Plugin System**:
  * **Status**: In progress. Dynamic loader reads DB status and registers plugin routes.
  * **Next target**: Implement the core Hooks Manager (Actions and Filters) to allow third-party plugins to intercept, manipulate data arrays, and alter system pipelines.
  * *Active Phase Controller*: [ACTIVE_PHASE.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ACTIVE_PHASE.md)

---

## 5. Deferred Phases
* **Phase 5: Optimization & Production Launch**:
  * Static HTML caching inside `storage/cache/` and invalidation policies.
  * Production hardening (caching headers, rate limiting, request validation schemas).
  * Production Node.js deployment workflows and documentation.
  * *Deferred Phase Tracker*: [DEFERRED_PHASES.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/DEFERRED_PHASES.md)

---

## 6. Continuity & Compliance Indexes
To maintain architecture compliance and handoff integrity, see the following:
* *Lock Index by Priority*: [LOCK_INDEX.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/LOCK_INDEX.md)
* *Compliance Audit log*: [ARCHITECTURE_COMPLIANCE.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/ARCHITECTURE_COMPLIANCE.md)
* *Discovered Violations*: [VIOLATIONS.md](file:///c:/Users/gaze/Documents/cobacoba/CMSC/docs/VIOLATIONS.md)

---

## 7. Important Constraints
* **Simple Dependency Footprint**: Strictly forbidden to use heavy services (Docker, Redis, PostgreSQL, RabbitMQ, Elasticsearch). Keep dependencies compatible with a basic local Node.js + MySQL/MariaDB database (e.g. standard local dev tools).
* **Strict TypeScript**: TypeScript `"strict": true` compilation.
* **Complete Relative Imports**: Relative paths must specify extension suffix (e.g. `import { db } from './client.js'`).
* **Vanilla CSS Style**: Tailwind CSS or utility-first frameworks are disallowed unless explicitly requested. Custom layout must rely on Vanilla CSS.
* **Version Control Boundaries**: AI Coding Assistants are strictly prohibited from staging (`git add`), committing (`git commit`), pushing (`git push`), checking out (`git checkout`), cleaning (`git clean`), or resetting (`git reset`). Version control must be operated manually by human engineers.
