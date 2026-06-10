# Architecture Decisions: ModernCMS

This document records the architectural and design decisions chosen for the ModernCMS platform.

---

## 1. Decision: Monorepo Structure with pnpm Workspaces
* **Date**: 2026-05-30
* **Reason**: Decoupling the frontend admin interface, the Fastify backend service, common libraries, and dynamic developer plugins requires separate execution boundaries. A monorepo lets us maintain clean package dependencies while keeping all code in a single repository.
* **Alternatives Rejected**: 
  * *Separate repositories*: Storing apps and plugins in distinct repositories makes local testing, build validation, and contract updates between the API and plugins extremely slow and error-prone.

---

## 2. Decision: Media Asset Identification via UUID
* **Date**: 2026-05-31
* **Reason**: Mandated by `MEDIA_ASSET_PLATFORM_LOCK_V1` to build storage provider independence. Content references (e.g. within posts/articles) must never contain hardcoded physical file URLs, names, or paths (e.g., `/uploads/2026/05/logo.png`). Instead, saving the UUID (e.g. `550e8400-e29b-41d4-a716-446655440000`) allows the Media Resolver to build public URLs dynamically, enabling easy migrations between Local Disk, AWS S3, or Cloudflare R2 without breaking existing article links.
* **Alternatives Rejected**:
  * *Auto-incrementing integer IDs*: Does not protect privacy, leaks internal database numbers, and is fragile when migrating database states.
  * *Absolute physical URLs*: Breaking changes occur immediately if the site domain or media directory path is modified.

---

## 3. Decision: Secure Session Cookie Authentication
* **Date**: 2026-05-30
* **Reason**: Standard stateful session cookies secured with backend verification prevent common local storage security vulnerabilities associated with JWT tokens. It also enables the backend to easily revoke active user sessions directly.
* **Alternatives Rejected**:
  * *Stateless JWT stored in browser LocalStorage*: Vulnerable to Cross-Site Scripting (XSS) attacks.

---

## 4. Decision: Custom Vanilla CSS for Admin Dashboard
* **Date**: 2026-05-30
* **Reason**: Utility-first CSS frameworks like Tailwind CSS bloat compilation bundles and restrict third-party plugins from injecting custom styles easily. Custom Vanilla CSS modules give maximum flexbox/grid layout controls and ease integration of plugin layout bundles without global collision hazards.
* **Alternatives Rejected**:
  * *Tailwind CSS*: Adds package overhead and complicates modular dynamic loading of third-party plugin stylesheets.

---

## 5. Decision: Drizzle ORM + mysql2
* **Date**: 2026-05-30
* **Reason**: Drizzle is extremely lightweight, compiles directly with standard TypeScript types, operates close to raw SQL speed, and handles migration generation without a heavy client engine.
* **Alternatives Rejected**:
  * *Prisma*: Generates large client bundles and adds noticeable compilation overhead.
  * *TypeORM / Sequelize*: Heavyweight, verbose syntax, and slower performance profiles.
