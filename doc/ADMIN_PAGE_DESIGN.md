# Modern CMS — Admin Page Design Specification

## 1. Tujuan Halaman Admin

Halaman admin adalah pusat kendali utama Modern CMS. Fungsinya bukan hanya menampilkan status sistem, tetapi menjadi workspace untuk mengelola konten, media, tema, plugin, user, pengaturan website, dan aktivitas sistem.

Arah desain: **modern, ringan, modular, dan siap berkembang seperti WordPress tetapi dengan pengalaman SaaS dashboard yang lebih rapi**.

Prinsip utama:

- Admin harus terasa cepat dan jelas.
- Informasi penting terlihat tanpa membuka banyak menu.
- Menu CMS harus mudah dipahami oleh pengguna non-teknis.
- Struktur harus siap untuk plugin dan theme marketplace di masa depan.
- Dashboard awal tidak boleh terlalu padat, tetapi harus cukup informatif.

---

## 2. Gaya Visual

### Tema Utama

Gunakan tema gelap modern untuk tahap awal:

- Background utama: dark navy / near black.
- Card: dark glass panel dengan border halus.
- Aksen utama: violet / blue.
- Aksen status sukses: green.
- Aksen warning: amber.
- Aksen error: red.

### Karakter Desain

- Clean dashboard layout.
- Rounded cards.
- Soft shadows.
- Subtle gradient background.
- Sidebar tetap/sticky.
- Topbar ringkas.
- Typography besar untuk heading dan metric.
- Status badge jelas.
- Table sederhana, readable, dan tidak terlalu ramai.

---

## 3. Struktur Layout Admin

```text
Admin Layout
├─ Sidebar Navigation
├─ Topbar
└─ Main Content Area
   ├─ Page Header
   ├─ Summary Cards
   ├─ Dashboard Widgets
   ├─ Tables / Lists
   └─ Quick Actions
```

### 3.1 Sidebar Navigation

Sidebar adalah navigasi utama admin.

Isi sidebar MVP:

```text
Modern CMS Logo

Dashboard

CONTENT
- Pages
- Posts
- Media

APPEARANCE
- Themes
- Plugins

PEOPLE
- Users

CONFIGURATION
- Settings
- Analytics

Site Switcher / Site Status
View Site Button
Collapse Menu
```

Catatan:

- `Dashboard` aktif secara default.
- `Themes` dan `Plugins` boleh tampil sejak awal, tetapi halaman detailnya dapat berupa placeholder sampai sistemnya siap.
- `Analytics` boleh placeholder dulu.
- `View Site` mengarah ke public site.

### 3.2 Topbar

Topbar berisi aksi global.

Isi topbar:

```text
Search anything...
+ New button
Notification icon
Help icon
Admin profile dropdown
```

Fungsi:

- Search untuk mencari konten, media, page, post, plugin, dan user.
- `+ New` untuk membuat post/page/media/user secara cepat.
- Notification untuk update sistem, plugin, komentar, error, atau aktivitas penting.
- Profile dropdown untuk account settings dan logout.

### 3.3 Main Content Area

Main content berubah sesuai route aktif.

Route awal:

```text
/admin/dashboard
/admin/pages
/admin/posts
/admin/media
/admin/themes
/admin/plugins
/admin/users
/admin/settings
/admin/analytics
```

---

## 4. Dashboard Admin

Dashboard adalah halaman pertama setelah login.

### 4.1 Header Dashboard

Komponen:

```text
Title: Dashboard
Subtitle: Welcome back. Here is what is happening with your site.
Date filter: Last 7 days / Last 30 days / Custom
```

### 4.2 Summary Cards

Empat card utama:

#### Total Content

Menampilkan total konten CMS.

Data:

```text
Total content count
Posts count
Pages count
Weekly growth
Mini sparkline
```

#### Published Pages

Data:

```text
Published pages
Draft pages
Scheduled pages
```

#### Media Files

Data:

```text
Total media files
Images count
Other files count
Storage usage later
```

#### Active Plugins

Data:

```text
Active plugins
Inactive plugins
Update status
```

Untuk fase awal, data boleh mock/static dulu, lalu nanti dihubungkan ke database.

---

## 5. Dashboard Widgets

### 5.1 System Status

Widget ini penting karena CMS akan berjalan di hosting yang berbeda-beda.

Isi:

```text
API status
Database status
Node.js version
CMS version
Storage status
Environment
Migration status
```

Status badge:

```text
Healthy
Warning
Error
```

Aksi:

```text
Run Health Check
```

Untuk fase sekarang, widget ini bisa memakai endpoint:

```text
GET /health
GET /api/system/info
GET /api/database/health
```

### 5.2 Recent Content

Tabel konten terbaru.

Kolom:

```text
Title
Type
Status
Author
Updated At
Actions
```

Status:

```text
Published
Draft
Scheduled
Archived
```

Aksi row:

```text
Edit
View
Duplicate
Delete
```

### 5.3 Quick Actions

Grid tombol cepat:

```text
New Post
New Page
Upload Media
Add User
Install Plugin
View Site
```

Untuk MVP awal:

- `New Post` dan `New Page` boleh mengarah ke placeholder dulu.
- `View Site` bisa aktif lebih awal.
- `Install Plugin` baru aktif setelah plugin system tersedia.

### 5.4 Recent Activity

Timeline aktivitas CMS.

Contoh activity:

```text
Admin published a post
Editor updated a page
User uploaded media
Plugin was activated
System migration completed
```

Untuk MVP, activity log bisa ditunda sampai ada tabel `activity_logs`.

### 5.5 Site Traffic

Analytics ringan.

Data:

```text
Visitors
Page views
Bounce rate
Top pages
```

Untuk fase awal, widget ini boleh placeholder. Jangan integrasikan analytics berat dulu.

---

## 6. Halaman Pages

Tujuan: mengelola halaman statis seperti Home, About, Contact, Pricing.

Komponen:

```text
Page title: Pages
Button: New Page
Search input
Status filter
Table pages
Bulk action
```

Kolom table:

```text
Title
Slug
Status
Author
Updated At
Actions
```

Aksi:

```text
Edit
View
Duplicate
Move to Trash
```

Status page:

```text
Draft
Published
Scheduled
Archived
```

MVP awal cukup list + create/edit sederhana.

---

## 7. Halaman Posts

Tujuan: mengelola artikel/blog.

Komponen:

```text
Page title: Posts
Button: New Post
Search input
Category filter
Status filter
Table posts
```

Kolom:

```text
Title
Category
Status
Author
Published At
Updated At
Actions
```

Fitur lanjutan:

```text
Tags
Categories
Featured image
SEO meta
Scheduled publish
Revision history
```

---

## 8. Halaman Media

Tujuan: mengelola file upload.

Komponen:

```text
Page title: Media Library
Upload button
Drag and drop upload area
Grid/list toggle
Search media
Folder/filter
```

Card media:

```text
Thumbnail
File name
Mime type
Size
Uploaded date
Actions
```

Aksi:

```text
Preview
Copy URL
Rename
Delete
```

Untuk fase awal, media upload dibuat setelah auth dan content CRUD lebih stabil.

---

## 9. Halaman Themes

Tujuan: mengelola tampilan public site.

Komponen:

```text
Active Theme card
Available Themes grid
Theme preview
Activate button
Customize button
```

Data theme:

```text
Name
Version
Author
Description
Screenshot
Compatibility
```

MVP awal:

- Satu default theme.
- Theme aktif dari database/settings.
- Customize bisa placeholder.

---

## 10. Halaman Plugins

Tujuan: mengelola fitur tambahan.

Komponen:

```text
Installed Plugins table
Install Plugin button
Search plugin
Status filter
```

Kolom:

```text
Plugin
Version
Status
Permissions
Updated At
Actions
```

Aksi:

```text
Activate
Deactivate
Settings
Uninstall
```

MVP awal:

- Plugin manifest reader.
- Tampilkan plugin lokal dari folder `plugins/`.
- Belum perlu install dari marketplace.

---

## 11. Halaman Users

Tujuan: mengelola pengguna admin CMS.

Komponen:

```text
Users table
Add User button
Role filter
Status filter
```

Kolom:

```text
Name / Username
Email
Role
Status
Last Login
Created At
Actions
```

Role awal:

```text
Admin
Editor
Author
```

Status user:

```text
Active
Suspended
Pending
```

---

## 12. Halaman Settings

Tujuan: mengelola pengaturan website.

Tabs:

```text
General
Writing
Reading
Media
SEO
Security
Advanced
```

### General

```text
Site Name
Site Description
Site URL
Admin Email
Timezone
Language
```

### Writing

```text
Default post status
Default author
Default category
```

### Reading

```text
Homepage setting
Posts per page
Public visibility
```

### Media

```text
Upload max size
Allowed mime types
Image thumbnail sizes
```

### Security

```text
Session lifetime
Login protection
Password policy
```

### Advanced

```text
Maintenance mode
Cache clear
Environment info
Migration status
```

---

## 13. Halaman Analytics

Untuk awal, halaman ini boleh placeholder.

Nanti bisa berisi:

```text
Traffic overview
Top pages
Referrers
Search keywords
Device stats
Content performance
```

Jangan buat analytics terlalu cepat. CMS core lebih penting.

---

## 14. Empty State dan Error State

Setiap halaman harus punya empty state.

Contoh:

```text
No pages yet.
Create your first page to start building your site.
[Create Page]
```

Error state:

```text
Database connection failed.
Check your DATABASE_URL and make sure MySQL is running.
[Retry]
[Open Setup Guide]
```

Loading state:

```text
Skeleton card
Skeleton table row
Spinner kecil hanya untuk action button
```

---

## 15. Responsive Design

Desktop adalah prioritas pertama.

Breakpoint:

```text
Desktop: full sidebar + dashboard grid
Tablet: collapsible sidebar + 2-column cards
Mobile: sidebar drawer + single column cards
```

Untuk fase awal, cukup pastikan desktop rapi. Mobile bisa menyusul setelah core UI stabil.

---

## 16. Komponen UI yang Perlu Dibuat

Komponen layout:

```text
AdminLayout
Sidebar
Topbar
PageHeader
Breadcrumbs
```

Komponen dashboard:

```text
MetricCard
SystemStatusCard
RecentContentTable
QuickActionsGrid
ActivityTimeline
TrafficChartCard
```

Komponen umum:

```text
Button
Card
Badge
Table
Input
Select
Dropdown
Modal
Tabs
Toast
EmptyState
ErrorState
Skeleton
```

Jangan buat semua sekaligus. Mulai dari layout dan dashboard card dulu.

---

## 17. Prioritas Implementasi Admin UI

### Phase Admin UI-A: Layout Foundation

Target:

```text
AdminLayout
Sidebar
Topbar
Dashboard route
Responsive desktop layout
```

### Phase Admin UI-B: System Dashboard Integration

Target:

```text
Fetch /api/system/info
Fetch /api/database/health
Fetch /api/settings
Show API/database status
Show environment/runtime info
```

### Phase Admin UI-C: Auth UI

Target:

```text
Login page
Logout action
Auth state
Protected dashboard
/api/auth/me integration
```

### Phase Admin UI-D: Content UI Foundation

Target:

```text
Pages list
Posts list
Create/edit content form
Status badges
```

### Phase Admin UI-E: Media, Theme, Plugin Placeholder

Target:

```text
Media page placeholder
Themes page placeholder
Plugins page placeholder
Settings page basic form
```

---

## 18. Admin Dashboard MVP Data Contract

Dashboard sebaiknya mengambil data dari beberapa endpoint kecil.

Awal:

```text
GET /api/system/info
GET /api/database/health
GET /api/settings
```

Nanti:

```text
GET /api/admin/dashboard/summary
GET /api/admin/recent-content
GET /api/admin/recent-activity
GET /api/admin/system/health
```

Contoh dashboard summary:

```json
{
  "content": {
    "total": 156,
    "posts": 98,
    "pages": 58,
    "published": 42,
    "drafts": 8
  },
  "media": {
    "total": 1248,
    "images": 1102,
    "others": 146
  },
  "plugins": {
    "active": 18,
    "inactive": 2,
    "updatesAvailable": 0
  },
  "system": {
    "api": "healthy",
    "database": "healthy",
    "environment": "development"
  }
}
```

---

## 19. Catatan Produk

Admin page jangan terlalu cepat dibuat menjadi kompleks. Desain boleh modern, tapi implementasi harus bertahap.

Urutan yang benar:

```text
1. Layout admin stabil.
2. Auth stabil.
3. Dashboard status nyata.
4. Settings UI.
5. Content CRUD.
6. Media manager.
7. Theme manager.
8. Plugin manager.
9. Marketplace.
```

Halaman admin harus terasa seperti CMS sejak awal, tetapi jangan memalsukan fitur yang belum ada. Untuk fitur yang belum siap, gunakan placeholder dengan label jelas:

```text
Coming soon
Available after Content Module is enabled
Plugin runtime is not installed yet
```

---

## 20. Ringkasan Desain Admin

Admin Modern CMS terdiri dari:

```text
Sidebar navigation
Topbar global action
Dashboard overview
System/database health
Recent content
Quick actions
Pages management
Posts management
Media library
Theme manager
Plugin manager
User management
Settings panel
Analytics placeholder
```

Fokus MVP admin:

```text
Dashboard + Auth + Settings + Content CRUD
```

Fitur setelah MVP:

```text
Media manager + Theme manager + Plugin manifest + Analytics + Marketplace
```

