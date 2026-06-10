# Development Rules

This document outlines the coding standards, repository guidelines, and release cycles for developers working on the Modern CMS project.

---

## 1. Product Boundaries & Scope

Modern CMS must start minimal. Prioritize the core CMS components before adding advanced infrastructure:

### Permitted Core Subsystems
- Content CRUD Management
- Custom Admin Dashboard Panel
- Dynamic Public Page Rendering
- Basic Local Media File Storage
- Simple template Theme Engine
- Hook-based plugin lifecycle foundations

### Strictly Forbidden in Phase 1
- **DO NOT** implement a plugin marketplace or cloud SaaS console.
- **DO NOT** introduce external heavy services: Docker, Redis, PostgreSQL, RabbitMQ/queue workers, or Elasticsearch.
- Maintain simple dependencies to run out-of-the-box with a standard Node.js installation and a local database (e.g. XAMPP MariaDB/MySQL).

---

## 2. Technology & Language Guidelines

- **Language**: TypeScript only. Use strict types (`"strict": true` must be enabled).
- **Web Backend**: Fastify. Use its plugin architecture to partition code modules.
- **Web Frontend**: React + Vite. Leverage Custom Vanilla CSS for components rather than bloating the system with external utility CSS frameworks.
- **Environment**: All configuration values must read from `.env` via process.env. Provide default fallbacks for convenience.
- **Imports**: When compiling with NodeNext module resolution, always specify complete paths (e.g., `import { foo } from './bar.js'`) including extensions.

---

## 3. Git Protocol for AI Agents

> [!CAUTION]
> AI Coding Assistants are strictly prohibited from staging, committing, or pushing code to version control.
> Do **NOT** run:
> - `git add`
> - `git commit`
> - `git push`
> - `git checkout`
> - `git clean`
> - `git reset`
>
> All Git actions must be performed manually by human engineers to ensure review integrity.

---

## 4. Testing & Validation Flow

Every feature increment must be validated using the following flow:
1. Compile the packages and check for compiler warnings/errors: `pnpm build`.
2. Start the API backend and verify endpoint accessibility: `pnpm dev:api`.
3. Start the Admin web app and check UI functionality: `pnpm dev:admin`.
4. Inspect request payloads in browser Developer Tools to verify CORS compliance and API contract integration.
