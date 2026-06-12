# ModernCMS SEO Plugin Readiness Audit

Date: 2026-06-11

Status: AUDIT COMPLETE - IMPLEMENTATION NOT STARTED

Scope: Evaluate whether ModernCMS is ready for a complete SEO plugin inspired by the product scope of modern WordPress SEO suites such as Rank Math. This document does not authorize copying Rank Math code, branding, UI, or proprietary assets. It uses public feature concepts only as product reference.

## 1. Executive Summary

ModernCMS is ready to host the lifecycle, database, API, permissions, settings, events, and standalone admin dashboard of an SEO plugin. It is not yet ready to deliver a complete production SEO plugin without a small set of platform extension contracts.

Overall readiness: **61% - CONDITIONALLY READY**

The strongest areas are:

- Plugin discovery, installation, activation, and runtime loading.
- Plugin-owned SQL migrations and migration history.
- Plugin permissions and role integration.
- Namespaced settings through the platform Settings System.
- Backend plugin routes and admin plugin pages.
- Core content events for create, update, publish, and delete.
- Existing theme variables for title, description, and canonical URL.
- Existing editor registry concepts for inspector sections and sidebars.

The main blockers are:

1. The public site is client-rendered. Crawlers initially receive a generic Vite HTML shell, not the rendered page and its SEO metadata.
2. Plugins cannot contribute structured SEO data to the public render pipeline through an official SDK contract.
3. Plugins cannot inject safe, structured tags into the document head.
4. Per-content plugin metadata has no official Content Metadata SDK or editor save contract.
5. The Admin plugin registry remains statically imported, and editor integrations are not exposed through the public Plugin SDK.
6. Public root routes such as `/sitemap.xml`, `/robots.txt`, and redirect interception are not owned by a generic extension registry.

Conclusion: development may begin after implementing the Phase 0 platform contracts defined in this report. Building the full SEO plugin before those contracts would force direct Core imports, Core edits containing SEO business logic, or fragile theme-specific replacements. Those approaches violate the locked architecture.

## 2. Audit Method

The audit covered:

- Locked architecture documents.
- Plugin scanner, validator, lifecycle, runtime loader, and event bus.
- Plugin database migration and uninstall behavior.
- Settings and permission systems.
- Content schema and CRUD events.
- Admin plugin registry and editor registry.
- Public content rendering and public SPA behavior.
- Theme templates and theme context.
- Existing `seo-basic` skeleton.
- Production builds for API, Admin, Public, and Plugin SDK.
- Public feature references from Rank Math documentation.

Build verification on 2026-06-11:

| Component | Result |
|---|---|
| `@modern-cms/api` | PASS |
| `@modern-cms/admin` | PASS |
| `@modern-cms/public` | PASS |
| `@modern-cms/plugin-sdk` | PASS |

The Admin build reports a large JavaScript chunk warning, but it does not block SEO development.

## 3. Intended SEO Plugin Scope

The proposed plugin should be a complete first-party SEO product, not only a title and sitemap helper.

### 3.1 Core Module

- Setup wizard.
- Global title and description templates.
- Per-content SEO title and meta description.
- Canonical URL controls.
- Robots directives.
- Search snippet preview.
- Social preview and Open Graph metadata.
- Twitter card metadata.
- SEO score and content analysis.
- Focus keywords.
- Indexability diagnostics.

### 3.2 Structured Data Module

- WebSite and Organization/Person schema.
- WebPage schema.
- Article and BlogPosting schema.
- BreadcrumbList schema.
- FAQ schema when content structure supports it.
- Custom JSON-LD with validation.
- Multiple schema graphs per content item.

### 3.3 Discovery Module

- XML sitemap index.
- Content sitemap.
- Taxonomy sitemap when public taxonomy routes exist.
- Image sitemap fields.
- Configurable exclusions.
- `robots.txt` management.
- Optional `llms.txt` support as a later module.

### 3.4 Redirect and Monitoring Module

- 301, 302, 307, 308, and 410 rules.
- Exact, prefix, and regex matching with safety controls.
- Redirect loop detection.
- 404 logging and aggregation.
- Automatic redirect suggestion after slug changes.
- Import and export.

### 3.5 Administration Module

- SEO overview dashboard.
- Content audit list.
- Bulk metadata and robots editing.
- Sitemap and indexability diagnostics.
- Redirect manager.
- 404 monitor.
- Settings import/export.
- Role-specific permissions.

External search analytics, keyword rank tracking, and AI-generated content are intentionally excluded from the first release. They require third-party credentials, scheduled jobs, encrypted secrets, and a mature worker/queue runtime.

## 4. Readiness Matrix

| Area | Readiness | Finding |
|---|---:|---|
| Plugin discovery and manifest | 90% | Suitable after replacing the obsolete `seo-basic` manifest. |
| Install and activation lifecycle | 80% | Runtime can load on activation; deactivation guards routes by status. |
| Plugin database ownership | 85% | Plugin SQL migrations and migration history are available. |
| Clean uninstall | 45% | Metadata cleanup exists, but plugin table rollback/drop is not implemented by lifecycle Core. |
| Settings | 90% | Namespaced settings and runtime Settings SDK are suitable. |
| Permissions | 90% | Plugin permissions are registered and enforced server-side. |
| Events | 70% | Content lifecycle events exist; payloads need UUID, slug, old slug, and transition data. |
| Plugin API | 85% | Namespaced Fastify routes are ready. |
| Standalone Admin UI | 80% | Plugin page contract works, but registration is statically imported. |
| Editor SEO panel | 40% | Editor registries exist but are private Admin internals and save payload extension is absent. |
| Per-content metadata | 25% | Core model returns `metadata: {}` but has no metadata persistence contract. |
| Public SEO context | 35% | Core creates basic title, description, canonical, and robots values only. |
| Head tag extension | 15% | No structured plugin head contribution contract exists. |
| Crawlable server HTML | 10% | Public frontend initially serves a generic SPA shell. |
| Sitemap endpoints | 60% | Plugin API can generate XML, but root public URL ownership/proxying must be defined. |
| Robots endpoint | 50% | Generation is easy; public root delivery and conflict ownership are undefined. |
| Redirect interception | 20% | No public request middleware/route interception SDK exists. |
| 404 monitoring | 40% | Error rendering exists, but no plugin event with request path/referrer/user-agent. |
| Schema JSON-LD | 20% | Data can be generated but cannot be safely inserted into initial page head. |
| Open Graph/Twitter | 20% | Theme has no generic social/head slot and SPA only updates description. |
| Analytics integrations | 20% | No encrypted secrets or background scheduler contract is ready. |

## 5. Detailed Findings

### 5.1 Plugin Platform

Status: **READY WITH LIMITATIONS**

The scanner supports manifest-defined backend entry, namespace, admin page, permissions, settings, events, storage, dependencies, and migrations. The lifecycle service handles discovery, installation, activation, inactivity, and uninstall state.

Runtime activation now accepts a Fastify instance and calls `loadPluginRuntime`, so an activated backend can be registered without a full API restart. This is more capable than the older project status documents indicate.

Limitations:

- Fastify routes cannot truly be removed after registration. Deactivation marks runtime state as unloaded, while route guards must reject inactive access.
- Admin modules are still imported in `apps/admin/src/plugins/registry.ts`.
- Full-clean uninstall deletes registration metadata and storage but does not execute plugin-owned rollback SQL.
- Migration checksum changes are stored but not compared against previously applied migration content.

SEO impact:

- Backend API and dashboard can be implemented normally.
- Every SEO route must use `sdk.requireActive`.
- The plugin should provide idempotent migrations.
- A clean uninstall migration strategy must be designed before release.

### 5.2 Database and Data Ownership

Status: **MOSTLY READY**

The SEO plugin should own tables similar to:

- `seo_content_meta`
- `seo_focus_keywords`
- `seo_schema_graphs`
- `seo_redirects`
- `seo_404_logs`
- `seo_audit_results`

References to Core content should use stable content UUID values, not foreign keys to Core tables. This follows the locked cross-plugin and shared-reference rules and prevents schema coupling.

Recommended content metadata key:

```text
content_uuid varchar(36)
```

Do not add SEO columns to `contents`. The SEO plugin owns SEO-specific data.

Database gaps:

- Clean uninstall cannot currently drop these tables through a formal rollback contract.
- There is no transaction around an entire multi-statement plugin migration.
- The migration SQL splitter is intentionally simple and may not handle stored routines or unusual SQL bodies.

These gaps do not block initial installation but must be documented and tested.

### 5.3 Content Engine

Status: **PARTIALLY READY**

Available content fields are sufficient for fallback analysis:

- UUID
- title
- slug
- type
- status
- excerpt
- body
- author
- published and updated timestamps
- categories and tags

Core emits:

- `content.created`
- `content.updated`
- `content.published` for the dedicated post publish endpoint
- `content.deleted`

Important gaps:

- Event payloads expose numeric `contentId`, but not `contentUuid`.
- Update events do not include previous slug, new slug, previous status, or changed fields.
- Page publishing through create/update does not emit a separate `content.published` transition event.
- The content model documents metadata support, but the implemented schema has no metadata storage.
- Plugin SDK has no Content API for fetching content by UUID.

SEO consequences:

- Redirect generation after slug changes cannot be reliable from events alone.
- Sitemap invalidation must query or be manually triggered.
- A plugin would currently need the injected Core database/schema object to resolve content IDs. That works technically but violates the intended SDK-only boundary.

Required correction:

Introduce a Content SDK with read-only content access and richer, versioned content event payloads.

### 5.4 Editor Integration

Status: **FOUNDATION EXISTS, PUBLIC CONTRACT MISSING**

The editor already provides registries for:

- Inspector sections.
- Sidebars.
- Toolbar items.
- Commands.
- Nodes and marks.
- Property panels.
- Insert sources.

The Article editor also has an SEO preview workspace, but it is currently a static preview based on title, slug, and excerpt.

The issue is architectural: the editor contracts live under `apps/admin/src/editor/*`, not `@modern-cms/plugin-sdk`. Media Library currently imports those private Admin paths, which is a known pattern violation rather than a contract that SEO should copy.

The editor save payload is fixed to title, slug, excerpt, body, status, categories, and tags. A plugin inspector component has no official way to:

- Read the current content UUID and draft state.
- Add SEO fields to autosave/publish.
- Run validation before publish.
- Save plugin-owned metadata after Core content creation.
- Receive the newly created content UUID atomically.

Required correction:

Expose an Editor Extension API through Plugin SDK with:

- `editor.inspector.register()`
- `editor.sidebar.register()`
- `editor.document.getContext()`
- `editor.document.onSaved()`
- `editor.document.registerSupplementalSave()`
- `editor.publish.registerCheck()`

The supplemental save should call the SEO plugin API using UUID after Core content is saved. Core content payloads must remain free from SEO-specific fields.

### 5.5 Public Rendering and Crawlability

Status: **CRITICAL BLOCKER**

The API renderer produces full theme HTML and already calculates:

- title
- description
- canonical URL
- robots value

Both bundled themes render title, description, and canonical tags.

However, `apps/public` is a React SPA. Its initial HTML is only:

```html
<title>ModernCMS Public</title>
<div id="root"></div>
```

The browser later fetches `/api/public/render`, injects the returned theme HTML into a React container, updates `document.title`, and updates only the description meta tag.

Consequences:

- The initial HTTP document does not contain page-specific title, description, canonical, robots, Open Graph, Twitter Card, or JSON-LD.
- The full theme document, including nested `<html>` and `<head>`, is inserted inside a body div, which is not valid document structure.
- Canonical tags included in injected theme HTML are not reliably treated as document-head canonical declarations.
- Social crawlers that do not execute the SPA will see generic metadata.
- Search engine rendering depends on JavaScript execution and delayed API availability.
- Sitemap quality alone cannot compensate for non-authoritative initial HTML.

Required correction options:

Option A, recommended: serve public routes through an SSR/BFF server that calls `renderPublicRoute()` and returns the resulting HTML as the actual HTTP document.

Option B: migrate public rendering into Fastify and use the Vite app only for development assets/navigation enhancement.

Option C: pre-render all published routes and regenerate on content events. This is viable for static deployments but less suitable for dynamic CMS behavior.

The SEO plugin must not attempt to solve this by manipulating DOM after load. Crawlability is a platform rendering responsibility.

### 5.6 Public Render Extension Contract

Status: **NOT READY**

`buildSeo()` is a private synchronous Core function. Plugins cannot override or enrich its output.

Required structured contract:

```ts
interface PublicDocumentContext {
  route: PublicRoute;
  site: SiteContext;
  content: PublicContent | null;
  seo: SeoDocument;
}

interface SeoDocument {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string[];
  links: Array<{ rel: string; href: string; hreflang?: string }>;
  meta: Array<{ name?: string; property?: string; content: string }>;
  jsonLd: unknown[];
}
```

Plugins should register contributors, not return arbitrary `<head>` HTML. Core must escape attributes, serialize JSON-LD safely, deduplicate tags, and retain final ownership of document output.

Suggested API:

```ts
publicRenderer.registerSeoContributor(pluginKey, contributor)
```

This avoids theme-specific string replacement and protects against malformed or unsafe head output.

### 5.7 Sitemap and Robots

Status: **BACKEND READY, DELIVERY CONTRACT INCOMPLETE**

The SEO plugin can query public content through a future Content SDK and generate XML. It can already expose plugin namespace routes such as:

- `/api/seo/sitemap.xml`
- `/api/seo/robots.txt`

For standard discovery, the public site should expose:

- `/sitemap.xml`
- `/sitemap-index.xml`
- `/robots.txt`

There is no root public route registry allowing a plugin to claim these paths. A platform-owned alias/proxy registry is required.

Suggested contract:

```ts
publicRoutes.register({
  owner: 'seo',
  path: '/sitemap.xml',
  handler
})
```

The registry must reject duplicate ownership and reserved paths.

### 5.8 Redirects and 404 Monitoring

Status: **NOT READY FOR COMPLETE IMPLEMENTATION**

A redirect engine must run before content route resolution. A plugin route under `/api/seo/*` cannot intercept an arbitrary public request such as `/old-url`.

Required platform capabilities:

- Pre-route public request interceptor.
- Redirect response contract.
- 404 event emitted after route resolution fails.
- Request path, query, referrer, user-agent classification, and timestamp.
- Loop prevention and maximum redirect chain safeguards.

Suggested events/contracts:

```text
public.route.resolving
public.route.not_found
public.document.rendering
public.document.rendered
```

Synchronous route interception must be explicitly marked mandatory. Ordinary event listeners currently use `Promise.all`; a failed listener can reject the producer, contrary to the desired failure-isolation rule.

### 5.9 Settings and Permissions

Status: **READY**

The plugin should declare namespaced settings such as:

- `seo.enabled`
- `seo.title_separator`
- `seo.default_title_template`
- `seo.default_description_template`
- `seo.default_robots`
- `seo.sitemap_enabled`
- `seo.redirects_enabled`
- `seo.404_monitor_enabled`
- `seo.organization_type`
- `seo.organization_name`
- `seo.default_social_image_uuid`

Recommended permissions:

- `seo.read`
- `seo.content.edit`
- `seo.settings.manage`
- `seo.schema.manage`
- `seo.redirects.manage`
- `seo.404.read`
- `seo.audit.run`
- `seo.import_export`

The current permission service can enforce these server-side.

Limitation: all plugin permissions are automatically assigned to the Admin role on registration. This is acceptable for the current product stage but role-manager UX is needed for advanced delegation.

### 5.10 Event System

Status: **USABLE BUT NEEDS HARDENING**

Strengths:

- Single platform event bus.
- Serializable envelope shape.
- Plugin source attribution.
- Listener unsubscribe function.

Gaps:

- No per-plugin listener ownership tracking.
- Deactivation clears runtime status but does not unregister only that plugin's listeners.
- `clearPluginRuntimeHandlers()` clears all listeners.
- `Promise.all` means one rejected listener rejects the full emit call.
- No event version field.
- No queue or scheduler for expensive audits and sitemap regeneration.

SEO should initially keep listeners lightweight and perform cache invalidation only. Full-site audits should be explicit admin actions until a worker runtime exists.

### 5.11 Media and Social Images

Status: **PARTIALLY READY**

Media assets use UUIDs and a public resolver, which suits Open Graph images and organization logos. Theme settings already include concepts for default social images.

Missing SDK capabilities:

- Resolve media metadata by UUID from a plugin.
- Validate dimensions and MIME type.
- Select media through a stable Plugin SDK component.

SEO metadata should store media UUID, not a physical path. The renderer should resolve the final absolute URL.

### 5.12 Theme Compatibility

Status: **PARTIALLY READY**

Both bundled themes use `seo.title`, `seo.description`, and `seo.canonicalUrl`, which is a useful baseline.

Themes should not be required to understand every SEO tag. Core should render a standard head collection independent of theme implementation.

Recommended theme contract:

```html
{{ document.head }}
```

or, preferably, have Core own the outer HTML document and let themes provide body/layout fragments. This avoids missing SEO support in third-party themes.

## 6. Rank Math Feature Comparison

Public Rank Math documentation demonstrates the expected product categories for a modern SEO suite:

- On-page SEO controls inside the content editor.
- SEO title, description, canonical, and robots controls.
- Open Graph and social previews.
- Schema markup.
- XML sitemaps.
- Redirects and 404 monitoring.
- Bulk metadata editing.
- Role-based feature access.
- Site SEO analysis.
- Import/export.
- Optional analytics integrations.

Reference pages:

- https://rankmath.com/wordpress/plugin/seo-suite/
- https://rankmath.com/kb/on-page-seo/
- https://rankmath.com/kb/advanced-tab/
- https://rankmath.com/kb/open-graph-meta-tags/
- https://rankmath.com/kb/editing-seo-meta-at-scale/
- https://rankmath.com/kb/import-export-settings/
- https://rankmath.com/kb/analytics/

ModernCMS should reproduce useful product capabilities using its own architecture and UI language. It should not reproduce Rank Math implementation details or proprietary presentation.

## 7. Required Phase 0 Platform Work

These changes are prerequisites for a complete and architecture-compliant SEO plugin.

### P0-1: Server-Rendered Public Documents

Return final rendered HTML as the initial public HTTP response.

Acceptance criteria:

- `curl` to a content URL contains its title and description.
- Canonical appears in the actual document head.
- JSON-LD appears in the actual document head or valid body location.
- The response status is correct without client JavaScript.
- Public navigation can remain progressively enhanced.

### P0-2: Public SEO Contributor Registry

Allow active plugins to contribute structured metadata to a public document.

Acceptance criteria:

- Contributors receive route, site, and content context.
- Output is structured and safely serialized by Core.
- Duplicate canonical, title, and robots declarations are resolved predictably.
- Failure in optional SEO contribution falls back to Core defaults.
- Inactive plugins cannot contribute.

### P0-3: Content SDK

Provide read-only plugin access to content data by UUID and list published content for sitemap generation.

Acceptance criteria:

- No plugin import from `apps/api/*`.
- Pagination and filters are supported.
- Public URL generation uses the platform permalink resolver.
- Taxonomy and author information can be requested without direct table access.

### P0-4: Rich Content Events

Version content events and include UUID and transition information.

Acceptance criteria:

- Create/update/publish/delete events include `contentUuid`.
- Update includes previous and current slug/status.
- Publish is emitted consistently for pages and articles.
- Payload remains serializable.

### P0-5: Editor Extension and Supplemental Save Contract

Expose editor integration through Plugin SDK.

Acceptance criteria:

- SEO can register a document inspector/sidebar.
- Component receives current title, slug, excerpt, body, status, and UUID.
- SEO metadata saves after Core content receives a UUID.
- Autosave does not create duplicate SEO rows.
- Publish checks may warn without hard-blocking unless configured.

### P0-6: Public Root Route and Interceptor Registry

Support sitemap, robots, redirects, and 404 monitoring.

Acceptance criteria:

- Plugins can claim approved root paths.
- Redirect interceptor executes before content resolution.
- Route ownership conflicts are rejected.
- 404 event includes normalized request information.

### P0-7: Event Listener Ownership and Failure Isolation

Track listener owner and unregister on deactivation.

Acceptance criteria:

- Deactivating SEO removes only SEO listeners.
- Optional listener failures are logged and isolated.
- Mandatory interceptors have a separate explicit contract.

## 8. Proposed Plugin Architecture

Recommended directory:

```text
plugins/seo/
  plugin.json
  package.json
  tsconfig.json
  admin/
    plugin.ts
    SeoDashboard.tsx
    editor/
    pages/
    components/
  server/
    routes.ts
    schema.ts
    services/
    repositories/
    analyzers/
    renderers/
    contracts/
  migrations/
    0001_create_seo_content_meta.sql
    0002_create_seo_schema_graphs.sql
    0003_create_seo_redirects.sql
    0004_create_seo_404_logs.sql
  docs/
    API.md
    DATA_MODEL.md
    SECURITY.md
```

Recommended service boundaries:

- `SeoMetadataService`: fallback and override resolution.
- `SeoAnalysisService`: deterministic content checks and scoring.
- `SchemaGraphService`: JSON-LD graph generation and validation.
- `SitemapService`: streamed sitemap generation and caching.
- `RobotsService`: robots directives and sitemap declaration.
- `RedirectService`: rule matching and loop prevention.
- `NotFoundMonitorService`: privacy-aware aggregation.
- `ImportExportService`: versioned portable configuration.

## 9. Data Model Direction

### `seo_content_meta`

- content UUID
- SEO title
- meta description
- canonical URL
- robots flags
- focus keyword JSON
- social title and description
- social image UUID
- breadcrumb title
- score and analysis version
- created and updated timestamps

### `seo_schema_graphs`

- UUID
- content UUID
- schema type
- schema JSON
- enabled flag
- sort order
- timestamps

### `seo_redirects`

- UUID
- source pattern
- match type
- destination URL
- HTTP status
- enabled flag
- hit count
- last hit timestamp
- timestamps

### `seo_404_logs`

- normalized path hash/path according to privacy setting
- query policy
- referrer host
- user-agent category
- hit count
- first and last seen timestamps

Avoid storing raw IP addresses by default.

## 10. Security and Reliability Requirements

- Escape every metadata attribute.
- Serialize JSON-LD without allowing `</script>` termination injection.
- Validate canonical and redirect URLs.
- Reject unsafe protocols such as `javascript:` and `data:`.
- Prevent open redirects unless explicitly allowed for privileged administrators.
- Detect redirect loops before saving.
- Limit regex complexity and execution time.
- Protect all mutation endpoints with plugin permissions.
- Apply pagination to redirects, logs, audits, and bulk editing.
- Rate-limit expensive audit endpoints.
- Do not expose private settings through public settings APIs.
- Sanitize imported JSON and enforce an import schema version.
- Make sitemap and robots output available even when Admin UI is unavailable.

## 11. Recommended Delivery Phases

### Phase 0: Platform Contracts

Implement the seven P0 platform items. No SEO business rules should be hardcoded into Core.

### Phase 1: SEO Foundation

- New valid plugin manifest.
- Plugin-owned migrations.
- Permissions and settings.
- SEO metadata API.
- Admin dashboard and setup wizard.
- Per-content SEO editor panel.
- Search snippet preview.
- Server-rendered title, description, canonical, and robots.

### Phase 2: Social and Schema

- Open Graph.
- Twitter Cards.
- Default social image.
- WebSite, Organization/Person, WebPage, Article, and Breadcrumb schema.
- Schema validation and preview.

### Phase 3: Discovery

- Sitemap index and content sitemaps.
- Images in sitemap.
- Exclusion controls.
- Robots editor and validator.
- Cache invalidation on content lifecycle events.

### Phase 4: Redirects and Monitoring

- Redirect manager.
- Slug-change suggestions.
- 404 monitor.
- Import/export.
- Bulk actions.

### Phase 5: Analysis and Advanced Modules

- Full-site SEO audit.
- Internal link suggestions.
- Orphan content detection.
- Scheduled audits after worker runtime exists.
- External webmaster and analytics integrations after encrypted secret storage exists.

## 12. Test Strategy

### Unit Tests

- Template variable resolution.
- Metadata fallback precedence.
- Robots conflict resolution.
- Canonical normalization.
- Content analysis rules.
- Schema generation.
- Redirect matching and loop detection.
- Sitemap XML escaping.

### Integration Tests

- Install, deactivate, reactivate, keep-data uninstall, and reinstall.
- Migration idempotency.
- Permission enforcement.
- Content save plus supplemental SEO save.
- Content publish plus sitemap invalidation.
- Slug change plus redirect suggestion.
- Theme switch with identical SEO output.

### Browser Tests

- Editor panel behavior during create, autosave, edit, and publish.
- Search and social previews.
- Dashboard filters and bulk editing.
- Redirect and 404 workflows.

### Crawler/HTTP Tests

- Fetch public URL without JavaScript.
- Verify title, description, canonical, robots, OG, Twitter, and JSON-LD.
- Validate sitemap XML and content types.
- Validate robots output.
- Verify redirect HTTP status and `Location` header.
- Verify 404 HTTP status and monitoring event.

## 13. Go/No-Go Decision

Decision: **CONDITIONAL GO**

Work may proceed in this order:

1. Implement generic platform prerequisites.
2. Replace the obsolete `seo-basic` skeleton with a properly structured SEO plugin.
3. Build SEO foundation modules.
4. Verify initial HTTP document output before adding advanced features.

Do not begin by adding SEO fields to Core `contents`, hardcoding SEO logic in themes, or importing private Admin/API files into the plugin. Those shortcuts would make the plugin appear functional while undermining lifecycle independence and future marketplace compatibility.

## 14. Final Assessment

ModernCMS has enough mature platform pieces to support a serious SEO plugin, but its current public rendering architecture is not yet suitable for reliable technical SEO. The project should treat server-rendered public documents and structured render-extension contracts as the first implementation milestone.

After Phase 0, the SEO plugin can be built cleanly as an independent product with its own database, API, admin UI, analysis engine, schema generator, sitemap engine, redirects, monitoring, permissions, and settings. Without Phase 0, only an SEO dashboard and metadata database would be complete; the most important output seen by crawlers would remain unreliable.
