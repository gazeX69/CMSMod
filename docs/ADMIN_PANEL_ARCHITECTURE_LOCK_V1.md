# ADMIN_PANEL_ARCHITECTURE_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_ARCHITECTURE_LOCK_V1
* PLUGIN_PLATFORM_LOCK_V1
* CONTENT_ENGINE_LOCK_V1
* MEDIA_ASSET_PLATFORM_LOCK_V1
* THEME_SYSTEM_LOCK_V1
* MARKETPLACE_ARCHITECTURE_LOCK_V1

---

# 1. Purpose

Admin Panel adalah Shell Application.

Admin Panel bukan tempat logika bisnis.

Admin Panel adalah host yang menjalankan Plugin.

---

# 2. Core Principle

Admin Panel bertanggung jawab terhadap:

* Navigation
* Layout
* Plugin Hosting
* Authentication State
* Authorization State
* Notifications
* Global Search
* Settings Access

Plugin bertanggung jawab terhadap:

* Business Logic
* Product Logic
* Product UI

---

# 3. Admin Shell Responsibility

Core Admin memiliki:

* Sidebar
* Topbar
* Workspace
* Notification Center
* User Menu
* Theme Switcher
* Plugin Loader

Core Admin tidak memiliki fitur bisnis.

---

# 4. Plugin Responsibility

Plugin memiliki:

* Pages
* Forms
* Tables
* Reports
* Dashboards
* Workflows

Core Admin tidak boleh mengetahui detail internal plugin.

---

# 5. Navigation Ownership

Core hanya mengetahui:

```text
Plugin Name
Base Route
Menu Label
Menu Icon
```

Core tidak mengetahui:

```text
Internal Pages
Internal Routes
Internal Components
```

---

# 6. Route Ownership

Core hanya memiliki:

```text
/
/login
/settings
/plugins
/themes
/marketplace
```

Plugin memiliki:

```text
/media/*
/blog/*
/forum/*
/lms/*
```

---

# 7. Internal Route Rule

Internal route adalah milik plugin.

Contoh:

Media Library:

```text
/media
/media/trash
/media/settings
/media/folders
```

Core tidak boleh mendefinisikan route tersebut.

---

# 8. Plugin Loading

Plugin harus dapat dimuat secara dinamis.

Flow:

Plugin Registry

↓

Load Plugin Bundle

↓

Register Route

↓

Render Component

---

# 9. Plugin Isolation

Plugin tidak boleh membaca state internal plugin lain.

Plugin tidak boleh mengakses component private plugin lain.

---

# 10. SDK Boundary

Plugin hanya boleh berinteraksi dengan:

```text
Plugin SDK
Core APIs
Official Contracts
```

Plugin tidak boleh mengimpor:

```text
apps/admin/*
internal shell components
private services
```

---

# 11. Sidebar Rule

Sidebar adalah milik Core.

Plugin hanya memberikan:

```text
menu label
menu icon
base route
```

Core menentukan tampilan sidebar.

---

# 12. Topbar Rule

Topbar adalah milik Core.

Plugin tidak boleh mengubah struktur topbar.

Plugin hanya boleh menambahkan extension point resmi.

---

# 13. Workspace Rule

Workspace adalah area kerja plugin.

Core tidak boleh mengetahui isi workspace plugin.

---

# 14. Global Search

Global Search adalah layanan platform.

Plugin dapat mendaftarkan provider pencarian.

Core menggabungkan hasil.

---

# 15. Notification System

Notification System adalah layanan platform.

Plugin dapat mengirim notifikasi.

Plugin tidak mengelola sistem notifikasi global.

---

# 16. Settings System

Settings global adalah milik Core.

Plugin memiliki settings sendiri.

Contoh:

Core:

```text
users
roles
themes
system
```

Plugin:

```text
media settings
blog settings
forum settings
```

---

# 17. Permission System

Permission Engine adalah milik Core.

Plugin hanya mendaftarkan permission.

Contoh:

Media Library:

```text
media.read
media.create
media.update
media.delete
```

---

# 18. Dashboard Direction

Core Dashboard harus minimal.

Dashboard bisnis adalah milik plugin.

Core tidak boleh menjadi dashboard monster.

---

# 19. Multi Plugin Environment

Admin Panel harus mampu menjalankan:

```text
10 plugins
100 plugins
500 plugins
```

tanpa perubahan arsitektur.

---

# 20. Theme Compatibility

Admin Panel harus mendukung:

```text
Admin Theme
```

tanpa mempengaruhi plugin.

---

# 21. Headless Compatibility

Dalam mode Headless:

Admin Panel dapat tidak digunakan.

Core tetap berjalan.

Plugin tetap berjalan.

---

# 22. Marketplace Compatibility

Plugin yang dipasang dari Marketplace harus dapat muncul di Admin Panel tanpa perubahan kode Core.

---

# 23. Extension Point Rule

Core menyediakan extension point resmi.

Plugin tidak boleh melakukan patching terhadap Core UI.

---

# 24. Future Direction

Admin Panel harus siap mendukung:

* Dynamic Plugin Loading
* Remote Plugins
* Micro Frontends
* Multi Workspace
* Enterprise Modules

tanpa perubahan fondasi.

---

# 25. Architecture Lock

Admin Panel adalah Shell Layer.

Bukan Business Layer.

Bukan Plugin Layer.

Bukan Product Layer.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
