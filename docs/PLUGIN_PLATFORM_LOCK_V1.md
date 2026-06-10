# PLUGIN_PLATFORM_LOCK_V1

Status: LOCKED
Version: 1.0
Scope: ModernCMS Plugin Platform Foundation

---

# 1. Purpose

Dokumen ini mengunci fondasi arsitektur plugin ModernCMS.

Tujuan utama:

* Memastikan Core Platform tidak bergantung pada plugin tertentu.
* Memastikan plugin dapat dipasang, dinonaktifkan, diaktifkan, dan dihapus secara independen.
* Menyediakan fondasi yang mampu berkembang selama 5–10+ tahun.
* Menghindari arsitektur sementara yang nantinya harus dibongkar ulang.

---

# 2. Core Principle

ModernCMS dibagi menjadi dua lapisan utama:

## Core Platform

Bertanggung jawab terhadap:

* Authentication
* Authorization
* User Management
* Role Management
* Content Engine
* Theme Engine
* Plugin Engine
* SDK
* Settings Infrastructure

Core tidak boleh mengandung logika bisnis plugin tertentu.

---

## Product Plugins

Contoh:

* Media Library
* Blog
* Forum
* LMS
* CRM
* E-Commerce
* SEO Toolkit

Plugin adalah produk independen yang berjalan di atas platform.

Core tidak boleh mengasumsikan plugin tertentu selalu tersedia.

---

# 3. Plugin Ownership Principle

Plugin memiliki ownership penuh terhadap:

* Database schema plugin
* Storage plugin
* API plugin
* Admin UI plugin
* Business logic plugin
* Migration plugin

Core tidak boleh memiliki tabel khusus plugin.

Contoh:

BENAR:

plugins/media-library memiliki tabel media_files

SALAH:

apps/api/src/database/schema.ts memiliki media_files

---

# 4. Plugin Lifecycle

## DISCOVERED

Plugin ditemukan di filesystem.

Syarat:

* plugin.json ditemukan
* manifest valid

Belum terjadi:

* migration
* storage creation
* activation

Status:

DISCOVERED

---

## INSTALLED

Terjadi ketika administrator memilih Install.

Langkah:

1. Validate Manifest
2. Validate Dependencies
3. Execute Plugin Migrations
4. Create Plugin Storage
5. Register Plugin Installation

Status:

INSTALLED

---

## ACTIVE

Terjadi ketika administrator memilih Activate.

Efek:

* route aktif
* menu aktif
* API aktif
* UI aktif

Tidak menjalankan migration.

Status:

ACTIVE

---

## INACTIVE

Terjadi ketika administrator memilih Deactivate.

Efek:

* route nonaktif
* menu nonaktif
* API nonaktif
* UI nonaktif

Data tetap ada.

Status:

INACTIVE

---

## UNINSTALLED (KEEP DATA)

Terjadi ketika administrator memilih uninstall dan menyimpan data.

Efek:

* plugin dihapus dari sistem aktif
* menu hilang
* route hilang

Tetapi:

* database tetap ada
* migration tetap ada
* storage tetap ada

Status:

UNINSTALLED

---

## UNINSTALLED (CLEAN)

Terjadi ketika administrator memilih uninstall bersih.

Efek:

* plugin dihapus
* migration rollback
* database plugin dihapus
* storage plugin dihapus
* metadata plugin dihapus

Status:

UNINSTALLED

---

# 5. Reinstallation Rule

Jika plugin sebelumnya dihapus menggunakan mode Keep Data:

Install ulang harus:

* mendeteksi data lama
* menggunakan data lama
* memulihkan plugin tanpa kehilangan data

Contoh:

Install
→ Upload 1000 media

Uninstall (Keep Data)

Install kembali

→ 1000 media tetap tersedia

---

# 6. Plugin Directory Standard

Struktur minimum plugin:

plugins/example-plugin/

├─ plugin.json
├─ package.json
├─ admin/
├─ server/
├─ migrations/
├─ storage/
├─ contracts/
└─ docs/

---

# 7. Plugin Manifest Direction (Future)

Manifest akan berevolusi untuk mendukung:

* migrations
* storage
* dependencies
* capabilities

Contoh target:

{
"id": "media-library",
"name": "Media Library",
"version": "1.0.0",

"dependencies": [],

"migrations": {
"path": "./migrations"
},

"storage": {
"path": "./storage"
},

"capabilities": {
"cleanUninstall": true,
"keepDataUninstall": true
}
}

Implementasi belum wajib pada V1.

Dokumen ini hanya mengunci arah arsitektur.

---

# 8. Dependency Rules

Plugin boleh bergantung pada:

* Core SDK
* Shared Packages
* Plugin SDK

Plugin tidak boleh mengimpor:

* Internal Core Admin Components
* Internal Core API Services
* Folder private milik plugin lain

Komunikasi antar plugin harus melalui kontrak resmi.

---

# 9. Database Rules

Plugin memiliki schema sendiri.

Plugin tidak boleh memaksa Core menyimpan tabel bisnis plugin.

Contoh:

Media Library:

* media_files
* media_folders
* media_tags

harus dimiliki plugin Media Library.

Bukan Core.

---

# 10. Storage Rules

Plugin memiliki storage sendiri.

Contoh:

plugins/media-library/storage

Plugin lain tidak boleh mengakses storage plugin secara langsung.

Akses harus melalui API atau SDK resmi.

---

# 11. Long-Term Compatibility

Arsitektur ini harus mampu mendukung:

* 500+ plugin
* Marketplace Plugin
* SaaS Multi-Tenant
* Headless CMS
* Remote Plugin Distribution
* Cloud Storage
* Plugin Upgrade
* Plugin Downgrade

tanpa mengubah prinsip dasar dokumen ini.

---

# 12. Architecture Lock

Dokumen ini menjadi referensi utama seluruh keputusan plugin ModernCMS.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
