# EDITOR_ENGINE_LOCK_V1

Status: LOCKED

Version: 1.0

Depends On:

* PRODUCT_VISION_LOCK_V1
* DOMAIN_BOUNDARY_LOCK_V1
* PLUGIN_PLATFORM_LOCK_V1
* SDK_ARCHITECTURE_LOCK_V1
* ADMIN_PANEL_ARCHITECTURE_LOCK_V1
* CONTENT_ENGINE_LOCK_V1
* MEDIA_ASSET_PLATFORM_LOCK_V1
* EVENT_SYSTEM_LOCK_V1

---

# 1. Purpose

Dokumen ini mengunci fondasi arsitektur Editor Engine ModernCMS.

Tujuan utama:
* Memastikan editor tidak terikat pada satu jenis konten spesifik (seperti Blog/Artikel).
* Menyediakan platform editor yang generic dan extensible untuk masa pakai 5–10+ tahun.
* Mendukung penambahan fungsionalitas secara pluggable oleh plugin pihak ketiga tanpa memodifikasi Editor Core.
* Menyelaraskan editor dengan sistem manajemen aset media (`MEDIA_ASSET_PLATFORM_LOCK_V1`) dan sistem event (`EVENT_SYSTEM_LOCK_V1`).

---

# 2. Core Principle

Editor Engine ModernCMS menganut prinsip pemisahan total antara:
* **Editor Core**: Mesin rendering berbasis Tiptap/ProseMirror yang mengatur dokumen state secara abstrak.
* **Plugin Extensions**: Ekstensi visual (Toolbar, Sidebar, Modal) dan semantik (Nodes, Marks) yang didaftarkan melalui Registry.
* **Product Consumer**: Lapisan aplikasi/halaman (seperti Blog, LMS, Forum) yang memuat editor dan mengatur formulir penulisan (Content Form).

Editor Core bersifat agnostik terhadap jenis konten yang diedit.

---

# 3. Editor sebagai Platform Service

Editor bukan milik aplikasi Blog atau halaman manapun. Editor didefinisikan sebagai Platform Service yang disediakan oleh Core Admin Panel SDK.

Seluruh plugin yang membutuhkan input teks kaya (Rich Text) wajib memakai layanan Editor Engine ini.

Contoh konsumen masa depan:
* `plugins/blog` (Article Editor)
* `plugins/pages` (Page Builder & Doc Editor)
* `plugins/forum` (Thread Editor)
* `plugins/lms` (Lesson Content Creator)
* `plugins/knowledge-base` (Article Wiki Editor)

---

# 4. Boundary antara Editor Engine, Content Form, dan Plugin

Batas tanggung jawab didefinisikan secara ketat untuk menghindari kebocoran logika (*leaky abstractions*):

* **Content Form (Consumer)**:
  Mengelola metadata di luar kanvas tulisan (seperti Judul, Slug, Kategori, Tag, Status Publikasi, dan tombol Save/Publish utama).
  
* **Editor Engine (Core)**:
  Hanya mengelola dokumen state, manipulasi node, rendering kanvas, dan event editor internal.
  
* **Plugin**:
  Menyediakan ekstensi tambahan (seperti custom node untuk embed video, tombol toolbar tambahan, atau integrasi AI) tanpa mengubah berkas Editor Engine Core.

---

# 5. Registry System

Seluruh kustomisasi Editor wajib melalui **Editor Registry**. Registry ini menjadi gerbang tunggal untuk mendaftarkan dan memuat kemampuan tambahan di dalam editor secara dinamis saat inisialisasi.

Dilarang keras melakukan hardcoding extension, toolbar, atau shortcut baru langsung di dalam berkas inti Editor.

Format Registry:
```typescript
interface EditorRegistry {
  nodes: NodeRegistry;
  marks: MarkRegistry;
  toolbar: ToolbarRegistry;
  commands: CommandRegistry;
  modals: ModalRegistry;
  propertyPanels: PropertyPanelRegistry;
  sidebars: SidebarRegistry;
  contextMenus: ContextMenuRegistry;
}
```

---

# 6. Toolbar Registry

Toolbar disusun menggunakan struktur pita (*ribbon*) yang pluggable. Plugin dapat menambahkan grup ribbon baru atau menyelipkan tombol ke grup ribbon yang sudah ada.

Contoh Pendaftaran Toolbar:
```typescript
editorRegistry.toolbar.register({
  id: 'ai-write-button',
  tab: 'insert',
  group: 'ai-tools',
  label: 'AI Assist',
  icon: 'Sparkles',
  action: (editor) => editor.commands.execute('openAiModal')
});
```

---

# 7. Command Registry

Seluruh perintah modifikasi dokumen wajib didaftarkan pada Command Registry. Hal ini memudahkan plugin lain memanggil perintah editor secara programmatic atau memetakan keyboard shortcut baru.

Contoh:
```typescript
editorRegistry.commands.register({
  name: 'insertSpoiler',
  action: (editor, payload) => {
    return editor.chain().insertContent({ type: 'spoiler', attrs: payload }).run();
  }
});
```

---

# 8. Node Registry

Node mewakili elemen struktural dokumen (seperti paragraf, heading, gambar, spoiler box, quiz card). Plugin yang ingin menambahkan elemen visual baru ke dalam dokumen wajib mendaftarkannya pada Node Registry.

Setiap Node harus mendefinisikan aturan pemetaan skema ProseMirror secara terisolasi.

---

# 9. Mark Registry

Mark mewakili dekorasi teks inline (seperti bold, italic, underline, highlight, text-color). Kustomisasi dekorasi teks tambahan harus didaftarkan di Mark Registry.

Mark tidak boleh mengubah struktur pohon dokumen (*document tree*), melainkan hanya menerapkan atribut pada rentang karakter teks.

---

# 10. Modal Registry

Jika suatu tombol toolbar membutuhkan input kompleks dari pengguna sebelum melakukan aksi insert (misalnya: memilih skema diagram, memasukkan kode embed khusus), plugin harus mendaftarkan UI dialog tersebut ke dalam Modal Registry.

Editor Core akan menangani siklus hidup modal (open/close, overlay rendering, focus trap) secara otomatis.

---

# 11. Property Panel Registry

Ketika sebuah Node kompleks (seperti tabel, gambar, atau bagan) dipilih (*selected*), panel properti khusus harus muncul secara kontekstual di area kontrol editor.

Plugin mendaftarkan konfigurator properti ini pada Property Panel Registry.

Contoh:
* Memilih `ImageNode` memicu munculnya pilihan *alignment*, *border radius*, *alt text input*, dan *image sizing option*.

---

# 12. Sidebar Registry

Sidebar Registry menampung panel bantu yang berada di sebelah kanan kanvas editor (terintegrasi di dalam editor shell). Contoh yang didaftarkan di sini adalah panel SEO checker, panel saran AI, atau panel riwayat versi dokumen.

Pilihan sidebar dapat dibuka secara dinamis oleh pengguna dari menu editor.

---

# 13. Context Menu Registry

Mendaftarkan menu melayang (*floating context menu*) yang muncul saat pengguna melakukan klik kanan pada area kanvas tertentu atau menyeleksi teks tertentu.

Mekanisme ini mencegah bentrok antar plugin yang ingin menambahkan opsi menu interaktif pada tipe node yang sama.

---

# 14. Media Asset Integration dengan data-media-uuid

Mengikuti aturan `MEDIA_ASSET_PLATFORM_LOCK_V1`, Editor Engine dilarang keras menyimpan URL absolut media di dalam database.

Aset gambar/video yang dimasukkan wajib menggunakan custom `MediaNode` dengan format keluaran HTML:
```html
<img data-media-uuid="UUID-ASET-MEDIA" alt="Deskripsi gambar" />
```

Editor Core dilarang keras menyediakan dialog input URL manual untuk gambar lokal. Editor harus membuka **Media Picker SDK** yang disediakan secara terpusat oleh platform.

---

# 15. Larangan Menyimpan URL Absolut di Rich Text

Rich Text Content yang disimpan ke database tidak boleh mengandung nama domain, alamat IP, skema port, atau folder absolut (seperti `/uploads/2026/05/foto.jpg`).

BENAR:
```html
<p>Silakan lihat gambar berikut:</p>
<img data-media-uuid="e4f6cb65-d069-49ff-a827-2c9497e682e0" />
```

SALAH:
```html
<p>Silakan lihat gambar berikut:</p>
<img src="http://localhost:5173/storage/uploads/foto.jpg" />
```

URL publik gambar wajib di-resolve secara dinamis pada sisi klien atau saat proses rendering halaman frontend diakses oleh pembaca.

---

# 16. SDK Boundary

Komunikasi antara plugin pengekspansi dengan Editor Engine diatur secara ketat melalui **Editor SDK Boundary**.

* **Plugin hanya boleh**: Menggunakan metode yang diekspos oleh `ModernCMS.EditorSDK` untuk melakukan pendaftaran registry, memantau perubahan isi, atau memicu command.
* **Plugin dilarang keras**: Mengakses instance internal Tiptap secara langsung tanpa melewati gerbang SDK, atau memodifikasi DOM kanvas editor secara manual di luar kendali state ProseMirror.

---

# 17. Plugin Extension Rules

Setiap plugin yang memperluas Editor harus mematuhi aturan berikut:
* **Isolation**: Ekstensi tidak boleh merusak fungsionalitas dasar editor jika plugin dinonaktifkan.
* **Namespace Protection**: Nama node, mark, command, dan toolbar button wajib menyertakan prefiks plugin ID (contoh: `faq:accordion`, `ai:autocomplete`).
* **Resource Optimization**: Kode komponen pembantu editor milik plugin harus di-load secara malas (*lazy loaded*) hanya ketika editor diinisialisasi atau node terkait dirender.

---

# 18. Event System Integration

Editor Engine terintegrasi secara asinkron dengan sistem event pusat (`EVENT_SYSTEM_LOCK_V1`). Editor memancarkan event resmi pada siklus hidup tertentu.

Event Utama Editor Engine:
* `editor.initialized`: Dipancarkan ketika kanvas selesai dirender.
* `editor.changed`: Dipancarkan (dengan debounce) saat isi tulisan berubah.
* `editor.saved`: Dipancarkan saat konten selesai disimpan ke database oleh consumer.
* `editor.node.selected`: Dipancarkan saat pengguna mengklik/memilih sebuah node tertentu.

---

# 19. Permission Rules

Akses terhadap fitur editor diatur berdasarkan kapabilitas user role saat ini:
* Pengguna tanpa akses tulis (`content.create`/`content.update`) hanya akan disajikan editor dalam status **Read-Only**.
* Pendaftaran toolbar button tertentu (misal: tombol penyuntingan tingkat lanjut) dapat dibatasi berdasarkan permission yang dimiliki pengguna.

---

# 20. Marketplace Compatibility

Setiap modul editor yang dibuat harus mendukung instalasi dari Marketplace tanpa kompilasi ulang (Rebuilding) Core Admin Panel.

Admin Panel menggunakan *runtime dependency injection* untuk memuat ekstensi editor yang terdaftar pada manifest plugin Marketplace.

---

# 21. Future AI Extension

Editor Engine didesain siap menampung fungsionalitas AI:
* **AI Autocomplete**: Dukungan inline ghost text saat mengetik (menunggu input tab).
* **AI Inline Editor**: Menu kontekstual saat teks diblok untuk memicu perintah "Rephrase", "Translate", atau "Summarize".
* **AI Metadata Generator**: Mampu membaca isi dokumen state saat event `editor.changed` untuk menyarankan tags dan excerpt secara otomatis kepada Content Form.

---

# 22. Target Folder Structure

Untuk memastikan arsitektur terisolasi dengan rapi, struktur direktori Editor dipisahkan dari folder `pages` utama dan ditempatkan di bawah modul platform editor terdedikasi:

```text
apps/admin/src/editor/
├── core/
│   ├── EditorCanvas.tsx       # Komponen rendering utama Tiptap
│   ├── EditorContext.tsx      # Provider state internal editor
│   └── useEditorCore.ts       # Hook inisialisasi konfigurasi core
├── provider/
│   └── EditorProvider.tsx     # Wrapper penyedia akses SDK & Registry
├── contracts/
│   ├── index.ts               # Definisi tipe data & antarmuka (types & interfaces)
│   └── registry.types.ts      # Kontrak tipe data untuk Registry System
├── registry/
│   ├── index.ts               # Implementasi sentral Registry Manager
│   ├── toolbar.registry.ts    # Penyimpan item toolbar pita (ribbon)
│   ├── node.registry.ts       # Penyimpan ekstensi schema node
│   └── command.registry.ts    # Penyimpan aksi & fungsi modifikasi
├── commands/
│   └── index.ts               # Kumpulan default commands (core commands)
├── nodes/
│   ├── MediaNode.tsx          # Custom node untuk menampung data-media-uuid
│   └── index.ts
├── marks/
│   └── index.ts               # Kumpulan custom marks standar
├── toolbar/
│   ├── ToolbarRibbon.tsx      # Komponen UI pengatur pita menu toolbar
│   └── ToolbarButton.tsx      # Komponen tombol instan toolbar
├── modals/
│   ├── ModalManager.tsx       # Pengatur overlay dialog kustom
│   └── LinkInsertModal.tsx    # Modal input hyperlink standar
├── sidebars/
│   └── SidebarManager.tsx     # Pengatur kolom panel kanan kustom
├── property-panels/
│   └── PropertyPanel.tsx      # Pengatur konfigurasi node aktif kontekstual
├── events/
│   └── editor.events.ts       # Dispatcher event editor terintegrasi Event System
├── extensions/
│   └── starter-kit.ts         # Konfigurasi Tiptap StarterKit bawaan
└── sdk/
    └── index.ts               # Gerbang keluar (ModernCMS.EditorSDK) untuk Plugin
```

---

# 23. Ownership Rules

Peta Kepemilikan (*Ownership Map*) direktori diatur sebagai berikut:

* **Editor Core (`editor/core/`, `editor/provider/`, `editor/contracts/`, `editor/registry/`)**:
  * **Owner**: Core Platform Architect Team.
  * **Responsibility**: Stabilitas inisialisasi, pemrosesan skema, siklus hidup dokumen state, dan keutuhan API Registry.
  
* **Editor UI Components (`editor/toolbar/`, `editor/modals/`, `editor/sidebars/`, `editor/property-panels/`)**:
  * **Owner**: Senior Frontend UI Team.
  * **Responsibility**: Kebersihan rendering visual, aksesibilitas keyboard (a11y), transisi ribbon, serta konsistensi desain sistem Admin Shell.
  
* **Editor Extensions & SDK (`editor/nodes/`, `editor/marks/`, `editor/sdk/`)**:
  * **Owner**: Senior Platform Architect & Integration Team.
  * **Responsibility**: Eksposur API SDK resmi, pemenuhan kompatibilitas integrasi media UUID, dan dukungan kompatibilitas Marketplace plugin.

---

# 24. Allowed Imports

Aturan impor berkas yang diizinkan (*Allowed Imports*) bagi kode di dalam folder `editor/`:

* Impor dari pustaka luar yang telah ditentukan di package level (`@tiptap/react`, `@tiptap/starter-kit`, `prosemirror-model`, `lucide-react`).
* Impor relatif antar berkas di dalam folder `apps/admin/src/editor/*`.
* Impor fungsi global dari `packages/` atau `sdk/` resmi ModernCMS.
* Impor gaya/style token CSS global yang disediakan oleh Admin Shell (`var(--border-color)`, `var(--accent-primary)`).

---

# 25. Forbidden Imports

Aturan impor yang dilarang keras (*Forbidden Imports*) bagi kode di dalam folder `editor/`:

* **Dilarang mengimpor** berkas halaman konsumen seperti `apps/admin/src/pages/ArticleManager.tsx` atau sejenisnya.
* **Dilarang mengimpor** model database, skema backend, atau controller API secara langsung dari server.
* **Dilarang mengimpor** berkas private milik plugin tertentu secara langsung (komunikasi wajib lewat SDK / Events).
* **Dilarang mengimpor** instance state React dari halaman pembungkus editor secara melingkar (*circular dependency*).

---

# 26. Phase Breakdown

Rencana pelaksanaan dibagi menjadi fase teratur untuk menjaga kestabilan aplikasi:

* **P4-B: Editor Engine Lock (Fase Sekarang)**
  Penyusunan audit, desain arsitektur fondasi, penentuan folder target, dan penguncian dokumen `EDITOR_ENGINE_LOCK_V1.md`.
  
* **P4-C: Editor Architecture Refactor Plan**
  Pemetaan langkah pembongkaran kode `ArticleManager.tsx` secara bertahap tanpa merusak status live. Pemisahan state form dengan state rich text.
  
* **P4-D: Editor Registry System**
  Pembuatan implementasi kelas Registry utama untuk menampung Nodes, Marks, dan Toolbar Items secara dinamis.
  
* **P4-E: Editor SDK**
  Penyediaan gerbang antarmuka resmi bagi plugin luar untuk memanggil registry dan mengirim komando penyuntingan.
  
* **P4-F: Media Node**
  Penggantian `TiptapImage` bawaan dengan custom `MediaNode` yang mampu membaca, menyimpan, dan merender tag HTML bersenjatakan `data-media-uuid`.
  
* **P4-G: Media Picker SDK**
  Pembuatan adapter komunikasi antara modal input Editor dengan pustaka Media Library milik platform.
  
* **P4-H: Property Panel System**
  Pembuatan komponen penampil opsi konfigurasi node aktif secara dinamis di bawah kanvas atau di bilah kontrol.
  
* **P4-I: Plugin Editor Extensions**
  Uji coba pembuatan ekstensi editor dari plugin lokal (misalnya: Accordion block, markdown shortcut).
  
* **P4-J: Marketplace Editor Extensions**
  Uji coba integrasi dinamis modul editor yang didistribusikan secara terkompresi dari Marketplace pihak ketiga.

---

# 27. Architecture Lock Enforcement

Dokumen ini berstatus **LOCKED** dan menjadi hukum arsitektur tertinggi untuk pengerjaan Editor Engine ModernCMS.

Segala bentuk jalan pintas (*shortcuts*), solusi temporer (*temporary hacks*), atau modifikasi yang melompati Registry dan menulis langsung di dalam Core Editor dinyatakan sebagai **pelanggaran arsitektur** dan wajib ditolak pada fase review kode.

Perubahan pada dokumen ini hanya boleh dilakukan dengan persetujuan tertulis dari Senior Software Architect, Senior Frontend Architect, dan Senior Platform Architect ModernCMS.
