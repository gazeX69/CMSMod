# PERMISSION_SYSTEM_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_PLATFORM_LOCK_V1
* CONTENT_ENGINE_LOCK_V1
* ADMIN_PANEL_ARCHITECTURE_LOCK_V1

---

# 1. Purpose

Permission System adalah sistem otorisasi tunggal untuk seluruh ModernCMS.

Tidak boleh ada sistem permission kedua.

Tidak boleh ada sistem role kedua.

Seluruh plugin wajib menggunakan Permission System yang sama.

---

# 2. Core Principle

Core memiliki:

* Users
* Roles
* Permissions

Plugin mendaftarkan permission.

Plugin tidak membuat permission engine sendiri.

---

# 3. Authentication vs Authorization

Authentication:

```text
Siapa pengguna?
```

Authorization:

```text
Apa yang boleh dilakukan pengguna?
```

Core menangani keduanya.

---

# 4. Ownership

Core memiliki:

```text
users
roles
permissions
role_permissions
user_roles
```

Plugin tidak boleh memiliki tabel pengganti.

---

# 5. Role System

Role adalah kumpulan permission.

Contoh:

```text
Super Admin
Administrator
Editor
Author
Instructor
Student
Moderator
Customer Service
```

Role bukan hardcoded.

---

# 6. Permission System

Permission adalah unit otorisasi terkecil.

Contoh:

```text
content.read
content.create
content.update
content.delete
content.publish
```

---

# 7. Permission Naming Rule

Format wajib:

```text
resource.action
```

Contoh:

```text
media.read
media.create
media.update
media.delete

blog.publish

forum.moderate

lms.grade
```

---

# 8. Wildcard Direction

Future Ready.

Contoh:

```text
media.*
blog.*
forum.*
```

---

# 9. Plugin Registration

Plugin wajib mendaftarkan permission saat install.

Contoh:

Media Library:

```text
media.read
media.create
media.update
media.delete
media.restore
```

---

# 10. Core Permission Rule

Core hanya memiliki permission platform.

Contoh:

```text
users.manage
roles.manage
plugins.manage
themes.manage
settings.manage
```

---

# 11. Plugin Permission Rule

Plugin memiliki permission bisnisnya sendiri.

Contoh:

LMS:

```text
lms.course.create
lms.course.update
lms.grade.manage
```

---

# 12. Route Protection

Seluruh route harus dilindungi permission.

Tidak boleh hanya menyembunyikan tombol.

---

# 13. UI Protection

UI boleh disembunyikan.

Tetapi UI bukan pengaman utama.

API tetap wajib memvalidasi permission.

---

# 14. API Protection

API adalah lapisan keamanan utama.

Semua endpoint wajib memvalidasi permission.

---

# 15. Menu Visibility

Menu plugin dapat disembunyikan berdasarkan permission.

Contoh:

Tidak memiliki:

```text
media.read
```

↓

Menu Media Library tidak muncul.

---

# 16. Permission Inheritance

Role mewarisi seluruh permission yang dimilikinya.

User mendapatkan permission dari role.

---

# 17. Direct User Permission

Future Ready.

User dapat diberikan permission tambahan di luar role.

---

# 18. Multi Plugin Compatibility

Permission harus mendukung:

```text
10 plugin
100 plugin
500 plugin
```

Tanpa konflik.

---

# 19. Namespace Rule

Setiap plugin memiliki namespace sendiri.

Contoh:

```text
media.*
blog.*
forum.*
lms.*
crm.*
```

---

# 20. Reserved Namespace

Namespace berikut milik Core:

```text
users.*
roles.*
plugins.*
themes.*
settings.*
content.*
system.*
```

Plugin tidak boleh menggunakannya.

---

# 21. Audit Direction

Future Ready.

Permission action dapat dicatat.

Contoh:

```text
user
action
resource
timestamp
```

---

# 22. Multi Tenant Direction

Future Ready.

Permission harus dapat berkembang ke:

```text
tenant level
workspace level
organization level
```

---

# 23. Marketplace Compatibility

Plugin dari Marketplace wajib mendaftarkan permission melalui kontrak resmi.

Tidak boleh membuat sistem permission sendiri.

---

# 24. Security Rule

Permission tidak boleh diperiksa hanya di frontend.

Permission wajib diperiksa di backend.

---

# 25. Architecture Lock

Permission System adalah layanan platform.

Bukan layanan plugin.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
