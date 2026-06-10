# ModernCMS (CMS MOD )

ModernCMS adalah CMS modern berbasis **Plugin First Application Platform**. Core dibuat kecil dan stabil; fitur bisnis seperti Media Library, Blog, SEO, Forum, LMS, CRM, E-Commerce, AI, dan Analytics hidup sebagai plugin. Theme hanya menjadi presentation layer, sedangkan public website dirender dari kombinasi Content Engine, Theme System, Media Resolver, Settings, Navigation, Search, dan plugin aktif.

## Status Singkat

Fondasi yang sudah ada:

- API backend dengan Fastify.
- Admin Panel dengan React + Vite.
- Public Website renderer awal dengan React + Vite.
- Plugin lifecycle: `DISCOVERED`, `INSTALLING`, `INSTALLED`, `ACTIVE`, `INACTIVE`, `BROKEN`, `UNINSTALLED`.
- Plugin Migration Engine awal.
- Permission System backend.
- Settings System + server-side SDK.
- Event Bus synchronous awal.
- Media Library plugin.
- Theme default dan template public.
- Public API untuk content, navigation, search, dan render.

## Struktur Folder

```text
CMSC/
  apps/
    api/              Backend API, database, routes, plugin runtime, public API
    admin/            Admin Panel shell dan editor/admin UI
    public/           Public Website rendering shell

  packages/
    core/             Fondasi core platform
    sdk/              SDK platform/theme awal
    plugin-sdk/       Kontrak dan tipe resmi plugin
    shared/           Tipe/utilitas shared

  plugins/
    media-library/    Plugin Media Library
    contact-form/     Manifest plugin contoh
    gallery/          Manifest plugin contoh
    seo-basic/        Manifest plugin contoh

  themes/
    default/          Theme default untuk public rendering

  storage/
    media/            File upload media dan thumbnail

  docs/               Dokumen lock arsitektur dan roadmap
  doc/                Catatan/diagram desain tambahan
  scripts/            Script utilitas development
```

## Path Penting

```text
apps/api/src/app.ts                         Registrasi Fastify app dan route utama
apps/api/src/server.ts                      Entry server API
apps/api/src/database/schema.ts             Schema database platform
apps/api/src/database/migrate.ts            Runner migration
apps/api/src/database/seed.ts               Seed data awal

apps/api/src/plugins/pluginLifecycleService.ts
apps/api/src/plugins/pluginRuntimeLoader.ts
apps/api/src/plugins/pluginEventBus.ts
apps/api/src/plugins/pluginCli.ts

apps/api/src/permissions/permissionService.ts
apps/api/src/settings/settingsService.ts
apps/api/src/public/publicWebsiteService.ts

apps/api/src/routes/public.ts               Public Website API
apps/api/src/routes/plugins.ts              Plugin lifecycle API
apps/api/src/routes/settings.ts             Settings API

apps/admin/src/app/App.tsx                  Admin shell utama
apps/admin/src/plugins/registry.ts          Registry admin plugin sementara

apps/public/src/main.tsx                    Public Website shell
apps/public/src/styles.css                  Styling public shell/theme base

plugins/media-library/plugin.json           Manifest Media Library
plugins/media-library/server/routes.ts      API Media Library
plugins/media-library/server/schema.ts      Schema plugin Media Library
plugins/media-library/migrations/           Migration milik plugin Media Library

themes/default/theme.json                   Manifest theme default
themes/default/templates/                   Template public theme
```

## Prasyarat

- Node.js versi modern.
- pnpm.
- MySQL/MariaDB, misalnya XAMPP MariaDB.
- Database bernama `modern_cms`.

## Instalasi

Install dependency:

```bash
pnpm install
```

Salin environment:

```bash
cp .env.example .env
```

Di Windows PowerShell, jika `cp` tidak tersedia:

```powershell
Copy-Item .env.example .env
```

Pastikan database `modern_cms` sudah dibuat di MySQL/MariaDB.

Contoh konfigurasi `.env`:

```env
PORT=4000
HOST=127.0.0.1

VITE_API_URL=http://127.0.0.1:4000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=modern_cms
DATABASE_URL=mysql://root:@127.0.0.1:3306/modern_cms

ADMIN_EMAIL=admin@moderncms.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=adminpassword123

SESSION_COOKIE_NAME=modern_cms_session
SESSION_TTL_DAYS=7

STORAGE_PATH=./storage
```

## Database

Jalankan migration:

```bash
pnpm --filter @modern-cms/api db:migrate
```

Jalankan seed:

```bash
pnpm --filter @modern-cms/api db:seed
```

Seed membuat data awal seperti:

- Role `Admin`, `Editor`, `Author`.
- User admin default jika belum ada.
- Core settings.
- Public homepage starter dengan slug `home`.
- Navigation awal.
- Plugin default di tabel plugin.

Login admin default:

```text
username: admin
password: adminpassword123
```

Atau sesuai `.env`.

## Cara Menjalankan Aplikasi

Jalankan API:

```bash
pnpm dev:api
```

API default:

```text
http://127.0.0.1:4000
```

Health check:

```text
http://127.0.0.1:4000/health
```

Jalankan Admin Panel:

```bash
pnpm dev:admin
```

Admin default:

```text
http://localhost:5173
```

Jalankan Public Website:

```bash
pnpm dev:public
```

Public website default:

```text
http://localhost:5174
```

Jika port public sudah dipakai, gunakan port lain:

```bash
pnpm --filter @modern-cms/public dev -- --host 127.0.0.1 --port 5186
```

Lalu buka:

```text
http://127.0.0.1:5186
```

## Build

Build semua workspace:

```bash
pnpm build
```

Build package tertentu:

```bash
pnpm --filter @modern-cms/api build
pnpm --filter @modern-cms/admin build
pnpm --filter @modern-cms/public build
pnpm --filter @modern-cms/plugin-media-library build
```

## Public Website Ecosystem

Public website bukan halaman hardcoded. Public app adalah shell yang memanggil Rendering Layer API.

Public API utama:

```text
GET /api/public/render?path=/
GET /api/public/render?path=/search&q=ModernCMS
GET /api/public/content/home
GET /api/public/content/by-slug/:slug
GET /api/public/content?type=page
GET /api/public/navigation/:location
GET /api/public/search?q=keyword
```

Public renderer melakukan:

```text
Route Resolver
Content Resolver
Template Resolver
Theme Renderer
Media UUID Resolver
Navigation Resolver
SEO fallback
```

Content publik hanya tampil jika:

```text
status = published
publishedAt <= now
deletedAt = null
```

Draft, review, scheduled masa depan, archived, dan deleted tidak boleh tampil di Public API.

## Theme System

Theme default ada di:

```text
themes/default
```

Manifest:

```text
themes/default/theme.json
```

Template:

```text
themes/default/templates/layout.html
themes/default/templates/home.html
themes/default/templates/page.html
themes/default/templates/content.html
themes/default/templates/search.html
themes/default/templates/error.html
```

Active theme disimpan di setting:

```text
theme.active = default
```

Theme hanya menerima data dari rendering layer. Theme tidak boleh query database langsung dan tidak boleh menyimpan business logic.

## Media Asset Platform

Media Library adalah plugin, bukan fitur hardcoded Core.

Path penting:

```text
plugins/media-library
plugins/media-library/plugin.json
plugins/media-library/server/routes.ts
plugins/media-library/server/schema.ts
plugins/media-library/migrations/
storage/media/
```

Identitas media harus memakai UUID.

Format rich text yang benar:

```html
<img data-media-uuid="550e8400-e29b-41d4-a716-446655440000" />
```

Saat public render, Media Resolver mengubah menjadi:

```html
<img src="/api/media/resolve/550e8400-e29b-41d4-a716-446655440000" data-media-uuid="550e8400-e29b-41d4-a716-446655440000" />
```

## Plugin System

ModernCMS memakai lifecycle plugin resmi:

```text
DISCOVERED
INSTALLING
INSTALLED
ACTIVE
INACTIVE
BROKEN
UNINSTALLED
```

Endpoint lifecycle:

```text
GET  /api/admin/plugins
POST /api/admin/plugins/sync
POST /api/admin/plugins/:key/install
POST /api/admin/plugins/:key/activate
POST /api/admin/plugins/:key/deactivate
POST /api/admin/plugins/:key/uninstall
POST /api/admin/plugins/:key/toggle
```

Plugin migration manual:

```bash
pnpm --filter @modern-cms/api plugin:migrate media-library
```

Plugin harus mendaftarkan capability melalui `plugin.json`, misalnya:

- permissions
- settings
- events
- storage
- migrations
- admin entry
- backend entry

Core tidak boleh punya logic seperti:

```ts
if (plugin.id === "media-library") {}
```

Yang benar: plugin mendaftarkan dirinya lewat manifest dan runtime contract.

## Permission System

Permission engine ada di Core Platform.

Tabel utama:

```text
users
roles
permissions
user_roles
role_permissions
plugin_permissions
```

Middleware:

```ts
requirePermission("media.read")
requirePermission("plugins.manage")
requirePermission("settings.manage")
requirePermission("content.publish")
```

Contoh permission:

```text
media.read
media.create
media.update
media.delete

content.read
content.create
content.update
content.publish
content.delete

plugins.manage
settings.manage
permissions.manage
```

Security utama ada di API backend, bukan hanya di UI.

## Settings System

Settings adalah konfigurasi tunggal platform/plugin/theme.

Service:

```text
apps/api/src/settings/settingsService.ts
```

API:

```text
GET /api/admin/settings/public
GET /api/admin/settings/scope/:scope
GET /api/admin/settings/:key
PUT /api/admin/settings/:key
```

Contoh setting:

```text
system.site_name
system.site_description
system.site_url
theme.active
public.homepage_slug
media.max_upload_size_mb
media.allowed_groups
```

Plugin harus memakai SDK/settings service, bukan query tabel settings langsung.

## Event System

Event Bus awal bersifat synchronous.

Path:

```text
apps/api/src/plugins/pluginEventBus.ts
```

Envelope event:

```json
{
  "event": "media.uploaded",
  "timestamp": "2026-06-04T00:00:00.000Z",
  "source": "media-library",
  "payload": {}
}
```

Event awal:

```text
media.uploaded
media.deleted
media.restored
content.created
content.updated
content.published
content.deleted
plugin.installed
plugin.activated
plugin.deactivated
plugin.uninstalled
settings.updated
```

## Admin Panel

Admin Panel adalah shell application, bukan tempat business logic plugin.

Admin shell menyediakan:

- sidebar
- topbar
- workspace
- plugin loader
- editor shell
- settings/plugins view awal

Plugin menyediakan page/product UI sendiri.

Admin path:

```text
apps/admin
```

## Public App

Public app path:

```text
apps/public
```

Public app tidak membuat halaman seperti `Home.tsx`, `About.tsx`, `Blog.tsx` berisi data manual. Ia membaca URL browser, memanggil:

```text
/api/public/render?path=...
```

lalu menampilkan HTML hasil renderer.

## Command Penting

```bash
pnpm install
pnpm build

pnpm dev:api
pnpm dev:admin
pnpm dev:public

pnpm --filter @modern-cms/api db:migrate
pnpm --filter @modern-cms/api db:seed
pnpm --filter @modern-cms/api plugin:migrate media-library

pnpm --filter @modern-cms/public dev -- --host 127.0.0.1 --port 5186
```

## Port Default

```text
API            http://127.0.0.1:4000
Admin Panel    http://localhost:5173
Public Site    http://localhost:5174
```

Jika port bentrok, jalankan dengan port lain.

## Catatan Development Penting

Project ini masih memiliki beberapa area yang memakai artefak build.

Workflow aman:

```text
Edit Code
Build
Run / Restart
Test
```

Setelah mengubah source code:

```bash
pnpm build
```

Lalu restart service yang sedang diuji:

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:public
```

Jika runtime berbeda dengan source yang sedang dilihat, penyebab paling umum adalah build belum dijalankan atau service masih memakai artefak lama.

## Batasan Saat Ini

Beberapa area masih tahap fondasi:

- Admin plugin registry frontend masih static import untuk Media Library.
- Plugin public route registry belum final.
- Content Engine belum sepenuhnya memakai UUID asli untuk semua content.
- SEO masih fallback basic, belum plugin SEO penuh.
- Navigation sudah ada di database, tetapi Admin UI untuk mengelola navigation belum dibuat.
- Blog belum dibuat sebagai plugin public route.
- Marketplace masih belum menjadi distribution layer penuh.

## Rekomendasi Tahap Berikutnya

Urutan yang disarankan:

1. Buat Plugin Public Route Registry.
2. Finalisasi Content Engine universal dengan UUID dan metadata.
3. Buat Navigation Admin UI.
4. Tambahkan SEO metadata contract dan SEO Plugin.
5. Tambahkan archive/category/tag public endpoints.
6. Pindahkan Admin plugin registry ke dynamic runtime.
7. Lanjutkan Blog sebagai plugin, bukan Core route hardcoded.

## Prinsip Arsitektur

```text
Core = platform kecil dan stabil
Plugin = domain bisnis independen
SDK = pintu komunikasi resmi
Runtime = pemuat plugin
Lifecycle = status install/aktif/nonaktif/uninstall
Migration = milik plugin
Storage = milik plugin
API = namespace plugin
Permission = didaftarkan ke Core Permission System
Settings = lewat Core Settings System
Event = komunikasi antar plugin
Admin = shell, bukan tempat business logic
Theme = presentation layer
Public Website = rendering layer
```

Support The Project

If ModernCMS helps you or you want to support long-term development, consider supporting the project:

☕ Trakteer

https://trakteer.id/gazeX69

Every contribution helps support development, infrastructure costs, testing, and future features.