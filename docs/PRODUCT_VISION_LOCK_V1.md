# PRODUCT_VISION_LOCK_V1

Status: LOCKED

Version: 1.0

Priority: HIGHEST

This document overrides short-term feature decisions when conflicts occur.

---

# 1. Product Identity

ModernCMS bukan Blog CMS.

ModernCMS bukan WordPress Clone.

ModernCMS bukan hanya Headless CMS.

ModernCMS adalah:

```text
Plugin First Application Platform
```

yang mampu membangun berbagai jenis aplikasi melalui kombinasi Plugin, Theme, dan Platform Services.

---

# 2. Long Term Mission

Memberikan fondasi bagi pengguna untuk membangun:

```text
Website
Blog
Forum
LMS
CRM
Knowledge Base
Marketplace
Community Platform
Membership Platform
Business Portal
Custom Application
```

tanpa mengubah Core Platform.

---

# 3. Long Term Vision

ModernCMS harus berkembang menjadi:

```text
Application Builder Platform
```

bukan sekadar CMS tradisional.

---

# 4. Core Philosophy

Core harus:

```text
kecil
stabil
jarang berubah
```

Plugin harus:

```text
fleksibel
berkembang cepat
mudah diganti
```

---

# 5. Plugin First

Saat muncul fitur baru, pertanyaan pertama harus:

```text
Bisakah ini menjadi Plugin?
```

Bukan:

```text
Bagaimana memasukkannya ke Core?
```

---

# 6. Core First Is Forbidden

Menambahkan fitur ke Core adalah pilihan terakhir.

Bukan pilihan pertama.

---

# 7. Domain Ownership

Setiap domain bisnis harus hidup sebagai Plugin.

Contoh:

```text
Media Library
Blog
Forum
LMS
CRM
E-Commerce
SEO
Analytics
AI
```

Semuanya Plugin.

---

# 8. Platform Responsibility

Platform hanya menyediakan fondasi.

Contoh:

```text
Users
Permissions
Settings
Events
SDK
Themes
Plugins
Content Engine
Search
Marketplace
```

---

# 9. Business Responsibility

Business Feature hidup di Plugin.

Core tidak memiliki business feature.

---

# 10. Theme Philosophy

Theme hanya mengatur tampilan.

Theme tidak mengandung business logic.

Theme tidak mengandung domain logic.

---

# 11. Marketplace Philosophy

Marketplace adalah Distribution Layer.

Marketplace bukan Platform Layer.

Marketplace bukan Domain Layer.

---

# 12. SDK Philosophy

SDK adalah satu-satunya kontrak resmi.

Tidak boleh ada shortcut ke internal Core.

---

# 13. API Philosophy

Seluruh kemampuan platform harus tersedia melalui API.

Admin Panel hanyalah salah satu client.

---

# 14. Headless Direction

ModernCMS harus mampu berjalan:

```text
dengan Admin Panel
tanpa Admin Panel
```

tanpa perubahan fondasi.

---

# 15. SaaS Direction

ModernCMS harus siap berkembang menjadi:

```text
Single Tenant
Multi Tenant
Workspace Based
Organization Based
Enterprise
```

tanpa redesign besar.

---

# 16. Marketplace Direction

Plugin harus dapat:

```text
install
uninstall
upgrade
downgrade
```

secara independen.

---

# 17. Data Ownership Direction

Plugin memiliki:

```text
database
storage
settings
permissions
events
api
```

sendiri.

---

# 18. Future AI Direction

AI bukan bagian wajib Core.

AI adalah Domain Plugin.

Contoh:

```text
AI Writer
AI Assistant
AI SEO
AI Search
AI Agent
```

---

# 19. Future Builder Direction

ModernCMS harus mampu menjadi:

```text
Website Builder
Blog Builder
Forum Builder
LMS Builder
CRM Builder
Marketplace Builder
App Builder
```

melalui kombinasi Plugin.

---

# 20. Avoid Product Drift

ModernCMS tidak boleh perlahan berubah menjadi:

```text
Blog CMS
WordPress Clone
Forum CMS
LMS CMS
```

Karena semua itu hanyalah salah satu kemungkinan penggunaan.

---

# 21. Engineering Decision Rule

Saat ada keputusan teknis:

Gunakan urutan berikut:

```text
1. Product Vision
2. Domain Boundary
3. Platform Architecture
4. Plugin Architecture
5. Implementation Detail
```

---

# 22. Plugin Count Goal

Arsitektur harus nyaman untuk:

```text
10 plugin
100 plugin
500 plugin
1000+ plugin
```

---

# 23. Developer Experience Goal

Plugin Developer harus dapat membuat Plugin tanpa memahami seluruh Core.

---

# 24. User Experience Goal

Pengguna harus dapat membangun aplikasi melalui kombinasi Plugin tanpa memodifikasi Core.

---

# 25. Enterprise Goal

Platform harus mampu digunakan oleh:

```text
individual
startup
company
enterprise
government
education
```

---

# 26. Open Source Goal

Core Platform harus tetap dapat berkembang secara open source.

Ekosistem Plugin dapat berkembang secara independen.

---

# 27. Stability Goal

Core berubah lambat.

Plugin berubah cepat.

---

# 28. Scalability Goal

Arsitektur hari ini tidak boleh menghalangi kebutuhan 10 tahun ke depan.

---

# 29. Final Product Definition

ModernCMS adalah:

```text
Plugin First Application Platform
```

yang kebetulan dapat digunakan sebagai CMS.

Bukan:

```text
CMS yang mencoba menjadi Application Platform.
```

---

# 30. Vision Lock

Jika implementasi, fitur baru, usulan developer, AI Agent, Codex, Antigravity, atau roadmap bertentangan dengan visi ini:

Yang harus berubah adalah implementasinya.

Bukan visi produknya.
