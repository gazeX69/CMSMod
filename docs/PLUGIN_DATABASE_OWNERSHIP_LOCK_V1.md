# PLUGIN_DATABASE_OWNERSHIP_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_ARCHITECTURE_LOCK_V1
* PLUGIN_PLATFORM_LOCK_V1
* PLUGIN_MIGRATION_SYSTEM_LOCK_V1

---

# 1. Purpose

Dokumen ini mengunci kepemilikan database pada ModernCMS.

Tujuan:

* Memisahkan Platform dan Product secara tegas.
* Mencegah Core menjadi tempat seluruh tabel aplikasi.
* Memastikan plugin dapat dipasang dan dilepas secara independen.
* Memastikan uninstall clean dan uninstall keep data dapat dilakukan dengan aman.

---

# 2. Ownership Principle

Setiap tabel harus memiliki pemilik tunggal.

Tidak boleh ada tabel tanpa owner.

Owner hanya dapat berupa:

* Core Platform
* Plugin

Tidak ada kategori lain.

---

# 3. Core Database Ownership

Core hanya boleh memiliki tabel yang dibutuhkan untuk menjalankan platform.

Contoh:

Authentication

* users
* sessions
* user_roles
* roles

Platform

* settings
* plugins
* plugin_migrations

Content Engine

* contents
* content_revisions
* categories
* tags
* content_categories
* content_tags

Theme Engine

* themes
* theme_settings

Jika suatu tabel tidak dibutuhkan untuk menjalankan platform, maka tabel tersebut tidak boleh berada di Core.

---

# 4. Plugin Database Ownership

Plugin adalah pemilik penuh tabel bisnisnya.

Contoh:

Media Library

* media_files
* media_folders
* media_tags
* media_relations

Blog

* blog_posts
* blog_comments

Forum

* forum_threads
* forum_posts

LMS

* lms_courses
* lms_lessons

CRM

* crm_customers
* crm_notes

Core tidak boleh memiliki tabel tersebut.

---

# 5. Ownership Rule

Plugin hanya boleh memodifikasi tabel yang dimilikinya.

Contoh:

Media Library

boleh:

* INSERT media_files
* UPDATE media_files
* DELETE media_files

tidak boleh:

* UPDATE blog_posts
* DELETE forum_threads
* ALTER users

---

# 6. Cross Plugin Access Rule

Plugin tidak boleh mengakses tabel plugin lain secara langsung.

SALAH:

Media Library membaca tabel blog_posts.

SALAH:

Forum membaca tabel lms_courses.

BENAR:

Plugin berkomunikasi melalui API atau SDK resmi.

---

# 7. Shared Reference Rule

Jika plugin perlu mereferensikan data plugin lain:

gunakan identifier.

Bukan foreign key database lintas plugin.

Contoh:

featured_image_uuid

bukan:

featured_image_id -> media_files.id

Tujuan:

* plugin tetap independen
* uninstall plugin tidak merusak schema plugin lain

---

# 8. Media Library Rule

Media Library adalah Plugin.

Media Library bukan bagian Core.

Tabel berikut wajib dimiliki Plugin Media Library:

* media_files
* media_folders
* media_tags
* media_relations

Tabel tersebut tidak boleh berada di Core Platform.

---

# 9. Current Exception

Saat dokumen ini dibuat:

media_files

masih berada di:

apps/api/src/database/schema.ts

Status:

TEMPORARY VIOLATION

Harus dipindahkan ke Plugin Media Library ketika Plugin Migration Engine selesai dibangun.

---

# 10. Plugin Installation

Saat plugin di-install:

plugin membuat schema miliknya sendiri.

Core tidak membuat schema plugin.

Contoh:

Install Media Library

↓

Execute Media Library Migrations

↓

Create media_files

↓

Create media_folders

↓

Create media_tags

---

# 11. Plugin Uninstall Keep Data

Saat uninstall keep data:

Plugin Registration:

removed

Plugin UI:

removed

Plugin API:

removed

Database:

preserved

Storage:

preserved

Migration History:

preserved

---

# 12. Plugin Uninstall Clean

Saat uninstall clean:

Plugin Registration:

removed

Plugin UI:

removed

Plugin API:

removed

Database:

removed

Storage:

removed

Migration History:

removed

---

# 13. Reinstall Rule

Jika plugin sebelumnya dihapus menggunakan Keep Data:

Install ulang harus:

* mendeteksi schema lama
* mendeteksi storage lama
* mendeteksi migration lama

Data wajib tetap tersedia.

---

# 14. Future Marketplace Compatibility

Aturan ownership ini harus tetap berlaku untuk:

* Marketplace Plugins
* Third Party Plugins
* SaaS Multi Tenant
* Remote Plugin Installation
* Cloud Deployments

---

# 15. Architecture Lock

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
