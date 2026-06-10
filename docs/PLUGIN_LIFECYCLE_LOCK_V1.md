# PLUGIN_LIFECYCLE_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_PLATFORM_LOCK_V1
* PLUGIN_MIGRATION_SYSTEM_LOCK_V1
* PLUGIN_DATABASE_OWNERSHIP_LOCK_V1
* SDK_ARCHITECTURE_LOCK_V1
* EVENT_SYSTEM_LOCK_V1

---

# 1. Purpose

Dokumen ini mengunci siklus hidup Plugin.

Seluruh plugin wajib mengikuti lifecycle yang sama.

Tidak boleh ada plugin yang memiliki lifecycle khusus di luar kontrak platform.

---

# 2. Core Principle

Plugin memiliki status:

```text
DISCOVERED
INSTALLED
ACTIVE
INACTIVE
BROKEN
UNINSTALLED
```

Semua plugin harus berada pada salah satu status tersebut.

---

# 3. DISCOVERED

Plugin ditemukan oleh Plugin Discovery Engine.

Pada tahap ini:

```text
plugin folder ditemukan
plugin.json ditemukan
manifest dibaca
belum ada perubahan database
belum ada migration
belum ada storage
```

---

# 4. INSTALLING

Proses instalasi sedang berjalan.

Tahap ini bersifat sementara.

Jika gagal:

```text
rollback
```

---

# 5. INSTALLED

Plugin telah berhasil diinstal.

Yang harus sudah selesai:

```text
manifest valid
dependency valid
migration selesai
storage siap
permissions terdaftar
settings terdaftar
status tersimpan
```

Plugin belum aktif.

---

# 6. ACTIVE

Plugin aktif.

Pada status ini:

```text
routes aktif
menus aktif
api aktif
events aktif
ui aktif
```

Plugin dapat digunakan.

---

# 7. INACTIVE

Plugin terpasang namun tidak aktif.

Pada status ini:

```text
database tetap ada
storage tetap ada
settings tetap ada
data tetap ada
```

Yang dinonaktifkan:

```text
menus
routes
ui
background workers
```

---

# 8. BROKEN

Plugin mengalami kerusakan.

Contoh:

```text
manifest rusak
dependency hilang
migration gagal
bundle tidak ditemukan
```

Plugin tidak boleh diaktifkan.

---

# 9. UNINSTALLED

Plugin sudah tidak terpasang.

Plugin tidak lagi dimuat platform.

---

# 10. Discovery Flow

```text
Scan Folder

↓

Read Manifest

↓

Validate Manifest

↓

DISCOVERED
```

---

# 11. Install Flow

```text
DISCOVERED

↓

Validate Manifest

↓

Validate Compatibility

↓

Validate Dependency

↓

Execute Migration

↓

Create Storage

↓

Register Permissions

↓

Register Settings

↓

INSTALLED
```

---

# 12. Activation Flow

```text
INSTALLED

↓

Load Plugin Runtime

↓

Register Routes

↓

Register Events

↓

Register Menus

↓

ACTIVE
```

---

# 13. Deactivation Flow

```text
ACTIVE

↓

Unload Runtime

↓

Disable Routes

↓

Disable Menus

↓

Disable Workers

↓

INACTIVE
```

---

# 14. Reactivation Flow

```text
INACTIVE

↓

Load Runtime

↓

Register Routes

↓

Register Menus

↓

ACTIVE
```

---

# 15. Uninstall Flow

```text
ACTIVE / INACTIVE

↓

Confirmation

↓

Uninstall Strategy

↓

UNINSTALLED
```

---

# 16. Uninstall Strategy

Platform wajib menawarkan:

### Option A

```text
Remove Plugin Only
```

Hasil:

```text
plugin hilang
database tetap ada
storage tetap ada
data tetap ada
```

---

### Option B

```text
Full Clean Uninstall
```

Hasil:

```text
plugin hilang
database dihapus
storage dihapus
settings dihapus
permissions dihapus
```

---

# 17. Default Uninstall Rule

Default:

```text
Remove Plugin Only
```

Bukan Full Clean.

Mencegah kehilangan data tidak sengaja.

---

# 18. Plugin Data Ownership

Data plugin adalah milik plugin.

Core tidak boleh menghapus data plugin secara otomatis.

---

# 19. Migration Ownership

Migration plugin adalah milik plugin.

Core hanya menjalankan migration.

Core tidak mengetahui isi migration.

---

# 20. Storage Ownership

Storage plugin adalah milik plugin.

Contoh:

```text
plugins/media-library/storage
plugins/blog/storage
plugins/forum/storage
```

---

# 21. Settings Ownership

Settings plugin adalah milik plugin.

Saat uninstall:

```text
optional cleanup
```

---

# 22. Permission Ownership

Permission plugin adalah milik plugin.

Saat uninstall:

```text
optional cleanup
```

---

# 23. Event Registration

Saat ACTIVE:

```text
register listener
register emitter
```

Saat INACTIVE:

```text
unregister listener
```

---

# 24. Route Registration

Saat ACTIVE:

```text
register routes
```

Saat INACTIVE:

```text
remove routes
```

---

# 25. Menu Registration

Saat ACTIVE:

```text
register menus
```

Saat INACTIVE:

```text
remove menus
```

---

# 26. Upgrade Flow

```text
ACTIVE

↓

Download Update

↓

Validate

↓

Execute Migration

↓

Reload Runtime

↓

ACTIVE
```

---

# 27. Downgrade Flow

```text
ACTIVE

↓

Rollback Migration

↓

Load Previous Version

↓

ACTIVE
```

---

# 28. Recovery Rule

Jika install gagal:

```text
rollback migration
rollback registration
rollback state
```

Tidak boleh tersisa setengah terpasang.

---

# 29. Media Library Example

Install:

```text
create media tables
create media storage
register media permissions
register media settings
```

Uninstall:

```text
keep media data
atau
hapus seluruh media
```

sesuai pilihan administrator.

---

# 30. Long Term Compatibility

Lifecycle harus mendukung:

* Local Plugin
* Marketplace Plugin
* Enterprise Plugin
* SaaS Plugin
* Remote Plugin

tanpa perubahan fondasi.

---

# 31. Architecture Lock

Plugin Lifecycle adalah Platform Responsibility.

Bukan Plugin Responsibility.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
