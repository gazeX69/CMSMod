# ModernCMS Platform Readiness Implementation Plan

Date: 2026-06-12

Status: IMPLEMENTED AND VERIFIED - SEE `PLATFORM_READINESS_REPORT.md`

Owner role: Senior Platform Architect

## 0. Mandate and Guardrails

Tujuan pekerjaan ini adalah melengkapi kontrak platform generik agar plugin masa depan dapat dibangun tanpa mengimpor internal Core dan tanpa menambahkan business domain ke Core.

Target konsumen kontrak:

- SEO Plugin
- Analytics Plugin
- AI Plugin
- Forum Plugin
- LMS Plugin
- CRM Plugin
- Local and future distributed plugin packages, without marketplace-specific implementation in this program
- Plugin lain yang belum diketahui hari ini

Larangan selama program ini:

- Tidak membangun SEO Plugin.
- Tidak membuat tabel, halaman, pengaturan, atau business logic SEO.
- Tidak menambahkan redirect engine, analytics tracker, AI service, forum logic, atau LMS logic ke Core.
- Tidak menerima raw HTML dari plugin untuk document head.
- Tidak menjadikan private path `apps/api/*` atau `apps/admin/*` sebagai public contract.
- Tidak memperbaiki boundary violation dengan membuat pengecualian khusus plugin tertentu.

Prinsip keputusan:

1. `PRODUCT_VISION_LOCK_V1`
2. `DOMAIN_BOUNDARY_LOCK_V1`
3. Platform and plugin locks
4. SDK contracts
5. Implementation detail

Core hanya menerima capability yang generik, stabil, dan dibutuhkan lintas-domain. Plugin tetap memiliki business rules, data, settings, permissions, API, dan UI domainnya sendiri.

Marketplace compatibility remains a design constraint only. Marketplace services, package signing, publisher verification, licensing, remote distribution, and marketplace update orchestration are outside this implementation scope and are not phase dependencies.

## 1. Audit Scope and Evidence

Audit dilakukan terhadap seluruh dokumen LOCK yang tersedia:

- `PRODUCT_VISION_LOCK_V1.md`
- `DOMAIN_BOUNDARY_LOCK_V1.md`
- `PLUGIN_PLATFORM_LOCK_V1.md`
- `PLUGIN_RUNTIME_LOCK_V1.md`
- `PLUGIN_LIFECYCLE_LOCK_V1.md`
- `PLUGIN_MIGRATION_SYSTEM_LOCK_V1.md`
- `PLUGIN_DATABASE_OWNERSHIP_LOCK_V1.md`
- `SDK_ARCHITECTURE_LOCK_V1.md`
- `API_ARCHITECTURE_LOCK_V1.md`
- `EVENT_SYSTEM_LOCK_V1.md`
- `CONTENT_ENGINE_LOCK_V1.md`
- `EDITOR_ENGINE_LOCK_V1.md`
- `ADMIN_PANEL_ARCHITECTURE_LOCK_V1.md`
- `MEDIA_ASSET_PLATFORM_LOCK_V1.md`
- `DATABASE_ARCHITECTURE_LOCK_V1.md`
- `PERMISSION_SYSTEM_LOCK_V1.md`
- `SETTINGS_SYSTEM_LOCK_V1.md`
- `THEME_SYSTEM_LOCK_V1.md`
- `MARKETPLACE_ARCHITECTURE_LOCK_V1.md`

Implementasi yang diaudit:

- Public Vite application dan public API renderer.
- Theme rendering dan theme slot registry.
- Content routes, schema, event emission, dan permalink logic.
- Plugin scanner, manifest, lifecycle, runtime loader, dan runtime registry.
- Event bus.
- Plugin SDK dan package SDK lama.
- Admin plugin registry dan manager.
- Editor contracts, registry, runtime, provider, dan consumer.
- Media Library routes, schema, picker, dan editor bridge.
- Plugin comments sebagai contoh runtime consumer.
- Development launcher dan service topology.
- Existing architecture compliance/status documents.

Catatan audit penting: `ARCHITECTURE_COMPLIANCE.md`, `VIOLATIONS.md`, dan `CURRENT_STATUS.md` memuat beberapa status yang sudah tertinggal dari kode aktual. Event bus, granular permissions, plugin migration execution, dan runtime activation sudah tersedia dalam bentuk awal. Dokumen implementasi berikutnya harus diperbarui setelah setiap phase agar tidak kembali menjadi sumber informasi yang salah.

## 2. Current Architecture Baseline

### 2.1 Yang Sudah Tersedia

- Plugin filesystem discovery dan manifest validation.
- Lifecycle status `DISCOVERED`, `INSTALLING`, `INSTALLED`, `ACTIVE`, `INACTIVE`, `BROKEN`, dan `UNINSTALLED`.
- Plugin-owned SQL migration execution dan migration history.
- Runtime backend loading dari manifest.
- Namespaced plugin API registration.
- Settings SDK awal.
- Permission registration dan server-side permission checking.
- Synchronous event bus awal.
- Content Engine dengan UUID, status, taxonomy, revision, dan public rendering service.
- Theme scanner, registry, settings, dan template rendering.
- Editor registries untuk toolbar, commands, nodes, marks, modals, property panels, inspector sections, sidebars, media picker, dan insert sources.
- Media assets berbasis UUID dan dynamic resolver.

### 2.2 Yang Belum Menjadi Kontrak Platform

- Initial public HTML document rendering.
- Structured document contributor registry.
- Content SDK.
- Versioned rich content events.
- Public Editor SDK.
- Public root route registry.
- Public request interceptor registry.
- Per-plugin event listener ownership dan failure isolation.
- Media SDK lengkap.
- Dynamic Admin runtime yang bebas static plugin imports.
- Runtime cleanup yang benar-benar menghapus owned listeners/contributors/interceptors.

## 3. Gap Analysis

### P0-1 Public Document Rendering Foundation

Current state:

- `apps/public/index.html` mengirim Vite shell dengan title generik.
- `apps/public/src/main.tsx` meminta `/api/public/render` setelah browser hidup.
- Full theme HTML lalu dimasukkan ke sebuah `<div>` menggunakan `dangerouslySetInnerHTML`.
- API sebenarnya sudah dapat menghasilkan full theme document melalui `renderPublicRoute()`.
- API, Admin, dan Public berjalan sebagai tiga service terpisah di development launcher.

Gap:

- Initial response public bukan final document.
- HTTP status dan final head bergantung pada request kedua dari browser.
- Full `<html>/<head>/<body>` theme document ditempatkan di dalam body React shell.
- Tidak ada production public document host yang jelas.
- Theme renderer dan transport HTTP masih tercampur dalam satu service file.

Required platform outcome:

- Sebuah Public Document Host menerima request browser dan mengembalikan final HTML pada response pertama.
- Renderer tetap menghasilkan presentation dari active theme.
- Public JSON API tetap tersedia dan tidak berubah menjadi HTML-only platform.
- Client-side navigation boleh menjadi progressive enhancement, bukan syarat rendering.
- Core tidak menambahkan metadata domain tertentu.

Required `Public Document Host Contract`:

```ts
interface PublicDocumentHost {
  render(request: PublicDocumentRequest): Promise<PublicDocumentResponse>;
}
```

Kontrak wajib mendefinisikan request normalization, route resolution, interceptor execution, document context, theme rendering, contribution collection, serialization, status, headers, content type, dan final HTML body. Kontrak tidak boleh bergantung pada Fastify, Vite, React, atau framework transport tertentu.

Implementation-neutral direction:

- Pisahkan public document transport dari `/api/public/*` JSON routes.
- Pertahankan `renderPublicRoute()` sebagai application service sementara, lalu pecah menjadi resolver, context builder, theme renderer, contribution pipeline, dan document serializer.
- Gunakan outer document yang dimiliki platform; theme menyediakan presentation template/context sesuai Theme Lock.
- Sediakan adapter host. Adapter pertama boleh menggunakan Fastify bila dipilih pada implementation ADR, tetapi adapter bukan kontrak dan dapat diganti tanpa mengubah plugin SDK.
- Public asset bundle dapat tetap menjadi progressive enhancement bila diperlukan.

Rejected direction:

- DOM patching setelah load.
- Prerender khusus SEO.
- Hardcode bot/crawler detection.
- Menyisipkan metadata ke Vite `index.html` berdasarkan route.

### P0-2 Public Document Contributor Registry

Current state:

- Hanya ada `ThemeSlotRegistry` dengan resolver HTML per nama slot.
- Registry tersebut menerima dan mengembalikan raw HTML.
- Slot comments/discussion diperiksa secara hardcoded di `publicWebsiteService.ts`.
- Runtime SDK tidak mengekspos document contribution API.

Gap:

- Tidak ada lifecycle-aware contributor ownership.
- Tidak ada structured document model.
- Tidak ada ordering, priority, conflict resolution, deduplication, capability policy, atau safe serialization.
- Tidak ada pemisahan contribution untuk metadata, links, scripts, structured data, body attributes, dan resources.
- Theme slot saat ini merupakan targeted presentation bridge, bukan generic public document contract.

Required contract direction:

```ts
publicDocument.registerContributor({
  id,
  priority,
  contribute(context): Promise<PublicDocumentContribution>
})
```

`PublicDocumentContext` minimal:

- request URL dan normalized path
- resolved route
- site context
- content summary atau `null`
- active theme identity
- locale
- authenticated-public context bila kelak diperlukan, tanpa session internals

`PublicDocumentContribution` harus terstruktur:

- title candidate
- meta descriptors
- link descriptors
- script descriptors dengan policy ketat
- JSON serializable structured data
- HTML/body attributes dalam allowlist
- preload/preconnect resource hints

Core responsibilities:

- Escape dan serialize output.
- Validate protocols dan attributes.
- Deduplicate deterministic keys.
- Resolve exclusive fields dengan priority policy.
- Enforce CSP-compatible script policy.
- Log contributor failure tanpa membocorkan internal error ke public response.

Raw HTML dari contributor dilarang. Presentation body extensions yang memang membutuhkan markup harus memakai registry/slot terpisah dengan sanitization contract, bukan document-head contributor.

### P0-3 Content SDK

Current state:

- Content read/write logic berada langsung pada Core routes dan `publicWebsiteService.ts`.
- Plugin runtime menerima raw `db` dan seluruh Core `schema` melalui options.
- Plugin comments memakai raw Core schema untuk membaca `contents` dan `users`.
- Plugin SDK tidak memiliki `content` capability.
- Permalink generation diduplikasi di public renderer dan widget service.

Gap:

- Plugin dapat melewati Content Engine dengan direct database access.
- Tidak ada DTO stabil yang melindungi plugin dari perubahan schema.
- Tidak ada cursor/page contract bersama.
- Tidak ada filter contract yang versionable.
- Tidak ada canonical permalink resolver SDK.
- Runtime injection `db` dan `schema` bertentangan dengan SDK-only direction.

Required API:

```ts
content.getByUuid(uuid, options?)
content.list(query)
content.listPublished(query)
content.search(query)
content.resolvePermalink(contentOrUuid)
```

Required query properties:

- `page` and `limit`, with enforced maximum.
- content type filter.
- status filter where authorized.
- author filter.
- taxonomy filters.
- updated/published date filters.
- sort allowlist.
- search text.
- requested field projection or expansion allowlist.

Required DTO rules:

- Public UUID is the stable identity.
- Internal numeric ID is not required by plugin consumers.
- Public and administrative projections are separated.
- Deleted/draft content is permission protected.
- Body inclusion is explicit to avoid heavy list responses.
- Permalink is generated by one platform resolver.

Migration direction:

- Introduce Content Service and repository boundary in Core.
- Make existing Core routes consume the same service.
- Expose a restricted SDK adapter to plugins.
- Remove `db` and `schema` from general runtime options only after all first-party plugins have migrated.

### P0-4 Rich Content Events

Current state:

- Event envelope contains `event`, `timestamp`, `source`, dan `payload`.
- Content events mostly carry numeric `contentId`, type, status, and author ID.
- Update events do not identify previous values.
- Page publishing does not consistently emit a dedicated publish transition.
- Event envelope has no version.

Gap:

- Consumers cannot reliably correlate by stable UUID.
- Slug changes cannot be detected without re-querying or direct DB access.
- Status transition semantics are inconsistent between content types and endpoints.
- No formal payload schema/version ownership.

Required envelope:

```ts
interface PlatformEvent<T> {
  event: string;
  version: number;
  eventId: string;
  occurredAt: string;
  source: string;
  payload: T;
}
```

Required content transition payload:

- `contentUuid`
- `contentType`
- `previousSlug`
- `currentSlug`
- `previousStatus`
- `currentStatus`
- changed field names
- actor UUID or stable actor identity where available
- revision number where available

Rules:

- Payload serializable only.
- Do not include database rows, request objects, services, or secrets.
- Event naming remains `resource.action`.
- A publish event is a status transition, not an endpoint-specific side effect.
- Create, update, publish, unpublish/archive, restore, and delete semantics must be documented.

### P0-5 Editor SDK

Current state:

- Editor registries already exist inside `apps/admin/src/editor`.
- `ArticleManager` directly constructs `EditorRuntime` from the internal registry.
- Media Library imports internal Admin editor contracts and registry.
- Editor extension contracts are not exported by `@modern-cms/plugin-sdk`.
- No supplemental save or publish check pipeline exists.

Gap:

- Existing extension engine is structurally useful but not a public SDK.
- Plugins are coupled to Admin filesystem paths and build topology.
- Document context is owned by `ArticleManager`, not exposed generically.
- Inspector components only receive editor/node state, not content-form lifecycle.
- No save transaction/orchestration contract for plugin-owned metadata.
- No plugin-owned registration cleanup.

Required public API:

```ts
editor.inspector.register(definition)
editor.sidebar.register(definition)
editor.document.getContext()
editor.document.onSaved(listener)
editor.document.registerSupplementalSave(handler)
editor.publish.registerCheck(check)
```

Additional required contracts from Editor Lock:

- nodes
- marks
- toolbar
- commands
- modals
- property panels
- context menus
- insert sources
- media picker consumption

Document context must be framework DTO, not direct React state:

- content UUID or `null` before first save
- content type
- title
- slug
- excerpt
- document JSON/HTML access through controlled getter
- status
- dirty/saving state
- current user capabilities

Supplemental save semantics:

- Core content save completes first and produces UUID/revision.
- Registered handlers receive stable save context.
- Handler result is isolated per plugin and observable.
- Autosave handlers must be idempotent.
- Failure policy can be `warning` or `required`, declared explicitly.
- Core content must not gain plugin-specific fields.

Publish check semantics:

- Structured result: pass, warning, or block.
- Timeout and error isolation.
- Permission-aware.
- No plugin may silently publish or mutate another plugin's data.

### P0-6 Public Route Registry

Current state:

- Public JSON routes are statically registered in Fastify.
- Public page resolution is hardcoded for home, search, and content slug patterns.
- Plugin backend routes are namespaced under `/api/{plugin-id}`.
- There is no mechanism for plugin-owned public root resources.

Gap:

- Generic resources such as feeds, manifests, exports, protocol endpoints, and future domain pages cannot claim a public path safely.
- No ownership/conflict table exists.
- No route priority, method, content type, cache policy, or activation cleanup contract exists.

Required API:

```ts
publicRoutes.register({
  id,
  method,
  path,
  priority,
  responseType,
  handler
})
```

Rules:

- Owner is derived from runtime SDK, not accepted from plugin input.
- Reserved Core paths are immutable.
- Duplicate exact route ownership is rejected at registration.
- Ambiguous dynamic patterns are rejected or deterministically prioritized.
- Route handlers receive a sanitized platform request context.
- Response is a typed result, not raw Fastify reply ownership by default.
- Deactivation removes route availability immediately through registry lookup.
- Registry supports diagnostics.

Implementation direction:

- Use a stable platform dispatcher route rather than dynamically adding/removing Fastify routes after startup.
- Dispatcher consults active registry entries at request time.
- API plugin namespace routes may continue using Fastify registration separately.

### P0-7 Public Request Interceptor

Current state:

- No plugin interceptor contract exists before public route resolution.
- Fastify hooks exist only as framework internals, not SDK capabilities.
- Event bus is unsuitable for request control because it has no typed decision result.

Gap:

- Plugins cannot generically short-circuit, rewrite, annotate, or observe public route processing.
- Direct Fastify hook exposure would leak framework internals and make ordering unsafe.

Required contract:

```ts
publicRequests.registerInterceptor({
  id,
  phase,
  priority,
  intercept(context): Promise<InterceptorDecision>
})
```

Proposed phases:

- `beforeResolve`
- `afterResolve`
- `beforeRender`
- `afterRender`

Allowed decisions must be explicit:

- continue with optional immutable context annotations
- rewrite normalized path
- return typed response
- deny with typed status

Rules:

- Maximum rewrite depth.
- Cycle detection.
- Per-interceptor timeout.
- No access to raw database or Fastify internals.
- Security-sensitive decisions are audited.
- Observer-only use cases should use events instead of interceptors.
- Interceptors run only while owner plugin is active.

### P0-8 Event Ownership and Failure Isolation

Current state:

- Handlers are stored as `Map<eventName, Set<handler>>`.
- `events.on` is bound directly to the singleton bus.
- Owner plugin ID is not attached to listener registration.
- `Promise.all` propagates a listener rejection to the producer.
- `clearPluginRuntimeHandlers()` clears every handler.
- Runtime unload only marks registry state as unloaded.

Gap:

- Cannot unregister all listeners for one plugin safely.
- Plugin failure can reject producer operation.
- Reload can duplicate listeners.
- Diagnostics cannot identify listener owner.
- No timeout, execution duration, or failure count.

Required internal model:

```ts
interface OwnedEventSubscription {
  subscriptionId: string;
  ownerPluginId: string;
  eventName: string;
  handler: EventHandler;
  mode: 'optional' | 'mandatory';
}
```

Required behavior:

- Runtime SDK binds owner automatically.
- `unregisterOwner(pluginId)` removes only owner registrations.
- Optional listeners execute with per-listener error isolation.
- Mandatory validation/interception is not implemented as an ordinary event listener; use a dedicated pipeline contract.
- Emit returns an execution report for diagnostics without exposing handler objects.
- Reload is idempotent.
- Deactivation unregisters listeners, contributors, public routes, and interceptors owned by the plugin.

### P0-9 Capability Provider Architecture

Current state:

- Runtime SDK exposes a fixed set of directly constructed services.
- There is no generic provider discovery, selection, lifecycle, or availability model.
- Media is currently implemented as a plugin but consumed through direct API knowledge and private Admin imports.
- Future shared services such as search, notifications, cache, storage, and AI would repeat the same coupling.

Gap:

- Platform cannot declare a capability independently from its provider implementation.
- No exclusive versus multi-provider policy.
- No provider version/compatibility negotiation.
- No owner-scoped registration and disposal.
- No graceful unavailable/degraded result.
- No server/Admin/public adapter separation for one capability.

Required generic model:

```ts
capabilities.registerProvider({
  capability,
  version,
  mode,
  priority,
  implementation
})

capabilities.resolve(capability, versionRange?)
capabilities.listProviders(capability)
```

Required capability classes:

- Exclusive provider: one active implementation, for example the canonical media asset provider.
- Multi-provider: several providers may coexist, for example notification channels.
- Composite provider: platform facade delegates by policy, for example storage backends.

Rules:

- Owner plugin ID is bound by runtime scope and cannot be spoofed.
- Provider registration is versioned.
- Registration declares environment surfaces: server, Admin, public, or shared DTO only.
- Resolution returns a typed unavailable/incompatible result instead of leaking `undefined` or implementation paths.
- Deactivation disposes provider registration.
- Provider switch/conflict is deterministic and diagnostic.
- Core knows the capability contract, not provider database/storage/business internals.
- Capability contracts must be useful across domains and must not encode SEO-specific behavior.

Initial capability consumers after this foundation:

- Media Provider
- Search Provider
- Notification Provider
- Cache Provider
- Storage Provider
- AI Provider
- Future platform capabilities

### P0-10 Content Metadata Contract

Current state:

- `CONTENT_ENGINE_LOCK_V1` permits content metadata conceptually.
- Public content DTO currently returns `metadata: {}` without persistence.
- Core content schema and APIs have no formal metadata ownership model.
- Plugins would otherwise add fields to Core content payloads or query their own tables ad hoc without discovery/validation contracts.

Gap:

- No namespace and ownership rule for metadata keys.
- No persistence abstraction.
- No read/write SDK.
- No validation registration.
- No projection policy for public, administrative, and private metadata.
- No revision/event semantics.

Required contract:

```ts
content.metadata.registerDefinition({
  namespace,
  key,
  schema,
  visibility,
  revisionPolicy
})

content.metadata.get(contentUuid, query?)
content.metadata.set(contentUuid, entries, options?)
content.metadata.delete(contentUuid, keys)
```

Ownership and persistence rules:

- Metadata infrastructure is owned by Content Engine as a platform service.
- Metadata definitions and values are owned by the registering plugin/domain.
- Keys use a plugin-owned namespace such as `plugin-id.key`.
- Core validates envelope, ownership, visibility, size, serialization, and schema registration.
- Core does not interpret business meaning.
- Plugins cannot write another owner's namespace.
- Values must be serializable and size-bounded.
- Public exposure is explicit, never default for sensitive metadata.
- Persistence may use a generic Core content metadata table because the infrastructure is part of Content Engine; plugin business tables remain plugin-owned.
- Revision inclusion is definition-driven and must not silently inflate every revision.

Required use cases:

- AI enrichment metadata.
- Analytics classification metadata.
- LMS lesson attributes.
- Forum discussion attributes.
- CRM and Knowledge Base annotations.
- Future plugin-defined content extensions.

The contract must not introduce SEO-named fields or SEO validation rules.

### P0-11 Media SDK

Current state:

- Media Library owns asset schema and API.
- UUID resolver exists.
- Media Picker exists as a plugin Admin component.
- Editor bridge imports internal Admin registry and contracts.
- Picker handler currently returns a hardcoded demo UUID before opening the real insert-source UI.
- Runtime SDK has no `media` capability.

Gap:

- Other plugins must know Media Library API paths or import its UI.
- No stable DTO or search contract.
- No service discovery/capability behavior when Media Library is inactive.
- No official picker host API.

Required API:

```ts
media.getByUuid(uuid)
media.resolve(uuid, options?)
media.search(query)
media.openPicker(options?)
```

Boundary decision:

- Media Library remains a plugin domain and owns data/business operations.
- Core Plugin SDK defines a generic Media Asset capability contract because the LOCK documents designate it as the shared asset platform.
- Runtime resolves the provider dynamically. Core does not query media tables.
- A capability/provider registry maps `media` to an active provider plugin.

Required behavior:

- Graceful `capability unavailable` result when provider is inactive.
- DTO uses UUID, MIME type, metadata, alt text, caption, dimensions, and resolved URL.
- Storage path/disk internals are never returned as required consumer fields.
- Search is paginated and permission-aware.
- Picker is opened through an Admin host service, not imported directly.
- Public URL resolution can support variants without exposing storage rules.

### P0-12 Plugin Runtime Compliance

Current state violations:

- `apps/admin/src/plugins/registry.ts` statically imports Media Library and Comments plugin modules.
- Media Library imports private Admin editor paths.
- Runtime injects raw Core `db` and `schema` into plugins.
- Runtime injects `requireAuth` directly.
- Theme slot registry is a Core internal object passed to plugin runtime.
- Manifest `admin.bundle` is declared but not loaded as the runtime source.
- Admin runtime has no lazy remote/local module loading boundary.
- Deactivation does not physically remove Fastify routes; access relies on guards.
- Event/contributor cleanup is incomplete.

Required refactor:

- Define a versioned plugin runtime package contract.
- Separate Server SDK and Admin SDK surfaces while exporting from stable package entrypoints.
- Load Admin modules from manifest/runtime descriptor without a hardcoded plugin list.
- Replace raw platform internals with capability adapters.
- Track all registrations in a per-plugin runtime scope.
- Dispose runtime scope on deactivate/reload.
- Add plugin error boundary around Admin root component.
- Add compatibility validation for SDK/runtime versions.
- Preserve local development loading while keeping the contract transport- and distribution-neutral.

### P0-13 Architecture Compliance Automation

Current state:

- Boundary violations are found through manual `rg` audits.
- No root command fails when plugin code imports private Core paths or another plugin implementation.
- Existing compliance documents are stale and cannot prevent regression.

Required command:

```text
pnpm architecture:check
```

Minimum checks:

- Plugin source must not import `apps/api/*`.
- Plugin source must not import `apps/admin/*`.
- Plugin source must not import `internal/*` or configured private paths.
- Plugin source must not import another plugin implementation directly.
- Plugin source may import only approved SDK/shared/public package entrypoints.
- Relative path traversal resolving into forbidden roots must be detected.
- Alias-based imports must be resolved before evaluation.
- Manifest entries and runtime bundles must not point outside the plugin root.
- Core/Admin code must not statically import concrete plugin implementations except explicitly grandfathered paths during migration.

Implementation requirements:

- Use AST/module resolution rather than regex-only scanning for the enforcement path.
- Produce machine-readable and human-readable reports.
- Include rule ID, source file, line, resolved target, and remediation hint.
- Support an explicit temporary baseline file with owner and expiry; no silent ignore list.
- Root `package.json` exposes `architecture:check`.
- CI/build can invoke the scanner independently.
- Final P0 acceptance requires zero unexpired violations.

## 4. Architecture Violations

### V-P01: Client-Only Public Document

- Locks: Product Vision, API, Theme, Content.
- Severity: Critical.
- Evidence: generic Vite initial document and post-load API render.
- Impact: platform cannot guarantee an initial final document to any client without JavaScript.

### V-P02: Hardcoded Public Presentation Slots

- Locks: Plugin Runtime, Theme, SDK, Domain Boundary.
- Severity: High.
- Evidence: comments/discussion slot names are checked directly by Core renderer.
- Impact: Core knows plugin-specific integration vocabulary.

### V-P03: Raw Core Database and Schema Injection

- Locks: SDK, Database, Domain Boundary, Plugin Runtime.
- Severity: Critical.
- Evidence: plugin runtime options include `db` and entire Core `schema`.
- Impact: plugins can bind to internal tables and bypass platform services.

### V-P04: Incomplete and Unversioned Content Events

- Locks: Event System, Content Engine, SDK.
- Severity: High.
- Evidence: numeric ID payloads and inconsistent transition emission.
- Impact: cross-domain consumers cannot react reliably.

### V-P05: Editor Internal Imports

- Locks: Editor Engine and SDK.
- Severity: Critical.
- Evidence: Media Library imports `apps/admin/src/editor/*`.
- Impact: plugins require Core source layout and Admin recompilation.

### V-P06: Static Admin Plugin Registry

- Locks: Plugin Runtime, Admin Panel, Marketplace, SDK.
- Severity: Critical.
- Evidence: hardcoded imports in `apps/admin/src/plugins/registry.ts`.
- Impact: marketplace/local plugin installation cannot add Admin UI independently.

### V-P07: Event Bus Has No Listener Ownership

- Locks: Event System, Plugin Lifecycle, Plugin Runtime.
- Severity: Critical.
- Evidence: handler sets contain no owner and global clear removes all handlers.
- Impact: deactivate/reload isolation is unsafe.

### V-P08: Listener Failure Propagates to Producer

- Locks: Event System Section 17 and runtime failure isolation.
- Severity: High.
- Evidence: `Promise.all` rejects emit when one listener rejects.
- Impact: one plugin can break a Core or another plugin operation.

### V-P09: Media Picker Is Not an SDK Service

- Locks: Media Asset Platform, Editor Engine, SDK.
- Severity: High.
- Evidence: plugin UI imports and registers against Admin internals.
- Impact: every consumer risks creating its own picker or private coupling.

### V-P10: Plugin Runtime Leaks Framework Internals

- Locks: Plugin Runtime and SDK.
- Severity: High.
- Evidence: raw Fastify-related auth function, DB, schema, and internal registries are passed to plugin entrypoints.
- Impact: future sandbox, remote runtime, and marketplace compatibility are blocked.

### V-P11: Dynamic Fastify Route Disposal Is Not Real

- Locks: Plugin Lifecycle and Plugin Runtime.
- Severity: Medium.
- Evidence: unload changes runtime registry status but registered routes remain in Fastify.
- Impact: runtime resources accumulate across reload and must rely on active-status guards.

### V-P12: Migration Tooling Still Scans Plugin Schemas Centrally

- Locks: Plugin Database Ownership and Plugin Migration.
- Severity: High.
- Evidence: `apps/api/drizzle.config.ts` includes `plugins/*/server/schema.ts`.
- Impact: generated Core migrations can capture plugin-owned schema despite runtime migration support.

### V-P13: Architecture Status Documents Are Stale

- Locks: Architecture governance and recovery continuity.
- Severity: Medium.
- Evidence: documents report missing systems that now exist in code.
- Impact: future work may repeat implementation or make decisions from false baselines.

### V-P14: No Capability Provider Architecture

- Locks: Product Vision, Domain Boundary, SDK, Plugin Runtime, Media Asset Platform.
- Severity: Critical.
- Evidence: runtime constructs fixed services directly and has no generic provider registration/resolution model.
- Impact: media, search, notification, cache, storage, AI, and future providers would require separate Core coupling patterns.

### V-P15: Content Metadata Is Documented but Not Contracted

- Locks: Content Engine, SDK, Database Architecture, Domain Boundary.
- Severity: High.
- Evidence: public DTO emits an empty metadata object while no persistence, ownership, validation, or SDK contract exists.
- Impact: plugins are pushed toward Core columns, private tables without shared access semantics, or custom payload coupling.

### V-P16: Boundary Compliance Is Manual

- Locks: SDK, Plugin Runtime, Editor Engine, Domain Boundary.
- Severity: Critical.
- Evidence: known forbidden imports are detected through manual repository search and remain buildable.
- Impact: architecture violations can silently return after refactors and plugin additions.

## 5. Required Refactors

### 5.1 New Platform Modules

Proposed API modules:

```text
apps/api/src/public-document/
  PublicDocumentService.ts
  PublicDocumentContributorRegistry.ts
  PublicRouteRegistry.ts
  PublicRequestInterceptorRegistry.ts
  PublicDocumentSerializer.ts
  publicDocumentTypes.ts

apps/api/src/content/
  contentService.ts
  contentRepository.ts
  contentDtos.ts
  permalinkService.ts

apps/api/src/events/
  eventBus.ts
  eventTypes.ts
  eventDiagnostics.ts

apps/api/src/runtime/
  PluginRuntimeScope.ts
  CapabilityRegistry.ts
```

Exact names may follow existing conventions during implementation, but ownership boundaries must remain as above.

### 5.2 SDK Package Refactor

`@modern-cms/plugin-sdk` should become the single public source for shared contracts, with environment-specific adapters:

```text
@modern-cms/plugin-sdk
  shared manifest/event/content/media DTOs
  server runtime contracts
  admin runtime contracts
  editor extension contracts
  public document contracts
```

Avoid exporting executable Core singletons. Plugins receive scoped SDK instances from runtime hosts.

The existing `packages/sdk/src/plugin-sdk.ts` stub should be removed, deprecated, or made an explicit compatibility re-export after confirming no consumer depends on it.

### 5.3 Public Host Refactor

- Route canonical public HTTP document serving through the framework-neutral Public Document Host contract and a replaceable adapter.
- Keep `/api/public/*` as JSON/headless endpoints.
- Split route resolution from rendering and serialization.
- Define cache headers and response status in typed render result.
- Convert `apps/public` into progressive-enhancement assets or a thin client, not the only public renderer.

### 5.4 Runtime Scope Refactor

Each active plugin receives a `PluginRuntimeScope` that records:

- event subscriptions
- document contributors
- public routes
- public interceptors
- capability providers/consumers
- scheduled cleanup callbacks
- runtime diagnostics

On deactivate/reload, scope disposal removes all owned registrations. Fastify API routes remain guarded until process restart unless moved behind a dispatcher; this limitation must be explicit.

### 5.5 First-Party Plugin Migration

Media Library:

- Remove internal Editor imports.
- Register media provider through capability contract.
- Expose picker through Admin SDK.
- Consume scoped Server SDK only.

Comments:

- Replace raw Core schema access with Content SDK.
- Replace hardcoded theme slot bridge with a generic presentation extension contract if still required.
- Track all event/route contributions in runtime scope.

No feature expansion of either plugin is included.

### 5.6 Governance Refactor

- Add boundary lint/test rules for forbidden imports.
- Add architecture compliance tests to CI/build scripts.
- Update `ARCHITECTURE_COMPLIANCE.md`, `VIOLATIONS.md`, and `CURRENT_STATUS.md` after each approved phase.
- Add Architecture Decision Records for public host topology, runtime module loading, and capability provider model.

## 6. Execution Order

Execution must follow dependency order. Do not implement all contracts in parallel before their shared ownership model is stable.

### Stage 0: Baseline and Architecture Compliance Automation

Objective:

- Freeze behavioral baseline before refactor.

Work:

- Add tests for existing public render API, plugin lifecycle, event emissions, editor build, and media resolver.
- Implement the AST/module-resolution architecture scanner and root `pnpm architecture:check` command.
- Seed a temporary, explicit baseline for known violations with owner and expiry.
- Record current plugin diagnostics and active states.
- Create ADR templates and update stale status documents only after facts are verified.

Exit gate:

- Baseline tests pass before structural changes.
- `pnpm architecture:check` reports all current violations deterministically and is ready for CI use.

Implements:

- P0-13 foundation and enforcement harness.

### Stage 1: Shared Contract Types and Runtime Scope

Objective:

- Establish common ownership/disposal model used by every later registry.

Work:

- Define plugin identity, runtime scope, disposable registration, typed execution result, and SDK version contracts.
- Refactor event bus ownership first because later registries use the same pattern.
- Add per-owner diagnostics.

Implements:

- P0-8 foundation.
- Part of P0-12.

Exit gate:

- One plugin can register multiple resources and dispose only its own resources.

### Stage 2: Capability Provider Architecture

Objective:

- Establish a generic provider model before any provider-specific SDK is introduced.

Work:

- Define capability identity, version, provider mode, resolution, availability, diagnostics, and runtime-scope disposal.
- Support exclusive, multi-provider, and composite capability classes.
- Add environment-specific provider surfaces without leaking implementation modules.
- Add neutral fixture providers and conflict tests.

Implements:

- P0-9.

Exit gate:

- Neutral fixture capabilities can register, resolve, conflict, degrade, and dispose without domain-specific Core code.

### Stage 3: Content Service, Permalink Service, and Rich Events

Objective:

- Remove the need for plugin reads against Core tables.

Work:

- Extract reusable Content Service/repository from routes/public renderer.
- Centralize permalink resolution.
- Add Content SDK adapter.
- Upgrade event envelope and content transition events.
- Make existing routes consume the service.

Implements:

- P0-3.
- P0-4.

Exit gate:

- A test plugin can read/search/list published content and resolve permalink using SDK only.

### Stage 4: Content Metadata Contract

Objective:

- Make plugin-defined content metadata a first-class Content Engine capability.

Work:

- Define metadata namespace, ownership, definition, validation, visibility, persistence, revision, and event contracts.
- Add Content Metadata SDK adapters.
- Enforce owner namespace and serialized size limits.
- Add public/admin/private projections.
- Use neutral metadata fixture definitions from unrelated domains.

Implements:

- P0-10.

Exit gate:

- Multiple fixture plugins can persist validated metadata in isolated namespaces without adding business fields to Core content.

### Stage 5: Public Registries and Interceptor Pipeline

Objective:

- Create generic public extension execution before changing transport topology.

Work:

- Public Route Registry.
- Public Request Interceptor Registry.
- Public Document Contributor Registry.
- Typed route/interceptor/contribution results.
- Ownership, priority, timeout, conflict, and disposal rules.

Implements:

- P0-2.
- P0-6.
- P0-7.

Exit gate:

- Synthetic test plugins can contribute structured data, claim a non-reserved route, and intercept a request without raw framework access.

### Stage 6: Public Document Host Contract and First Adapter

Objective:

- Return final HTML on the initial HTTP response.

Work:

- Split resolver/context/renderer/serializer.
- Integrate contributor output.
- Implement the framework-neutral Public Document Host contract.
- Add the first host adapter selected through an ADR; Fastify may be used but is not part of the contract.
- Preserve headless JSON APIs.
- Convert client app to progressive enhancement.
- Document replaceable production serving topology.

Implements:

- P0-1.

Exit gate:

- `curl` receives final HTML, correct status, title, description, canonical, and robots defaults without JavaScript.
- Contract tests run independently from the concrete host adapter.

### Stage 7: Editor SDK and Admin Runtime

Objective:

- Make editor and Admin UI extensible through stable SDK contracts.

Work:

- Move editor public contracts to Plugin SDK.
- Introduce scoped Admin SDK adapter.
- Implement document context, saved event, supplemental saves, and publish checks.
- Add extension ownership/disposal.
- Add plugin root error boundary.
- Implement manifest-based Admin module loading and lazy loading.

Implements:

- P0-5.
- Admin half of P0-12.

Exit gate:

- A fixture plugin registers an inspector and supplemental save without importing `apps/admin/*` and without static registry edits.

### Stage 8: Media SDK on Capability Provider Architecture

Objective:

- Expose Media Asset Platform without Core storage/table knowledge.

Work:

- Define media capability contract using the generic provider architecture.
- Register Media Library as provider.
- Implement server methods and Admin picker host adapter.
- Migrate editor/media integration away from private imports.

Implements:

- P0-11.

Exit gate:

- A fixture plugin can search/select/resolve media via SDK and survives provider inactivity gracefully.

### Stage 9: Runtime Compliance Migration

Objective:

- Remove remaining internal leaks and hardcoded plugin imports.

Work:

- Migrate Comments and Media Library to scoped SDKs.
- Remove raw `db`, `schema`, `requireAuth`, and internal registry objects from public runtime options.
- Remove static Admin registry imports.
- Enforce SDK/runtime compatibility.
- Separate plugin schema generation from Core Drizzle generation.

Implements:

- Remaining P0-12.
- P0-13 zero-violation enforcement.

Exit gate:

- Repository-wide forbidden import scan is clean for plugin source.
- New local plugin can add server/admin/editor/public contributions without Core source edits.

### Stage 10: Platform Hardening and Contract Readiness

Objective:

- Prove contracts are stable, secure, framework-neutral, and usable by unknown future local plugins.

Work:

- Compatibility tests.
- Local bundle integrity and manifest validation needed by the current runtime.
- Lazy-load and failure-isolation tests.
- Performance budgets.
- Security review.
- Documentation and sample neutral fixture plugin.

Out of scope:

- Marketplace service integration.
- Package signing infrastructure.
- Publisher verification.
- Licensing.
- Remote marketplace distribution.
- Marketplace-specific update orchestration.

Exit gate:

- Full acceptance suite passes and all compliance documents reflect code reality.

## 7. Risk Analysis

### R1: Public Hosting Topology Change

Probability: High

Impact: Critical

Risk:

- Moving from Vite-only public shell to server-rendered documents can break local navigation, asset URLs, CORS assumptions, theme scripts, or deployment topology.

Mitigation:

- Keep JSON renderer API during transition.
- Introduce server document endpoint behind a feature flag first.
- Compare rendered output snapshots.
- Preserve Vite client as progressive enhancement until parity is proven.

### R2: Plugin API Compatibility Break

Probability: High

Impact: High

Risk:

- Removing raw `db/schema` options breaks existing first-party plugins.

Mitigation:

- Introduce scoped SDK first.
- Migrate first-party plugins.
- Add one release-cycle compatibility adapter with deprecation diagnostics if necessary.
- Remove adapter only after forbidden-import and integration tests pass.

### R3: Dynamic Admin Module Loading Complexity

Probability: High

Impact: High

Risk:

- Vite cannot arbitrarily import unknown filesystem modules in production without an explicit bundling strategy.

Mitigation:

- Decide local bundle contract in an ADR before code.
- Evaluate import maps, module federation, prebuilt ESM bundles, or server-served assets.
- Require plugin Admin bundle output in manifest.
- Keep the decision limited to local/current runtime loading; marketplace distribution is out of scope.

### R4: Contributor and Script Security

Probability: Medium

Impact: Critical

Risk:

- Generic document contribution can become an XSS or supply-chain execution path.

Mitigation:

- Structured descriptors only.
- Protocol/attribute allowlists.
- CSP nonce/integrity policy.
- Explicit script capability permission.
- No raw HTML.
- Distribution trust and package signing remain a separate future program.

### R5: Interceptor Deadlocks and Rewrite Loops

Probability: Medium

Impact: High

Mitigation:

- Bounded pipeline.
- Maximum rewrite count.
- Cycle detection.
- Timeout per interceptor.
- Deterministic priority and diagnostics.

### R6: Event Behavior Regression

Probability: Medium

Impact: High

Risk:

- Changing event failure handling can hide errors previously surfaced to producers.

Mitigation:

- Separate optional events from mandatory pipelines.
- Return execution reports.
- Structured logging and metrics.
- Explicit tests for producer success under listener failure.

### R7: Supplemental Save Consistency

Probability: Medium

Impact: High

Risk:

- Core content save succeeds while plugin supplemental save fails.

Mitigation:

- Define non-transactional distributed save semantics explicitly.
- Idempotency keys based on content UUID/revision/plugin.
- Retry-safe handlers.
- UI exposes warning and retry status.
- Required handler mode used sparingly.

### R8: Multiple Capability Providers

Probability: Medium

Impact: Medium

Risk:

- More than one plugin attempts to provide media or another shared capability.

Mitigation:

- Single-active-provider policy per exclusive capability.
- Administrator selection for switchable providers later.
- Conflict rejection and diagnostics.

### R9: Runtime Route Accumulation

Probability: High

Impact: Medium

Risk:

- Fastify routes registered during repeated activation remain allocated.

Mitigation:

- Use dispatcher registries for dynamic public routes.
- Keep namespaced backend APIs registered once and status-guarded in the current process.
- Require process restart for backend bundle replacement until a sandbox runtime is introduced.
- Document the distinction between logical unload and physical module unload.

### R10: Scope Expansion

Probability: High

Impact: High

Risk:

- Platform work drifts into SEO, Analytics, AI, or other business implementation.

Mitigation:

- Every API must be demonstrated by at least two unrelated hypothetical consumers.
- Use neutral fixture plugins in tests.
- Reject domain-specific names in Core contracts.

### R11: Dirty Worktree and Concurrent Changes

Probability: High

Impact: Medium

Risk:

- Repository currently contains many uncommitted user changes.

Mitigation:

- Before each approved stage, capture `git status` and diff baseline.
- Edit narrowly.
- Never revert unrelated changes.
- Commit by stage when requested.

### R12: Generic Metadata Becomes an Unbounded Data Dump

Probability: Medium

Impact: High

Risk:

- Without strict definitions, plugins may store oversized, sensitive, unvalidated, or query-hostile values in Content Metadata.

Mitigation:

- Registered schema and namespace ownership.
- Value and aggregate size limits.
- Explicit visibility and revision policy.
- Indexed query support only for declared scalar fields; arbitrary JSON is not automatically searchable.
- Quota and diagnostics per owner.

### R13: Architecture Scanner False Positives or Easy Bypass

Probability: Medium

Impact: High

Risk:

- Regex-only checks may block valid code while aliases, re-exports, or path traversal bypass forbidden-import rules.

Mitigation:

- Parse source and resolve modules using project TypeScript configuration.
- Test aliases, dynamic imports, re-exports, and relative traversal.
- Keep temporary baseline entries explicit, owned, and expiring.
- Run the scanner against neutral violation fixtures in CI.

## 8. Acceptance Criteria

### Global Platform Acceptance

- No plugin source imports `apps/api/*`, `apps/admin/*`, `internal/*`, or private files from another plugin.
- A new plugin can register server, Admin, editor, event, public document, route, and interceptor capabilities through SDK only.
- Plugin deactivation removes or disables every owned runtime contribution without affecting another plugin.
- Plugin failure does not crash the Admin shell, public document, Core producer, or another plugin.
- Core contains no SEO, Analytics, Forum, LMS, CRM, or AI business logic.
- Public and Admin runtimes support lazy plugin loading strategy.
- SDK contracts are versioned and documented.

### P0-1 Acceptance

- `curl` to `/` and a published content URL returns final HTML.
- Initial response contains page-specific title.
- Initial response contains description, canonical, and robots defaults.
- Correct 200/404 status is returned without JavaScript.
- Theme switch changes presentation without changing document contract.
- `/api/public/*` JSON endpoints continue to work.
- Public Document Host contract tests do not import or require Fastify, Vite, or React.
- Replacing the concrete host adapter does not change plugin contribution contracts.

### P0-2 Acceptance

- Two fixture plugins can contribute different structured descriptor types.
- Exclusive fields resolve deterministically.
- Duplicate descriptors are deduplicated.
- Invalid protocols/attributes are rejected.
- Contributor exception is isolated and logged.
- Deactivate removes contribution immediately.
- No contributor API accepts raw HTML.

### P0-3 Acceptance

- Content SDK supports `getByUuid`, `list`, `listPublished`, `search`, and permalink resolution.
- Pagination has default and maximum limits.
- Draft/deleted access is permission protected.
- DTO does not expose repository internals.
- Existing content routes use the same service.
- Plugin tests do not receive Core DB/schema.

### P0-4 Acceptance

- Event envelope includes version and event ID.
- Content events contain UUID and previous/current slug/status.
- Page and article transitions emit consistent events.
- Payload passes JSON serialization test.
- Event contract tests cover create, update, publish, archive/unpublish, and delete.

### P0-5 Acceptance

- Fixture plugin registers inspector and sidebar through SDK.
- `getContext()` works for new and existing content.
- `onSaved()` receives UUID and revision context.
- Supplemental save is idempotent across autosave.
- Publish checks support pass/warn/block.
- No plugin imports editor internals.
- Plugin deactivate disposes editor registrations.

### P0-6 Acceptance

- Fixture plugin claims a non-reserved root route.
- Duplicate route registration fails with owner diagnostics.
- Reserved Core route claim fails.
- Method, content type, status, and headers use typed response.
- Deactivated route returns normal Core resolution or 404.

### P0-7 Acceptance

- Interceptors run in deterministic order.
- Rewrite and typed response work.
- Rewrite loops terminate safely.
- Timeout/failure is isolated according to policy.
- Inactive plugin interceptor does not run.
- Raw Fastify request/reply is not exposed as public contract.

### P0-8 Acceptance

- Every subscription has an owner and subscription ID.
- Deactivate unregisters only that owner's listeners.
- Optional listener failure does not reject producer.
- Reload does not duplicate listeners.
- Diagnostics report count, owner, last failure, and duration without exposing functions.

### P0-9 Acceptance

- Exclusive, multi-provider, and composite fixture capabilities can be registered and resolved.
- Provider ownership is bound to runtime scope.
- Version mismatch and unavailable provider return typed results.
- Provider conflict resolution is deterministic and diagnostic.
- Deactivation removes only the owner's provider registrations.
- Capability consumers do not import provider implementation packages.

### P0-10 Acceptance

- Metadata definitions require owner namespace and validation schema.
- Two plugins can store metadata on one content UUID without namespace collision.
- A plugin cannot mutate another plugin's namespace.
- Public/admin/private visibility projections are enforced.
- Metadata values are serializable and size-bounded.
- Revision and event behavior follows each metadata definition policy.
- No domain-specific metadata field is added to the universal content model.

### P0-11 Acceptance

- Media SDK supports get, resolve, search, and picker.
- Consumer sees no storage path requirement.
- Search is paginated.
- Picker returns stable DTO.
- Provider inactivity returns capability-unavailable result.
- No consumer plugin imports Media Library implementation.

### P0-12 Acceptance

- Admin plugin list has no hardcoded plugin imports.
- Manifest bundle is the source of Admin runtime loading.
- Server runtime options expose SDK/capabilities only.
- First-party plugins pass forbidden-import scan.
- Runtime scope disposal covers all registration categories.
- Admin plugin crash is contained by an error boundary.
- SDK compatibility mismatch marks plugin broken without crashing platform.

### P0-13 Acceptance

- Root command `pnpm architecture:check` exists and returns non-zero on violations.
- Scanner resolves aliases and relative traversal before applying rules.
- Violations include rule ID, source file, line, resolved target, and remediation.
- Plugin imports of Core internals and other plugin implementations are rejected.
- Temporary baseline entries require owner and expiry.
- CI can run the command without starting database or application services.
- Final P0 state has zero unexpired boundary violations.

## 9. Rollback Strategy

Rollback is stage-based. Every stage must have a working checkpoint before the next begins.

### General Rules

- Do not combine database, runtime, Admin loading, and public hosting changes into one irreversible release.
- Preserve old API contracts behind temporary adapters until replacement acceptance passes.
- Prefer additive schema and contracts first; remove deprecated paths later.
- Every migration must have an explicit downgrade/data-preservation decision.
- Keep a feature flag for new public document host during transition.
- Capture test evidence and runtime diagnostics at every checkpoint.

### Stage 0 Rollback

- Keep scanner initially runnable outside the default build gate.
- If false positives block work, revert CI enforcement while retaining report output and rule tests.
- Baseline entries remain explicit and expiring; do not replace them with broad ignores.

### Stage 1 Rollback

- Keep legacy event API adapter wrapping the new owned bus.
- If ownership regression occurs, switch runtime SDK back to adapter while retaining diagnostics.
- Do not delete old event methods until all consumers migrate.

### Stage 2 Rollback

- Capability registry is additive behind runtime SDK adapters.
- Existing direct SDK services remain available until provider resolution tests pass.
- Remove fixture providers without data changes.

### Stage 3 Rollback

- Existing routes can temporarily call old content query code through an adapter.
- Content DTO additions are backward compatible.
- Event version 1 remains available during one migration window if consumers exist.
- No content data migration should be required.

### Stage 4 Rollback

- Metadata APIs begin additive and can be feature-disabled.
- Preserve stored metadata when disabling the new read/write path.
- Definition registration can be rebuilt from active plugin runtime.
- Do not drop generic metadata persistence during rollback.

### Stage 5 Rollback

- Public registries are additive and disabled by feature flags.
- Public resolver continues existing behavior if registries are disabled.
- Fixture registrations can be removed without data changes.

### Stage 6 Rollback

- Keep Vite SPA public service operational during rollout.
- Route traffic can switch back to the previous host adapter if final-document parity fails.
- `/api/public/render` remains available.
- Do not remove client rendering path until HTTP and adapter contract acceptance pass.

### Stage 7 Rollback

- Keep internal editor registry adapter while Plugin SDK wrapper stabilizes.
- Supplemental save/publish checks can be disabled independently.
- Static Admin registry remains as a temporary development fallback, then must be removed before P0 completion.

### Stage 8 Rollback

- Existing Media Library API remains operational.
- Media SDK adapter can fall back to API transport.
- Do not change asset UUIDs or storage schema.
- Picker host can revert to existing UI flow while preserving SDK DTO.

### Stage 9 Rollback

- Migrate one first-party plugin at a time.
- Retain deprecated runtime capabilities until both first-party plugins pass integration tests.
- Removal of raw DB/schema injection is the final irreversible boundary step and requires clean forbidden-import scan first.

### Stage 10 Rollback

- Hardening changes are separated by concern and reverted independently.
- Keep contract conformance tests even when a performance/security optimization is rolled back.

### Data Safety

- Platform contract phases should not require business plugin table changes.
- Generic Content Metadata persistence uses additive migrations and preserves values during contract rollback.
- Runtime registration metadata remains reconstructable from manifest/runtime load.
- Never delete plugin business data as part of platform rollback.

## 10. Verification and Test Plan

Required automated suites:

- Unit tests for every registry conflict/priority/disposal policy.
- Event failure-isolation and ownership tests.
- Content SDK pagination, filtering, permission, and permalink tests.
- Public document serialization security tests.
- Public interceptor loop/timeout tests.
- Editor supplemental save and publish check tests.
- Media provider availability and picker DTO tests.
- Plugin activation/deactivation/reload tests.
- Forbidden import tests.
- Admin error boundary tests.
- Production build tests for API, Admin, Public, and SDK.

Required end-to-end probes:

```text
curl public home
curl published content
curl missing route
activate fixture plugin
verify contribution
verify public route
verify interceptor
deactivate fixture plugin
verify all contributions disappear
reactivate fixture plugin
verify no duplicate registrations
```

Security verification:

- XSS payloads in descriptor values.
- Unsafe URL protocols.
- Script descriptor policy.
- Redirect/rewrite cycles.
- Regex denial-of-service if pattern matching is supported later.
- Permission bypass attempts.
- Cross-plugin owner spoofing.
- Bundle compatibility and path traversal validation.

## 11. Proposed Neutral Fixture Plugins

Acceptance must not use SEO-specific fixtures.

Use small test-only fixtures:

- `document-fixture`: contributes a harmless meta descriptor and resource hint.
- `route-fixture`: owns `/platform-fixture.txt`.
- `interceptor-fixture`: annotates or rewrites a test path.
- `editor-fixture`: registers an inspector, save receipt, and warning check.
- `content-consumer-fixture`: lists published content through SDK.
- `media-consumer-fixture`: opens picker and resolves selected asset.
- `failure-fixture`: intentionally throws to verify isolation.

These fixtures are test artifacts, not product plugins.

## 12. Expected File Impact During Implementation

This is a forecast, not a list of files changed by this planning task.

Likely Core/API changes:

- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/public/publicWebsiteService.ts` or its replacement modules
- `apps/api/src/routes/public.ts`
- `apps/api/src/routes/posts.ts`
- `apps/api/src/routes/pages.ts`
- `apps/api/src/plugins/pluginEventBus.ts`
- `apps/api/src/plugins/pluginRuntimeLoader.ts`
- `apps/api/src/plugins/pluginLifecycleService.ts`
- Core content metadata schema/migration and metadata service modules
- New public-document/content/runtime/capability modules

Likely Admin changes:

- `apps/admin/src/plugins/registry.ts`
- `apps/admin/src/plugins/pluginManager.ts`
- Editor contracts/registry/runtime/provider files
- Admin bootstrap and plugin host/error boundary

Likely SDK changes:

- `packages/plugin-sdk/src/index.ts`
- New organized SDK contract modules
- Possible deprecation/removal plan for `packages/sdk/src/plugin-sdk.ts`

Likely Public changes:

- `apps/public/src/main.tsx`
- `apps/public/index.html`
- `apps/public/vite.config.ts`
- deployment/start scripts

First-party compliance migration:

- Media Library runtime/editor integration files
- Comments server integration files

Governance/test changes:

- Architecture status documents
- New unit/integration/fixture tests
- Root `package.json` architecture command
- Architecture scanner, rules, resolver, baseline, and report modules
- CI/build integration configuration

## 13. Progress Ledger

Use this section to resume work without repeating the audit.

### Completed on 2026-06-11

- Read task attachment and confirmed audit-only constraint.
- Inventoried all available LOCK documents.
- Audited the original P0-1 through P0-10 scope against current source.
- Audited static imports and internal boundary violations.
- Audited public SPA/render topology.
- Audited content event payloads.
- Audited editor registry and Media Picker coupling.
- Audited event ownership/failure behavior.
- Audited plugin runtime options and lifecycle cleanup.
- Identified stale architecture status documents.
- Created this implementation plan.

### Revised on 2026-06-12

- Replaced the Fastify-oriented host decision with a framework-neutral Public Document Host Contract.
- Promoted Capability Provider Architecture into its own prerequisite phase.
- Added Content Metadata Contract with ownership, persistence, SDK, validation, visibility, and revision rules.
- Removed marketplace-specific implementation work from scope and dependencies.
- Added mandatory Architecture Compliance Automation with `pnpm architecture:check`.
- Reordered execution into Stages 0 through 10.
- Expanded acceptance and rollback criteria for P0-9 through P0-13.
- No implementation code was written.

### Not Started

- No platform implementation.
- No SDK refactor.
- No public rendering refactor.
- No plugin migration.
- No SEO Plugin work.
- No database migration.
- No test fixture implementation.

### Approval Gate

Stop after this document. Implementation starts only after explicit approval of the plan and its execution order.

## 14. Revision Delta from Previous Plan

| Revision request | Previous plan | Revised plan |
|---|---|---|
| Public document host | Recommended Fastify as canonical host | Locks a framework-neutral `PublicDocumentHost` contract; the first adapter is selected later by ADR |
| Provider model | Media capability introduced late | Generic Capability Provider Architecture is Stage 2 and precedes every provider-specific SDK |
| Content metadata | Mentioned only as plugin supplemental data concern | Dedicated Content Metadata Contract is Stage 4 and part of Content Engine infrastructure |
| Marketplace scope | Hardening included marketplace-readiness language | Marketplace-specific implementation is explicitly out of scope and not a dependency |
| Compliance automation | Boundary audit was mainly a test/governance item | `pnpm architecture:check` is mandatory Stage 0 infrastructure and final zero-violation gate |
| Execution order | 9 stages, Media before generic provider foundation | 11 stages, ordered as compliance -> runtime ownership -> capabilities -> content/events -> metadata -> public contracts/host -> editor -> media -> compliance migration -> hardening |

No previous implementation was reverted because implementation had not started. This revision changes only the planning document.

## 15. Final Go/No-Go Recommendation

Recommendation: **GO FOR PLATFORM IMPLEMENTATION AFTER APPROVAL**, using the staged order in Section 6.

The codebase has enough foundations to evolve without a rewrite, but P0 cannot be considered complete until static Admin imports, raw Core runtime injection, client-only public rendering, and unowned runtime registrations are removed.

The success criterion is not that one SEO plugin can be made to work. The success criterion is that an unknown future plugin can use content, editor, public document, route, interceptor, event, and media capabilities through versioned SDK contracts without Core source imports or domain-specific Core modifications.
