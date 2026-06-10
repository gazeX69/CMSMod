# PLUGIN_MIGRATION_SYSTEM_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_ARCHITECTURE_LOCK_V1
* PLUGIN_PLATFORM_LOCK_V1

---

# 1. Purpose

Dokumen ini mengunci sistem migration plugin ModernCMS.

Tujuan utama:

* Memastikan plugin memiliki database schema sendiri.
* Memastikan Core tidak memiliki schema bisnis plugin.
* Mendukung install, uninstall, reinstall, dan upgrade plugin secara aman.
* Menjadi fondasi seluruh plugin masa depan.

Contoh:

* Media Library
* Blog
* Forum
* LMS
* CRM
* E-Commerce

---

# 2. Core Principle

Migration Core dan Migration Plugin adalah dua hal berbeda.

Core hanya bertanggung jawab terhadap schema platform.

Plugin bertanggung jawab terhadap schema produk miliknya sendiri.

---

# 3. Core Migration Ownership

Core hanya boleh memiliki tabel yang benar-benar dibutuhkan platform.

Contoh:

* users
* roles
* sessions
* settings
* plugins
* content engine tables
* theme engine tables

Core tidak boleh memiliki tabel bisnis plugin.

Contoh yang tidak boleh berada di Core:

* media_files
* blog_posts
* forum_threads
* lms_courses
* crm_customers

---

# 4. Plugin Migration Ownership

Setiap plugin memiliki migration sendiri.

Contoh:

plugins/media-library/migrations/

plugins/blog/migrations/

plugins/forum/migrations/

Plugin adalah pemilik penuh schema tersebut.

---

# 5. Migration Folder Standard

Struktur standar:

plugins/media-library/

├─ migrations/
│  ├─ 0001_create_media_assets.sql
│  ├─ 0002_add_asset_uuid.sql
│  └─ ...
│
└─ plugin.json

Migration tidak boleh dicampur ke migration Core.

---

# 6. Install Flow

Ketika administrator memilih Install:

1. Validate Plugin Manifest
2. Validate Dependencies
3. Discover Migration Folder
4. Execute Pending Plugin Migrations
5. Create Plugin Storage
6. Register Plugin Installation
7. Set Status = INSTALLED

---

# 7. Activate Flow

Ketika administrator memilih Activate:

1. Verify Plugin Installed
2. Enable Routes
3. Enable API
4. Enable Menu
5. Enable UI

Migration tidak dijalankan lagi.

---

# 8. Deactivate Flow

Ketika administrator memilih Deactivate:

1. Disable Routes
2. Disable API
3. Disable Menu
4. Disable UI

Database tetap ada.

Storage tetap ada.

Data tetap ada.

---

# 9. Uninstall Keep Data Flow

Ketika administrator memilih:

Uninstall → Keep Data

Yang terjadi:

1. Deactivate Plugin
2. Remove Plugin Registration
3. Preserve Migration History
4. Preserve Database
5. Preserve Storage

Data tetap tersedia.

Plugin dapat dipasang kembali tanpa kehilangan data.

---

# 10. Uninstall Clean Flow

Ketika administrator memilih:

Uninstall → Clean

Yang terjadi:

1. Deactivate Plugin
2. Execute Plugin Rollback
3. Remove Plugin Database
4. Remove Plugin Storage
5. Remove Plugin Metadata
6. Remove Plugin Registration

Plugin dihapus sepenuhnya.

---

# 11. Reinstall Flow

Jika plugin sebelumnya dihapus menggunakan Keep Data:

Install ulang harus:

1. Mendeteksi migration history lama
2. Mendeteksi database lama
3. Mendeteksi storage lama
4. Menggunakan kembali data lama

Contoh:

Install
→ Upload 1000 media

Uninstall Keep Data

Install Ulang

→ 1000 media tetap tersedia

---

# 12. Migration History

Core harus menyimpan histori migration plugin.

Contoh konsep:

plugin_migrations

* plugin_id
* migration_name
* executed_at

Tujuan:

* mengetahui migration yang sudah dijalankan
* mencegah migration ganda
* mendukung upgrade plugin

---

# 13. Upgrade Flow

Ketika plugin diperbarui:

1. Compare Installed Version
2. Compare Migration History
3. Execute New Migrations
4. Update Version

Contoh:

1.0.0
→ 1.1.0

Migration:

0003_add_thumbnail_support.sql

dijalankan otomatis.

---

# 14. Rollback Rule

Rollback hanya berlaku untuk migration milik plugin tersebut.

Media Library tidak boleh melakukan rollback migration Blog.

Blog tidak boleh melakukan rollback migration Forum.

Ownership harus ketat.

---

# 15. Long-Term Compatibility

Sistem migration harus mendukung:

* Marketplace Plugins
* SaaS Multi-Tenant
* Remote Plugin Installation
* Cloud Deployment
* Plugin Upgrade
* Plugin Downgrade
* Plugin Dependency Management

tanpa mengubah prinsip dasar dokumen ini.

---

# 16. Architecture Lock

Semua plugin ModernCMS wajib mengikuti sistem migration ini.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
