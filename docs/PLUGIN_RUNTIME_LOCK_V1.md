# PLUGIN_RUNTIME_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_ARCHITECTURE_LOCK_V1
* PLUGIN_PLATFORM_LOCK_V1
* SDK_ARCHITECTURE_LOCK_V1
* PLUGIN_LIFECYCLE_LOCK_V1
* ADMIN_PANEL_ARCHITECTURE_LOCK_V1

---

# 1. Purpose

Dokumen ini mengunci Runtime System Plugin ModernCMS.

Lifecycle menentukan kapan plugin hidup.

Runtime menentukan bagaimana plugin dijalankan.

---

# 2. Core Principle

Core tidak menjalankan logika plugin.

Core menyediakan Runtime Environment.

Plugin berjalan di atas Runtime tersebut.

---

# 3. Runtime Responsibility

Runtime bertanggung jawab untuk:

* Load Plugin
* Unload Plugin
* Route Registration
* Menu Registration
* Event Registration
* Permission Registration
* Settings Registration
* Runtime Isolation

---

# 4. Core Boundary

Core mengetahui:

```text
plugin id
manifest
status
runtime contract
```

Core tidak mengetahui:

```text
internal component
internal route
internal state
internal business logic
```

---

# 5. Runtime Loading

Flow:

```text
ACTIVE

↓

Load Manifest

↓

Load Runtime Contract

↓

Register Runtime

↓

Running
```

---

# 6. Runtime Contract

Frontend Plugin wajib mengekspor:

```ts
export interface AdminPlugin {
  id: string;
  icon: ComponentType<any>;
  component: ComponentType<any>;
}
```

---

# 7. Runtime Registration

Plugin mendaftarkan dirinya.

Core tidak melakukan hardcode plugin.

SALAH:

```ts
if(plugin.id === "media-library") {
 ...
}
```

BENAR:

```ts
registry.register(plugin)
```

---

# 8. Dynamic Registration

Semua plugin wajib didaftarkan secara dinamis.

Core tidak boleh mengenal plugin tertentu.

---

# 9. Runtime Discovery

Runtime hanya boleh menggunakan:

```text
plugin.json
runtime contract
```

Tidak boleh menggunakan:

```text
hardcoded plugin list
```

---

# 10. Menu Runtime

Plugin memberikan:

```text
menu label
base route
icon
```

Core merender menu.

---

# 11. Route Runtime

Plugin hanya memberikan:

```text
base route
root component
```

Plugin mengelola route internal sendiri.

---

# 12. Internal Route Ownership

Contoh:

Media Library:

```text
/media
/media/trash
/media/settings
/media/folders
```

Seluruh route tersebut milik plugin.

---

# 13. Runtime Isolation

Plugin A tidak boleh:

```text
akses state plugin B
akses component plugin B
akses service plugin B
```

---

# 14. State Isolation

State plugin harus terisolasi.

Plugin tidak boleh menyimpan state pada Core.

---

# 15. CSS Isolation

Plugin tidak boleh merusak UI plugin lain.

Plugin tidak boleh mengubah UI Core.

---

# 16. Theme Compatibility

Runtime harus mendukung Theme Engine.

Plugin tidak boleh mengetahui theme tertentu.

---

# 17. SDK Only Rule

Plugin hanya boleh menggunakan:

```text
@modern-cms/plugin-sdk
```

Sebagai pintu masuk platform.

---

# 18. Internal Import Ban

Dilarang:

```text
apps/admin/*
apps/api/*
internal/*
private/*
```

---

# 19. Runtime Reload

Jika plugin berubah:

```text
Unload Runtime

↓

Reload Runtime

↓

Register Runtime
```

---

# 20. Runtime Shutdown

Saat plugin dinonaktifkan:

```text
remove routes
remove menus
remove listeners
remove workers
```

---

# 21. Runtime Failure

Jika runtime gagal dimuat:

Status:

```text
BROKEN
```

Plugin tidak boleh menghancurkan Admin Panel.

---

# 22. Failure Isolation

Plugin rusak:

```text
Plugin A mati
```

Plugin lain:

```text
tetap berjalan
```

---

# 23. Error Boundary

Setiap plugin harus memiliki Error Boundary.

Crash plugin tidak boleh membuat Admin Shell crash.

---

# 24. Future Lazy Loading

Runtime harus mendukung:

```text
lazy loading
code splitting
on demand loading
```

---

# 25. Future Remote Runtime

Runtime harus mendukung:

```text
local runtime
marketplace runtime
remote runtime
```

---

# 26. Future Sandbox

Future Ready.

Plugin dapat berjalan dalam:

```text
sandbox
iframe
web component
micro frontend
```

Tanpa mengubah kontrak.

---

# 27. Future Worker Runtime

Plugin dapat memiliki:

```text
background worker
scheduler
queue processor
```

Yang dikelola Runtime Engine.

---

# 28. Runtime Manifest Contract

Runtime hanya boleh membaca:

```text
plugin.json
runtime contract
```

Bukan struktur internal plugin.

---

# 29. Media Library Example

Runtime mengetahui:

```text
id: media-library
route: media
icon: MediaIcon
component: MediaLibrary
```

Runtime tidak mengetahui:

```text
folder structure
media logic
upload logic
database schema
```

---

# 30. Marketplace Compatibility

Plugin Marketplace wajib mengikuti Runtime Contract yang sama.

Tidak ada runtime khusus.

---

# 31. Long Term Compatibility

Runtime harus mampu menjalankan:

* 10 plugin
* 100 plugin
* 500 plugin
* 1000+ plugin

tanpa perubahan fondasi.

---

# 32. Architecture Lock

Runtime adalah Execution Layer.

Bukan Business Layer.

Bukan Storage Layer.

Bukan Plugin Layer.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
