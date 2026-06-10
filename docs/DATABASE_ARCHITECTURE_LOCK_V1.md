# DATABASE_ARCHITECTURE_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_PLATFORM_LOCK_V1
* PLUGIN_DATABASE_OWNERSHIP_LOCK_V1
* PLUGIN_MIGRATION_SYSTEM_LOCK_V1
* PLUGIN_LIFECYCLE_LOCK_V1
* API_ARCHITECTURE_LOCK_V1

---

# 1. Purpose

Dokumen ini mengunci arsitektur database ModernCMS.

Tujuan utama:

* Mencegah plugin mencemari Core Database.
* Menjaga ownership data.
* Menjaga skalabilitas 10+ tahun.
* Menjamin plugin dapat diinstall dan diuninstall secara independen.

---

# 2. Core Principle

Core Database hanya menyimpan data platform.

Plugin Database menyimpan data produk.

Core bukan tempat seluruh tabel aplikasi.

---

# 3. Database Ownership

Setiap tabel memiliki owner tunggal.

Contoh:

```text
users
roles
permissions
```

Owner:

```text
Core Platform
```

---

Contoh:

```text
media_files
media_folders
```

Owner:

```text
Media Library Plugin
```

---

Contoh:

```text
blog_posts
blog_categories
```

Owner:

```text
Blog Plugin
```

---

# 4. Core Database Rule

Core hanya boleh memiliki tabel platform.

---

# 5. Core Tables

Diperbolehkan:

```text
users
roles
permissions
user_roles

settings

plugins
themes

sessions

content
content_revisions
content_categories
content_tags

audit_logs
```

Jika suatu tabel bukan kebutuhan platform:

Tabel tersebut tidak boleh masuk Core.

---

# 6. Plugin Tables

Plugin wajib membawa tabelnya sendiri.

Contoh:

Media Library:

```text
media_files
media_folders
media_folder_items
```

---

Blog:

```text
blog_posts
blog_categories
blog_comments
```

---

Forum:

```text
forum_threads
forum_posts
forum_replies
```

---

LMS:

```text
lms_courses
lms_lessons
lms_quizzes
```

---

# 7. Forbidden Rule

Plugin tidak boleh menambahkan tabel ke Core Schema.

SALAH:

```text
apps/api/src/database/schema.ts

+ media_files
```

---

BENAR:

```text
plugins/media-library/migrations/*
```

---

# 8. Plugin Migration Ownership

Migration dimiliki plugin.

Core hanya menjalankan migration.

Core tidak mengetahui isi migration.

---

# 9. Plugin Migration Location

Standar:

```text
plugins/{plugin-id}/migrations/
```

Contoh:

```text
plugins/media-library/migrations
plugins/blog/migrations
plugins/forum/migrations
```

---

# 10. Plugin Storage Ownership

Setiap plugin memiliki storage sendiri.

Contoh:

```text
plugins/media-library/storage
plugins/blog/storage
plugins/forum/storage
```

---

# 11. Cross Plugin Access Rule

Plugin tidak boleh membaca tabel plugin lain secara langsung.

SALAH:

```sql
SELECT * FROM blog_posts
```

dari Media Library.

---

BENAR:

```text
API
SDK
Event
```

---

# 12. Foreign Key Rule

Cross-plugin foreign key fisik tidak dianjurkan.

Karena plugin dapat diuninstall.

Gunakan logical reference.

Contoh:

```text
media_uuid
content_uuid
user_id
```

---

# 13. UUID Direction

Future Direction:

Seluruh data bisnis plugin sebaiknya menggunakan UUID.

Bukan auto increment sebagai identitas publik.

---

# 14. Migration Registry

Core memiliki Migration Registry.

Registry hanya menyimpan:

```text
plugin
migration
status
executed_at
```

Core tidak menyimpan isi migration.

---

# 15. Install Rule

Saat install:

```text
discover plugin

↓

validate

↓

execute migration

↓

mark installed
```

---

# 16. Uninstall Rule

Saat uninstall:

Administrator memilih:

```text
Remove Plugin Only
```

atau

```text
Full Clean
```

---

# 17. Remove Plugin Only

Yang dihapus:

```text
runtime
menus
routes
events
```

Yang tetap ada:

```text
tables
storage
settings
data
```

---

# 18. Full Clean

Yang dihapus:

```text
runtime
tables
storage
settings
permissions
```

---

# 19. Backup Rule

Backup harus mengenali ownership.

Backup dapat dilakukan:

```text
core only
plugin only
full system
```

---

# 20. Restore Rule

Restore harus mendukung:

```text
core restore
plugin restore
full restore
```

---

# 21. Plugin Export Rule

Plugin dapat mengekspor:

```text
schema
data
settings
storage
```

secara independen.

---

# 22. Plugin Import Rule

Plugin dapat mengimpor:

```text
schema
data
settings
storage
```

secara independen.

---

# 23. Marketplace Compatibility

Plugin Marketplace wajib membawa migration sendiri.

Tidak boleh meminta Core Schema dimodifikasi manual.

---

# 24. SaaS Compatibility

Database Architecture harus mendukung:

```text
single tenant
multi tenant
workspace
organization
```

tanpa perubahan fondasi.

---

# 25. Enterprise Compatibility

Harus mendukung:

```text
plugin install
plugin remove
plugin migrate
plugin backup
plugin restore
```

secara independen.

---

# 26. Media Library Example

Media Library wajib memiliki:

```text
plugins/media-library/migrations
plugins/media-library/storage
```

dan memiliki ownership penuh terhadap:

```text
media_files
media_folders
media_folder_items
```

Core tidak boleh memiliki tabel tersebut.

---

# 27. Content Engine Exception

Content Engine dianggap Platform Service.

Tabel seperti:

```text
contents
content_revisions
content_categories
content_tags
```

boleh berada di Core.

Karena merupakan fondasi CMS.

---

# 28. Settings Exception

Settings Engine dianggap Platform Service.

Tabel settings berada di Core.

---

# 29. Permission Exception

Permission Engine dianggap Platform Service.

Tabel permission berada di Core.

---

# 30. User Exception

User Management dianggap Platform Service.

Tabel user berada di Core.

---

# 31. Architecture Lock

Database Ownership mengikuti Ownership Layer.

Core menyimpan data platform.

Plugin menyimpan data produk.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
