# EVENT_SYSTEM_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PLUGIN_PLATFORM_LOCK_V1
* PLUGIN_DATABASE_OWNERSHIP_LOCK_V1
* MEDIA_ASSET_PLATFORM_LOCK_V1
* CONTENT_ENGINE_LOCK_V1
* SETTINGS_SYSTEM_LOCK_V1

---

# 1. Purpose

Event System adalah mekanisme komunikasi resmi antar bagian sistem.

Plugin tidak boleh saling mengimpor secara langsung hanya untuk bertukar informasi.

Event System menjadi tulang punggung integrasi ModernCMS.

---

# 2. Core Principle

Producer menghasilkan event.

Consumer mendengarkan event.

Producer tidak mengetahui siapa consumer.

Consumer tidak mengetahui siapa producer.

---

# 3. Event Ownership

Event Engine dimiliki Core.

Plugin hanya:

* Emit Event
* Listen Event

---

# 4. Communication Rule

SALAH:

Plugin A

↓

Import Plugin B

↓

Panggil Function B

---

BENAR:

Plugin A

↓

Emit Event

↓

Plugin B Mendengar Event

---

# 5. Event Structure

Minimal:

```json
{
  "event": "",
  "timestamp": "",
  "source": "",
  "payload": {}
}
```

---

# 6. Event Naming Convention

Format wajib:

```text
resource.action
```

Contoh:

```text
media.uploaded
media.deleted

content.created
content.published

user.created

plugin.installed
plugin.activated
```

---

# 7. Reserved Core Events

Dimiliki Core.

Contoh:

```text
system.started
system.shutdown

user.created
user.updated

plugin.installed
plugin.activated
plugin.deactivated
plugin.uninstalled

theme.activated
theme.deactivated
```

---

# 8. Media Library Events

Contoh:

```text
media.uploaded
media.updated
media.deleted
media.restored
media.replaced
```

---

# 9. Content Engine Events

Contoh:

```text
content.created
content.updated
content.published
content.archived
content.deleted
```

---

# 10. Settings Events

Contoh:

```text
settings.updated
settings.imported
settings.restored
```

---

# 11. Marketplace Events

Contoh:

```text
plugin.installed
plugin.upgraded
plugin.downgraded
plugin.removed
```

---

# 12. Theme Events

Contoh:

```text
theme.installed
theme.activated
theme.removed
```

---

# 13. Event Payload Rule

Payload harus:

* Serializable
* Predictable
* Versionable

Payload tidak boleh mengandung:

* Database Connection
* Runtime Objects
* Internal References

---

# 14. Event Versioning

Future Ready.

Contoh:

```json
{
  "version": "1.0"
}
```

---

# 15. Sync Event

Default event adalah synchronous.

Producer menunggu penyelesaian event.

Digunakan untuk:

```text
validation
authorization
pre-processing
```

---

# 16. Async Event

Future Ready.

Event dapat dijalankan melalui queue.

Digunakan untuk:

```text
email
notification
image optimization
search indexing
ai processing
```

---

# 17. Event Listener Rule

Listener tidak boleh merusak producer.

Jika listener gagal:

Producer tetap berjalan.

Kecuali event memang ditandai mandatory.

---

# 18. Event Isolation

Plugin tidak boleh mengubah payload plugin lain.

Payload bersifat read-only.

---

# 19. Event Discovery

Plugin harus mendaftarkan listener secara eksplisit.

Tidak boleh ada auto patching.

---

# 20. Event Security

Event tidak boleh digunakan untuk bypass permission.

Permission tetap diperiksa oleh producer.

---

# 21. Event Logging

Future Ready.

Event dapat dicatat.

Contoh:

```text
event
source
timestamp
status
duration
```

---

# 22. Event Replay

Future Ready.

Event dapat diputar ulang.

Digunakan untuk:

```text
rebuild index
rebuild cache
reprocess ai
```

---

# 23. Event Bus

Core menyediakan Event Bus tunggal.

Plugin tidak boleh membuat Event Bus sendiri.

---

# 24. Marketplace Compatibility

Plugin Marketplace wajib menggunakan Event System resmi.

Tidak boleh menggunakan komunikasi private antar plugin.

---

# 25. Media Asset Example

Media Library:

Emit:

```text
media.uploaded
```

SEO Plugin:

Listen:

```text
media.uploaded
```

↓

Generate Alt Text

↓

Simpan Metadata

Media Library tidak mengetahui keberadaan SEO Plugin.

---

# 26. AI Example

Content Engine:

Emit:

```text
content.created
```

AI Plugin:

Listen:

```text
content.created
```

↓

Generate Summary

↓

Generate Tags

↓

Generate SEO Metadata

Content Engine tidak mengetahui AI Plugin.

---

# 27. Long Term Compatibility

Event System harus mendukung:

* Plugins
* Themes
* Marketplace
* AI Extensions
* Multi Tenant
* Queue Workers
* Distributed Systems

tanpa mengubah fondasi.

---

# 28. Architecture Lock

Event System adalah Integration Layer.

Bukan Business Layer.

Bukan Plugin Layer.

Jika implementasi bertentangan dengan dokumen ini:

Implementasi yang harus diperbaiki.

Bukan dokumen ini.
