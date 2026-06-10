# API_ARCHITECTURE_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_PLATFORM_LOCK_V1
* PLUGIN_DATABASE_OWNERSHIP_LOCK_V1
* CONTENT_ENGINE_LOCK_V1
* MEDIA_ASSET_PLATFORM_LOCK_V1
* EVENT_SYSTEM_LOCK_V1
* PERMISSION_SYSTEM_LOCK_V1

---

# 1. Purpose

Dokumen ini mengunci arsitektur API ModernCMS.

Tujuan:

* Memisahkan API Platform dan API Plugin.
* Mendukung Headless CMS.
* Mendukung Marketplace.
* Mendukung Integrasi Pihak Ketiga.
* Menjaga boundary antara Core dan Plugin.

---

# 2. Core Principle

Core API menyediakan layanan platform.

Plugin API menyediakan layanan produk.

Core tidak boleh menjadi tempat seluruh endpoint bisnis.

---

# 3. API Categories

ModernCMS memiliki empat kategori API:

```text
Core API
Plugin API
Public API
Internal API
```

---

# 4. Core API

Dimiliki Platform.

Contoh:

```text
/auth
/users
/roles
/permissions
/plugins
/themes
/settings
/content
/search
```

Core API tidak boleh mengandung endpoint bisnis plugin.

---

# 5. Plugin API

Dimiliki Plugin.

Contoh:

Media Library:

```text
/api/media/*
```

Blog:

```text
/api/blog/*
```

Forum:

```text
/api/forum/*
```

LMS:

```text
/api/lms/*
```

---

# 6. Public API

Digunakan untuk konsumsi eksternal.

Contoh:

```text
/api/public/content
/api/public/search
/api/public/media
```

Tidak memerlukan akses admin.

---

# 7. Internal API

Digunakan antar layanan platform.

Tidak diekspos ke publik.

Contoh:

```text
plugin lifecycle
event processing
migration processing
scheduler
queue
```

---

# 8. Ownership Rule

Setiap endpoint memiliki owner tunggal.

Contoh:

```text
/api/media/*
```

Owner:

```text
Media Library Plugin
```

---

# 9. Route Namespace Rule

Format:

```text
/api/{plugin-id}/*
```

Contoh:

```text
/api/media/*
/api/blog/*
/api/forum/*
```

---

# 10. Reserved Namespace

Dimiliki Core.

```text
/api/auth/*
/api/users/*
/api/roles/*
/api/plugins/*
/api/themes/*
/api/settings/*
/api/content/*
```

Plugin tidak boleh menggunakannya.

---

# 11. Authentication Rule

API tidak boleh mempercayai frontend.

Authentication wajib dilakukan di backend.

---

# 12. Authorization Rule

Seluruh endpoint wajib memvalidasi permission.

Tidak boleh hanya menyembunyikan tombol.

---

# 13. Headless Rule

Seluruh fitur platform harus dapat diakses melalui API.

Admin Panel bukan syarat agar sistem bekerja.

---

# 14. Plugin Isolation

Plugin tidak boleh memanggil database plugin lain secara langsung.

Jika membutuhkan data:

* API resmi
* SDK resmi
* Event System

---

# 15. Response Standard

Minimal:

Successful:

```json
{
  "success": true,
  "data": {}
}
```

Failed:

```json
{
  "success": false,
  "error": ""
}
```

---

# 16. Error Standard

API wajib memberikan:

```text
error code
message
```

Bukan stack trace.

---

# 17. Pagination Rule

List endpoint wajib mendukung:

```text
page
limit
sort
filter
```

---

# 18. Search Rule

Search endpoint wajib mendukung:

```text
query
filter
sort
```

---

# 19. Versioning Rule

Future Ready.

Format:

```text
/api/v1/
/api/v2/
```

---

# 20. Plugin Upgrade Compatibility

Plugin tidak boleh merusak API plugin lain.

Perubahan breaking harus menggunakan versi baru.

---

# 21. Media Library Example

Media Library memiliki:

```text
/api/media/files
/api/media/folders
/api/media/trash
/api/media/settings
```

Core tidak mengetahui detail endpoint tersebut.

---

# 22. Blog Example

Blog memiliki:

```text
/api/blog/posts
/api/blog/categories
/api/blog/comments
```

Core tidak mengetahui detail endpoint tersebut.

---

# 23. LMS Example

LMS memiliki:

```text
/api/lms/courses
/api/lms/lessons
/api/lms/quizzes
```

Core tidak mengetahui detail endpoint tersebut.

---

# 24. API Documentation

Setiap plugin wajib menyediakan dokumentasi API sendiri.

Core tidak mendokumentasikan endpoint plugin.

---

# 25. Marketplace Compatibility

Plugin Marketplace harus dapat menambahkan endpoint tanpa mengubah Core API.

---

# 26. Multi Tenant Direction

Future Ready.

Endpoint harus dapat berkembang menjadi:

```text
tenant aware
workspace aware
organization aware
```

---

# 27. Rate Limiting Direction

Future Ready.

API dapat menerapkan:

```text
rate limiting
throttling
quotas
```

---

# 28. API Gateway Direction

Future Ready.

Core dapat menggunakan:

```text
gateway
proxy
edge layer
```

tanpa mengubah kontrak API.

---

# 29. Long Term Compatibility

Arsitektur API harus mendukung:

* Headless CMS
* Mobile Apps
* SPA
* Marketplace
* SaaS
* Enterprise
* Third Party Integrations

tanpa mengubah fondasi.

---

# 30. Architecture Lock

API adalah Service Layer.

Bukan UI Layer.

Bukan Database Layer.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
