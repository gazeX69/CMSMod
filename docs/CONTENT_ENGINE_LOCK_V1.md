# CONTENT_ENGINE_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_ARCHITECTURE_LOCK_V1
* PLUGIN_PLATFORM_LOCK_V1
* PLUGIN_DATABASE_OWNERSHIP_LOCK_V1
* MEDIA_ASSET_PLATFORM_LOCK_V1

---

# 1. Purpose

Content Engine adalah fondasi utama ModernCMS.

Content Engine bukan Blog.

Content Engine bukan Forum.

Content Engine bukan LMS.

Content Engine adalah mesin konten universal yang dapat digunakan seluruh plugin.

---

# 2. Core Principle

Core menyediakan Content Engine.

Plugin menyediakan Product Logic.

Core tidak mengetahui Blog.

Core tidak mengetahui Forum.

Core tidak mengetahui LMS.

Core hanya mengetahui Content.

---

# 3. Content Definition

Content adalah unit informasi.

Contoh:

* Artikel
* Halaman
* Dokumentasi
* FAQ
* Landing Page
* Modul LMS
* Forum Announcement
* Knowledge Base

Semuanya adalah Content.

---

# 4. Content Ownership

Content Engine dimiliki Core.

Plugin menggunakan Content Engine.

Plugin tidak boleh membuat ulang Content Engine sendiri.

---

# 5. Universal Content Model

Minimal field:

```text
uuid
type
title
slug
status
content
excerpt
authorId
createdAt
updatedAt
publishedAt
```

---

# 6. Content Status

Status standar:

```text
draft
review
scheduled
published
archived
```

Semua plugin wajib menggunakan status ini.

---

# 7. Content Revision

Setiap perubahan wajib dapat direvisi.

Minimal:

```text
revisionId
contentUuid
revisionNumber
createdAt
createdBy
```

---

# 8. Content Type

Core tidak mengenali Blog atau Forum.

Core hanya mengenali:

```text
content type
```

Contoh:

```text
blog-post
landing-page
faq-item
course-lesson
forum-announcement
```

Plugin bebas mendefinisikan type.

---

# 9. Content Metadata

Content boleh memiliki metadata.

Contoh:

```json
{
  "seoTitle": "",
  "seoDescription": "",
  "difficulty": "beginner"
}
```

Core tidak memvalidasi isi metadata.

Core hanya menyimpan metadata.

---

# 10. Content Taxonomy

Core menyediakan taxonomy.

Minimal:

```text
categories
tags
```

Plugin dapat menggunakan atau mengabaikannya.

---

# 11. Content Media Integration

Content tidak menyimpan URL media.

Content hanya menyimpan:

```text
media uuid
```

Semua media harus melalui Media Asset Platform.

---

# 12. Slug Rule

Slug harus unik.

Contoh:

```text
/about-us
/contact
/learn-moderncms
```

Tidak boleh bentrok.

---

# 13. URL Ownership

URL publik bukan milik Content Engine.

URL publik dimiliki Router Layer.

Content hanya menyimpan slug.

---

# 14. Headless Compatibility

Content Engine wajib dapat digunakan tanpa frontend bawaan.

Contoh:

```text
Web
Mobile
API
External Site
Static Generator
```

---

# 15. Search Compatibility

Content Engine wajib dapat dicari.

Minimal:

```text
title
excerpt
content
tags
categories
```

---

# 16. Permission Compatibility

Content Engine tidak mengatur izin spesifik produk.

Content Engine hanya mengenali:

```text
create
read
update
delete
publish
```

Role detail ditentukan plugin.

---

# 17. Localization Direction

Future Ready.

Content dapat memiliki:

```text
id-ID
en-US
ja-JP
```

Tanpa mengubah struktur utama.

---

# 18. Versioning Direction

Future Ready.

Content dapat memiliki:

```text
version 1
version 2
version 3
```

---

# 19. Workflow Direction

Future Ready.

Workflow dapat berkembang menjadi:

```text
draft
review
approved
published
archived
```

Tanpa mengubah fondasi engine.

---

# 20. What Core Owns

Core memiliki:

```text
content
content revisions
taxonomy
search integration
publishing status
```

---

# 21. What Plugin Owns

Plugin memiliki:

```text
business rules
special fields
workflow extensions
custom metadata
custom UI
custom reporting
```

---

# 22. Blog Example

Blog Plugin:

memiliki:

```text
blog settings
blog widgets
blog templates
blog analytics
```

menggunakan:

```text
Content Engine
```

---

# 23. LMS Example

LMS Plugin:

memiliki:

```text
course logic
lesson logic
quiz logic
grading
certificate logic
```

menggunakan:

```text
Content Engine
Media Asset Platform
```

---

# 24. Forum Example

Forum Plugin:

memiliki:

```text
thread logic
reply logic
moderation
reputation
```

menggunakan:

```text
Content Engine
```

---

# 25. Long Term Compatibility

Content Engine harus mampu mendukung:

* Blog
* Documentation
* LMS
* Forum
* CRM Notes
* Knowledge Base
* Headless CMS
* API First CMS

tanpa mengubah fondasi dokumen ini.

---

# 26. Architecture Lock

Content Engine adalah layanan inti platform.

Bukan produk.

Seluruh plugin harus dibangun di atas Content Engine.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
