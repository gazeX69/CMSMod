# Modern CMS — Article Create UI/UX Design Specification

## 1. Tujuan Dokumen

Dokumen ini mendesain halaman **Create Article** untuk admin Modern CMS.

Halaman ini digunakan untuk membuat artikel editorial seperti blog post, berita, tutorial, pengumuman, atau konten dinamis lain. Desain ini dibuat setelah fase normalisasi database konten, dengan asumsi model data sudah mendukung:

- `content_types`
- `contents`
- `content_revisions`
- `categories`
- `tags`
- `content_categories`
- `content_tags`

Prinsip utama:

```text
Artikel adalah content item dengan content type = article.
Kategori dan tag bukan jenis konten.
Kategori dan tag adalah taxonomy yang berelasi many-to-many dengan artikel.
```

---

## 2. Posisi Halaman dalam Admin CMS

Route yang disarankan:

```text
/admin/content/articles/new
```

Alternatif route:

```text
/admin/articles/new
```

Rekomendasi final:

```text
/admin/content/articles/new
```

Alasan:

- Lebih konsisten dengan CMS modular.
- Nanti bisa ada `/admin/content/pages/new`.
- Nanti bisa ada custom content type seperti product, event, course, portfolio.
- Struktur URL admin tetap scalable.

Navigasi sidebar:

```text
Content
├─ Articles
│  ├─ All Articles
│  └─ New Article
├─ Pages
├─ Categories
└─ Tags
```

---

## 3. Prinsip UX

Halaman create article harus terasa seperti editor profesional, tetapi jangan terlalu berat pada versi awal.

Prinsip:

```text
1. Fokus utama adalah menulis artikel.
2. Metadata penting tetap mudah diakses.
3. Publish tidak boleh terjadi tanpa validasi.
4. Slug otomatis, tetapi bisa diedit manual.
5. Kategori dan tag harus mendukung many-to-many.
6. Draft harus bisa disimpan sebelum artikel lengkap.
7. Preview harus tersedia sebelum publish.
8. UI harus tetap ringan dan bisa dikembangkan ke block editor nanti.
```

Untuk MVP, editor boleh memakai textarea/rich textarea dulu. Jangan langsung membuat page builder kompleks.

---

## 4. Layout Utama

Gunakan layout dua kolom:

```text
┌──────────────────────────────────────────────────────────────┐
│ Topbar: Search / Quick Create / Notification / User          │
├───────────────┬──────────────────────────────────────────────┤
│ Sidebar       │ Page Header                                  │
│               │ Create Article                               │
│               │ Draft / Unsaved status                       │
│               ├──────────────────────────────┬───────────────┤
│               │ Main Editor                  │ Sidebar Panel │
│               │                              │ Publish       │
│               │ Title                        │ Categories    │
│               │ Slug                         │ Tags          │
│               │ Body Editor                  │ Featured Img  │
│               │ Excerpt                      │ SEO           │
│               │                              │ Author        │
└───────────────┴──────────────────────────────┴───────────────┘
```

Desktop layout:

```text
Main editor width: 65–70%
Right panel width: 30–35%
```

Mobile/tablet behavior:

```text
Main editor full width.
Right panel collapses into accordion sections below editor.
Action buttons remain sticky at bottom or top.
```

---

## 5. Page Header

Komponen header:

```text
[← Back to Articles]

Create Article
Write and publish a new article for your website.

Status: Unsaved / Draft / Published
```

Action kanan atas:

```text
[Preview] [Save Draft] [Publish]
```

Aturan tombol:

```text
Preview:
- disabled jika belum ada title dan body.
- membuka preview draft di tab/modal.

Save Draft:
- aktif jika ada perubahan.
- menyimpan artikel dengan status draft.

Publish:
- aktif jika validasi minimum terpenuhi.
- membuka confirm dialog sebelum publish.
```

Status indicator:

```text
Unsaved changes
Saving...
Saved as draft
Published
Failed to save
```

---

## 6. Main Editor Area

### 6.1 Title Field

Label:

```text
Article Title
```

Placeholder:

```text
Enter article title...
```

UX:

```text
- Field besar, seperti judul dokumen.
- Auto-focus saat halaman dibuka.
- Saat title berubah, slug otomatis dibuat jika slug belum diedit manual.
```

Validasi:

```text
Required untuk publish.
Optional untuk draft, tetapi jika kosong gunakan "Untitled Article" di list.
Max length: 180 karakter.
```

Mapping database:

```text
contents.title
```

---

### 6.2 Slug / Permalink Field

Tampilan:

```text
Permalink
https://example.com/articles/[slug]
```

Input:

```text
cara-membuat-cms-modern
```

UX:

```text
- Slug otomatis dari title.
- User bisa klik "Edit".
- Setelah user edit manual, auto-generate dari title berhenti.
- Tombol "Regenerate" tersedia.
```

Validasi:

```text
- lowercase
- spasi menjadi hyphen
- karakter ilegal dihapus
- unique per content_type_id
```

Mapping database:

```text
contents.slug
```

Constraint database:

```text
UNIQUE(content_type_id, slug)
```

---

### 6.3 Body Editor

MVP editor:

```text
Textarea atau simple rich text editor.
```

Target jangka menengah:

```text
Block editor ringan.
```

Tab editor:

```text
[Write] [Preview]
```

MVP layout:

```text
Write:
- textarea besar
- dukung Markdown atau HTML sederhana

Preview:
- render body sementara
```

Toolbar awal:

```text
Bold
Italic
Heading
Quote
Link
Image
List
Code
```

Untuk MVP, toolbar boleh belum lengkap. Yang penting body bisa disimpan.

Mapping database:

```text
contents.body
content_revisions.body
```

Validasi:

```text
Required untuk publish.
Optional untuk draft.
```

---

### 6.4 Excerpt Field

Section:

```text
Excerpt
Short summary shown in article lists, SEO snippets, and theme archive pages.
```

UX:

```text
- Textarea kecil.
- Max 300 karakter.
- Counter karakter.
- Optional.
- Jika kosong, sistem bisa generate dari body pada fase berikutnya.
```

Mapping database:

```text
contents.excerpt
```

---

## 7. Right Sidebar Panels

Right sidebar berisi panel-panel kecil. Urutan disarankan:

```text
1. Publish
2. Categories
3. Tags
4. Featured Image
5. SEO Preview
6. Author
```

---

## 8. Publish Panel

Isi panel:

```text
Status
Visibility
Publish Date
Revision
Actions
```

Untuk MVP:

```text
Status:
- Draft
- Published
- Archived

Visibility:
- Public only for now
```

Actions:

```text
[Save Draft]
[Publish]
```

Publish confirmation:

```text
Title: Publish this article?
Message: This article will become visible on the public website.
Actions: Cancel / Publish Article
```

Rules:

```text
Draft:
- boleh title/body kosong.
- tidak tampil di website publik.

Published:
- title required.
- slug required.
- body required.
- published_at diisi jika belum ada.

Archived:
- tidak tampil di website publik.
```

Mapping database:

```text
contents.status
contents.published_at
```

---

## 9. Categories Panel

Karena kategori relasinya many-to-many, UI harus mendukung multiple selection.

Tampilan:

```text
Categories
[Search categories...]

☐ News
☐ Tutorials
☐ Announcements
☐ Development

[+ Add New Category]
```

UX rules:

```text
- User bisa memilih lebih dari satu kategori.
- Search kategori tersedia jika data banyak.
- Add New Category membuka inline form kecil.
- Kategori baru langsung bisa dipilih.
- Jika artikel belum disimpan, pilihan kategori disimpan di form state.
```

Inline add category:

```text
Name: [________]
Slug: auto-generated
Parent: optional, boleh ditunda
[Add]
```

MVP constraint:

```text
- Parent category boleh belum dibuat di UI awal.
- Minimal: create flat category.
```

Mapping database:

```text
categories
content_categories
```

Relationship:

```text
contents.id many-to-many categories.id
```

Business rule:

```text
Hanya content type article yang boleh memakai categories.
Page tidak memakai categories pada versi awal.
```

---

## 10. Tags Panel

Tag juga many-to-many.

Tampilan:

```text
Tags
[Type and press Enter...]

Selected:
[CMS] [TypeScript] [Modern Web]
```

UX rules:

```text
- User bisa mengetik tag baru.
- User bisa memilih tag existing dari autocomplete.
- Enter membuat tag baru jika belum ada.
- Tag bisa dihapus dari artikel dengan klik x.
```

Mapping database:

```text
tags
content_tags
```

Business rule:

```text
Hanya content type article yang boleh memakai tags.
Page tidak memakai tags pada versi awal.
```

---

## 11. Featured Image Panel

Panel:

```text
Featured Image
[Select Image]
```

Jika sudah dipilih:

```text
Thumbnail
filename.jpg
[Change] [Remove]
```

MVP:

```text
- Boleh hanya menyiapkan UI placeholder.
- Media manager penuh bisa datang setelah media module selesai.
```

Mapping masa depan:

```text
contents.featured_image_id
```

Catatan:

Jika schema `featured_image_id` belum ada, jangan memaksakan field ini pada fase create article awal. Dokumentasikan sebagai pending enhancement.

---

## 12. SEO Preview Panel

Panel:

```text
SEO Preview
```

Isi:

```text
Title preview
https://example.com/articles/slug
Excerpt preview
```

MVP:

```text
- Generate preview dari title, slug, dan excerpt.
- Belum perlu meta title/meta description terpisah.
```

Future:

```text
- seo_title
- seo_description
- canonical_url
- open_graph_image
```

Jangan tambahkan tabel SEO dulu kecuali sudah masuk fase SEO module.

---

## 13. Author Panel

Panel:

```text
Author
Current admin/editor
```

MVP:

```text
- Default author = current authenticated user.
- Jika auth belum selesai, boleh nullable atau pakai seeded admin user.
```

Mapping database:

```text
contents.author_id
```

Rules:

```text
Admin:
- bisa memilih author.

Editor:
- bisa memilih author jika permission mengizinkan.

Author:
- otomatis dirinya sendiri.
```

Untuk versi awal, cukup tampilkan current user setelah auth siap.

---

## 14. Required API Contract

Halaman create article membutuhkan API ini.

### 14.1 Create Draft Article

```http
POST /api/admin/articles
```

Payload:

```json
{
  "title": "Getting Started with Modern CMS",
  "slug": "getting-started-with-modern-cms",
  "excerpt": "A short introduction to Modern CMS.",
  "body": "<p>Article body...</p>",
  "status": "draft",
  "categoryIds": [1, 2],
  "tagIds": [1, 3]
}
```

Response:

```json
{
  "ok": true,
  "article": {
    "id": 1,
    "type": "article",
    "title": "Getting Started with Modern CMS",
    "slug": "getting-started-with-modern-cms",
    "status": "draft"
  }
}
```

---

### 14.2 Publish Article

```http
POST /api/admin/articles/:id/publish
```

Rules:

```text
- validates title
- validates slug
- validates body
- sets status = published
- sets published_at if empty
- creates revision snapshot
```

---

### 14.3 Category APIs

```http
GET /api/admin/categories
POST /api/admin/categories
```

---

### 14.4 Tag APIs

```http
GET /api/admin/tags
POST /api/admin/tags
```

---

### 14.5 Slug Availability

```http
GET /api/admin/articles/slug-check?slug=example
```

Response:

```json
{
  "available": true,
  "suggestedSlug": "example"
}
```

If unavailable:

```json
{
  "available": false,
  "suggestedSlug": "example-2"
}
```

---

## 15. Form State Design

State minimal:

```ts
type ArticleFormState = {
  title: string;
  slug: string;
  slugManuallyEdited: boolean;
  excerpt: string;
  body: string;
  status: "draft" | "published" | "archived";
  categoryIds: number[];
  tagIds: number[];
  featuredImageId?: number | null;
};
```

UI state:

```ts
type ArticleEditorUiState = {
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  lastSavedAt?: string;
  error?: string;
  activeEditorTab: "write" | "preview";
};
```

---

## 16. Validation Rules

Draft validation:

```text
Draft boleh disimpan walaupun belum lengkap.
Jika title kosong, backend boleh menyimpan sebagai "Untitled Article".
Slug boleh dibuat otomatis.
```

Publish validation:

```text
Required:
- title
- slug
- body

Recommended:
- at least one category
- excerpt

Not required:
- tags
- featured image
```

Error display:

```text
- Error field-level tampil di bawah field.
- Error global tampil di atas form.
- Publish error tampil di confirm modal atau publish panel.
```

---

## 17. Empty, Loading, and Error States

Loading categories:

```text
Loading categories...
```

No categories:

```text
No categories yet.
[Create first category]
```

Loading tags:

```text
Loading tags...
```

No tags:

```text
No tags yet. Type a new tag and press Enter.
```

Save error:

```text
Failed to save article. Please try again.
```

Slug conflict:

```text
This slug is already used. Suggested: example-2
```

---

## 18. Autosave Strategy

MVP:

```text
Manual Save Draft only.
```

Do not implement autosave in the first UI version.

Future:

```text
- Autosave every 30 seconds.
- Save local draft in browser if network fails.
- Show recovery prompt after reload/crash.
```

Reason:

Autosave introduces complexity:

```text
- conflict resolution
- revision spam
- draft locking
- network retry
- dirty state bugs
```

Manual save is safer for the first stable content editor.

---

## 19. Revision Strategy

On save draft:

```text
- update current content row
- optionally create revision only on explicit major save
```

On publish:

```text
- create content revision snapshot
- set status = published
- set published_at
```

MVP recommendation:

```text
Create a revision on publish and on update after publish.
Do not create revision for every keystroke.
```

---

## 20. Access Control

Required roles later:

```text
Admin
Editor
Author
```

MVP permission expectation:

```text
Admin:
- create/edit/publish all articles

Editor:
- create/edit/publish articles
- cannot manage system settings

Author:
- create article
- edit own draft
- submit/publish depending on policy
```

For first implementation, if RBAC is not fully ready:

```text
Require authenticated admin user only.
```

---

## 21. Responsive Design

Desktop:

```text
Two-column editor.
Right sidebar sticky.
```

Tablet:

```text
Main editor full width.
Sidebar panels stack below editor.
```

Mobile:

```text
Single column.
Action buttons sticky bottom.
Panels collapse as accordions.
```

Minimum supported width:

```text
360px
```

---

## 22. Visual Design Direction

Style:

```text
Modern SaaS CMS
Clean dark dashboard
Soft cards
Clear typography
High contrast input fields
Subtle purple/blue accent
```

Recommended color tokens:

```text
background: #0b1020
surface: #111827
surface-soft: #1f2937
border: rgba(255,255,255,0.08)
text-primary: #f9fafb
text-secondary: #9ca3af
accent: #7c3aed
success: #22c55e
warning: #f59e0b
danger: #ef4444
```

Input style:

```text
Large rounded fields
Clear border on focus
No overly decorative effects in editor area
```

Article editor should prioritize readability over heavy glass effects.

---

## 23. Suggested Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Articles                                  Preview  Save Draft  Publish   │
│ Create Article                                                             │
│ Write and publish a new article.                                           │
├───────────────────────────────────────────────┬────────────────────────────┤
│ Article Title                                 │ Publish                    │
│ [Enter article title...]                      │ Status: Draft              │
│                                               │ [Save Draft] [Publish]     │
│ Permalink                                     ├────────────────────────────┤
│ /articles/[slug-field] [Edit]                 │ Categories                 │
│                                               │ [Search...]                │
│ Editor                                        │ ☑ Tutorials                │
│ [Write] [Preview]                             │ ☐ News                     │
│ ┌───────────────────────────────────────────┐ │ [+ Add Category]           │
│ │ Body editor                               │ ├────────────────────────────┤
│ │                                           │ │ Tags                       │
│ │                                           │ │ [CMS] [TypeScript]         │
│ └───────────────────────────────────────────┘ │ [type tag...]              │
│                                               ├────────────────────────────┤
│ Excerpt                                       │ Featured Image             │
│ [Short summary...]                            │ [Select Image]             │
│                                               ├────────────────────────────┤
│                                               │ SEO Preview                │
│                                               │ Title / URL / Excerpt      │
└───────────────────────────────────────────────┴────────────────────────────┘
```

---

## 24. Implementation Phases

### Article UI Phase A — Static Layout

Goal:

```text
Build route and static UI only.
```

Tasks:

```text
- Add route /admin/content/articles/new
- Build admin layout if not already stable
- Create static CreateArticlePage
- Add title, slug, body, excerpt, category panel, tag panel, publish panel
- No API integration yet
```

Validation:

```text
- Admin app builds
- Page opens without blank screen
- Layout responsive enough
```

---

### Article UI Phase B — Form State

Goal:

```text
Make the form interactive without backend persistence.
```

Tasks:

```text
- Title updates state
- Slug auto-generates
- Manual slug edit works
- Category selection mock works
- Tag input mock works
- Save Draft button shows mock state
```

Validation:

```text
- No runtime errors
- No hook order issues
- Form does not lose local state unexpectedly
```

---

### Article UI Phase C — API Integration

Goal:

```text
Connect page to Content CRUD API.
```

Requires backend first:

```text
- POST /api/admin/articles
- GET /api/admin/categories
- POST /api/admin/categories
- GET /api/admin/tags
- POST /api/admin/tags
```

Tasks:

```text
- Load categories and tags
- Save draft to backend
- Create join table relations
- Display save errors
```

---

### Article UI Phase D — Publish Flow

Goal:

```text
Support publish with validation.
```

Tasks:

```text
- Publish validation
- Confirm modal
- Call publish endpoint
- Show published state
- Redirect or stay on editor after publish
```

---

### Article UI Phase E — Preview

Goal:

```text
Preview article before publish.
```

Tasks:

```text
- Add draft preview route or modal
- Render body preview
- Later connect to active theme preview
```

---

## 25. What Not To Build Yet

Do not build these in the first Create Article UI phase:

```text
- Full block editor
- Full media manager
- Drag-and-drop layout builder
- Marketplace blocks
- AI writing assistant
- Autosave
- Collaboration
- Realtime editing
- Version compare UI
- Scheduled publish
- Private/password-protected posts
```

These can be added after basic content creation is stable.

---

## 26. Recommended Next Backend Phase Before UI

Before implementing API-integrated create article UI, complete:

```text
Phase 1-D: Content CRUD API for Pages and Articles
```

Required backend endpoints:

```text
GET    /api/admin/articles
POST   /api/admin/articles
GET    /api/admin/articles/:id
PUT    /api/admin/articles/:id
DELETE /api/admin/articles/:id
POST   /api/admin/articles/:id/publish

GET    /api/admin/categories
POST   /api/admin/categories

GET    /api/admin/tags
POST   /api/admin/tags
```

After that:

```text
Phase 1-E: Create Article UI
```

---

## 27. Acceptance Criteria

The Create Article UI is considered acceptable when:

```text
1. Admin can open /admin/content/articles/new.
2. Admin can enter title, slug, body, and excerpt.
3. Slug auto-generates from title.
4. Admin can select multiple categories.
5. Admin can add/select multiple tags.
6. Admin can save article as draft.
7. Admin can publish article after required fields are valid.
8. Data is persisted to contents table.
9. Category relation is persisted to content_categories.
10. Tag relation is persisted to content_tags.
11. Page does not crash on refresh.
12. Build passes.
```

---

## 28. Summary

The Create Article page should be designed around this structure:

```text
Main editor:
- title
- slug
- body
- excerpt

Sidebar:
- publish controls
- categories
- tags
- featured image placeholder
- SEO preview
- author

Behavior:
- draft first
- publish with validation
- categories many-to-many
- tags many-to-many
- no autosave initially
- no block editor initially
```

This gives Modern CMS a clean, scalable article creation workflow without overbuilding too early.
