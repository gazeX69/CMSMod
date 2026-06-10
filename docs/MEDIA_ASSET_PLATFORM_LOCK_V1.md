# MEDIA_ASSET_PLATFORM_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_ARCHITECTURE_LOCK_V1
* PLUGIN_PLATFORM_LOCK_V1
* PLUGIN_MIGRATION_SYSTEM_LOCK_V1
* PLUGIN_DATABASE_OWNERSHIP_LOCK_V1

Owner:

* Media Library Plugin

---

# 1. Purpose

Media Library bukan sekadar tempat upload file.

Media Library adalah Asset Platform.

Seluruh plugin dalam ekosistem ModernCMS harus menggunakan sistem aset yang sama.

Contoh:

* Blog
* Pages
* Forum
* LMS
* CRM
* E-Commerce

Tidak boleh membuat sistem media sendiri-sendiri.

---

# 2. Core Principle

Media Asset harus independen dari:

* URL
* Domain
* CDN
* Storage Provider
* File Name

Asset harus tetap valid meskipun seluruh infrastruktur berubah.

---

# 3. Asset Identity

Identitas utama media adalah:

UUID

Contoh:

```text
550e8400-e29b-41d4-a716-446655440000
```

Dilarang menggunakan:

```text
id
path
filename
url
```

sebagai identitas permanen.

---

# 4. Asset Reference Rule

Plugin lain tidak boleh menyimpan URL media.

SALAH:

```text
https://cdn.example.com/image.jpg
```

SALAH:

```text
/uploads/image.jpg
```

BENAR:

```text
550e8400-e29b-41d4-a716-446655440000
```

---

# 5. Asset Resolution

Semua URL harus dihasilkan secara dinamis.

Flow:

Asset UUID

↓

Media Resolver

↓

Public URL

↓

Client

Plugin lain tidak boleh membangun URL sendiri.

---

# 6. Media Asset Structure

Minimal field:

```text
uuid
filename
originalName
mimeType
extension
size
disk
path
altText
caption
metadata
createdAt
updatedAt
deletedAt
```

---

# 7. Storage Independence

Media Asset tidak boleh bergantung pada storage tertentu.

Harus dapat dipindahkan antara:

* Local Storage
* S3
* MinIO
* Cloudflare R2
* Google Cloud Storage
* Azure Blob

tanpa mengubah referensi asset.

---

# 8. CDN Independence

Media Asset tidak boleh bergantung pada domain tertentu.

Harus mendukung:

```text
no CDN
single CDN
multi CDN
```

tanpa mengubah data asset.

---

# 9. Replace File Rule

File boleh diganti.

UUID tidak berubah.

Contoh:

Asset:

```text
UUID-A
```

Upload gambar lama

↓

Digunakan di 500 artikel

↓

Replace File

↓

Upload gambar baru

↓

500 artikel otomatis memakai gambar baru

---

# 10. Delete Rule

Delete tidak langsung menghapus file.

Tahap pertama:

Soft Delete

Asset masuk Trash.

---

# 11. Restore Rule

Asset yang di-soft delete dapat dipulihkan.

UUID tetap sama.

Referensi tetap sama.

---

# 12. Permanent Delete Rule

Permanent Delete hanya dilakukan jika:

* asset berada di trash
* pengguna memiliki izin
* konfirmasi dilakukan

Setelah permanent delete:

* file fisik dihapus
* metadata dihapus
* asset tidak dapat dipulihkan

---

# 13. Asset Relation Rule

Plugin lain tidak boleh membuat foreign key langsung ke tabel media.

Gunakan UUID.

Contoh:

Blog:

```text
featuredImageUuid
```

Forum:

```text
attachmentUuid
```

LMS:

```text
thumbnailUuid
```

---

# 14. Rich Text Rule

Editor tidak boleh menyimpan URL absolut.

Target format:

```html
<img data-media-uuid="UUID" />
```

URL dibangun saat rendering.

---

# 15. Media Picker Standard

Media Library wajib menyediakan Media Picker.

Media Picker adalah layanan platform.

Plugin lain tidak membuat picker sendiri.

Contoh pengguna:

* Blog Editor
* Page Builder
* LMS Lesson Editor
* Forum Post Editor

---

# 16. Picker Return Format

Minimal:

```text
uuid
publicUrl
altText
caption
mimeType
```

---

# 17. Media Folder Rule

Folder adalah organisasi visual.

Folder bukan identitas asset.

Memindahkan file ke folder lain tidak boleh mengubah UUID.

---

# 18. Media Tag Rule

Asset dapat memiliki:

* tags
* labels
* categories

Untuk kebutuhan pencarian.

---

# 19. Asset Search Rule

Pencarian harus mendukung:

* filename
* alt text
* caption
* mime type
* tags

---

# 20. Asset Versioning Direction

Future Ready.

Asset dapat memiliki versi.

Contoh:

```text
v1
v2
v3
```

Tanpa mengubah UUID utama.

---

# 21. Upload Lifecycle

Saat upload berhasil:

Event dipancarkan.

Contoh:

```text
media.uploaded
```

Plugin lain dapat berlangganan.

Contoh:

* SEO Plugin
* Image Optimizer
* AI Alt Text Generator

---

# 22. Long Term Compatibility

Harus mendukung:

* Marketplace Plugins
* Multi Tenant
* Cloud Storage
* Headless CMS
* CDN
* Asset Versioning
* Asset Optimization
* AI Metadata Generation

tanpa mengubah prinsip dasar dokumen ini.

---

# 23. Architecture Lock

Media Library adalah Asset Platform.

Bukan sekadar File Upload Manager.

Seluruh plugin ModernCMS wajib mengikuti sistem asset ini.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
