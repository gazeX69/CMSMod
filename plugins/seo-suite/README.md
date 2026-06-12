# ModernCMS SEO Suite

SEO Suite is the first-party search optimization plugin for ModernCMS. It is implemented entirely through public plugin contracts and owns its redirect schema and migration.

## Features

- Per-content SEO title, meta description, focus keyword, canonical URL, robots directives, breadcrumb title, schema type, and sitemap exclusion.
- Open Graph and Twitter/X metadata with independent titles, descriptions, images, and card type.
- Real-time editor score, snippet preview, actionable checks, supplemental save, and publish warnings.
- Site-wide content health dashboard and average optimization score.
- JSON-LD `@graph` for Organization, WebSite, WebPage, BreadcrumbList, and configurable Article types.
- XML sitemap with automatic invalidation, noindex/exclusion filtering, absolute URLs, and cache headers.
- Managed robots.txt with sitemap discovery.
- 301, 302, 307, and 308 redirect manager with hit counts and lifecycle-aware interception.
- Search appearance templates and knowledge graph organization settings.
- Deterministic structured document contribution without raw head HTML injection.

## Public URLs

- `/sitemap.xml`
- `/robots.txt`

## Admin API

- `GET|PUT /api/seo/content/:uuid`
- `GET /api/seo/admin/overview`
- `GET|PUT /api/seo/admin/settings`
- `GET|POST /api/seo/admin/redirects`
- `PUT|DELETE /api/seo/admin/redirects/:id`

## Permissions

- `seo.read`
- `seo.edit`
- `seo.manage`

## Development

```bash
pnpm --filter @modern-cms/plugin-seo-suite test
pnpm --filter @modern-cms/plugin-seo-suite build
pnpm --filter @modern-cms/api plugin:migrate seo-suite
```
