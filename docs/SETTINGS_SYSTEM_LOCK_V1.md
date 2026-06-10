# SETTINGS_SYSTEM_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_PLATFORM_LOCK_V1
* PLUGIN_DATABASE_OWNERSHIP_LOCK_V1
* ADMIN_PANEL_ARCHITECTURE_LOCK_V1
* PERMISSION_SYSTEM_LOCK_V1

---

# 1. Purpose

Settings System adalah sistem konfigurasi tunggal untuk seluruh ModernCMS.

Plugin tidak boleh membuat sistem settings sendiri.

Theme tidak boleh membuat sistem settings sendiri.

Seluruh konfigurasi harus menggunakan Settings System.

---

# 2. Core Principle

Core menyediakan:

* Settings Engine
* Settings Storage
* Settings API
* Settings Permission

Plugin hanya mendaftarkan konfigurasi.

---

# 3. Configuration Ownership

Core memiliki:

```text
Settings Infrastructure
```

Plugin memiliki:

```text
Settings Definition
```

---

# 4. Configuration Scope

Settings harus memiliki scope yang jelas.

Minimal:

```text
system
plugin
theme
user
```

---

# 5. System Settings

Dimiliki Core.

Contoh:

```text
site_name
site_url
timezone
language
mail_configuration
```

---

# 6. Plugin Settings

Dimiliki Plugin.

Contoh:

Media Library:

```text
max_upload_size
allowed_mime_types
default_storage
```

Blog:

```text
posts_per_page
enable_comments
default_author
```

Forum:

```text
allow_guest_posts
auto_lock_days
```

---

# 7. Theme Settings

Dimiliki Theme.

Contoh:

```text
primary_color
secondary_color
logo
footer_text
```

---

# 8. User Settings

Dimiliki pengguna.

Contoh:

```text
language
dashboard_layout
editor_preferences
```

---

# 9. Storage Rule

Settings disimpan melalui Settings Engine.

Plugin tidak boleh membuat tabel settings sendiri.

SALAH:

```text
blog_settings
forum_settings
media_settings
```

Jika hanya menyimpan konfigurasi.

---

# 10. Complex Data Rule

Settings boleh menyimpan:

```text
string
number
boolean
json
array
```

---

# 11. Key Naming Rule

Format wajib:

```text
scope.key
```

Contoh:

```text
system.site_name

media.max_upload_size

blog.posts_per_page

theme.primary_color
```

---

# 12. Namespace Rule

Plugin wajib menggunakan namespace sendiri.

Contoh:

```text
media.*
blog.*
forum.*
lms.*
crm.*
```

---

# 13. Reserved Namespace

Namespace berikut milik Core:

```text
system.*
users.*
roles.*
plugins.*
themes.*
content.*
```

Plugin tidak boleh menggunakannya.

---

# 14. Settings Registration

Plugin harus mendaftarkan setting yang dimilikinya.

Contoh:

Media Library:

```text
media.max_upload_size
media.allowed_mime_types
media.default_storage
```

---

# 15. Validation Rule

Setiap setting dapat memiliki validasi.

Contoh:

```text
integer
boolean
enum
url
email
json
```

---

# 16. Default Value Rule

Setiap setting harus memiliki default value.

Jika tidak ada nilai tersimpan.

Sistem menggunakan default.

---

# 17. Permission Rule

Pengubahan setting harus dilindungi permission.

Contoh:

```text
settings.manage
media.settings.manage
blog.settings.manage
```

---

# 18. UI Rule

Plugin boleh menyediakan halaman pengaturan.

Tetapi penyimpanan tetap melalui Settings Engine.

---

# 19. Export Rule

Future Ready.

Settings dapat diekspor.

---

# 20. Import Rule

Future Ready.

Settings dapat diimpor.

---

# 21. Backup Compatibility

Settings wajib ikut dalam backup platform.

---

# 22. Multi Tenant Direction

Future Ready.

Settings dapat memiliki level:

```text
global
tenant
workspace
user
```

---

# 23. Environment Override Direction

Future Ready.

Setting tertentu dapat diambil dari:

```text
environment variable
secret manager
vault
```

---

# 24. Marketplace Compatibility

Plugin Marketplace wajib menggunakan Settings System.

Tidak boleh membuat konfigurasi sendiri di luar kontrak resmi.

---

# 25. Security Rule

Setting sensitif harus mendukung:

```text
encrypted value
hidden value
masked value
```

Contoh:

```text
api keys
smtp password
secret token
```

---

# 26. Architecture Lock

Settings System adalah layanan platform.

Bukan layanan plugin.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
