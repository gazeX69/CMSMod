# DOMAIN_BOUNDARY_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_PLATFORM_LOCK_V1
* DATABASE_ARCHITECTURE_LOCK_V1
* CONTENT_ENGINE_LOCK_V1
* MEDIA_ASSET_PLATFORM_LOCK_V1
* SDK_ARCHITECTURE_LOCK_V1

---

# 1. Purpose

Dokumen ini mengunci batas domain ModernCMS.

Tujuan utama:

* Menentukan apa yang masuk Core Platform.
* Menentukan apa yang masuk Plugin.
* Menentukan apa yang dianggap Business Application.
* Mencegah Core menjadi monolith.

---

# 2. Core Principle

ModernCMS adalah:

```text
Platform First
Plugin First
Domain Driven
```

Bukan:

```text
Monolithic CMS
```

---

# 3. Three Layer Architecture

ModernCMS dibagi menjadi:

```text
Platform Layer
Plugin Layer
Application Layer
```

---

# 4. Platform Layer

Platform Layer menyediakan fondasi.

Platform Layer tidak mengandung fitur bisnis.

---

# 5. Platform Services

Yang diperbolehkan berada di Core:

```text
Authentication
Authorization
Users
Roles
Permissions

Plugin Engine
Theme Engine
SDK

Settings Engine
Event Engine

Content Engine

Search Engine

Media Resolver Contract

API Infrastructure

Migration Registry

Marketplace Infrastructure

Audit Infrastructure

Notification Infrastructure
```

---

# 6. Platform Rule

Jika suatu fitur dibutuhkan oleh hampir seluruh sistem:

Maka fitur tersebut layak menjadi Platform Service.

---

# 7. Plugin Layer

Plugin Layer berisi domain reusable.

Plugin dapat dipasang dan dilepas.

Plugin memiliki ownership sendiri.

---

# 8. Plugin Examples

Contoh Plugin Domain:

```text
Media Library
Blog
Forum
LMS
CRM
E-Commerce
Helpdesk
Wiki
Knowledge Base
Newsletter
SEO
Analytics
AI Assistant
```

---

# 9. Plugin Rule

Jika fitur dapat diinstall atau dihapus tanpa merusak platform:

Maka fitur tersebut adalah Plugin.

---

# 10. Application Layer

Application Layer adalah solusi bisnis.

Dibangun menggunakan Plugin.

---

# 11. Application Examples

Contoh:

Blog Website

Menggunakan:

```text
Blog
Media Library
SEO
Theme
```

---

Forum Website

Menggunakan:

```text
Forum
Media Library
Theme
```

---

Learning Platform

Menggunakan:

```text
LMS
Media Library
Forum
Theme
```

---

Marketplace Website

Menggunakan:

```text
E-Commerce
Media Library
Blog
Theme
```

---

# 12. Core Must Remain Small

Core harus tetap kecil.

Core tidak boleh menjadi tempat seluruh fitur.

---

# 13. Media Library Classification

Media Library adalah:

```text
Plugin Domain
```

Bukan:

```text
Core Service
```

---

# 14. Blog Classification

Blog adalah:

```text
Plugin Domain
```

---

# 15. Forum Classification

Forum adalah:

```text
Plugin Domain
```

---

# 16. LMS Classification

LMS adalah:

```text
Plugin Domain
```

---

# 17. CRM Classification

CRM adalah:

```text
Plugin Domain
```

---

# 18. E-Commerce Classification

E-Commerce adalah:

```text
Plugin Domain
```

---

# 19. Theme Classification

Theme adalah:

```text
Presentation Layer
```

Bukan Domain Layer.

---

# 20. SDK Classification

SDK adalah:

```text
Contract Layer
```

Bukan Business Layer.

---

# 21. Event System Classification

Event System adalah:

```text
Integration Layer
```

Bukan Business Layer.

---

# 22. API Classification

API adalah:

```text
Service Layer
```

Bukan Domain Layer.

---

# 23. Database Classification

Database bukan Domain.

Database adalah Storage Layer.

Ownership ditentukan oleh Domain.

---

# 24. Ownership Rule

Setiap domain memiliki:

```text
database
storage
migration
settings
permissions
events
api
```

sendiri.

---

# 25. Shared Domain Rule

Jika dua plugin membutuhkan fitur yang sama:

Jangan memindahkan fitur ke Core secara otomatis.

Evaluasi apakah perlu dibuat:

```text
Platform Service
Shared Plugin
```

---

# 26. Core Promotion Rule

Fitur hanya boleh dipromosikan ke Core jika:

* digunakan hampir seluruh plugin
* bukan domain bisnis
* menjadi fondasi platform

---

# 27. Forbidden Core Expansion

Tidak boleh menambahkan ke Core:

```text
Blog
Forum
LMS
CRM
E-Commerce
Media Library
SEO
Analytics
```

---

# 28. Future App Builder Compatibility

ModernCMS harus mampu menjadi:

```text
Blog Builder
Forum Builder
LMS Builder
CRM Builder
Marketplace Builder
Custom App Builder
```

Tanpa perubahan fondasi.

---

# 29. Future SaaS Compatibility

Harus mendukung:

```text
Single Site
Multi Site
Multi Tenant
Workspace
Enterprise
```

---

# 30. Future AI Compatibility

AI dianggap Plugin Domain.

AI tidak boleh menjadi bagian wajib Core.

---

# 31. Long Term Direction

Core semakin stabil.

Plugin semakin banyak.

Business Application semakin beragam.

---

# 32. Architecture Lock

Platform Layer menyediakan fondasi.

Plugin Layer menyediakan domain.

Application Layer menyediakan solusi bisnis.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
