# SDK_ARCHITECTURE_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_ARCHITECTURE_LOCK_V1
* THEME_SYSTEM_LOCK_V1
* EVENT_SYSTEM_LOCK_V1
* API_ARCHITECTURE_LOCK_V1
* MEDIA_ASSET_PLATFORM_LOCK_V1
* SETTINGS_SYSTEM_LOCK_V1

---

# 1. Purpose

SDK adalah satu-satunya pintu resmi antara Platform dan Extension.

Extension meliputi:

* Plugin
* Theme
* Marketplace Package
* Integration
* Future AI Extension

Tidak boleh ada akses langsung ke internal Core.

---

# 2. Core Principle

Plugin berbicara ke Platform melalui SDK.

Bukan melalui:

```text
apps/admin/*
apps/api/*
internal service
internal database
private module
```

---

# 3. SDK Ownership

Core memiliki SDK.

Plugin menggunakan SDK.

Plugin tidak boleh memodifikasi SDK.

---

# 4. SDK Packages

Minimal:

```text
@modern-cms/plugin-sdk
@modern-cms/theme-sdk
```

Future:

```text
@modern-cms/server-sdk
@modern-cms/marketplace-sdk
@modern-cms/ai-sdk
```

---

# 5. SDK Boundary Rule

SALAH:

Plugin:

```ts
import { pluginManager } from '../../../apps/admin/...';
```

SALAH:

```ts
import { db } from '../../../apps/api/...';
```

BENAR:

```ts
import { ... } from '@modern-cms/plugin-sdk';
```

---

# 6. SDK Stability Rule

SDK adalah kontrak publik.

Internal Core boleh berubah.

SDK harus tetap stabil.

---

# 7. Plugin Runtime Contract

Plugin frontend wajib diekspor melalui SDK Contract.

Contoh:

```ts
export interface AdminPlugin {
  id: string;
  icon: ComponentType;
  component: ComponentType;
}
```

---

# 8. Theme Runtime Contract

Theme wajib menggunakan kontrak Theme SDK.

Theme tidak boleh mengakses Plugin Runtime.

---

# 9. Event Contract

SDK wajib menyediakan Event API.

Contoh:

```ts
eventBus.emit(...)
eventBus.listen(...)
```

Plugin tidak boleh membuat Event Bus sendiri.

---

# 10. Settings Contract

SDK wajib menyediakan Settings API.

Contoh:

```ts
settings.get(...)
settings.set(...)
```

Plugin tidak boleh membaca tabel settings langsung.

---

# 11. Permission Contract

SDK wajib menyediakan Permission API.

Contoh:

```ts
permissions.can(...)
permissions.has(...)
```

Plugin tidak boleh membaca tabel role langsung.

---

# 12. User Contract

SDK wajib menyediakan User API.

Contoh:

```ts
auth.currentUser()
```

Plugin tidak boleh membaca session internal Core.

---

# 13. Media Contract

SDK wajib menyediakan Media API.

Contoh:

```ts
media.get(...)
media.resolve(...)
```

---

# 14. Media Picker Contract

SDK wajib menyediakan:

```tsx
<MediaPicker />
```

Bukan implementasi custom per plugin.

---

# 15. Content Contract

SDK wajib menyediakan Content API.

Contoh:

```ts
content.get(...)
content.search(...)
```

---

# 16. Notification Contract

SDK wajib menyediakan Notification API.

Contoh:

```ts
notifications.success(...)
notifications.error(...)
notifications.info(...)
```

Plugin tidak membuat sistem notifikasi sendiri.

---

# 17. Modal Contract

SDK wajib menyediakan Modal API.

Contoh:

```ts
modal.open(...)
modal.close(...)
```

---

# 18. Dialog Contract

SDK wajib menyediakan dialog standar.

Contoh:

```ts
confirm(...)
prompt(...)
alert(...)
```

---

# 19. Storage Contract

SDK wajib menyediakan Storage API.

Contoh:

```ts
storage.upload(...)
storage.download(...)
```

Plugin tidak boleh mengetahui implementasi storage.

---

# 20. Search Contract

SDK wajib menyediakan Search API.

Contoh:

```ts
search.query(...)
```

---

# 21. Marketplace Contract

Marketplace Package wajib menggunakan SDK.

Tidak boleh menggunakan internal Core.

---

# 22. Version Compatibility

SDK wajib memiliki:

```text
major
minor
patch
```

Menggunakan Semantic Versioning.

---

# 23. Breaking Change Rule

Breaking change hanya boleh dilakukan pada major version.

---

# 24. Deprecation Rule

Fitur SDK yang akan dihapus harus:

```text
deprecated
documented
announced
```

Sebelum dihapus.

---

# 25. Internal Import Ban

Plugin tidak boleh mengimpor:

```text
apps/admin/*
apps/api/*
internal/*
private/*
```

Secara langsung.

---

# 26. Future Remote Plugin Support

SDK harus mendukung:

```text
local plugin
marketplace plugin
remote plugin
```

Tanpa perubahan kontrak.

---

# 27. Future SaaS Support

SDK harus tetap valid pada:

```text
single tenant
multi tenant
cloud
enterprise
```

---

# 28. Future AI Support

SDK harus dapat digunakan oleh:

```text
AI Plugin
AI Workflow
AI Automation
AI Agent
```

Tanpa mengubah fondasi.

---

# 29. Long Term Compatibility

SDK harus tetap menjadi kontrak utama untuk:

* 10 tahun+
* ribuan plugin
* ribuan theme
* marketplace publik
* marketplace privat

tanpa ketergantungan ke struktur internal Core.

---

# 30. Architecture Lock

SDK adalah Contract Layer.

Bukan Business Layer.

Bukan Database Layer.

Bukan UI Layer.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
